import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { initAudit } from "../ai-project-maintainer/scripts/init-audit.mjs";
import { runCliAsync, parseCliArgs } from "../ai-project-maintainer/scripts/cli.mjs";
import {
  applyEvidenceToAudit,
  evidenceChecks,
  loadConnectorsConfig,
  runConnectorsDoctor,
  runEvidence,
} from "../ai-project-maintainer/scripts/lib/connectors.mjs";
import { runLiveConnectorSmoke } from "../ai-project-maintainer/scripts/live-connector-smoke.mjs";
import { runLocalGateAsync } from "../ai-project-maintainer/scripts/run-local-gate.mjs";

function tempProject() {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-connectors-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ name: "connectors-test", scripts: {} }));
  return root;
}

function writeConnectors(root, text) {
  const dir = path.join(root, ".ai-maintainer");
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, "connectors.yml"), text);
}

function mockJson(routes, calls = []) {
  return async (url, init = {}) => {
    calls.push({ url: String(url), init });
    assert.equal(init.method, "GET");
    const route = routes.find((entry) => entry.match instanceof RegExp ? entry.match.test(String(url)) : String(url).includes(entry.match));
    const body = route?.body ?? {};
    return {
      ok: route?.ok ?? true,
      status: route?.status ?? 200,
      text: async () => JSON.stringify(body),
    };
  };
}

test("connectors CLI arguments parse doctor, evidence, and gate --connectors", () => {
  assert.deepEqual(parseCliArgs(["connectors", "doctor", "E:\\my-project", "--json"]), {
    command: "connectors",
    args: { subcommand: "doctor", projectRoot: "E:\\my-project", jsonOnly: true },
  });

  assert.deepEqual(parseCliArgs(["evidence", "E:\\my-project", "--output", "reports/evidence-report.json"]), {
    command: "evidence",
    args: { projectRoot: "E:\\my-project", outputPath: "reports/evidence-report.json", jsonOnly: false },
  });

  assert.deepEqual(parseCliArgs(["gate", "E:\\my-project", "--production", "--connectors", "--strict"]), {
    command: "gate",
    args: {
      projectRoot: "E:\\my-project",
      strict: true,
      release: false,
      noTests: false,
      jsonOnly: false,
      production: true,
      connectors: true,
      agentRisk: false,
      profile: "auto",
      outputPath: null,
    },
  });
});

test("initAudit creates connectors.yml without writing secrets", () => {
  const root = tempProject();
  const result = initAudit(root);
  const connectorsPath = path.join(root, ".ai-maintainer", "connectors.yml");
  const text = fs.readFileSync(connectorsPath, "utf8");
  const loaded = loadConnectorsConfig(root);

  assert.equal(result.created.includes(".ai-maintainer/connectors.yml"), true);
  assert.match(text, /token_env: GITHUB_TOKEN/);
  assert.doesNotMatch(text, /ghp_|SENTRY_AUTH_TOKEN:.+[^ ]/);
  assert.equal(loaded.secretFields.length, 0);
});

test("connectors doctor reports enabled tools, token env, and unsafe secret fields", () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  github:
    enabled: true
    token_env: GITHUB_TOKEN
    owner: example
    repo: repo
    token: should-not-be-here
`);

  const report = runConnectorsDoctor(root, { env: {} });
  const github = report.providers.find((provider) => provider.provider === "github");

  assert.equal(report.passed, false);
  assert.equal(github.enabled, true);
  assert.equal(github.tokenStatus, "missing");
  assert.deepEqual(report.secretFields, ["connectors.github.token"]);
});

test("connectors doctor marks all v0.7 providers as implemented", () => {
  const root = tempProject();
  initAudit(root);
  const report = runConnectorsDoctor(root, { env: {} });
  const expected = ["github", "sentry", "vercel", "grafana", "prometheus", "bytebase", "atlas", "cloudflare", "render", "fly"];

  for (const provider of expected) {
    assert.equal(report.providers.find((item) => item.provider === provider)?.implemented, true, provider);
  }
});

test("runEvidence returns GAP when token is missing and never leaks token-like config", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  sentry:
    enabled: true
    token_env: SENTRY_AUTH_TOKEN
    organization: org
    project: app
`);

  const report = await runEvidence(root, { env: {} });
  const text = JSON.stringify(report);

  assert.equal(report.gaps.some((item) => item.provider === "sentry" && item.checkId === "connector-auth"), true);
  assert.doesNotMatch(text, /token-value|Bearer/i);
});

