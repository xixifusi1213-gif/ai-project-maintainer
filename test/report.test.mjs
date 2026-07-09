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
    profile: {
      id: "nextjs-web",
      source: "detected",
      matchedProfiles: ["nextjs-web"],
      riskFocus: ["auth middleware and route protection"],
      signals: {
        "nextjs-web": [{ id: "next-dependency", evidence: "Next.js dependency detected" }],
      },
    },
  });

  assert.equal(report.passed, false);
  assert.equal(report.overallStatus, "FAIL");
  assert.equal(report.blockers.length, 1);
  assert.equal(report.coverageGaps.length, 1);
  assert.equal(report.toolVersions.node, "v24.0.0");
  assert.equal(report.profile.id, "nextjs-web");
  assert.match(toMarkdown(report), /Project Profile/);
  assert.match(toMarkdown(report), /auth middleware and route protection/);
  assert.match(toMarkdown(report), /Local Security Gate: FAIL/);
  assert.equal(toSarif(report).version, "2.1.0");
});

test("reports explain what was actually found without changing blocker behavior", () => {
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: true, release: true, production: true },
    probe: {},
    checks: [
      { name: "validated advisory", group: "sast", status: "fail", blocking: true, findingKind: "confirmed_vulnerability", summary: "Validated against a published advisory." },
      { name: "semgrep static scan", group: "sast", status: "fail", blocking: true, summary: "Scanner match needs maintainer triage." },
      { name: "production audit: Data boundaries", group: "data-exposure", status: "GAP", blocking: true, coverageGap: true, summary: "Data boundary evidence is incomplete." },
      { name: "production audit: Critical flow", group: "business-flow-safety", status: "USER_DECISION", blocking: false, summary: "Owner must confirm replay policy." },
      { name: "trivy filesystem scan", group: "dependencies", status: "missing", blocking: false, coverageGap: true, summary: "Scanner database unavailable." },
      { name: "package test", group: "tests", status: "fail", blocking: true, summary: "Test command failed." },
    ],
    toolVersions: {},
    invalidExceptions: [],
  });

  const byName = Object.fromEntries(report.checks.map((check) => [check.name, check]));
  const markdown = toMarkdown(report);
  const defaultSarif = JSON.stringify(toSarif(report));
  const gapSarif = JSON.stringify(toSarif(report, { includeCoverageGaps: true }));

  assert.equal(report.blockerCount, 4);
  assert.deepEqual(report.findingSummary.byKind, {
    confirmed_vulnerability: 1,
    untriaged_scanner_finding: 1,
    verified_check_failure: 1,
    production_evidence_gap: 1,
    maintainer_decision: 1,
    environment_tooling_issue: 1,
  });
  assert.equal(byName["validated advisory"].findingKind, "confirmed_vulnerability");
  assert.equal(byName["semgrep static scan"].findingKind, "untriaged_scanner_finding");
  assert.equal(byName["package test"].findingKind, "verified_check_failure");
  assert.equal(byName["production audit: Data boundaries"].findingKind, "production_evidence_gap");
  assert.equal(byName["production audit: Critical flow"].findingKind, "maintainer_decision");
  assert.equal(byName["trivy filesystem scan"].findingKind, "environment_tooling_issue");
  assert.match(markdown, /## What This Report Actually Found/);
  assert.match(markdown, /Untriaged scanner findings: 1/);
  assert.match(markdown, /missing proof, not a discovered vulnerability/i);
  assert.match(defaultSarif, /untriaged_scanner_finding/);
  assert.doesNotMatch(defaultSarif, /Data boundary evidence is incomplete/);
  assert.match(gapSarif, /production_evidence_gap/);
});

