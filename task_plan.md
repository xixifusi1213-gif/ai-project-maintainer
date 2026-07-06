# Task Plan

## Objective

Implement v1.3.0: real case library and public benchmark for `ai-project-maintainer`.

## Scope

- Add a benchmark runner that covers Electron, Web/API, database, CI/supply-chain, and OSS npm library risk.
- Generate before/after reports and repair-pack outputs for each benchmark case.
- Keep `cases:verify` compatible.
- Update docs, release notes, package version, and tests.

## Stages

1. Inspect existing OSS case runner, repair-pack output, report builder, and tests.
2. Add benchmark runner and compatibility wrapper.
3. Add docs and committed launch snapshots.
4. Add tests and package scripts.
5. Run full verification and publish v1.3.0 if CI is green.

## Current Stage

Implementation complete. Local verification passed. Next steps are commit, push, PR, CI/Security validation, tag, and Trusted Publishing.
