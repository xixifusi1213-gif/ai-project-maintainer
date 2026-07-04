import fs from "node:fs";
import path from "node:path";
import { buildStandardsSummary, enrichChecksWithTrustMetadata } from "./standards.mjs";

function stableStatus(status) {
  return status || "unknown";
}

function statusKey(status) {
  return String(stableStatus(status)).toLowerCase();
}

function gradeForScore(score) {
  if (score >= 90) return "A";
  if (score >= 75) return "B";
  if (score >= 60) return "C";
  if (score >= 40) return "D";
  return "F";
}

function buildMaintenanceSummary({ blockers, warnings, coverageGaps, invalidExceptions }) {
  const score = Math.max(
    0,
    Math.min(100, 100 - blockers.length * 25 - warnings.length * 3 - coverageGaps.length * 2 - invalidExceptions.length * 20),
  );
  return {
    score,
    grade: gradeForScore(score),
    basis: {
      blockers: blockers.length,
      warnings: warnings.length,
      coverageGaps: coverageGaps.length,
      invalidExceptions: invalidExceptions.length,
    },
  };
}

function buildOverallStatus({ blockers, warnings, coverageGaps, invalidExceptions, userDecisionCount }) {
  if (blockers.length || invalidExceptions.length) return "FAIL";
  if (coverageGaps.length || userDecisionCount > 0) return "PASS_WITH_GAPS";
  if (warnings.length) return "PASS_WITH_WARNINGS";
  return "PASS";
}

function isNonCodeReadinessSignal(check) {
  const status = statusKey(check.status);
  return check.group === "production-audit" || check.coverageGap || status === "gap" || status === "user_decision";
}

function shouldIncludeInSarif(check, options = {}) {
  const status = statusKey(check.status);
  if (["pass", "skipped", "missing", "n/a"].includes(status)) return false;
  if (check.blocking) return true;
  if (isNonCodeReadinessSignal(check) && !options.includeCoverageGaps) return false;
  return true;
}

function countSarifResults(report, options = {}) {
  return (report.checks || []).filter((check) => shouldIncludeInSarif(check, options)).length;
}

export function buildJsonReport({
  root,
  mode,
  probe,
  checks,
  audit = null,
  evidence = null,
  agentRisk = null,
  toolVersions = {},
  invalidExceptions = [],
  generatedAt = new Date().toISOString(),
}) {
  const enrichedChecks = enrichChecksWithTrustMetadata(checks);
  const blockers = enrichedChecks.filter((check) => check.blocking);
  const warnings = enrichedChecks.filter((check) => !check.blocking && ["fail", "error", "warn", "warning", "missing", "skipped", "gap", "user_decision"].includes(statusKey(check.status)));
  const coverageGaps = enrichedChecks.filter((check) => check.coverageGap || ["missing", "skipped", "gap"].includes(statusKey(check.status)));
  const userDecisionCount = enrichedChecks.filter((check) => statusKey(check.status) === "user_decision").length + (audit?.userDecisions || []).length;
  const exceptionUsage = enrichedChecks.filter((check) => check.exception).map((check) => ({
    check: {
      checkId: check.checkId || null,
      name: check.name,
      group: check.group,
    },
    exception: check.exception,
  }));
  const overallStatus = buildOverallStatus({ blockers, warnings, coverageGaps, invalidExceptions, userDecisionCount });

  return {
    schemaVersion: 1,
    root,
    mode,
    overallStatus,
    passed: blockers.length === 0 && invalidExceptions.length === 0,
    blockerCount: blockers.length + invalidExceptions.length,
    warningCount: warnings.length,
    coverageGapCount: coverageGaps.length,
    maintenance: buildMaintenanceSummary({ blockers, warnings, coverageGaps, invalidExceptions }),
    generatedAt,
    probe,
    audit,
    evidence,
    agentRisk,
    standards: buildStandardsSummary(enrichedChecks),
    blockers,
    warnings,
    coverageGaps,
    toolVersions,
    checks: enrichedChecks,
    exceptions: {
      used: exceptionUsage,
      invalid: invalidExceptions,
    },
  };
}

