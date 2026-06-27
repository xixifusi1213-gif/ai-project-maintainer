import fs from "node:fs";
import path from "node:path";

function stableStatus(status) {
  return status || "unknown";
}

export function buildJsonReport({
  root,
  mode,
  probe,
  checks,
  toolVersions = {},
  invalidExceptions = [],
  generatedAt = new Date().toISOString(),
}) {
  const blockers = checks.filter((check) => check.blocking);
  const warnings = checks.filter((check) => !check.blocking && ["fail", "error", "missing", "skipped"].includes(stableStatus(check.status)));
  const coverageGaps = checks.filter((check) => check.coverageGap || ["missing", "skipped"].includes(stableStatus(check.status)));
  const exceptionUsage = checks.filter((check) => check.exception).map((check) => ({
    check: check.name,
    exception: check.exception,
  }));

  return {
    schemaVersion: 1,
    root,
    mode,
    passed: blockers.length === 0 && invalidExceptions.length === 0,
    blockerCount: blockers.length + invalidExceptions.length,
    warningCount: warnings.length,
    coverageGapCount: coverageGaps.length,
    generatedAt,
    probe,
    blockers,
    warnings,
    coverageGaps,
    toolVersions,
    checks,
    exceptions: {
      used: exceptionUsage,
      invalid: invalidExceptions,
    },
  };
}

export function toMarkdown(report) {
  const lines = [];
  lines.push(`# Local Security Gate: ${report.passed ? "PASS" : "FAIL"}`);
  lines.push("");
  lines.push(`Root: ${report.root}`);
  lines.push(`Mode: strict=${Boolean(report.mode?.strict)}, release=${Boolean(report.mode?.release)}`);
  lines.push(`Generated: ${report.generatedAt}`);
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

  lines.push("## Tools");
  for (const [tool, version] of Object.entries(report.toolVersions || {})) {
    lines.push(`- ${tool}: ${version}`);
  }
  if (!Object.keys(report.toolVersions || {}).length) lines.push("- None recorded");
  lines.push("");

  lines.push("## Checks Run");
  for (const check of report.checks) {
    lines.push(`- ${check.name}: ${check.status}${check.command ? ` (${check.command})` : ""}`);
  }
  lines.push("");

  lines.push("## Exceptions");
  if (!report.exceptions.used.length && !report.exceptions.invalid.length) lines.push("- None");
  for (const item of report.exceptions.used) {
    lines.push(`- ${item.exception.id}: applied to ${item.check}, expires ${item.exception.expires}`);
  }
  for (const item of report.exceptions.invalid) {
    lines.push(`- ${item.id || "(missing id)"}: invalid, ${item.reason}`);
  }
  lines.push("");

  lines.push("## Next Step");
  lines.push(report.passed ? "- Gate passed. Keep this command in CI before release." : "- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.");
  return lines.join("\n");
}

export function toSarif(report) {
  const rules = new Map();
  const results = [];

  for (const check of report.checks) {
    const ruleId = check.name.replace(/\s+/g, "-").toLowerCase();
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        shortDescription: { text: check.name },
        fullDescription: { text: check.summary || check.name },
      });
    }

    if (["pass", "skipped", "missing"].includes(check.status)) continue;
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

export function writeReportFiles(report, outputPath) {
  const jsonPath = path.resolve(outputPath);
  const dir = path.dirname(jsonPath);
  const base = jsonPath.replace(/\.json$/i, "");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${base}.md`, toMarkdown(report));
  fs.writeFileSync(`${base}.sarif`, JSON.stringify(toSarif(report), null, 2));
}
