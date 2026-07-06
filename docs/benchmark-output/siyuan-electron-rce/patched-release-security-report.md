# Local Security Gate: FAIL

Root: siyuan-note/siyuan@patched-release
Mode: strict=true, release=true, production=true
Profile: electron-desktop (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 70/100 (C)
Code Scanning Results: 1 (non-blocking production gaps stay in this report and artifacts)

## Project Profile
- Profile: electron-desktop
- Source: benchmark
- Matched profiles: none
- Risk focus:
  - SiYuan Electron RCE advisory
- Signals:
  - benchmark: https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5

## Blocking Checks
- Electron runtime hardening: fail. Dangerous Electron settings remain: nodeIntegration: true, contextIsolation: false, webSecurity: false.

## Warnings
- Production evidence still required: gap. The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

## Coverage Gaps
- Production evidence still required: The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.

## Production Audit
Project Type: electron-desktop
Database: false
CI: true

### Plan
- PASS Pinned public evidence: siyuan-note/siyuan is represented by pinned advisory, release, postmortem, or hardening metadata.
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
- electron/electron-runtime-hardening: Google SRE Release Engineering, DORA research
- production-audit/electron-desktop-production-evidence-gap: Google SRE Monitoring Distributed Systems, Google SRE Release Engineering, Google SRE Embracing Risk, CIS Control 11: Data Recovery, NIST SP 800-34 Rev. 1

## Tools
- ai-project-maintainer: 1.3.0-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Electron runtime hardening: fail [TOOL_VERIFIED]
- Production evidence still required: gap [GAP]

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.