import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseCliArgs, runCli } from "../ai-project-maintainer/scripts/cli.mjs";

test("package exposes ai-project-maintainer npm bin", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));

  assert.equal(pkg.name, "ai-project-maintainer");
  assert.equal(pkg.bin["ai-project-maintainer"], "ai-project-maintainer/scripts/cli.mjs");
});

test("CLI parses doctor, init, audit, gate, and summary subcommands", () => {
  assert.deepEqual(parseCliArgs(["--version"]), {
    command: "version",
    args: {},
  });

  assert.deepEqual(parseCliArgs(["-v"]), {
    command: "version",
    args: {},
  });

  assert.deepEqual(parseCliArgs(["doctor"]), {
    command: "doctor",
    args: { jsonOnly: false, checkTrivyDb: true },
  });

  assert.deepEqual(parseCliArgs(["init", "E:\\my-project", "--profile", "oss", "--ci", "github"]), {
    command: "init",
    args: { projectRoot: "E:\\my-project", profile: "oss", ci: "github", preCommit: false },
  });

  assert.deepEqual(parseCliArgs(["gate", "E:\\my-project", "--strict", "--release", "--output", "reports/security-report.json"]), {
    command: "gate",
    args: {
      projectRoot: "E:\\my-project",
      strict: true,
      release: true,
      noTests: false,
      jsonOnly: false,
      production: false,
      outputPath: "reports/security-report.json",
    },
  });

  assert.deepEqual(parseCliArgs(["gate", "E:\\my-project", "--production", "--strict"]), {
    command: "gate",
    args: {
      projectRoot: "E:\\my-project",
      strict: true,
      release: false,
      noTests: false,
      jsonOnly: false,
      production: true,
      outputPath: null,
    },
  });

  assert.deepEqual(parseCliArgs(["init-audit", "E:\\my-project"]), {
    command: "init-audit",
    args: { projectRoot: "E:\\my-project" },
  });

  assert.deepEqual(parseCliArgs(["audit-plan", "E:\\my-project", "--output", "reports/audit-plan.json"]), {
    command: "audit-plan",
    args: { projectRoot: "E:\\my-project", outputPath: "reports/audit-plan.json", jsonOnly: false },
  });

  assert.deepEqual(parseCliArgs(["summary", "reports/security-report.json"]), {
    command: "summary",
    args: { reportPath: "reports/security-report.json" },
  });
});

test("CLI version flags print the package version", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  assert.equal(pkg.version, "0.4.2");

  for (const flag of ["--version", "-v"]) {
    let stdout = "";
    let stderr = "";
    const code = runCli([flag], {
      stdout: { write: (chunk) => { stdout += chunk; } },
      stderr: { write: (chunk) => { stderr += chunk; } },
    });

    assert.equal(code, 0);
    assert.equal(stdout.trim(), pkg.version);
    assert.equal(stderr, "");
  }
});

test("unknown commands still print usage and fail with code 2", () => {
  let stdout = "";
  let stderr = "";
  const code = runCli(["unknown-command"], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
  });

  assert.equal(code, 2);
  assert.equal(stdout, "");
  assert.match(stderr, /Usage: ai-project-maintainer/);
});

test("audit-plan command exits successfully even when the plan contains coverage gaps", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-cli-plan-"));
  let stdout = "";
  let stderr = "";
  const code = runCli(["audit-plan", root], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
  });

  assert.equal(code, 0);
  assert.match(stdout, /coverageGaps/);
  assert.equal(stderr, "");
});
