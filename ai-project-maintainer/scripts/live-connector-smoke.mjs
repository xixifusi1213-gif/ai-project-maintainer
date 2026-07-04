#!/usr/bin/env node
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { loadConnectorsConfig, runEvidence } from "./lib/connectors.mjs";

function providerEntries(config) {
  return Object.entries(config.connectors || {});
}

function canRunProvider(provider, entry, env) {
  if (!entry.enabled) return { run: false, reason: "disabled" };
  if (provider === "atlas") {
    const devUrlEnv = entry.dev_url_env || "ATLAS_DEV_URL";
    return env[devUrlEnv]
      ? { run: true }
      : { run: false, reason: `${devUrlEnv} is not set` };
  }
  if (!entry.token_env) return { run: false, reason: "token_env is not configured" };
  if (!env[entry.token_env]) return { run: false, reason: `${entry.token_env} is not set` };
  return { run: true };
}

function assertNoSecretLeak(report, loaded, env) {
  const text = JSON.stringify(report);
  for (const [, entry] of providerEntries(loaded.config)) {
    const names = [entry.token_env, entry.dev_url_env].filter(Boolean);
    for (const name of names) {
      const value = env[name];
      if (value && value.length >= 6 && text.includes(value)) {
        throw new Error(`live connector smoke output leaked environment value ${name}`);
      }
    }
  }
  if (/Authorization|Bearer\s+[A-Za-z0-9_.-]+/i.test(text)) {
    throw new Error("live connector smoke output leaked an authorization header");
  }
}

export async function runLiveConnectorSmoke(projectRoot = process.cwd(), options = {}) {
  const env = options.env || process.env;
  const loaded = loadConnectorsConfig(projectRoot);
  const skipped = [];
  const runnable = [];

  for (const [provider, entry] of providerEntries(loaded.config)) {
    const status = canRunProvider(provider, entry, env);
    if (status.run) runnable.push(provider);
    else skipped.push({ provider, status: "SKIP", reason: status.reason });
  }

  const evidence = runnable.length
    ? await runEvidence(projectRoot, { env, providers: runnable })
    : {
      schemaVersion: 1,
      root: loaded.root,
      generatedAt: new Date().toISOString(),
      connectorsEnabled: providerEntries(loaded.config).some(([, entry]) => Boolean(entry.enabled)),
      initialized: loaded.initialized,
      items: [],
      warnings: [],
      gaps: [],
      failures: [],
    };

  const report = {
    schemaVersion: 1,
    root: loaded.root,
    initialized: loaded.initialized,
    runnable,
    skipped,
    evidence,
    passed: evidence.failures.length === 0,
  };
  assertNoSecretLeak(report, loaded, env);
  return report;
}

async function main() {
  const projectRoot = process.argv[2] || process.cwd();
  try {
    const report = await runLiveConnectorSmoke(projectRoot);
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    process.exit(report.passed ? 0 : 1);
  } catch (error) {
    process.stderr.write(`${error.message}\n`);
    process.exit(2);
  }
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  try {
    return fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url);
  } catch {
    return false;
  }
}

if (isDirectRun()) {
  main();
}
