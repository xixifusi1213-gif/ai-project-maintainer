import fs from "node:fs";
import path from "node:path";
import { exists, runCommand } from "./command-runner.mjs";

function packageManager(project) {
  const root = project.root;
  if (exists(path.join(root, "pnpm-lock.yaml"))) return { name: "pnpm", audit: ["pnpm", ["audit", "--prod", "--json"]] };
  if (exists(path.join(root, "yarn.lock"))) return { name: "yarn", audit: ["yarn", ["npm", "audit", "--environment", "production", "--json"]] };
  if (exists(path.join(root, "bun.lock")) || exists(path.join(root, "bun.lockb"))) return { name: "bun", audit: null };
  if (exists(path.join(root, "package-lock.json")) || exists(path.join(root, "package.json"))) return { name: "npm", audit: ["npm", ["audit", "--omit=dev", "--json"]] };
  return null;
}

export function makeCheck(name, group, result, blocking, summary, extra = {}) {
  return {
    name,
    group,
    status: result.status,
    blocking: Boolean(blocking),
    summary,
    command: result.command,
    code: result.code,
    durationMs: result.durationMs,
    stdout: result.stdout,
    stderr: result.stderr,
    ...extra,
  };
}

export function normalizeToolResult(toolName, result) {
  if (
    toolName === "trivy" &&
    result.status === "fail" &&
    /failed to download vulnerability DB|DB error|download artifact|unable to download/i.test(`${result.stderr}\n${result.stdout}`)
  ) {
    return { ...result, status: "error" };
  }
  return result;
}

function runProjectScript(project, pm, scriptName, options) {
  let commandArgs;
  if (scriptName === "test" && (pm.name === "npm" || pm.name === "pnpm")) {
    commandArgs = ["test"];
  } else if (pm.name === "npm" || pm.name === "pnpm") {
    commandArgs = ["run", scriptName];
  } else if (pm.name === "yarn") {
    commandArgs = [scriptName];
  } else {
    commandArgs = ["run", scriptName];
  }
  return runCommand(pm.name, commandArgs, { ...options.runnerOptions, cwd: project.root, timeoutMs: options.timeoutMs });
}

