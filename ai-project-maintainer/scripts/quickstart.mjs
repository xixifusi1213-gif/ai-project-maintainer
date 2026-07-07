import fs from "node:fs";
import path from "node:path";
import { runRepairPack } from "./repair-pack.mjs";
import { runLocalGate } from "./run-local-gate.mjs";

const quickstartMode = {
  profile: "auto",
  agentRisk: true,
  strict: false,
  release: false,
  production: false,
  connectors: false,
  noTests: true,
  firstRun: true,
};

function markdownList(items, fallback = "- None") {
  if (!items.length) return [fallback];
  return items.map((item) => `- ${item}`);
}

function reportSibling(jsonPath, extension) {
  return jsonPath.replace(/\.json$/i, extension);
}

function quoteCommandArg(value) {
  return `"${String(value || "").replaceAll('"', '\\"')}"`;
}

function flattenSignals(profile) {
  return Object.entries(profile?.signals || {})
    .flatMap(([id, signals]) => (signals || []).map((signal) => `${id}: ${signal.evidence}`));
}

function topBlockers(report, limit = 5) {
  return (report.blockers || []).slice(0, limit).map((check) => ({
    checkId: check.checkId || null,
    group: check.group || null,
    name: check.name,
    status: check.status,
    summary: check.summary || "",
  }));
}

function setupNotes(report, limit = 5) {
  return (report.checks || [])
    .filter((check) => check.setupGap)
    .slice(0, limit)
    .map((check) => ({
      checkId: check.checkId || null,
      group: check.group || null,
      name: check.name,
      status: check.status,
      summary: check.summary || "",
      recommendation: check.recommendation || "",
    }));
}

function coverageGapNotes(report, limit = 5) {
  return (report.coverageGaps || [])
    .slice(0, limit)
    .map((check) => ({
      checkId: check.checkId || null,
      group: check.group || null,
      name: check.name,
      status: check.status,
      summary: check.summary || "",
      recommendation: check.recommendation || "",
    }));
}

function buildFileSummary(paths, repairPackResult) {
  const files = {
    summaryMarkdown: paths.summaryMarkdown,
    summaryJson: paths.summaryJson,
    securityReportJson: paths.securityReportJson,
    securityReportMarkdown: reportSibling(paths.securityReportJson, ".md"),
    securityReportSarif: reportSibling(paths.securityReportJson, ".sarif"),
  };

  if (repairPackResult) {
    files.repairPackDir = paths.repairPackDir;
    files.fixPlan = repairPackResult.files.fixPlan;
    files.agentTasks = repairPackResult.files.agentTasks;
    files.codexTasks = repairPackResult.files.codexTasks;
    files.recheckPowerShell = repairPackResult.files.powershell;
    files.recheckShell = repairPackResult.files.shell;
  }

  return files;
}

function buildHandoffFiles(files) {
  const handoff = [
    { label: "Quickstart summary", path: files.summaryMarkdown, use: "Start here for the short result and next command." },
    { label: "Security report", path: files.securityReportMarkdown, use: "Use this for the detailed findings and evidence." },
    { label: "Security report JSON", path: files.securityReportJson, use: "Use this when an agent or tool needs structured data." },
  ];

  if (files.fixPlan) {
    handoff.push(
      { label: "Repair plan", path: files.fixPlan, use: "Give this to Cursor, Claude Code, Cline, or Codex for the repair workflow." },
      { label: "Agent tasks", path: files.agentTasks, use: "Structured task list for AI coding agents." },
      { label: "Codex tasks", path: files.codexTasks, use: "Codex-specific task list." },
    );
  }

  return handoff;
}

export function buildQuickstartSummary(report, options = {}) {
  const root = path.resolve(options.projectRoot || report.root || process.cwd());
  const reportsDir = options.reportsDir || path.join(root, "reports");
  const securityReportJson = options.securityReportJson || path.join(reportsDir, "quickstart-security-report.json");
  const paths = {
    summaryMarkdown: path.join(reportsDir, "quickstart-summary.md"),
    summaryJson: path.join(reportsDir, "quickstart-summary.json"),
    securityReportJson,
    repairPackDir: path.join(reportsDir, "quickstart-repair-pack"),
  };
  const files = buildFileSummary(paths, options.repairPackResult || null);
  const fullGate = [
    "npx ai-project-maintainer gate",
    quoteCommandArg(root),
    "--profile auto",
    "--production --agent-risk --strict --release",
    "--output reports/security-report.json",
  ].join(" ");

  return {
    schemaVersion: 1,
    generatedAt: report.generatedAt,
    projectRoot: root,
    status: report.overallStatus,
    passed: report.passed,
    counts: {
      blockers: report.blockerCount || 0,
      warnings: report.warningCount || 0,
      coverageGaps: report.coverageGapCount || 0,
    },
    profile: {
      id: report.profile?.id || report.mode?.profile || "auto",
      source: report.profile?.source || "unknown",
      title: report.profile?.title || "",
      matchedProfiles: report.profile?.matchedProfiles || [],
      signals: flattenSignals(report.profile),
    },
    mode: { ...quickstartMode },
    checks: {
      ran: (report.checks || []).map((check) => check.name),
      skipped: [
        "Tests skipped by default for quickstart.",
        "Release build and dist scripts skipped by default.",
        "Production evidence connectors skipped by default.",
        "Production audit evidence checks skipped by default.",
        "Strict missing-tool enforcement skipped by default.",
      ],
    },
    topBlockers: topBlockers(report),
    setupNotes: setupNotes(report),
    coverageGaps: coverageGapNotes(report),
    files,
    handoffFiles: buildHandoffFiles(files),
    nextCommands: {
      fullGate,
    },
  };
}

