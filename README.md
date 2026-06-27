# AI Project Maintainer

`ai-project-maintainer` is an account-free, semi-automated maintenance gate for AI-coded open source projects.

It gives local development, GitHub Actions, and Codex the same maintenance contract:

- tests, E2E, build, and release scripts
- Gitleaks secret scanning
- Semgrep static analysis
- Trivy filesystem dependency, secret, and misconfiguration scanning
- OSV-Scanner for lockfile dependency risk
- Syft SBOM and Grype supply-chain scans
- actionlint and zizmor for GitHub Actions security
- Checkov and Trivy config for IaC
- Electron dangerous setting and privileged IPC checks
- database migration risk routing
- optional open source hygiene checks: OpenSSF Scorecard, pre-commit, MegaLinter
- JSON, Markdown, SARIF, and optional SBOM reports

This is not a promise of absolute security. It is a practical gate: run it, fix blockers, document narrow exceptions, and rerun until the project passes.

## CLI

After npm publication, use:

```powershell
npx ai-project-maintainer doctor
npx ai-project-maintainer init "E:\my-project" --profile oss --ci github
npx ai-project-maintainer gate "E:\my-project" --strict --release --output reports/security-report.json
npx ai-project-maintainer summary "E:\my-project\reports\security-report.json"
```

Local source checkout still works:

```powershell
node .\ai-project-maintainer\scripts\doctor.mjs
node .\ai-project-maintainer\scripts\init-project.mjs "E:\my-project" --profile oss --ci github
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\my-project" --strict --release --output reports/security-report.json
node .\ai-project-maintainer\scripts\report-summary.mjs "E:\my-project\reports\security-report.json"
```

## Codex Skill Install

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

Restart Codex, then invoke:

```text
$ai-project-maintainer run a strict local safety gate for this project and explain any blockers.
```

## Project Init

For open source projects:

```powershell
npx ai-project-maintainer init "E:\my-project" --profile oss --ci github --pre-commit
```

This creates, without overwriting manual edits:

```text
.ai-maintainer/policy.yml
.ai-maintainer/exceptions.yml
.github/workflows/security-gate.yml
.github/dependabot.yml
.pre-commit-config.yaml
reports/.gitkeep
```

The generated GitHub Actions workflow does not require the package to be published to npm. It clones `https://github.com/xixifusi1213-gif/ai-project-maintainer.git` inside the runner and executes the Node scripts from that checkout.

## Policy

V2 policy supports per-check levels:

```yaml
profile: oss
mode: strict
checks:
  gitleaks: block
  trivy: block
  semgrep: block
  osv-scanner: warn
  syft: warn
  grype: warn
  actionlint: block
  zizmor: warn
  checkov: warn
  trivy-config: warn
  scorecard: warn
  megalinter: warn
  pre-commit: warn
```

Levels:

- `block`: finding can fail the gate.
- `warn`: finding appears in warnings and score, but does not fail the gate.
- `off`: check is disabled.

Exceptions remain narrow and expiring. Each exception must include `id`, `check`, `reason`, `expires`, and `owner`.

## Reports

The gate writes:

```text
reports/security-report.json
reports/security-report.md
reports/security-report.sarif
reports/sbom.cdx.json
```

Reports include PASS/FAIL, blockers, warnings, coverage gaps, tool versions, commands, exception usage, and an open source maintenance score from `0-100`.

## Development

```powershell
npm install
npm test
npm run check
npm pack --dry-run
```