export function runNodeChecks(project, options = {}) {
  const checks = [];
  const pkg = project.packageJson;
  if (!pkg) return checks;
  const pm = packageManager(project);
  if (!pm) return checks;
  const scripts = pkg.scripts || {};
  const noTests = Boolean(options.noTests);

  if (!noTests && scripts.test) {
    const result = runProjectScript(project, pm, "test", { ...options, timeoutMs: 15 * 60 * 1000 });
    checks.push(makeCheck("package test", "tests", result, result.status === "fail", "Project test script must pass."));
  }

  if (!noTests && scripts["test:e2e"]) {
    const result = runProjectScript(project, pm, "test:e2e", { ...options, timeoutMs: 20 * 60 * 1000 });
    checks.push(makeCheck("e2e test", "tests", result, result.status === "fail", "End-to-end tests must pass when present."));
  }

  if (options.release) {
    for (const scriptName of ["build", "dist"]) {
      if (!scripts[scriptName]) continue;
      const result = runProjectScript(project, pm, scriptName, { ...options, timeoutMs: 25 * 60 * 1000 });
      checks.push(makeCheck(`release ${scriptName}`, "tests", result, result.status === "fail", `Release script '${scriptName}' must pass.`));
    }
  }

  if (pm.audit) {
    const [cmd, commandArgs] = pm.audit;
    const result = runCommand(cmd, commandArgs, { ...options.runnerOptions, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
    checks.push(makeCheck(`${pm.name} production audit`, "dependencies", result, result.status === "fail", "Production dependency audit must pass or have a documented exception."));
  }

  return checks;
}

export function runExternalChecks(project, options = {}) {
  const checks = [];
  const strict = Boolean(options.strict);
  const root = project.root;
  const files = project.files || [];
  const hasInfra = (project.riskSurfaces?.infra || []).length > 0;
  const hasCi = (project.riskSurfaces?.ci || []).length > 0;
  const sqlFiles = files.filter((file) => /\.(sql)$/i.test(file) && /migrations?|db\/migrate|schema/i.test(file)).slice(0, 100);
  const hasLockfile = files.some((file) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|go\.sum|requirements.*\.txt|poetry\.lock|Cargo\.lock|Gemfile\.lock)$/i.test(file));

  const runner = options.runnerOptions || {};
  const gitleaks = runCommand("gitleaks", ["detect", "--source", root, "--redact", "--no-git"], { ...runner, cwd: root });
  checks.push(makeCheck("gitleaks secret scan", "secrets", gitleaks, gitleaks.status === "fail" || (strict && gitleaks.status === "missing"), "Committed secrets block release."));

  const trivy = normalizeToolResult("trivy", runCommand(
    "trivy",
    [
      "fs",
      "--db-repository",
      process.env.TRIVY_DB_REPOSITORY || "ghcr.io/aquasecurity/trivy-db:2",
      "--java-db-repository",
      process.env.TRIVY_JAVA_DB_REPOSITORY || "ghcr.io/aquasecurity/trivy-java-db:1",
      "--timeout",
      process.env.TRIVY_TIMEOUT || "90s",
      "--scanners",
      "vuln,secret,misconfig",
      "--severity",
      "HIGH,CRITICAL",
      "--exit-code",
      "1",
      "--quiet",
      root,
    ],
    { ...runner, cwd: root, timeoutMs: 150 * 1000 },
  ));
  checks.push(makeCheck(
    "trivy filesystem scan",
    "dependencies",
    trivy,
    trivy.status === "fail" || (strict && (trivy.status === "error" || trivy.status === "missing")),
    trivy.status === "error"
      ? "Trivy is installed but its vulnerability database was unavailable; release coverage is incomplete."
      : "High/critical vulnerabilities, secrets, and misconfigurations block release.",
    { coverageGap: trivy.status === "error" || trivy.status === "missing" },
  ));

  const semgrep = runCommand("semgrep", ["scan", "--config", "auto", "--error", root], { ...runner, cwd: root, timeoutMs: 20 * 60 * 1000 });
  checks.push(makeCheck("semgrep static scan", "sast", semgrep, semgrep.status === "fail" || (strict && semgrep.status === "missing"), "High-confidence static analysis findings block release."));

  if (hasLockfile) {
    const osv = runCommand("osv-scanner", ["--recursive", root], { ...runner, cwd: root, timeoutMs: 10 * 60 * 1000 });
    checks.push(makeCheck("osv-scanner dependency scan", "dependencies", osv, osv.status === "fail", "Known vulnerable dependencies should be fixed or documented."));
  }

  const syftOutputArg = options.sbomOutputPath ? `cyclonedx-json=${options.sbomOutputPath}` : "cyclonedx-json";
  const syft = runCommand("syft", [root, "-o", syftOutputArg], { ...runner, cwd: root, timeoutMs: 10 * 60 * 1000, maxBuffer: 50 * 1024 * 1024 });
  checks.push(makeCheck("syft SBOM", "supply-chain", syft, false, "SBOM generation improves release evidence."));

  const grype = runCommand("grype", [root, "--fail-on", "high"], { ...runner, cwd: root, timeoutMs: 10 * 60 * 1000 });
  checks.push(makeCheck("grype vulnerability scan", "supply-chain", grype, grype.status === "fail", "High/critical supply-chain vulnerabilities should be fixed."));

  if (hasCi) {
    const actionlint = runCommand("actionlint", [], { ...runner, cwd: root, timeoutMs: 5 * 60 * 1000 });
    checks.push(makeCheck("actionlint workflow lint", "ci-security", actionlint, actionlint.status === "fail", "GitHub Actions workflow syntax and common mistakes must be fixed."));

    const zizmor = runCommand("zizmor", [".github/workflows"], { ...runner, cwd: root, timeoutMs: 5 * 60 * 1000 });
    checks.push(makeCheck("zizmor workflow security", "ci-security", zizmor, zizmor.status === "fail", "High-risk GitHub Actions patterns must be fixed."));
  }

  if (hasInfra) {
    const checkov = runCommand("checkov", ["-d", root, "--quiet", "--compact"], { ...runner, cwd: root, timeoutMs: 15 * 60 * 1000 });
    checks.push(makeCheck("checkov IaC scan", "iac", checkov, checkov.status === "fail" || (strict && checkov.status === "missing"), "IaC security failures block release when infra files exist."));
  }

  if (hasInfra) {
    const trivyConfig = runCommand("trivy", ["config", "--severity", "HIGH,CRITICAL", "--exit-code", "1", "--quiet", root], { ...runner, cwd: root, timeoutMs: 10 * 60 * 1000 });
    checks.push(makeCheck("trivy config scan", "iac", trivyConfig, trivyConfig.status === "fail", "IaC misconfigurations should be fixed before release."));
  }

  if (sqlFiles.length > 0) {
    const squawk = runCommand("squawk", sqlFiles.map((file) => path.join(root, file)), { ...runner, cwd: root, timeoutMs: 10 * 60 * 1000 });
    checks.push(makeCheck("squawk SQL migration lint", "database", squawk, squawk.status === "fail" || (strict && squawk.status === "missing"), "Unsafe SQL migration patterns block release."));
  } else if ((project.riskSurfaces?.database || []).length > 0) {
    checks.push({
      name: "database migration review",
      group: "database",
      status: "skipped",
      blocking: false,
      summary: "Database surface detected; route schema changes through Squawk, Atlas, or Bytebase review when migrations exist.",
    });
  }

  return checks;
}

export function runElectronChecks(project) {
  if (!project.electron?.detected) return [];

  const dangerous = [];
  const suspiciousIpc = [];
  for (const file of project.electron.candidateFiles || []) {
    const full = path.join(project.root, file);
    let text = "";
    try {
      text = fs.readFileSync(full, "utf8");
    } catch {
      continue;
    }

    for (const pattern of [
      { re: /nodeIntegration\s*:\s*true/g, label: "nodeIntegration: true" },
      { re: /contextIsolation\s*:\s*false/g, label: "contextIsolation: false" },
      { re: /webSecurity\s*:\s*false/g, label: "webSecurity: false" },
      { re: /allowRunningInsecureContent\s*:\s*true/g, label: "allowRunningInsecureContent: true" },
    ]) {
      if (pattern.re.test(text)) dangerous.push(`${file}: ${pattern.label}`);
    }

    if (/ipcMain\.handle|contextBridge\.exposeInMainWorld/.test(text) && /fs\.(read|write|rm|unlink|copy)|shell\.openExternal|child_process|execFile|spawn/.test(text)) {
      suspiciousIpc.push(file);
    }
  }

  return [
    {
      name: "electron baseline",
      group: "electron",
      status: dangerous.length ? "fail" : "pass",
      blocking: dangerous.length > 0,
      summary: dangerous.length
        ? "Dangerous Electron webPreferences detected."
        : suspiciousIpc.length
          ? "Electron detected; privileged IPC/file/shell patterns need manual review."
          : "Electron baseline did not find known-dangerous webPreferences.",
      evidence: { dangerous, suspiciousIpc: suspiciousIpc.slice(0, 30) },
    },
  ];
}

export function runAllChecks(project, options = {}) {
  return [
    ...runNodeChecks(project, options),
    ...runExternalChecks(project, options),
    ...runElectronChecks(project, options),
  ];
}
