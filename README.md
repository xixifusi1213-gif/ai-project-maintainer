# AI Project Maintainer

`ai-project-maintainer` is a Codex skill and local safety gate for AI-coded projects.

It helps run repeatable release checks before you ship a project:

- project tests, E2E, build, and packaging scripts
- secret scanning with Gitleaks
- static security scanning with Semgrep
- dependency, secret, and configuration scanning with Trivy
- Electron desktop app checks for dangerous IPC, preload, update, and file-system patterns
- database migration, Docker, Kubernetes, Terraform, and CI risk routing
- a pass/fail report with blocking findings and coverage gaps

This tool does not promise absolute security. It is intended to be a practical engineering gate: run it, fix blockers, add tests for newly discovered bug classes, and rerun until the project passes.

## Install As A Codex Skill

Clone or download this repository, then copy the skill folder:

```powershell
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

Restart Codex, then invoke:

```text
$ai-project-maintainer run a strict local safety gate for this project and explain any blockers.
```

Chinese setup guide: [docs/INSTALL.zh-CN.md](docs/INSTALL.zh-CN.md)

## Run The Gate Directly

First install local tools:

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\ai-project-maintainer\scripts\bootstrap-local-tools.ps1" -Tools gitleaks,trivy,semgrep
```

Run a first adoption pass:

```powershell
node "$env:USERPROFILE\.codex\skills\ai-project-maintainer\scripts\run-local-gate.mjs" "E:\path\to\project"
```

Run a release gate:

```powershell
node "$env:USERPROFILE\.codex\skills\ai-project-maintainer\scripts\run-local-gate.mjs" "E:\path\to\project" --strict --release
```

## How To Use It

1. Put your project in Git.
2. Run the non-strict gate once to see missing tools and coverage gaps.
3. Install missing local tools where practical.
4. Run `--strict --release` before publishing.
5. Fix blockers and rerun until it passes.
6. Convert repeated findings into project tests or custom guardrails.

## Account-Free By Default

The local gate does not require GitHub, Bytebase, cloud, Kubernetes, or observability accounts.

Accounts are only needed for deeper platform evidence:

- Bytebase database review workflows
- cloud IAM and networking state
- live Kubernetes clusters
- staging DAST targets
- production logs, metrics, traces, and incident timelines

Without those accounts, the skill still reviews local code, tests, dependencies, secrets, config files, Electron risks, and packaging scripts.

## Current Windows Tool Notes

- `gitleaks` and `trivy` can be downloaded as local binaries.
- `semgrep` can often be installed through `uv tool install semgrep`.
- Trivy needs to download its vulnerability database on first run. If the network cannot reach GHCR or another configured OCI mirror, strict mode fails because vulnerability coverage is incomplete.
- `squawk` may need WSL, Docker, Cargo, or another installation method on Windows if no matching release asset is available.

## Repository Layout

```text
ai-project-maintainer/
  SKILL.md
  agents/openai.yaml
  references/
  scripts/
docs/
  INSTALL.zh-CN.md
```

## Maintenance

When improving the skill:

1. Update `ai-project-maintainer/SKILL.md` only for core routing and workflow instructions.
2. Put domain details in `ai-project-maintainer/references/`.
3. Put deterministic checks in `ai-project-maintainer/scripts/`.
4. Run:

```powershell
node --check .\ai-project-maintainer\scripts\probe-project.mjs
node --check .\ai-project-maintainer\scripts\run-local-gate.mjs
```

5. Test the local gate on a real project before tagging a release.

