# Task Plan

## Objective

Plan and execute the post-v1.3.0 follow-up for `ai-project-maintainer`.

The immediate goal is to move from "v1.3.0 shipped" to a clear next-work queue: verify the public release, fix obvious public-facing stale docs, and choose the next product iteration based on adoption risk rather than adding features by default.

## Scope

- Use the `planning-with-files` workflow as the persistent task memory.
- Confirm the current release and repository state.
- Record findings about what should happen next.
- Prioritize the next concrete work items after v1.3.0.
- Keep `task_plan.md`, `findings.md`, and `progress.md` updated after each stage.

## Out of Scope

- Building a complex GUI.
- Adding write-capable production platform connectors.
- Repositioning the tool as a compliance certification or security guarantee.
- Rewriting unrelated code while planning the next phase.

## Stages

1. Recover existing planning context and inspect current release state. Status: complete.
2. Capture findings about release status, public docs, and next priorities. Status: complete.
3. Decide and queue the next concrete implementation task. Status: complete.
4. If a small low-risk cleanup is clearly identified, implement it and verify. Status: complete.

## Current Stage

All planned stages for this task are complete. The stale launch and promotion docs now match the published v1.3.0 release and benchmark-era messaging.

## Roadmap Decision: 2026-07-06

## Objective

Evaluate the proposed next roadmap and decide whether to prioritize `v1.3.1` trust/Windows compatibility work before the larger `v1.4.0` first-user experience.

## Stages

1. Recover current planning context. Status: complete.
2. Check whether the proposed `v1.3.1` issues are real in the current tree. Status: complete.
3. Record the recommended roadmap order. Status: complete.

## Recommendation

Accept the proposed order:

1. `v1.3.1`: trust-expression patch plus Windows release verification compatibility.
2. `v1.4.0`: First Real User Experience centered on `npx ai-project-maintainer quickstart .`.
3. `v1.5.0`: deeper benchmark evidence from pinned refs or shallow clones.
4. `v1.6.0`: real-user feedback and sanitized report intake.

This differs from the earlier post-release plan by inserting a small corrective patch before promotion and field testing. That is the better order because trust-language ambiguity and local release verification issues can undermine adoption even if the larger product direction is right.

## Implementation: v1.3.1 Trust Language + Windows Release Verify

## Objective

Implement the `v1.3.1` patch that clarifies benchmark trust boundaries and fixes Windows `npm.cmd` resolution in published-release verification.

## Scope

- Clarify README, benchmark docs, generated benchmark summaries, and per-case summaries.
- Add `Evidence type` to benchmark metadata and generated outputs.
- Fix `verify-release.mjs` command resolution for `npm` on Windows while keeping shell-free execution.
- Bump package metadata to `1.3.1` and add release notes.
- Preserve existing uncommitted planning/promotion-doc changes and leave `.serena/` untouched.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Add focused failing tests for release verification and benchmark trust language. Status: complete.
3. Implement release verification Windows command resolution. Status: complete.
4. Update benchmark metadata, generated docs, README/docs, and release metadata. Status: complete.
5. Run targeted and full verification. Status: complete.

## Current Implementation Stage

All v1.3.1 implementation stages are complete on branch `codex/v1.3.1-trust-windows`.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Final release-doc check failed because launch checklist used generic `release manifest` wording while verification expected explicit asset names. | 1 | Updated the checklist to list `release-manifest.json` and `release-manifest.md`. |

## Implementation: v1.4.0 Quickstart First Real User Experience

## Objective

Implement `npx ai-project-maintainer quickstart .` as the low-friction first-run path for unfamiliar users.

## Scope

- Add a report-only `quickstart` CLI command.
- Reuse existing project detection, profile selection, local gate, report writer, and repair-pack generation.
- Default to lightweight settings: auto profile, agent-risk enabled, no strict/release/production/connectors, and tests skipped.
- Write only under the target project's `reports/` directory.
- Generate a short summary and repair-pack only when blockers exist.
- Update README/install/demo docs and release metadata to `1.4.0`.

## Out of Scope

- New connectors, scanners, or benchmark cases.
- CI scaffolding or `.ai-maintainer` creation.
- Changing the existing `gate`, `repair-pack`, or `init` command contracts beyond adding the new quickstart orchestration.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Add focused failing tests for quickstart parsing, outputs, non-invasive behavior, blocker repair-pack generation, exit code, and docs. Status: complete.
3. Implement the quickstart module and CLI dispatch. Status: complete.
4. Update README/docs and release metadata for v1.4.0. Status: complete.
5. Run targeted and full verification. Status: complete.

## Current Implementation Stage

All v1.4.0 quickstart implementation stages are complete on branch `codex/v1.4.0-quickstart`.