test("GitHub connector verifies required reviewers and deployment records with GET only", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  github:
    enabled: true
    token_env: GITHUB_TOKEN
    owner: owner
    repo: repo
    environment: production
`);
  const calls = [];
  const fetch = mockJson([
    {
      match: "/environments/production",
      body: {
        name: "production",
        protection_rules: [{ type: "required_reviewers", reviewers: [{ type: "User", id: 1 }] }],
      },
    },
    {
      match: "/deployments",
      body: [{ id: 11, sha: "abc123", environment: "production", created_at: "2026-07-01T00:00:00Z" }],
    },
  ], calls);

  const report = await runEvidence(root, { env: { GITHUB_TOKEN: "gh-token" }, fetch });

  assert.equal(report.items.some((item) => item.provider === "github" && item.checkId === "release-approval" && item.status === "PASS"), true);
  assert.equal(report.items.some((item) => item.provider === "github" && item.checkId === "production-deployment" && item.status === "PASS"), true);
  assert.equal(calls.length, 2);
  assert.equal(JSON.stringify(report).includes("gh-token"), false);
});

test("Sentry connector verifies error monitoring and warns when releases are missing", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  sentry:
    enabled: true
    token_env: SENTRY_AUTH_TOKEN
    organization: org
    project: app
`);
  const fetch = mockJson([
    { match: "/projects/org/app/", body: { slug: "app", platform: "node" } },
    { match: "/releases/", body: [] },
  ]);

  const report = await runEvidence(root, { env: { SENTRY_AUTH_TOKEN: "sentry-token" }, fetch });

  assert.equal(report.items.some((item) => item.provider === "sentry" && item.checkId === "error-monitoring" && item.status === "PASS"), true);
  assert.equal(report.items.some((item) => item.provider === "sentry" && item.checkId === "release-tracking" && item.status === "WARN"), true);
});

test("Vercel connector verifies production deployment evidence", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  vercel:
    enabled: true
    token_env: VERCEL_TOKEN
    project_id: prj_123
`);
  const fetch = mockJson([
    { match: "/v9/projects/prj_123", body: { id: "prj_123", name: "app" } },
    { match: "/v6/deployments", body: { deployments: [{ uid: "dep_1", url: "app.vercel.app", state: "READY", target: "production" }] } },
  ]);

  const report = await runEvidence(root, { env: { VERCEL_TOKEN: "vercel-token" }, fetch });

  assert.equal(report.items.some((item) => item.provider === "vercel" && item.checkId === "production-deployment" && item.status === "PASS"), true);
  assert.equal(JSON.stringify(report).includes("vercel-token"), false);
});

test("Grafana connector verifies alerting evidence", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  grafana:
    enabled: true
    token_env: GRAFANA_TOKEN
    base_url: https://grafana.example
`);
  const fetch = mockJson([
    { match: "/api/v1/provisioning/alert-rules", body: [{ uid: "alert-1", title: "High error rate" }] },
  ]);

  const report = await runEvidence(root, { env: { GRAFANA_TOKEN: "grafana-token" }, fetch });

  assert.equal(report.items.some((item) => item.provider === "grafana" && item.checkId === "alerting-evidence" && item.status === "PASS"), true);
  assert.equal(JSON.stringify(report).includes("grafana-token"), false);
});

