# AI Agent Repair Pack

`repair-pack` turns a gate report into a repair workflow for AI coding assistants.

It does not modify the project. It reads `reports/security-report.json` and writes task files that can be handed to Codex, Cursor, Claude Code, Cline, or another agent.

## Command

```powershell
npx ai-project-maintainer repair-pack "E:\my-project\reports\security-report.json" --project "E:\my-project" --output "E:\my-project\reports"
```

Source checkout equivalent:

```powershell
node .\ai-project-maintainer\scripts\repair-pack.mjs "E:\my-project\reports\security-report.json" --project "E:\my-project" --output "E:\my-project\reports"
```

## Outputs

```text
reports/fix-plan.md
reports/agent-tasks.json
reports/codex-tasks.json
reports/recheck-commands.ps1
reports/recheck-commands.sh
```

- `fix-plan.md`: human-readable repair plan.
- `agent-tasks.json`: primary generic task format for AI agents.
- `codex-tasks.json`: Codex-compatible adapter with extra instructions.
- `recheck-commands.ps1`: PowerShell recheck commands.
- `recheck-commands.sh`: POSIX shell recheck commands.

## Task Types

`auto_fix_candidate`: an AI agent can attempt a fix, then run the verification commands.

Examples: failing tests, dangerous Electron settings, dependency upgrades, static-analysis findings, workflow lint failures, unsafe AI-agent instructions.

`needs_maintainer_decision`: the maintainer must answer or accept risk before the agent edits anything.

Examples: missing production monitoring evidence, missing business-flow declarations, release approval decisions, production evidence gaps.

v1.5.0 production safety examples: missing `data-boundaries.yml`, missing `authz-matrix.yml`, missing object-level authorization tests, missing sensitive-log redaction evidence, or missing idempotency/replay evidence for payment/order/webhook/cron/queue flows.

`manual_review_required`: the agent can prepare evidence and suggestions, but a human must approve the actual change.

Examples: exposed secrets that require credential rotation, complex database migrations, permission model changes, production rollback strategy.

`recheck_only`: no direct code change is implied; rerun verification after related fixes.

## Task Shape

```json
{
  "id": "fix-001",
  "title": "Fix dangerous Electron preload exposure",
  "type": "auto_fix_candidate",
  "findingKind": "untriaged_scanner_finding",
  "severity": "P2",
  "source": {
    "report": "reports/security-report.json",
    "checkId": "electron-ipc",
    "group": "electron"
  },
  "evidence": [],
  "targetFiles": [],
  "fixStrategy": "",
  "userDecisionRequired": false,
  "verificationCommands": [],
  "riskNotes": ""
}
```

`findingKind` is copied from the source report. It tells the agent whether the task came from validated vulnerability evidence, an untriaged scanner result, a deterministic check failure, missing production evidence, a maintainer decision, or an unavailable tool/environment. The task type still controls who may act; classification does not grant an AI agent permission to accept risk.

## Intended Loop

```text
gate -> repair-pack -> AI fixes selected tasks -> recheck commands -> gate again
```

Run the full gate again after fixing tasks:

```powershell
npx ai-project-maintainer gate "E:\my-project" --profile auto --production --agent-risk --strict --release --output reports/security-report.json
```

Then regenerate the repair pack if any blockers, warnings, gaps, or user decisions remain.

## Safety Rules

- The repair pack does not run project scripts.
- The repair pack does not call external AI APIs.
- The repair pack does not deploy, roll back, or modify production systems.
- Token-like values, `Authorization`, `Bearer`, passwords, API keys, and DSNs are redacted before task files are written.
- `needs_maintainer_decision` and `manual_review_required` tasks are not permission for an agent to guess production risk acceptance.
- `untriaged_scanner_finding` is not a confirmed vulnerability until project-specific validation says so.
- `production_evidence_gap` and `environment_tooling_issue` describe incomplete evidence, not discovered vulnerabilities.

## Agent Guidance

Use `agent-tasks.json` as the default format for general AI tools.

Use `codex-tasks.json` when working in Codex; it includes the same tasks plus Codex-oriented instructions.

Use `agent-tasks.json` with Cursor, Claude Code, Cline, or other AI coding assistants. Add `fix-plan.md` as human-readable context when the tool accepts extra files or prompt context.

Recommended file choice:

| Agent | Primary input |
| --- | --- |
| Codex | `reports/codex-tasks.json` |
| Cursor | `reports/agent-tasks.json` plus `reports/fix-plan.md` |
| Claude Code | `reports/agent-tasks.json` plus `reports/fix-plan.md` |
| Cline | `reports/agent-tasks.json` plus `reports/fix-plan.md` |

For other agents, pass the same rule:

```text
Fix auto_fix_candidate tasks first. Ask the maintainer before changing needs_maintainer_decision or manual_review_required tasks. After each fix, run the task verificationCommands before rerunning the full gate.
```

Do not let an agent treat production `GAP`, `needs_maintainer_decision`, or `manual_review_required` tasks as permission to invent evidence or accept risk. Those tasks require the maintainer to answer, provide evidence, or explicitly accept the risk.

For production data or authorization gaps, the agent may draft tests, inspect code paths, or propose YAML updates, but it must not claim that user data, tenant isolation, admin permissions, logs, payments, orders, webhooks, queues, or database writes are safe without maintainer-confirmed evidence.