export function toMarkdown(report) {
  const lines = [];
  const overallStatus = report.overallStatus || (report.passed ? "PASS" : "FAIL");
  lines.push(`# Local Security Gate: ${overallStatus}`);
  lines.push("");
  lines.push(`Root: ${report.root}`);
  lines.push(`Mode: strict=${Boolean(report.mode?.strict)}, release=${Boolean(report.mode?.release)}, production=${Boolean(report.mode?.production)}`);
  lines.push(`Generated: ${report.generatedAt}`);
  if (report.maintenance) {
    lines.push(`Open Source Maintenance Score: ${report.maintenance.score}/100 (${report.maintenance.grade})`);
  }
  lines.push(`Code Scanning Results: ${countSarifResults(report)} (non-blocking production gaps stay in this report and artifacts)`);
  lines.push("");

  lines.push("## Blocking Checks");
  if (!report.blockers.length && !report.exceptions.invalid.length) lines.push("- None");
  for (const check of report.blockers) {
    lines.push(`- ${check.name}: ${check.status}. ${check.summary || ""}`.trim());
  }
  for (const exception of report.exceptions.invalid) {
    lines.push(`- invalid exception ${exception.id || "(missing id)"}: ${exception.reason}`);
  }
  lines.push("");

  lines.push("## Warnings");
  if (!report.warnings.length) lines.push("- None");
  for (const check of report.warnings) {
    lines.push(`- ${check.name}: ${check.status}. ${check.summary || ""}`.trim());
  }
  lines.push("");

  lines.push("## Coverage Gaps");
  if (!report.coverageGaps.length) lines.push("- None");
  for (const check of report.coverageGaps) {
    lines.push(`- ${check.name}: ${check.summary || "tool unavailable"}`);
  }
  lines.push("");

  if (report.audit) {
    lines.push("## Production Audit");
    lines.push(`Project Type: ${report.audit.profile?.projectType || "unknown"}`);
    lines.push(`Database: ${Boolean(report.audit.profile?.hasDatabase)}`);
    lines.push(`CI: ${Boolean(report.audit.profile?.hasCi)}`);
    lines.push("");

    lines.push("### Plan");
    for (const item of report.audit.plan || []) {
      lines.push(`- ${item.status} ${item.title}: ${item.summary}`);
    }
    if (!(report.audit.plan || []).length) lines.push("- None");
    lines.push("");

    lines.push("### Coverage Gaps");
    if (!(report.audit.coverageGaps || []).length) lines.push("- None");
    for (const gap of report.audit.coverageGaps || []) {
      lines.push(`- ${gap.title}: ${gap.summary}${gap.recommendation ? ` Recommendation: ${gap.recommendation}` : ""}`);
    }
    lines.push("");

    lines.push("### User Decisions");
    if (!(report.audit.userDecisions || []).length) lines.push("- None");
    for (const decision of report.audit.userDecisions || []) {
      lines.push(`- ${decision.title}: ${decision.summary}${decision.recommendation ? ` Recommendation: ${decision.recommendation}` : ""}`);
    }
    lines.push("");
  }

  if (report.evidence) {
    lines.push("## Production Evidence");
    if (!(report.evidence.items || []).length) lines.push("- None");
    for (const item of report.evidence.items || []) {
      lines.push(`- ${item.status} ${item.title}: ${item.summary}${item.recommendation ? ` Recommendation: ${item.recommendation}` : ""}`);
    }
    lines.push("");
  }

  if (report.agentRisk) {
    lines.push("## AI Agent Risk");
    lines.push(`Status: ${report.agentRisk.status}`);
    lines.push("");
    lines.push("### Surfaces");
    if (!(report.agentRisk.surfaces || []).length) lines.push("- None");
    for (const surface of report.agentRisk.surfaces || []) {
      lines.push(`- ${surface.type}: ${surface.path}`);
    }
    lines.push("");
    lines.push("### Findings");
    if (!(report.agentRisk.findings || []).length) lines.push("- None");
    for (const finding of report.agentRisk.findings || []) {
      lines.push(`- ${finding.status} ${finding.name}: ${finding.summary}`);
    }
    lines.push("");
    lines.push("### Coverage Gaps");
    if (!(report.agentRisk.coverageGaps || []).length) lines.push("- None");
    for (const gap of report.agentRisk.coverageGaps || []) {
      lines.push(`- ${gap.name}: ${gap.summary}`);
    }
    lines.push("");
  }

  lines.push("## Evidence Levels");
  const evidenceCounts = (report.checks || []).reduce((counts, check) => {
    const level = check.evidenceLevel || "INFERRED";
    counts[level] = (counts[level] || 0) + 1;
    return counts;
  }, {});
  if (!Object.keys(evidenceCounts).length) lines.push("- None");
  for (const [level, count] of Object.entries(evidenceCounts).sort()) {
    lines.push(`- ${level}: ${count}`);
  }
  lines.push("");

  lines.push("## Standards Crosswalk");
  const mappings = report.standards?.mappings || [];
  if (!mappings.length) lines.push("- None");
  for (const mapping of mappings) {
    const refs = (mapping.refs || []).map((item) => item.title).join(", ") || "None";
    lines.push(`- ${mapping.group}${mapping.checkId ? `/${mapping.checkId}` : ""}: ${refs}`);
  }
  lines.push("");

  lines.push("## Tools");
  for (const [tool, version] of Object.entries(report.toolVersions || {})) {
    lines.push(`- ${tool}: ${version}`);
  }
  if (!Object.keys(report.toolVersions || {}).length) lines.push("- None recorded");
  lines.push("");

  lines.push("## Checks Run");
  for (const check of report.checks) {
    lines.push(`- ${check.name}: ${check.status}${check.evidenceLevel ? ` [${check.evidenceLevel}]` : ""}${check.command ? ` (${check.command})` : ""}`);
  }
  lines.push("");

  lines.push("## Exceptions");
  if (!report.exceptions.used.length && !report.exceptions.invalid.length) lines.push("- None");
  for (const item of report.exceptions.used) {
    const checkName = typeof item.check === "string" ? item.check : `${item.check.checkId || item.check.name} (${item.check.group})`;
    lines.push(`- ${item.exception.id}: applied to ${checkName}, expires ${item.exception.expires}`);
  }
  for (const item of report.exceptions.invalid) {
    lines.push(`- ${item.id || "(missing id)"}: invalid, ${item.reason}`);
  }
  lines.push("");

  lines.push("## Next Step");
  if (!report.passed) {
    lines.push("- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.");
  } else if (overallStatus === "PASS_WITH_GAPS") {
    lines.push("- No blocking checks failed, but release-readiness gaps or user decisions remain. Fill evidence, accept risk explicitly, or enable block_on_coverage_gaps before release.");
  } else if (overallStatus === "PASS_WITH_WARNINGS") {
    lines.push("- Gate has no blockers or release-readiness gaps. Review warnings, then keep this command in CI before release.");
  } else {
    lines.push("- Gate passed without blockers, warnings, or release-readiness gaps. Keep this command in CI before release.");
  }
  return lines.join("\n");
}

