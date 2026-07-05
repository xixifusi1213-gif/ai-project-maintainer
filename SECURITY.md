# Security Policy

## Supported Versions

Security fixes are handled for the latest `1.x` release line.

Older `0.x` releases were public development releases. They remain available on npm and GitHub, but security fixes target the current stable line unless a maintainer explicitly backports a fix.

## Reporting a Vulnerability

Please report vulnerabilities through GitHub Security Advisories for this repository when possible:

https://github.com/xixifusi1213-gif/ai-project-maintainer/security/advisories

If GitHub advisories are unavailable, open a minimal public issue that says a private security report is needed. Do not post secrets, working exploit code, private project paths, or production credentials in public issues.

## Scope

In scope:

- secret leakage in reports, logs, SARIF, or generated files
- unsafe connector behavior that writes to external platforms
- agent-risk checks that execute untrusted project code
- release workflow issues that could publish an unverified package
- npm package contents that differ from documented release artifacts

Out of scope:

- requests for general project hardening advice
- scanner false positives without a security impact
- vulnerabilities in third-party scanners or hosting platforms
- claims that a project is production safe just because this tool passed

## Security Boundary

`ai-project-maintainer` is a release readiness evidence gate. It is not a penetration test, compliance certification, or absolute security guarantee.

The tool should not store user tokens. Optional production connectors use environment variables supplied by the user and are designed to be read-only.
