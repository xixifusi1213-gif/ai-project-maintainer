#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

export function parseArgs(argv) {
  const args = { mode: null };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--prepublish") {
      args.mode = "prepublish";
    } else if (arg === "--published") {
      args.mode = "published";
    } else if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function fail(message) {
  throw new Error(message);
}

export function resolveSpawnCommand(command, platform = process.platform) {
  if (platform === "win32" && command === "npm") return "npm.cmd";
  return command;
}

export function resolveSpawnTarget(command, args, platform = process.platform, env = process.env) {
  const resolved = resolveSpawnCommand(command, platform);
  if (platform === "win32" && resolved === "npm.cmd") {
    return {
      command: env.ComSpec || env.comspec || "cmd.exe",
      args: ["/d", "/s", "/c", "call", resolved, ...args],
    };
  }
  return { command: resolved, args };
}

function defaultRunner(command, args, options = {}) {
  // The verifier calls a fixed set of release-inspection commands without shell expansion.
  const target = resolveSpawnTarget(command, args);
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
  const result = spawnSync(target.command, target.args, {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
    timeout: options.timeoutMs || 60_000,
    maxBuffer: 10 * 1024 * 1024,
  });
  return {
    status: result.status,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    error: result.error || null,
  };
}

function commandFailureOutput(result) {
  return result.error?.message || result.stderr || result.stdout || "";
}

function runJson(runner, command, args) {
  const result = runner(command, args);
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}\n${commandFailureOutput(result)}`);
  }
  return JSON.parse(result.stdout);
}

function runText(runner, command, args) {
  const result = runner(command, args);
  if (result.status !== 0) {
    fail(`Command failed: ${command} ${args.join(" ")}\n${commandFailureOutput(result)}`);
  }
  return result.stdout.trim();
}

function expectedTag(version, tag) {
  const expected = `v${version}`;
  if (tag !== expected) fail(`Expected tag ${expected}, got ${tag}.`);
}

export function verifyPrepublish(options = {}) {
  const root = path.resolve(options.root || repoRoot);
  const version = options.version || fail("Missing --version.");
  const tag = options.tag || `v${version}`;
  expectedTag(version, tag);

  const pkg = readJson(path.join(root, "package.json"));
  const lock = readJson(path.join(root, "package-lock.json"));
  if (pkg.version !== version) fail(`package.json version ${pkg.version} does not match ${version}.`);
  if (lock.version !== version) fail(`package-lock.json version ${lock.version} does not match ${version}.`);
  if (lock.packages?.[""]?.version !== version) {
    fail(`package-lock root package version ${lock.packages?.[""]?.version} does not match ${version}.`);
  }

  const releaseNotes = path.join(root, "docs", "releases", `${tag}.md`);
  if (!fs.existsSync(releaseNotes)) fail(`Missing release notes: ${releaseNotes}`);

  if (options.tarball) {
    const tarballName = path.basename(options.tarball);
    const expectedName = `${pkg.name}-${version}.tgz`;
    if (tarballName !== expectedName) fail(`Expected tarball ${expectedName}, got ${tarballName}.`);
  }

  if (options.manifest) {
    const manifest = readJson(path.resolve(options.manifest));
    if (manifest.package?.version !== version) fail(`Manifest version ${manifest.package?.version} does not match ${version}.`);
    if (manifest.git?.tag !== tag) fail(`Manifest tag ${manifest.git?.tag} does not match ${tag}.`);
  }

  return { ok: true, version, tag };
}

function parseTagSha(output, tag) {
  const target = `refs/tags/${tag}`;
  const peeled = `${target}^{}`;
  const lines = output.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const peeledLine = lines.find((line) => line.endsWith(peeled));
  const directLine = lines.find((line) => line.endsWith(target));
  const line = peeledLine || directLine;
  if (!line) return null;
  return line.split(/\s+/)[0];
}

export function verifyPublished(options = {}, deps = {}) {
  const version = options.version || fail("Missing --version.");
  const tag = options.tag || `v${version}`;
  expectedTag(version, tag);
  const runner = deps.runner || defaultRunner;
  const manifestPath = path.resolve(options.manifest || "dist/release-manifest.json");
  if (!fs.existsSync(manifestPath)) fail(`Missing release manifest: ${manifestPath}`);
  const manifest = readJson(manifestPath);
  const packageName = manifest.package?.name || "ai-project-maintainer";
  const expectedCommit = manifest.git?.commit;
  if (!expectedCommit) fail("Release manifest does not include git.commit.");

  const npmView = runJson(runner, "npm", ["view", packageName, "version", "dist-tags", "--registry=https://registry.npmjs.org/", "--json"]);
  if (npmView.version !== version) fail(`npm version ${npmView.version} does not match ${version}.`);
  if (npmView["dist-tags"]?.latest !== version) fail(`npm latest ${npmView["dist-tags"]?.latest} does not match ${version}.`);

  const release = runJson(runner, "gh", ["release", "view", tag, "--json", "tagName,targetCommitish,url"]);
  if (release.tagName !== tag) fail(`GitHub Release tag ${release.tagName} does not match ${tag}.`);
  if (![expectedCommit, tag, "main"].includes(release.targetCommitish)) {
    fail(`GitHub Release target ${release.targetCommitish} does not match manifest commit ${expectedCommit}.`);
  }

  const tagOutput = runText(runner, "git", ["ls-remote", "origin", `refs/tags/${tag}*`]);
  const tagSha = parseTagSha(tagOutput, tag);
  if (tagSha !== expectedCommit) fail(`Remote tag commit ${tagSha || "<missing>"} does not match manifest commit ${expectedCommit}.`);

  return { ok: true, version, tag, commit: expectedCommit, npm: npmView, release };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  try {
    const result = args.mode === "published" ? verifyPublished(args) : verifyPrepublish(args);
    console.log(`Release verification passed for ${result.tag}.`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
