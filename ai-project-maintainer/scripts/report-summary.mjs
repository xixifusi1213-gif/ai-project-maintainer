#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { toMarkdown } from "./lib/report.mjs";

export function summarizeReport(reportPath) {
  const full = path.resolve(reportPath);
  const text = fs.readFileSync(full, "utf8").replace(/^\uFEFF/, "");
  const report = JSON.parse(text);
  return toMarkdown(report);
}

function main() {
  const reportPath = process.argv.slice(2).find((arg) => !arg.startsWith("--"));
  if (!reportPath) {
    console.error("Usage: node report-summary.mjs <reports/security-report.json>");
    process.exit(2);
  }
  console.log(summarizeReport(reportPath));
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main();
}
