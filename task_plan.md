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

## Post-Release: v1.4.0 Promotion and v1.4.1 Candidate

## Objective

Complete lightweight post-release follow-up for `v1.4.0`: record the first-run ENOLOCK friction as a small patch candidate and promote the new quickstart entrypoint.

## Stages

1. Run external npm smoke for `ai-project-maintainer@1.4.0`. Status: complete.
2. Record ENOLOCK as a `v1.4.1` candidate. Status: complete.
3. Prepare launch/promotion copy centered on `npx ai-project-maintainer quickstart .`. Status: in_progress.

## Current Post-Release Stage

Stage 3 is in progress: prepare concise promotion copy for the published quickstart release.

## Implementation: v1.4.1 First-Run Environment Resilience

## Objective

Implement a small `v1.4.1` patch that keeps `v1.4.0` quickstart promotion moving while improving first-run behavior around environment gaps.

## Scope

- Treat quickstart-only npm `ENOLOCK` audit failures as a non-blocking setup/evidence gap when no lockfile exists.
- Keep full gate behavior stricter so release readiness can still require dependency audit evidence.
- Preserve Trivy DB/download failures as scanner/database availability gaps rather than vulnerability findings.
- Update local skill/docs so the first entrypoint is `npx ai-project-maintainer quickstart .` and strict gate runtime expectations are clear.
- Bump package metadata and release verification scripts to `1.4.1`.

## Out of Scope

- New connectors, scanners, benchmark cases, or CI scaffolding.
- Publishing or changing private local project details.
- Changing quickstart's report-only write boundary.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Add focused failing tests for quickstart ENOLOCK behavior, strict Trivy wording, skill quickstart docs, and release metadata. Status: complete.
3. Implement quickstart first-run audit-gap handling and clearer environment messages. Status: complete.
4. Update docs, skill entrypoint, and v1.4.1 release metadata. Status: complete.
5. Run targeted and full verification. Status: complete.

## Current Implementation Stage

All v1.4.1 environment resilience implementation stages are complete on branch `codex/v1.4.1-env-resilience`.

## Implementation: v1.4.2 Trivy DB Resilience

## Objective

Make first-run and quickstart usage resilient when Trivy cannot download its vulnerability database from the network.

## Scope

- Stop forcing a single GHCR Trivy DB source when users have not configured one.
- Allow multiple Trivy DB repository values when users configure mirrors.
- Retry Trivy with the local cached database when the online DB update fails.
- Keep quickstart non-blocking when cached Trivy evidence is available, while preserving stricter release-gate evidence semantics.
- Document the user-facing fix and bump release metadata to `1.4.2`.

## Out of Scope

- Adding new scanners or connectors.
- Mirroring Trivy DB inside this package.
- Claiming cached vulnerability evidence is equivalent to a freshly updated release scan.

## Stages

1. Inspect current Trivy behavior and record the product fix. Status: complete.
2. Add focused tests for default repository handling, cache fallback, strict evidence behavior, and docs. Status: complete.
3. Implement Trivy DB fallback and cache retry. Status: complete.
4. Update docs and release metadata. Status: complete.
5. Run targeted and release verification. Status: complete.

## Current Implementation Stage

All v1.4.2 Trivy DB resilience implementation stages are complete on branch `codex/v1.4.2-trivy-db-resilience`.

## Implementation: v1.4.3 Quickstart Semgrep Calibration

## Objective

Tune quickstart first-run severity so selected Semgrep supply-chain hardening recommendations do not make mature public projects appear failed on first contact.

## Scope

- Keep Semgrep enabled in quickstart.
- Downgrade selected Semgrep supply-chain hardening findings to non-blocking warnings only in quickstart/first-run mode.
- Preserve strict release-gate behavior: the same Semgrep findings still block release gates.
- Keep concrete code/security Semgrep findings blocking in quickstart.
- Bump release metadata to `1.4.3` and add release notes.

## Out of Scope

- Disabling Semgrep.
- Changing strict release policy.
- Adding new scanners, connectors, or benchmark cases.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Add focused tests for quickstart Semgrep hardening downgrade and strict gate preservation. Status: complete.
3. Implement Semgrep result classification and quickstart-only downgrade. Status: complete.
4. Update release metadata and docs. Status: complete.
5. Run targeted and full verification. Status: complete.

## Current Implementation Stage

All v1.4.3 quickstart Semgrep calibration stages are complete on branch `codex/v1.4.3-quickstart-semgrep-calibration`.

## Implementation: v1.4.4 Windows Release Verify Shim

## Objective

Fix local Windows published-release verification after v1.4.3, where `spawnSync("npm.cmd")` can fail with `EINVAL` even though `npm.cmd` exists.

## Scope

- Keep release verification shell-free from Node's `spawnSync` options.
- Route Windows `npm.cmd` through `cmd.exe /d /s /c call npm.cmd ...`, matching the existing command-runner shim pattern.
- Leave `git`, `gh`, and non-Windows commands unchanged.
- Bump release metadata to `1.4.4` and add release notes.

