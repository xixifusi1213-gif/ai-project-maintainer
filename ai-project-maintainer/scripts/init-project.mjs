#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const policyTemplate = `profile: oss
mode: strict
checks:
  gitleaks: block
  trivy: block
  semgrep: block
  osv-scanner: warn
  syft: warn
  grype: warn
  actionlint: block
  zizmor: warn
  checkov: warn
  trivy-config: warn
  scorecard: warn
  megalinter: warn
  pre-commit: warn
  agent-risk: block
fail_on:
  tests: true
  secrets: true
  dependency_high_or_critical: true
  semgrep_blocking: true
  trivy_unavailable: true
  electron_dangerous_settings: true
  ci_security_high: true
  agent_high_risk: true
warn_on:
  dev_dependency_vulnerabilities: true
  missing_optional_tools: true
reporting:
  code_scanning:
    include_coverage_gaps: false
`;

const exceptionsTemplate = `exceptions:
  - id: "example-dev-only-vuln"
    check: "package-audit"
    reason: "dev-only transitive dependency, not shipped"
    expires: "2026-09-01"
    owner: "repo-owner"
`;

const workflowTemplate = `name: Security Gate

on:
  pull_request:
  push:
    branches:
      - main
      - master

permissions:
  contents: read
  security-events: write
  actions: read

jobs:
  security-gate:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout project
        uses: actions/checkout@v4

      - name: Setup Node
        uses: actions/setup-node@v4
        with:
          node-version: "22"

      - name: Setup Go for scanner CLIs
        uses: actions/setup-go@v5
        with:
          go-version: "1.23"

      - name: Install project dependencies
        shell: bash
        run: |
          set -euo pipefail
          if [ -f pnpm-lock.yaml ]; then
            corepack enable
            pnpm install --frozen-lockfile
          elif [ -f yarn.lock ]; then
            corepack enable
            yarn install --immutable || yarn install --frozen-lockfile
          elif [ -f bun.lock ] || [ -f bun.lockb ]; then
            curl -fsSL https://bun.sh/install | bash
            echo "$HOME/.bun/bin" >> "$GITHUB_PATH"
            "$HOME/.bun/bin/bun" install --frozen-lockfile
          elif [ -f package-lock.json ]; then
            npm ci
          elif [ -f package.json ]; then
            npm install
          fi

      - name: Install security scanners
        shell: bash
        env:
          GITLEAKS_VERSION: v8.30.0
          TRIVY_VERSION: v0.71.2
          SEMGREP_VERSION: 1.168.0
          ZIZMOR_VERSION: 1.26.1
          OSV_SCANNER_VERSION: v2.4.0
          ACTIONLINT_VERSION: v1.7.12
          SYFT_VERSION: v1.46.0
          GRYPE_VERSION: v0.111.1
          CHECKOV_VERSION: 3.3.2
          SCORECARD_VERSION: v5.3.0
        run: |
          set -euo pipefail
          mkdir -p "$HOME/.local/bin"
          echo "$HOME/.local/bin" >> "$GITHUB_PATH"
          echo "$HOME/go/bin" >> "$GITHUB_PATH"
          python -m pip install --user "semgrep==$SEMGREP_VERSION" "zizmor==$ZIZMOR_VERSION" "checkov==$CHECKOV_VERSION"
          go install "github.com/zricethezav/gitleaks/v8@$GITLEAKS_VERSION"
          go install "github.com/google/osv-scanner/v2/cmd/osv-scanner@$OSV_SCANNER_VERSION"
          go install "github.com/rhysd/actionlint/cmd/actionlint@$ACTIONLINT_VERSION"
          go install "github.com/anchore/syft/cmd/syft@$SYFT_VERSION"
          go install "github.com/anchore/grype/cmd/grype@$GRYPE_VERSION"
          go install "github.com/ossf/scorecard/v5@$SCORECARD_VERSION"
          curl -sSfL "https://raw.githubusercontent.com/aquasecurity/trivy/$TRIVY_VERSION/contrib/install.sh" | sh -s -- -b "$HOME/.local/bin" "$TRIVY_VERSION"

      - name: Checkout AI Project Maintainer
        shell: bash
        run: |
          set -euo pipefail
          git clone --depth 1 https://github.com/xixifusi1213-gif/ai-project-maintainer.git "$RUNNER_TEMP/ai-project-maintainer"
          cd "$RUNNER_TEMP/ai-project-maintainer"
          npm ci --omit=dev || npm install --omit=dev

      - name: Run security gate
        shell: bash
        run: |
          set -euo pipefail
          EXTRA_FLAGS=""
          if [ -f ".ai-maintainer/project-profile.yml" ]; then
            EXTRA_FLAGS="$EXTRA_FLAGS --production"
          fi
          node "$RUNNER_TEMP/ai-project-maintainer/ai-project-maintainer/scripts/run-local-gate.mjs" "$GITHUB_WORKSPACE" --strict --release --agent-risk $EXTRA_FLAGS --output reports/security-report.json

      - name: Write gate summary
        if: always()
        shell: bash
        run: |
          if [ -f reports/security-report.md ]; then
            cat reports/security-report.md >> "$GITHUB_STEP_SUMMARY"
          fi

      - name: Upload SARIF to code scanning
        if: always()
        uses: github/codeql-action/upload-sarif@v4
        with:
          sarif_file: reports/security-report.sarif
        continue-on-error: true

      - name: Upload security reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-reports
          path: |
            reports/security-report.json
            reports/security-report.md
            reports/security-report.sarif
            reports/sbom.cdx.json
          if-no-files-found: ignore
