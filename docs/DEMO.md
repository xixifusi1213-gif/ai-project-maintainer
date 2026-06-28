# Demo: From AI-Coded Repo to Production Audit Report

This demo uses the runnable project in `examples/demo-ai-app`. It does not require any paid account or external API.

## 1. Run The Healthy Demo App

```powershell
npm test --prefix .\examples\demo-ai-app
npm run build --prefix .\examples\demo-ai-app
```

The app is intentionally small: it quotes orders and decides whether paid orders can be released. The tests protect the business behavior that must not break.

## 2. Generate A Broken Before State

```powershell
node .\examples\demo-ai-app\scripts\create-before-state.mjs
```

The command prints a temporary directory. Run this in that copied project:

```powershell
npm test
```

You should see the business tests fail. This is the "AI-coded project looks complete, but behavior is broken" stage. The broken copy is created under the OS temp directory, so the repository does not commit fake secrets or intentionally bad source files.

## 3. Run The Reproducible Demo Gate

```powershell
node .\examples\demo-ai-app\scripts\run-demo-gate.mjs
```

This script runs the real AI Project Maintainer gate with temporary scanner shims, so the sample report is stable even on a machine that has not installed Gitleaks, Trivy, Semgrep, OSV-Scanner, Syft, Grype, actionlint, zizmor, or Scorecard yet.

Expected result:

```text
Local Security Gate: PASS
Blocking Checks: None
Coverage Gaps:
- Production release approval
- Error monitoring
- Production logs
- Production metrics
- Production alerts
```

See the generated-style [sample report](demo-output/security-report.md).

## 4. Run The Real Gate

After installing scanner CLIs, use the same command a real project would use:

```powershell
npx ai-project-maintainer gate .\examples\demo-ai-app --production --strict --release --output reports/security-report.json
```

The point is not to pretend the project is perfect. The point is to make the checked failures and missing production evidence explicit before release.

## 5. Let Codex Fix Blockers

Ask Codex:

```text
$ai-project-maintainer run the production gate for this project, fix blockers, and rerun until it passes.
```

Codex can handle deterministic blockers. The maintainer still owns business decisions such as critical flows, accepted risks, and production evidence.
