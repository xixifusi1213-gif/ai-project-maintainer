import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCli } from "../ai-project-maintainer/scripts/cli.mjs";
import { runQuickstart } from "../ai-project-maintainer/scripts/quickstart.mjs";

function tempProject(options = {}) {
  const { lockfile = true } = options;
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-quickstart-"));
  fs.mkdirSync(path.join(root, "app"), { recursive: true });
  fs.writeFileSync(path.join(root, "app", "page.tsx"), "export default function Page() { return null; }\n");
  fs.writeFileSync(path.join(root, "README.md"), "# quickstart fixture\n");
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({
    name: "quickstart-fixture",
    scripts: {
      test: "node test.js",
      "test:e2e": "node e2e.js",
      build: "next build",
    },
    dependencies: {
      next: "15.0.0",
    },
  }, null, 2));
  if (lockfile) {
    fs.writeFileSync(path.join(root, "package-lock.json"), JSON.stringify({
      name: "quickstart-fixture",
      lockfileVersion: 3,
      packages: {
        "": {
          name: "quickstart-fixture",
          dependencies: {
            next: "15.0.0",
          },
        },
      },
    }, null, 2));
  }
  return root;
}

function listFiles(root) {
  const out = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      const relative = path.relative(root, full).replaceAll(path.sep, "/");
      if (entry.isDirectory()) {
        walk(full);
      } else if (entry.isFile()) {
        out.push(relative);
      }
    }
  }
  walk(root);
  return out.sort();
}

function quickstartRunner(calls = [], auditResult = { status: "fail", code: 1, stderr: "simulated production dependency blocker" }) {
  return (command, args) => {
    calls.push({ command, args });
    if (command === "npm" && args[0] === "audit") {
      return auditResult;
    }
    if (command === "npm" && (args[0] === "test" || args[1] === "test:e2e" || args[1] === "build")) {
      return { status: "fail", code: 1, stderr: "project scripts should be skipped by quickstart" };
    }
    if (args.includes("--version")) {
      return { status: "pass", code: 0, stdout: `${command} 1.0.0` };
    }
    return { status: "missing", code: null, stderr: `${command} missing in test fixture` };
  };
}

test("quickstart treats npm audit ENOLOCK without a lockfile as a setup gap", () => {
  const root = tempProject({ lockfile: false });
  let stdout = "";
  let stderr = "";
  const code = runCli(["quickstart", root], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
    runnerOptions: {
      commandRunner: quickstartRunner([], {
        status: "fail",
        code: 1,
        stderr: "npm ERR! code ENOLOCK\nnpm ERR! audit This command requires an existing lockfile.",
      }),
    },
  });
  const summary = JSON.parse(fs.readFileSync(path.join(root, "reports", "quickstart-summary.json"), "utf8"));
  const report = JSON.parse(fs.readFileSync(path.join(root, "reports", "quickstart-security-report.json"), "utf8"));
  const markdown = fs.readFileSync(path.join(root, "reports", "quickstart-summary.md"), "utf8");

  assert.equal(code, 0);
  assert.equal(stderr, "");
  assert.match(stdout, /PASS_WITH_GAPS/);
  assert.equal(summary.status, "PASS_WITH_GAPS");
  assert.equal(summary.counts.blockers, 0);
  assert.equal(report.blockerCount, 0);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-repair-pack")), false);
  assert.equal(report.coverageGaps.some((gap) => gap.checkId === "package-audit"), true);
  assert.match(markdown, /package-lock\.json/);
  assert.match(markdown, /npm install --package-lock-only/);
});

