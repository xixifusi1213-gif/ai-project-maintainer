# AI Agent Repair Pack: FAIL

Source report: before-security-report.json
Project root: TanStack/query@before
Generated: 2026-07-05T20:57:42.508Z

## Summary
- Total tasks: 2
- auto_fix_candidate: 2

## Tasks
### fix-001: npm package release workflow hardening
- Type: auto_fix_candidate
- Severity: P2
- Source: ci-security/npm-release-workflow-hardening
- User decision required: false
- Fix strategy: Harden the workflow or action configuration, then rerun actionlint/zizmor and the gate.
- Risk notes: Release workflow lacks the benchmarked post-compromise hardening controls.
- Evidence:
  - status: fail
  - summary: Release workflow lacks the benchmarked post-compromise hardening controls.
  - command: zizmor .github/workflows
- Verification:
  - zizmor .github/workflows
  - npx ai-project-maintainer gate 'TanStack/query@before' --profile oss-library --production --strict --release --output reports/security-report.json

### fix-002: npm package release workflow hardening
- Type: auto_fix_candidate
- Severity: P2
- Source: ci-security/npm-release-workflow-hardening
- User decision required: false
- Fix strategy: Harden the workflow or action configuration, then rerun actionlint/zizmor and the gate.
- Risk notes: Release workflow lacks the benchmarked post-compromise hardening controls.
- Evidence:
  - status: fail
  - summary: Release workflow lacks the benchmarked post-compromise hardening controls.
  - command: zizmor .github/workflows
- Verification:
  - zizmor .github/workflows
  - npx ai-project-maintainer gate 'TanStack/query@before' --profile oss-library --production --strict --release --output reports/security-report.json

## Recheck Commands
- zizmor .github/workflows
- npx ai-project-maintainer gate 'TanStack/query@before' --profile oss-library --production --strict --release --output reports/security-report.json