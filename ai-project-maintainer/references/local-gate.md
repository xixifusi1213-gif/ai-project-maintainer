# Local Safety Gate

Use this reference when the user wants an account-free reusable gate for personal projects.

## What Works Without Accounts

These checks can run fully locally when the CLI tools are installed:

- Project tests: package-manager scripts such as `test`, `test:e2e`, `build`, and `dist`.
- Dependency audit: `npm audit --omit=dev` and equivalent package-manager audits where available.
- Secret scan: Gitleaks or Trivy secret scanner.
- Filesystem vulnerability/config scan: Trivy.
- Static app scan: Semgrep, when installed or available through Docker/WSL/Python tooling.
- IaC scan: Checkov or Trivy config scan.
- SQL migration lint: Squawk, Atlas, or framework-specific migration tests.
- Electron baseline: local pattern checks plus manual review of IPC and update paths.

Accounts are optional. They are only needed for platform-backed evidence: Bytebase SQL review workflows, cloud IAM state, Kubernetes live cluster state, staging DAST, or incident observability.

## Default Gate Command

Check the current machine first:

```bash
node <skill>/scripts/doctor.mjs
```

Initialize a project once:

```bash
node <skill>/scripts/init-project.mjs <repo>
```

Run this for release decisions:

```bash
node <skill>/scripts/run-local-gate.mjs <repo> --strict --release --output reports/security-report.json
```

Use non-strict mode during adoption:

```bash
node <skill>/scripts/run-local-gate.mjs <repo>
```

Strict mode treats missing relevant tools as failures. Non-strict mode reports missing tools as coverage gaps.

Summarize a saved report:

```bash
node <skill>/scripts/report-summary.mjs <repo>/reports/security-report.json
```

## Adoption Loop

1. Run the gate.
2. Fix blocking findings.
3. Re-run until pass.
4. Add project-specific tests for any bug class found manually.
5. Promote stable checks into CI.

## Blocking Standard

Block release for:

- Failing tests, E2E, build, or release packaging.
- Committed secrets or high-confidence secret scan findings.
- High or critical production dependency vulnerabilities without a documented exception.
- Electron `nodeIntegration: true`, `contextIsolation: false`, `webSecurity: false`, or unrestricted IPC file/system access.
- Unsafe database migrations: likely lock/table rewrite, destructive incompatible change, or missing rollback for risky schema changes.
- IaC/Kubernetes settings that expose admin surfaces, plaintext secrets, privileged containers, broad IAM, or public ingress without controls.

Warn, tune, or document exceptions for:

- Dev-only vulnerabilities.
- Low-confidence static-analysis findings.
- Historical baseline issues outside the current change.
- Missing tools during the first adoption pass.

## Local Tool Bootstrap

On Windows, the bundled bootstrap script can download account-free CLI binaries where GitHub release assets are available:

```powershell
powershell -ExecutionPolicy Bypass -File <skill>\scripts\bootstrap-local-tools.ps1 -Tools gitleaks,trivy,squawk
```

If `uv` is available, the same script can try Python-tool installs:

```powershell
powershell -ExecutionPolicy Bypass -File <skill>\scripts\bootstrap-local-tools.ps1 -Tools semgrep,checkov
```

If Semgrep or Checkov cannot install on the current Windows environment, keep them as coverage gaps and rely on Codex security review plus project tests until Python, Docker, or WSL is ready.

## Policy And Exceptions

Project policy lives in:

```text
.ai-maintainer/policy.yml
.ai-maintainer/exceptions.yml
```

Exceptions must include `id`, `check`, `reason`, `expires`, and `owner`. Expired or incomplete exceptions are blocking failures. Exceptions only downgrade the matching finding, not an entire tool category.

## Trivy Database Availability

Trivy needs a vulnerability database on first run. The gate uses GHCR first:

```powershell
$env:TRIVY_DB_REPOSITORY="ghcr.io/aquasecurity/trivy-db:2"
$env:TRIVY_JAVA_DB_REPOSITORY="ghcr.io/aquasecurity/trivy-java-db:1"
$env:TRIVY_TIMEOUT="90s"
```

If the database cannot download, strict mode must fail because dependency and image vulnerability coverage is unavailable. Re-run from a network that can reach the configured OCI registry, or set those environment variables to an internal mirror.
