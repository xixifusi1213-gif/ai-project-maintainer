import fs from "node:fs";
import path from "node:path";
import { classifyFindingKind, findingKindLabel } from "./finding-kind.mjs";

const safeStatusWithoutTask = new Set(["pass", "n/a", "skipped"]);
const decisionStatuses = new Set(["gap", "user_decision"]);
const sensitivePatterns = [
  /(authorization\s*[:=]\s*)(bearer\s+)?[^\s"'`]+/gi,
  /(bearer\s+)[A-Za-z0-9._~+/=-]{8,}/gi,
  /((?:token|secret|password|passwd|pwd|dsn|api[_-]?key)\s*[:=]\s*)[^\s"'`]+/gi,
  /\b(?:ghp_[A-Za-z0-9_]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{16,}|xox[baprs]-[A-Za-z0-9_-]{10,})\b/gi,
];

function statusKey(value) {
  return String(value || "unknown").toLowerCase();
}

function redactString(value) {
  let out = String(value ?? "");
  for (const pattern of sensitivePatterns) {
    out = out.replace(pattern, "[REDACTED]");
  }
  return out;
}

function redact(value) {
  if (typeof value === "string") return redactString(value);
  if (Array.isArray(value)) return value.map(redact);
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, redact(item)]));
  }
  return value;
}

function shellQuote(value) {
  const text = String(value || "");
  if (!text) return "''";
  return `'${text.replaceAll("'", "'\"'\"'")}'`;
}

function powershellQuote(value) {
  return `'${String(value || "").replaceAll("'", "''")}'`;
}

function sourceFor(reportPath, item) {
  return {
    report: reportPath,
    checkId: item.checkId || item.id || null,
    group: item.group || "audit",
  };
}

function targetFiles(item) {
  const files = [
    item.file,
    item.path,
    item.location,
    ...(Array.isArray(item.targetFiles) ? item.targetFiles : []),
  ].filter((value) => typeof value === "string" && value.trim());
  return [...new Set(files.map(redactString))];
}

function evidenceFor(item) {
  return [
    item.status ? `status: ${item.status}` : null,
    item.summary ? `summary: ${item.summary}` : null,
    item.command ? `command: ${item.command}` : null,
    item.recommendation ? `recommendation: ${item.recommendation}` : null,
  ].filter(Boolean).map(redactString);
}

function defaultGateCommand(report, projectRoot) {
  const root = projectRoot || report.root || ".";
  const args = ["npx ai-project-maintainer gate", shellQuote(root)];
  if (report.mode?.profile) args.push("--profile", report.mode.profile);
  if (report.mode?.production) args.push("--production");
  if (report.mode?.agentRisk) args.push("--agent-risk");
  if (report.evidence) args.push("--connectors");
  if (report.mode?.strict) args.push("--strict");
  if (report.mode?.release) args.push("--release");
  args.push("--output", "reports/security-report.json");
  return args.join(" ");
}

function groupRecheckCommand(item) {
  if (item.command) return redactString(item.command);
  const group = item.group || "";
  const checkId = item.checkId || item.id || "";
  if (group === "tests") return "npm test";
  if (group === "secrets") return "gitleaks detect --no-git --redact";
  if (group === "dependencies" || checkId === "package-audit") return "npm audit --omit=dev";
  if (group === "sast") return "semgrep scan --config auto";
  if (group === "ci-security") return checkId === "actionlint" ? "actionlint" : "zizmor .github/workflows";
  if (group === "agent-risk") return "npx ai-project-maintainer agent-risk . --output reports/agent-risk-report.json";
  return null;
}

function taskType(item) {
  const status = statusKey(item.status);
  if (decisionStatuses.has(status) || item.coverageGap) return "needs_maintainer_decision";
  if (item.group === "production-audit" || item.group === "production-evidence") return "needs_maintainer_decision";
  if (item.group === "database") return item.blocking ? "manual_review_required" : "needs_maintainer_decision";
  if (item.group === "secrets") return "manual_review_required";
  if (item.invalidException) return "auto_fix_candidate";
  if (item.blocking) return "auto_fix_candidate";
  if (["fail", "error", "warn", "warning", "missing"].includes(status)) return "auto_fix_candidate";
  return "recheck_only";
}

function severityFor(item, type) {
  if (item.invalidException) return "P2";
  if (item.group === "secrets" && item.blocking) return "P1";
  if (item.blocking) return "P2";
  if (type === "needs_maintainer_decision" || type === "manual_review_required") return "P2";
  return "P3";
}

