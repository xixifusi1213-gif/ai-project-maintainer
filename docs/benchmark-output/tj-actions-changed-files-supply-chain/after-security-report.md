# Local Security Gate: PASS_WITH_GAPS

Root: tj-actions/changed-files@after
Mode: strict=true, release=true, production=true
Profile: ci-supply-chain (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 95/100 (A)
Code Scanning Results: 0 (production evidence gaps stay in this report and artifacts by default)

## What This Report Actually Found
- Confirmed vulnerabilities: 0. Validated vulnerability evidence. This label is never inferred from scanner output alone.
- Untriaged scanner findings: 0. A scanner matched something that still needs project-specific validation.
- Verified check failures: 0. A deterministic test, build, or engineering check failed; this is not automatically a vulnerability.
- Production evidence gaps: 1. Required production proof is missing; this is missing proof, not a discovered vulnerability.
- Maintainer decisions: 0. Business context or risk acceptance must be supplied by a human maintainer.
- Environment or tooling issues: 0. A scanner, database, dependency, or local tool was unavailable, so evidence is incomplete.

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
- [Production evidence gaps] Production evidence still required: gap. The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

## Coverage Gaps
- [Production evidence gaps] Production evidence still required: The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

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
- production-audit/ci-supply-chain-production-evidence-gap: OWASP ASVS, OWASP API Security Top 10, NIST Privacy Framework, CISA Secure by Design, Google SRE Monitoring Distributed Systems, Google SRE Release Engineering, Google SRE Embracing Risk, CIS Control 11: Data Recovery, NIST SP 800-34 Rev. 1

## Tools
- ai-project-maintainer: 1.3.1-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Compromised GitHub Action dependency: pass [TOOL_VERIFIED] (zizmor .github/workflows)
- Production evidence still required: gap [production_evidence_gap] [GAP]

## Exceptions
- None

## Next Step
- No blocking checks failed, but release-readiness gaps or user decisions remain. Fill evidence, accept risk explicitly, or enable block_on_coverage_gaps before release.