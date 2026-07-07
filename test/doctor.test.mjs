import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runDoctor } from "../ai-project-maintainer/scripts/doctor.mjs";
import { formatMissingYamlDependencyError } from "../ai-project-maintainer/scripts/lib/yaml-support.mjs";

function fakeTool(dir, name) {
  if (process.platform === "win32") {
    fs.writeFileSync(path.join(dir, `${name}.cmd`), `@echo off\r\necho ${name} 1.0.0\r\n`);
    return;
  }
  const file = path.join(dir, name);
  fs.writeFileSync(file, `#!/usr/bin/env sh\necho ${name} 1.0.0\n`);
  fs.chmodSync(file, 0o755);
}

test("doctor reports missing scanner tools when PATH is empty", () => {
  const report = runDoctor({
    checkTrivyDb: false,
    runnerOptions: { envPath: "" },
  });

  assert.equal(report.required.find((tool) => tool.name === "gitleaks").status, "missing");
  assert.equal(report.required.find((tool) => tool.name === "trivy").status, "missing");
  assert.equal(report.required.find((tool) => tool.name === "semgrep").status, "missing");
  assert.equal(report.passed, false);
});

test("doctor explains when Trivy DB check is intentionally skipped", () => {
  const tools = fs.mkdtempSync(path.join(os.tmpdir(), "apm-doctor-tools-"));
  for (const tool of ["gitleaks", "trivy", "semgrep"]) fakeTool(tools, tool);

  const report = runDoctor({
    checkTrivyDb: false,
    runnerOptions: { envPath: tools },
  });

  assert.equal(report.trivyDb.status, "skipped");
  assert.match(report.trivyDb.summary, /disabled/);
});

test("local dependency guidance for missing yaml points users to npx or dependency install", () => {
  const error = formatMissingYamlDependencyError(new Error("Cannot find module 'yaml'"));

  assert.match(error.message, /local ai-project-maintainer skill/i);
  assert.match(error.message, /yaml dependency/i);
  assert.match(error.message, /npx ai-project-maintainer/i);
  assert.match(error.message, /npm install/i);
});
