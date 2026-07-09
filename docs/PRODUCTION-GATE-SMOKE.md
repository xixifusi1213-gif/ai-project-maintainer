# v1.5.0 Production Gate Smoke

This smoke record documents a post-release check of `ai-project-maintainer@latest` after v1.5.0 was published.

It is intentionally a summary. Full raw reports are not committed because scanner output can include local paths, dependency metadata, and untriaged findings that should not be quoted as confirmed vulnerabilities.

## Boundary

These results show that the strict production gate can run against real public repositories and generate structured release-gate reports.

They do not claim that upstream projects have confirmed vulnerabilities. A blocker here means one of:

- an untriaged scanner finding;
- a dependency, secret, build, database, or static-analysis release blocker;
- a production-readiness evidence gap;
- a maintainer decision that needs project-specific context.

Treat the results as release-readiness signals, not vulnerability disclosures.

## Environment

| Item | Value |
| --- | --- |
| Date | 2026-07-09 |
| Package | `ai-project-maintainer@latest` |
| Resolved version | `1.5.0` |
| Release | <https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.5.0> |
| npm dist-tag | `latest: 1.5.0` |

The v1.5.0 GitHub Actions publish workflow completed successfully, including trusted npm publishing, GitHub Release creation, and published-release alignment verification. Local published-release verification also passed after downloading the v1.5.0 `release-manifest.json` asset.

## Command

The smoke used the published npm package, not the local source checkout:

```powershell
npx -y ai-project-maintainer@latest gate . --profile auto --production --agent-risk --strict --release --no-tests --output reports/security-report.json
```

`--no-tests` was used to keep the smoke focused on gate/report behavior rather than each repository's local dependency installation and test environment. Release/build scripts can still run when the gate treats them as release checks.

## Projects

| Project | Type | Maturity note |
| --- | --- | --- |
| `expressjs/express` | API framework | Mature production-grade Node.js framework used by many real applications. |
| `tastejs/todomvc` | Demo web app collection | Mature example repository, but not a production product. |
| `boxyhq/saas-starter-kit` | SaaS starter/template | Adopted SaaS starter, but not a deployed product by itself. |

## Results

| Project | Detected profile | Status | Blockers | Warnings | Gaps | Blocker classes |
| --- | --- | ---: | ---: | ---: | ---: | --- |
| `expressjs/express` | `node-api` | `FAIL` | 1 | 20 | 16 | SAST |
| `tastejs/todomvc` | `electron-desktop` | `FAIL` | 4 | 19 | 16 | dependency audit, secrets, Trivy, SAST |
| `boxyhq/saas-starter-kit` | `database-prisma` | `FAIL` | 6 | 26 | 22 | build/release script, dependency audit, secrets, Trivy, SAST, database migration lint |

Every smoke target produced a valid `reports/security-report.json` report from the published npm package.

## What This Means

The strict production gate did not rubber-stamp real projects. It surfaced release-blocking findings and production-readiness gaps in public repositories, including mature codebases.

That is the intended behavior. `quickstart` is the low-friction first-run path:

```powershell
npx ai-project-maintainer quickstart .
```

The strict production gate is intentionally harder:

```powershell
npx ai-project-maintainer gate . --profile auto --production --agent-risk --strict --release --output reports/security-report.json
```

Use the strict gate when a project is closer to release and the maintainer is ready to supply production evidence.

## Interpretation Rules

- Do not describe these findings as confirmed upstream vulnerabilities without project-specific triage.
- Do not publish raw scanner output as a disclosure.
- Do not assume a demo repository should satisfy production-product requirements.
- Do treat blockers as useful evidence that a release gate has real stopping power.
- Do treat `PASS_WITH_GAPS` as "no blocker failed, but evidence is incomplete", not as a production safety guarantee.

## Follow-Up

The main product follow-up is a v1.5.x report clarity improvement: make reports even clearer about whether an item is a confirmed vulnerability, untriaged scanner finding, production evidence gap, maintainer decision, or environment/tooling issue.
