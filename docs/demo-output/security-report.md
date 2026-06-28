# Local Security Gate: PASS

Root: `example/ai-coded-project`
Mode: strict=true, release=true, production=true
Open Source Maintenance Score: 82/100 (B)

## Blocking Checks

- None

## Warnings

- production audit: Critical business flows: USER_DECISION. The maintainer must declare the business flows that must not break.
- production audit: Error monitoring: GAP. Error monitoring evidence is missing.
- production audit: Production release approval: GAP. No production deployment approval evidence declared.

## Coverage Gaps

- Error monitoring: Error monitoring evidence is missing. Recommendation: declare Sentry, OpenTelemetry, or another error source in `.ai-maintainer/evidence-sources.yml`.
- Production logs: Production logs evidence is missing. Recommendation: declare log evidence before relying on production recovery.
- Production alerts: Production alerts evidence is missing. Recommendation: declare alert routing before release.
- Business flow tests: Critical flows are not linked to automated tests.

## Production Audit

Project Type: web
Database: true
CI: true

### Plan

- PASS Production audit intake: Project profile and evidence templates are present.
- USER_DECISION Critical business flows: The maintainer must declare the business flows that must not break.
- GAP Error monitoring: Error monitoring evidence is missing.
- GAP Production release approval: No production deployment approval evidence declared.
- PASS CI security review: GitHub Actions workflow evidence detected.
- GAP Database backup evidence: Database backup evidence is missing.

### User Decisions

- Critical business flows: Confirm the business flows that must not break.
- Business flow tests: Confirm which automated tests prove those flows.

## Tools

- node: v24.x
- git: git version 2.x
- gitleaks: available
- trivy: available
- semgrep: available

## Next Step

- Fill `business-flows.yml` with real flows.
- Add or document error monitoring.
- Add production release approval evidence.
- Rerun `gate --production --strict --release`.
