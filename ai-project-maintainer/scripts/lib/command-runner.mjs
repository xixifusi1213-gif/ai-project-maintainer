import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const maxOutput = 6000;

export const DEFAULT_ALLOWED_COMMANDS = new Set([
  "actionlint",
  "bun",
  "checkov",
  "git",
  "gitleaks",
  "grype",
  "mega-linter-runner",
  "npm",
  "osv-scanner",
  "pre-commit",
  "pnpm",
  "scorecard",
  "semgrep",
  "squawk",
  "syft",
  "trivy",
  "yarn",
  "zizmor",
]);

export function exists(filePath) {
  try {
    fs.accessSync(filePath);
    return true;
  } catch {
    return false;
  }
}

export function tail(value, limit = maxOutput) {
  const text = String(value || "").trim();
  const outputLimit = Number.isFinite(limit) && limit > 0 ? limit : maxOutput;
  if (text.length <= outputLimit) return text;
  return text.slice(text.length - outputLimit);
}

export function commandPath(command, options = {}) {
  const allowedCommands = options.allowedCommands || DEFAULT_ALLOWED_COMMANDS;
  if (!allowedCommands.has(command)) return null;

  const pathValue = options.envPath ?? process.env.PATH ?? "";
  const preferredBins =
    options.envPath === undefined
      ? [
          process.env.AI_PROJECT_MAINTAINER_TOOLS_BIN,
          path.join(os.homedir(), ".codex", "security-tools", "bin"),
        ].filter(Boolean)
      : [];
  const exts = isWindows ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";") : [""];

  for (const dir of [...preferredBins, ...pathValue.split(path.delimiter)]) {
    if (!dir) continue;
    for (const ext of exts) {
      const candidate = path.join(dir, command + ext);
      if (exists(candidate)) return candidate;
    }
  }
  return null;
}

function isWindowsScriptShim(filePath) {
  return isWindows && /\.(cmd|bat)$/i.test(filePath);
}

function spawnTarget(resolved, args) {
  if (!isWindowsScriptShim(resolved)) return { file: resolved, args };
  return {
    file: process.env.ComSpec || "cmd.exe",
    args: ["/d", "/s", "/c", "call", resolved, ...args],
  };
}

export function runCommand(command, commandArgs = [], options = {}) {
  const outputLimit = options.maxOutput || maxOutput;
  if (typeof options.commandRunner === "function") {
    const started = Date.now();
    const commandText = [command, ...commandArgs].join(" ");
    const result = options.commandRunner(command, commandArgs, options) || {};
    return {
      status: result.status || (result.code === 0 ? "pass" : "fail"),
      command: result.command || commandText,
      stdout: tail(result.stdout, outputLimit),
      stderr: tail(result.stderr || result.error?.message || "", outputLimit),
      code: result.code ?? null,
      durationMs: result.durationMs ?? Date.now() - started,
    };
  }

  const resolved = commandPath(command, options);
  const commandText = [command, ...commandArgs].join(" ");
  if (!resolved) {
    return {
      status: "missing",
      command: commandText,
      stdout: "",
      stderr: `${command} is not installed or not on PATH`,
      code: null,
      durationMs: 0,
    };
  }

  const started = Date.now();
  // Commands are resolved from an allowlist; Windows .cmd/.bat shims are routed through cmd.exe call.
  const target = spawnTarget(resolved, commandArgs);
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
  const result = spawnSync(target.file, target.args, {
    cwd: options.cwd || process.cwd(),
    encoding: "utf8",
    timeout: options.timeoutMs || 10 * 60 * 1000,
    maxBuffer: options.maxBuffer || 20 * 1024 * 1024,
    env: options.env || process.env,
  });

  return {
    status: result.status === 0 ? "pass" : "fail",
    command: commandText,
    stdout: tail(result.stdout, outputLimit),
    stderr: tail(result.stderr || result.error?.message || "", outputLimit),
    code: result.status,
    durationMs: Date.now() - started,
  };
}

export function getToolVersions(commands, options = {}) {
  const versions = { node: process.version };
  for (const command of commands) {
    const result = runCommand(command, ["--version"], {
      ...options,
      timeoutMs: options.timeoutMs || 30 * 1000,
    });
    versions[command] =
      result.status === "missing"
        ? "missing"
        : tail(`${result.stdout}\n${result.stderr}`).split(/\r?\n/).find(Boolean) || `exit ${result.code}`;
  }
  return versions;
}
