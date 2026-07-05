# Report Schema Stability

v1.0.0 marks the public report format as stable for the `1.x` release line.

The tool may add new fields in `1.x`, but it should not remove or rename stable fields until `2.0`.

## Stable CLI Commands

The following commands are stable for the `1.x` release line:

- `doctor`
- `init`
- `init-audit`
- `audit-plan`
- `gate`
- `summary`
- `connectors doctor`
- `evidence`
- `agent-risk`
- `repair-pack`

## Stable Top-Level Fields

The following fields are stable in `reports/security-report.json`:

- `schemaVersion`
- `overallStatus`
- `passed`
- `checks`
- `blockers`
- `warnings`
- `coverageGaps`
- `profile`
- `audit`
- `agentRisk`
- `standards`

Each check item should keep:

- `name`
- `group`
- `status`
- `blocking`
- `evidenceLevel`
- `standardRefs`

## Status Semantics

- `FAIL`: at least one blocking finding or invalid exception exists.
- `PASS_WITH_GAPS`: no blockers, but production evidence gaps or user decisions remain.
- `PASS_WITH_WARNINGS`: no blockers or gaps, but non-blocking warnings remain.
- `PASS`: no blockers, warnings, gaps, or user decisions.

The legacy `passed` boolean remains compatible: only blocking findings and invalid exceptions make it `false`.

## Repair Pack Schema

`repair-pack` reads `reports/security-report.json` and writes a separate AI-agent task schema:

```text
reports/fix-plan.md
reports/agent-tasks.json
reports/codex-tasks.json
reports/recheck-commands.ps1
reports/recheck-commands.sh
```

`reports/agent-tasks.json` is the stable primary format. `reports/codex-tasks.json` is a compatibility adapter for Codex.

Stable top-level fields:

- `schemaVersion`
- `generatedAt`
- `sourceReport`
- `projectRoot`
- `overallStatus`
- `summary`
- `tasks`
- `recheckCommands`

Stable task fields:

- `id`
- `title`
- `type`
- `severity`
- `source`
- `evidence`
- `targetFiles`
- `fixStrategy`
- `userDecisionRequired`
- `verificationCommands`
- `riskNotes`

Stable task types:

- `auto_fix_candidate`
- `needs_maintainer_decision`
- `manual_review_required`
- `recheck_only`

## Compatibility Rule

Consumers should ignore unknown fields. `1.x` releases can add fields to improve evidence, but stable field removal or incompatible meaning changes require a future major version.
