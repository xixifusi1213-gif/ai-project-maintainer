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

function hasNpmAuditLockfile(root) {
  return exists(path.join(root, "package-lock.json")) || exists(path.join(root, "npm-shrinkwrap.json"));
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

function npmLockfileGap(result = {}) {
  return makeCheck(
    "npm production audit",
    "dependencies",
    {
      status: "gap",
      command: "npm audit --omit=dev --json",
      code: null,
      stdout: "",
      stderr: "",
      durationMs: 0,
      ...result,
      status: "gap",
    },
    false,
    "npm audit requires a package-lock.json or npm-shrinkwrap.json; run npm install --package-lock-only or install dependencies before relying on dependency audit evidence.",
    {
      checkId: "package-audit",
      coverageGap: true,
      setupGap: true,
      recommendation: "Run npm install --package-lock-only, then rerun quickstart.",
    },
  );
}

function isNpmAuditLockfileError(result) {
  return /ENOLOCK|requires an existing lockfile|package-lock\.json|npm-shrinkwrap\.json/i.test(`${result.stderr}\n${result.stdout}`);
}

const quickstartSemgrepHardeningRules = new Set([
  "yaml.github-actions.security.github-actions-mutable-action-tag.github-actions-mutable-action-tag",
  "package_managers.dependabot.dependabot-missing-cooldown.dependabot-missing-cooldown",
  "package_managers.npm.npm-missing-minimum-release-age.npm-missing-minimum-release-age",
]);
const semgrepJsonOutputLimit = 5 * 1024 * 1024;

function splitRepositoryEnv(value) {
  return String(value || "")
    .split(/[,\s]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function enabledEnvFlag(value) {
  return /^(1|true|yes)$/i.test(String(value || ""));
}

export function trivyRepositoryArgs(env = process.env) {
  const args = [];
  for (const repo of splitRepositoryEnv(env.TRIVY_DB_REPOSITORY)) {
    args.push("--db-repository", repo);
  }
  for (const repo of splitRepositoryEnv(env.TRIVY_JAVA_DB_REPOSITORY)) {
    args.push("--java-db-repository", repo);
  }
  return args;
}

function trivyScanArgs(root, env = process.env, options = {}) {
  const skipDbUpdate = Boolean(options.skipDbUpdate);
  const timeout = env.TRIVY_TIMEOUT || (options.firstRun ? "45s" : "90s");
  return [
    "fs",
    ...trivyRepositoryArgs(env),
    "--timeout",
    timeout,
    ...(skipDbUpdate ? ["--skip-db-update", "--skip-java-db-update"] : []),
    "--scanners",
    "vuln,secret,misconfig",
    "--severity",
    "HIGH,CRITICAL",
    "--exit-code",
    "1",
    "--quiet",
    root,
  ];
}

function isTrivyDbUnavailable(result) {
  return /failed to download vulnerability DB|DB error|download artifact|unable to download|timeout|deadline exceeded|no such host|connection refused|tls handshake timeout|first run cannot skip downloading DB/i.test(`${result.stderr}\n${result.stdout}`);
}

export function normalizeToolResult(toolName, result) {
  if (
    toolName === "trivy" &&
    result.status === "fail" &&
    isTrivyDbUnavailable(result)
  ) {
    return { ...result, status: "error" };
  }
  return result;
}

function semgrepRuleIds(result) {
  try {
    const parsed = JSON.parse(result.stdout || "{}");
    return (parsed.results || [])
      .map((finding) => finding.check_id)
      .filter(Boolean);
  } catch {
    return [];
  }
}

function isQuickstartSemgrepHardeningOnly(result) {
  if (result.status !== "fail") return false;
  const ruleIds = semgrepRuleIds(result);
  return ruleIds.length > 0 && ruleIds.every((ruleId) => quickstartSemgrepHardeningRules.has(ruleId));
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
  if (options.firstRun && pm.name === "npm" && !hasNpmAuditLockfile(project.root)) {
    checks.push(npmLockfileGap());
    return checks;
  }
  const [cmd, commandArgs] = pm.audit;
  const result = runCommand(cmd, commandArgs, { ...options.runnerOptions, cwd: project.root, timeoutMs: 10 * 60 * 1000 });
  if (options.firstRun && pm.name === "npm" && isNpmAuditLockfileError(result)) {
    checks.push(npmLockfileGap(result));
    return checks;
  }
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
  const env = runner.env || process.env;
  const root = project.root;
  const initialSkipDbUpdate = enabledEnvFlag(env.TRIVY_SKIP_DB_UPDATE);
  const timeoutMs = !env.TRIVY_TIMEOUT && options.firstRun ? 75 * 1000 : 150 * 1000;
  let onlineUpdateFailure = null;
  let cacheFallbackUsed = false;
  let trivy = normalizeToolResult("trivy", runCommand(
    "trivy",
    trivyScanArgs(root, env, { firstRun: options.firstRun, skipDbUpdate: initialSkipDbUpdate }),
    { ...runner, cwd: root, timeoutMs },
  ));
  if (!initialSkipDbUpdate && trivy.status === "error" && isTrivyDbUnavailable(trivy)) {
    onlineUpdateFailure = trivy;
    trivy = normalizeToolResult("trivy", runCommand(
      "trivy",
      trivyScanArgs(root, env, { firstRun: options.firstRun, skipDbUpdate: true }),
      { ...runner, cwd: root, timeoutMs },
    ));
    cacheFallbackUsed = trivy.status !== "error" || !isTrivyDbUnavailable(trivy);
  }
  checks.push(makeCheck(
    "trivy filesystem scan",
    "dependencies",
    trivy,
    trivy.status === "fail" || (strict && (trivy.status === "error" || trivy.status === "missing")),
    cacheFallbackUsed
      ? "Trivy scan completed with a local cached vulnerability database after the online database update failed."
      : trivy.status === "error"
      ? "Trivy is installed but its vulnerability database was unavailable; release coverage is incomplete."
      : "High/critical vulnerabilities, secrets, and misconfigurations block release.",
    {
      checkId: "trivy",
      coverageGap: trivy.status === "error" || trivy.status === "missing",
      ...(cacheFallbackUsed ? { trivyDbFallback: "cache" } : {}),
    },
  ));
  if (cacheFallbackUsed) {
    checks.push(makeCheck(
      "trivy database freshness",
      "dependencies",
      {
        status: "gap",
        command: onlineUpdateFailure?.command || "trivy fs",
        code: onlineUpdateFailure?.code ?? null,
        stdout: onlineUpdateFailure?.stdout || "",
        stderr: onlineUpdateFailure?.stderr || "",
        durationMs: onlineUpdateFailure?.durationMs || 0,
      },
      strict,
      "Trivy online database update failed, so the scan used a local cached database; refresh the DB before treating this as complete release evidence.",
      {
        checkId: "trivy-db-cache",
        coverageGap: true,
        recommendation: "Pre-warm the Trivy cache on a network that can reach a DB mirror, or configure TRIVY_DB_REPOSITORY/TRIVY_JAVA_DB_REPOSITORY to reachable internal mirrors.",
        trivyDbFallback: "cache",
      },
    ));
  }

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
  const result = runCommand("semgrep", ["scan", "--config", "auto", "--error", "--json", project.root], {
    ...runner,
    cwd: project.root,
    timeoutMs: 20 * 60 * 1000,
    maxOutput: semgrepJsonOutputLimit,
  });
  const quickstartHardening = Boolean(options.firstRun) && isQuickstartSemgrepHardeningOnly(result);
  const ruleIds = quickstartHardening ? [...new Set(semgrepRuleIds(result))] : [];
  return [
    makeCheck(
      "semgrep static scan",
      "sast",
      result,
      (result.status === "fail" && !quickstartHardening) || (strict && result.status === "missing"),
      quickstartHardening
        ? "Semgrep found recommended hardening items for supply-chain posture; review them before release, but they do not block quickstart."
        : "High-confidence static analysis findings block release.",
      {
        checkId: "semgrep",
        ...(quickstartHardening
          ? {
              quickstartSeverity: "recommended-hardening",
              semgrepRuleIds: ruleIds,
              recommendation: "Review supply-chain hardening findings before a strict release gate.",
            }
          : {}),
      },
    ),
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
