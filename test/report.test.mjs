import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { buildJsonReport, toMarkdown, toSarif } from "../ai-project-maintainer/scripts/lib/report.mjs";
import { summarizeReport } from "../ai-project-maintainer/scripts/report-summary.mjs";

test("reports include blockers, warnings, coverage gaps, and tool versions", () => {
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: true, release: true },
    probe: {},
    checks: [
      { name: "package test", group: "tests", status: "pass", blocking: false, command: "npm test" },
      { name: "trivy filesystem scan", group: "security", status: "error", blocking: true, summary: "DB unavailable" },
      { name: "osv-scanner", group: "dependencies", status: "missing", blocking: false, summary: "optional tool missing" },
    ],
    toolVersions: { node: "v24.0.0" },
    invalidExceptions: [],
  });

  assert.equal(report.passed, false);
  assert.equal(report.blockers.length, 1);
  assert.equal(report.coverageGaps.length, 1);
  assert.equal(report.toolVersions.node, "v24.0.0");
  assert.match(toMarkdown(report), /Local Security Gate: FAIL/);
  assert.equal(toSarif(report).version, "2.1.0");
});

test("report summary accepts UTF-8 JSON with BOM", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-report-"));
  const reportPath = path.join(dir, "security-report.json");
  fs.writeFileSync(
    reportPath,
    `\uFEFF${JSON.stringify({
      passed: true,
      root: dir,
      mode: { strict: false, release: false },
      generatedAt: "2026-06-27T00:00:00.000Z",
      blockers: [],
      warnings: [],
      coverageGaps: [],
      toolVersions: {},
      checks: [],
      exceptions: { used: [], invalid: [] },
    })}`,
  );

  assert.match(summarizeReport(reportPath), /Local Security Gate: PASS/);
});

test("reports include open source maintenance score", () => {
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: false, release: false, profile: "oss" },
    probe: {},
    checks: [
      { name: "package test", group: "tests", status: "pass", blocking: false },
      { name: "gitleaks secret scan", group: "secrets", status: "pass", blocking: false },
      { name: "scorecard", group: "oss-hygiene", status: "missing", blocking: false },
      { name: "semgrep static scan", group: "sast", status: "fail", blocking: true, summary: "finding" },
    ],
    toolVersions: {},
    invalidExceptions: [],
  });

  assert.equal(typeof report.maintenance.score, "number");
  assert.equal(report.maintenance.grade, "C");
  assert.match(toMarkdown(report), /Open Source Maintenance Score/);
});
