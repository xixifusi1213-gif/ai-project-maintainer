# Heavy Security Workflow

`v0.4.1` keeps `.github/workflows/security.yml` as the repository's heavier dogfooding gate and pins scanner versions for more reproducible CI runs.

## When It Runs

- pull requests to `main`
- pushes to `main`
- weekly scheduled run
- manual `workflow_dispatch`

## Blocking Checks

The first version blocks on high-confidence failures:

- `npm test`
- `npm run check`
- `npm pack --dry-run`
- AI Project Maintainer production gate
- Gitleaks findings through the production gate
- Trivy high/critical findings through the production gate
- Semgrep blocking findings through the production gate
- actionlint failures through the production gate

## Advisory Evidence

The workflow also captures extra evidence and uploads it as an artifact:

- raw Gitleaks JSON
- raw Trivy JSON
- Semgrep SARIF
- OSV-Scanner text output
- Syft CycloneDX SBOM
- Grype JSON
- actionlint output
- zizmor output
- OpenSSF Scorecard JSON
- AI Project Maintainer JSON, Markdown, SARIF, and SBOM reports

Some advisory steps use `continue-on-error: true` because early public projects often need one or two runs to tune scanner baselines. The production gate remains the release decision.

Scanner installers are pinned by environment variables in the workflow. Update those variables deliberately instead of relying on `@latest`.

## Code Scanning Display Policy

GitHub Code Scanning is treated as the public security findings list, so v0.5.1 only uploads actionable code/security findings to SARIF by default.

Uploaded to Code Scanning:

- blocking findings
- code-level security warnings such as Semgrep, Trivy, Electron hardening, database query risk, or GitHub Actions security findings

Kept in the Markdown/JSON report and Actions summary, but not uploaded as Code Scanning alerts by default:

- production logs, metrics, alerts, and error-monitoring gaps
- release approval gaps
- business-flow declaration gaps
- `USER_DECISION` items
- optional tool coverage gaps

This keeps the repository Security page readable while preserving the full production-readiness evidence trail in `reports/security-report.md`, `reports/security-report.json`, and the `security-evidence` artifact.

Projects that intentionally want production-readiness gaps in Code Scanning can opt in:

```yaml
reporting:
  code_scanning:
    include_coverage_gaps: true
```

## Why Not Block Everything Immediately

This project is a public tool, so a permanently red workflow hurts trust as much as missing checks. The v0.4.1 policy is:

```text
high-confidence release risk -> block
optional ecosystem signal -> report first
```

Once the workflow has a stable baseline, optional checks can be promoted from warning to blocking in `.ai-maintainer/policy.yml`.

## Local Equivalent

The closest local command is:

```powershell
node .\ai-project-maintainer\scripts\run-local-gate.mjs . --production --strict --release --output reports/security-report.json
```

Install scanner CLIs first, or use `node .\ai-project-maintainer\scripts\doctor.mjs` to see what is missing.
