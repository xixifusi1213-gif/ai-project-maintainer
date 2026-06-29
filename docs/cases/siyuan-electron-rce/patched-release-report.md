# Local Security Gate: FAIL

Root: siyuan-note/siyuan@patched-release
Mode: strict=true, release=true, production=true
Generated: 2026-06-30T00:00:00.000Z
Open Source Maintenance Score: 70/100 (C)

## Blocking Checks
- Electron runtime hardening: fail. APM found dangerous Electron settings: nodeIntegration: true, contextIsolation: false, webSecurity: false.

## Warnings
- Production evidence for OSS case: gap. The case proves the code review signal, but deployment monitoring and release approval remain project-specific evidence.

## Coverage Gaps
- Production evidence for OSS case: The case proves the code review signal, but deployment monitoring and release approval remain project-specific evidence.

## Production Audit
Project Type: electron
Database: false
CI: true

### Plan
- PASS Pinned OSS evidence: siyuan-note/siyuan is referenced by advisory, release, and patch commit metadata.
- USER_DECISION Electron hardening boundary: Official advisory fixes must still be reviewed against Electron runtime hardening.

### Coverage Gaps
- Production monitoring evidence: The OSS case verifies code-level remediation, not the maintainer's deployed monitoring. Recommendation: Require release, logging, metric, and alert evidence in the consuming project.

### User Decisions
- Electron runtime risk acceptance: Maintainers must decide whether any remaining Node-enabled renderer surface is acceptable. Recommendation: Prefer nodeIntegration=false, contextIsolation=true, webSecurity=true, and narrow preload IPC.

## Tools
- ai-project-maintainer: 0.5.0-case-study

## Checks Run
- OSS advisory reference: pass
- Electron runtime hardening: fail
- Production evidence for OSS case: gap

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.