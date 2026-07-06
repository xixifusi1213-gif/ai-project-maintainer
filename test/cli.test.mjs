import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { parseCliArgs, runCli, runCliAsync } from "../ai-project-maintainer/scripts/cli.mjs";

test("package exposes ai-project-maintainer npm bin", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));

  assert.equal(pkg.name, "ai-project-maintainer");
  assert.equal(pkg.bin["ai-project-maintainer"], "ai-project-maintainer/scripts/cli.mjs");
});

test("CLI parses doctor, quickstart, init, audit, gate, agent-risk, repair-pack, and summary subcommands", () => {
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

  assert.deepEqual(parseCliArgs(["quickstart", "E:\\my-project"]), {
    command: "quickstart",
    args: { projectRoot: "E:\\my-project" },
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
      connectors: false,
      agentRisk: false,
      profile: "auto",
      outputPath: "reports/security-report.json",
    },
  });

  assert.deepEqual(parseCliArgs(["gate", "E:\\my-project", "--production", "--strict", "--profile", "database-prisma"]), {
    command: "gate",
    args: {
      projectRoot: "E:\\my-project",
      strict: true,
      release: false,
      noTests: false,
      jsonOnly: false,
      production: true,
      connectors: false,
      agentRisk: false,
      profile: "database-prisma",
      outputPath: null,
    },
  });

  assert.deepEqual(parseCliArgs(["gate", "E:\\my-project", "--agent-risk", "--strict"]), {
    command: "gate",
    args: {
      projectRoot: "E:\\my-project",
      strict: true,
      release: false,
      noTests: false,
      jsonOnly: false,
      production: false,
      connectors: false,
      agentRisk: true,
      profile: "auto",
      outputPath: null,
    },
  });

  assert.deepEqual(parseCliArgs(["agent-risk", "E:\\my-project", "--output", "reports/agent-risk-report.json"]), {
    command: "agent-risk",
    args: {
      projectRoot: "E:\\my-project",
      outputPath: "reports/agent-risk-report.json",
      jsonOnly: false,
    },
  });

  assert.deepEqual(parseCliArgs(["init-audit", "E:\\my-project"]), {
    command: "init-audit",
    args: { projectRoot: "E:\\my-project", wizard: false, dryRun: false, lang: "en", profile: "auto" },
  });

  assert.deepEqual(parseCliArgs(["init-audit", "E:\\my-project", "--wizard", "--dry-run", "--lang", "zh-CN", "--profile", "nextjs-web"]), {
    command: "init-audit",
    args: { projectRoot: "E:\\my-project", wizard: true, dryRun: true, lang: "zh-CN", profile: "nextjs-web" },
  });

  assert.deepEqual(parseCliArgs(["audit-plan", "E:\\my-project", "--output", "reports/audit-plan.json"]), {
    command: "audit-plan",
    args: { projectRoot: "E:\\my-project", outputPath: "reports/audit-plan.json", jsonOnly: false, profile: "auto" },
  });

  assert.deepEqual(parseCliArgs(["summary", "reports/security-report.json"]), {
    command: "summary",
    args: { reportPath: "reports/security-report.json" },
  });

  assert.deepEqual(parseCliArgs(["repair-pack", "reports/security-report.json", "--project", "E:\\my-project", "--output", "reports", "--json"]), {
    command: "repair-pack",
    args: {
      reportPath: "reports/security-report.json",
      projectRoot: "E:\\my-project",
      outputDir: "reports",
      jsonOnly: true,
    },
  });
});

test("CLI version flags print the package version", () => {
  const pkg = JSON.parse(fs.readFileSync(path.resolve("package.json"), "utf8"));
  assert.equal(pkg.version, "1.4.0");

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

test("CLI wizard dry-run previews intake without writing files", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-cli-wizard-dry-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "wizard-dry-run" }));
  let stdout = "";
  let stderr = "";
  const code = runCli(["init-audit", root, "--wizard", "--dry-run", "--lang", "zh-CN"], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
  });
  const result = JSON.parse(stdout);

  assert.equal(code, 0);
  assert.equal(stderr, "");
  assert.equal(result.dryRun, true);
  assert.match(result.summary, /项目画像摘要/);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer")), false);
});

test("CLI wizard reports non-interactive terminals clearly", async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-cli-wizard-non-tty-"));
  let stdout = "";
  let stderr = "";
  const code = await runCliAsync(["init-audit", root, "--wizard"], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
    input: { isTTY: false },
  });

  assert.equal(code, 2);
  assert.equal(stdout, "");
  assert.match(stderr, /interactive terminal/);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer", "project-profile.yml")), false);
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
