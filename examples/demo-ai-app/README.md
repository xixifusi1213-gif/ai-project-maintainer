# Demo AI App

This is a small healthy Node.js project used by AI Project Maintainer demos.

It has:

- business-critical tests
- a build script
- production audit intake files
- intentional production evidence gaps for monitoring, alerts, approval, and rollback

## Run The Healthy Project

```powershell
npm test --prefix .\examples\demo-ai-app
npm run build --prefix .\examples\demo-ai-app
node .\examples\demo-ai-app\scripts\run-demo-gate.mjs
```

The demo gate uses temporary scanner shims so the sample report is reproducible on machines that do not have Gitleaks, Trivy, Semgrep, and other scanners installed yet.

## Generate The Broken Before State

```powershell
node .\examples\demo-ai-app\scripts\create-before-state.mjs
```

The command prints a temporary directory. Run `npm test` in that copied project to see the business tests fail. Nothing bad is committed into this repository; the failing state exists only under the OS temp directory.

## Run The Real Gate

When scanner CLIs are installed, run the same command a real project would use:

```powershell
npx ai-project-maintainer gate .\examples\demo-ai-app --production --strict --release --output reports/security-report.json
```

The expected result is PASS with visible GAP items for missing production evidence.
