# Local Security Gate: FAIL

Root: siyuan-note/siyuan@before
Mode: strict=true, release=true, production=true
Generated: 2026-06-30T00:00:00.000Z
Open Source Maintenance Score: 75/100 (B)
Code Scanning Results: 1 (non-blocking production gaps stay in this report and artifacts)

## Blocking Checks
- Electron runtime hardening: fail. APM found dangerous Electron settings: nodeIntegration: true, contextIsolation: false, webSecurity: false.

## Warnings
- None

## Coverage Gaps
- None

## Production Audit
Project Type: electron
Database: false
CI: true

### Plan
- PASS Pinned OSS evidence: siyuan-note/siyuan is referenced by advisory, release, and patch commit metadata.
- USER_DECISION Electron hardening boundary: Official advisory fixes must still be reviewed against Electron runtime hardening.

### Coverage Gaps
- None

### User Decisions
- Electron runtime risk acceptance: Maintainers must decide whether any remaining Node-enabled renderer surface is acceptable. Recommendation: Prefer nodeIntegration=false, contextIsolation=true, webSecurity=true, and narrow preload IPC.

## Tools
- ai-project-maintainer: 0.5.0-case-study

## Checks Run
- OSS advisory reference: pass
- Electron runtime hardening: fail

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.