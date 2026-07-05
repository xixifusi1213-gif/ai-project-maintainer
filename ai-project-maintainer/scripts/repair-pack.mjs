#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  buildRepairPack,
  readReport,
  writeRepairPackFiles,
} from "./lib/repair-pack.mjs";

function readOption(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) {
    const inline = args.find((arg) => arg.startsWith(`${name}=`));
    return inline ? inline.slice(name.length + 1) : fallback;
  }
  return args[index + 1] || fallback;
}

function firstPositional(args, optionValueNames = []) {
  return args.find((arg, index) => !arg.startsWith("--") && !optionValueNames.includes(args[index - 1]));
}

export function parseRepairPackArgs(argv) {
  const reportPath = firstPositional(argv, ["--project", "--output"]) || "reports/security-report.json";
  return {
    reportPath,
    projectRoot: readOption(argv, "--project", null),
    outputDir: readOption(argv, "--output", path.dirname(reportPath)),
    jsonOnly: argv.includes("--json"),
  };
}

export function runRepairPack(reportPath, options = {}) {
  const report = readReport(reportPath);
  const projectRoot = options.projectRoot || report.root || ".";
  const outputDir = options.outputDir || path.dirname(reportPath);
  const repairPack = buildRepairPack(report, {
    reportPath,
    projectRoot,
  });
  const files = writeRepairPackFiles(repairPack, outputDir);
  return { repairPack, files };
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  const modulePath = fileURLToPath(import.meta.url);
  try {
    return fs.realpathSync(process.argv[1]) === modulePath;
  } catch {
    return path.resolve(process.argv[1]) === modulePath;
  }
}

if (isDirectRun()) {
  try {
    const args = parseRepairPackArgs(process.argv.slice(2));
    const result = runRepairPack(args.reportPath, {
      projectRoot: args.projectRoot,
      outputDir: args.outputDir,
    });
    if (args.jsonOnly) {
      process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    } else {
      process.stdout.write(`AI Agent Repair Pack generated: ${result.repairPack.summary.total} task(s)\n`);
      for (const file of Object.values(result.files)) process.stdout.write(`- ${file}\n`);
    }
    process.exit(0);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
}