function fixStrategyFor(item, type) {
  if (type === "needs_maintainer_decision") {
    return "Ask the maintainer to provide or explicitly accept the missing evidence, then update the intake or risk policy and rerun the gate.";
  }
  if (type === "manual_review_required") {
    return item.group === "secrets"
      ? "Remove the exposed secret from code/config, rotate the credential outside the repository, and rerun secret scanning."
      : "Review the risky change with the maintainer, document the accepted path, then rerun the relevant check.";
  }
  switch (item.group) {
    case "tests":
      return "Fix the failing behavior or test setup, then rerun the project tests and the release gate.";
    case "dependencies":
      return "Upgrade, override, or replace the vulnerable dependency, then rerun dependency checks and the gate.";
    case "sast":
      return "Fix the static-analysis finding in the affected code path, preserving behavior with tests where possible.";
    case "ci-security":
      return "Harden the workflow or action configuration, then rerun actionlint/zizmor and the gate.";
    case "electron":
      return "Tighten Electron webPreferences, preload, IPC, file access, or update trust according to the finding.";
    case "agent-risk":
      return "Remove unsafe AI-agent instructions, inline secrets, destructive lifecycle scripts, or broad unpinned MCP permissions.";
    default:
      return "Fix the reported blocker or warning, then rerun the verification commands.";
  }
}

function titleFor(item) {
  if (item.invalidException) return `Fix invalid exception ${item.id || "(missing id)"}`;
  return item.title || item.name || item.id || "Fix reported gate finding";
}

function taskFromItem(report, reportPath, item, index, projectRoot) {
  const type = taskType(item);
  const findingKind = classifyFindingKind(item);
  const recheck = [...new Set([groupRecheckCommand(item), defaultGateCommand(report, projectRoot)].filter(Boolean))];
  return redact({
    id: `fix-${String(index + 1).padStart(3, "0")}`,
    title: titleFor(item),
    type,
    findingKind,
    severity: severityFor(item, type),
    source: sourceFor(reportPath, item),
    evidence: evidenceFor(item),
    targetFiles: targetFiles(item),
    fixStrategy: fixStrategyFor(item, type),
    userDecisionRequired: type === "needs_maintainer_decision" || type === "manual_review_required",
    verificationCommands: recheck,
    riskNotes: item.recommendation || item.summary || "",
  });
}

function collectRepairItems(report) {
  const items = [];
  const seen = new Set();
  const addItem = (item, prefix = "item") => {
    if (!item) return;
    const status = statusKey(item.status);
    if (safeStatusWithoutTask.has(status)) return;
    const key = `${prefix}:${item.checkId || item.id || item.name}:${item.group}:${item.status}:${item.summary || ""}`;
    if (!seen.has(key)) {
      items.push(item);
      seen.add(key);
    }
  };

  for (const check of report.checks || []) {
    addItem(check, "check");
  }
  for (const check of report.blockers || []) {
    addItem({ ...check, blocking: check.blocking ?? true }, "blocker");
  }
  for (const check of report.warnings || []) {
    addItem(check, "warning");
  }
  for (const check of report.coverageGaps || []) {
    addItem({ ...check, coverageGap: true, status: check.status || "GAP" }, "coverage-gap");
  }
  for (const gap of report.audit?.coverageGaps || []) {
    addItem({ ...gap, group: "production-audit", status: gap.status || "GAP", coverageGap: true }, "audit-gap");
  }
  for (const decision of report.audit?.userDecisions || []) {
    addItem({ ...decision, group: "production-audit", status: decision.status || "USER_DECISION" }, "audit-decision");
  }
  for (const gap of report.agentRisk?.coverageGaps || []) {
    addItem({ ...gap, group: "agent-risk", status: gap.status || "GAP", coverageGap: true }, "agent-gap");
  }
  for (const finding of report.agentRisk?.findings || []) {
    addItem({ ...finding, group: "agent-risk", status: finding.status || finding.severity || "WARN" }, "agent-finding");
  }
  for (const exception of [...(report.exceptions?.invalid || []), ...(report.invalidExceptions || [])]) {
    const key = `exception:${exception.id || ""}:${exception.reason || ""}`;
    if (!seen.has(key)) {
      items.push({ ...exception, invalidException: true, group: "exceptions", status: "invalid", summary: exception.reason });
      seen.add(key);
    }
  }
  return items;
}

function summarize(tasks) {
  return tasks.reduce((counts, task) => {
    counts.total += 1;
    counts.byType[task.type] = (counts.byType[task.type] || 0) + 1;
    counts.bySeverity[task.severity] = (counts.bySeverity[task.severity] || 0) + 1;
    counts.byFindingKind[task.findingKind] = (counts.byFindingKind[task.findingKind] || 0) + 1;
    return counts;
  }, { total: 0, byType: {}, bySeverity: {}, byFindingKind: {} });
}

export function buildRepairPack(report, options = {}) {
  const reportPath = options.reportPath || "reports/security-report.json";
  const projectRoot = options.projectRoot || report.root || ".";
  const tasks = collectRepairItems(report).map((item, index) => taskFromItem(report, reportPath, item, index, projectRoot));
  return {
    schemaVersion: 1,
    generatedAt: options.generatedAt || new Date().toISOString(),
    sourceReport: reportPath,
    projectRoot,
    overallStatus: report.overallStatus || (report.passed ? "PASS" : "FAIL"),
    summary: summarize(tasks),
    tasks,
    recheckCommands: [...new Set(tasks.flatMap((task) => task.verificationCommands))],
  };
}

