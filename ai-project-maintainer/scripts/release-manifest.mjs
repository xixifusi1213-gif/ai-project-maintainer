#!/usr/bin/env node
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, "..", "..");

export function parseArgs(argv) {
  const args = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith("--")) {
      const key = arg.slice(2).replace(/-([a-z])/g, (_, char) => char.toUpperCase());
      args[key] = argv[i + 1];
      i += 1;
    }
  }
  return args;
}

export function sha256File(filePath) {
  const hash = crypto.createHash("sha256");
  hash.update(fs.readFileSync(filePath));
  return hash.digest("hex");
}

function runGit(args, options = {}) {
  const result = spawnSync("git", args, {
    cwd: options.cwd || repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) return "";
  return String(result.stdout || "").trim();
}

function requiredFile(filePath, label) {
  if (!filePath) throw new Error(`Missing required --${label} argument.`);
  const resolved = path.resolve(filePath);
  if (!fs.existsSync(resolved)) throw new Error(`${label} file does not exist: ${resolved}`);
  return resolved;
}

function fileEvidence(filePath) {
  const stats = fs.statSync(filePath);
  return {
    path: path.relative(repoRoot, filePath).replaceAll("\\", "/"),
    name: path.basename(filePath),
    bytes: stats.size,
    sha256: sha256File(filePath),
  };
}

export function buildReleaseManifest(options = {}) {
  const pkg = JSON.parse(fs.readFileSync(path.join(repoRoot, "package.json"), "utf8"));
  const version = options.version || pkg.version;
  const tag = options.tag || `v${version}`;
  const tarball = requiredFile(options.tarball, "tarball");
  const sbom = requiredFile(options.sbom, "sbom");
  const report = requiredFile(options.report, "report");
  const commit = options.commit || process.env.GITHUB_SHA || runGit(["rev-parse", "HEAD"]);
  const repository = process.env.GITHUB_REPOSITORY || "xixifusi1213-gif/ai-project-maintainer";
  const workflowRunUrl = process.env.GITHUB_RUN_ID
    ? `${process.env.GITHUB_SERVER_URL || "https://github.com"}/${repository}/actions/runs/${process.env.GITHUB_RUN_ID}`
    : null;

  if (pkg.version !== version) {
    throw new Error(`package.json version ${pkg.version} does not match manifest version ${version}.`);
  }

  return {
    schemaVersion: 1,
    package: {
      name: pkg.name,
      version,
      npm: `https://www.npmjs.com/package/${pkg.name}/v/${version}`,
    },
    git: {
      repository,
      commit,
      tag,
      release: `https://github.com/${repository}/releases/tag/${tag}`,
    },
    workflow: {
      name: process.env.GITHUB_WORKFLOW || null,
      runId: process.env.GITHUB_RUN_ID || null,
      runUrl: workflowRunUrl,
    },
    artifacts: {
      tarball: fileEvidence(tarball),
      sbom: fileEvidence(sbom),
      securityReport: fileEvidence(report),
    },
    generatedAt: new Date().toISOString(),
  };
}

export function toMarkdown(manifest) {
  return [
    `# Release Manifest: ${manifest.package.name}@${manifest.package.version}`,
    "",
    `Package: \`${manifest.package.name}@${manifest.package.version}\``,
    `Git tag: \`${manifest.git.tag}\``,
    `Git commit: \`${manifest.git.commit}\``,
    manifest.workflow.runUrl ? `Workflow run: ${manifest.workflow.runUrl}` : "Workflow run: local generation",
    "",
    "## Artifacts",
    "",
    "| Artifact | File | SHA256 | Bytes |",
    "| --- | --- | --- | ---: |",
    `| npm tarball | \`${manifest.artifacts.tarball.name}\` | \`${manifest.artifacts.tarball.sha256}\` | ${manifest.artifacts.tarball.bytes} |`,
    `| SBOM | \`${manifest.artifacts.sbom.name}\` | \`${manifest.artifacts.sbom.sha256}\` | ${manifest.artifacts.sbom.bytes} |`,
    `| Security report | \`${manifest.artifacts.securityReport.name}\` | \`${manifest.artifacts.securityReport.sha256}\` | ${manifest.artifacts.securityReport.bytes} |`,
    "",
    "This manifest records release evidence. It is not a security guarantee by itself.",
    "",
  ].join("\n");
}

export function writeReleaseManifest(options = {}) {
  const output = path.resolve(options.output || "dist/release-manifest.json");
  const manifest = buildReleaseManifest(options);
  fs.mkdirSync(path.dirname(output), { recursive: true });
  fs.writeFileSync(output, `${JSON.stringify(manifest, null, 2)}\n`);
  const markdownOutput = output.replace(/\.json$/i, ".md");
  fs.writeFileSync(markdownOutput, toMarkdown(manifest));
  return { manifest, output, markdownOutput };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = writeReleaseManifest(parseArgs(process.argv.slice(2)));
    console.log(`Release manifest written: ${result.output}`);
    console.log(`Release manifest markdown written: ${result.markdownOutput}`);
  } catch (error) {
    console.error(error.message);
    process.exit(1);
  }
}
