# Findings

## Release State

- The repository is currently on `main` at tag `v1.3.0`.
- npm reports `ai-project-maintainer@1.3.0` as the latest published version.
- GitHub Release `v1.3.0` exists and was published on 2026-07-06.
- Latest GitHub Actions runs for `Publish`, `CI`, and `Security` completed successfully.
- Release assets are present: npm tarball, SBOM, release manifest, security report JSON/Markdown, and SARIF.
- Local git status shows an untracked `.serena/` directory only; this appears to be local tool metadata, not product work.

## Product Direction

- v1.3.0 is complete; the next phase should not be another large feature by default.
- The highest-leverage next work is post-release validation, public-facing polish, and real-user field testing.
- The strongest current positioning is the full loop: project profile -> audit plan -> gate -> evidence report -> AI repair pack -> benchmark.
- The project should keep emphasizing that `PASS_WITH_GAPS` is not a production safety guarantee.

## Public-Facing Gaps

- `docs/PROMOTION.md` still references an older release link (`v0.4.1`) in the "Links To Share" section.
- `docs/GITHUB-LAUNCH-CHECKLIST.md` still contains old v0.3.0 launch release text.
- These are not code defects, but they matter because v1.3.0 is now published and the next step is promotion.

## Candidate Next Priorities

1. Run a clean external `npx ai-project-maintainer@1.3.0` smoke check outside the source checkout.
2. Update stale launch/promotion docs to v1.3.0 and benchmark-era messaging.
3. Use the promotion kit to publish a concise launch post that links GitHub, npm, v1.3.0 release, and benchmark docs.
4. Field-test against 2-3 real projects and record friction, false positives, missed checks, and confusing report language.
5. Shape v1.4.0 around first-run polish, report clarity, connector validation examples, and adoption feedback.

## Selected Cleanup

- Update stale public documentation before wider promotion:
  - `docs/PROMOTION.md`
  - `docs/GITHUB-LAUNCH-CHECKLIST.md`
- This is the smallest concrete post-release task because it aligns public links and launch copy with the already-published v1.3.0 release.

## Verification Findings

- No `v0.4.1` or `v0.3.0` references remain in `docs/PROMOTION.md` or `docs/GITHUB-LAUNCH-CHECKLIST.md`.
- `docs/PROMOTION.md` contains links to the v1.3.0 release, English benchmark doc, and Chinese benchmark doc.
- `git diff --check` reported no whitespace errors for the touched files.
- The only verification warnings were Git line-ending notices about LF being converted to CRLF when Git next touches the files.

## Roadmap Evaluation: 2026-07-06

- The proposed `v1.3.1` trust-expression patch is justified. Current benchmark language says it uses real open source risk patterns and public upstream evidence, but README and benchmark summaries can still be read too casually as if this project repaired upstream projects.
- `docs/BENCHMARK.md` currently has a `Category | Case | Evidence` table. It does not yet include the proposed `Evidence type` column.
- `ai-project-maintainer/scripts/verify-release.mjs` currently calls `spawnSync(command, args, ...)` and `verifyPublished` calls `runJson(runner, "npm", ...)`. On Windows, `npm` may need `npm.cmd` when spawned without a shell.
- The same verifier should preserve non-shell execution, but resolve command shims explicitly where needed and surface `spawnSync` `error.message` when process creation fails.
- `v1.4.0` should focus on a first-run path instead of more platform coverage. A `quickstart` command is more valuable now than additional connectors because the product already has many capabilities but needs a lower-friction first success path.

## Recommended Roadmap

1. `v1.3.1`: trust-expression and Windows compatibility patch.
   - Clarify README benchmark boundaries.
   - Add `Evidence type` to benchmark tables and generated summaries.
   - Add a "How to interpret the benchmark" section.
   - Fix Windows `npm.cmd` command resolution in release verification and add a focused test.
2. `v1.4.0`: First Real User Experience.
   - Add `npx ai-project-maintainer quickstart .`.
   - Auto-detect profile, explain what will run, execute a lightweight gate, summarize must-fix items, generate repair-pack for blockers, and tell users which files to hand to an AI agent.
3. `v1.5.0`: stronger benchmark evidence.
   - Upgrade selected cases from static sanitized snippets to temporary shallow-clone or pinned-ref evidence extraction where safe and practical.
