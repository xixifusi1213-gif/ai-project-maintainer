# AI Project Maintainer

`ai-project-maintainer` is a Codex skill and reusable safety gate for AI-coded projects.

It turns common release checks into a repeatable local and CI workflow:

- project tests, E2E, build, and packaging scripts
- Gitleaks secret scanning
- Semgrep static application scanning
- Trivy dependency, secret, and configuration scanning
- OSV-Scanner dependency checks when lockfiles exist
- Syft SBOM and Grype supply-chain checks when available
- GitHub Actions checks with actionlint and zizmor
- Checkov and Trivy config checks for IaC
- Electron IPC, preload, update, and dangerous `webPreferences` checks
- database migration routing through Squawk, Atlas, or Bytebase review
- JSON, Markdown, and SARIF reports with blockers, warnings, coverage gaps, tool versions, commands, and exception usage

This tool does not promise absolute security. It is a practical engineering gate: run it, fix blockers, document narrow exceptions, and rerun until the project passes.

## Install As A Codex Skill

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

Restart Codex, then invoke:

```text
$ai-project-maintainer run a strict local safety gate for this project and explain any blockers.
```

Chinese setup guide: [docs/INSTALL.zh-CN.md](docs/INSTALL.zh-CN.md)

## Direct CLI Usage

Check your local environment:

```powershell
node .\ai-project-maintainer\scripts\doctor.mjs
```

Initialize a project with policy, exceptions, GitHub Actions, and report folders:

```powershell
node .\ai-project-maintainer\scripts\init-project.mjs "E:\my-project"
```

Run the gate:

```powershell
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\my-project"
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\my-project" --strict --release --output reports/security-report.json
```

Print a saved report summary:

```powershell
node .\ai-project-maintainer\scripts\report-summary.mjs "E:\my-project\reports\security-report.json"
```

The old command still works:

```powershell
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\my-project"
```

## Initialize A Project

`init-project.mjs` creates these files without overwriting manual edits:

```text
.ai-maintainer/policy.yml
.ai-maintainer/exceptions.yml
.github/workflows/security-gate.yml
reports/.gitkeep
```

Add `--pre-commit` if you also want a starter `.pre-commit-config.yaml`.

## Reports

Each CLI release run can write:

```text
reports/security-report.json
reports/security-report.md
reports/security-report.sarif
reports/sbom.cdx.json
```

`reports/sbom.cdx.json` is generated only when Syft is available.

## Account-Free By Default

The first-stage gate does not require GitHub, Bytebase, cloud, Kubernetes, Sentry, Grafana, or other paid or hosted accounts.

Accounts are only needed for deeper evidence:

- Bytebase database review workflows
- cloud IAM and networking state
- live Kubernetes clusters
- staging DAST targets
- production logs, metrics, traces, and incident timelines

Without those accounts, the tool still reviews local code, tests, dependencies, secrets, config files, Electron risks, CI files, and packaging scripts.

## Local Tool Bootstrap

On Windows, the helper can install the most common local tools:

```powershell
powershell -ExecutionPolicy Bypass -File .\ai-project-maintainer\scripts\bootstrap-local-tools.ps1 -Tools gitleaks,trivy,semgrep,checkov
```

Trivy must download its vulnerability database. In strict mode, a Trivy DB download failure is a blocker because dependency vulnerability coverage is incomplete.

## Documentation

- [Install guide, Chinese](docs/INSTALL.zh-CN.md)
- [GitHub Actions CI](docs/CI-GITHUB-ACTIONS.zh-CN.md)
- [Policy and exceptions](docs/POLICY-AND-EXCEPTIONS.zh-CN.md)
- [Upgrade roadmap](docs/UPGRADE-ROADMAP.zh-CN.md)

## Development

```powershell
npm test
npm run check
```

The test suite uses Node's built-in test runner and does not require extra test dependencies.
