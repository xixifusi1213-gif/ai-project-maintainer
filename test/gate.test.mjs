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

test("Trivy scan uses built-in repository fallback when no mirror env is configured", () => {
  const root = tempProject();
  const calls = [];
  const report = runLocalGate(root, {
    strict: false,
    release: false,
    runnerOptions: {
      env: {},
      commandRunner: (command, args) => {
        calls.push({ command, args });
        if (command === "trivy" && args[0] === "fs") return { status: "pass", code: 0, stdout: "trivy clean" };
        if (args.includes("--version")) return { status: "pass", code: 0, stdout: `${command} 1.0.0` };
        return { status: "missing", code: null, stderr: `${command} missing` };
      },
    },
  });
  const trivyCall = calls.find((call) => call.command === "trivy" && call.args[0] === "fs");

  assert.equal(report.checks.find((check) => check.checkId === "trivy")?.status, "pass");
  assert.equal(trivyCall.args.includes("--db-repository"), false);
  assert.equal(trivyCall.args.includes("ghcr.io/aquasecurity/trivy-db:2"), false);
  assert.equal(trivyCall.args[trivyCall.args.indexOf("--timeout") + 1], "90s");
});

test("Trivy scan supports multiple configured DB repositories", () => {
  const root = tempProject();
  const calls = [];
  runLocalGate(root, {
    strict: false,
    release: false,
    runnerOptions: {
      env: {
        TRIVY_DB_REPOSITORY: "mirror.gcr.io/aquasec/trivy-db:2,public.ecr.aws/aquasecurity/trivy-db:2",
        TRIVY_JAVA_DB_REPOSITORY: "mirror.gcr.io/aquasec/trivy-java-db:1 ghcr.io/aquasecurity/trivy-java-db:1",
      },
      commandRunner: (command, args) => {
        calls.push({ command, args });
        if (command === "trivy" && args[0] === "fs") return { status: "pass", code: 0, stdout: "trivy clean" };
        if (args.includes("--version")) return { status: "pass", code: 0, stdout: `${command} 1.0.0` };
        return { status: "missing", code: null, stderr: `${command} missing` };
      },
    },
  });
  const trivyCall = calls.find((call) => call.command === "trivy" && call.args[0] === "fs");
  const dbRepositoryValues = trivyCall.args
    .map((arg, index) => (arg === "--db-repository" ? trivyCall.args[index + 1] : null))
    .filter(Boolean);
  const javaDbRepositoryValues = trivyCall.args
    .map((arg, index) => (arg === "--java-db-repository" ? trivyCall.args[index + 1] : null))
    .filter(Boolean);

  assert.deepEqual(dbRepositoryValues, ["mirror.gcr.io/aquasec/trivy-db:2", "public.ecr.aws/aquasecurity/trivy-db:2"]);
  assert.deepEqual(javaDbRepositoryValues, ["mirror.gcr.io/aquasec/trivy-java-db:1", "ghcr.io/aquasecurity/trivy-java-db:1"]);
});

test("non-strict mode retries Trivy with cached DB when online update fails", () => {
  const root = tempProject();
  const calls = [];
  const report = runLocalGate(root, {
    strict: false,
    release: false,
    runnerOptions: {
      commandRunner: (command, args) => {
        calls.push({ command, args });
        if (command === "trivy" && args[0] === "fs" && args.includes("--skip-db-update")) {
          return { status: "pass", code: 0, stdout: "cached db clean" };
        }
        if (command === "trivy" && args[0] === "fs") {
          return { status: "fail", code: 1, stderr: "failed to download vulnerability DB: context deadline exceeded" };
        }
        if (args.includes("--version")) return { status: "pass", code: 0, stdout: `${command} 1.0.0` };
        return { status: "missing", code: null, stderr: `${command} missing` };
      },
    },
  });
  const trivyScan = report.checks.find((check) => check.checkId === "trivy");
  const dbFreshness = report.checks.find((check) => check.checkId === "trivy-db-cache");

  assert.equal(calls.filter((call) => call.command === "trivy" && call.args[0] === "fs").length, 2);
  assert.equal(trivyScan.status, "pass");
  assert.equal(trivyScan.trivyDbFallback, "cache");
  assert.equal(dbFreshness.status, "gap");
  assert.equal(dbFreshness.blocking, false);
  assert.match(dbFreshness.summary, /local cached database/i);
  assert.equal(report.passed, true);
  assert.equal(report.overallStatus, "PASS_WITH_GAPS");
});

test("strict mode blocks cached Trivy DB fallback as incomplete release evidence", () => {
  const root = tempProject();
  const calls = [];
  const report = runLocalGate(root, {
    strict: true,
    release: false,
    runnerOptions: {
      commandRunner: (command, args) => {
        calls.push({ command, args });
        if (command === "trivy" && args[0] === "fs" && args.includes("--skip-db-update")) {
          return { status: "pass", code: 0, stdout: "cached db clean" };
        }
        if (command === "trivy" && args[0] === "fs") {
          return { status: "fail", code: 1, stderr: "failed to download vulnerability DB: context deadline exceeded" };
        }
        if (command === "gitleaks" || command === "semgrep") return { status: "pass", code: 0, stdout: `${command} clean` };
        if (args.includes("--version")) return { status: "pass", code: 0, stdout: `${command} 1.0.0` };
        return { status: "missing", code: null, stderr: `${command} missing` };
      },
    },
  });
  const dbFreshnessBlocker = report.blockers.find((check) => check.checkId === "trivy-db-cache");

  assert.equal(report.passed, false);
  assert.equal(dbFreshnessBlocker?.status, "gap");
  assert.match(dbFreshnessBlocker?.summary || "", /online database update failed/i);
  assert.doesNotMatch(dbFreshnessBlocker?.summary || "", /vulnerabilities (were )?(found|detected)/i);
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
