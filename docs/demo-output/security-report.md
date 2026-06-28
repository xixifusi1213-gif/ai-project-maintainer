# Local Security Gate: PASS

Root: `examples/demo-ai-app`
Mode: strict=true, release=true, production=true
Open Source Maintenance Score: 75/100 (B)

## Blocking Checks

- None

## Warnings

- production audit: Production release approval: GAP. Production deployment exists without approval evidence.
- production audit: Error monitoring: GAP. Error monitoring evidence is missing.
- production audit: Production logs: GAP. Production logs evidence is missing.
- production audit: Production metrics: GAP. Production metrics evidence is missing.
- production audit: Production alerts: GAP. Production alerts evidence is missing.

## Coverage Gaps

- Production release approval: use GitHub Environments or document the approval gate.
- Error monitoring: declare Sentry, OpenTelemetry, or another error source.
- Production logs: declare log evidence before relying on production recovery.
- Production metrics: declare release and service health metrics.
- Production alerts: declare alert routing before release.

## Production Audit

Project Type: node
Database: false
CI: true

### Plan

- PASS Production audit intake: project profile and evidence templates are present.
- PASS Critical business flows: 2 critical flows declared.
- PASS Business flow tests: 2 test references declared.
- N/A Electron security review: no Electron surface detected.
- PASS CI security review: CI workflow evidence detected.
- GAP Production release approval: production deployment exists without approval evidence.
- GAP Error monitoring: error monitoring evidence is missing.
- GAP Production logs: production logs evidence is missing.
- GAP Production metrics: production metrics evidence is missing.
- GAP Production alerts: production alerts evidence is missing.
- N/A Database migration review: no database surface detected or declared.

## Checks Run

- package test: pass
- release build: pass
- npm production audit: pass
- gitleaks secret scan: pass
- trivy filesystem scan: pass
- osv-scanner dependency scan: pass
- semgrep static scan: pass
- syft SBOM: pass
- grype vulnerability scan: pass
- OpenSSF Scorecard: pass
- production audit evidence checks: GAP items reported but not blocking by default

## Next Step

- Add real release approval, monitoring, logs, metrics, and alerts evidence.
- Rerun `gate --production --strict --release`.
