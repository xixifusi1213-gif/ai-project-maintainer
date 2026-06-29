#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { buildAuditPlan } from "./audit-plan.mjs";
import { detectProject } from "./lib/project-detect.mjs";
import { getToolVersions } from "./lib/command-runner.mjs";
import { runRegisteredChecks } from "./lib/check-registry.mjs";
import { loadIntake } from "./lib/intake.mjs";
import { applyPolicy, loadPolicyBundle } from "./lib/policy.mjs";
import { buildJsonReport, toMarkdown, writeReportFiles } from "./lib/report.mjs";

const versionedTools = [
  "git",
  "npm",
  "pnpm",
  "yarn",
  "bun",
  "gitleaks",
  "trivy",
  "semgrep",
  "osv-scanner",
  "actionlint",
  "zizmor",
  "syft",
  "grype",
  "checkov",
  "squawk",
  "scorecard",
  "pre-commit",
  "mega-linter-runner",
];

function resolveOutputPath(root, outputPath) {
  if (!outputPath) return path.join(root, "reports", "security-report.json");
  return path.isAbsolute(outputPath) ? outputPath : path.resolve(root, outputPath);
}

function productionAuditChecks(audit, intake) {
  if (!audit) return [];
  const productionPolicy = intake.riskPolicy?.production || {};
  const blockOnCoverageGaps = Boolean(productionPolicy.block_on_coverage_gaps);
  const blockOnUserDecisions = Boolean(productionPolicy.block_on_user_decisions);
  return audit.plan
    .filter((item) => item.status === "GAP" || item.status === "USER_DECISION")
    .map((item) => ({
      checkId: `production-${item.id}`,
      name: `production audit: ${item.title}`,
      group: "production-audit",
      status: item.status,
      blocking: item.status === "GAP" ? blockOnCoverageGaps : blockOnUserDecisions,
      coverageGap: item.status === "GAP",
      summary: item.summary,
      recommendation: item.recommendation,
    }));
}

export function runLocalGate(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const outputPath = resolveOutputPath(root, options.outputPath);
  const writeReports = Boolean(options.writeReports);
  const sbomOutputPath = writeReports ? path.join(path.dirname(outputPath), "sbom.cdx.json") : null;
  if (writeReports) fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  const project = detectProject(root);
  const policyBundle = loadPolicyBundle(root);
  const intake = options.production ? loadIntake(root, project) : null;
  const audit = options.production ? buildAuditPlan(project, intake) : null;
  const checks = runRegisteredChecks(project, {
    strict: Boolean(options.strict),
    release: Boolean(options.release),
    noTests: Boolean(options.noTests),
    runnerOptions: options.runnerOptions || {},
    sbomOutputPath,
    policy: policyBundle.policy,
  }).concat(productionAuditChecks(audit, intake));
  const policyResult = applyPolicy(checks, policyBundle);
  const toolVersions = getToolVersions(versionedTools, options.runnerOptions || {});
  const report = buildJsonReport({
    root,
    mode: {
      strict: Boolean(options.strict),
      release: Boolean(options.release),
      noTests: Boolean(options.noTests),
      production: Boolean(options.production),
      policy: policyBundle.policy.mode,
    },
    probe: project,
    checks: policyResult.checks,
    toolVersions,
    invalidExceptions: policyResult.invalidExceptions,
    audit,
  });

  if (writeReports) {
    writeReportFiles(report, outputPath, {
      codeScanning: policyBundle.policy.reporting?.code_scanning || {},
    });
  }
  return report;
}

function parseArgs(args) {
  const positional = [];
  const parsed = {
    strict: false,
    release: false,
    jsonOnly: false,
    noTests: false,
    production: false,
    outputPath: null,
  };

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--strict") parsed.strict = true;
    else if (arg === "--release") parsed.release = true;
    else if (arg === "--json") parsed.jsonOnly = true;
    else if (arg === "--no-tests") parsed.noTests = true;
    else if (arg === "--production") parsed.production = true;
    else if (arg === "--output") parsed.outputPath = args[++i];
    else if (arg.startsWith("--output=")) parsed.outputPath = arg.slice("--output=".length);
    else if (!arg.startsWith("--")) positional.push(arg);
  }

  parsed.projectRoot = positional[0] || process.cwd();
  return parsed;
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const report = runLocalGate(args.projectRoot, {
    strict: args.strict,
    release: args.release,
    noTests: args.noTests,
    production: args.production,
    outputPath: args.outputPath,
    writeReports: true,
  });

  if (args.jsonOnly) {
    console.log(JSON.stringify(report, null, 2));
  } else {
    console.log(toMarkdown(report));
  }

  process.exit(report.passed ? 0 : 1);
}

if (import.meta.url === pathToFileURL(fileURLToPath(import.meta.url)).href && process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
