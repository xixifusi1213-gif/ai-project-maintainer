#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(scriptDir, "..", "..");
const npmCli = process.env.npm_execpath || path.join(path.dirname(process.execPath), "node_modules", "npm", "bin", "npm-cli.js");

function runProcess(file, args, options = {}) {
  const result = spawnSync(file, args, {
    cwd: options.cwd || root,
    encoding: "utf8",
    timeout: options.timeoutMs || 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0 && !options.allowNonZero) {
    throw new Error(
      [
        `Command failed: ${[file, ...args].join(" ")}`,
        result.error?.message,
        String(result.stdout || "").trim(),
        String(result.stderr || "").trim(),
      ].filter(Boolean).join("\n"),
    );
  }

  return result;
}

function runNpm(args, options = {}) {
  const result = spawnSync(process.execPath, [npmCli, ...args], {
    cwd: options.cwd || root,
    encoding: "utf8",
    timeout: options.timeoutMs || 120_000,
    maxBuffer: 20 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(
      [
        `Command failed: npm ${args.join(" ")}`,
        result.error?.message,
        String(result.stdout || "").trim(),
        String(result.stderr || "").trim(),
      ].filter(Boolean).join("\n"),
    );
  }

  return result;
}

function runBin(tempRoot, args, options = {}) {
  const command = path.join(tempRoot, "node_modules", ".bin", process.platform === "win32" ? "ai-project-maintainer.cmd" : "ai-project-maintainer");
  if (process.platform !== "win32") return runProcess(command, args, { cwd: tempRoot, ...options });
  return runProcess(process.env.ComSpec || "cmd.exe", ["/d", "/s", "/c", "call", command, ...args], { cwd: tempRoot, ...options });
}

function expectFile(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`Expected file to exist: ${filePath}`);
  }
}

const pkg = JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8"));
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apm-package-smoke-"));
const packDir = path.join(tempRoot, "pack");
const projectDir = path.join(tempRoot, "project");
fs.mkdirSync(packDir, { recursive: true });
fs.mkdirSync(projectDir, { recursive: true });

runNpm(["pack", "--silent", "--pack-destination", packDir]);
const tarball = fs.readdirSync(packDir).find((file) => file.endsWith(".tgz"));
if (!tarball) throw new Error(`npm pack did not create a tarball in ${packDir}`);
const tarballPath = path.join(packDir, tarball);

runNpm(["install", "--no-audit", "--no-fund", tarballPath], { cwd: tempRoot, timeoutMs: 120_000 });

const version = runBin(tempRoot, ["--version"]).stdout.trim();
if (version !== pkg.version) {
  throw new Error(`Expected CLI version ${pkg.version}, got ${version || "<empty>"}`);
}

const doctor = runBin(tempRoot, ["doctor", "--no-trivy-db"], { allowNonZero: true });
if (!doctor.stdout.includes("AI Project Maintainer Doctor")) {
  throw new Error(`Doctor smoke did not print the expected report:\n${doctor.stdout}\n${doctor.stderr}`);
}

const connectorsDoctor = runBin(tempRoot, ["connectors", "doctor", projectDir]);
if (!connectorsDoctor.stdout.includes("providers")) {
  throw new Error(`Connectors doctor smoke did not print the expected report:\n${connectorsDoctor.stdout}\n${connectorsDoctor.stderr}`);
}

const evidence = runBin(tempRoot, ["evidence", projectDir, "--output", "reports/evidence-report.json"]);
if (!evidence.stdout.includes("connectorsEnabled")) {
  throw new Error(`Evidence smoke did not print the expected report:\n${evidence.stdout}\n${evidence.stderr}`);
}

const wizardDryRun = runBin(tempRoot, ["init-audit", projectDir, "--wizard", "--dry-run"], { allowNonZero: true });
if (wizardDryRun.status !== 0 || !wizardDryRun.stdout.includes("Project Intake Summary") || fs.existsSync(path.join(projectDir, ".ai-maintainer"))) {
  throw new Error(`Wizard dry-run smoke failed:\n${wizardDryRun.stdout}\n${wizardDryRun.stderr}`);
}

runBin(tempRoot, [
  "init",
  projectDir,
  "--profile",
  "oss",
  "--ci",
  "github",
]);

expectFile(path.join(projectDir, ".ai-maintainer", "policy.yml"));
expectFile(path.join(projectDir, ".ai-maintainer", "exceptions.yml"));
expectFile(path.join(projectDir, ".github", "workflows", "security-gate.yml"));
expectFile(path.join(projectDir, "reports", ".gitkeep"));

console.log(`npm package smoke passed for ai-project-maintainer@${pkg.version}`);
