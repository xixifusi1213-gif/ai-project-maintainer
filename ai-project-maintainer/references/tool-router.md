# Tool Router

Use this reference to choose checks dynamically. Run only tools that match the repository and the user's scope.

## Selection Order

1. Inspect the project with `scripts/probe-project.mjs`.
2. Use installed Codex skills for security review when available.
3. Use local CLI tools that are already installed.
4. Use package-manager or containerized tools only when the repo already uses them or the user approves.
5. Fall back to manual review with explicit coverage gaps.

## Core Routing Table

| Surface | Signals | Primary tools | Notes |
| --- | --- | --- | --- |
| Code security | Auth, API routes, serializers, file upload, HTTP clients, SQL construction, crypto | `codex-security`, Semgrep, CodeQL, Open Code Review | Prioritize changed files and dataflow into sinks. |
| Secrets | `.env`, private keys, token-like config, CI variables, committed credentials | Gitleaks, Trivy secret scan | Do not print secret values. Report only location and type. |
| Dependencies | Lockfiles, Docker images, SBOM, package manifests | Trivy, OSV-Scanner, native package audit | Separate reachable production risk from dev-only noise. |
| Database migrations | `migrations/`, `db/migrate`, Prisma, Drizzle, Alembic, Flyway, Liquibase, raw SQL | Squawk, Atlas, Bytebase, pgroll, strong_migrations, gh-ost, pt-online-schema-change | Review lock behavior and rollback before correctness polish. |
| IaC and cloud | Terraform, CloudFormation, Pulumi, Helm, Kubernetes YAML, Docker Compose | Checkov, Trivy config, Conftest/OPA, Kubescape | Focus on public exposure, IAM, network policy, privileged runtime, and secret mounts. |
| Containers | Dockerfile, compose, image references, deploy manifests | Trivy image/config, Hadolint, Docker build checks | Check root user, privileged mode, writable filesystem, and unpinned base images. |
| Kubernetes runtime | K8s manifests, `kubectl` context, incident request | k8sgpt, HolmesGPT, Kubescape, Falco, Cilium/Tetragon | Default to read-only commands. |
| Web/API DAST | Staging URL explicitly provided by user | OWASP ZAP, Nuclei | Require explicit scope for active scans. Never infer internet targets. |
| Incident response | Alerts, logs, metrics, traces, rollout history, deploys, migrations | HolmesGPT, OpenSRE, k8sgpt, kubectl, observability CLIs/APIs | Build a timeline before proposing fixes. |

## Command Patterns

Use these as patterns, adapting paths and package managers to the repo.

```bash
semgrep scan --config auto
trivy fs --scanners vuln,secret,misconfig .
gitleaks detect --source . --redact
checkov -d .
squawk path/to/migration.sql
atlas migrate lint --dir "file://migrations"
kubescape scan
k8sgpt analyze
```

Use CodeQL when a CodeQL database or GitHub code scanning setup already exists, or when the user asks for deeper security analysis.

## Missing Tool Handling

When a useful tool is unavailable, write a short gap:

```text
Unavailable: squawk. Coverage gap: Postgres migration lock-risk linting was not run.
Smallest next guardrail: add squawk to CI for changed `.sql` migration files.
```

Do not turn the review into an installation project unless the user asks for setup.
