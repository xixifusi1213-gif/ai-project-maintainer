import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  applyPolicy,
  loadPolicyBundle,
  validateExceptions,
} from "../ai-project-maintainer/scripts/lib/policy.mjs";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "apm-policy-"));
}

test("missing policy uses strict defaults", () => {
  const root = tempProject();
  const bundle = loadPolicyBundle(root);

  assert.equal(bundle.policy.mode, "strict");
  assert.equal(bundle.policy.fail_on.secrets, true);
  assert.equal(bundle.policy.reporting.code_scanning.include_coverage_gaps, false);
  assert.deepEqual(bundle.exceptions, []);
});

test("expired or incomplete exceptions are invalid", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(
    path.join(root, ".ai-maintainer", "exceptions.yml"),
    [
      "exceptions:",
      "  - id: missing-owner",
      "    check: semgrep",
      "    reason: false positive",
      "    expires: 2999-01-01",
      "  - id: expired",
      "    check: npm audit",
      "    reason: waiting on upstream",
      "    expires: 2000-01-01",
      "    owner: repo-owner",
      "",
    ].join("\n"),
  );

  const bundle = loadPolicyBundle(root);
  const validation = validateExceptions(bundle.exceptions, new Date("2026-06-28T00:00:00Z"));

  assert.equal(validation.invalid.length, 2);
  assert.match(validation.invalid[0].reason, /owner/);
  assert.match(validation.invalid[1].reason, /expired/);
});

test("valid exception downgrades only matching check", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(
    path.join(root, ".ai-maintainer", "exceptions.yml"),
    [
      "exceptions:",
      "  - id: semgrep-known-false-positive",
      "    check: semgrep static scan",
      "    reason: generated command runner allowlist is manually reviewed",
      "    expires: 2999-01-01",
      "    owner: repo-owner",
      "",
    ].join("\n"),
  );

  const bundle = loadPolicyBundle(root);
  const checks = [
    { name: "semgrep static scan", group: "sast", status: "fail", blocking: true },
    { name: "gitleaks secret scan", group: "secrets", status: "fail", blocking: true },
  ];
  const result = applyPolicy(checks, bundle, new Date("2026-06-28T00:00:00Z"));

  assert.equal(result.checks[0].blocking, false);
  assert.equal(result.checks[0].exception.id, "semgrep-known-false-positive");
  assert.equal(result.checks[1].blocking, true);
  assert.equal(result.invalidExceptions.length, 0);
});

test("valid exception can match by checkId", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(
    path.join(root, ".ai-maintainer", "exceptions.yml"),
    [
      "exceptions:",
      "  - id: package-audit-transitive-dev",
      "    check: package-audit",
      "    reason: transitive dev dependency, not shipped",
      "    expires: 2999-01-01",
      "    owner: repo-owner",
      "",
    ].join("\n"),
  );

  const bundle = loadPolicyBundle(root);
  const checks = [
    { checkId: "package-audit", name: "npm production audit", group: "dependencies", status: "fail", blocking: true },
  ];
  const result = applyPolicy(checks, bundle, new Date("2026-06-28T00:00:00Z"));

  assert.equal(result.checks[0].blocking, false);
  assert.equal(result.checks[0].exception.id, "package-audit-transitive-dev");
});

test("policy can downgrade a disabled blocking category", () => {
  const checks = [
    { name: "gitleaks secret scan", group: "secrets", status: "fail", blocking: true },
    { name: "package test", group: "tests", status: "fail", blocking: true },
  ];
  const result = applyPolicy(checks, {
    policy: {
      mode: "custom",
      fail_on: { secrets: false, tests: true },
      warn_on: {},
    },
    exceptions: [],
  });

  assert.equal(result.checks[0].blocking, false);
  assert.equal(result.checks[0].policyDowngrade, "fail_on.secrets=false");
  assert.equal(result.checks[1].blocking, true);
});

test("policy loads real YAML maps and lists", () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, ".ai-maintainer"));
  fs.writeFileSync(
    path.join(root, ".ai-maintainer", "policy.yml"),
    [
      "profile: oss",
      "mode: strict",
      "tool_groups:",
      "  - oss-hygiene",
      "checks:",
      "  gitleaks: block",
      "  semgrep: warn",
      "  scorecard: off",
      "fail_on:",
      "  secrets: true",
      "",
    ].join("\n"),
  );

  const bundle = loadPolicyBundle(root);

  assert.equal(bundle.policy.profile, "oss");
  assert.deepEqual(bundle.policy.tool_groups, ["oss-hygiene"]);
  assert.equal(bundle.policy.checks.semgrep, "warn");
  assert.equal(bundle.policy.checks.scorecard, "off");
});

test("policy check levels can warn or disable specific findings", () => {
  const checks = [
    { checkId: "semgrep", name: "semgrep static scan", group: "sast", status: "fail", blocking: true },
    { checkId: "gitleaks", name: "gitleaks secret scan", group: "secrets", status: "fail", blocking: true },
  ];
  const result = applyPolicy(checks, {
    policy: {
      mode: "strict",
      checks: { semgrep: "warn", gitleaks: "off" },
      fail_on: {},
      warn_on: {},
    },
    exceptions: [],
  });

  assert.equal(result.checks[0].blocking, false);
  assert.equal(result.checks[0].policyLevel, "warn");
  assert.equal(result.checks[1].blocking, false);
  assert.equal(result.checks[1].policyLevel, "off");
});