`;

const dependabotTemplate = `version: 2
updates:
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
`;

const preCommitTemplate = `repos:
  - repo: local
    hooks:
      - id: ai-project-maintainer-local-gate
        name: AI Project Maintainer local gate
        entry: npx ai-project-maintainer gate .
        language: system
        pass_filenames: false
`;

function safeWrite(root, relativePath, content, result) {
  const full = path.join(root, ...relativePath.split("/"));
  fs.mkdirSync(path.dirname(full), { recursive: true });
  if (fs.existsSync(full)) {
    result.skipped.push(relativePath);
    return;
  }
  fs.writeFileSync(full, content);
  result.created.push(relativePath);
}

export function initProject(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const result = { root, created: [], skipped: [] };

  safeWrite(root, ".ai-maintainer/policy.yml", policyTemplate, result);
  safeWrite(root, ".ai-maintainer/exceptions.yml", exceptionsTemplate, result);
  if ((options.ci || "github") === "github") {
    safeWrite(root, ".github/workflows/security-gate.yml", workflowTemplate, result);
    safeWrite(root, ".github/dependabot.yml", dependabotTemplate, result);
  }
  safeWrite(root, "reports/.gitkeep", "", result);
  if (options.preCommit) {
    safeWrite(root, ".pre-commit-config.yaml", preCommitTemplate, result);
  }

  return result;
}

function parseArgs(args) {
  const readOption = (name, fallback) => {
    const index = args.indexOf(name);
    if (index !== -1) return args[index + 1] || fallback;
    const inline = args.find((arg) => arg.startsWith(`${name}=`));
    return inline ? inline.slice(name.length + 1) : fallback;
  };
  return {
    projectRoot: args.find((arg) => !arg.startsWith("--")) || process.cwd(),
    profile: readOption("--profile", "oss"),
    ci: readOption("--ci", "github"),
    preCommit: args.includes("--pre-commit"),
  };
}

function main() {
  const args = parseArgs(process.argv.slice(2));
  const result = initProject(args.projectRoot, { profile: args.profile, ci: args.ci, preCommit: args.preCommit });
  console.log(JSON.stringify(result, null, 2));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