test("quickstart completes with cached Trivy DB fallback and no repair pack", () => {
  const root = tempProject();
  const calls = [];
  const result = runQuickstart(root, {
    runnerOptions: {
      env: {},
      commandRunner: (command, args) => {
        calls.push({ command, args });
        if (command === "npm" && args[0] === "audit") return { status: "pass", code: 0, stdout: "{}" };
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
  const markdown = fs.readFileSync(path.join(root, "reports", "quickstart-summary.md"), "utf8");
  const report = JSON.parse(fs.readFileSync(path.join(root, "reports", "quickstart-security-report.json"), "utf8"));
  const firstTrivyCall = calls.find((call) => call.command === "trivy" && call.args[0] === "fs");

  assert.equal(result.summary.status, "PASS_WITH_GAPS");
  assert.equal(result.summary.counts.blockers, 0);
  assert.equal(report.blockerCount, 0);
  assert.equal(report.checks.find((check) => check.checkId === "trivy")?.trivyDbFallback, "cache");
  assert.equal(report.coverageGaps.some((gap) => gap.checkId === "trivy-db-cache"), true);
  assert.equal(calls.filter((call) => call.command === "trivy" && call.args[0] === "fs").length, 2);
  assert.equal(firstTrivyCall.args[firstTrivyCall.args.indexOf("--timeout") + 1], "45s");
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-repair-pack")), false);
  assert.match(markdown, /local cached database/i);
});

test("quickstart writes only report outputs and creates a repair pack for blockers", () => {
  const root = tempProject();
  const before = new Set(listFiles(root));
  const calls = [];
  const result = runQuickstart(root, {
    runnerOptions: { commandRunner: quickstartRunner(calls) },
  });
  const after = listFiles(root);
  const created = after.filter((file) => !before.has(file));

  assert.equal(created.length > 0, true);
  assert.equal(created.every((file) => file.startsWith("reports/")), true);
  assert.equal(fs.existsSync(path.join(root, ".ai-maintainer")), false);
  assert.equal(fs.existsSync(path.join(root, ".github")), false);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-summary.md")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-summary.json")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-security-report.json")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-security-report.md")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-security-report.sarif")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-repair-pack", "fix-plan.md")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-repair-pack", "agent-tasks.json")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-repair-pack", "codex-tasks.json")), true);
  assert.equal(result.summary.files.repairPackDir.endsWith(path.join("reports", "quickstart-repair-pack")), true);
});

test("quickstart uses lightweight gate settings and skips project test scripts", () => {
  const root = tempProject();
  const calls = [];
  const result = runQuickstart(root, {
    runnerOptions: { commandRunner: quickstartRunner(calls) },
  });

  assert.equal(result.summary.mode.profile, "auto");
  assert.equal(result.summary.mode.agentRisk, true);
  assert.equal(result.summary.mode.strict, false);
  assert.equal(result.summary.mode.release, false);
  assert.equal(result.summary.mode.production, false);
  assert.equal(result.summary.mode.connectors, false);
  assert.equal(result.summary.mode.noTests, true);
  assert.equal(calls.some(({ command, args }) => command === "npm" && args[0] === "test"), false);
  assert.equal(calls.some(({ command, args }) => command === "npm" && args[1] === "test:e2e"), false);
  assert.equal(calls.some(({ command, args }) => command === "npm" && args[1] === "build"), false);
});

test("quickstart summary names profile, skipped work, AI handoff files, and full gate command", () => {
  const root = tempProject();
  const result = runQuickstart(root, {
    runnerOptions: { commandRunner: quickstartRunner() },
  });
  const markdown = fs.readFileSync(path.join(root, "reports", "quickstart-summary.md"), "utf8");
  const summary = JSON.parse(fs.readFileSync(path.join(root, "reports", "quickstart-summary.json"), "utf8"));

  assert.equal(summary.schemaVersion, 1);
  assert.equal(summary.profile.id, "nextjs-web");
  assert.equal(summary.counts.blockers > 0, true);
  assert.match(markdown, /Profile: nextjs-web/);
  assert.match(markdown, /Tests skipped/);
  assert.match(markdown, /quickstart-repair-pack/);
  assert.match(markdown, /Cursor/);
  assert.match(markdown, /Claude Code/);
  assert.match(markdown, /Cline/);
  assert.match(markdown, /Codex/);
  assert.match(markdown, /npx ai-project-maintainer gate/);
  assert.match(result.summary.nextCommands.fullGate, /--production --agent-risk --strict --release/);
});

test("CLI quickstart returns success when blocker reports are generated", () => {
  const root = tempProject();
  let stdout = "";
  let stderr = "";
  const code = runCli(["quickstart", root], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
    runnerOptions: { commandRunner: quickstartRunner() },
  });

  assert.equal(code, 0);
  assert.equal(stderr, "");
  assert.match(stdout, /Quickstart/);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-summary.md")), true);
  assert.equal(fs.existsSync(path.join(root, "reports", "quickstart-repair-pack", "codex-tasks.json")), true);
});
