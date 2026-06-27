#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath } from "node:url";
import { commandPath, runCommand } from "./lib/command-runner.mjs";

const coreTools = ["git", "npm", "pnpm", "yarn", "bun"];
const requiredScanners = ["gitleaks", "trivy", "semgrep"];
const optionalScanners = ["osv-scanner", "actionlint", "zizmor", "syft", "grype", "checkov", "squawk", "scorecard", "pre-commit", "mega-linter-runner"];

function inspectTool(name, options) {
  const resolved = commandPath(name, options.runnerOptions || {});
  if (!resolved) return { name, status: "missing", path: null, version: null };
  const result = runCommand(name, ["--version"], { ...(options.runnerOptions || {}), timeoutMs: 30 * 1000 });
  return {
    name,
    status: result.status === "pass" ? "available" : "error",
    path: resolved,
    version: `${result.stdout}\n${result.stderr}`.trim().split(/\r?\n/).find(Boolean) || `exit ${result.code}`,
  };
}

export function runDoctor(options = {}) {
  const required = requiredScanners.map((tool) => inspectTool(tool, options));
  const optional = optionalScanners.map((tool) => inspectTool(tool, options));
  const core = coreTools.map((tool) => inspectTool(tool, options));
  const trivyAvailable = required.find((tool) => tool.name === "trivy")?.status === "available";
  let trivyDb = { status: "skipped", summary: trivyAvailable ? "Trivy DB check disabled by option." : "trivy is not available" };

  if (trivyAvailable && options.checkTrivyDb !== false) {
    const result = runCommand("trivy", ["image", "--download-db-only", "--timeout", "30s"], {
      ...(options.runnerOptions || {}),
      timeoutMs: 60 * 1000,
    });
    trivyDb = {
      status: result.status === "pass" ? "available" : "error",
      summary: result.status === "pass" ? "Trivy vulnerability DB can be downloaded." : `${result.stderr}\n${result.stdout}`.trim(),
    };
  }

  return {
    node: { status: "available", version: process.version },
    core,
    required,
    optional,
    trivyDb,
    passed: required.every((tool) => tool.status === "available") && (trivyDb.status === "available" || trivyDb.status === "skipped"),
  };
}

function toMarkdown(report) {
  const lines = [];
  lines.push(`# AI Project Maintainer Doctor: ${report.passed ? "PASS" : "WARN"}`);
  lines.push("");
  lines.push(`- node: ${report.node.version}`);
  lines.push("");
  lines.push("## Core");
  for (const tool of report.core) lines.push(`- ${tool.name}: ${tool.status}${tool.version ? ` (${tool.version})` : ""}`);
  lines.push("");
  lines.push("## Required Scanners");
  for (const tool of report.required) lines.push(`- ${tool.name}: ${tool.status}${tool.version ? ` (${tool.version})` : ""}`);
  lines.push("");
  lines.push("## Optional Scanners");
  for (const tool of report.optional) lines.push(`- ${tool.name}: ${tool.status}${tool.version ? ` (${tool.version})` : ""}`);
  lines.push("");
  lines.push("## Trivy DB");
  lines.push(`- ${report.trivyDb.status}: ${report.trivyDb.summary}`);
  return lines.join("\n");
}

function main() {
  const jsonOnly = process.argv.includes("--json");
  const noTrivyDb = process.argv.includes("--no-trivy-db");
  const report = runDoctor({ checkTrivyDb: !noTrivyDb });
  console.log(jsonOnly ? JSON.stringify(report, null, 2) : toMarkdown(report));
  process.exit(report.passed ? 0 : 1);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
