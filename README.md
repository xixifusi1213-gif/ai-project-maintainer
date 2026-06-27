# AI Project Maintainer

![AI coding](https://img.shields.io/badge/built%20for-AI%20coding-111827)
![Production audit](https://img.shields.io/badge/gate-production%20audit-0f766e)
![Account free](https://img.shields.io/badge/default-account%20free-2563eb)
![CI ready](https://img.shields.io/badge/CI-GitHub%20Actions-24292f)

**A production-readiness gate for AI-coded projects.**

AI can generate code fast. This tool helps you keep the project maintainable after that: collect project evidence, plan the audit, run deterministic gates, let Codex fix blockers, and rerun until the release is defensible.

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

## The 3-Minute Flow

```powershell
# 1. Add local and CI guardrails
npx ai-project-maintainer init "E:\my-project" --profile oss --ci github

# 2. Create the production audit intake templates
npx ai-project-maintainer init-audit "E:\my-project"

# 3. Generate the project-specific audit plan
npx ai-project-maintainer audit-plan "E:\my-project" --output reports/audit-plan.json

# 4. Run the production gate
npx ai-project-maintainer gate "E:\my-project" --production --strict --release --output reports/security-report.json
```

No npm publication is required for GitHub Actions. The generated workflow clones this repository and runs the Node scripts directly.

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
.ai-maintainer/threat-model.md
.ai-maintainer/release-checklist.yml
.ai-maintainer/incident-runbook.md
.ai-maintainer/db-migration-policy.yml
.ai-maintainer/observability-checklist.yml
```

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
- blockers and warnings
- production evidence gaps
- user decisions still needed
- tool versions and commands
- exception usage
- SARIF for GitHub Code Scanning
- open source maintenance score

## Use With Codex

Install as a Codex skill:

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

Then ask Codex:

```text
$ai-project-maintainer generate a production audit plan for this project, run the production gate, fix blockers, and rerun until it passes.
```

## Source Checkout Commands

If you are using the repository directly instead of npm:

```powershell
node .\ai-project-maintainer\scripts\doctor.mjs
node .\ai-project-maintainer\scripts\init-project.mjs "E:\my-project" --profile oss --ci github
node .\ai-project-maintainer\scripts\init-audit.mjs "E:\my-project"
node .\ai-project-maintainer\scripts\audit-plan.mjs "E:\my-project" --output reports/audit-plan.json
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\my-project" --production --strict --release --output reports/security-report.json
node .\ai-project-maintainer\scripts\report-summary.mjs "E:\my-project\reports\security-report.json"
```

## What This Is Not

This tool does not prove absolute security, replace human risk ownership, or eliminate final audits for high-stakes systems.

It is designed for the practical middle ground: a personal developer or small team using AI coding, with enough process to maintain a serious project without manually checking every item from scratch.

## Documentation

- [Production audit workflow](docs/PRODUCTION-AUDIT.zh-CN.md)
- [Intake schema](docs/INTAKE-SCHEMA.zh-CN.md)
- [Install guide](docs/INSTALL.zh-CN.md)
- [GitHub Actions guide](docs/CI-GITHUB-ACTIONS.zh-CN.md)
- [Policy and exceptions](docs/POLICY-AND-EXCEPTIONS.zh-CN.md)

## Development

```powershell
npm install
npm test
npm run check
npm pack --dry-run
```
