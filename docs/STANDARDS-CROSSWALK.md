# Standards Crosswalk

This page explains why the gate checks exist.

It is not a certification, compliance claim, audit opinion, or guarantee that a project is safe for production. It is a practical mapping from `ai-project-maintainer` checks to public engineering standards and reliability guidance.

## Source Standards

| Source | What it supports |
| --- | --- |
| [NIST SSDF SP 800-218](https://csrc.nist.gov/pubs/sp/800/218/final) | Secure software development, testing, vulnerability review, and release practices. |
| [OWASP SAMM](https://owasp.org/www-project-samm/) | Governance, design, implementation, verification, and operations maturity. |
| [SLSA](https://slsa.dev/) | Build integrity, provenance, and software supply-chain trust. |
| [OpenSSF Scorecard](https://scorecard.dev/) | Open source project security posture and supply-chain hygiene. |
| [Google SRE Release Engineering](https://sre.google/sre-book/release-engineering/) | Repeatable release process, automation, policy enforcement, audit trail, and rollback thinking. |
| [Google SRE Monitoring Distributed Systems](https://sre.google/sre-book/monitoring-distributed-systems/) | Monitoring and alerting evidence for production operations. |
| [Google SRE Embracing Risk](https://sre.google/sre-book/embracing-risk/) | Explicit reliability risk management and owner-approved risk acceptance. |
| [CIS Control 11: Data Recovery](https://www.cisecurity.org/controls/data-recovery) | Backup and recovery expectations. |
| [NIST SP 800-34 Rev. 1](https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final) | Contingency planning, recovery, and continuity practices. |
| [DORA research](https://dora.dev/research/) | Delivery performance, recovery, and continuous delivery capabilities. |

## Gate Mapping

| Gate area | APM groups | Primary standards |
| --- | --- | --- |
| Business and release tests | `tests` | NIST SSDF, DORA, Google SRE Release Engineering |
| Secrets and static analysis | `secrets`, `sast` | NIST SSDF, OWASP SAMM |
| Dependencies and SBOM | `dependencies`, `supply-chain` | NIST SSDF, SLSA, OpenSSF Scorecard |
| CI security | `ci-security` | OpenSSF Scorecard, SLSA, Google SRE Release Engineering |
| Infrastructure and app configuration | `iac`, `electron` | NIST SSDF, OWASP SAMM |
| Database migration risk | `database`, `production-evidence` migration checks | OWASP SAMM Operations, Google SRE Release Engineering |
| Release approval and deployment evidence | `production-audit`, `production-evidence` | Google SRE Release Engineering, Google SRE Embracing Risk, DORA |
| Monitoring, logs, metrics, and alerts | `production-audit`, `production-evidence` | Google SRE Monitoring, Google SRE Embracing Risk |
| Backup, rollback, and recovery | `production-audit` | CIS Control 11, NIST SP 800-34, Google SRE Release Engineering |
| Risk acceptance | `production-audit` `USER_DECISION` | Google SRE Embracing Risk |

## How Reports Use This

Generated JSON reports include:

```json
{
  "standards": {
    "sources": [],
    "mappings": []
  }
}
```

Each check can include:

```json
{
  "standardRefs": [
    {
      "id": "nist-ssdf",
      "title": "NIST SSDF SP 800-218",
      "url": "https://csrc.nist.gov/pubs/sp/800/218/final",
      "relationship": "supports"
    }
  ],
  "evidenceLevel": "TOOL_VERIFIED"
}
```

Markdown reports summarize the crosswalk for maintainers. SARIF output intentionally stays focused on actionable security/code findings and does not upload standards text as GitHub Code Scanning noise.
