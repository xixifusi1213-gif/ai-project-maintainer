import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initAudit } from "../ai-project-maintainer/scripts/init-audit.mjs";
import { buildAuditPlan } from "../ai-project-maintainer/scripts/audit-plan.mjs";
import { loadIntake } from "../ai-project-maintainer/scripts/lib/intake.mjs";
import { detectProject } from "../ai-project-maintainer/scripts/lib/project-detect.mjs";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "apm-plan-"));
}

function planFor(root) {
  const project = detectProject(root);
  return buildAuditPlan(project, loadIntake(root, project));
}

test("audit plan marks database review as N/A for projects without database evidence", () => {
  const root = tempProject();
  initAudit(root);

  const audit = planFor(root);
  const database = audit.plan.find((item) => item.id === "database-migrations");
  const observability = audit.plan.find((item) => item.id === "observability-errors");

  assert.equal(database.status, "N/A");
  assert.equal(observability.status, "GAP");
  assert.equal(audit.coverageGaps.some((gap) => gap.id === "observability-errors"), true);
});

test("audit plan enables Electron-specific review for Electron projects", () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ devDependencies: { electron: "^31.0.0" } }, null, 2));
  initAudit(root);

  const audit = planFor(root);
  const electron = audit.plan.find((item) => item.id === "electron-security");

  assert.equal(audit.profile.id, "electron-desktop");
  assert.equal(electron.status, "PASS");
  assert.match(electron.summary, /IPC|preload|update/i);
  assert.equal(audit.plan.find((item) => item.id === "electron-ipc-preload").status, "GAP");
});

test("audit plan creates migration, backup, and rollback gaps for database projects", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, "prisma", "migrations", "001_create_users"), { recursive: true });
  fs.writeFileSync(path.join(root, "prisma", "schema.prisma"), "model User { id String @id }\n");
  fs.writeFileSync(path.join(root, "prisma", "migrations", "001_create_users", "migration.sql"), "create table users(id text primary key);\n");
  initAudit(root);

  const audit = planFor(root);

  assert.equal(audit.profile.id, "database-prisma");
  assert.equal(audit.plan.find((item) => item.id === "database-migrations").status, "GAP");
  assert.equal(audit.plan.find((item) => item.id === "database-backup").status, "GAP");
  assert.equal(audit.plan.find((item) => item.id === "database-rollback").status, "GAP");
  assert.equal(audit.plan.find((item) => item.id === "prisma-migration-safety").status, "GAP");
});

test("audit plan reduces runtime production evidence pressure for OSS library profile", () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "sample-lib", main: "index.js" }, null, 2));
  fs.writeFileSync(path.join(root, "README.md"), "# sample\n");
  initAudit(root);

  const audit = planFor(root);

  assert.equal(audit.profile.id, "oss-library");
  assert.equal(audit.plan.find((item) => item.id === "release-approval").status, "N/A");
  assert.equal(audit.plan.find((item) => item.id === "observability-errors").status, "N/A");
  assert.equal(audit.plan.find((item) => item.id === "oss-release-trust").status, "GAP");
});
