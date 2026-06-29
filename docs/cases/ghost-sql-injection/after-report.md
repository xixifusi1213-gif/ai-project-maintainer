# Local Security Gate: PASS_WITH_GAPS

Root: TryGhost/Ghost@after
Mode: strict=true, release=true, production=true
Generated: 2026-06-30T00:00:00.000Z
Open Source Maintenance Score: 95/100 (A)

## Blocking Checks
- None

## Warnings
- Production database release evidence: gap. The patch fixes the query construction issue, but backup, rollback, and deployed monitoring evidence are outside the OSS commit.

## Coverage Gaps
- Production database release evidence: The patch fixes the query construction issue, but backup, rollback, and deployed monitoring evidence are outside the OSS commit.

## Production Audit
Project Type: web-api-db
Database: true
CI: true

### Plan
- PASS Pinned OSS evidence: TryGhost/Ghost is referenced by advisory, release, and patch commit metadata.
- PASS Database query boundary: The patched commit moves user-controlled ordering input behind query bindings.

### Coverage Gaps
- Production monitoring evidence: The OSS case verifies code-level remediation, not the maintainer's deployed monitoring. Recommendation: Require release, logging, metric, and alert evidence in the consuming project.

### User Decisions
- None

## Tools
- ai-project-maintainer: 0.5.0-case-study

## Checks Run
- OSS advisory reference: pass
- Database query parameterization: pass
- Production database release evidence: gap

## Exceptions
- None

## Next Step
- No blocking checks failed, but release-readiness gaps or user decisions remain. Fill evidence, accept risk explicitly, or enable block_on_coverage_gaps before release.