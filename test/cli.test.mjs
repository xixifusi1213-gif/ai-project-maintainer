import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import test from "node:test";

import { parseCliArgs } from "../ai-project-maintainer/scripts/cli.mjs";

test("package exposes ai-project-maintainer npm bin", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));

  assert.equal(pkg.name, "ai-project-maintainer");
  assert.equal(pkg.bin["ai-project-maintainer"], "ai-project-maintainer/scripts/cli.mjs");
});

test("CLI parses doctor, init, gate, and summary subcommands", () => {
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
      outputPath: "reports/security-report.json",
    },
  });

  assert.deepEqual(parseCliArgs(["summary", "reports/security-report.json"]), {
    command: "summary",
    args: { reportPath: "reports/security-report.json" },
  });
});
