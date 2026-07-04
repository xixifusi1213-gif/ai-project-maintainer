import fs from "node:fs";
import path from "node:path";
import { detectProject } from "./project-detect.mjs";

const mcpConfigPaths = new Set([
  ".mcp.json",
  ".cursor/mcp.json",
  ".vscode/mcp.json",
  "claude_desktop_config.json",
]);

const instructionPathPatterns = [
  /^AGENTS\.md$/i,
  /^CLAUDE\.md$/i,
  /^\.cursorrules$/i,
  /^\.cursor\/rules\/.+/i,
  /^\.github\/copilot-instructions\.md$/i,
  /^\.codex\/.+/i,
];

const promptInjectionDocPatterns = [
  /^README\.md$/i,
  /^docs\/.+\.(md|mdx)$/i,
  /^\.github\/ISSUE_TEMPLATE\/.+\.(md|yml|yaml)$/i,
  /^\.github\/pull_request_template\.md$/i,
];

const scriptPathPattern = /^(scripts|tools|bin)\/.+\.(js|mjs|cjs|ts|tsx|sh|ps1|bat|cmd)$/i;
const sensitiveFilePattern = /(^|\/)(\.env(?:\..*)?|\.npmrc|credentials\.json|service-account\.json|.+_credentials\.json)$/i;
const secretKeyPattern = /(token|secret|password|passwd|api[_-]?key|private[_-]?key|auth|credential|dsn)/i;
const safeEnvReferencePattern = /^(\$\{?[A-Z_][A-Z0-9_]*\}?|%[A-Z_][A-Z0-9_]*%)$/i;

function normalizeRelativePath(filePath) {
  return filePath.replaceAll(path.sep, "/");
}

function readText(root, relativePath) {
  return fs.readFileSync(path.join(root, ...relativePath.split("/")), "utf8").replace(/^\uFEFF/, "");
}

function findFiles(project, predicate) {
  return (project.files || []).filter((file) => predicate(normalizeRelativePath(file)));
}

function statusKey(status) {
  return String(status || "").toLowerCase();
}

function finding({ checkId, name, status, blocking, summary, path: findingPath, recommendation, evidence = {}, coverageGap = false }) {
  return {
    checkId,
    name,
    group: "agent-risk",
    status,
    blocking: Boolean(blocking),
    summary,
    recommendation,
    coverageGap,
    evidence,
    location: findingPath ? { path: findingPath } : undefined,
  };
}

function addSurface(surfaces, surface) {
  const key = `${surface.type}:${surface.path}`;
  if (surfaces.some((item) => `${item.type}:${item.path}` === key)) return;
  surfaces.push(surface);
}

function serverEntries(document) {
  const candidates = document?.mcpServers || document?.servers || document?.mcp?.servers || {};
  if (Array.isArray(candidates)) {
    return candidates.map((item, index) => [item.name || `server-${index + 1}`, item]);
  }
  if (candidates && typeof candidates === "object") return Object.entries(candidates);
  return [];
}

function commandPackageSpec(command, args = []) {
  const commandName = String(command || "").toLowerCase();
  const values = args.map((arg) => String(arg));

  if (["npx", "pnpm", "yarn", "bun", "uvx"].includes(commandName)) {
    return values.find((arg) => !arg.startsWith("-") && arg !== "dlx" && arg !== "exec") || "";
  }

  if (commandName === "npm") {
    const execIndex = values.findIndex((arg) => arg === "exec" || arg === "x");
    if (execIndex !== -1) return values.slice(execIndex + 1).find((arg) => !arg.startsWith("-")) || "";
  }

  return "";
}

function isPinnedPackageSpec(spec) {
  if (!spec) return false;
  if (/^file:|^\.\.?[\\/]|^[A-Za-z]:[\\/]/.test(spec)) return true;
  if (spec.includes("==")) return true;
  if (/^[^@]+@[\w.~^>=<*-]+$/.test(spec)) return true;
  if (/^@[^/]+\/[^@]+@[\w.~^>=<*-]+$/.test(spec)) return true;
  return false;
}

function isExternalPackageCommand(command) {
  return ["npx", "npm", "pnpm", "yarn", "bun", "uvx"].includes(String(command || "").toLowerCase());
}

function broadPermissionArgs(args = [], projectRoot = "") {
  const root = path.resolve(projectRoot).toLowerCase();
  const home = process.env.USERPROFILE || process.env.HOME || "";
  const homeResolved = home ? path.resolve(home).toLowerCase() : "";
  const broad = [];

  for (const arg of args.map((item) => String(item))) {
    const lowered = arg.toLowerCase();
    if (/--(allow-all|dangerously-skip-permissions|full-access|read-write|allow-root|filesystem|fs-root)/i.test(arg)) {
      broad.push(arg);
      continue;
    }
    if (arg === "/" || /^[A-Za-z]:\\?$/.test(arg)) {
      broad.push(arg);
      continue;
    }
    try {
      const resolved = path.resolve(arg).toLowerCase();
      if (resolved === root || (homeResolved && resolved === homeResolved)) broad.push(arg);
    } catch {
      // Ignore invalid path-like arguments.
    }
  }

  return broad;
}