## Out of Scope

- Changing quickstart/Semgrep behavior.
- Changing the GitHub Actions trusted publishing workflow.
- Adding new scanners or connectors.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Add focused release verification tests. Status: complete.
3. Implement Windows npm shim target handling. Status: complete.
4. Update release metadata and docs. Status: complete.
5. Run focused/full verification and publish. Status: complete.

## Current Implementation Stage

All v1.4.4 Windows release verify shim stages are complete. `v1.4.4` is published on npm and GitHub Releases.

## Promotion: v1.4.4 Real Project Quickstart Smoke

## Objective

Run a lightweight promotion and validation batch for `ai-project-maintainer@latest` after v1.4.4, centered on `npx ai-project-maintainer quickstart .`.

## Scope

- Run npm latest quickstart against five public JavaScript/TypeScript repositories in temporary directories.
- Record only public, sanitized summary results.
- Add a public smoke summary doc and quickstart feedback issue template.
- Refresh promotion copy around the first-run quickstart CTA.

## Out of Scope

- Publishing a new package version unless a new first-run blocker is found.
- Adding scanners, connectors, or benchmark cases.
- Posting to external communities from maintainer-owned accounts.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Run npm latest real-project quickstart smoke. Status: complete.
3. Add sanitized smoke results and quickstart feedback template. Status: complete.
4. Refresh promotion copy. Status: complete.
5. Run verification and prepare PR. Status: complete.

## Current Promotion Stage

All v1.4.4 promotion smoke stages are complete. PR #22 is merged; no npm release was needed because this was documentation and issue-template work only.

## Research: v1.5.0 Production Accident / Data Exposure Gate

## Objective

Research and design the next major product upgrade: a production-incident and data-exposure gate that turns business boundaries into concrete evidence, checks, blockers, gaps, and AI repair tasks.

## Scope

- Compare the desired product floor against primary security and software supply-chain standards.
- Map common AI-coded production accident categories to actionable gate checks.
- Inspect the current tool's existing coverage and identify remaining product gaps.
- Produce a practical v1.5.0 design that improves on the baseline without claiming absolute safety.

## Out of Scope

- Implementing v1.5.0 production code in this research phase.
- Adding new connectors, scanners, or benchmark categories before the gate design is clear.
- Claiming compliance certification, absolute security, or protection against 0day, professional attackers, malicious insiders, or targeted supply-chain attacks.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Research primary standards and incident classes. Status: complete.
3. Inspect current implementation coverage and gaps. Status: complete.
4. Draft the v1.5.0 gate design, acceptance criteria, and implementation sequence. Status: complete.

## Current Research Stage

All v1.5.0 production accident / data exposure gate research stages are complete on branch `codex/v1.5-production-gate-research`.

## Implementation: v1.5.0 Production Accident / Data Exposure Gate

## Objective

Implement the production accident and data exposure gate described in the v1.5.0 execution plan.

## Scope

- Add structured production safety intake for data boundaries and authorization matrix.
- Extend business-flow safety evidence with idempotency, replay safety, side effects, and abuse controls.
- Make production strict release gates block missing data/auth/business-flow/database safety evidence while keeping quickstart low-friction.
- Ensure repair-pack treats production data/auth gaps as maintainer decisions or manual review, not AI guesswork.
- Update documentation and release metadata to `1.5.0`.

## Out of Scope

- New scanners or connectors.
- Cloud write operations or production mutations.
- Claims of absolute security or resistance to professional targeted attacks.

## Stages

1. Prepare implementation context and planning files. Status: complete.
2. Add focused failing tests for new intake templates, production gate behavior, quickstart behavior, repair-pack task typing, and release metadata. Status: complete.
3. Implement intake model, audit plan checks, and production gate blocking rules. Status: complete.
4. Update repair-pack, docs, and release metadata. Status: complete.
5. Run focused and full verification. Status: complete.

## Current Implementation Stage

All v1.5.0 production accident / data exposure gate implementation stages are complete on branch `codex/v1.5-production-gate-research`.

## Promotion: v1.5.0 Production Gate Smoke Docs

## Objective

Document the published v1.5.0 strict production gate smoke against real public projects and refresh the promotion copy without overstating untriaged scanner findings as confirmed upstream vulnerabilities.

## Scope

- Add `docs/PRODUCTION-GATE-SMOKE.md` with sanitized smoke results.
- Update `docs/PROMOTION.md` with v1.5.0 production-gate messaging.
- Keep public wording clear that blocker classes are release-gate findings, evidence gaps, or maintainer-triage items, not confirmed vulnerabilities unless separately validated.
- Preserve `.serena/` as untracked local metadata.

## Out of Scope

- Publishing a new package version.
- Opening upstream vulnerability reports.
- Committing full raw smoke reports, local temp paths, or private project details.
- Adding scanners, connectors, or code behavior changes.

