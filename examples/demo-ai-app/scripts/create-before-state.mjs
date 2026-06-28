#!/usr/bin/env node
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ignored = new Set(["node_modules", "dist", "reports"]);

function normalizeForCompare(value) {
  return path.resolve(value).toLowerCase();
}

function assertInsideTemp(destination) {
  const tempRoot = normalizeForCompare(fs.realpathSync(os.tmpdir()));
  const resolved = normalizeForCompare(destination);
  if (resolved !== tempRoot && !resolved.startsWith(`${tempRoot}${path.sep}`)) {
    throw new Error(`Refusing to write demo before-state outside the OS temp directory: ${destination}`);
  }
}

function copyDirectory(source, destination) {
  fs.mkdirSync(destination, { recursive: true });
  for (const entry of fs.readdirSync(source, { withFileTypes: true })) {
    if (ignored.has(entry.name)) continue;
    const from = path.join(source, entry.name);
    const to = path.join(destination, entry.name);
    if (entry.isDirectory()) copyDirectory(from, to);
    else if (entry.isFile()) fs.copyFileSync(from, to);
  }
}

function readOutputArg(args) {
  const index = args.indexOf("--output");
  if (index !== -1) return args[index + 1];
  const inline = args.find((arg) => arg.startsWith("--output="));
  return inline ? inline.slice("--output=".length) : null;
}

export function createBeforeState({ outputPath = null } = {}) {
  const demoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  const destination = path.resolve(outputPath || path.join(os.tmpdir(), `apm-demo-before-${Date.now()}`));
  assertInsideTemp(destination);

  fs.rmSync(destination, { recursive: true, force: true });
  copyDirectory(demoRoot, destination);

  fs.writeFileSync(
    path.join(destination, "src", "order-risk.js"),
    `const shippingRates = {
  standard: 499,
  expedited: 1299,
};

export function quoteOrder({ subtotalCents, shippingTier }) {
  if (!Number.isInteger(subtotalCents) || subtotalCents < 0) {
    throw new TypeError("subtotalCents must be a non-negative integer");
  }

  if (!Object.hasOwn(shippingRates, shippingTier)) {
    throw new RangeError(\`unsupported shipping tier: \${shippingTier}\`);
  }

  const shippingCents = shippingRates[shippingTier];
  const totalCents = subtotalCents + shippingCents;

  return {
    subtotalCents,
    shippingCents,
    totalCents,
    needsManualReview: false,
  };
}

export function canReleaseOrder({ paid, flagged }) {
  return Boolean(paid && !flagged);
}
`,
  );

  return { destination };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = createBeforeState({ outputPath: readOutputArg(process.argv.slice(2)) });
  console.log(JSON.stringify(result, null, 2));
}
