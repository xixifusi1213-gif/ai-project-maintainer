# Contributing

Thanks for helping improve AI Project Maintainer.

This project is focused on one job: helping AI-coded projects move from fast generation to defensible release readiness.

## Good Contributions

- New checks that produce clear evidence.
- Better production audit templates.
- Better examples and demo reports.
- Bug fixes with regression tests.
- Documentation that makes the workflow easier to try.

## Local Setup

```powershell
npm install
npm test
npm run check
npm pack --dry-run
```

## Pull Request Checklist

- Explain the user-facing behavior change.
- Include tests for new CLI behavior, reports, or templates.
- Avoid adding new dependencies unless the value is clear.
- Do not commit secrets, tokens, DSNs, or production data.
- Keep account-backed integrations optional; missing credentials should produce `GAP`, not a crash.

## Issue Guidelines

Use the issue templates when possible:

- Bug report: broken command, wrong report, bad generated file.
- Feature request: new check, connector, template, or report behavior.
- Production evidence gap: missing production-readiness evidence the tool should detect.

## Security

Do not open public issues containing secrets or private production data. Redact sensitive paths, tokens, logs, customer data, and internal URLs before sharing examples.
