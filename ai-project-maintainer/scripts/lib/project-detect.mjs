import fs from "node:fs";
import path from "node:path";

const ignoredDirs = new Set([
  ".git",
  ".next",
  ".turbo",
  "build",
  "coverage",
  "dist",
  "node_modules",
  "target",
  "vendor",
]);

export function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, "utf8"));
  } catch {
    return null;
  }
}

export function listFiles(root, options = {}) {
  const out = [];
  const maxFiles = options.maxFiles || 7000;
  const maxDepth = options.maxDepth || 8;

  function walk(dir, depth) {
    if (out.length >= maxFiles || depth > maxDepth) return;
    let entries = [];
    try {
      entries = fs.readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }

    for (const entry of entries) {
      if (ignoredDirs.has(entry.name)) continue;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        walk(full, depth + 1);
      } else if (entry.isFile()) {
        out.push(path.relative(root, full).replaceAll(path.sep, "/"));
      }
    }
  }

  walk(root, 0);
  return out;
}

function packageManagers(root, files) {
  const managers = [];
  if (files.includes("pnpm-lock.yaml")) managers.push("pnpm");
  if (files.includes("yarn.lock")) managers.push("yarn");
  if (files.includes("bun.lock") || files.includes("bun.lockb")) managers.push("bun");
  if (files.includes("package-lock.json") || fs.existsSync(path.join(root, "package.json"))) managers.push("npm");
  return managers;
}

function topExtensions(files) {
  const counts = new Map();
  for (const file of files) {
    const ext = path.extname(file).toLowerCase() || "(none)";
    counts.set(ext, (counts.get(ext) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 20)
    .map(([extension, count]) => ({ extension, count }));
}

function riskSurfaces(files) {
  return {
    database: files.filter((file) => /(^|\/)(migrations?|db|database|prisma|drizzle|schema)\//i.test(file) || /\.(sql|prisma)$/i.test(file)),
    infra: files.filter((file) => /\.(tf|ya?ml|jsonnet)$/i.test(file) && /(^|\/)(terraform|infra|k8s|kubernetes|helm|charts|\.github\/workflows)\//i.test(file)),
    securitySensitive: files.filter((file) => /(^|\/)(auth|security|crypto|payments?|billing|permissions?|rbac|ipc|preload|main)\b/i.test(file)),
    ci: files.filter((file) => /^\.github\/workflows\/.+\.ya?ml$/i.test(file)),
  };
}

function detectElectron(root, files, packageJson) {
  const deps = { ...(packageJson?.dependencies || {}), ...(packageJson?.devDependencies || {}) };
  const detected =
    Boolean(deps.electron) ||
    files.some((file) => /(^|\/)(main|preload|electron)\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(file));
  return {
    detected,
    hasPreload: files.some((file) => /(^|\/)preload\.(js|ts|mjs|cjs)$/i.test(file)),
    candidateFiles: files.filter((file) => /\.(js|jsx|ts|tsx|mjs|cjs)$/i.test(file)).slice(0, 1200),
  };
}

export function detectProject(projectRoot, options = {}) {
  const root = path.resolve(projectRoot);
  const files = listFiles(root, options);
  const packageJson = readJson(path.join(root, "package.json"));
  const surfaces = riskSurfaces(files);

  return {
    root,
    fileCount: files.length,
    files,
    packageJson,
    packageManagers: packageManagers(root, files),
    riskSurfaces: surfaces,
    electron: detectElectron(root, files, packageJson),
    topExtensions: topExtensions(files),
  };
}