## Stages

1. Prepare branch and planning files. Status: complete.
2. Add sanitized production gate smoke documentation. Status: complete.
3. Refresh promotion copy and fix readable Chinese messaging. Status: complete.
4. Run documentation hygiene checks. Status: complete.

## Current Promotion Stage

All v1.5.0 production gate smoke documentation stages are complete on branch `codex/v1.5-production-smoke-docs`.

## Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Focused red tests failed because `yaml-support.mjs` does not exist yet. | 1 | Expected red test for local dependency guidance; implement helper next. |
| Quickstart ENOLOCK fixture still produced `FAIL` and a repair-pack. | 1 | Expected red test; add quickstart-only setup-gap behavior. |
| Skill quick start and package version assertions still reflected `v1.4.0`. | 1 | Expected red test; update docs and metadata in Stage 4. |
| Full `npm test` failed because a release manifest fixture still used `1.4.0` while package metadata was `1.4.1`. | 1 | Updated the fixture to `1.4.1` and re-ran release-trust tests. |
| Real-project v1.4.3 smoke still blocked Semgrep hardening findings. | 1 | Found Semgrep JSON was truncated before rule parsing; added per-command output limit and used a larger limit for Semgrep JSON. |
| Local Windows published-release verification failed with `spawnSync npm.cmd EINVAL`. | 1 | Added a Windows npm target shim that invokes `cmd.exe /d /s /c call npm.cmd ...` without using `shell: true`. |
| Real-project smoke script aborted during `git clone` progress output. | 1 | PowerShell treated native stderr progress as an error under stop mode; rerun without stop-on-stderr and rely on process exit codes. |

## Promotion: v1.5.0 External Launch Support

## Objective

Help turn the merged v1.5.0 production-gate promotion materials into external launch posts while preserving trust boundaries and avoiding unapproved account-side effects.

## Scope

- Use the already-merged `docs/PROMOTION.md` copy as the source of truth.
- Keep the CTA centered on `npx ai-project-maintainer quickstart .`.
- Mention strict production gate as the advanced path, not the first command for unfamiliar users.
- Preserve the boundary that smoke blockers are release-gate findings, evidence gaps, or maintainer-triage items, not automatically confirmed upstream vulnerabilities.
- Require explicit platform/account confirmation before posting externally.

## Out of Scope

- Posting from the maintainer's accounts without explicit platform confirmation.
- Adding product features or releasing a new package version.
- Opening upstream vulnerability reports based only on untriaged smoke output.

## Stages

1. Recover merged docs and current repository state. Status: complete.
2. Sync planning files with PR #24 merge and v1.5.1 follow-up issue. Status: complete.
3. Confirm target external platform or prepare paste-ready launch copy. Status: in_progress.

## Current Promotion Stage

Stage 3 is in progress. External posting is ready to proceed once the user names the platform/account context.

## Implementation: v1.5.1 Report Clarity and First-Run Trust

## Objective

Complete GitHub issue #25 and make an unfamiliar developer understand the product, report result, and next action within 30 seconds.

## Scope

- Add an additive finding classification to JSON, Markdown, repair-pack, and conservative SARIF wording.
- Preserve v1.5.0 blocking behavior and quickstart's low-friction behavior.
- Reduce the first half of README by roughly 50% and lead with the quickstart outcome.
- Add one real before/after report image generated from committed benchmark output.
- Create an ethical recruitment and structured feedback loop for 5-10 unfamiliar developers.

## Out of Scope

- New scanners, connectors, benchmark categories, or gate strictness changes.
- Treating untriaged scanner output as a confirmed upstream vulnerability.
- Inventing user interviews or posting unsolicited comments to unrelated repositories.

## Stages

1. Inspect issue #25 and current report/readme/feedback surfaces. Status: complete.
2. Add focused tests and implement report evidence categories. Status: complete.
3. Rewrite the README first half and generate a real report image. Status: complete.
4. Add tester recruitment and feedback synthesis materials. Status: complete.
5. Run focused/full verification, publish a PR, and track real-user responses. Status: in_progress.

## Current Stage

Stage 5 is in progress on branch `codex/v1.5.1-report-clarity`.

## v1.5.1 Errors Encountered

| Error | Attempt | Resolution |
| --- | --- | --- |
| Focused tests failed because finding categories were not implemented yet. | 1 | Expected red tests; added the shared finding-kind module and report/quickstart/repair-pack integration. |
| In-app browser rejected the local `file://` SVG preview. | 1 | Did not bypass browser policy; kept the exact, auditable SVG as the GitHub-rendered README image and validated its source structure. |
| Large README patch contexts failed around Windows paths and a UTF-8 link. | 3 | Switched to smaller scoped patches with exact escaping and UTF-8 text. |
| Two focused docs tests expected legacy README phrasing. | 1 | Preserved the trusted link labels and exact upstream-boundary wording in the shorter README. |
