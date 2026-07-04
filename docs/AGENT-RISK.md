# AI Agent Risk Checks

`agent-risk` checks the local risk created by giving AI agents access to a repository. It is designed for Codex, MCP, Claude, Cursor, and similar agent-assisted maintenance workflows.

It does not call OpenAI or Codex APIs. It does not start MCP servers. It does not execute project scripts. It only reads local configuration and source files.

## Commands

```powershell
npx ai-project-maintainer agent-risk "E:\my-project"
npx ai-project-maintainer agent-risk "E:\my-project" --output reports/agent-risk-report.json
npx ai-project-maintainer gate "E:\my-project" --agent-risk --strict --release --output reports/security-report.json
```

Source checkout:

```powershell
node .\ai-project-maintainer\scripts\agent-risk.mjs "E:\my-project" --output reports/agent-risk-report.json
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\my-project" --agent-risk --strict
```

## What It Reads

- MCP config: `.mcp.json`, `.cursor/mcp.json`, `.vscode/mcp.json`, `claude_desktop_config.json`
- Agent instructions: `AGENTS.md`, `CLAUDE.md`, `.cursorrules`, `.cursor/rules/**`, `.github/copilot-instructions.md`, `.codex/**`
- Prompt-injection-like content: `README.md`, `docs/**`, GitHub issue and PR templates
- Scripts: `package.json` scripts, `scripts/**`, `tools/**`, `bin/**`
- Sensitive filenames: `.env*`, `.npmrc`, cloud credential-style JSON files

Sensitive files are only used to report filenames and key names. Values are not written to JSON, Markdown, or SARIF.

## Blocking Findings

These fail the gate by default:

- MCP or agent config stores token-like values inline.
- Agent instructions tell the tool to ignore rules, skip tests/security checks, or expose secrets.
- Package lifecycle scripts such as `preinstall`, `postinstall`, or `prepare` contain destructive or remote-execution commands.
- An MCP server combines unpinned external package execution with broad filesystem or command permissions.

You can downgrade a specific finding with a narrow exception, or disable the category explicitly:

```yaml
fail_on:
  agent_high_risk: false
```

That should be used as a conscious owner decision, not as a default.

## Warnings

These are reported but do not block by default:

- MCP server package is not pinned.
- Non-lifecycle project scripts contain destructive commands.
- Repository docs contain prompt-injection-like text that an agent may ingest as untrusted content.
- Sensitive local files exist near the project.

## Statuses

```text
FAIL  blocking agent or MCP risk found
WARN  non-blocking risk or incomplete coverage found
PASS  agent surfaces exist and no risk was found
N/A   no agent or MCP surface was detected
```

Malformed MCP config is reported as a coverage gap. Fix the syntax and rerun the command before trusting the result.

## Limits

This check is a local static review. It cannot prove that a hosted AI product, MCP server, or model provider is safe. It only checks the repository-side permissions and instructions that are visible before an agent starts working.

The practical workflow is:

```text
agent-risk -> fix blocking permission/instruction issues -> run gate -> let Codex fix blockers -> rerun
```

For deeper security review, pair this with Codex Security, Semgrep, Gitleaks, Trivy, and human review for high-risk production systems.
