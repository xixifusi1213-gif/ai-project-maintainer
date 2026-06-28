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
    /failed to download vulnerability DB|DB error|download artifact|unable to download|timeout|deadline exceeded/i.test(`${result.stderr}\n${result.stdout}`)
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

export function runTestChecks(project, options = {}) {
  const checks = [];
  const pkg = project.packageJson;
  if (!pkg) return checks;
  const pm = packageManager(project);
  if (!pm) return checks;
  const scripts = pkg.scripts || {};
  const noTests = Boolean(options.noTests);

  if (!noTests && scripts.test) {
    const result = runProjectScript(project, pm, "test", { ...options, timeoutMs: 15 * 60 * 1000 });
    checks.push(makeCheck("package test", "tests", result, result.status === "fail", "Project test script must pass.", { checkId: "tests" }));
  }

  if (!noTests && scripts["test:e2e"]) {
    const result = runProjectScript(project, pm, "test:e2e", { ...options, timeoutMs: 20 * 60 * 1000 });
    checks.push(makeCheck("e2e test", "tests", result, result.status === "fail", "End-to-end tests must pass when present.", { checkId: "tests" }));
  }

  if (options.release) {
    for (const scriptName of ["build", "dist"]) {
      if (!scripts[scriptName]) continue;
      const result = runProjectScript(project, pm, scriptName, { ...options, timeoutMs: 25 * 60 * 1000 });
      checks.push(makeCheck(`release ${scriptName}`, "tests", result, result.status === "fail", `Release script '${scriptName}' must pass.`, { checkId: "tests" }));
    }
  }

  return checks;
}

export function runPackageAuditChecks(project, options = {}) {
  const checks = [];
  if (!project.packageJson) return checks;
  const pm = packageManager(project);
  if (!pm?.audit) return checks;
  const [cmd, commandArgs] = pm.audit;
  const result = runCommand(cmd, commandArgs, { ...options.runnerOptions, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
  checks.push(makeCheck(`${pm.name} production audit`, "dependencies", result, result.status === "fail", "Production dependency audit must pass or have a documented exception.", { checkId: "package-audit" }));
  return checks;
}

export function runNodeChecks(project, options = {}) {
  return [...runTestChecks(project, options), ...runPackageAuditChecks(project, options)];
}

export function runSecretChecks(project, options = {}) {
  const strict = Boolean(options.strict);
  const runner = options.runnerOptions || {};
  const result = runCommand("gitleaks", ["detect", "--source", project.root, "--redact", "--no-git"], { ...runner, cwd: project.root });
  return [
    makeCheck("gitleaks secret scan", "secrets", result, result.status === "fail" || (strict && result.status === "missing"), "Committed secrets block release.", { checkId: "gitleaks" }),
  ];
}

export function runDependencyScannerChecks(project, options = {}) {
  return [...runTrivyFilesystemChecks(project, options), ...runOsvScannerChecks(project, options)];
}

export function runTrivyFilesystemChecks(project, options = {}) {
  const checks = [];
  const strict = Boolean(options.strict);
  const runner = options.runnerOptions || {};
  const root = project.root;
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
    { checkId: "trivy", coverageGap: trivy.status === "error" || trivy.status === "missing" },
  ));

  return checks;
}