4. `v1.6.0`: real-user feedback loop.
   - Add issue/report intake that helps users share sanitized reports and first-run friction.

## v1.3.1 Implementation Findings

- Current branch was `main` with existing uncommitted planning and promotion-doc changes; implementation branch `codex/v1.3.1-trust-windows` was created to avoid continuing feature work directly on `main`.
- `verify-release.mjs` currently calls `spawnSync(command, args, ...)` and `verifyPublished` passes `"npm"` directly.
- Existing release trust tests inject a `runner(command, args)` function, so focused tests can cover command resolution by exporting a helper and testing failure text through a simulated runner.
- `examples/benchmark-cases/run-benchmark-cases.mjs` owns benchmark metadata, generated `case-summary.md`, generated `benchmark-summary.md`, and committed docs when run with `--update-docs`.
- `docs/BENCHMARK.md`, `docs/BENCHMARK.zh-CN.md`, README, and committed `docs/benchmark-output/**/case-summary.md` need trust-boundary wording.
- `resolveSpawnCommand` now keeps release verification shell-free while resolving only `npm` to `npm.cmd` on Windows.
- Benchmark metadata, generated case summaries, benchmark summaries, and case metadata now include `evidenceType`.
- README, English/Chinese Benchmark docs, promotion docs, launch checklist, package metadata, and release notes are aligned to the v1.3.1 trust-language patch.
- Legacy `docs/cases` snapshots were regenerated so the case summaries carry the same evidence type and upstream-boundary wording as the broader benchmark output.

## v1.4.0 Quickstart Implementation Findings

- `ai-project-maintainer/scripts/cli.mjs` owns CLI parsing and sync/async dispatch; `quickstart` should be added there as a new first-class command.
- `runLocalGate` already supports all lightweight mode switches needed for quickstart, including `noTests`, `agentRisk`, `profile`, `writeReports`, and custom output paths.
- Project detection and profile selection already run inside `runLocalGate`; quickstart can use the returned report to explain the detected profile and matched signals.
- `writeReportFiles` writes JSON, Markdown, and SARIF when given `reports/quickstart-security-report.json`, so quickstart does not need a new report writer.
- `runRepairPack(reportPath, { projectRoot, outputDir })` can generate the AI handoff files under `reports/quickstart-repair-pack` after the gate report is written.
- The first-run summary needs to be smaller than the existing full report markdown and should include what ran, what was skipped, counts, top blockers, handoff files, and the later full gate command.
- Default `quickstart` should return `0` after successful output generation even when blockers are present; only usage/runtime failures should return `2`.

## v1.4.0 Verification Findings

- `quickstart` now writes only under `reports/` in the target project and leaves `.ai-maintainer` and `.github` untouched.
- The default quickstart gate uses auto profile detection, AI agent risk checks, non-strict/non-release/non-production mode, no connectors, and `noTests: true`.
- Blocker reports generate `reports/quickstart-repair-pack/` while the CLI still exits `0` after successful report generation.
- README, install docs, demo docs, launch checklist, promotion copy, package metadata, and release notes now point to the v1.4.0 quickstart release.
- Full verification passed:
  - `node --test test/quickstart.test.mjs test/cli.test.mjs`
  - `node --test test/release-trust.test.mjs`
  - `node --test test/demo-and-security-workflow.test.mjs`
  - `npm test`
  - `npm run check`
  - `npm pack --dry-run`
  - `npm run release:verify:pre`
  - `git diff --check`
- `git diff --check` printed only Git line-ending conversion warnings and no whitespace errors.

## v1.4.0 Post-Release Smoke Findings

- `v1.4.0` was published to npm and GitHub Releases.
- External npm smoke with `npx ai-project-maintainer@1.4.0 quickstart .` succeeded outside the source checkout.
- A fresh `npm init -y` project without `package-lock.json` makes `npm audit --omit=dev --json` fail with `ENOLOCK`, which quickstart currently reports as a blocker.
- A clean external npm project with `package-lock.json` generated by `npm install --package-lock-only` produced `PASS_WITH_GAPS`, `Blockers: 0`, the expected quickstart report files, and no repair-pack.
- ENOLOCK is recorded as GitHub issue #16 and should be considered a `v1.4.1` first-run polish candidate rather than a `v1.4.0` release blocker.

