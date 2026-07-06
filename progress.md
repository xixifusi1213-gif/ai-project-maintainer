# Progress

## 2026-07-06

- Created isolated branch/worktree `codex/v1.3.0-benchmark-cases` from latest `origin/main`.
- Inspected package scripts, old OSS case runner, repair-pack entrypoint, report builder, and case-study tests.
- Created planning workflow files for this implementation.
- Stage 1 complete.
- Added `examples/benchmark-cases/run-benchmark-cases.mjs`.
- Added five benchmark categories: Electron, Web/API, database, CI/supply-chain, and OSS library release hardening.
- Wrapped old `examples/oss-case-studies/run-oss-case-studies.mjs` around the benchmark runner for compatibility.
- Fixed repair-pack generation to use relative paths so benchmark output does not leak local user paths.
- `npm run benchmark:verify` passes locally.
- Generated committed benchmark snapshots under `docs/benchmark-output/`.
- Updated README, case-study docs, roadmap, benchmark docs, and v1.3.0 release notes.
- Added benchmark tests for metadata, generated reports, repair-pack outputs, sensitive text, and npm package inclusion.
- Targeted test batch passed: benchmark, old case studies, CLI version, demo workflow, and release trust tests.
- Added `npm run benchmark:verify` to CI and publish workflows.
- Targeted workflow tests passed after CI/publish integration.
- Full local verification passed:
  - `npm test`
  - `npm run check`
  - `npm run smoke:npm`
  - `npm run smoke:repair-loop`
  - `npm run cases:verify`
  - `npm run benchmark:verify`
  - `npm pack --dry-run`
  - `npm run release:verify:pre`
  - `git diff --check`
- Committed changes as `8134e43 Add public benchmark cases`.
- Pushed branch `codex/v1.3.0-benchmark-cases` to GitHub.
- Created PR #14: https://github.com/xixifusi1213-gif/ai-project-maintainer/pull/14