export function runOsvScannerChecks(project, options = {}) {
  const files = project.files || [];
  const hasLockfile = files.some((file) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|go\.sum|requirements.*\.txt|poetry\.lock|Cargo\.lock|Gemfile\.lock)$/i.test(file));
  if (!hasLockfile) return [];
  const runner = options.runnerOptions || {};
  const osv = runCommand("osv-scanner", ["--recursive", project.root], { ...runner, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
  return [
    makeCheck("osv-scanner dependency scan", "dependencies", osv, osv.status === "fail", "Known vulnerable dependencies should be fixed or documented.", { checkId: "osv-scanner" }),
  ];
}

export function runSastChecks(project, options = {}) {
  const strict = Boolean(options.strict);
  const runner = options.runnerOptions || {};
  const result = runCommand("semgrep", ["scan", "--config", "auto", "--error", project.root], { ...runner, cwd: project.root, timeoutMs: 20 * 60 * 1000 });
  return [
    makeCheck("semgrep static scan", "sast", result, result.status === "fail" || (strict && result.status === "missing"), "High-confidence static analysis findings block release.", { checkId: "semgrep" }),
  ];
}

export function runSupplyChainChecks(project, options = {}) {
  return [...runSyftChecks(project, options), ...runGrypeChecks(project, options)];
}

export function runSyftChecks(project, options = {}) {
  const runner = options.runnerOptions || {};
  const syftOutputArg = options.sbomOutputPath ? `cyclonedx-json=${options.sbomOutputPath}` : "cyclonedx-json";
  const syft = runCommand("syft", [project.root, "-o", syftOutputArg], { ...runner, cwd: project.root, timeoutMs: 10 * 60 * 1000, maxBuffer: 50 * 1024 * 1024 });
  return [
    makeCheck("syft SBOM", "supply-chain", syft, false, "SBOM generation improves release evidence.", { checkId: "syft" }),
  ];
}

export function runGrypeChecks(project, options = {}) {
  const runner = options.runnerOptions || {};
  const grype = runCommand("grype", [project.root, "--fail-on", "high"], { ...runner, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
  return [
    makeCheck("grype vulnerability scan", "supply-chain", grype, grype.status === "fail", "High/critical supply-chain vulnerabilities should be fixed.", { checkId: "grype" }),
  ];
}

export function runCiSecurityChecks(project, options = {}) {
  if (!(project.riskSurfaces?.ci || []).length) return [];
  return [...runActionlintChecks(project, options), ...runZizmorChecks(project, options)];
}

export function runActionlintChecks(project, options = {}) {
  if (!(project.riskSurfaces?.ci || []).length) return [];
  const runner = options.runnerOptions || {};
  const actionlint = runCommand("actionlint", [], { ...runner, cwd: project.root, timeoutMs: 5 * 60 * 1000 });
  return [
    makeCheck("actionlint workflow lint", "ci-security", actionlint, actionlint.status === "fail", "GitHub Actions workflow syntax and common mistakes must be fixed.", { checkId: "actionlint" }),
  ];
}

export function runZizmorChecks(project, options = {}) {
  if (!(project.riskSurfaces?.ci || []).length) return [];
  const runner = options.runnerOptions || {};
  const zizmor = runCommand("zizmor", [".github/workflows"], { ...runner, cwd: project.root, timeoutMs: 5 * 60 * 1000 });
  return [
    makeCheck("zizmor workflow security", "ci-security", zizmor, zizmor.status === "fail", "High-risk GitHub Actions patterns must be fixed.", { checkId: "zizmor" }),
  ];
}

export function runIacChecks(project, options = {}) {
  if (!(project.riskSurfaces?.infra || []).length) return [];
  const strict = Boolean(options.strict);
  const runner = options.runnerOptions || {};
  const checkov = runCommand("checkov", ["-d", project.root, "--quiet", "--compact"], { ...runner, cwd: project.root, timeoutMs: 15 * 60 * 1000 });
  const trivyConfig = runCommand("trivy", ["config", "--severity", "HIGH,CRITICAL", "--exit-code", "1", "--quiet", project.root], { ...runner, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
  return [
    makeCheck("checkov IaC scan", "iac", checkov, checkov.status === "fail" || (strict && checkov.status === "missing"), "IaC security failures block release when infra files exist.", { checkId: "checkov" }),
    makeCheck("trivy config scan", "iac", trivyConfig, trivyConfig.status === "fail", "IaC misconfigurations should be fixed before release.", { checkId: "trivy-config" }),
  ];
}

export function runDatabaseChecks(project, options = {}) {
  const runner = options.runnerOptions || {};
  const strict = Boolean(options.strict);
  const sqlFiles = (project.files || []).filter((file) => /\.(sql)$/i.test(file) && /migrations?|db\/migrate|schema/i.test(file)).slice(0, 100);

  if (sqlFiles.length > 0) {
    const squawk = runCommand("squawk", sqlFiles.map((file) => path.join(project.root, file)), { ...runner, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
    return [
      makeCheck("squawk SQL migration lint", "database", squawk, squawk.status === "fail" || (strict && squawk.status === "missing"), "Unsafe SQL migration patterns block release.", { checkId: "squawk" }),
    ];
  }

  if ((project.riskSurfaces?.database || []).length > 0) {
    return [
      {
        checkId: "database-review",
        name: "database migration review",
        group: "database",
        status: "skipped",
        blocking: false,
        summary: "Database surface detected; route schema changes through Squawk, Atlas, or Bytebase review when migrations exist.",
      },
    ];
  }

  return [];
}

export function runOssHygieneChecks(project, options = {}) {
  return [...runScorecardChecks(project, options), ...runPreCommitChecks(project, options), ...runMegaLinterChecks(project, options)];
}

export function runScorecardChecks(project, options = {}) {
  const runner = options.runnerOptions || {};
  const scorecard = runCommand("scorecard", ["--local", project.root, "--format", "json"], { ...runner, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
  return [
    makeCheck("OpenSSF Scorecard", "oss-hygiene", scorecard, false, "Open source repository health score improves contributor trust.", { checkId: "scorecard" }),
  ];
}

export function runPreCommitChecks(project, options = {}) {
  const runner = options.runnerOptions || {};
  const preCommit = runCommand("pre-commit", ["run", "--all-files"], { ...runner, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
  return [
    makeCheck("pre-commit hooks", "oss-hygiene", preCommit, false, "pre-commit keeps common checks close to contributors.", { checkId: "pre-commit" }),
  ];
}

export function runMegaLinterChecks(project, options = {}) {
  const runner = options.runnerOptions || {};
  const megalinter = runCommand("mega-linter-runner", ["--flavor", "security", "--env", "VALIDATE_ALL_CODEBASE=true"], { ...runner, cwd: project.root, timeoutMs: 20 * 60 * 1000 });
  return [
    makeCheck("MegaLinter security profile", "oss-hygiene", megalinter, false, "MegaLinter can aggregate additional open source hygiene checks.", { checkId: "megalinter" }),
  ];
}

export function runExternalChecks(project, options = {}) {
  return [
    ...runSecretChecks(project, options),
    ...runDependencyScannerChecks(project, options),
    ...runSastChecks(project, options),
    ...runSupplyChainChecks(project, options),
    ...runCiSecurityChecks(project, options),
    ...runIacChecks(project, options),
    ...runDatabaseChecks(project, options),
    ...runOssHygieneChecks(project, options),
  ];
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
      checkId: "electron",
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
