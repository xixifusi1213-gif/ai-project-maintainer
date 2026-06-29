# Local Security Gate: FAIL

Root: TryGhost/Ghost@before
Mode: strict=true, release=true, production=true
Generated: 2026-06-30T00:00:00.000Z
Open Source Maintenance Score: 75/100 (B)

## Blocking Checks
- Database query parameterization: fail. The reviewed slug ordering path can construct SQL with user-controlled slug values instead of bindings.

## Warnings
- None

## Coverage Gaps
- None

## Production Audit
Project Type: web-api-db
Database: true
CI: true

### Plan
- PASS Pinned OSS evidence: TryGhost/Ghost is referenced by advisory, release, and patch commit metadata.
- PASS Database query boundary: The patched commit moves user-controlled ordering input behind query bindings.

### Coverage Gaps
- None

### User Decisions
- None

## Tools
- ai-project-maintainer: 0.5.0-case-study

## Checks Run
- OSS advisory reference: pass
- Database query parameterization: fail

## Exceptions
- None

## Next Step
- Fix blocking checks or add narrow, owner-approved exceptions, then rerun the gate.