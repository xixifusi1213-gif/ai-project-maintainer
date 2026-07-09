# Report Schema Stability

v1.0.0 marks the public report format as stable for the `1.x` release line.

The tool may add new fields in `1.x`, but it should not remove or rename stable fields until `2.0`.

v1.5.0 adds production safety inputs and audit items for data boundaries, authorization matrices, critical business-flow safety, database write safety, and AI repair safety. These are additive to the stable report shape.

v1.5.1 adds `findingSummary` and per-check `findingKind` values. These explain what a non-passing item means without changing whether it blocks.

Production accident checks may use more specific `group` values instead of the older broad `production-audit` group:

- `data-exposure`
- `auth-boundary`
- `business-flow-safety`
- `database-safety`
- `operational-safety`
- `ai-repair-safety`

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
- `findingSummary`

The `audit.plan`, `audit.coverageGaps`, and generated `checks` may include production safety ids such as:

- `data-boundaries`
- `sensitive-log-redaction`
- `authz-matrix`
- `authz-object-tests`
- `business-flow-idempotency`
- `business-flow-abuse-controls`
- `database-write-safety`
- `database-audit-log`
- `ai-repair-safety`

Each check item should keep:

- `name`
- `group`
- `status`
- `blocking`
- `evidenceLevel`
- `standardRefs`
- `findingKind` for non-passing items

## Finding Kind Semantics

- `confirmed_vulnerability`: explicitly validated vulnerability evidence. The tool never infers this label from scanner output alone.
- `untriaged_scanner_finding`: a scanner matched a possible issue that still needs project-specific validation.
- `verified_check_failure`: a deterministic test, build, or engineering check failed; this is not automatically a vulnerability.
- `production_evidence_gap`: required production proof is missing; this is not a discovered vulnerability.
- `maintainer_decision`: business context or risk acceptance must be supplied by a human maintainer.
- `environment_tooling_issue`: a scanner, vulnerability database, dependency, network step, or local tool was unavailable, so evidence is incomplete.

`findingSummary` uses this shape:

```json
{
  "total": 2,
  "byKind": {
    "confirmed_vulnerability": 0,
    "untriaged_scanner_finding": 1,
    "verified_check_failure": 0,
    "production_evidence_gap": 0,
    "maintainer_decision": 0,
    "environment_tooling_issue": 1
  }
}
```

SARIF keeps non-code production evidence gaps and maintainer decisions out of GitHub Code Scanning by default, even when they block the release gate. Consumers can opt into those records with `includeCoverageGaps`, where the SARIF result carries `properties.findingKind` so it is not mislabeled as a vulnerability.

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
- `findingKind`
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