test("Prometheus connector verifies alerting rules and current alert state", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  prometheus:
    enabled: true
    token_env: PROMETHEUS_BEARER_TOKEN
    base_url: https://prometheus.example
`);
  const calls = [];
  const fetch = mockJson([
    { match: "/api/v1/rules", body: { status: "success", data: { groups: [{ rules: [{ type: "alerting", name: "HighLatency", state: "inactive" }] }] } } },
    { match: "/api/v1/alerts", body: { status: "success", data: { alerts: [] } } },
  ], calls);

  const report = await runEvidence(root, { env: { PROMETHEUS_BEARER_TOKEN: "prom-token" }, fetch });

  assert.equal(report.items.some((item) => item.provider === "prometheus" && item.checkId === "alerting-evidence" && item.status === "PASS"), true);
  assert.equal(report.items.some((item) => item.provider === "prometheus" && item.checkId === "alert-status" && item.status === "PASS"), true);
  assert.equal(calls.length, 2);
});

test("Bytebase connector verifies database migration governance and fails failed rollouts", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  bytebase:
    enabled: true
    token_env: BYTEBASE_TOKEN
    base_url: https://bytebase.example
    project: projects/app
`);
  const passFetch = mockJson([
    { match: /\/v1\/projects\/app$/, body: { name: "projects/app" } },
    { match: "/databases", body: { databases: [{ name: "instances/prod/databases/app" }] } },
    { match: "/rollouts", body: { rollouts: [{ name: "rollouts/1", status: "DONE" }] } },
    { match: "/issues", body: { issues: [] } },
  ]);

  const pass = await runEvidence(root, { env: { BYTEBASE_TOKEN: "bytebase-token" }, fetch: passFetch });
  assert.equal(pass.items.some((item) => item.provider === "bytebase" && item.status === "PASS"), true);

  const failFetch = mockJson([
    { match: /\/v1\/projects\/app$/, body: { name: "projects/app" } },
    { match: "/databases", body: { databases: [] } },
    { match: "/rollouts", body: { rollouts: [{ name: "rollouts/2", status: "FAILED" }] } },
    { match: "/issues", body: { issues: [] } },
  ]);
  const failed = await runEvidence(root, { env: { BYTEBASE_TOKEN: "bytebase-token" }, fetch: failFetch });
  assert.equal(failed.failures.some((item) => item.provider === "bytebase" && item.checkId === "database-migration-governance"), true);
});

test("Atlas connector reports missing CLI, lint pass, and lint fail", async () => {
  const root = tempProject();
  fs.mkdirSync(path.join(root, "migrations"));
  fs.writeFileSync(path.join(root, "migrations", "001.sql"), "select 1;\n");
  writeConnectors(root, `
connectors:
  atlas:
    enabled: true
    migrations_dir: migrations
    dev_url_env: ATLAS_DEV_URL
`);

  const missing = await runEvidence(root, {
    env: { ATLAS_DEV_URL: "postgres://example" },
    runCommand: () => ({ error: Object.assign(new Error("missing"), { code: "ENOENT" }) }),
  });
  assert.equal(missing.gaps.some((item) => item.provider === "atlas" && item.checkId === "migration-lint"), true);

  const passing = await runEvidence(root, {
    env: { ATLAS_DEV_URL: "postgres://example" },
    runCommand: () => ({ status: 0 }),
  });
  assert.equal(passing.items.some((item) => item.provider === "atlas" && item.status === "PASS"), true);

  const failing = await runEvidence(root, {
    env: { ATLAS_DEV_URL: "postgres://example" },
    runCommand: () => ({ status: 1 }),
  });
  assert.equal(failing.failures.some((item) => item.provider === "atlas" && item.status === "FAIL"), true);
  assert.equal(JSON.stringify(failing).includes("postgres://example"), false);
});

