import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runLocalGate } from "../ai-project-maintainer/scripts/run-local-gate.mjs";

function tempProject() {
  return fs.mkdtempSync(path.join(os.tmpdir(), "apm-gate-"));
}

function fakeTool(dir, name, body) {
  if (process.platform === "win32") {
    fs.writeFileSync(path.join(dir, `${name}.cmd`), `@echo off\r\n${body}\r\n`);
    return;
  }
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/usr/bin/env sh\n${body}\n`);
  fs.chmodSync(file, 0o755);
}

test("non-strict mode reports missing tools as coverage gaps", () => {
  const root = tempProject();
  const report = runLocalGate(root, {
    strict: false,
    release: false,
    runnerOptions: { envPath: "" },
  });

  assert.equal(report.passed, true);
  assert.equal(report.coverageGaps.some((gap) => gap.name === "gitleaks secret scan"), true);
});

test("strict mode blocks missing required tools", () => {
  const root = tempProject();
  const report = runLocalGate(root, {
    strict: true,
    release: false,
    runnerOptions: { envPath: "" },
  });

  assert.equal(report.passed, false);
  assert.equal(report.blockers.some((check) => check.status === "missing"), true);
});

test("non-strict mode reports Trivy DB errors as coverage gaps", () => {
  const root = tempProject();
  const tools = fs.mkdtempSync(path.join(os.tmpdir(), "apm-tools-"));
  fakeTool(
    tools,
    "trivy",
    process.platform === "win32"
      ? "echo failed to download vulnerability DB 1>&2\r\nexit /b 1"
      : "echo failed to download vulnerability DB >&2\nexit 1",
  );

  const report = runLocalGate(root, {
    strict: false,
    release: false,
    runnerOptions: { envPath: tools },
  });

  assert.equal(report.passed, true);
  assert.equal(report.coverageGaps.some((gap) => gap.name === "trivy filesystem scan"), true);
});

test("strict mode blocks Trivy DB errors as incomplete evidence, not vulnerability findings", () => {
  const root = tempProject();
  const tools = fs.mkdtempSync(path.join(os.tmpdir(), "apm-tools-"));
  fakeTool(tools, "gitleaks", "echo gitleaks clean");
  fakeTool(
    tools,
    "trivy",
    process.platform === "win32"
      ? "echo failed to download vulnerability DB 1>&2\r\nexit /b 1"
      : "echo failed to download vulnerability DB >&2\nexit 1",
  );
  fakeTool(tools, "semgrep", "echo semgrep clean");

  const report = runLocalGate(root, {
    strict: true,
    release: false,
    runnerOptions: { envPath: tools },
  });
  const trivyBlocker = report.blockers.find((check) => check.checkId === "trivy");

  assert.equal(report.passed, false);
  assert.equal(trivyBlocker?.status, "error");
  assert.equal(trivyBlocker?.coverageGap, true);
  assert.match(trivyBlocker?.summary || "", /vulnerability database was unavailable/i);
  assert.match(trivyBlocker?.summary || "", /coverage is incomplete/i);
  assert.doesNotMatch(trivyBlocker?.summary || "", /vulnerabilities (were )?(found|detected)/i);
});
