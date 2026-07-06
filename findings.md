# Findings

## Stage 1

- Current branch baseline is `origin/main` at v1.2.1.
- Existing `examples/oss-case-studies/run-oss-case-studies.mjs` covers two cases only: SiYuan Electron RCE and Ghost SQL injection.
- Existing case runner already builds APM-style JSON/Markdown reports with `buildJsonReport` and `toMarkdown`.
- Existing case runner does not generate repair-pack outputs.
- Existing `repair-pack` code can consume these generated reports without needing a real project checkout.
- Existing `cases:verify` and tests must remain compatible.

## Implementation Direction

- Create `examples/benchmark-cases/run-benchmark-cases.mjs`.
- Make `examples/oss-case-studies/run-oss-case-studies.mjs` a compatibility wrapper over the benchmark runner's real OSS subset.
- Add benchmark outputs under `docs/benchmark-output/`.
- Keep old `docs/cases/` snapshots available for existing links.

## Stage 2

- The benchmark runner can generate all five categories and write repair-pack outputs from each before report.
- The compatibility wrapper now removes benchmark-only files from legacy `docs/cases/` output, keeping the old case-study area readable.
- External URL checks found corrected links were needed for tj-actions and TanStack; the runner now uses GitHub Advisory Database / CISA / TanStack postmortem URLs that resolve.
- Repair-pack generation must use relative report paths inside each case directory to avoid leaking local machine paths into `fix-plan.md`.
