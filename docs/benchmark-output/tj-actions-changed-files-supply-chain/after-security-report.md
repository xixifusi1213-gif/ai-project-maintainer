# Local Security Gate: PASS_WITH_GAPS

Root: tj-actions/changed-files@after
Mode: strict=true, release=true, production=true
Profile: ci-supply-chain (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 95/100 (A)
Code Scanning Results: 0 (non-blocking production gaps stay in this report and artifacts)

## Project Profile
- Profile: ci-supply-chain
- Source: benchmark
- Matched profiles: none
- Risk focus:
  - tj-actions/changed-files supply-chain compromise
- Signals:
  - benchmark: https://github.com/advisories/GHSA-mrrh-fwg8-r2c3

## Blocking Checks
- None

## Warnings
- Production evidence still required: gap. The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

## Coverage Gaps
- Production evidence still required: The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

## Production Audit
Project Type: ci-supply-chain
Database: false
CI: true

### Plan
- PASS Pinned public evidence: tj-actions/changed-files is represented by pinned advisory, release, postmortem, or hardening metadata.
- PASS Benchmark risk transition: The after state models the public patch, replacement, or hardening signal.

### Coverage Gaps
- Production evidence: Benchmark reports cannot prove a downstream project's live monitoring, backups, approvals, or rollback path. Recommendation: Keep these as explicit GAP items until the maintainer provides evidence.

### User Decisions
- Maintainer risk acceptance: The maintainer must decide whether remaining evidence gaps block their production release. Recommendation: Document the decision in the project intake or risk policy.

## Evidence Levels
- GAP: 1
- INFERRED: 1
- TOOL_VERIFIED: 1

## Standards Crosswalk
- case-study/benchmark-upstream-evidence: None
- ci-security/tj-actions-changed-files-compromise: NIST SSDF SP 800-218, SLSA, OpenSSF Scorecard
- production-audit/ci-supply-chain-production-evidence-gap: Google SRE Monitoring Distributed Systems, Google SRE Release Engineering, Google SRE Embracing Risk, CIS Control 11: Data Recovery, NIST SP 800-34 Rev. 1

## Tools
- ai-project-maintainer: 1.3.0-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Compromised GitHub Action dependency: pass [TOOL_VERIFIED] (zizmor .github/workflows)
- Production evidence still required: gap [GAP]

## Exceptions
- None

## Next Step
- No blocking checks failed, but release-readiness gaps or user decisions remain. Fill evidence, accept risk explicitly, or enable block_on_coverage_gaps before release.