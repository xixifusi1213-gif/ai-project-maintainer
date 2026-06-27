import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initProject } from "../ai-project-maintainer/scripts/init-project.mjs";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "apm-init-"));
}

test("initProject creates safety gate config and workflow", () => {
  const root = tempProject();
  const result = initProject(root, { preCommit: true });

  assert.equal(result.created.includes(".ai-maintainer/policy.yml"), true);
  assert.equal(result.created.includes(".ai-maintainer/exceptions.yml"), true);
  assert.equal(result.created.includes(".github/workflows/security-gate.yml"), true);
  assert.equal(result.created.includes(".pre-commit-config.yaml"), true);
  assert.equal(fs.existsSync(path.join(root, "reports", ".gitkeep")), true);
});

test("initProject does not overwrite existing policy", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(path.join(root, ".ai-maintainer", "policy.yml"), "mode: custom\n");

  const result = initProject(root);
  const policy = fs.readFileSync(path.join(root, ".ai-maintainer", "policy.yml"), "utf8");

  assert.equal(policy, "mode: custom\n");
  assert.equal(result.skipped.includes(".ai-maintainer/policy.yml"), true);
});
