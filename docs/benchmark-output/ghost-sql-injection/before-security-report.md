# Local Security Gate: FAIL

Root: TryGhost/Ghost@before
Mode: strict=true, release=true, production=true
Profile: database (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 75/100 (B)
Code Scanning Results: 1 (non-blocking production gaps stay in this report and artifacts)

## Project Profile
- Profile: database
- Source: benchmark
- Matched profiles: none
- Risk focus:
  - Ghost Content API SQL injection advisory
- Signals:
  - benchmark: https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97

## Blocking Checks
- Database query parameterization: fail. User-controlled slug ordering can be interpolated into SQL instead of using bindings.

## Warnings
- None

## Coverage Gaps
- None

## Production Audit
Project Type: database
Database: true
CI: true

### Plan
- PASS Pinned public evidence: TryGhost/Ghost is represented by pinned advisory, release, postmortem, or hardening metadata.
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
- database/database-query-parameterization: OWASP SAMM, Google SRE Release Engineering

## Tools
- ai-project-maintainer: 1.3.0-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Database query parameterization: fail [TOOL_VERIFIED]

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.