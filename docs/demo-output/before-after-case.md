# Before/After Case: Demo AI App

This case uses the real runnable project in `examples/demo-ai-app`.

It is intentionally small, but it exercises the complete maintenance loop:

```text
broken behavior -> test failure -> fixed behavior -> production gate -> evidence gaps -> CI security workflow
```

## Project

`examples/demo-ai-app` is a Node.js order-risk module with two business-critical rules:

- customer-visible totals must include shipping exactly once
- an order can be released only when payment, stock, and risk checks all pass

## Before

Generate a broken copy outside the repository:

```powershell
node .\examples\demo-ai-app\scripts\create-before-state.mjs
```

Run tests inside the printed temp directory:

```powershell
npm test
```

Expected failures:

```text
FAIL expensive orders require manual review before release
FAIL orders are released only when payment, stock, and risk checks all pass
```

This shows the exact problem the tool is meant to catch: AI-coded changes can look plausible while breaking release-critical behavior.

## After

Run the healthy project:

```powershell
npm test --prefix .\examples\demo-ai-app
npm run build --prefix .\examples\demo-ai-app
node .\examples\demo-ai-app\scripts\run-demo-gate.mjs
```

Expected result:

```text
Local Security Gate: PASS_WITH_GAPS
Blocking Checks: None
Open Source Maintenance Score: 75/100 (B)
```

The gate still reports production evidence gaps:

```text
GAP Production release approval
GAP Error monitoring
GAP Production logs
GAP Production metrics
GAP Production alerts
```

That distinction is the core value:

- checked failures block release
- missing production evidence is visible
- maintainers keep ownership of business decisions
- Codex can fix deterministic blockers and rerun the gate

## GitHub Evidence

The repository dogfoods the workflow:

- CI workflow: tests, syntax checks, package validation, smoke gate
- Security workflow: Gitleaks, Trivy, Semgrep, OSV-Scanner, Syft, Grype, actionlint, zizmor, OpenSSF Scorecard, production gate

Use this case when posting about the project:

```text
I built a production-readiness gate for AI-coded projects.

The demo shows a broken AI-coded before state, failing business tests, the fixed after state, a production gate report, and a green GitHub Security workflow.

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
```
