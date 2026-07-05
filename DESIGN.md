# Design Notes

`ai-project-maintainer` is a production maintenance evidence gate for AI-coded projects.

Its design goal is narrow: make release readiness explicit enough that a maintainer and an AI coding agent can fix blockers, fill gaps, and rerun the same gate locally and in CI.

## Principles

- Treat AI-generated code as untrusted until deterministic checks pass.
- Prefer local, account-free checks first.
- Check AI agent permissions and instructions before giving agents broad repository access.
- Use mature scanners and platform APIs instead of inventing custom vulnerability detection.
- Keep production connectors read-only.
- Keep missing evidence visible as `GAP`.
- Publish official releases through a traceable GitHub Actions and npm provenance chain.
- Let AI assist with fixes, but keep risk acceptance with the human maintainer.

## Why GAP Does Not Block by Default

Many personal and open source projects do not have production monitoring, release approvals, or database governance on day one.

Blocking every missing evidence source would make the tool unusable as an adoption path. Instead, `GAP` is visible by default and can be promoted to a blocker in `.ai-maintainer/risk-policy.yml` when the project reaches stricter release needs.

## Why Connectors Are Read-Only

Production systems should not be modified by a gate whose job is to collect evidence.

Connectors only read facts such as release approval, deployment records, monitoring projects, alert rules, and migration governance. They do not deploy, roll back, create alerts, change environment variables, modify databases, or store tokens.

## Why Standards Are Attached to Reports

The tool is not a compliance product. The standards mapping exists to show that the gate is based on recognized engineering practices rather than arbitrary AI-generated checklists.

Each report can show which checks relate to secure software development, supply-chain integrity, monitoring, release engineering, recovery, and risk acceptance.

## Why Agent Risk Checks Are Local-Only

Agent risk checks review repository-side configuration: MCP server definitions, Codex/Claude/Cursor instructions, prompt-injection-like content, sensitive filenames, and dangerous scripts. They do not execute agents or MCP servers because the gate should be safe to run before trust has been established.

The result is a preflight check for the maintenance workflow, not a certification of any model, hosted agent product, or third-party MCP service.

## Why v1.0 Uses Trusted Publishing

The project is a release readiness gate, so its own releases should not depend on hidden local state.

v1.0 uses GitHub Actions, npm Trusted Publishing, SBOM generation, release manifests, and published-release verification so users can connect an npm package back to a GitHub tag and workflow run.
