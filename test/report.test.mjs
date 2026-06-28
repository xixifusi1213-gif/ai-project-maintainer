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
  assert.equal(report.overallStatus, "FAIL");
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
      overallStatus: "PASS",
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

test("reports distinguish pass, warnings, gaps, and failures", () => {
  const base = {
    root: "C:/project",
    mode: { strict: false, release: false },
    probe: {},
    toolVersions: {},
    invalidExceptions: [],
  };

  const pass = buildJsonReport({ ...base, checks: [{ name: "package test", group: "tests", status: "pass", blocking: false }] });
  const warnings = buildJsonReport({ ...base, checks: [{ name: "scorecard", group: "oss-hygiene", status: "fail", blocking: false, coverageGap: false }] });
  const gaps = buildJsonReport({ ...base, checks: [{ name: "production audit: alerts", group: "production-audit", status: "GAP", blocking: false, coverageGap: true }] });
  const decisions = buildJsonReport({ ...base, checks: [{ name: "production audit: core flows", group: "production-audit", status: "USER_DECISION", blocking: false }] });
  const fail = buildJsonReport({ ...base, checks: [{ name: "semgrep static scan", group: "sast", status: "fail", blocking: true }] });

  assert.equal(pass.overallStatus, "PASS");
  assert.equal(warnings.overallStatus, "PASS_WITH_WARNINGS");
  assert.equal(gaps.overallStatus, "PASS_WITH_GAPS");
  assert.equal(decisions.overallStatus, "PASS_WITH_GAPS");
  assert.equal(fail.overallStatus, "FAIL");
  assert.equal(gaps.passed, true);
  assert.match(toMarkdown(gaps), /Local Security Gate: PASS_WITH_GAPS/);
  assert.match(toMarkdown(gaps), /No blocking checks failed, but release-readiness gaps or user decisions remain/);
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

test("reports include production audit sections and omit N/A from SARIF", () => {
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: true, release: true, production: true },
    probe: {},
    checks: [
      { name: "production audit: observability", group: "production-audit", status: "GAP", blocking: false, coverageGap: true, summary: "No error monitoring evidence" },
      { name: "production audit: database", group: "production-audit", status: "N/A", blocking: false, summary: "No database detected" },
    ],
    audit: {
      profile: { projectType: "web", hasDatabase: false },
      plan: [
        { id: "observability-errors", title: "Error monitoring", status: "GAP", summary: "No error monitoring evidence" },
        { id: "database-migrations", title: "Database migrations", status: "N/A", summary: "No database detected" },
      ],
      evidence: [],
      coverageGaps: [{ id: "observability-errors", title: "Error monitoring", status: "GAP", summary: "No error monitoring evidence" }],
      userDecisions: [{ id: "business-critical-flows", title: "Business critical flows", status: "USER_DECISION", summary: "Confirm core flows" }],
    },
    toolVersions: {},
    invalidExceptions: [],
  });

  const markdown = toMarkdown(report);
  const sarif = toSarif(report);

  assert.equal(report.overallStatus, "PASS_WITH_GAPS");
  assert.equal(report.audit.coverageGaps.length, 1);
  assert.match(markdown, /Production Audit/);
  assert.match(markdown, /Coverage Gaps/);
  assert.match(markdown, /User Decisions/);
  assert.equal(JSON.stringify(sarif).includes("No database detected"), false);
});

test("reports expose exception usage with check identity", () => {
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: true },
    probe: {},
    checks: [
      {
        checkId: "package-audit",
        name: "npm production audit",
        group: "dependencies",
        status: "fail",
        blocking: false,
        exception: { id: "accepted-dev-only", check: "package-audit", reason: "not shipped", expires: "2999-01-01", owner: "owner" },
      },
    ],
    toolVersions: {},
    invalidExceptions: [],
  });

  assert.deepEqual(report.exceptions.used[0].check, {
    checkId: "package-audit",
    name: "npm production audit",
    group: "dependencies",
  });
});
