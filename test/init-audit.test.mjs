import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

import { initAudit } from "../ai-project-maintainer/scripts/init-audit.mjs";
import { loadIntake } from "../ai-project-maintainer/scripts/lib/intake.mjs";

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
