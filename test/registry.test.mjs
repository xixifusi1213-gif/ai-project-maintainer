import assert from "node:assert/strict";
import test from "node:test";

import {
  getBuiltinCheckRegistry,
  resolveEnabledChecks,
} from "../ai-project-maintainer/scripts/lib/check-registry.mjs";

test("builtin registry exposes plugin-shaped check definitions", () => {
  const registry = getBuiltinCheckRegistry();
  const gitleaks = registry.find((check) => check.id === "gitleaks");
  const scorecard = registry.find((check) => check.id === "scorecard");
  const osv = registry.find((check) => check.id === "osv-scanner");

  assert.equal(typeof gitleaks.detect, "function");
  assert.equal(typeof gitleaks.run, "function");
  assert.equal(gitleaks.group, "secrets");
  assert.deepEqual(gitleaks.requiredTools, ["gitleaks"]);
  assert.equal(osv.group, "dependencies");
  assert.deepEqual(osv.requiredTools, ["osv-scanner"]);
  assert.equal(scorecard.group, "oss-hygiene");
  assert.equal(scorecard.defaultLevel, "warn");
});

test("resolveEnabledChecks applies block, warn, and off policy levels", () => {
  const registry = getBuiltinCheckRegistry();
  const enabled = resolveEnabledChecks(registry, {
    profile: "oss",
    checks: {
      gitleaks: "block",
      semgrep: "warn",
      scorecard: "off",
    },
  });

  assert.equal(enabled.find((check) => check.id === "gitleaks").level, "block");
  assert.equal(enabled.find((check) => check.id === "semgrep").level, "warn");
  assert.equal(enabled.some((check) => check.id === "scorecard"), false);
});
