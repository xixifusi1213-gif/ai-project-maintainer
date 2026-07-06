# Local Security Gate: FAIL

Root: vercel/next.js@before
Mode: strict=true, release=true, production=true
Profile: web-api (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 75/100 (B)
Code Scanning Results: 1 (non-blocking production gaps stay in this report and artifacts)

## Project Profile
- Profile: web-api
- Source: benchmark
- Matched profiles: none
- Risk focus:
  - Next.js middleware authorization bypass advisory
- Signals:
  - benchmark: https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw

## Blocking Checks
- Next.js middleware authorization bypass: fail. Next.js 15.2.2 is within the benchmarked middleware authorization bypass range.

## Warnings
- None

## Coverage Gaps
- None

## Production Audit
Project Type: web-api
Database: false
CI: true

### Plan
- PASS Pinned public evidence: vercel/next.js is represented by pinned advisory, release, postmortem, or hardening metadata.
- FAIL Benchmark risk transition: The before state intentionally models the public failure signal.

### Coverage Gaps
- None

### User Decisions
- None

## Evidence Levels
- INFERRED: 2

## Standards Crosswalk
- case-study/benchmark-upstream-evidence: None
- web-api/nextjs-cve-2025-29927: None

## Tools
- ai-project-maintainer: 1.3.0-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Next.js middleware authorization bypass: fail [INFERRED]

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.