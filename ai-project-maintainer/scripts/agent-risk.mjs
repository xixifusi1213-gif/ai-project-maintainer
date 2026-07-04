#!/usr/bin/env node
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { runAgentRisk, toAgentRiskMarkdown } from "./lib/agent-risk.mjs";

function readOption(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index !== -1) return args[index + 1] || fallback;
  const inline = args.find((arg) => arg.startsWith(`${name}=`));
  return inline ? inline.slice(name.length + 1) : fallback;
}

function parseArgs(args) {
  return {
    projectRoot: args.find((arg) => !arg.startsWith("--")) || process.cwd(),
    outputPath: readOption(args, "--output", null),
    jsonOnly: args.includes("--json"),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const outputPath = args.outputPath || path.resolve(args.projectRoot, "reports", "agent-risk-report.json");
  const report = runAgentRisk(args.projectRoot, { outputPath, writeReports: true });
  console.log(args.jsonOnly ? JSON.stringify(report, null, 2) : toAgentRiskMarkdown(report));
  process.exit(report.passed ? 0 : 1);
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
