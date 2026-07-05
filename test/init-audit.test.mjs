import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

import { initAudit, initAuditWizard } from "../ai-project-maintainer/scripts/init-audit.mjs";
import { loadIntake } from "../ai-project-maintainer/scripts/lib/intake.mjs";
import { buildWizardQuestions, runIntakeWizard } from "../ai-project-maintainer/scripts/lib/intake-wizard.mjs";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "apm-intake-"));
}

test("initAudit creates production audit templates without secrets", () => {
  const root = tempProject();
  const result = initAudit(root);
  const expected = [
    ".ai-maintainer/project-profile.yml",
    ".ai-maintainer/evidence-sources.yml",
    ".ai-maintainer/business-flows.yml",
    ".ai-maintainer/risk-policy.yml",
    ".ai-maintainer/connectors.yml",
    ".ai-maintainer/threat-model.md",
    ".ai-maintainer/release-checklist.yml",
    ".ai-maintainer/incident-runbook.md",
    ".ai-maintainer/db-migration-policy.yml",
    ".ai-maintainer/observability-checklist.yml",
  ];

  for (const file of expected) {
    assert.equal(result.created.includes(file), true);
    assert.equal(fs.existsSync(path.join(root, ...file.split("/"))), true);
  }

  const profile = YAML.parse(fs.readFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), "utf8"));
  assert.equal(profile.schema_version, 1);
  assert.equal(profile.project.type, "auto");
  assert.equal(profile.risk.has_database, "auto");

  const evidenceText = fs.readFileSync(path.join(root, ".ai-maintainer", "evidence-sources.yml"), "utf8");
  assert.doesNotMatch(evidenceText, /token|password|secret|dsn/i);

  const connectorsText = fs.readFileSync(path.join(root, ".ai-maintainer", "connectors.yml"), "utf8");
  assert.match(connectorsText, /token_env: GITHUB_TOKEN/);
  assert.doesNotMatch(connectorsText, /ghp_|xoxb-|password:/i);
});

test("initAudit can write an explicit project profile rule pack", () => {
  const root = tempProject();
  initAudit(root, { profile: "database-prisma" });

  const profile = YAML.parse(fs.readFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), "utf8"));

  assert.equal(profile.project.type, "auto");
  assert.equal(profile.project.profile, "database-prisma");
});

test("initAudit does not overwrite user-maintained intake files", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), "project:\n  name: custom\n");

  const result = initAudit(root);
  const profile = fs.readFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), "utf8");

  assert.equal(profile, "project:\n  name: custom\n");
  assert.equal(result.skipped.includes(".ai-maintainer/project-profile.yml"), true);
});

test("loadIntake merges defaults and tolerates malformed YAML", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), "project: [broken\n");

  const intake = loadIntake(root, { riskSurfaces: { database: [] }, electron: { detected: false }, files: [] });

  assert.equal(intake.initialized, true);
  assert.equal(intake.profile.project.type, "auto");
  assert.equal(intake.profile.derived.hasDatabase, false);
  assert.equal(intake.parseErrors.length, 1);
});

