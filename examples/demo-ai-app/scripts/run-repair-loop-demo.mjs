#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

import { runLocalGate } from "../../../ai-project-maintainer/scripts/run-local-gate.mjs";
import { runRepairPack } from "../../../ai-project-maintainer/scripts/repair-pack.mjs";
import { createBeforeState } from "./create-before-state.mjs";
import { writeMockTool } from "./run-demo-gate.mjs";

function readOption(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) {
    const inline = args.find((arg) => arg.startsWith(`${name}=`));
    return inline ? inline.slice(name.length + 1) : fallback;
  }
  return args[index + 1] || fallback;
}

function childEnv() {
  const env = { ...process.env };
  delete env.NODE_TEST_CONTEXT;
  return env;
}

function runNpmTest(projectRoot) {
  const command = process.platform === "win32" ? process.env.ComSpec || "cmd.exe" : "npm";
  const args = process.platform === "win32" ? ["/d", "/s", "/c", "npm test"] : ["test"];
  return spawnSync(command, args, {
    cwd: projectRoot,
    encoding: "utf8",
    timeout: 120_000,
    maxBuffer: 10 * 1024 * 1024,
    env: childEnv(),
  });
}

function runDemoStyleGate(projectRoot, outputPath) {
  const toolsDir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-repair-loop-tools-"));
  writeMockTool(toolsDir);
  return runLocalGate(projectRoot, {
    strict: true,
    release: true,
    production: true,
    outputPath,
    writeReports: true,
    runnerOptions: {
      envPath: `${toolsDir}${path.delimiter}${process.env.PATH || ""}`,
      env: childEnv(),
    },
  });
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, ""));
}

function copyHealthyImplementation(demoRoot, beforeRoot) {
  const source = path.join(demoRoot, "src", "order-risk.js");
  const destination = path.join(beforeRoot, "src", "order-risk.js");
  fs.copyFileSync(source, destination);
  return [path.relative(beforeRoot, destination)];
}

function assertRepairPackShape(agentTasks, codexTasks) {
  const autoFixTasks = agentTasks.tasks.filter((task) => task.type === "auto_fix_candidate");
  if (!autoFixTasks.length) {
    throw new Error("Expected repair pack to contain at least one auto_fix_candidate task.");
  }
  if (!autoFixTasks.some((task) => task.verificationCommands.includes("npm test"))) {
    throw new Error("Expected an auto_fix_candidate task with npm test as a verification command.");
  }
  if (agentTasks.tasks.some((task) => task.type === "auto_fix_candidate" && task.source.group === "production-audit")) {
    throw new Error("Production audit GAP tasks must not be treated as auto-fix candidates.");
  }
  if (codexTasks.targetAgent !== "codex" || codexTasks.tasks.length !== agentTasks.tasks.length) {
    throw new Error("Expected codex-tasks.json to preserve the Codex adapter structure.");
  }
  return autoFixTasks;
}

export function runRepairLoopDemo({ outputDir = null } = {}) {
  const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const workRoot = fs.mkdtempSync(path.join(os.tmpdir(), "apm-repair-loop-"));
  const beforeRoot = createBeforeState({ outputPath: path.join(workRoot, "before") }).destination;
  const reportsDir = path.resolve(outputDir || path.join(beforeRoot, "reports"));
  fs.mkdirSync(reportsDir, { recursive: true });

  const beforeReportPath = path.join(reportsDir, "before-security-report.json");
  const beforeReport = runDemoStyleGate(beforeRoot, beforeReportPath);
  if (beforeReport.passed) {
    throw new Error(`Expected before-state gate to fail, got ${beforeReport.overallStatus}.`);
  }

  const { repairPack, files } = runRepairPack(beforeReportPath, {
    projectRoot: beforeRoot,
    outputDir: reportsDir,
  });
  const agentTasks = readJson(files.agentTasks);
  const codexTasks = readJson(files.codexTasks);
  const autoFixTasks = assertRepairPackShape(agentTasks, codexTasks);

  const copiedFiles = copyHealthyImplementation(demoRoot, beforeRoot);
  const recheck = runNpmTest(beforeRoot);
  if (recheck.status !== 0) {
    throw new Error(`Expected npm test recheck to pass after simulated AI repair.\n${recheck.stdout}\n${recheck.stderr}`);
  }

  const finalReportPath = path.join(reportsDir, "security-report.json");
  const finalReport = runDemoStyleGate(beforeRoot, finalReportPath);
  if (!finalReport.passed || finalReport.overallStatus !== "PASS_WITH_GAPS") {
    throw new Error(`Expected final gate to be PASS_WITH_GAPS, got ${finalReport.overallStatus}.`);
  }

  const summary = {
    schemaVersion: 1,
    workRoot,
    before: {
      root: beforeRoot,
      overallStatus: beforeReport.overallStatus,
      passed: beforeReport.passed,
      blockerCount: beforeReport.blockerCount,
    },
    repairPack: {
      taskCount: repairPack.summary.total,
      autoFixCount: autoFixTasks.length,
      agentTasks: path.relative(beforeRoot, files.agentTasks),
      codexTasks: path.relative(beforeRoot, files.codexTasks),
    },
    simulatedAiRepair: {
      copiedFiles,
    },
    recheck: {
      command: "npm test",
      status: recheck.status,
    },
    after: {
      overallStatus: finalReport.overallStatus,
      passed: finalReport.passed,
      coverageGapCount: finalReport.coverageGapCount,
    },
  };
  fs.writeFileSync(path.join(reportsDir, "repair-loop-summary.json"), `${JSON.stringify(summary, null, 2)}\n`);

  return { summary, beforeReport, finalReport, repairPack, files };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const outputDir = readOption(process.argv.slice(2), "--output", null);
    const jsonOnly = process.argv.includes("--json");
    const { summary } = runRepairLoopDemo({ outputDir });
    if (jsonOnly) {
      console.log(JSON.stringify(summary, null, 2));
    } else {
      console.log(`Repair loop demo: ${summary.before.overallStatus} -> ${summary.after.overallStatus}`);
      console.log(`AI-agent tasks: ${summary.repairPack.taskCount} total, ${summary.repairPack.autoFixCount} auto-fix candidate(s)`);
      console.log(`Recheck: ${summary.recheck.command} exited ${summary.recheck.status}`);
      console.log(`Reports: ${path.dirname(path.resolve(summary.workRoot, "before", summary.repairPack.agentTasks))}`);
    }
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