export function buildCodexTasks(repairPack) {
  return {
    schemaVersion: 1,
    targetAgent: "codex",
    generatedAt: repairPack.generatedAt,
    sourceReport: repairPack.sourceReport,
    projectRoot: repairPack.projectRoot,
    instructions: [
      "Fix auto_fix_candidate tasks first.",
      "Ask the maintainer before changing needs_maintainer_decision or manual_review_required tasks.",
      "Do not describe untriaged_scanner_finding as a confirmed vulnerability without project-specific validation.",
      "Do not treat production_evidence_gap or environment_tooling_issue as a discovered vulnerability.",
      "After each fix, run the task verificationCommands before rerunning the full gate.",
      "Do not paste secrets, tokens, DSNs, or production credentials into code, prompts, or reports.",
    ],
    tasks: repairPack.tasks,
    recheckCommands: repairPack.recheckCommands,
  };
}

export function toRepairPackMarkdown(repairPack) {
  const lines = [];
  lines.push(`# AI Agent Repair Pack: ${repairPack.overallStatus}`);
  lines.push("");
  lines.push(`Source report: ${repairPack.sourceReport}`);
  lines.push(`Project root: ${repairPack.projectRoot}`);
  lines.push(`Generated: ${repairPack.generatedAt}`);
  lines.push("");
  lines.push("## Summary");
  lines.push(`- Total tasks: ${repairPack.summary.total}`);
  for (const [type, count] of Object.entries(repairPack.summary.byType)) lines.push(`- ${type}: ${count}`);
  for (const [findingKind, count] of Object.entries(repairPack.summary.byFindingKind || {})) lines.push(`- ${findingKindLabel(findingKind)}: ${count}`);
  lines.push("");
  lines.push("## Tasks");
  if (!repairPack.tasks.length) lines.push("- No repair tasks. The report has no blockers, warnings, gaps, user decisions, or invalid exceptions.");
  for (const task of repairPack.tasks) {
    lines.push(`### ${task.id}: ${task.title}`);
    lines.push(`- Type: ${task.type}`);
    lines.push(`- Finding kind: ${findingKindLabel(task.findingKind)} (${task.findingKind})`);
    lines.push(`- Severity: ${task.severity}`);
    lines.push(`- Source: ${task.source.group}/${task.source.checkId || "unknown"}`);
    lines.push(`- User decision required: ${task.userDecisionRequired}`);
    if (task.targetFiles.length) lines.push(`- Target files: ${task.targetFiles.join(", ")}`);
    lines.push(`- Fix strategy: ${task.fixStrategy}`);
    if (task.riskNotes) lines.push(`- Risk notes: ${task.riskNotes}`);
    lines.push("- Evidence:");
    if (!task.evidence.length) lines.push("  - None");
    for (const evidence of task.evidence) lines.push(`  - ${evidence}`);
    lines.push("- Verification:");
    for (const command of task.verificationCommands) lines.push(`  - ${command}`);
    lines.push("");
  }
  lines.push("## Recheck Commands");
  if (!repairPack.recheckCommands.length) lines.push("- None");
  for (const command of repairPack.recheckCommands) lines.push(`- ${command}`);
  return lines.join("\n");
}

export function toPowerShell(repairPack) {
  const lines = [
    "$ErrorActionPreference = 'Stop'",
    "# Generated by ai-project-maintainer repair-pack",
  ];
  for (const command of repairPack.recheckCommands) {
    lines.push(`Write-Host ${powershellQuote(command)}`);
    lines.push(command);
  }
  return `${lines.join("\n")}\n`;
}

export function toShell(repairPack) {
  const lines = [
    "#!/usr/bin/env sh",
    "set -eu",
    "# Generated by ai-project-maintainer repair-pack",
  ];
  for (const command of repairPack.recheckCommands) {
    lines.push(`printf '%s\\n' ${shellQuote(command)}`);
    lines.push(command);
  }
  return `${lines.join("\n")}\n`;
}

export function writeRepairPackFiles(repairPack, outputDir) {
  const dir = path.resolve(outputDir);
  fs.mkdirSync(dir, { recursive: true });
  const codexTasks = buildCodexTasks(repairPack);
  const files = {
    fixPlan: path.join(dir, "fix-plan.md"),
    agentTasks: path.join(dir, "agent-tasks.json"),
    codexTasks: path.join(dir, "codex-tasks.json"),
    powershell: path.join(dir, "recheck-commands.ps1"),
    shell: path.join(dir, "recheck-commands.sh"),
  };
  fs.writeFileSync(files.fixPlan, toRepairPackMarkdown(repairPack));
  fs.writeFileSync(files.agentTasks, JSON.stringify(repairPack, null, 2));
  fs.writeFileSync(files.codexTasks, JSON.stringify(codexTasks, null, 2));
  fs.writeFileSync(files.powershell, toPowerShell(repairPack));
  fs.writeFileSync(files.shell, toShell(repairPack));
  return files;
}

export function readReport(reportPath) {
  const full = path.resolve(reportPath);
  const text = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");
  return JSON.parse(text);
}
