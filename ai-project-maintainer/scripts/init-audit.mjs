#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import YAML from "yaml";
import {
  defaultBusinessFlows,
  defaultEvidenceSources,
  defaultProjectProfile,
  defaultRiskPolicy,
} from "./lib/intake.mjs";
import { runIntakeWizard } from "./lib/intake-wizard.mjs";

const markdownTemplates = {
  ".ai-maintainer/threat-model.md": `# Threat Model

## Assets

- Source code
- User data
- Credentials and local secrets

## Trust Boundaries

- Browser or renderer process
- API or main process
- Database and file system
- CI/CD and release artifacts

## User Decisions

- Confirm the real roles, permissions, and sensitive data before production review.
`,
  ".ai-maintainer/release-checklist.yml": `schema_version: 1
release:
  has_staging: false
  has_smoke_tests: false
  has_manual_approval: false
  has_rollback_plan: false
  has_versioned_artifacts: false
`,
  ".ai-maintainer/incident-runbook.md": `# Incident Runbook

## First Response

- Identify current version and latest deploy.
- Check error monitoring, logs, and recent migrations.
- Decide whether rollback is safe.

## User Decisions

- Define who can approve rollback and user communication.
`,
  ".ai-maintainer/db-migration-policy.yml": `schema_version: 1
database:
  changes_use_migrations: true
  destructive_changes_require_review: true
  backup_before_production_migration: false
  rollback_or_forward_fix_required: false
`,
  ".ai-maintainer/observability-checklist.yml": `schema_version: 1
observability:
  error_monitoring: false
  structured_logs: false
  metrics: false
  alerts: false
  release_tracking: false
`,
};

function yamlTemplate(value) {
  return YAML.stringify(value);
}

function safeWrite(root, relativePath, content, result) {
  const full = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (fs.existsSync(full)) {
    result.skipped.push(relativePath);
    return;
  }
  fs.writeFileSync(full, content);
  result.created.push(relativePath);
}

function firstPositional(args, optionValueNames = []) {
  return args.find((arg, index) => !arg.startsWith("--") && !optionValueNames.includes(args[index - 1]));
}

export function initAudit(projectRoot) {
  const root = path.resolve(projectRoot || process.cwd());
  const result = { root, created: [], skipped: [] };

  safeWrite(root, ".ai-maintainer/project-profile.yml", yamlTemplate(defaultProjectProfile), result);
  safeWrite(root, ".ai-maintainer/evidence-sources.yml", yamlTemplate(defaultEvidenceSources), result);
  safeWrite(root, ".ai-maintainer/business-flows.yml", yamlTemplate(defaultBusinessFlows), result);
  safeWrite(root, ".ai-maintainer/risk-policy.yml", yamlTemplate(defaultRiskPolicy), result);
  for (const [relativePath, content] of Object.entries(markdownTemplates)) safeWrite(root, relativePath, content, result);

  return result;
}

export async function initAuditWizard(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  if (options.dryRun) return runIntakeWizard(root, options);
  const wizardResult = await runIntakeWizard(root, options);
  const templateResult = initAudit(root);
  return {
    ...wizardResult,
    created: [...templateResult.created, ...wizardResult.created],
    updated: wizardResult.updated,
    skipped: templateResult.skipped,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const projectRoot = firstPositional(args, ["--lang"]) || process.cwd();
  const wizard = args.includes("--wizard");
  const dryRun = args.includes("--dry-run");
  const langIndex = args.indexOf("--lang");
  const lang = langIndex === -1 ? "en" : args[langIndex + 1] || "en";
  const result = wizard
    ? await initAuditWizard(projectRoot, { dryRun, lang })
    : initAudit(projectRoot);
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch((error) => {
    console.error(error.message);
    process.exit(2);
  });
}
