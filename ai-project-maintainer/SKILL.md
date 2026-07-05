---
name: ai-project-maintainer
description: Orchestrates local and CI safety gates for AI-coded projects across tests, application code, Electron desktop risk, database migrations, network/cloud/IaC security, secrets, dependency risk, Kubernetes, and production incident triage. Use when asked to make a reusable security gate, review or maintain an AI coding project, reduce manual checks, audit PRs or diffs, inspect database or network security risks, set up CI/CD guardrails, download local security tools, or investigate production incidents.
---

# AI Project Maintainer

## Operating Rules

- Treat AI-generated code as untrusted until checked by deterministic tools, tests, and targeted review.
- Start with repository orientation before running broad scans: inspect git status, recent diffs, project layout, lockfiles, migration files, infra files, and CI config.
- Prefer evidence-producing checks over generic advice. Every finding should include the file or command evidence, risk, fix, and verification.
- Default to account-free local gates. Require accounts only for platform evidence: Bytebase projects, cloud/Kubernetes runtime state, staging DAST targets, or observability/incident systems.
- Use specialized installed skills when they match: `codex-security:security-diff-scan` for diffs, `codex-security:security-scan` for broader security review, and `codex-security:fix-finding` only after a finding is validated.
- Do not run destructive actions, production writes, schema changes, exploit payloads, or internet-facing active scans without explicit user approval and a named scope.
- If a tool is not installed, continue with available checks and report the smallest useful tool gap instead of blocking the review.

## Quick Start

1. Check the local environment with `node <this-skill>/scripts/doctor.mjs` or `npx ai-project-maintainer doctor`.
2. Initialize a project with `node <this-skill>/scripts/init-project.mjs <repo> --profile auto --ci github` or `npx ai-project-maintainer init <repo> --profile auto --ci github`.
3. For production-oriented review, initialize intake with `node <this-skill>/scripts/init-audit.mjs <repo> --wizard` or `npx ai-project-maintainer init-audit <repo> --wizard`. Use `--dry-run` first when you only need a preview.
4. Generate the audit plan with `node <this-skill>/scripts/audit-plan.mjs <repo> --profile auto --output reports/audit-plan.json` or `npx ai-project-maintainer audit-plan <repo> --profile auto --output reports/audit-plan.json`.
5. Before giving AI agents broad repository access, run `node <this-skill>/scripts/agent-risk.mjs <repo> --output reports/agent-risk-report.json` or `npx ai-project-maintainer agent-risk <repo> --output reports/agent-risk-report.json`.
6. For a reusable local safety gate, run `node <this-skill>/scripts/run-local-gate.mjs <repo> --profile auto --agent-risk --strict --release --output reports/security-report.json` or `npx ai-project-maintainer gate <repo> --profile auto --agent-risk --strict --release --output reports/security-report.json`.
7. For production evidence review, run `node <this-skill>/scripts/run-local-gate.mjs <repo> --profile auto --production --agent-risk --strict --release --output reports/security-report.json` or `npx ai-project-maintainer gate <repo> --profile auto --production --agent-risk --strict --release --output reports/security-report.json`.
8. For optional platform evidence, first run `npx ai-project-maintainer connectors doctor <repo>`, then run `npx ai-project-maintainer evidence <repo> --output reports/evidence-report.json`, and only then add `--connectors` to the production gate. Never ask the user to paste tokens into chat or config files; ask them to set environment variables named in `.ai-maintainer/connectors.yml`.
9. Summarize an existing report with `node <this-skill>/scripts/report-summary.mjs <repo>/reports/security-report.json` or `npx ai-project-maintainer summary <repo>/reports/security-report.json`.
10. If required local tools are missing on Windows, run `powershell -ExecutionPolicy Bypass -File <this-skill>/scripts/bootstrap-local-tools.ps1 -Tools gitleaks,trivy,semgrep,checkov`.
11. Run `node <this-skill>/scripts/probe-project.mjs <repo>` when you only need classification and tool availability.
12. Read only the relevant references:
   - Local account-free gate: `references/local-gate.md`
   - Database and migrations: `references/database.md`
   - Electron desktop apps: `references/electron-desktop.md`
   - Code, network, cloud, IaC, dependency, and secret security: `references/security.md`
   - Production incidents and SRE triage: `references/incident-response.md`
   - CI/CD guardrails and maintenance automation: `references/ci-guardrails.md`
   - Tool selection details: `references/tool-router.md`
