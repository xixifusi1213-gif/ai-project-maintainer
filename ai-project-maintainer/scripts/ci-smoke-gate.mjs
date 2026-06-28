#!/usr/bin/env node
import path from "node:path";
import { runLocalGate } from "./run-local-gate.mjs";

const projectRoot = path.resolve(process.argv[2] || process.cwd());
const outputPath = process.argv[3] || "reports/security-report.json";

const report = runLocalGate(projectRoot, {
  noTests: true,
  outputPath,
  writeReports: true,
  runnerOptions: {
    envPath: "",
  },
});

const summary = {
  status: report.passed ? "PASS" : "FAIL",
  blockers: report.summary?.blockers ?? 0,
  warnings: report.summary?.warnings ?? 0,
  coverageGaps: report.summary?.coverageGaps ?? 0,
  outputPath,
};

console.log(JSON.stringify(summary, null, 2));
process.exit(report.passed ? 0 : 1);
