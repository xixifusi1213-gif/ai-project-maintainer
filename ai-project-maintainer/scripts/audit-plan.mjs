#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { detectProject } from "./lib/project-detect.mjs";
import { hasConfiguredEvidence, loadIntake } from "./lib/intake.mjs";
import { loadPolicyBundle } from "./lib/policy.mjs";

function item(id, title, status, summary, recommendation = "", group = "production-audit") {
  return { id, title, status, summary, recommendation, group };
}

function realBusinessFlows(intake) {
  return (intake.businessFlows.business_flows || []).filter((flow) => flow && !flow.template && flow.id);
}

function flowTests(flows) {
  return flows.flatMap((flow) => (Array.isArray(flow.tests) ? flow.tests : []));
}

function realDataClasses(intake) {
  return (intake.dataBoundaries?.data_classes || []).filter((dataClass) => dataClass && !dataClass.template && dataClass.id);
}

function realAuthzResources(intake) {
  return (intake.authzMatrix?.resources || []).filter((resource) => resource && !resource.template && resource.id);
}

function authzTests(resources) {
  return resources.flatMap((resource) => Object.values(resource.actions || {}))
    .flatMap((action) => (Array.isArray(action.tests) ? action.tests : []));
}

function highRiskSideEffectFlows(flows) {
  const highRiskEffects = new Set(["payment", "payments", "order", "orders", "refund", "refunds", "inventory", "webhook", "webhooks", "cron", "queue", "email", "subscription"]);
  return flows.filter((flow) => {
    const effects = Array.isArray(flow.side_effects) ? flow.side_effects.map((effect) => String(effect).toLowerCase()) : [];
    return Boolean(flow.idempotency_required) || effects.some((effect) => highRiskEffects.has(effect));
  });
}

function needsProductionDataModel(profile) {
  return Boolean(profile.handlesSensitiveData || profile.handlesFinancialData || profile.handlesPayments || profile.handlesHealthData);
}

