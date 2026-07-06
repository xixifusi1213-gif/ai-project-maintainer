import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { BENCHMARK_CASES, runBenchmarkCases } from "../examples/benchmark-cases/run-benchmark-cases.mjs";

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function walkFiles(root) {
  const files = [];
  const stack = [root];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else files.push(full);
    }
  }
  return files;
}

function assertNoSensitiveText(outputDir) {
  const forbidden = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /github_pat_[A-Za-z0-9_]+/,
    /ghp_[A-Za-z0-9_]+/,
    /authorization\s*[:=]/i,
    /bearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
    /postgres:\/\/\S+/i,
    /mysql:\/\/\S+/i,
    /mongodb(\+srv)?:\/\/\S+/i,
    /C:\\Users\\tianf/i,
    /E:\\/i,
  ];

  for (const file of walkFiles(outputDir)) {
    const text = read(file);
    for (const re of forbidden) assert.doesNotMatch(text, re, `${file} contains ${re}`);
  }
}

test("benchmark metadata covers five project risk categories", () => {
  assert.equal(BENCHMARK_CASES.length, 5);
  assert.deepEqual(new Set(BENCHMARK_CASES.map((item) => item.category)), new Set([
    "electron-desktop",
    "database",
    "web-api",
    "ci-supply-chain",
    "oss-library",
  ]));
  for (const caseStudy of BENCHMARK_CASES) {
    assert.ok(caseStudy.id);
    assert.match(caseStudy.repo, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    assert.match(caseStudy.advisoryUrl, /^https:\/\//);
    assert.ok(caseStudy.vulnerableRef);
    assert.ok(caseStudy.fixedRef);
    assert.ok(caseStudy.patchCommit);
    assert.ok(caseStudy.evidenceType);
    assert.equal(caseStudy.expected.before, "FAIL");
    assert.equal(Object.values(caseStudy.expected).includes("PASS_WITH_GAPS"), true);
  }
});

test("benchmark runner generates reports and repair packs for every case", async () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-benchmark-test-"));
  const { results } = await runBenchmarkCases({ outputDir, verify: true, allowNetwork: false });

  assert.equal(Object.keys(results).length, 5);
  for (const [id, result] of Object.entries(results)) {
    const caseDir = path.join(outputDir, id);
    assert.equal(fs.existsSync(path.join(caseDir, "case-metadata.json")), true);
    assert.equal(fs.existsSync(path.join(caseDir, "before-security-report.json")), true);
    assert.equal(fs.existsSync(path.join(caseDir, "before-repair-pack", "agent-tasks.json")), true);
    assert.equal(fs.existsSync(path.join(caseDir, "before-repair-pack", "fix-plan.md")), true);
    assert.equal(fs.existsSync(path.join(caseDir, "after-security-report.json")), true);
    assert.equal(fs.existsSync(path.join(caseDir, "case-summary.md")), true);
    assert.equal(result.reports.before.overallStatus, "FAIL");
    assert.equal(result.repairPack.summary.total > 0, true);
    for (const task of result.repairPack.tasks) {
      assert.notEqual(task.type === "auto_fix_candidate" && task.source.group === "production-audit", true);
    }
  }
  const summary = read(path.join(outputDir, "benchmark-summary.md"));
  assert.match(summary, /AI Project Maintainer Benchmark Summary/);
  assert.match(summary, /Evidence type/);
  assert.match(read(path.join(outputDir, "siyuan-electron-rce", "case-summary.md")), /Evidence type: advisory \+ patched release \+ hardening model/);
  assert.match(read(path.join(outputDir, "siyuan-electron-rce", "case-summary.md")), /does not modify upstream projects/);
  assertNoSensitiveText(outputDir);
});

test("committed benchmark docs expose launch snapshot", () => {
  const packageJson = JSON.parse(read(path.resolve("package.json")));
  assert.equal(packageJson.files.includes("examples/benchmark-cases/"), true);
  assert.match(read(path.resolve("README.md")), /Public Benchmark/);
  assert.match(read(path.resolve("README.md")), /does not claim upstream fixes were made by this tool/);
  assert.match(read(path.resolve("docs", "BENCHMARK.md")), /npm run benchmark:verify/);
  assert.match(read(path.resolve("docs", "BENCHMARK.md")), /Evidence type/);
  assert.match(read(path.resolve("docs", "BENCHMARK.md")), /does not modify upstream projects/);
  assert.match(read(path.resolve("docs", "BENCHMARK.zh-CN.md")), /公开 Benchmark/);
  assert.match(read(path.resolve("docs", "benchmark-output", "benchmark-summary.md")), /TanStack npm package compromise/);
  assert.match(read(path.resolve("docs", "benchmark-output", "benchmark-summary.md")), /Evidence type/);
});

test("CI and publish workflows verify benchmark cases", () => {
  assert.match(read(path.resolve(".github", "workflows", "ci.yml")), /npm run benchmark:verify/);
  assert.match(read(path.resolve(".github", "workflows", "publish.yml")), /npm run benchmark:verify/);
});