function inlineSecretKeys(env = {}) {
  if (!env || typeof env !== "object") return [];
  return Object.entries(env)
    .filter(([key, value]) => secretKeyPattern.test(key) && typeof value === "string" && value.trim() && !safeEnvReferencePattern.test(value.trim()))
    .map(([key]) => key);
}

function scanMcpConfig(project, relativePath, result) {
  let document;
  try {
    document = JSON.parse(readText(project.root, relativePath));
  } catch {
    result.coverageGaps.push(finding({
      checkId: "agent-mcp-config-parse",
      name: "AI agent MCP config parse",
      status: "GAP",
      blocking: false,
      coverageGap: true,
      path: relativePath,
      summary: `${relativePath} could not be parsed; MCP risk coverage is incomplete.`,
      recommendation: "Fix the JSON syntax, then rerun agent-risk.",
    }));
    return;
  }

  addSurface(result.surfaces, { type: "mcp-config", path: relativePath });

  for (const [serverName, server] of serverEntries(document)) {
    const command = String(server?.command || "");
    const args = Array.isArray(server?.args) ? server.args.map((arg) => String(arg)) : [];
    const secretKeys = inlineSecretKeys(server?.env || {});
    if (secretKeys.length) {
      result.findings.push(finding({
        checkId: "agent-mcp-inline-secret",
        name: "AI agent MCP inline secret",
        status: "fail",
        blocking: true,
        path: relativePath,
        summary: `MCP server '${serverName}' stores secret-like values inline.`,
        recommendation: "Move secret values to environment variables and keep only variable names in configuration.",
        evidence: { server: serverName, keys: secretKeys },
      }));
    }

    const packageSpec = commandPackageSpec(command, args);
    const unpinnedExternal = isExternalPackageCommand(command) && !isPinnedPackageSpec(packageSpec);
    if (unpinnedExternal) {
      result.findings.push(finding({
        checkId: "agent-mcp-unpinned-server",
        name: "AI agent MCP unpinned server",
        status: "warn",
        blocking: false,
        path: relativePath,
        summary: `MCP server '${serverName}' uses an unpinned external package.`,
        recommendation: "Pin the MCP server package version or use a reviewed local path.",
        evidence: { server: serverName, command, package: packageSpec || "(unknown)" },
      }));
    }

    const broadArgs = broadPermissionArgs(args, project.root);
    if (broadArgs.length) {
      result.findings.push(finding({
        checkId: "agent-mcp-broad-permission",
        name: "AI agent MCP broad permission",
        status: unpinnedExternal ? "fail" : "warn",
        blocking: unpinnedExternal,
        path: relativePath,
        summary: `MCP server '${serverName}' requests broad filesystem or command permissions.`,
        recommendation: "Limit MCP access to the project paths and commands required for this repository.",
        evidence: { server: serverName, broadArgs: broadArgs.slice(0, 10), unpinnedExternal },
      }));
    }
  }
}