test("Cloudflare, Render, and Fly connectors verify deployment or runtime evidence", async () => {
  const cloudflareRoot = tempProject();
  writeConnectors(cloudflareRoot, `
connectors:
  cloudflare:
    enabled: true
    token_env: CLOUDFLARE_API_TOKEN
    account_id: account
    project_name: pages-app
`);
  const cloudflare = await runEvidence(cloudflareRoot, {
    env: { CLOUDFLARE_API_TOKEN: "cf-token" },
    fetch: mockJson([
      { match: "/pages/projects/pages-app/deployments", body: { success: true, result: [{ id: "dep-1", environment: "production", latest_stage: { status: "success" } }] } },
    ]),
  });
  assert.equal(cloudflare.items.some((item) => item.provider === "cloudflare" && item.status === "PASS"), true);

  const renderRoot = tempProject();
  writeConnectors(renderRoot, `
connectors:
  render:
    enabled: true
    token_env: RENDER_API_KEY
    service_id: srv_123
`);
  const render = await runEvidence(renderRoot, {
    env: { RENDER_API_KEY: "render-token" },
    fetch: mockJson([
      { match: "/services/srv_123/deploys", body: [{ deploy: { id: "dep-1", status: "live" } }] },
      { match: "/services/srv_123", body: { id: "srv_123", name: "api" } },
    ]),
  });
  assert.equal(render.items.some((item) => item.provider === "render" && item.status === "PASS"), true);

  const flyRoot = tempProject();
  writeConnectors(flyRoot, `
connectors:
  fly:
    enabled: true
    token_env: FLY_API_TOKEN
    app_name: fly-app
`);
  const fly = await runEvidence(flyRoot, {
    env: { FLY_API_TOKEN: "fly-token" },
    fetch: mockJson([
      { match: "/apps/fly-app/machines", body: [{ id: "machine-1", state: "started", region: "iad" }] },
    ]),
  });
  assert.equal(fly.items.some((item) => item.provider === "fly" && item.status === "PASS"), true);
});

test("HTTP connectors convert 401 and 403 into GAP and only use GET", async () => {
  const cases = [
    ["grafana", "GRAFANA_TOKEN", "base_url: https://grafana.example"],
    ["prometheus", "PROMETHEUS_BEARER_TOKEN", "base_url: https://prometheus.example"],
    ["bytebase", "BYTEBASE_TOKEN", "base_url: https://bytebase.example\nproject: projects/app"],
    ["cloudflare", "CLOUDFLARE_API_TOKEN", "account_id: account\nproject_name: pages-app"],
    ["render", "RENDER_API_KEY", "service_id: srv_123"],
    ["fly", "FLY_API_TOKEN", "app_name: fly-app"],
  ];

  for (const [provider, tokenEnv, extra] of cases) {
    const root = tempProject();
    writeConnectors(root, `
connectors:
  ${provider}:
    enabled: true
    token_env: ${tokenEnv}
    ${extra.replace(/\n/g, "\n    ")}
`);
    const calls = [];
    const fetch = mockJson([{ match: "/", ok: false, status: provider === "prometheus" ? 403 : 401, body: { message: "unauthorized" } }], calls);
    const report = await runEvidence(root, { env: { [tokenEnv]: `${provider}-token` }, fetch });
    assert.equal(report.gaps.some((item) => item.provider === provider), true, provider);
    assert.equal(calls.every((call) => call.init.method === "GET"), true, provider);
    assert.equal(JSON.stringify(report).includes(`${provider}-token`), false, provider);
  }
});

test("evidence checks can block missing evidence only when risk policy opts in", () => {
  const evidenceReport = {
    items: [
      {
        provider: "github",
        checkId: "release-approval",
        title: "github release approval",
        status: "WARN",
        summary: "No reviewers",
        blockKey: "block_on_missing_release_approval",
        details: {},
      },
    ],
  };

  assert.equal(evidenceChecks(evidenceReport, {}).at(0).blocking, false);
  assert.equal(evidenceChecks(evidenceReport, {}).at(0).evidenceLevel, "PLATFORM_VERIFIED");
  assert.equal(evidenceChecks(evidenceReport, { production_evidence: { block_on_missing_release_approval: true } }).at(0).blocking, true);
});

test("evidence checks mark connector gaps as GAP instead of platform verified", () => {
  const evidenceReport = {
    items: [
      {
        provider: "sentry",
        checkId: "connector-auth",
        title: "sentry connector auth",
        status: "GAP",
        summary: "SENTRY_AUTH_TOKEN is not set.",
        blockKey: "block_on_connector_auth_failure",
        details: {},
      },
    ],
  };

  const check = evidenceChecks(evidenceReport, {}).at(0);

  assert.equal(check.evidenceLevel, "GAP");
  assert.equal(check.coverageGap, true);
});

