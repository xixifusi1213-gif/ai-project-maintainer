# Trust Model

`ai-project-maintainer` is AI-assisted, but it does not ask users to trust AI output blindly.

The tool is trusted only to the extent that its evidence is reproducible:

- local commands ran and recorded their result
- third-party scanners produced deterministic findings
- production platforms were queried through read-only connectors
- missing evidence stayed visible as `GAP`
- user-owned risk decisions stayed visible as `USER_DECISION`

This is not a certification, compliance report, penetration test, or guarantee that a project is safe for production.

## Evidence Levels

Reports label checks with an evidence level:

| Level | Meaning |
| --- | --- |
| `TOOL_VERIFIED` | A local test, scanner, linter, build, or deterministic code inspection produced the result. |
| `PLATFORM_VERIFIED` | A read-only platform connector, such as GitHub, Sentry, Vercel, Bytebase, Grafana, or Prometheus, produced the result. |
| `USER_REPORTED` | The maintainer supplied or accepted the fact. This is useful evidence, but it is not independently verified. |
| `INFERRED` | The tool inferred the result from repository shape or local configuration. |
| `GAP` | Evidence is missing, unavailable, skipped, or blocked by missing credentials/tools. |

`GAP` is not success. It means the release decision still needs more evidence or explicit risk acceptance.

## What the Tool Does Not Do

- It does not host user tokens.
- It does not deploy, roll back, create alerts, modify cloud configuration, or change databases.
- It does not replace secure design review, penetration testing, compliance assessment, or incident response ownership.
- It does not prove that business behavior is correct when the project has no meaningful tests.

## Why the Standards Mapping Exists

The standards crosswalk maps checks to public engineering frameworks such as NIST SSDF, OWASP SAMM, SLSA, OpenSSF Scorecard, Google SRE, CIS Control 11, NIST SP 800-34, and DORA research.

The mapping is an explanation of intent, not a claim of compliance.
