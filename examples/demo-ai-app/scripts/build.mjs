import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "dist");

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(
  path.join(outDir, "build-manifest.json"),
  `${JSON.stringify({
    app: "demo-ai-app",
    builtAt: new Date().toISOString(),
    entrypoints: ["src/order-risk.js"],
  }, null, 2)}\n`,
);

console.log(`Demo build manifest written to ${path.relative(root, outDir)}`);
