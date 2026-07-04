import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { fileURLToPath, pathToFileURL } from "node:url";
import YAML from "yaml";

import { createBeforeState } from "../examples/demo-ai-app/scripts/create-before-state.mjs";
import { runDemoGate } from "../examples/demo-ai-app/scripts/run-demo-gate.mjs";
import { initProject } from "../ai-project-maintainer/scripts/init-project.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const demoRoot = path.join(repoRoot, "examples", "demo-ai-app");

function run(command, args, options = {}) {
  return spawnSync(command, args, {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    timeout: options.timeoutMs || 120_000,
  });
}

function normalized(value) {
  return path.resolve(value).toLowerCase();
}

test("demo app business tests pass", () => {
  const result = run(process.execPath, ["--test", "test/order-risk.test.mjs"], { cwd: demoRoot });
  assert.equal(result.status, 0, `${result.error?.message || ""}\n${result.stdout}\n${result.stderr}`);
});

test("demo before-state generator writes only under temp and creates broken behavior", async () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "apm-before-test-"));
  const outputPath = path.join(parent, "before");
  const { destination } = createBeforeState({ outputPath });

  assert.equal(normalized(destination).startsWith(normalized(os.tmpdir())), true);
  assert.equal(fs.existsSync(path.join(destination, "src", "order-risk.js")), true);
  assert.equal(fs.existsSync(path.join(demoRoot, "src", "order-risk.js")), true);

  const beforeModuleUrl = `${pathToFileURL(path.join(destination, "src", "order-risk.js")).href}?case=${Date.now()}`;
  const { canReleaseOrder, quoteOrder } = await import(beforeModuleUrl);
  assert.equal(quoteOrder({ subtotalCents: 99600, shippingTier: "standard" }).needsManualReview, false);
  assert.equal(canReleaseOrder({ paid: true, stockAvailable: false, flagged: false }), true);
});

test("demo production gate passes with mocked scanner tools and writes reports", () => {
  const parent = fs.mkdtempSync(path.join(os.tmpdir(), "apm-demo-report-"));
  const outputPath = path.join(parent, "security-report.json");
  const { report } = runDemoGate({ outputPath });

  assert.equal(report.passed, true);
  assert.equal(report.blockers.length, 0);
  assert.equal(report.coverageGaps.some((gap) => gap.name === "production audit: Error monitoring"), true);
  assert.equal(fs.existsSync(outputPath), true);
  assert.equal(fs.existsSync(path.join(parent, "security-report.md")), true);
  assert.equal(fs.existsSync(path.join(parent, "security-report.sarif")), true);
  assert.equal(fs.existsSync(path.join(parent, "sbom.cdx.json")), true);
});

test("security workflow is parseable and includes the heavy gate", () => {
  const workflowText = fs.readFileSync(path.join(repoRoot, ".github", "workflows", "security.yml"), "utf8");
  const workflow = YAML.parse(workflowText);
  const steps = workflow.jobs.security.steps.map((step) => step.name);

  assert.equal(workflow.name, "Security");
  assert.equal(workflow.permissions["security-events"], "write");
  assert.equal(steps.includes("Install scanner CLIs"), true);
  assert.equal(steps.includes("Run production security gate"), true);
  assert.doesNotMatch(workflowText, /@latest/);
  assert.doesNotMatch(workflowText, /pip install --user semgrep zizmor checkov/);
  assert.match(workflowText, /GITLEAKS_VERSION: v8\.30\.0/);
  assert.match(workflowText, /TRIVY_VERSION: v0\.71\.2/);
});

test("README first-run links are readable and not mojibake", () => {
  const readme = fs.readFileSync(path.resolve("README.md"), "utf8");

  assert.doesNotMatch(readme, /涓|枃|路|·/);
  assert.match(readme, /\[See the demo\]\(docs\/DEMO\.md\)/);
  assert.match(readme, /\[Real OSS cases\]\(docs\/CASE-STUDIES\.md\)/);
  assert.match(readme, /\[Chinese demo\]\(docs\/DEMO\.zh-CN\.md\)/);
  assert.match(readme, /\[Production evidence connectors\]\(docs\/CONNECTORS\.md\)/);
  assert.match(readme, /30-Second Quickstart/);
  assert.match(readme, /PASS_WITH_GAPS/);
  assert.match(readme, /Optional Production Evidence Connectors/);
});

test("generated security workflow pins scanner versions", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-init-pinned-workflow-"));
  initProject(root, { profile: "oss", ci: "github" });
  const workflowText = fs.readFileSync(path.join(root, ".github", "workflows", "security-gate.yml"), "utf8");

  assert.doesNotMatch(workflowText, /@latest/);
  assert.doesNotMatch(workflowText, /pip install --user semgrep zizmor checkov/);
  assert.match(workflowText, /GITLEAKS_VERSION: v8\.30\.0/);
  assert.match(workflowText, /OSV_SCANNER_VERSION: v2\.4\.0/);
});

test("npm package includes the runnable demo project", () => {
  const packageJson = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  assert.equal(packageJson.version, "0.7.0");
  assert.equal(packageJson.files.includes("assets/"), true);
  assert.equal(packageJson.files.includes("examples/demo-ai-app/scripts/"), true);
  assert.equal(packageJson.files.includes("examples/demo-ai-app/src/"), true);
  assert.equal(packageJson.files.includes("examples/demo-ai-app/test/"), true);
  assert.equal(packageJson.files.includes("examples/oss-case-studies/"), true);
});
