#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const targetDirs = [
  path.join(repoRoot, "ai-project-maintainer", "scripts"),
  path.join(repoRoot, "examples", "oss-case-studies"),
  path.join(repoRoot, "test"),
];

function collectMjsFiles(dir, out = []) {
  if (!fs.existsSync(dir)) return out;
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) collectMjsFiles(full, out);
    else if (entry.isFile() && entry.name.endsWith(".mjs")) out.push(full);
  }
  return out;
}

const files = targetDirs.flatMap((dir) => collectMjsFiles(dir));
let failed = false;

for (const file of files) {
  const result = spawnSync(process.execPath, ["--check", file], {
    cwd: repoRoot,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    failed = true;
    process.stderr.write(result.stderr || result.stdout);
  }
}

if (!failed) {
  console.log(`Syntax check passed for ${files.length} files.`);
}

process.exit(failed ? 1 : 0);