13. Build a short execution plan from the detected risk surfaces and the audit plan.
14. Run the least invasive checks first, then deeper checks only where evidence points.
15. Return findings first, ordered by severity, with commands/tests already run.

## Modes

- **PR or diff review**: Review changed files first. Route changed migrations to database checks, changed infra to IaC/network checks, changed auth/API code to security checks, and changed deploy files to incident-risk checks.
- **Local safety gate**: Run `run-local-gate.mjs` in strict mode. Use this as the default reusable gate for personal projects before release.
- **Repository baseline**: Establish current risk posture across secrets, dependencies, static analysis, migrations, IaC, containers, and CI gates.
- **Electron desktop review**: Inspect preload IPC, BrowserWindow webPreferences, file-system permissions, update trust, navigation controls, shell opening, and multi-window data consistency.
- **Database migration review**: Focus on lock risk, backfill safety, rollback, compatibility windows, and online migration tools.
- **Network or cloud security review**: Focus on exposed services, auth boundaries, IAM, CORS, SSRF, TLS, Kubernetes policies, and IaC drift.
- **Production incident triage**: Stay read-only. Build a timeline from deploys, migrations, metrics, logs, traces, Kubernetes events, and alerts.
- **Guardrail setup**: Add or propose CI checks only after identifying the repo's package manager, CI provider, and deployment path.
- **AI-assisted project intake**: When the user asks for 项目画像问答, AI-assisted intake, or production audit initialization, first run project orientation/probing, then interview the maintainer in small sections: project type, data sensitivity, auth, database, deployment, observability, core business flows, and release-blocking policy. Explain professional terms in plain language, record `unknown` when the maintainer is unsure, and never ask for tokens, passwords, DSNs, or cloud secrets. Use `init-audit --wizard --dry-run` for a deterministic preview, then write the intake files with `init-audit --wizard` or by applying confirmed answers through the CLI.
- **Optional platform evidence connectors**: Use only when the maintainer explicitly enables connectors or asks for real production evidence. v0.7.0 supports GitHub Environments, Sentry, Vercel, Grafana, Prometheus, Bytebase, Atlas local migration lint, Cloudflare Pages, Render, and Fly. Connectors are read-only; missing tokens, 401/403, unavailable APIs, or missing local tools are `GAP` by default, not proof of safety.
- **AI agent risk preflight**: Run `agent-risk` before using Codex, MCP, Claude, Cursor, or other agents with broad file or command access. Treat inline secrets, unsafe agent instructions, destructive lifecycle scripts, and unpinned broad-permission MCP servers as blockers. Do not start MCP servers or execute project scripts while doing this preflight.
- **Profile-aware review**: Keep `--profile auto` unless local detection picks the wrong main risk surface. Use `electron-desktop`, `nextjs-web`, `node-api`, `database-prisma`, or `oss-library` to force the review focus for mixed or unusual repositories.
- **Production audit readiness**: If `.ai-maintainer/project-profile.yml` is missing, prefer the guided wizard instead of asking the maintainer to hand-edit YAML. Then run `audit-plan`, followed by `gate --production`. Treat `GAP` as missing evidence, not proof of safety.

## Output Contract

Use this structure unless the user asks otherwise:

1. Findings: severity `P0` to `P3`, evidence, impact, concrete fix, and verification.
2. Checks run: commands or skills used and whether they passed, failed, or were unavailable.
3. Coverage gaps: important areas not checked and why.
4. Next guardrails: the smallest durable automation that would prevent recurrence.

For incidents, replace "Findings" with "Current assessment" and include timeline, blast radius, suspected trigger, mitigation options, and rollback safety notes.
