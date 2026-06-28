# Demo: From AI-Coded Repo to Production Audit Report

This demo shows the core workflow without requiring any paid account or external API.

## 1. Initialize The Project

```powershell
npx ai-project-maintainer init "E:\my-project" --profile oss --ci github
```

This creates the local policy, exceptions file, GitHub Actions workflow, Dependabot config, and report directory.

## 2. Create Production Audit Intake

```powershell
npx ai-project-maintainer init-audit "E:\my-project"
```

This creates:

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

These files record project facts and evidence locations. They should not contain tokens, DSNs, passwords, or production secrets.

## 3. Generate An Audit Plan

```powershell
npx ai-project-maintainer audit-plan "E:\my-project" --output reports/audit-plan.json
```

Example output:

```text
PASS          Production audit intake is present.
USER_DECISION Critical business flows must be declared.
GAP           No GitHub Actions workflow evidence detected.
GAP           No production release approval evidence declared.
GAP           Error monitoring evidence is missing.
N/A           No database surface detected or declared.
```

The point is not to pretend the project is safe. The point is to make missing production evidence visible.

## 4. Run The Production Gate

```powershell
npx ai-project-maintainer gate "E:\my-project" --production --strict --release --output reports/security-report.json
```

The report combines deterministic scanner output with production-readiness evidence:

```text
PASS gitleaks secret scan
PASS trivy filesystem scan
PASS semgrep static scan
GAP  Error monitoring evidence is missing.
GAP  Production logs evidence is missing.
USER_DECISION Critical business flows must be declared.
```

See [sample report](demo-output/security-report.md).

## 5. Let Codex Fix Blockers

Ask Codex:

```text
$ai-project-maintainer run the production gate for this project, fix blockers, and rerun until it passes.
```

Codex can handle deterministic blockers. The maintainer still owns business decisions such as critical flows, accepted risks, and production evidence.
