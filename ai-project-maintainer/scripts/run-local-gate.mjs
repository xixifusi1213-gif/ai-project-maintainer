#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import os from "node:os";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const args = process.argv.slice(2);
const repoArg = args.find((arg) => !arg.startsWith("--")) || process.cwd();
const root = path.resolve(repoArg);
const strict = args.includes("--strict");
const release = args.includes("--release");
const jsonOnly = args.includes("--json");
const noTests = args.includes("--no-tests");
const outputArg = args.find((arg) => arg.startsWith("--output="));
const outputPath = outputArg ? path.resolve(outputArg.slice("--output=".length)) : null;
const skillDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const isWindows = process.platform === "win32";
const maxOutput = 6000;
const allowedCommands = new Set([
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "gitleaks",
  "trivy",
  "semgrep",
  "checkov",
  "squawk",
]);

function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

function commandPath(command) {
  if (!allowedCommands.has(command)) return null;
  const preferredBins = [
    process.env.AI_PROJECT_MAINTAINER_TOOLS_BIN,
    path.join(os.homedir(), ".codex", "security-tools", "bin"),
  ].filter(Boolean);
  const pathValue = process.env.PATH || "";
  const exts = isWindows ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";") : [""];
  for (const dir of [...preferredBins, ...pathValue.split(path.delimiter)]) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = path.join(dir, command + ext);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

function tail(value) {
  const text = String(value || "").trim();
  if (text.length <= maxOutput) return text;
  return text.slice(text.length - maxOutput);
}

function run(command, commandArgs, options = {}) {
  const resolved = commandPath(command);
  if (!resolved) {
    return {
      status: "missing",
      command: [command, ...commandArgs].join(" "),
      stdout: "",
      stderr: `${command} is not installed or not on PATH`,
      code: null,
    };
  }

  const started = Date.now();
  // Commands are selected from allowedCommands, resolved to an executable path, and run without a shell.
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
  const result = spawnSync(resolved, commandArgs, {
    cwd: options.cwd || root,
    encoding: "utf8",
    timeout: options.timeoutMs || 10 * 60 * 1000,
    maxBuffer: 20 * 1024 * 1024,
  });

  return {
    status: result.status === 0 ? "pass" : "fail",
    command: [command, ...commandArgs].join(" "),
    stdout: tail(result.stdout),
    stderr: tail(result.stderr || result.error?.message || ""),
    code: result.status,
    durationMs: Date.now() - started,
  };
}

function makeCheck(name, group, result, blocking, summary) {
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
  };
}

function normalizeToolResult(toolName, result) {
  if (
    toolName === "trivy" &&
    result.status === "fail" &&
    /failed to download vulnerability DB|DB error|download artifact/i.test(`${result.stderr}\n${result.stdout}`)
  ) {
    return { ...result, status: "error" };
  }
  return result;
}

function listFiles(dir, out = [], depth = 0) {
  if (out.length > 7000 || depth > 8) return out;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    if ([".git", "node_modules", "dist", "build", "coverage", ".next", "target", "vendor"].includes(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) listFiles(full, out, depth + 1);
    if (entry.isFile()) out.push(path.relative(root, full).replaceAll(path.sep, "/"));
  }
  return out;
}

function getProbe() {
  const probeScript = path.join(skillDir, "scripts", "probe-project.mjs");
  const result = spawnSync(process.execPath, [probeScript, root], {
    cwd: root,
    encoding: "utf8",
    timeout: 60 * 1000,
    maxBuffer: 10 * 1024 * 1024,
  });
  if (result.status !== 0) {
    return { error: tail(result.stderr || result.stdout), availableTools: {}, riskSurfaces: {} };
  }
  return JSON.parse(result.stdout);
}