## v1.4.1 Environment Resilience Findings

- Current branch started from `main` with planning-file changes already present and `.serena/` untracked; implementation branch `codex/v1.4.1-env-resilience` was created to keep product edits off `main`.
- `runPackageAuditChecks` currently runs `npm audit --omit=dev --json` when `package.json` exists, even if no `package-lock.json` exists. In quickstart this can turn npm `ENOLOCK` into a blocker and generate a repair-pack for a setup gap.
- `runLocalGate` already accepts arbitrary options and passes them to registered checks, so quickstart can pass a private first-run flag without adding a public CLI option.
- Trivy filesystem failures that look like DB/download/timeouts are already normalized from `fail` to `error` and marked as `coverageGap`; v1.4.1 should preserve that and make strict-mode wording explicit.
- The installed/local skill quick start still starts with `doctor`, `init`, `init-audit`, and `audit-plan`; it should now start with `npx ai-project-maintainer quickstart .` to match v1.4.0 positioning.
- `package.json` already includes `yaml`, so the npm package path is healthy. The local skill dependency issue should be explained as a local installation/dependency problem and routed to npm usage or dependency install.
- `runLocalGate` did not initially pass the internal `firstRun` flag to registered checks, so quickstart audit behavior still used full-gate semantics until the flag was threaded through.
- Focused tests now confirm quickstart no-lockfile npm audit setup gaps produce `PASS_WITH_GAPS`, no blockers, and no repair-pack, while lockfile-backed audit failures still generate a repair-pack.
- `npm test`, `npm run check`, `npm pack --dry-run`, `npm run release:verify:pre`, and `git diff --check` passed for `v1.4.1`. `git diff --check` printed only Windows LF-to-CRLF conversion warnings.
- A final search found no remaining static `import YAML` statements under `ai-project-maintainer/scripts`; YAML use now goes through the local dependency helper.

## v1.4.2 Trivy DB Resilience Findings

- Local testing showed the current failure is environmental: GHCR starts downloading `trivy-db` but is too slow for the current timeout, `mirror.gcr.io` times out, and public ECR/CloudFront DNS fails on this machine.
- The current product default forces `--db-repository ghcr.io/aquasecurity/trivy-db:2`, overriding Trivy's built-in multi-repository fallback.
- Trivy can scan successfully on this machine when a local DB cache exists and DB updates are skipped.
- The product fix should make first-run robust by using Trivy's built-in repository fallback by default, supporting configured mirror lists, and retrying with cached DB when the online update fails.
- A cached DB fallback should produce `PASS_WITH_GAPS` in non-strict quickstart, but strict release gates should still surface stale/incomplete DB freshness as blocking evidence.

## v1.4.3 Quickstart Semgrep Calibration Findings

- Real project smoke after v1.4.2 showed quickstart now runs reliably and Trivy passes, but three public npm projects still failed first-run quickstart because Semgrep reported supply-chain hardening recommendations as blockers.
- Observed Semgrep rule families were GitHub Actions mutable tags, Dependabot missing cooldown, and npm missing minimum release age.
- These are legitimate release hardening recommendations, but they are too aggressive as first-run quickstart blockers for unfamiliar users.
- The fix should be quickstart-only and rule-specific. Strict release gates must continue to block Semgrep failures.
- Follow-up smoke with local v1.4.3 code showed the first implementation still blocked because Semgrep JSON output was truncated to the command-runner tail limit before rule IDs were parsed.
- After increasing Semgrep's captured JSON output limit, real-project smoke on `expressjs/cors`, `sindresorhus/p-limit`, and `unjs/defu` produced `PASS_WITH_GAPS` with zero blockers and no quickstart repair pack while keeping Semgrep findings visible as warnings.

## v1.4.4 Windows Release Verify Findings

