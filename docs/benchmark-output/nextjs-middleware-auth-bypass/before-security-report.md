# Local Security Gate: FAIL

Root: vercel/next.js@before
Mode: strict=true, release=true, production=true
Profile: web-api (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 75/100 (B)
Code Scanning Results: 1 (production evidence gaps stay in this report and artifacts by default)

## What This Report Actually Found
- Confirmed vulnerabilities: 1. Validated vulnerability evidence. This label is never inferred from scanner output alone.
- Untriaged scanner findings: 0. A scanner matched something that still needs project-specific validation.
- Verified check failures: 0. A deterministic test, build, or engineering check failed; this is not automatically a vulnerability.
- Production evidence gaps: 0. Required production proof is missing; this is missing proof, not a discovered vulnerability.
- Maintainer decisions: 0. Business context or risk acceptance must be supplied by a human maintainer.
- Environment or tooling issues: 0. A scanner, database, dependency, or local tool was unavailable, so evidence is incomplete.

## Project Profile
- Profile: web-api
- Source: benchmark
- Matched profiles: none
- Risk focus:
  - Next.js middleware authorization bypass advisory
- Signals:
  - benchmark: https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw

## Blocking Checks
- [Confirmed vulnerabilities] Next.js middleware authorization bypass: fail. Next.js 15.2.2 is within the benchmarked middleware authorization bypass range.

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
- web-api/nextjs-cve-2025-29927: OWASP ASVS, OWASP API Security Top 10, NIST SSDF SP 800-218

## Tools
- ai-project-maintainer: 1.3.1-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Next.js middleware authorization bypass: fail [confirmed_vulnerability] [INFERRED]

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.