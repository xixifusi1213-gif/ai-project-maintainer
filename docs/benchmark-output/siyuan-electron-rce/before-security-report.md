# Local Security Gate: FAIL

Root: siyuan-note/siyuan@before
Mode: strict=true, release=true, production=true
Profile: electron-desktop (benchmark)
Generated: 2026-07-06T00:00:00.000Z
Open Source Maintenance Score: 75/100 (B)
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
- None

## Coverage Gaps
- None

## Production Audit
Project Type: electron-desktop
Database: false
CI: true

### Plan
- PASS Pinned public evidence: siyuan-note/siyuan is represented by pinned advisory, release, postmortem, or hardening metadata.
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
- electron/electron-runtime-hardening: Google SRE Release Engineering, DORA research

## Tools
- ai-project-maintainer: 1.3.0-benchmark

## Checks Run
- Benchmark upstream evidence: pass [INFERRED]
- Electron runtime hardening: fail [TOOL_VERIFIED]

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.