function needsAuthorizationModel(profile) {
  return Boolean(profile.handlesAuth || profile.hasPublicApi || profile.hasAdminRoles || profile.handlesSensitiveData);
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
    handlesPayments: Boolean(intake.profile.risk?.handles_payments),
    handlesFinancialData: Boolean(intake.profile.risk?.handles_financial_data),
    handlesHealthData: Boolean(intake.profile.risk?.handles_health_data),
    hasPublicApi: Boolean(intake.profile.risk?.has_public_api),
    hasAdminRoles: Boolean(intake.profile.risk?.has_admin_roles),
    databaseConcurrentWrites: Boolean(intake.profile.risk?.database_concurrent_writes),
    databaseAuditLog: Boolean(intake.profile.risk?.database_audit_log),
  };
  const evidence = intake.evidence.evidence || {};
  const deployment = evidence.deployment || {};
  const observability = evidence.observability || {};
  const database = evidence.database || {};
  const flows = realBusinessFlows(intake);
  const tests = flowTests(flows);
  const dataClasses = realDataClasses(intake);
  const sensitiveLogClasses = dataClasses.filter((dataClass) => dataClass.may_appear_in_logs === false);
  const resources = realAuthzResources(intake);
  const objectAuthzTests = authzTests(resources);
  const sideEffectFlows = highRiskSideEffectFlows(flows);
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
      ? item("business-critical-flows", "Critical business flows", "PASS", `${flows.length} critical flow(s) declared.`, "", "business-flow-safety")
      : item("business-critical-flows", "Critical business flows", "USER_DECISION", "The maintainer must declare the business flows that must not break.", "Fill .ai-maintainer/business-flows.yml with real flows.", "business-flow-safety"),
  );

  plan.push(
    flows.length && tests.length === 0
      ? item("business-flow-tests", "Business flow tests", "GAP", "Critical flows are declared without linked automated tests.", "Add tests for each critical flow and list them in business-flows.yml.", "business-flow-safety")
      : item("business-flow-tests", "Business flow tests", flows.length ? "PASS" : "USER_DECISION", flows.length ? `${tests.length} test reference(s) declared.` : "Declare flows before test coverage can be judged.", "", "business-flow-safety"),
  );

  if (needsProductionDataModel(profile)) {
    plan.push(
      dataClasses.length
        ? item("data-boundaries", "Data boundaries", "PASS", `${dataClasses.length} sensitive data class(es) declared.`, "", "data-exposure")
        : item("data-boundaries", "Data boundaries", "GAP", "Data boundary evidence is incomplete; this is not a discovered vulnerability.", "Fill .ai-maintainer/data-boundaries.yml with sensitive data classes, fields, exposure rules, log policy, and tests.", "data-exposure"),
    );
    plan.push(
      dataClasses.length && sensitiveLogClasses.every((dataClass) => Array.isArray(dataClass.tests) && dataClass.tests.length)
        ? item("sensitive-log-redaction", "Sensitive log redaction", "PASS", "Sensitive data classes that cannot appear in logs have linked tests.", "", "data-exposure")
        : item("sensitive-log-redaction", "Sensitive log redaction", "GAP", "Sensitive log redaction evidence is incomplete; this is not a discovered vulnerability.", "Add tests or evidence proving sensitive fields are excluded, masked, hashed, or encrypted in logs and error reports.", "data-exposure"),
    );
  } else {
    plan.push(item("data-boundaries", "Data boundaries", "N/A", "No sensitive, personal, financial, payment, or health data surface declared.", "", "data-exposure"));
    plan.push(item("sensitive-log-redaction", "Sensitive log redaction", "N/A", "No sensitive data surface declared.", "", "data-exposure"));
  }

  if (needsAuthorizationModel(profile)) {
    plan.push(
      resources.length
        ? item("authz-matrix", "Authorization matrix", "PASS", `${resources.length} protected resource(s) declared.`, "", "auth-boundary")
        : item("authz-matrix", "Authorization matrix", "GAP", "Authorization matrix evidence is incomplete; this is not a discovered vulnerability.", "Fill .ai-maintainer/authz-matrix.yml with roles, protected resources, owner/tenant fields, actions, and tests.", "auth-boundary"),
    );
    plan.push(
      resources.length && objectAuthzTests.length
        ? item("authz-object-tests", "Object-level authorization tests", "PASS", `${objectAuthzTests.length} object-level authorization test reference(s) declared.`, "", "auth-boundary")
        : item("authz-object-tests", "Object-level authorization tests", "GAP", "Object-level authorization test evidence is incomplete; this is not a discovered vulnerability.", "Add tests showing users cannot access another user's or tenant's objects and list them in authz-matrix.yml.", "auth-boundary"),
    );
  } else {
    plan.push(item("authz-matrix", "Authorization matrix", "N/A", "No auth, public API, admin, or sensitive data surface declared.", "", "auth-boundary"));
    plan.push(item("authz-object-tests", "Object-level authorization tests", "N/A", "No object-level authorization surface declared.", "", "auth-boundary"));
  }

  if (sideEffectFlows.length) {
    plan.push(
      sideEffectFlows.every((flow) => Array.isArray(flow.tests) && flow.tests.length && flow.replay_safe !== false)
        ? item("business-flow-idempotency", "Business flow idempotency", "PASS", "Side-effectful flows have linked tests and replay-safety evidence.", "", "business-flow-safety")
        : item("business-flow-idempotency", "Business flow idempotency", "GAP", "Side-effectful business-flow idempotency evidence is incomplete; this is not a discovered vulnerability.", "Add duplicate-submit, webhook replay, queue retry, payment/order idempotency, or equivalent tests.", "business-flow-safety"),
    );
    plan.push(
      sideEffectFlows.every((flow) => Array.isArray(flow.abuse_controls) && flow.abuse_controls.length)
        ? item("business-flow-abuse-controls", "Business flow abuse controls", "PASS", "Side-effectful flows declare abuse controls.", "", "business-flow-safety")
        : item("business-flow-abuse-controls", "Business flow abuse controls", "GAP", "Business-flow abuse-control evidence is incomplete; this is not a discovered vulnerability.", "Declare rate limits, quotas, stock/reservation limits, approval checks, or equivalent controls.", "business-flow-safety"),
    );
  } else {
    plan.push(item("business-flow-idempotency", "Business flow idempotency", "N/A", "No side-effectful critical flow declared.", "", "business-flow-safety"));
    plan.push(item("business-flow-abuse-controls", "Business flow abuse controls", "N/A", "No side-effectful critical flow declared.", "", "business-flow-safety"));
  }

  plan.push(
    profile.hasElectron
      ? item("electron-security", "Electron security review", "PASS", "Electron surface detected; IPC, preload, file permission, and update trust checks are enabled.")
      : item("electron-security", "Electron security review", "N/A", "No Electron surface detected."),
  );

  plan.push(
    profile.hasCi
      ? item("ci-security", "CI security review", "PASS", "CI workflow evidence detected; actionlint and zizmor checks are applicable.", "", "operational-safety")
      : item("ci-security", "CI security review", "GAP", "No GitHub Actions workflow evidence detected.", "Add CI or document another release gate in evidence-sources.yml.", "operational-safety"),
  );

  plan.push(
    isOssLibrary && !profile.hasDeployment && !deployment.has_production
      ? item("release-approval", "Production release approval", "N/A", "OSS library profile has no production runtime deployment.", "", "operational-safety")
      : profile.hasDeployment || deployment.has_production
      ? item("release-approval", "Production release approval", deployment.production_requires_approval ? "PASS" : "GAP", deployment.production_requires_approval ? "Production approval evidence declared." : "Production deployment exists without approval evidence.", "Use GitHub Environments or document the approval gate.", "operational-safety")
      : item("release-approval", "Production release approval", "GAP", "No production deployment evidence declared.", "Declare deployment provider and approval status in evidence-sources.yml.", "operational-safety"),
  );

  for (const [id, title, key] of [
    ["observability-errors", "Error monitoring", "errors"],
    ["observability-logs", "Production logs", "logs"],
    ["observability-metrics", "Production metrics", "metrics"],
    ["observability-alerts", "Production alerts", "alerts"],
  ]) {
    plan.push(
      isOssLibrary && !profile.hasDeployment && !deployment.has_production
        ? item(id, title, "N/A", "OSS library profile has no production runtime observability requirement.", "", "operational-safety")
        :
      hasConfiguredEvidence(observability[key])
        ? item(id, title, "PASS", `${title} evidence declared.`, "", "operational-safety")
        : item(id, title, "GAP", `${title} evidence is missing.`, `Declare ${key} evidence in evidence-sources.yml.`, "operational-safety"),
    );
  }

  if (profile.hasDatabase) {
    plan.push(item("database-migrations", "Database migration review", hasConfiguredEvidence(database.review_tool) ? "PASS" : "GAP", hasConfiguredEvidence(database.review_tool) ? "Database review tool evidence declared." : "Database surface detected without migration review tool evidence.", "Use Atlas, Bytebase, Squawk, or document manual migration review.", "database-safety"));
    plan.push(item("database-backup", "Database backup evidence", hasConfiguredEvidence(database.backup_policy) ? "PASS" : "GAP", hasConfiguredEvidence(database.backup_policy) ? "Backup policy evidence declared." : "Database backup evidence is missing.", "Document backup policy before production migration.", "database-safety"));
    plan.push(item("database-rollback", "Database rollback or forward-fix plan", hasConfiguredEvidence(database.rollback_plan) ? "PASS" : "GAP", hasConfiguredEvidence(database.rollback_plan) ? "Rollback or forward-fix evidence declared." : "Database rollback or forward-fix evidence is missing.", "Document rollback or forward-fix strategy.", "database-safety"));
    plan.push(profile.databaseConcurrentWrites
      ? item("database-write-safety", "Database write safety", tests.length ? "PASS" : "GAP", tests.length ? "Critical-flow tests are declared for database write safety review." : "Database concurrent-write evidence is incomplete; this is not a discovered vulnerability.", "Document transaction, uniqueness, idempotency, and concurrent-write tests for critical writes.", "database-safety")
      : item("database-write-safety", "Database write safety", "USER_DECISION", "Maintainer must confirm whether concurrent writes can affect correctness.", "If critical writes exist, document transaction and uniqueness evidence.", "database-safety"));
    plan.push(profile.databaseAuditLog
      ? item("database-audit-log", "Database audit log", "PASS", "Maintainer declared audit logging for important data changes.", "", "database-safety")
      : item("database-audit-log", "Database audit log", "GAP", "Database audit-log evidence is incomplete; this is not a discovered vulnerability.", "Document audit logging for important data changes or explicitly accept the gap.", "database-safety"));
  } else {
    plan.push(item("database-migrations", "Database migration review", "N/A", "No database surface detected or declared.", "", "database-safety"));
    plan.push(item("database-backup", "Database backup evidence", "N/A", "No database surface detected or declared.", "", "database-safety"));
    plan.push(item("database-rollback", "Database rollback or forward-fix plan", "N/A", "No database surface detected or declared.", "", "database-safety"));
    plan.push(item("database-write-safety", "Database write safety", "N/A", "No database surface detected or declared.", "", "database-safety"));
    plan.push(item("database-audit-log", "Database audit log", "N/A", "No database surface detected or declared.", "", "database-safety"));
  }

  plan.push(item("ai-repair-safety", "AI repair safety", "PASS", "Repair-pack tasks require maintainer decisions for production evidence gaps and must not invent evidence.", "Do not let agents remove auth, validation, tests, audit logs, or error handling to pass the gate.", "ai-repair-safety"));

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