function packageManager() {
  if (exists(path.join(root, "pnpm-lock.yaml"))) return { name: "pnpm", run: ["pnpm"], audit: ["pnpm", ["audit", "--prod", "--json"]] };
  if (exists(path.join(root, "yarn.lock"))) return { name: "yarn", run: ["yarn"], audit: ["yarn", ["npm", "audit", "--environment", "production", "--json"]] };
  if (exists(path.join(root, "bun.lock")) || exists(path.join(root, "bun.lockb"))) return { name: "bun", run: ["bun", "run"], audit: null };
  if (exists(path.join(root, "package-lock.json")) || exists(path.join(root, "package.json"))) return { name: "npm", run: ["npm", "run"], audit: ["npm", ["audit", "--omit=dev", "--json"]] };
  return null;
}

function runNodeChecks(checks) {
  const pkg = readJson(path.join(root, "package.json"));
  if (!pkg) return;
  const pm = packageManager();
  if (!pm) return;
  const scripts = pkg.scripts || {};

  if (!noTests && scripts.test) {
    const commandArgs = pm.name === "npm" ? ["test"] : pm.name === "pnpm" ? ["test"] : pm.name === "yarn" ? ["test"] : ["run", "test"];
    const result = run(pm.name, commandArgs, { timeoutMs: 15 * 60 * 1000 });
    checks.push(makeCheck("package test", "tests", result, result.status === "fail", "Project test script must pass."));
  }

  if (!noTests && scripts["test:e2e"]) {
    const commandArgs = pm.name === "npm" ? ["run", "test:e2e"] : pm.name === "pnpm" ? ["run", "test:e2e"] : pm.name === "yarn" ? ["test:e2e"] : ["run", "test:e2e"];
    const result = run(pm.name, commandArgs, { timeoutMs: 20 * 60 * 1000 });
    checks.push(makeCheck("e2e test", "tests", result, result.status === "fail", "End-to-end tests must pass when present."));
  }

  if (release) {
    for (const scriptName of ["build", "dist"]) {
      if (!scripts[scriptName]) continue;
      const commandArgs = pm.name === "npm" ? ["run", scriptName] : pm.name === "pnpm" ? ["run", scriptName] : pm.name === "yarn" ? [scriptName] : ["run", scriptName];
      const result = run(pm.name, commandArgs, { timeoutMs: 25 * 60 * 1000 });
      checks.push(makeCheck(`release ${scriptName}`, "release", result, result.status === "fail", `Release script '${scriptName}' must pass.`));
    }
  }

  if (pm.audit) {
    const [cmd, commandArgs] = pm.audit;
    const result = run(cmd, commandArgs, { timeoutMs: 10 * 60 * 1000 });
    checks.push(makeCheck(`${pm.name} production audit`, "dependencies", result, result.status === "fail", "Production dependency audit must pass or have a documented exception."));
  }
}

function runExternalChecks(checks, probe) {
  const hasInfra = (probe.riskSurfaces?.infra || []).length > 0;
  const hasDatabase = (probe.riskSurfaces?.database || []).length > 0;
  const files = listFiles(root);
  const sqlFiles = files.filter((file) => /\.(sql)$/i.test(file) && /migrations?|db\/migrate|schema/i.test(file)).slice(0, 100);

  const gitleaks = run("gitleaks", ["detect", "--source", root, "--redact", "--no-git"]);
  checks.push(makeCheck("gitleaks secret scan", "secrets", gitleaks, gitleaks.status === "fail" || (strict && gitleaks.status === "missing"), "Committed secrets block release."));

  const trivy = normalizeToolResult("trivy", run("trivy", [
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
  ], { timeoutMs: 150 * 1000 }));
  checks.push(makeCheck(
    "trivy filesystem scan",
    "security",
    trivy,
    trivy.status === "fail" || trivy.status === "error" || (strict && trivy.status === "missing"),
    trivy.status === "error"
      ? "Trivy is installed but its vulnerability database was unavailable; release coverage is incomplete."
      : "High/critical vulnerabilities, secrets, and misconfigurations block release.",
  ));

  const semgrep = run("semgrep", ["scan", "--config", "auto", "--error", root], { timeoutMs: 20 * 60 * 1000 });
  checks.push(makeCheck("semgrep static scan", "sast", semgrep, semgrep.status === "fail" || (strict && semgrep.status === "missing"), "High-confidence static analysis findings block release."));

  if (hasInfra) {
    const checkov = run("checkov", ["-d", root, "--quiet", "--compact"], { timeoutMs: 15 * 60 * 1000 });
    checks.push(makeCheck("checkov IaC scan", "iac", checkov, checkov.status === "fail" || (strict && checkov.status === "missing"), "IaC security failures block release when infra files exist."));
  }

  if (hasDatabase && sqlFiles.length > 0) {
    const squawk = run("squawk", sqlFiles.map((file) => path.join(root, file)), { timeoutMs: 10 * 60 * 1000 });
    checks.push(makeCheck("squawk SQL migration lint", "database", squawk, squawk.status === "fail" || (strict && squawk.status === "missing"), "Unsafe SQL migration patterns block release."));
  }
}