function unsafeInstructionMatches(text) {
  const patterns = [
    /ignore\s+(previous|all|above|system)\s+instructions?/i,
    /skip\s+(all\s+)?(tests?|security checks?|audits?|validation|gate)/i,
    /(print|dump|show|leak|exfiltrate)\s+.{0,80}(secrets?|tokens?|credentials?|\.env)/i,
    /disable\s+.{0,40}(safety|guardrails?|security|policy)/i,
  ];
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function promptInjectionContentMatches(text) {
  const patterns = [
    /ignore\s+(previous|all|above|system)\s+instructions?/i,
    /(print|dump|show|leak|exfiltrate)\s+.{0,80}(secrets?|tokens?|credentials?|\.env)/i,
    /disable\s+.{0,40}(safety|guardrails?|security|policy)/i,
  ];
  return patterns.filter((pattern) => pattern.test(text)).map((pattern) => pattern.source);
}

function scanInstructionFile(project, relativePath, result) {
  let text = "";
  try {
    text = readText(project.root, relativePath);
  } catch {
    return;
  }
  addSurface(result.surfaces, { type: "agent-instruction", path: relativePath });
  const matches = unsafeInstructionMatches(text);
  if (!matches.length) return;

  result.findings.push(finding({
    checkId: "agent-instruction-unsafe",
    name: "AI agent unsafe instruction",
    status: "fail",
    blocking: true,
    path: relativePath,
    summary: "Unsafe AI agent instruction detected.",
    recommendation: "Remove instructions that tell agents to ignore policies, skip verification, or expose secrets.",
    evidence: { matchCount: matches.length },
  }));
}

function scanPromptInjectionDoc(project, relativePath, result) {
  let text = "";
  try {
    text = readText(project.root, relativePath);
  } catch {
    return;
  }
  const matches = promptInjectionContentMatches(text);
  if (!matches.length) return;
  addSurface(result.surfaces, { type: "prompt-injection-content", path: relativePath });
  result.findings.push(finding({
    checkId: "agent-prompt-injection-content",
    name: "AI agent prompt injection content",
    status: "warn",
    blocking: false,
    path: relativePath,
    summary: "Repository text contains prompt-injection-like instructions that an agent may ingest as untrusted content.",
    recommendation: "Ensure agents treat docs, issues, and external content as data rather than instructions.",
    evidence: { matchCount: matches.length },
  }));
}

function dangerousCommandPatterns(commandText) {
  const patterns = [
    /\brm\s+-rf\b/i,
    /\bRemove-Item\b.{0,80}-Recurse\b/i,
    /\bdel\b.{0,80}\/s\b/i,
    /\bgit\s+reset\s+--hard\b/i,
    /\bgit\s+clean\s+-fdx\b/i,
    /\bchmod\s+777\b/i,
    /\bcurl\b.+\|\s*(sh|bash)\b/i,
    /\bInvoke-WebRequest\b.+\|\s*iex\b/i,
    /\bdrop\s+database\b/i,
    /\btruncate\s+table\b/i,
  ];
  return patterns.filter((pattern) => pattern.test(commandText)).map((pattern) => pattern.source);
}

function scanPackageScripts(project, result) {
  const scripts = project.packageJson?.scripts || {};
  const lifecycle = new Set(["preinstall", "install", "postinstall", "prepublish", "prepare"]);
  for (const [scriptName, commandText] of Object.entries(scripts)) {
    const matches = dangerousCommandPatterns(String(commandText || ""));
    if (!matches.length) continue;
    const blocking = lifecycle.has(scriptName);
    result.findings.push(finding({
      checkId: blocking ? "agent-dangerous-lifecycle-script" : "agent-dangerous-script",
      name: blocking ? "AI agent dangerous lifecycle script" : "AI agent dangerous project script",
      status: blocking ? "fail" : "warn",
      blocking,
      path: "package.json",
      summary: blocking
        ? `Lifecycle script '${scriptName}' contains a destructive or remote-execution command.`
        : `Project script '${scriptName}' contains a destructive or remote-execution command.`,
      recommendation: "Require human review before agents run this script; replace destructive commands with narrowly scoped scripts where possible.",
      evidence: { script: scriptName, matchCount: matches.length },
    }));
  }
}

function scanScriptFiles(project, result) {
  for (const relativePath of findFiles(project, (file) => scriptPathPattern.test(file)).slice(0, 500)) {
    let text = "";
    try {
      text = readText(project.root, relativePath);
    } catch {
      continue;
    }
    const matches = dangerousCommandPatterns(text);
    if (!matches.length) continue;
    addSurface(result.surfaces, { type: "agent-runnable-script", path: relativePath });
    result.findings.push(finding({
      checkId: "agent-dangerous-script",
      name: "AI agent dangerous project script",
      status: "warn",
      blocking: false,
      path: relativePath,
      summary: "Runnable project script contains destructive or remote-execution commands.",
      recommendation: "Require human review before agents run this script and narrow its destructive scope.",
      evidence: { matchCount: matches.length },
    }));
  }
}

function scanSensitiveFiles(project, result) {
  for (const relativePath of findFiles(project, (file) => sensitiveFilePattern.test(file)).slice(0, 50)) {
    addSurface(result.surfaces, { type: "sensitive-file", path: relativePath });
    let keys = [];
    try {
      keys = readText(project.root, relativePath)
        .split(/\r?\n/)
        .map((line) => line.match(/^\s*([A-Za-z_][A-Za-z0-9_.-]*)\s*=/)?.[1])
        .filter(Boolean)
        .filter((key) => secretKeyPattern.test(key))
        .slice(0, 20);
    } catch {
      keys = [];
    }
    result.findings.push(finding({
      checkId: "agent-sensitive-file",
      name: "AI agent sensitive file exposure",
      status: "warn",
      blocking: false,
      path: relativePath,
      summary: `${relativePath} may expose sensitive values to local AI tools.`,
      recommendation: "Keep secrets out of the repository and scope AI tool filesystem access away from env and credential files.",
      evidence: { keys },
    }));
  }
}

export function scanAgentRisk(project) {
  const result = { surfaces: [], findings: [], coverageGaps: [] };

  for (const relativePath of findFiles(project, (file) => mcpConfigPaths.has(file))) {
    scanMcpConfig(project, relativePath, result);
  }

  for (const relativePath of findFiles(project, (file) => instructionPathPatterns.some((pattern) => pattern.test(file)))) {
    scanInstructionFile(project, relativePath, result);
  }

  for (const relativePath of findFiles(project, (file) => promptInjectionDocPatterns.some((pattern) => pattern.test(file)))) {
    scanPromptInjectionDoc(project, relativePath, result);
  }

  scanPackageScripts(project, result);
  scanScriptFiles(project, result);
  scanSensitiveFiles(project, result);

  const blocking = result.findings.filter((item) => item.blocking);
  const warnings = result.findings.filter((item) => !item.blocking && ["warn", "warning", "fail"].includes(statusKey(item.status)));
  const status = blocking.length
    ? "FAIL"
    : (warnings.length || result.coverageGaps.length)
      ? "WARN"
      : result.surfaces.length
        ? "PASS"
        : "N/A";

  return {
    status,
    surfaces: result.surfaces,
    findings: result.findings,
    coverageGaps: result.coverageGaps,
  };
}

export function agentRiskChecks(agentRisk) {
  return [...(agentRisk?.findings || []), ...(agentRisk?.coverageGaps || [])];
}

export function runAgentRiskChecks(project, options = {}) {
  return agentRiskChecks(options.agentRiskReport || scanAgentRisk(project));
}

export function buildAgentRiskReport(projectRoot, options = {}) {
  const project = options.project || detectProject(projectRoot);
  const agentRisk = scanAgentRisk(project);
  const checks = agentRiskChecks(agentRisk);
  return {
    schemaVersion: 1,
    root: project.root,
    generatedAt: options.generatedAt || new Date().toISOString(),
    status: agentRisk.status,
    passed: checks.every((check) => !check.blocking),
    summary: {
      riskCount: agentRisk.findings.length,
      blockerCount: checks.filter((check) => check.blocking).length,
      warningCount: checks.filter((check) => !check.blocking && ["warn", "warning", "fail"].includes(statusKey(check.status))).length,
      gapCount: agentRisk.coverageGaps.length,
      surfaceCount: agentRisk.surfaces.length,
    },
    ...agentRisk,
  };
}

export function toAgentRiskMarkdown(report) {
  const lines = [];
  lines.push(`# AI Agent Risk: ${report.status}`);
  lines.push("");
  lines.push(`Root: ${report.root}`);
  lines.push(`Generated: ${report.generatedAt}`);
  lines.push("");
  lines.push("## Findings");
  if (!(report.findings || []).length) lines.push("- None");
  for (const item of report.findings || []) {
    lines.push(`- ${item.status.toUpperCase()} ${item.name}: ${item.summary}`);
  }
  lines.push("");
  lines.push("## Coverage Gaps");
  if (!(report.coverageGaps || []).length) lines.push("- None");
  for (const item of report.coverageGaps || []) {
    lines.push(`- ${item.name}: ${item.summary}`);
  }
  lines.push("");
  lines.push("## Surfaces");
  if (!(report.surfaces || []).length) lines.push("- None");
  for (const surface of report.surfaces || []) {
    lines.push(`- ${surface.type}: ${surface.path}`);
  }
  lines.push("");
  lines.push("## Next Step");
  if (!report.passed) {
    lines.push("- Fix blocking AI agent permission, instruction, or secret exposure findings before giving agents broad project access.");
  } else if (report.status === "WARN") {
    lines.push("- Review warnings and coverage gaps before running AI agents with filesystem or command access.");
  } else if (report.status === "N/A") {
    lines.push("- No AI agent or MCP configuration was detected. Re-run after adding Codex, MCP, Claude, Cursor, or other agent config.");
  } else {
    lines.push("- No blocking AI agent risk was detected. Keep agent access narrow and rerun before release.");
  }
  return lines.join("\n");
}

export function writeAgentRiskReport(report, outputPath) {
  const jsonPath = path.resolve(outputPath);
  const base = jsonPath.replace(/\.json$/i, "");
  fs.mkdirSync(path.dirname(jsonPath), { recursive: true });
  fs.writeFileSync(jsonPath, JSON.stringify(report, null, 2));
  fs.writeFileSync(`${base}.md`, toAgentRiskMarkdown(report));
}

export function runAgentRisk(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const report = buildAgentRiskReport(root, options);
  if (options.writeReports || options.outputPath) {
    writeAgentRiskReport(report, options.outputPath || path.join(root, "reports", "agent-risk-report.json"));
  }
  return report;
}