- `v1.4.3` published successfully through GitHub Actions trusted publishing and npm now reports `latest` as `1.4.3`.
- Local Windows published-release verification still fails when invoking `npm.cmd` directly with `spawnSync`, returning `EINVAL`.
- Direct local probes confirm `spawnSync("npm")` returns `ENOENT`, `spawnSync("npm.cmd")` returns `EINVAL`, and `spawnSync("cmd.exe", ["/d", "/s", "/c", "call", "npm.cmd", "--version"])` succeeds.
- The release verifier should route only Windows npm calls through `cmd.exe call` while keeping `shell: true` disabled and leaving `git`/`gh` unchanged.

## v1.4.4 Promotion and Real-Project Smoke Findings

- npm reports `ai-project-maintainer@latest` as `1.4.4`.
- The repository already has issue templates for bug reports, feature requests, and production evidence gaps, but not a low-friction quickstart feedback template.
- `docs/PROMOTION.md` is already centered on quickstart and v1.4.4 links, but its Chinese draft text is mojibake and should be replaced with readable copy.
- The real-project smoke batch should record only sanitized summaries, not full report contents or local temp paths.
- Real-project smoke using `npx -y ai-project-maintainer@latest quickstart .` completed with exit code `0` for all five repos.
- `sindresorhus/p-limit`, `unjs/defu`, `expressjs/cors`, and `chalk/chalk` produced `PASS_WITH_GAPS`, zero blockers, and no repair pack.
- `sindresorhus/execa` produced `FAIL` with one Semgrep blocker and a repair pack. The blocker includes code-level `javascript.lang.security.detect-child-process.detect-child-process` findings in child process execution paths, so it should be recorded as maintainer triage rather than an environment failure.

## v1.5.0 Production Accident / Data Exposure Gate Research Findings

- The desired product floor is not "absolute security"; it is a practical production-safety floor for AI-coded products against common mistakes, low-skill attacks, configuration gaps, data exposure, database accidents, and ordinary operational failures.
- The upgrade should treat user business descriptions as input, not proof. The gate must convert descriptions into required evidence: tests, checks, repair tasks, blockers, gaps, or explicit user decisions.
- `ai-project-maintainer` should remain the evidence orchestrator and release gate. Specialist tools, including Codex Security-style attack review, should be treated as evidence sources rather than replacements for the gate.
- The research should use primary standards and official guidance first: OWASP, NIST, CISA, OpenSSF/SLSA, and relevant official cloud/application security references.
- OWASP ASVS is the right verification backbone because it is explicitly a basis for testing web application technical security controls and secure-development requirements.
- OWASP API Security Top 10 directly supports the user's biggest concern: Broken Object Level Authorization says endpoints that accept object IDs need object-level authorization checks, and failures can expose, modify, or destroy unauthorized data.
- OWASP Authorization Testing Automation recommends formalizing an authorization matrix and driving integration tests from it. That maps well to a v1.5.0 `roles x resources x actions x data scope` evidence file.
- OWASP API6:2023 "Unrestricted Access to Sensitive Business Flows" covers non-exploit abuse of legitimate flows such as buying inventory, spam posting, or reserving all slots. This is important because the user's baseline explicitly includes low-skill misuse, not only vulnerabilities.
- OWASP Logging guidance says logs can contain personal and sensitive information and may need exclusion, masking, sanitization, hashing, or encryption. v1.5.0 should treat sensitive logging as a data-exposure class, not only as observability.
- NIST Privacy Framework is a fit for privacy/data-exposure framing because it is intended to help organizations identify and manage privacy risk while protecting individuals' privacy.
- NIST SSDF supports the release-gate model: secure practices should be integrated into the SDLC to reduce vulnerabilities, mitigate impact, and address root causes.
- NIST CSF 2.0 supports operational readiness because prevention, detection, response, and recovery are all continuous or ready-at-all-times functions, not one-time scans.
- SLSA and OpenSSF Scorecard remain relevant but are not enough for this upgrade. They cover build integrity, provenance, dependency and repo health; v1.5.0 needs business/data/authorization evidence above that layer.
- OWASP Top 10:2025 keeps Broken Access Control as the top risk and explicitly links access failures to unauthorized disclosure, modification, destruction, or business actions outside limits.
- OWASP Top 10:2025 Security Logging and Alerting Failures directly supports requiring alert use cases and avoiding sensitive data in logs.
- CISA Secure by Design supports shifting security burden away from the end user and toward the product maker. For this product, that means the tool should not expect a solo founder to manually infer every production safety checklist item.
- OWASP LLM Top 10 and NIST AI RMF support an AI-repair safety layer: LLM output needs validation, sensitive disclosure must be controlled, excessive agency is a risk, and AI risk management should be built into design, development, use, and evaluation.
- Current `audit-plan.mjs` already covers intake presence, project profile, critical business flows, business-flow tests, CI, release approval, observability, database migration review, backup, rollback, and profile-specific checks.
- Current `init-audit` / `intake-wizard` already asks about auth, sensitive data, payments, financial data, health data, user-generated content, database, deployment, monitoring, critical flows, public API, file uploads, admin roles, CORS, database concurrency, and audit logs.
- Current production gate can convert audit `GAP` and `USER_DECISION` items into report checks. By default these are non-blocking; `risk-policy.yml` can make coverage gaps and user decisions blocking.
- Current `repair-pack` already converts production gaps and user decisions into `needs_maintainer_decision` tasks and warns agents not to invent evidence or accept production risk.
- The main v1.5.0 gap is not missing scanner coverage. It is missing a structured production-safety model for:
  - data inventory and sensitivity classes;
  - roles, permissions, object ownership, and tenant isolation;
  - endpoint/action authorization matrix;
  - sensitive-field response and log redaction rules;
  - critical business-flow abuse controls, idempotency, and duplicate execution protection;
  - database write safety beyond migration backup/rollback;
  - AI repair invariants that block "fixes" which remove auth, validation, tests, audit logs, or error handling.
