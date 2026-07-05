#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runLocalGate } from "../../../ai-project-maintainer/scripts/run-local-gate.mjs";
import { toMarkdown } from "../../../ai-project-maintainer/scripts/lib/report.mjs";

export function writeMockTool(toolsDir) {
  const scriptPath = path.join(toolsDir, "mock-tool.mjs");
  fs.writeFileSync(
    scriptPath,
    `#!/usr/bin/env node
import fs from "node:fs";

const [, , tool, ...args] = process.argv;
if (args.includes("--version")) {
  console.log(\`\${tool} demo 0.0.0\`);
  process.exit(0);
}

if (tool === "syft") {
  const outputArg = args.find((arg) => arg.startsWith("cyclonedx-json="));
  if (outputArg) {
    fs.writeFileSync(outputArg.slice("cyclonedx-json=".length), JSON.stringify({
      bomFormat: "CycloneDX",
      specVersion: "1.5",
      version: 1,
      metadata: { component: { type: "application", name: "demo-ai-app" } },
      components: [],
    }, null, 2));
  }
}

if (tool === "scorecard") {
  console.log(JSON.stringify({ score: 8.5, checks: [] }));
}

process.exit(0);
`,
  );

  const tools = [
    "actionlint",
    "checkov",
    "gitleaks",
    "grype",
    "mega-linter-runner",
    "osv-scanner",
    "pre-commit",
    "scorecard",
    "semgrep",
    "squawk",
    "syft",
    "trivy",
    "zizmor",
  ];

  for (const tool of tools) {
    if (process.platform === "win32") {
      fs.writeFileSync(path.join(toolsDir, `${tool}.cmd`), `@echo off\r\nnode "%~dp0mock-tool.mjs" ${tool} %*\r\n`);
    } else {
      const shim = path.join(toolsDir, tool);
      fs.writeFileSync(shim, `#!/usr/bin/env sh\nnode "$(dirname "$0")/mock-tool.mjs" ${tool} "$@"\n`);
      fs.chmodSync(shim, 0o755);
    }
  }
}

export function runDemoGate({ outputPath = null } = {}) {
  const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const reportsDir = path.join(demoRoot, "reports");
  const toolsDir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-demo-tools-"));
  writeMockTool(toolsDir);

  const report = runLocalGate(demoRoot, {
    strict: true,
    release: true,
    production: true,
    outputPath: outputPath || path.join(reportsDir, "security-report.json"),
    writeReports: true,
    runnerOptions: {
      envPath: `${toolsDir}${path.delimiter}${process.env.PATH || ""}`,
    },
  });

  return { report, toolsDir };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const { report } = runDemoGate();
  console.log(toMarkdown(report));
  process.exit(report.passed ? 0 : 1);
}
