# Demo: From AI-Coded Repo to Production Audit Report

This demo uses the runnable project in `examples/demo-ai-app`. It does not require any paid account or external API.

Visual materials:

- [90-second GIF storyboard](../assets/demo-90s.gif)
- [90-second browser demo](demo-output/90-second-demo.html)
- [Before/after case](demo-output/before-after-case.md)

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
Local Security Gate: PASS_WITH_GAPS
Blocking Checks: None
Coverage Gaps:
- Production release approval
- Error monitoring
- Production logs
- Production metrics
- Production alerts
```

See the generated-style [sample report](demo-output/security-report.md).
`PASS_WITH_GAPS` means deterministic blockers are clear, but production evidence still needs to be filled in or explicitly accepted before release.

## 4. Run The Real Gate

After installing scanner CLIs, use the same command a real project would use:

```powershell
npx ai-project-maintainer gate .\examples\demo-ai-app --production --strict --release --output reports/security-report.json
```

The point is not to pretend the project is perfect. The point is to make the checked failures and missing production evidence explicit before release.

## 5. Generate AI Agent Repair Tasks

Convert the gate report into tasks for your AI coding assistant:

```powershell
npx ai-project-maintainer repair-pack reports/security-report.json --project .\examples\demo-ai-app --output reports
```

Use `reports/agent-tasks.json` with Codex, Cursor, Claude Code, Cline, or another agent. Codex users can also use `reports/codex-tasks.json`. Agents can handle deterministic blockers; the maintainer still owns business decisions such as critical flows, accepted risks, and production evidence.

## 6. Dogfood The Repair Loop

Run the deterministic repair-loop demo:

```powershell
npm run smoke:repair-loop
```

It creates a broken temp copy, runs the gate, generates `agent-tasks.json` and `codex-tasks.json`, applies a simulated AI repair, runs `npm test`, and runs the gate again. The final expected status is `PASS_WITH_GAPS`, proving blockers can be fixed while production gaps stay visible.
