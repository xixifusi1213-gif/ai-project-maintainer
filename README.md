# AI Project Maintainer

![AI coding](https://img.shields.io/badge/built%20for-AI%20coding-111827)
![Production audit](https://img.shields.io/badge/gate-production%20audit-0f766e)
![Account free](https://img.shields.io/badge/default-account%20free-2563eb)
[![npm](https://img.shields.io/npm/v/ai-project-maintainer.svg)](https://www.npmjs.com/package/ai-project-maintainer)
[![CI](https://github.com/xixifusi1213-gif/ai-project-maintainer/actions/workflows/ci.yml/badge.svg)](https://github.com/xixifusi1213-gif/ai-project-maintainer/actions/workflows/ci.yml)
[![Security](https://github.com/xixifusi1213-gif/ai-project-maintainer/actions/workflows/security.yml/badge.svg)](https://github.com/xixifusi1213-gif/ai-project-maintainer/actions/workflows/security.yml)

**A production-readiness gate for AI-coded projects.**

AI can generate code fast. This tool helps you keep the project maintainable after that: collect project evidence, plan the audit, run deterministic gates, let Codex fix blockers, and rerun until the release is defensible.

[See the demo](docs/DEMO.md) | [Real OSS cases](docs/CASE-STUDIES.md) | [Chinese demo](docs/DEMO.zh-CN.md) | [Production audit docs](docs/PRODUCTION-AUDIT.zh-CN.md)

It is not another scanner wrapper. It turns AI coding maintenance into a repeatable loop:

```text
project profile -> audit plan -> local/CI gate -> evidence report -> AI fixes -> rerun
```

## Why This Exists

AI coding makes it easy to ship code that looks complete but quietly misses production basics:

- no business-flow tests
- no secret/dependency/security gate
- no database migration review
- no release approval or rollback evidence
- no monitoring/logging/alerting proof
- no clear owner-approved exceptions

`ai-project-maintainer` makes those gaps visible before they become production surprises.

## 30-Second Quickstart

Requires Node.js 20+.

```powershell
npx ai-project-maintainer doctor --no-trivy-db
npx ai-project-maintainer init ".\my-project" --profile oss --ci github
npx ai-project-maintainer init-audit ".\my-project" --wizard --dry-run
npx ai-project-maintainer init-audit ".\my-project" --wizard
npx ai-project-maintainer gate ".\my-project" --production --strict --release --output reports/security-report.json
```

`PASS_WITH_GAPS` means no blocking checks failed, but release-readiness evidence is still missing or needs owner approval before production.

## The 3-Minute Flow

Requires Node.js 20+.

```powershell
# 1. Add local and CI guardrails
npx ai-project-maintainer init "E:\my-project" --profile oss --ci github

# 2. Answer the guided production audit intake
npx ai-project-maintainer init-audit "E:\my-project" --wizard

# 3. Generate the project-specific audit plan
npx ai-project-maintainer audit-plan "E:\my-project" --output reports/audit-plan.json

# 4. Run the production gate
npx ai-project-maintainer gate "E:\my-project" --production --strict --release --output reports/security-report.json
```

GitHub Actions templates can either use the npm package or clone this repository directly.

## Real Demo

This repository includes a runnable sample project at `examples/demo-ai-app`.

![90-second demo storyboard](assets/demo-90s.gif)

```powershell
npm test --prefix .\examples\demo-ai-app
npm run build --prefix .\examples\demo-ai-app
node .\examples\demo-ai-app\scripts\run-demo-gate.mjs
```

The demo shows the intended workflow:

- healthy business tests and release build pass
- Gitleaks, Trivy, Semgrep, OSV, Syft, Grype, Scorecard, and CI checks are represented in the report
- production-readiness gaps remain visible for release approval, monitoring, logs, metrics, and alerts

To see the "before" state without committing unsafe fixtures:

```powershell
node .\examples\demo-ai-app\scripts\create-before-state.mjs
```

It writes a broken copy under the OS temp directory, where the business tests fail.

More demo material:

- [Before/after case](docs/demo-output/before-after-case.md)
- [90-second browser demo](docs/demo-output/90-second-demo.html)
- [Animated SVG storyboard](assets/demo-90s-storyboard.svg)

## Real OSS Case Studies

The demo is intentionally small. The case studies use real open source advisories, releases, and patch commits:

- [SiYuan Electron RCE](docs/cases/electron-oss-before-after.md): shows why a fixed advisory can still need Electron runtime hardening before release.
- [Ghost SQL injection](docs/cases/ghost-sql-injection-before-after.md): shows a database query blocker changing from `FAIL` to `PASS_WITH_GAPS` after the upstream parameterized-binding patch.

Run the case-study verifier:

```powershell
npm run cases:verify
```

The repository stores links, metadata, and generated reports. It does not vendor third-party source trees or ship exploit code.

## What It Checks

| Area | Evidence produced |
| --- | --- |
| Tests and release scripts | test/E2E/build/dist failures |
| Secrets | Gitleaks findings |
| Dependencies | npm/pnpm/yarn audit, Trivy, OSV-Scanner |
| Static security | Semgrep blocking findings |
| Supply chain | Syft SBOM, Grype scan |
| CI security | actionlint, zizmor |
| IaC | Checkov, Trivy config |
| Electron apps | dangerous webPreferences, preload/IPC/file-read risks |
| Database projects | migration, backup, rollback, review-tool gaps |
| Production readiness | monitoring, logs, metrics, alerts, release approval, incident runbook |

## Production Audit, Not Just Scanning

V3 adds an intake-driven audit layer:

```text
.ai-maintainer/project-profile.yml
.ai-maintainer/evidence-sources.yml
.ai-maintainer/business-flows.yml
.ai-maintainer/risk-policy.yml
.ai-maintainer/intake-summary.md
.ai-maintainer/threat-model.md
.ai-maintainer/release-checklist.yml
.ai-maintainer/incident-runbook.md
.ai-maintainer/db-migration-policy.yml
.ai-maintainer/observability-checklist.yml
```

v0.6.0 adds a guided intake wizard:

```powershell
npx ai-project-maintainer init-audit "E:\my-project" --wizard
npx ai-project-maintainer init-audit "E:\my-project" --wizard --lang zh-CN
npx ai-project-maintainer init-audit "E:\my-project" --wizard --dry-run
```

The CLI asks deterministic questions and writes YAML. It does not call OpenAI APIs. When used from Codex, the `ai-project-maintainer` skill can explain each question, ask follow-ups, and then let the CLI write the same files.

The user supplies business facts and evidence locations. The tool decides which checks apply and labels every item clearly:

```text
PASS           checked and OK
FAIL           checked and failed
WARN           risky but not blocking by default
GAP            missing evidence
N/A            not applicable to this project
USER_DECISION  maintainer judgment required
```

By default, `GAP` is reported but does not fail the gate. To make missing production evidence a hard release blocker:

```yaml
production:
  block_on_coverage_gaps: true
```

## Reports

Each run writes:

```text
reports/security-report.json
reports/security-report.md
reports/security-report.sarif
reports/sbom.cdx.json
```

Reports include:

- PASS/FAIL summary
- `overallStatus`: `FAIL`, `PASS_WITH_GAPS`, `PASS_WITH_WARNINGS`, or `PASS`
- blockers and warnings
- production evidence gaps
- user decisions still needed
- tool versions and commands
- exception usage
- SARIF for GitHub Code Scanning
- open source maintenance score

By default, SARIF only uploads actionable code/security findings to GitHub Code Scanning. Non-blocking production gaps stay in the Markdown/JSON report and Actions Summary so the public Security page does not look like a vulnerability wall for missing logs or alerts.

## Use With Codex

Install as a Codex skill:

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

Then ask Codex:

```text
$ai-project-maintainer help me run the AI-assisted project intake interview.
$ai-project-maintainer generate a production audit plan for this project, run the production gate, fix blockers, and rerun until it passes.
```

## Source Checkout Commands

If you are using the repository directly instead of npm:

```powershell
node .\ai-project-maintainer\scripts\doctor.mjs
node .\ai-project-maintainer\scripts\init-project.mjs "E:\my-project" --profile oss --ci github
node .\ai-project-maintainer\scripts\init-audit.mjs "E:\my-project" --wizard
node .\ai-project-maintainer\scripts\audit-plan.mjs "E:\my-project" --output reports/audit-plan.json
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\my-project" --production --strict --release --output reports/security-report.json
node .\ai-project-maintainer\scripts\report-summary.mjs "E:\my-project\reports\security-report.json"
```

## What This Is Not

This tool does not prove absolute security, replace human risk ownership, or eliminate final audits for high-stakes systems.

It is designed for the practical middle ground: a personal developer or small team using AI coding, with enough process to maintain a serious project without manually checking every item from scratch.

## Documentation

- [Demo](docs/DEMO.md)
- [中文演示](docs/DEMO.zh-CN.md)
- [Real OSS case studies](docs/CASE-STUDIES.md)
- [Before/after case](docs/demo-output/before-after-case.md)
- [Security workflow](docs/SECURITY-WORKFLOW.md)
- [Production audit workflow](docs/PRODUCTION-AUDIT.zh-CN.md)
- [Intake schema](docs/INTAKE-SCHEMA.zh-CN.md)
- [Install guide](docs/INSTALL.zh-CN.md)
- [GitHub Actions guide](docs/CI-GITHUB-ACTIONS.zh-CN.md)
- [Policy and exceptions](docs/POLICY-AND-EXCEPTIONS.zh-CN.md)
- [Promotion kit](docs/PROMOTION.md)

## Development

```powershell
npm install
npm test
npm run check
npm pack --dry-run
```
