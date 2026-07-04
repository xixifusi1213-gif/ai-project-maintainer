# Local Security Gate: PASS_WITH_GAPS

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

## Evidence Levels

- GAP: 5
- TOOL_VERIFIED: 10

## Standards Crosswalk

- tests/tests: NIST SSDF SP 800-218, DORA research, Google SRE Release Engineering
- dependencies/package-audit: NIST SSDF SP 800-218, SLSA, OpenSSF Scorecard
- secrets/gitleaks: NIST SSDF SP 800-218, OWASP SAMM
- dependencies/trivy: NIST SSDF SP 800-218, SLSA, OpenSSF Scorecard
- dependencies/osv-scanner: NIST SSDF SP 800-218, SLSA, OpenSSF Scorecard
- sast/semgrep: NIST SSDF SP 800-218, OWASP SAMM
- supply-chain/syft: SLSA, OpenSSF Scorecard
- supply-chain/grype: NIST SSDF SP 800-218, SLSA, OpenSSF Scorecard
- oss-hygiene/scorecard: SLSA, OpenSSF Scorecard
- production-audit/production-release-approval: Google SRE Release Engineering, Google SRE Embracing Risk
- production-audit/production-observability-errors: Google SRE Monitoring Distributed Systems, Google SRE Embracing Risk
- production-audit/production-observability-logs: Google SRE Monitoring Distributed Systems, Google SRE Embracing Risk
- production-audit/production-observability-metrics: Google SRE Monitoring Distributed Systems, Google SRE Embracing Risk
- production-audit/production-observability-alerts: Google SRE Monitoring Distributed Systems, Google SRE Embracing Risk

## Checks Run

- package test: pass [TOOL_VERIFIED]
- release build: pass [TOOL_VERIFIED]
- npm production audit: pass [TOOL_VERIFIED]
- gitleaks secret scan: pass [TOOL_VERIFIED]
- trivy filesystem scan: pass [TOOL_VERIFIED]
- osv-scanner dependency scan: pass [TOOL_VERIFIED]
- semgrep static scan: pass [TOOL_VERIFIED]
- syft SBOM: pass [TOOL_VERIFIED]
- grype vulnerability scan: pass [TOOL_VERIFIED]
- OpenSSF Scorecard: pass [TOOL_VERIFIED]
- production audit evidence checks: GAP items reported but not blocking by default [GAP]

## Next Step

- No blocking checks failed, but release-readiness gaps remain.
- Add real release approval, monitoring, logs, metrics, and alerts evidence, or explicitly accept those gaps before release.
- Rerun `gate --production --strict --release`.
