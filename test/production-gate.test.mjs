import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initAudit } from "../ai-project-maintainer/scripts/init-audit.mjs";
import { runQuickstart } from "../ai-project-maintainer/scripts/quickstart.mjs";
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

test("production strict gate blocks missing data and authorization model for auth projects", () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "production-api",
    dependencies: { express: "latest" },
  }));
  initAudit(root);
  fs.writeFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), [
    "schema_version: 1",
    "project:",
    "  profile: node-api",
    "  production: true",
    "risk:",
    "  handles_auth: true",
    "  handles_sensitive_data: true",
    "  has_admin_roles: true",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, ".ai-maintainer", "risk-policy.yml"), [
    "schema_version: 1",
    "production:",
    "  block_on_coverage_gaps: true",
    "  block_on_user_decisions: true",
    "  require_intake: true",
    "",
  ].join("\n"));

  const report = runLocalGate(root, {
    strict: true,
    release: true,
    production: true,
    runnerOptions: { envPath: "" },
  });

  assert.equal(report.passed, false);
  assert.equal(report.blockers.some((check) => check.checkId === "production-data-boundaries"), true);
  assert.equal(report.blockers.some((check) => check.checkId === "production-authz-matrix"), true);
  assert.equal(report.blockers.find((check) => check.checkId === "production-data-boundaries").group, "data-exposure");
  assert.equal(report.blockers.find((check) => check.checkId === "production-authz-matrix").group, "auth-boundary");
  assert.match(report.blockers.find((check) => check.checkId === "production-data-boundaries").summary, /evidence is incomplete/i);
});

test("quickstart reports production model gaps without creating a repair pack", () => {
  const root = tempProject();
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "quickstart-production-api",
    dependencies: { express: "latest" },
  }));
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(path.join(root, ".ai-maintainer", "project-profile.yml"), [
    "schema_version: 1",
    "project:",
    "  profile: node-api",
    "risk:",
    "  handles_auth: true",
    "  handles_sensitive_data: true",
    "",
  ].join("\n"));

  const result = runQuickstart(root, {
    runnerOptions: {
      commandRunner: (command, args) => {
        if (command === "npm" && args[0] === "audit") return { status: "pass", code: 0, stdout: "{}" };
        if (command === "trivy" && args[0] === "fs") return { status: "pass", code: 0, stdout: "clean" };
        if (command === "semgrep" && args[0] === "scan") return { status: "pass", code: 0, stdout: "{}" };
        if (args.includes("--version")) return { status: "pass", code: 0, stdout: `${command} 1.0.0` };
        return { status: "missing", code: null, stderr: `${command} missing` };
      },
    },
  });

  const markdown = fs.readFileSync(path.join(root, "reports", "quickstart-summary.md"), "utf8");

  assert.equal(result.summary.status, "PASS_WITH_GAPS");
  assert.equal(result.summary.counts.blockers, 0);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-repair-pack")), false);
  assert.match(markdown, /data-boundaries\.yml/);
  assert.match(markdown, /authz-matrix\.yml/);
});

test("production strict gate blocks high-risk business flows without idempotency evidence", () => {
  const root = tempProject();
  initAudit(root);
  fs.writeFileSync(path.join(root, ".ai-maintainer", "business-flows.yml"), [
    "schema_version: 1",
    "business_flows:",
    "  - id: checkout",
    "    name: Checkout",
    "    criticality: high",
    "    side_effects: [payment, order, webhook]",
    "    abuse_controls: []",
    "    idempotency_required: true",
    "    replay_safe: false",
    "    tests: []",
    "",
  ].join("\n"));
  fs.writeFileSync(path.join(root, ".ai-maintainer", "risk-policy.yml"), "production:\n  block_on_coverage_gaps: true\n");

  const report = runLocalGate(root, {
    strict: true,
    release: true,
    production: true,
    runnerOptions: { envPath: "" },
  });

  assert.equal(report.passed, false);
  assert.equal(report.blockers.some((check) => check.checkId === "production-business-flow-idempotency"), true);
  assert.equal(report.blockers.find((check) => check.checkId === "production-business-flow-idempotency").group, "business-flow-safety");
});