- The current reporting schema can carry these as additive checks without breaking existing consumers: new groups such as `data-exposure`, `auth-boundary`, `business-flow-safety`, `database-safety`, `operational-safety`, and `ai-repair-safety` can feed `buildJsonReport` and `repair-pack`.
- Added `docs/PRODUCTION-GATE-RESEARCH.zh-CN.md` as the implementation design input. It recommends adding `data-boundaries.yml`, `authz-matrix.yml`, and an extended `business-flows.yml` schema, while keeping quickstart non-blocking and making production strict release gates block missing data/auth/business-flow evidence.
- The proposed standard is stronger than the user's baseline for common non-advanced accidents because it turns missing data, authorization, business-flow, database, operational, and AI-repair evidence into explicit blockers or maintainer decisions.
- The proposed standard still does not claim protection against professional attackers, 0day, malicious insiders, targeted supply-chain compromise, or incorrect/incomplete business descriptions.

## v1.5.0 Implementation Findings

- Current branch is `codex/v1.5-production-gate-research` and already contains the research/planning docs that should be included in the implementation PR.
- `package.json` is at the repository root, not under `ai-project-maintainer/`; release metadata updates must touch the root `package.json` and `package-lock.json`.
- Existing `runLocalGate` only builds `audit` when `options.production` is true. Therefore quickstart, which sets `production: false`, will not block on the new production model as long as new checks are attached to `audit-plan`/production audit behavior.
- Existing `productionAuditChecks` maps audit `GAP` and `USER_DECISION` to `production-audit` checks and uses `risk-policy.yml` to decide whether they block.
- Existing `repair-pack` treats `production-audit` and coverage gaps as maintainer-decision tasks, so v1.5.0 can reuse that behavior and only needs tightening if new groups need manual review semantics.
- Focused v1.5.0 tests now confirm the new intake templates, data/auth YAML parsing, production strict blockers, quickstart non-blocking production-readiness gaps, and repair-pack maintainer-owned task typing.
- Documentation and release metadata are aligned to `1.5.0`; a stale-version search found no unexpected `v1.4.4` references outside historical smoke/research/release documents.
- Documentation hygiene checks found no mojibake markers in the updated README, promotion copy, report schema, standards crosswalk, repair-pack docs, local gate reference, or quickstart feedback template.
- Full verification passed for v1.5.0: focused tests, `npm test`, `npm run check`, `npm pack --dry-run`, `npm run release:verify:pre`, and `git diff --check`.
- Production accident report checks now use focused groups (`data-exposure`, `auth-boundary`, `business-flow-safety`, `database-safety`, `operational-safety`, `ai-repair-safety`) instead of flattening all new production risks into `production-audit`.