export function toQuickstartMarkdown(summary) {
  const lines = [];
  lines.push(`# AI Project Maintainer Quickstart: ${summary.status}`);
  lines.push("");
  lines.push(`Root: ${summary.projectRoot}`);
  lines.push(`Profile: ${summary.profile.id} (${summary.profile.source})`);
  lines.push(`Generated: ${summary.generatedAt}`);
  lines.push("");
  lines.push("## Result");
  lines.push(`- Blockers: ${summary.counts.blockers}`);
  lines.push(`- Warnings: ${summary.counts.warnings}`);
  lines.push(`- Coverage gaps: ${summary.counts.coverageGaps}`);
  lines.push("");
  lines.push("## Why This Profile");
  lines.push(...markdownList(summary.profile.signals));
  lines.push("");
  lines.push("## What Ran");
  lines.push(...markdownList(summary.checks.ran));
  lines.push("");
  lines.push("## What Was Skipped");
  lines.push(...markdownList(summary.checks.skipped));
  lines.push("");
  lines.push("## Top Blockers");
  if (!summary.topBlockers.length) {
    lines.push("- None");
  } else {
    for (const blocker of summary.topBlockers) {
      lines.push(`- ${blocker.name}: ${blocker.status}. ${blocker.summary}`.trim());
    }
  }
  lines.push("");
  lines.push("## Evidence Gaps");
  if (!summary.coverageGaps?.length) {
    lines.push("- None");
  } else {
    for (const gap of summary.coverageGaps) {
      lines.push(`- ${gap.name}: ${gap.summary}${gap.recommendation ? ` ${gap.recommendation}` : ""}`.trim());
    }
  }
  lines.push("");
  if (summary.setupNotes?.length) {
    lines.push("## Setup Notes");
    for (const note of summary.setupNotes) {
      lines.push(`- ${note.name}: ${note.summary}${note.recommendation ? ` ${note.recommendation}` : ""}`.trim());
    }
    lines.push("");
  }
  lines.push("## AI Agent Handoff");
  lines.push("Give these files to Cursor, Claude Code, Cline, or Codex:");
  for (const file of summary.handoffFiles) {
    lines.push(`- ${file.label}: ${file.path}`);
    lines.push(`  ${file.use}`);
  }
  lines.push("");
  lines.push("## Next Command");
  lines.push("Run the full release gate after you fix blockers or when you are ready for release evidence:");
  lines.push("");
  lines.push("```powershell");
  lines.push(summary.nextCommands.fullGate);
  lines.push("```");
  return lines.join("\n");
}

export function writeQuickstartSummary(summary) {
  fs.mkdirSync(path.dirname(summary.files.summaryMarkdown), { recursive: true });
  fs.writeFileSync(summary.files.summaryMarkdown, toQuickstartMarkdown(summary));
  fs.writeFileSync(summary.files.summaryJson, JSON.stringify(summary, null, 2));
}

export function runQuickstart(projectRoot = process.cwd(), options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const reportsDir = path.join(root, "reports");
  const securityReportJson = path.join(reportsDir, "quickstart-security-report.json");
  const report = runLocalGate(root, {
    ...quickstartMode,
    outputPath: securityReportJson,
    writeReports: true,
    runnerOptions: options.runnerOptions || {},
  });
  const repairPackResult = report.blockerCount > 0
    ? runRepairPack(securityReportJson, {
        projectRoot: root,
        outputDir: path.join(reportsDir, "quickstart-repair-pack"),
      })
    : null;
  const summary = buildQuickstartSummary(report, {
    projectRoot: root,
    reportsDir,
    securityReportJson,
    repairPackResult,
  });

  writeQuickstartSummary(summary);
  return {
    report,
    summary,
    repairPack: repairPackResult?.repairPack || null,
  };
}
