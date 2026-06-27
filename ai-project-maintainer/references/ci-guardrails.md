# CI Guardrails

Use this reference when the user wants durable automation instead of repeated manual review.

## Principle

Guardrails should be small, fast, and relevant to the repo. Add blocking checks for high-confidence failures and non-blocking reports for noisy scanners until tuned.

## Minimum Useful Stack

For most repos:

- Secret scan: Gitleaks or Trivy secret scan.
- Dependency and image scan: Trivy or native package audit.
- Static app security: Semgrep auto rules and repo tests.
- IaC/cloud scan when infra files exist: Checkov or Trivy config.
- Database migration lint when migrations exist: Squawk/Atlas/strong_migrations/gh-ost/pt-online-schema-change depending on database.

## PR Gates

Block PRs for:

- Committed secrets.
- Critical reachable dependency vulnerabilities in production code.
- Unsafe database migrations likely to lock or rewrite hot tables.
- Public exposure or privilege escalation in IaC/Kubernetes.
- Failing tests or type checks in changed service boundaries.

Warn but do not block initially for:

- Low-confidence SAST findings.
- Dev-only vulnerabilities.
- Legacy baseline issues unrelated to the PR.

## Deployment Gates

Before production deploy:

- Confirm migrations have a rollback or forward-fix plan.
- Confirm schema/app compatibility for rolling deploys.
- Confirm images are scanned and signed if the org uses signing.
- Confirm observability exists for the changed path: logs, metrics, traces, and alerts.
- Confirm feature flags or rollback commands for high-risk releases.

## Incident Feedback Loop

After every incident, add one guardrail that would have detected or prevented it:

- Migration lint or staging dry run for DB incidents.
- Synthetic checks or SLO alerts for user-visible breakage.
- Policy-as-code for cloud/network misconfigurations.
- Regression tests for the failed path.
- Runbook automation for known remediation.

Do not add broad tools just to add tools. Tie each new check to a risk surfaced by the project.