function runElectronChecks(checks) {
  const pkg = readJson(path.join(root, "package.json"));
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const files = listFiles(root).filter((file) => /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(file));
  const electronDetected = Boolean(deps.electron) || files.some((file) => /(^|\/)(main|preload|electron)\.(js|ts|mjs|cjs)$/i.test(file));
  if (!electronDetected) return;

  const dangerous = [];
  const suspiciousIpc = [];
  for (const file of files.slice(0, 1200)) {
    const full = path.join(root, file);
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

  const status = dangerous.length ? "fail" : "pass";
  checks.push({
    name: "electron baseline",
    group: "electron",
    status,
    blocking: dangerous.length > 0,
    summary: dangerous.length
      ? "Dangerous Electron webPreferences detected."
      : suspiciousIpc.length
        ? "Electron detected; privileged IPC/file/shell patterns need manual review."
        : "Electron baseline did not find known-dangerous webPreferences.",
    evidence: { dangerous, suspiciousIpc: suspiciousIpc.slice(0, 30) },
  });
}

function summarize(checks, probe) {
  const blockers = checks.filter((check) => check.blocking);
  const missing = checks.filter((check) => check.status === "missing");
  return {
    root,
    mode: { strict, release, noTests },
    passed: blockers.length === 0,
    blockerCount: blockers.length,
    missingCount: missing.length,
    generatedAt: new Date().toISOString(),
    probe,
    checks,
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# Local Security Gate: ${report.passed ? "PASS" : "FAIL"}`);
  lines.push("");
  lines.push(`Root: ${report.root}`);
  lines.push(`Mode: strict=${report.mode.strict}, release=${report.mode.release}`);
  lines.push("");
  lines.push("## Blocking Checks");
  const blockers = report.checks.filter((check) => check.blocking);
  if (!blockers.length) lines.push("- None");
  for (const check of blockers) {
    lines.push(`- ${check.name}: ${check.status}. ${check.summary}`);
  }
  lines.push("");
  lines.push("## Checks Run");
  for (const check of report.checks) {
    lines.push(`- ${check.name}: ${check.status}${check.command ? ` (${check.command})` : ""}`);
  }
  lines.push("");
  lines.push("## Coverage Gaps");
  const missing = report.checks.filter((check) => check.status === "missing");
  if (!missing.length) lines.push("- None");
  for (const check of missing) {
    lines.push(`- ${check.name}: tool missing. ${check.summary}`);
  }
  lines.push("");
  lines.push("## Next Step");
  lines.push(report.passed ? "- Gate passed. Promote stable checks into CI." : "- Fix blocking checks, then rerun this gate.");
  return lines.join("\n");
}

const checks = [];
const probe = getProbe();
runNodeChecks(checks);
runExternalChecks(checks, probe);
runElectronChecks(checks);

const report = summarize(checks, probe);
if (outputPath) fs.writeFileSync(outputPath, JSON.stringify(report, null, 2));

if (jsonOnly) {
  console.log(JSON.stringify(report, null, 2));
} else {
  console.log(toMarkdown(report));
}

process.exit(report.passed ? 0 : 1);