export function toSarif(report, options = {}) {
  const rules = new Map();
  const results = [];

  for (const check of report.checks) {
    if (!shouldIncludeInSarif(check, options)) continue;
    const ruleId = check.name.replace(/\s+/g, "-").toLowerCase();
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        shortDescription: { text: check.name },
        fullDescription: { text: check.summary || check.name },
      });
    }

    results.push({
      ruleId,
      level: check.blocking ? "error" : "warning",
      message: { text: check.summary || `${check.name} returned ${check.status}` },
      locations: [
        {
          physicalLocation: {
            artifactLocation: { uri: "." },
          },
        },
      ],
    });
  }

  return {
    $schema: "https://json.schemastore.org/sarif-2.1.0.json",
    version: "2.1.0",
    runs: [
      {
        tool: {
          driver: {
            name: "ai-project-maintainer",
            informationUri: "https://github.com/xixifusi1213-gif/ai-project-maintainer",
            rules: [...rules.values()],
          },
        },
        results,
      },
    ],
  };
}

export function writeReportFiles(report, outputPath, options = {}) {
  const jsonPath = path.resolve(outputPath);
  const dir = path.dirname(jsonPath);
  const base = jsonPath.replace(/\.json$/i, "");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${base}.md`, toMarkdown(report));
  fs.writeFileSync(`${base}.sarif`, JSON.stringify(toSarif(report, {
    includeCoverageGaps: Boolean(options.codeScanning?.include_coverage_gaps),
  }), null, 2));
}
