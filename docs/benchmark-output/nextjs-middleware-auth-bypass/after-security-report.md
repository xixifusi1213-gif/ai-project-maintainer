# Local Security Gate: PASS_WITH_GAPS

Root: vercel/next.js@after
Mode: strict=true, release=true, production=true
Profile: web-api (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 95/100 (A)
Code Scanning Results: 0 (non-blocking production gaps stay in this report and artifacts)

## Project Profile
- Profile: web-api
- Source: benchmark
- Matched profiles: none
- Risk focus:
  - Next.js middleware authorization bypass advisory
- Signals:
  - benchmark: https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw

## Blocking Checks
- None

## Warnings
- Production evidence still required: gap. The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

## Coverage Gaps
- Production evidence still required: The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

## Production Audit
Project Type: web-api
Database: false
CI: true

### Plan
- PASS Pinned public evidence: vercel/next.js is represented by pinned advisory, release, postmortem, or hardening metadata.
- PASS Benchmark risk transition: The after state models the public patch, replacement, or hardening signal.

### Coverage Gaps
- Production evidence: Benchmark reports cannot prove a downstream project's live monitoring, backups, approvals, or rollback path. Recommendation: Keep these as explicit GAP items until the maintainer provides evidence.

### User Decisions
- Maintainer risk acceptance: The maintainer must decide whether remaining evidence gaps block their production release. Recommendation: Document the decision in the project intake or risk policy.

## Evidence Levels
- GAP: 1
- INFERRED: 2

## Standards Crosswalk
- case-study/benchmark-upstream-evidence: None
- web-api/nextjs-cve-2025-29927: None
- production-audit/web-api-production-evidence-gap: Google SRE Monitoring Distributed Systems, Google SRE Release Engineering, Google SRE Embracing Risk, CIS Control 11: Data Recovery, NIST SP 800-34 Rev. 1

## Tools
- ai-project-maintainer: 1.3.0-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Next.js middleware authorization bypass: pass [INFERRED]
- Production evidence still required: gap [GAP]

## Exceptions
- None

## Next Step
- No blocking checks failed, but release-readiness gaps or user decisions remain. Fill evidence, accept risk explicitly, or enable block_on_coverage_gaps before release.