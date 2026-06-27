import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initAudit } from "../ai-project-maintainer/scripts/init-audit.mjs";
import { runLocalGate } from "../ai-project-maintainer/scripts/run-local-gate.mjs";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "apm-production-"));
}

test("production gate reports missing intake as a non-blocking coverage gap by default", () => {
  const root = tempProject();
  const report = runLocalGate(root, {
    strict: false,
    production: true,
    runnerOptions: { envPath: "" },
  });

  assert.equal(report.passed, true);
  assert.equal(report.audit.coverageGaps.some((gap) => gap.id === "intake-config"), true);
  assert.equal(report.checks.some((check) => check.group === "production-audit" && check.status === "GAP" && !check.blocking), true);
});

test("production gate can block coverage gaps through risk policy", () => {
  const root = tempProject();
  initAudit(root);
  fs.writeFileSync(path.join(root, ".ai-maintainer", "risk-policy.yml"), "production:\n  block_on_coverage_gaps: true\n");

  const report = runLocalGate(root, {
    strict: false,
    production: true,
    runnerOptions: { envPath: "" },
  });

  assert.equal(report.passed, false);
  assert.equal(report.blockers.some((check) => check.group === "production-audit" && check.status === "GAP"), true);
});
