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
