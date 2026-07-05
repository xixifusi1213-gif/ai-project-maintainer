#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectProject } from "./lib/project-detect.mjs";
import { hasConfiguredEvidence, loadIntake } from "./lib/intake.mjs";
import { loadPolicyBundle } from "./lib/policy.mjs";

function item(id, title, status, summary, recommendation = "") {
  return { id, title, status, summary, recommendation };
}

function realBusinessFlows(intake) {
  return (intake.businessFlows.business_flows || []).filter((flow) => flow && !flow.template && flow.id);
}

function flowTests(flows) {
  return flows.flatMap((flow) => (Array.isArray(flow.tests) ? flow.tests : []));
}

export function buildAuditPlan(project, intake = loadIntake(project.root, project)) {
  const resolvedProfile = intake.profile.derived.profile;
  const profile = {
    projectType: intake.profile.derived.projectType,
    id: resolvedProfile?.id || intake.profile.derived.profileId,
    source: resolvedProfile?.source || intake.profile.derived.profileSource,
    signals: resolvedProfile?.signals || intake.profile.derived.profileSignals || {},
    riskFocus: resolvedProfile?.riskFocus || intake.profile.derived.profileRiskFocus || [],
    hasDatabase: intake.profile.derived.hasDatabase,
    hasCi: intake.profile.derived.hasCi,
    hasElectron: intake.profile.derived.hasElectron,
    hasDeployment: intake.profile.derived.hasDeployment,
    handlesAuth: Boolean(intake.profile.risk?.handles_auth),
    handlesSensitiveData: Boolean(intake.profile.risk?.handles_sensitive_data),
    handlesFinancialData: Boolean(intake.profile.risk?.handles_financial_data),
  };
  const evidence = intake.evidence.evidence || {};
  const deployment = evidence.deployment || {};
  const observability = evidence.observability || {};
  const database = evidence.database || {};
  const flows = realBusinessFlows(intake);
  const tests = flowTests(flows);
  const plan = [];
  const isOssLibrary = profile.id === "oss-library" && profile.source !== "fallback";

  plan.push(
    intake.initialized
      ? item("intake-config", "Production audit intake", "PASS", "Project profile and evidence source templates are present.")
      : item("intake-config", "Production audit intake", "GAP", "Production audit intake has not been initialized.", "Run init-audit and fill the generated templates."),
  );

  plan.push(item(
    "project-profile",
    "Project profile rule pack",
    "PASS",
    `${profile.id || "unknown"} profile selected from ${profile.source || "unknown"} signals.`,
    "Review profile signals if the selected rule pack looks wrong.",
  ));

  for (const [id, title, status, summary, recommendation] of resolvedProfile?.auditPlan || []) {
    plan.push(item(id, title, status, summary, recommendation));
  }

  plan.push(
    flows.length
      ? item("business-critical-flows", "Critical business flows", "PASS", `${flows.length} critical flow(s) declared.`)
      : item("business-critical-flows", "Critical business flows", "USER_DECISION", "The maintainer must declare the business flows that must not break.", "Fill .ai-maintainer/business-flows.yml with real flows."),
  );

  plan.push(
    flows.length && tests.length === 0
      ? item("business-flow-tests", "Business flow tests", "GAP", "Critical flows are declared without linked automated tests.", "Add tests for each critical flow and list them in business-flows.yml.")
      : item("business-flow-tests", "Business flow tests", flows.length ? "PASS" : "USER_DECISION", flows.length ? `${tests.length} test reference(s) declared.` : "Declare flows before test coverage can be judged."),
  );

  plan.push(
    profile.hasElectron
      ? item("electron-security", "Electron security review", "PASS", "Electron surface detected; IPC, preload, file permission, and update trust checks are enabled.")
      : item("electron-security", "Electron security review", "N/A", "No Electron surface detected."),
  );

  plan.push(
    profile.hasCi
      ? item("ci-security", "CI security review", "PASS", "CI workflow evidence detected; actionlint and zizmor checks are applicable.")
      : item("ci-security", "CI security review", "GAP", "No GitHub Actions workflow evidence detected.", "Add CI or document another release gate in evidence-sources.yml."),
  );

  plan.push(
    isOssLibrary && !profile.hasDeployment && !deployment.has_production
      ? item("release-approval", "Production release approval", "N/A", "OSS library profile has no production runtime deployment.")
      : profile.hasDeployment || deployment.has_production
      ? item("release-approval", "Production release approval", deployment.production_requires_approval ? "PASS" : "GAP", deployment.production_requires_approval ? "Production approval evidence declared." : "Production deployment exists without approval evidence.", "Use GitHub Environments or document the approval gate.")
      : item("release-approval", "Production release approval", "GAP", "No production deployment evidence declared.", "Declare deployment provider and approval status in evidence-sources.yml."),
  );

  for (const [id, title, key] of [
    ["observability-errors", "Error monitoring", "errors"],
    ["observability-logs", "Production logs", "logs"],
    ["observability-metrics", "Production metrics", "metrics"],
    ["observability-alerts", "Production alerts", "alerts"],
  ]) {
    plan.push(
      isOssLibrary && !profile.hasDeployment && !deployment.has_production
        ? item(id, title, "N/A", "OSS library profile has no production runtime observability requirement.")
        :
      hasConfiguredEvidence(observability[key])
        ? item(id, title, "PASS", `${title} evidence declared.`)
        : item(id, title, "GAP", `${title} evidence is missing.`, `Declare ${key} evidence in evidence-sources.yml.`),
    );
  }

  if (profile.hasDatabase) {
    plan.push(item("database-migrations", "Database migration review", hasConfiguredEvidence(database.review_tool) ? "PASS" : "GAP", hasConfiguredEvidence(database.review_tool) ? "Database review tool evidence declared." : "Database surface detected without migration review tool evidence.", "Use Atlas, Bytebase, Squawk, or document manual migration review."));
    plan.push(item("database-backup", "Database backup evidence", hasConfiguredEvidence(database.backup_policy) ? "PASS" : "GAP", hasConfiguredEvidence(database.backup_policy) ? "Backup policy evidence declared." : "Database backup evidence is missing.", "Document backup policy before production migration."));
    plan.push(item("database-rollback", "Database rollback or forward-fix plan", hasConfiguredEvidence(database.rollback_plan) ? "PASS" : "GAP", hasConfiguredEvidence(database.rollback_plan) ? "Rollback or forward-fix evidence declared." : "Database rollback or forward-fix evidence is missing.", "Document rollback or forward-fix strategy."));
  } else {
    plan.push(item("database-migrations", "Database migration review", "N/A", "No database surface detected or declared."));
    plan.push(item("database-backup", "Database backup evidence", "N/A", "No database surface detected or declared."));
    plan.push(item("database-rollback", "Database rollback or forward-fix plan", "N/A", "No database surface detected or declared."));
  }

  if (intake.parseErrors.length) {
    for (const error of intake.parseErrors) {
      plan.push(item(`intake-parse-${error.path}`, "Intake YAML parse error", "GAP", `${error.path}: ${error.reason}`, "Fix malformed YAML so the audit can use maintainer-supplied evidence."));
    }
  }

  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    root: project.root,
    profile,
    plan,
    evidence: plan.filter((entry) => entry.status === "PASS"),
    coverageGaps: plan.filter((entry) => entry.status === "GAP"),
    userDecisions: plan.filter((entry) => entry.status === "USER_DECISION"),
  };
}

