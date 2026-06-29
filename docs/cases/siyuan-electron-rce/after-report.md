# Local Security Gate: PASS_WITH_GAPS

Root: siyuan-note/siyuan@after-hardened
Mode: strict=true, release=true, production=true
Generated: 2026-06-30T00:00:00.000Z
Open Source Maintenance Score: 95/100 (A)

## Blocking Checks
- None

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
- Electron runtime hardening: pass
- Production evidence for OSS case: gap

## Exceptions
- None

## Next Step
- No blocking checks failed, but release-readiness gaps or user decisions remain. Fill evidence, accept risk explicitly, or enable block_on_coverage_gaps before release.