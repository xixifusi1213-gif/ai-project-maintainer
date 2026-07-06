# AI Agent Repair Pack: FAIL

Source report: before-security-report.json
Project root: TryGhost/Ghost@before
Generated: 2026-07-06T04:39:21.319Z

## Summary
- Total tasks: 2
- manual_review_required: 2

## Tasks
### fix-001: Database query parameterization
- Type: manual_review_required
- Severity: P2
- Source: database/database-query-parameterization
- User decision required: true
- Fix strategy: Review the risky change with the maintainer, document the accepted path, then rerun the relevant check.
- Risk notes: User-controlled slug ordering can be interpolated into SQL instead of using bindings.
- Evidence:
  - status: fail
  - summary: User-controlled slug ordering can be interpolated into SQL instead of using bindings.
- Verification:
  - npx ai-project-maintainer gate 'TryGhost/Ghost@before' --profile database --production --strict --release --output reports/security-report.json

### fix-002: Database query parameterization
- Type: manual_review_required
- Severity: P2
- Source: database/database-query-parameterization
- User decision required: true
- Fix strategy: Review the risky change with the maintainer, document the accepted path, then rerun the relevant check.
- Risk notes: User-controlled slug ordering can be interpolated into SQL instead of using bindings.
- Evidence:
  - status: fail
  - summary: User-controlled slug ordering can be interpolated into SQL instead of using bindings.
- Verification:
  - npx ai-project-maintainer gate 'TryGhost/Ghost@before' --profile database --production --strict --release --output reports/security-report.json

## Recheck Commands
- npx ai-project-maintainer gate 'TryGhost/Ghost@before' --profile database --production --strict --release --output reports/security-report.json