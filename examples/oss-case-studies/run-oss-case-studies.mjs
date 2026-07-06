#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { BENCHMARK_CASES, runBenchmarkCases } from "../benchmark-cases/run-benchmark-cases.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const legacyCaseIds = ["siyuan-electron-rce", "ghost-sql-injection"];

export const CASE_STUDIES = BENCHMARK_CASES.filter((caseStudy) => legacyCaseIds.includes(caseStudy.id));

function cleanupBenchmarkOnlyFiles(outputDir) {
  fs.rmSync(path.join(outputDir, "benchmark-summary.md"), { force: true });
  for (const id of legacyCaseIds) {
    const caseDir = path.join(outputDir, id);
    fs.rmSync(path.join(caseDir, "case-metadata.json"), { force: true });
    fs.rmSync(path.join(caseDir, "before-repair-pack"), { recursive: true, force: true });
    for (const stage of ["before", "patched-release", "after"]) {
      fs.rmSync(path.join(caseDir, `${stage}-security-report.json`), { force: true });
      fs.rmSync(path.join(caseDir, `${stage}-security-report.md`), { force: true });
    }
  }
}

function parseArgs(argv) {
  const args = {
    verify: false,
    allowNetwork: true,
    legacyNames: true,
    caseIds: legacyCaseIds,
    outputDir: path.join(repoRoot, "reports", "oss-case-studies"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--verify") args.verify = true;
    else if (arg === "--offline") args.allowNetwork = false;
    else if (arg === "--update-docs") args.outputDir = path.join(repoRoot, "docs", "cases");
    else if (arg === "--output") {
      args.outputDir = path.resolve(argv[i + 1]);
      i += 1;
    }
  }

  return args;
}

export async function runOssCaseStudies(options = {}) {
  const result = await runBenchmarkCases({
    ...options,
    caseIds: legacyCaseIds,
    legacyNames: true,
    outputDir: options.outputDir || path.join(repoRoot, "reports", "oss-case-studies"),
  });
  cleanupBenchmarkOnlyFiles(result.outputDir);
  const reports = Object.fromEntries(Object.entries(result.results).map(([id, value]) => [id, value.reports]));
  return { outputDir: result.outputDir, reports };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const result = await runOssCaseStudies(args);
  console.log(`OSS case study reports written to ${result.outputDir}`);
}
