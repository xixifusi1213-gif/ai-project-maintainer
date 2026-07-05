import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { detectProject } from "../ai-project-maintainer/scripts/lib/project-detect.mjs";
import { normalizeProfileId, resolveProjectProfile } from "../ai-project-maintainer/scripts/lib/profiles.mjs";

function tempProject(prefix = "apm-profile-") {
  return fs.mkdtempSync(path.join(os.tmpdir(), prefix));
}

function writeJson(root, relativePath, value) {
  const fullPath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, JSON.stringify(value, null, 2));
}

function writeText(root, relativePath, value = "") {
  const fullPath = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(fullPath), { recursive: true });
  fs.writeFileSync(fullPath, value);
}

function detectedProfile(root, options = {}) {
  return resolveProjectProfile(detectProject(root), options);
}

test("profile aliases keep old oss value compatible", () => {
  assert.equal(normalizeProfileId("oss"), "oss-library");
  assert.equal(normalizeProfileId("nextjs"), "nextjs-web");
  assert.equal(normalizeProfileId("api"), "node-api");
  assert.equal(normalizeProfileId("auto"), "auto");
});

test("Electron dependency or preload files select electron-desktop", () => {
  const root = tempProject();
  writeJson(root, "package.json", { devDependencies: { electron: "^31.0.0" } });
  writeText(root, "preload.js", "module.exports = {};\n");

  const profile = detectedProfile(root);

  assert.equal(profile.id, "electron-desktop");
  assert.equal(profile.source, "detected");
  assert.equal(profile.signals["electron-desktop"].length >= 1, true);
});

test("Next.js signals select nextjs-web", () => {
  const root = tempProject();
  writeJson(root, "package.json", { dependencies: { next: "^15.0.0", react: "^19.0.0" } });
  writeText(root, "next.config.mjs", "export default {};\n");
  writeText(root, "app/page.tsx", "export default function Page() { return null; }\n");

  const profile = detectedProfile(root);

  assert.equal(profile.id, "nextjs-web");
  assert.equal(profile.signals["nextjs-web"].some((entry) => entry.id === "next-dependency"), true);
});

test("Node API signals select node-api", () => {
  const root = tempProject();
  writeJson(root, "package.json", { dependencies: { express: "^5.0.0" } });
  writeText(root, "routes/users.js", "export const users = [];\n");

  const profile = detectedProfile(root);

  assert.equal(profile.id, "node-api");
  assert.equal(profile.signals["node-api"].length >= 1, true);
});

test("Prisma schema and migrations select database-prisma before web/API profiles", () => {
  const root = tempProject();
  writeJson(root, "package.json", { dependencies: { "@prisma/client": "^6.0.0", express: "^5.0.0" }, devDependencies: { prisma: "^6.0.0" } });
  writeText(root, "prisma/schema.prisma", "model User { id String @id }\n");
  writeText(root, "prisma/migrations/001_init/migration.sql", "create table users(id text primary key);\n");

  const profile = detectedProfile(root);

  assert.equal(profile.id, "database-prisma");
  assert.equal(profile.matchedProfiles.includes("database-prisma"), true);
  assert.equal(profile.matchedProfiles.includes("node-api"), true);
});

test("Package metadata with no stronger app signal falls back to oss-library", () => {
  const root = tempProject();
  writeJson(root, "package.json", { name: "sample-lib", main: "dist/index.js", types: "dist/index.d.ts" });
  writeText(root, "README.md", "# sample\n");
  writeText(root, "LICENSE", "MIT\n");

  const profile = detectedProfile(root);

  assert.equal(profile.id, "oss-library");
  assert.equal(profile.source, "detected");
});

test("profile override priority is cli, policy, project-profile, detected, fallback", () => {
  const root = tempProject();
  writeJson(root, "package.json", { dependencies: { next: "^15.0.0" } });
  const project = detectProject(root);

  assert.equal(resolveProjectProfile(project, { cliProfile: "database-prisma", policyProfile: "nextjs-web" }).id, "database-prisma");
  assert.equal(resolveProjectProfile(project, { policyProfile: "oss" }).id, "oss-library");
  assert.equal(resolveProjectProfile(project, { projectProfile: "node-api" }).id, "node-api");
  assert.equal(resolveProjectProfile(project, {}).id, "nextjs-web");
  assert.equal(resolveProjectProfile({ root: tempProject(), files: [] }, {}).id, "oss-library");
});
