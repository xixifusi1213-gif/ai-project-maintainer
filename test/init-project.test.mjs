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
  assert.match(fs.readFileSync(path.join(root, ".ai-maintainer", "policy.yml"), "utf8"), /include_coverage_gaps: false/);
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

test("initProject oss github profile creates GitHub-source CI, dependabot, and pre-commit templates", () => {
  const root = tempProject();
  const result = initProject(root, { profile: "oss", ci: "github", preCommit: true });
  const policy = fs.readFileSync(path.join(root, ".ai-maintainer", "policy.yml"), "utf8");
  const workflow = fs.readFileSync(path.join(root, ".github", "workflows", "security-gate.yml"), "utf8");
  const dependabot = fs.readFileSync(path.join(root, ".github", "dependabot.yml"), "utf8");
  const preCommit = fs.readFileSync(path.join(root, ".pre-commit-config.yaml"), "utf8");

  assert.equal(result.created.includes(".github/dependabot.yml"), true);
  assert.match(policy, /profile: oss/);
  assert.match(policy, /scorecard: warn/);
  assert.match(policy, /megalinter: warn/);
  assert.match(workflow, /git clone --depth 1 https:\/\/github\.com\/xixifusi1213-gif\/ai-project-maintainer\.git/);
  assert.match(workflow, /npm ci --omit=dev \|\| npm install --omit=dev/);
  assert.match(workflow, /EXTRA_FLAGS="\$EXTRA_FLAGS --production"/);
  assert.match(workflow, /node "\$RUNNER_TEMP\/ai-project-maintainer\/ai-project-maintainer\/scripts\/run-local-gate\.mjs"/);
  assert.doesNotMatch(workflow, /npx ai-project-maintainer gate/);
  assert.match(workflow, /GITHUB_STEP_SUMMARY/);
  assert.match(workflow, /upload-sarif/);
  assert.match(dependabot, /package-ecosystem: "github-actions"/);
  assert.match(preCommit, /ai-project-maintainer-local-gate/);
});
