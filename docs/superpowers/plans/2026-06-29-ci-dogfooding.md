# CI Dogfooding Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a real GitHub Actions CI gate so the repository dogfoods its own tests, syntax checks, package validation, and local safety gate.

**Architecture:** Use a single GitHub Actions workflow at `.github/workflows/ci.yml` that runs on pushes and pull requests to `main`. Keep the first version account-free and deterministic: install npm dependencies with `npm ci`, run Node tests and syntax checks, validate npm package contents, run `doctor` without Trivy DB as a non-blocking tool probe, and run a local gate smoke test that generates reports while treating external scanners as unavailable on day one.

**Tech Stack:** GitHub Actions, Node.js 20 and 22, npm, existing Node scripts in `ai-project-maintainer/scripts`.

---

### Task 1: Add GitHub Actions CI Workflow

**Files:**
- Create: `.github/workflows/ci.yml`
- Create: `ai-project-maintainer/scripts/ci-smoke-gate.mjs`

- [ ] **Step 1: Create the workflow file**

Use this workflow content:

```yaml
name: CI

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
  workflow_dispatch:

permissions:
  contents: read

jobs:
  test:
    name: Node ${{ matrix.node-version }}
    runs-on: ubuntu-latest
    strategy:
      fail-fast: false
      matrix:
        node-version:
          - 20
          - 22

    steps:
      - name: Check out repository
        uses: actions/checkout@v4

      - name: Set up Node.js
        uses: actions/setup-node@v4
        with:
          node-version: ${{ matrix.node-version }}
          cache: npm

      - name: Install dependencies
        run: npm ci

      - name: Run tests
        run: npm test

      - name: Check script syntax
        run: npm run check

      - name: Validate package contents
        run: npm pack --dry-run

      - name: Probe local tool availability
        continue-on-error: true
        run: node ai-project-maintainer/scripts/doctor.mjs --no-trivy-db

      - name: Run local gate smoke test
        run: node ai-project-maintainer/scripts/ci-smoke-gate.mjs . reports/security-report.json

      - name: Upload gate reports
        if: always()
        uses: actions/upload-artifact@v4
        with:
          name: security-reports-node-${{ matrix.node-version }}
          path: reports/
          if-no-files-found: ignore
```

- [ ] **Step 2: Validate workflow can be parsed as YAML**

Run:

```powershell
node -e "import('yaml').then(({parse})=>{const fs=require('node:fs'); parse(fs.readFileSync('.github/workflows/ci.yml','utf8')); console.log('workflow yaml ok')})"
```

Expected: `workflow yaml ok`

### Task 2: Update README Trust Signals

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Replace the static CI badge**

Replace:

```markdown
![CI ready](https://img.shields.io/badge/CI-GitHub%20Actions-24292f)
```

With:

```markdown
[![CI](https://github.com/xixifusi1213-gif/ai-project-maintainer/actions/workflows/ci.yml/badge.svg)](https://github.com/xixifusi1213-gif/ai-project-maintainer/actions/workflows/ci.yml)
```

- [ ] **Step 2: Fix the README demo link separator**

Replace the corrupted link separator line with:

```markdown
[See the demo](docs/DEMO.md) · [中文演示](docs/DEMO.zh-CN.md) · [Production audit docs](docs/PRODUCTION-AUDIT.zh-CN.md)
```

### Task 3: Verify Locally

**Files:**
- No additional files.

- [ ] **Step 1: Run tests**

Run:

```powershell
npm test
```

Expected: all tests pass.

- [ ] **Step 2: Run syntax checks**

Run:

```powershell
npm run check
```

Expected: syntax check passes.

- [ ] **Step 3: Validate package contents**

Run:

```powershell
npm pack --dry-run
```

Expected: npm reports package `ai-project-maintainer@0.3.0` without errors.

- [ ] **Step 4: Run CI-equivalent local checks**

Run:

```powershell
node ai-project-maintainer/scripts/doctor.mjs --no-trivy-db
node ai-project-maintainer/scripts/ci-smoke-gate.mjs . reports/security-report.json
```

Expected: commands exit successfully and reports are generated.

### Task 4: Publish

**Files:**
- Commit: `.github/workflows/ci.yml`, `README.md`, `ai-project-maintainer/scripts/ci-smoke-gate.mjs`, `docs/superpowers/plans/2026-06-29-ci-dogfooding.md`

- [ ] **Step 1: Commit changes**

Run:

```powershell
git add .github/workflows/ci.yml README.md ai-project-maintainer/scripts/ci-smoke-gate.mjs docs/superpowers/plans/2026-06-29-ci-dogfooding.md
git commit -m "Add CI dogfooding workflow"
```

- [ ] **Step 2: Push to GitHub**

Run:

```powershell
git push origin HEAD:main
```

- [ ] **Step 3: Check workflow registration**

Run:

```powershell
gh workflow list --repo xixifusi1213-gif/ai-project-maintainer
```

Expected: workflow list includes `CI`.
