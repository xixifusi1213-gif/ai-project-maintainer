#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";

const root = path.resolve(process.argv[2] || process.cwd());
const maxFiles = 8000;
const skipDirs = new Set([
  ".git",
  ".hg",
  ".svn",
  "node_modules",
  "vendor",
  ".next",
  ".nuxt",
  "dist",
  "build",
  "target",
  "coverage",
  ".venv",
  "venv",
  "__pycache__",
]);

function safeStat(filePath) {
  try {
    return fs.statSync(filePath);
  } catch {
    return null;
  }
}

function rel(filePath) {
  return path.relative(root, filePath).replaceAll(path.sep, "/") || ".";
}

function walk(dir, depth = 0, files = []) {
  if (files.length >= maxFiles || depth > 8) return files;
  let entries = [];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return files;
  }

  for (const entry of entries) {
    if (files.length >= maxFiles) break;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (!skipDirs.has(entry.name)) walk(full, depth + 1, files);
    } else if (entry.isFile()) {
      files.push(rel(full));
    }
  }
  return files;
}

function hasAny(files, predicates) {
  return files.filter((file) => predicates.some((predicate) => predicate(file)));
}

function commandExists(command) {
  const pathValue = process.env.PATH || "";
  const exts = process.platform === "win32"
    ? (process.env.PATHEXT || ".EXE;.CMD;.BAT;.COM").split(";")
    : [""];
  for (const dir of pathValue.split(path.delimiter)) {
    if (!dir) continue;
    const base = path.join(dir, command);
    for (const ext of exts) {
      if (safeStat(base + ext)) return true;
    }
  }
  return false;
}

function git(args) {
  try {
    return execFileSync("git", args, {
      cwd: root,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return null;
  }
}

function countExtensions(files) {
  const counts = {};
  for (const file of files) {
    const ext = path.extname(file).toLowerCase() || "[none]";
    counts[ext] = (counts[ext] || 0) + 1;
  }
  return Object.fromEntries(
    Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 30),
  );
}

const files = walk(root);
const lower = files.map((file) => file.toLowerCase());

const packageManagers = {
  npm: lower.includes("package-lock.json"),
  pnpm: lower.includes("pnpm-lock.yaml"),
  yarn: lower.includes("yarn.lock"),
  bun: lower.includes("bun.lockb") || lower.includes("bun.lock"),
  pythonPip: lower.includes("requirements.txt"),
  poetry: lower.includes("poetry.lock"),
  pipenv: lower.includes("pipfile.lock"),
  go: lower.includes("go.mod"),
  rust: lower.includes("cargo.lock"),
  maven: lower.includes("pom.xml"),
  gradle: lower.some((file) => file.endsWith("build.gradle") || file.endsWith("build.gradle.kts")),
  dotnet: lower.some((file) => file.endsWith(".csproj") || file.endsWith(".sln")),
  ruby: lower.includes("gemfile.lock"),
  php: lower.includes("composer.lock"),
};

const databaseFiles = hasAny(files, [
  (file) => /(^|\/)(migrations?|db\/migrate|schema|alembic|flyway|liquibase)(\/|$)/i.test(file),
  (file) => /\.(sql|prisma)$/i.test(file),
  (file) => /drizzle|knexfile|sequelize|typeorm|schema\.rb|structure\.sql/i.test(file),
]);

const infraFiles = hasAny(files, [
  (file) => /(^|\/)dockerfile$/i.test(file) || /docker-compose.*\.ya?ml$/i.test(file),
  (file) => /\.(tf|tfvars)$/i.test(file),
  (file) => /(^|\/)(charts?|helm|k8s|kubernetes|manifests)(\/|$)/i.test(file),
  (file) => /(^|\/)(pulumi|cloudformation|serverless)\./i.test(file),
  (file) => /(^|\/)\.github\/workflows\/.+\.ya?ml$/i.test(file),
]);

const securitySensitiveFiles = hasAny(files, [
  (file) => /(^|\/)\.env(\.|$)/i.test(file),
  (file) => /\.(pem|key|p12|pfx|crt)$/i.test(file),
  (file) => /(^|\/)(auth|oauth|jwt|session|middleware|passport|security|iam|policy|cors)(\/|\.|-|_)/i.test(file),
  (file) => /(^|\/)(api|routes|controllers|handlers)(\/|$)/i.test(file),
]);

const ciFiles = hasAny(files, [
  (file) => /^\.github\/workflows\/.+\.ya?ml$/i.test(file),
  (file) => /^\.gitlab-ci\.ya?ml$/i.test(file),
  (file) => /^circle\.yml$/i.test(file),
  (file) => /^\.circleci\/config\.ya?ml$/i.test(file),
  (file) => /^azure-pipelines\.ya?ml$/i.test(file),
  (file) => /^jenkinsfile$/i.test(file),
]);

const tools = [
  "git",
  "gh",
  "semgrep",
  "codeql",
  "trivy",
  "gitleaks",
  "checkov",
  "nuclei",
  "zap-baseline.py",
  "docker",
  "kubectl",
  "helm",
  "k8sgpt",
  "holmes",
  "kubescape",
  "conftest",
  "opa",
  "atlas",
  "bytebase",
  "squawk",
  "pgroll",
  "gh-ost",
  "pt-online-schema-change",
  "cilium",
  "tetragon",
  "falcoctl",
];

const availableTools = Object.fromEntries(
  tools.map((tool) => [tool, commandExists(tool)]),
);

const gitStatus = availableTools.git ? git(["status", "--short"]) : null;
const gitBranch = availableTools.git ? git(["branch", "--show-current"]) : null;
const changedFilesRaw = availableTools.git ? git(["diff", "--name-only", "HEAD"]) : null;

const result = {
  root,
  fileCount: files.length,
  truncated: files.length >= maxFiles,
  git: {
    branch: gitBranch,
    dirty: Boolean(gitStatus),
    statusShort: gitStatus,
    changedFiles: changedFilesRaw ? changedFilesRaw.split(/\r?\n/).filter(Boolean) : [],
  },
  topExtensions: countExtensions(files),
  packageManagers,
  riskSurfaces: {
    database: databaseFiles.slice(0, 80),
    infra: infraFiles.slice(0, 80),
    securitySensitive: securitySensitiveFiles.slice(0, 80),
    ci: ciFiles.slice(0, 80),
  },
  availableTools,
  recommendedReferences: [
    databaseFiles.length ? "references/database.md" : null,
    infraFiles.length || securitySensitiveFiles.length ? "references/security.md" : null,
    ciFiles.length ? "references/ci-guardrails.md" : null,
  ].filter(Boolean),
};

console.log(JSON.stringify(result, null, 2));
