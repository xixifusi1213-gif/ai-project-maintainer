# Real Project Quickstart Smoke

This document records lightweight first-run checks against public open source repositories using the published npm package, not the local checkout.

## Run

- Date: 2026-07-08
- Package: `ai-project-maintainer@latest`
- Resolved version: `1.4.4`
- Command:

```bash
npx -y ai-project-maintainer@latest quickstart .
```

The smoke used temporary shallow clones and records only sanitized summary data. Full generated reports and local filesystem paths are not committed.

## Results

| Project | Language | Exit | Status | Blockers | Repair pack | Main warnings/gaps | Classification |
| --- | --- | ---: | --- | ---: | --- | --- | --- |
| `sindresorhus/p-limit` | JavaScript | 0 | `PASS_WITH_GAPS` | 0 | no | npm audit setup/evidence gap, Semgrep hardening warning, SBOM/vulnerability scanner gaps, workflow lint gap | Project hardening recommendations |
| `unjs/defu` | TypeScript | 0 | `PASS_WITH_GAPS` | 0 | no | OSV/SBOM/vulnerability scanner gaps, Semgrep hardening warning, workflow lint gap | Project hardening recommendations |
| `expressjs/cors` | JavaScript | 0 | `PASS_WITH_GAPS` | 0 | no | npm audit setup/evidence gap, Semgrep hardening warning, SBOM/vulnerability scanner gaps, workflow lint gap | Project hardening recommendations |
| `chalk/chalk` | JavaScript | 0 | `PASS_WITH_GAPS` | 0 | no | npm audit setup/evidence gap, Semgrep hardening warning, SBOM/vulnerability scanner gaps, workflow lint gap | Project hardening recommendations |
| `sindresorhus/execa` | JavaScript | 0 | `FAIL` | 1 | yes | Semgrep child process execution findings plus normal evidence gaps | Maintainer triage for a code-level Semgrep blocker |

## Notes

- All five quickstart commands completed with exit code `0`, so quickstart stayed usable even when a project produced a failing report.
- The four `PASS_WITH_GAPS` runs had zero blockers and did not generate `reports/quickstart-repair-pack/`.
- `sindresorhus/execa` generated a repair pack because Semgrep reported `javascript.lang.security.detect-child-process.detect-child-process` in child process execution paths. That is a code-level finding and remains a blocker under the v1.4.3 quickstart boundary.
- `PASS_WITH_GAPS` is not a production safety guarantee. It means no blocking quickstart checks failed, while evidence gaps or maintainer decisions remain.
