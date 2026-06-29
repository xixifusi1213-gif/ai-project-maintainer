import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { CASE_STUDIES, runOssCaseStudies } from "../examples/oss-case-studies/run-oss-case-studies.mjs";

function read(filePath) {
  return fs.readFileSync(filePath, "utf8");
}

function assertNoSensitiveText(outputDir) {
  const forbidden = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /github_pat_[A-Za-z0-9_]+/,
    /ghp_[A-Za-z0-9_]+/,
    /postgres:\/\/\S+/i,
    /mysql:\/\/\S+/i,
    /mongodb(\+srv)?:\/\/\S+/i,
    /C:\\Users\\tianf/i,
    /E:\\/i,
  ];

  const stack = [outputDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) {
        stack.push(full);
      } else {
        const text = read(full);
        for (const re of forbidden) assert.doesNotMatch(text, re, `${full} contains ${re}`);
      }
    }
  }
}

test("OSS case metadata pins advisories, refs, and patch commits", () => {
  assert.equal(CASE_STUDIES.length, 2);
  for (const caseStudy of CASE_STUDIES) {
    assert.match(caseStudy.repo, /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/);
    assert.match(caseStudy.advisory, /^GHSA-/);
    assert.match(caseStudy.advisoryUrl, /^https:\/\/github\.com\//);
    assert.ok(caseStudy.vulnerableRef);
    assert.ok(caseStudy.fixedRef);
    assert.match(caseStudy.patchCommit, /^[0-9a-f]{7,40}$/);
    assert.match(caseStudy.patchUrl, /^https:\/\/github\.com\//);
  }
});

test("OSS case runner generates expected before and after report statuses", async () => {
  const outputDir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-oss-cases-test-"));
  const { reports } = await runOssCaseStudies({ outputDir, verify: true, allowNetwork: false });

  assert.equal(reports["siyuan-electron-rce"].before.overallStatus, "FAIL");
  assert.equal(reports["siyuan-electron-rce"]["patched-release"].overallStatus, "FAIL");
  assert.equal(reports["siyuan-electron-rce"].after.overallStatus, "PASS_WITH_GAPS");
  assert.equal(reports["ghost-sql-injection"].before.overallStatus, "FAIL");
  assert.equal(reports["ghost-sql-injection"].after.overallStatus, "PASS_WITH_GAPS");

  assert.equal(fs.existsSync(path.join(outputDir, "siyuan-electron-rce", "before-report.md")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "siyuan-electron-rce", "patched-release-report.md")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "siyuan-electron-rce", "after-report.md")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "ghost-sql-injection", "before-report.md")), true);
  assert.equal(fs.existsSync(path.join(outputDir, "ghost-sql-injection", "after-report.md")), true);
  assertNoSensitiveText(outputDir);
});

test("committed OSS case docs expose summaries and launch snapshots", () => {
  assert.match(read(path.resolve("docs", "CASE-STUDIES.md")), /Real OSS Case Studies/);
  assert.match(read(path.resolve("docs", "cases", "electron-oss-before-after.md")), /SiYuan/);
  assert.match(read(path.resolve("docs", "cases", "ghost-sql-injection-before-after.md")), /Ghost/);
  assert.match(read(path.resolve("docs", "cases", "siyuan-electron-rce", "case-summary.md")), /patched-release/);
  assert.match(read(path.resolve("docs", "cases", "ghost-sql-injection", "case-summary.md")), /PASS_WITH_GAPS/);
});
