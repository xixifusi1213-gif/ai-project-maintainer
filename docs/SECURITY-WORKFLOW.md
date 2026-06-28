# Heavy Security Workflow

`v0.4.0` adds `.github/workflows/security.yml` so the repository dogfoods a heavier security gate.

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

## Why Not Block Everything Immediately

This project is a public tool, so a permanently red workflow hurts trust as much as missing checks. The v0.4.0 policy is:

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