function resolveOutputPath(root, outputPath) {
  if (!outputPath) return null;
  return path.isAbsolute(outputPath) ? outputPath : path.resolve(root, outputPath);
}

export function runAuditPlan(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const project = detectProject(root);
  const policyBundle = loadPolicyBundle(root, { project, profile: options.profile });
  const intake = loadIntake(root, project, {
    profile: options.profile,
    policyProfile: policyBundle.customPolicy?.profile,
  });
  const audit = buildAuditPlan(project, intake);
  const outputPath = resolveOutputPath(root, options.outputPath);
  if (outputPath) {
    fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    fs.writeFileSync(outputPath, JSON.stringify(audit, null, 2));
  }
  return audit;
}

function parseArgs(args) {
  const positional = [];
  let outputPath = null;
  let jsonOnly = false;
  let profile = "auto";
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === "--output") outputPath = args[++i];
    else if (arg.startsWith("--output=")) outputPath = arg.slice("--output=".length);
    else if (arg === "--profile") profile = args[++i] || "auto";
    else if (arg.startsWith("--profile=")) profile = arg.slice("--profile=".length);
    else if (arg === "--json") jsonOnly = true;
    else if (!arg.startsWith("--")) positional.push(arg);
  }
  return { projectRoot: positional[0] || process.cwd(), outputPath, jsonOnly, profile };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const audit = runAuditPlan(args.projectRoot, { outputPath: args.outputPath, profile: args.profile });
  console.log(JSON.stringify(audit, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