test("reports attach standards and evidence levels to core check groups", () => {
  const checks = [
    { name: "package test", checkId: "tests", group: "tests", status: "pass", blocking: false, command: "npm test" },
    { name: "gitleaks secret scan", checkId: "gitleaks", group: "secrets", status: "pass", blocking: false, command: "gitleaks detect" },
    { name: "npm production audit", checkId: "package-audit", group: "dependencies", status: "pass", blocking: false, command: "npm audit" },
    { name: "semgrep static scan", checkId: "semgrep", group: "sast", status: "pass", blocking: false, command: "semgrep scan" },
    { name: "syft SBOM", checkId: "syft", group: "supply-chain", status: "pass", blocking: false, command: "syft ." },
    { name: "actionlint workflow lint", checkId: "actionlint", group: "ci-security", status: "pass", blocking: false, command: "actionlint" },
    { name: "checkov IaC scan", checkId: "checkov", group: "iac", status: "pass", blocking: false, command: "checkov" },
    { name: "electron baseline", checkId: "electron", group: "electron", status: "pass", blocking: false },
    { name: "squawk SQL migration lint", checkId: "squawk", group: "database", status: "pass", blocking: false, command: "squawk" },
    { name: "OpenSSF Scorecard", checkId: "scorecard", group: "oss-hygiene", status: "pass", blocking: false, command: "scorecard" },
    { name: "production audit: Critical business flows", checkId: "production-business-flows", group: "production-audit", status: "USER_DECISION", blocking: false },
    { name: "production audit: Data boundaries", checkId: "production-data-boundaries", group: "data-exposure", status: "GAP", blocking: false, coverageGap: true },
    { name: "production audit: Authorization matrix", checkId: "production-authz-matrix", group: "auth-boundary", status: "GAP", blocking: false, coverageGap: true },
    { name: "production audit: Business flow idempotency", checkId: "production-business-flow-idempotency", group: "business-flow-safety", status: "USER_DECISION", blocking: false },
    { name: "production evidence: Sentry error monitoring", checkId: "evidence-sentry-error-monitoring", group: "production-evidence", status: "PASS", blocking: false },
  ];
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: true, release: true, production: true },
    probe: {},
    checks,
    toolVersions: {},
    invalidExceptions: [],
  });
  const markdown = toMarkdown(report);
  const sarifText = JSON.stringify(toSarif(report));

  assert.equal(report.standards.sources.some((source) => source.id === "nist-ssdf"), true);
  assert.equal(report.standards.mappings.length >= checks.length, true);
  assert.equal(report.checks.every((check) => check.standardRefs.length > 0), true);
  assert.equal(report.checks.find((check) => check.group === "production-evidence").evidenceLevel, "PLATFORM_VERIFIED");
  assert.equal(report.checks.find((check) => check.status === "USER_DECISION").evidenceLevel, "USER_REPORTED");
  assert.equal(report.checks.find((check) => check.group === "business-flow-safety").evidenceLevel, "USER_REPORTED");
  assert.equal(report.checks.find((check) => check.group === "tests").evidenceLevel, "TOOL_VERIFIED");
  assert.match(markdown, /## Evidence Levels/);
  assert.match(markdown, /## Standards Crosswalk/);
  assert.match(markdown, /NIST SSDF SP 800-218/);
  assert.doesNotMatch(sarifText, /NIST SSDF|Standards Crosswalk|Evidence Levels/);
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
  const explicitWarn = buildJsonReport({ ...base, checks: [{ name: "production evidence: sentry release tracking", group: "production-evidence", status: "WARN", blocking: false, coverageGap: false }] });
  const gaps = buildJsonReport({ ...base, checks: [{ name: "production audit: alerts", group: "production-audit", status: "GAP", blocking: false, coverageGap: true }] });
  const decisions = buildJsonReport({ ...base, checks: [{ name: "production audit: core flows", group: "production-audit", status: "USER_DECISION", blocking: false }] });
  const fail = buildJsonReport({ ...base, checks: [{ name: "semgrep static scan", group: "sast", status: "fail", blocking: true }] });

  assert.equal(pass.overallStatus, "PASS");
  assert.equal(warnings.overallStatus, "PASS_WITH_WARNINGS");
  assert.equal(explicitWarn.overallStatus, "PASS_WITH_WARNINGS");
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
  assert.match(markdown, /Code Scanning Results: 0/);
  assert.equal(sarif.runs[0].results.length, 0);
  assert.equal(JSON.stringify(sarif).includes("No error monitoring evidence"), false);
  assert.equal(JSON.stringify(sarif).includes("No database detected"), false);
});

test("SARIF filters non-blocking readiness gaps but keeps code-level and blocking findings", () => {
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: true, release: true, production: true },
    probe: {},
    checks: [
      { name: "production audit: Production logs", group: "production-audit", status: "GAP", blocking: false, coverageGap: true, summary: "No logs evidence" },
      { name: "production audit: Critical business flows", group: "production-audit", status: "USER_DECISION", blocking: false, summary: "Confirm flows" },
      { name: "semgrep static scan", group: "sast", status: "fail", blocking: true, summary: "High confidence finding" },
      { name: "zizmor workflow security", group: "ci-security", status: "fail", blocking: false, summary: "Workflow hardening warning" },
    ],
    toolVersions: {},
    invalidExceptions: [],
  });

  const defaultSarif = toSarif(report);
  const optInSarif = toSarif(report, { includeCoverageGaps: true });
  const defaultText = JSON.stringify(defaultSarif);
  const optInText = JSON.stringify(optInSarif);

  assert.equal(defaultSarif.runs[0].results.length, 2);
  assert.match(defaultText, /High confidence finding/);
  assert.match(defaultText, /Workflow hardening warning/);
  assert.doesNotMatch(defaultText, /No logs evidence/);
  assert.doesNotMatch(defaultText, /Confirm flows/);

  assert.equal(optInSarif.runs[0].results.length, 4);
  assert.match(optInText, /No logs evidence/);
  assert.match(optInText, /Confirm flows/);
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