test("intake wizard writes professional project profile and summary", async () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "wizard-api",
    scripts: { test: "node --test" },
    dependencies: { express: "latest" },
  }));
  fs.mkdirSync(path.join(root, "migrations"));
  fs.writeFileSync(path.join(root, "migrations", "001_init.sql"), "select 1;");

  const result = await runIntakeWizard(root, {
    interactive: false,
    answers: {
      project_type: "api",
      lifecycle: "pre-production",
      handles_auth: "yes",
      handles_sensitive_data: "yes",
      handles_payments: "no",
      handles_financial_data: "yes",
      has_user_generated_content: "yes",
      has_database: "yes",
      has_deployment: "yes",
      deployment_provider: "vercel",
      has_staging: "yes",
      has_production: "yes",
      production_requires_approval: "no",
      observability_errors: "yes",
      observability_logs: "unknown",
      observability_metrics: "unknown",
      observability_alerts: "no",
      critical_flows: "submit reimbursement, approve reimbursement",
      business_flow_tests: "yes",
      strict_production: "yes",
      db_migrations: "yes",
      db_backup: "no",
      db_rollback: "unknown",
      db_concurrency: "yes",
      db_audit_log: "no",
    },
  });

  const profile = YAML.parse(fs.readFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), "utf8"));
  const evidence = YAML.parse(fs.readFileSync(path.join(root, ".ai-maintainer", "evidence-sources.yml"), "utf8"));
  const business = YAML.parse(fs.readFileSync(path.join(root, ".ai-maintainer", "business-flows.yml"), "utf8"));
  const risk = YAML.parse(fs.readFileSync(path.join(root, ".ai-maintainer", "risk-policy.yml"), "utf8"));
  const summary = fs.readFileSync(path.join(root, ".ai-maintainer", "intake-summary.md"), "utf8");

  assert.equal(result.created.includes(".ai-maintainer/project-profile.yml"), true);
  assert.equal(profile.project.type, "api");
  assert.equal(profile.project.profile, "node-api");
  assert.equal(profile.project.production, true);
  assert.equal(profile.risk.handles_auth, true);
  assert.equal(profile.risk.has_database, true);
  assert.equal(profile.risk.database_concurrent_writes, true);
  assert.equal(evidence.evidence.deployment.provider, "vercel");
  assert.equal(evidence.evidence.observability.errors, "present");
  assert.equal(evidence.evidence.observability.logs, "unknown");
  assert.equal(evidence.evidence.database.backup_policy, "none");
  assert.equal(business.business_flows.length, 2);
  assert.equal(risk.production.block_on_coverage_gaps, true);
  assert.match(summary, /Maintainer Confirmed/);
  assert.match(summary, /Database evidence detected/);
});

test("initAuditWizard keeps legacy audit templates and adds summary", async () => {
  const root = tempProject();
  const result = await initAuditWizard(root, {
    interactive: false,
    answers: {
      project_name: "wizard-full",
      critical_flows: "release project",
    },
  });

  assert.equal(result.created.includes(".ai-maintainer/intake-summary.md"), true);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer", "threat-model.md")), true);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer", "release-checklist.yml")), true);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer", "incident-runbook.md")), true);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer", "db-migration-policy.yml")), true);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer", "observability-checklist.yml")), true);
});

test("intake wizard preserves extra user fields while updating known answers", async () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), [
    "schema_version: 1",
    "project:",
    "  name: existing",
    "  custom_note: keep-me",
    "risk:",
    "  custom_risk: keep-me-too",
    "",
  ].join("\n"));

  await runIntakeWizard(root, {
    interactive: false,
    answers: {
      project_name: "updated",
      project_type: "web",
      has_database: "no",
    },
  });

  const profile = YAML.parse(fs.readFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), "utf8"));
  assert.equal(profile.project.name, "updated");
  assert.equal(profile.project.type, "web");
  assert.equal(profile.project.custom_note, "keep-me");
  assert.equal(profile.risk.custom_risk, "keep-me-too");
});

test("intake wizard surfaces database contradiction as user decision", async () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, "prisma"));
  fs.writeFileSync(path.join(root, "prisma", "schema.prisma"), "model User { id String @id }");

  const result = await runIntakeWizard(root, {
    interactive: false,
    answers: {
      has_database: "no",
      critical_flows: "",
    },
  });

  assert.match(result.summary, /Database evidence was detected/);
  assert.match(result.summary, /Critical business flows are not declared/);
});

test("Electron projects enable Electron-specific wizard questions", () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    devDependencies: { electron: "latest" },
  }));
  fs.writeFileSync(path.join(root, "preload.js"), "module.exports = {};");
  const project = {
    root,
    packageJson: JSON.parse(fs.readFileSync(path.join(root, "package.json"), "utf8")),
    riskSurfaces: { database: [], ci: [] },
    electron: { detected: true },
  };
  const intake = loadIntake(root, project);
  const questions = buildWizardQuestions(project, intake);

  assert.equal(questions.some((question) => question.id === "electron_ipc"), true);
  assert.equal(questions.some((question) => question.id === "electron_signed_updates"), true);
});
