# Local Security Gate: FAIL

Root: TanStack/query@before
Mode: strict=true, release=true, production=true
Profile: oss-library (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 75/100 (B)
Code Scanning Results: 1 (production evidence gaps stay in this report and artifacts by default)

## What This Report Actually Found
- Confirmed vulnerabilities: 0. Validated vulnerability evidence. This label is never inferred from scanner output alone.
- Untriaged scanner findings: 1. A scanner matched something that still needs project-specific validation.
- Verified check failures: 0. A deterministic test, build, or engineering check failed; this is not automatically a vulnerability.
- Production evidence gaps: 0. Required production proof is missing; this is missing proof, not a discovered vulnerability.
- Maintainer decisions: 0. Business context or risk acceptance must be supplied by a human maintainer.
- Environment or tooling issues: 0. A scanner, database, dependency, or local tool was unavailable, so evidence is incomplete.

## Project Profile
- Profile: oss-library
- Source: benchmark
- Matched profiles: none
- Risk focus:
  - TanStack npm package compromise postmortem
- Signals:
  - benchmark: https://tanstack.com/blog/npm-supply-chain-compromise-postmortem

## Blocking Checks
- [Untriaged scanner findings] npm package release workflow hardening: fail. Release workflow lacks the benchmarked post-compromise hardening controls.

## Warnings
- None

## Coverage Gaps
- None

## Production Audit
Project Type: oss-library
Database: false
CI: true

### Plan
- PASS Pinned public evidence: TanStack/query is represented by pinned advisory, release, postmortem, or hardening metadata.
- FAIL Benchmark risk transition: The before state intentionally models the public failure signal.

### Coverage Gaps
- None

### User Decisions
- None

## Evidence Levels
- INFERRED: 1
- TOOL_VERIFIED: 1

## Standards Crosswalk
- case-study/benchmark-upstream-evidence: None
- ci-security/npm-release-workflow-hardening: OpenSSF Scorecard, SLSA, Google SRE Release Engineering

## Tools
- ai-project-maintainer: 1.3.1-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- npm package release workflow hardening: fail [untriaged_scanner_finding] [TOOL_VERIFIED] (zizmor .github/workflows)

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.