test("connector PASS evidence can satisfy matching production audit gaps", () => {
  const audit = {
    plan: [
      { id: "release-approval", title: "Production release approval", status: "GAP", summary: "No approval evidence" },
      { id: "observability-alerts", title: "Production alerts", status: "GAP", summary: "No alerts" },
    ],
    evidence: [],
    coverageGaps: [],
    userDecisions: [],
  };
  const updated = applyEvidenceToAudit(audit, {
    items: [
      { provider: "github", checkId: "release-approval", status: "PASS", source: "GitHub Environments API", summary: "required reviewers" },
    ],
  });

  assert.equal(updated.plan.find((item) => item.id === "release-approval").status, "PASS");
  assert.equal(updated.coverageGaps.some((item) => item.id === "release-approval"), false);
  assert.equal(updated.coverageGaps.some((item) => item.id === "observability-alerts"), true);
});

test("connector PASS evidence can satisfy alerting and database audit gaps without treating deployment as approval", () => {
  const audit = {
    plan: [
      { id: "release-approval", title: "Production release approval", status: "GAP", summary: "No approval evidence" },
      { id: "observability-alerts", title: "Production alerts", status: "GAP", summary: "No alerts" },
      { id: "database-migrations", title: "Database migration review", status: "GAP", summary: "No database review" },
    ],
    evidence: [],
    coverageGaps: [],
    userDecisions: [],
  };
  const updated = applyEvidenceToAudit(audit, {
    items: [
      { provider: "grafana", checkId: "alerting-evidence", status: "PASS", source: "Grafana API", summary: "alerts" },
      { provider: "atlas", checkId: "migration-lint", status: "PASS", source: "Atlas CLI", summary: "lint ok" },
      { provider: "vercel", checkId: "production-deployment", status: "PASS", source: "Vercel API", summary: "deployment exists" },
    ],
  });

  assert.equal(updated.plan.find((item) => item.id === "observability-alerts").status, "PASS");
  assert.equal(updated.plan.find((item) => item.id === "database-migrations").status, "PASS");
  assert.equal(updated.plan.find((item) => item.id === "release-approval").status, "GAP");
});

test("production gate with connectors includes evidence and keeps missing tokens as non-blocking GAP by default", async () => {
  const root = tempProject();
  initAudit(root);
  writeConnectors(root, `
connectors:
  sentry:
    enabled: true
    token_env: SENTRY_AUTH_TOKEN
    organization: org
    project: app
`);

  const report = await runLocalGateAsync(root, {
    production: true,
    connectors: true,
    runnerOptions: { envPath: "" },
    env: {},
  });

  assert.equal(report.passed, true);
  assert.equal(report.evidence.gaps.some((item) => item.provider === "sentry"), true);
  assert.equal(report.checks.some((check) => check.group === "production-evidence" && check.coverageGap), true);
});

test("evidence CLI writes report output", async () => {
  const root = tempProject();
  const outputPath = path.join(root, "reports", "evidence-report.json");
  let stdout = "";
  let stderr = "";
  const code = await runCliAsync(["evidence", root, "--output", "reports/evidence-report.json"], {
    stdout: { write: (chunk) => { stdout += chunk; } },
    stderr: { write: (chunk) => { stderr += chunk; } },
  });

  assert.equal(code, 0);
  assert.equal(stderr, "");
  assert.equal(fs.existsSync(outputPath), true);
  assert.match(stdout, /connectorsEnabled/);
});

test("live connector smoke skips providers without env and never leaks tokens", async () => {
  const root = tempProject();
  writeConnectors(root, `
connectors:
  sentry:
    enabled: true
    token_env: SENTRY_AUTH_TOKEN
    organization: org
    project: app
  atlas:
    enabled: true
    migrations_dir: migrations
    dev_url_env: ATLAS_DEV_URL
`);

  const report = await runLiveConnectorSmoke(root, { env: {} });

  assert.equal(report.passed, true);
  assert.equal(report.runnable.length, 0);
  assert.equal(report.skipped.some((item) => item.provider === "sentry" && item.status === "SKIP"), true);
  assert.equal(report.skipped.some((item) => item.provider === "atlas" && item.status === "SKIP"), true);
});
