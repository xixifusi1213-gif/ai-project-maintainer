import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import YAML from "yaml";

export const connectorsRelativePath = ".ai-maintainer/connectors.yml";

export const defaultConnectorsConfig = {
  schema_version: 1,
  connectors: {
    github: {
      enabled: false,
      token_env: "GITHUB_TOKEN",
      owner: "",
      repo: "",
      environment: "production",
    },
    sentry: {
      enabled: false,
      token_env: "SENTRY_AUTH_TOKEN",
      organization: "",
      project: "",
      base_url: "https://sentry.io",
    },
    vercel: {
      enabled: false,
      token_env: "VERCEL_TOKEN",
      project_id: "",
      team_id: "",
    },
    grafana: {
      enabled: false,
      token_env: "GRAFANA_TOKEN",
      base_url: "",
    },
    prometheus: {
      enabled: false,
      token_env: "PROMETHEUS_BEARER_TOKEN",
      base_url: "",
    },
    bytebase: {
      enabled: false,
      token_env: "BYTEBASE_TOKEN",
      base_url: "",
      project: "",
      database: "",
    },
    atlas: {
      enabled: false,
      migrations_dir: "migrations",
      dev_url_env: "ATLAS_DEV_URL",
      latest: 1,
    },
    cloudflare: {
      enabled: false,
      token_env: "CLOUDFLARE_API_TOKEN",
      account_id: "",
      project_name: "",
    },
    render: {
      enabled: false,
      token_env: "RENDER_API_KEY",
      service_id: "",
    },
    fly: {
      enabled: false,
      token_env: "FLY_API_TOKEN",
      app_name: "",
    },
  },
};

const implementedProviders = new Set([
  "github",
  "sentry",
  "vercel",
  "grafana",
  "prometheus",
  "bytebase",
  "atlas",
  "cloudflare",
  "render",
  "fly",
]);
const tokenLikeKeys = new Set(["token", "api_key", "apikey", "password", "secret", "dsn"]);

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function deepMerge(base, custom) {
  if (!isPlainObject(base) || !isPlainObject(custom)) return custom ?? base;
  const merged = { ...base };
  for (const [key, value] of Object.entries(custom)) {
    merged[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return merged;
}

function readYaml(root) {
  const fullPath = path.join(root, ...connectorsRelativePath.split("/"));
  if (!fs.existsSync(fullPath)) {
    return { exists: false, value: defaultConnectorsConfig, parseErrors: [] };
  }
  try {
    const text = fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "");
    return { exists: true, value: YAML.parse(text) || defaultConnectorsConfig, parseErrors: [] };
  } catch (error) {
    return {
      exists: true,
      value: defaultConnectorsConfig,
      parseErrors: [{ path: connectorsRelativePath, reason: error.message }],
    };
  }
}

function findSecretFields(value, prefix = []) {
  if (!isPlainObject(value)) return [];
  const fields = [];
  for (const [key, child] of Object.entries(value)) {
    const nextPrefix = [...prefix, key];
    if (tokenLikeKeys.has(key.toLowerCase()) && child) fields.push(nextPrefix.join("."));
    fields.push(...findSecretFields(child, nextPrefix));
  }
  return fields;
}

export function connectorsTemplate() {
  return YAML.stringify(defaultConnectorsConfig);
}

export function loadConnectorsConfig(projectRoot) {
  const root = path.resolve(projectRoot || process.cwd());
  const document = readYaml(root);
  const config = deepMerge(defaultConnectorsConfig, document.value);
  const secretFields = findSecretFields(document.value);
  return {
    root,
    initialized: document.exists,
    config,
    parseErrors: document.parseErrors,
    secretFields,
    path: path.join(root, ...connectorsRelativePath.split("/")),
  };
}

function providerConfigEntries(config) {
  return Object.entries(config.connectors || {});
}

function tokenStatus(provider, entry, env) {
  if (!entry.enabled) return "disabled";
  if (provider === "atlas") return "not-required";
  if (!entry.token_env) return "missing-token-env";
  return env[entry.token_env] ? "available" : "missing";
}

export function runConnectorsDoctor(projectRoot, options = {}) {
  const loaded = loadConnectorsConfig(projectRoot);
  const env = options.env || process.env;
  const providers = providerConfigEntries(loaded.config).map(([provider, entry]) => ({
    provider,
    implemented: implementedProviders.has(provider),
    enabled: Boolean(entry.enabled),
    tokenEnv: entry.token_env || null,
    tokenStatus: tokenStatus(provider, entry, env),
  }));
  return {
    schemaVersion: 1,
    root: loaded.root,
    initialized: loaded.initialized,
    path: loaded.path,
    parseErrors: loaded.parseErrors,
    secretFields: loaded.secretFields,
    providers,
    passed: loaded.parseErrors.length === 0 && loaded.secretFields.length === 0,
  };
}

function envToken(provider, entry, env) {
  if (!entry.enabled) {
    return {
      ok: false,
      item: evidenceItem(provider, "connector-config", "N/A", `${provider} connector is disabled.`, {
        recommendation: `Set connectors.${provider}.enabled to true when you want this evidence.`,
      }),
    };
  }
  if (provider === "atlas") return { ok: true, token: null };
  if (!implementedProviders.has(provider)) {
    return {
      ok: false,
      item: evidenceItem(provider, "connector-implementation", "GAP", `${provider} connector is reserved but not implemented in this version.`, {
        recommendation: "Use local intake evidence for now, or wait for a later connector release.",
      }),
    };
  }
  if (!entry.token_env) {
    return {
      ok: false,
      item: evidenceItem(provider, "connector-auth", "GAP", `${provider} connector has no token_env configured.`, {
        recommendation: "Set token_env to the name of an environment variable that contains a read-only token.",
        blockKey: "block_on_connector_auth_failure",
      }),
    };
  }
  if (!env[entry.token_env]) {
    return {
      ok: false,
      item: evidenceItem(provider, "connector-auth", "GAP", `${entry.token_env} is not set.`, {
        recommendation: `Set ${entry.token_env} in your shell or CI secrets. Do not write the token into connectors.yml.`,
        blockKey: "block_on_connector_auth_failure",
      }),
    };
  }
  return { ok: true, token: env[entry.token_env] };
}

function evidenceItem(provider, checkId, status, summary, extra = {}) {
  return {
    provider,
    checkId,
    title: extra.title || defaultEvidenceTitle(provider, checkId),
    status,
    summary,
    recommendation: extra.recommendation || "",
    source: extra.source || provider,
    blockKey: extra.blockKey || "",
    details: sanitizeDetails(extra.details || {}),
  };
}

function missingConfig(provider, checkId, field, extra = {}) {
  return evidenceItem(provider, checkId, "GAP", `${provider} connector needs ${field}.`, {
    recommendation: `Set connectors.${provider}.${field}.`,
    ...extra,
  });
}

function connectorAuthGap(provider, checkId, platform, recommendation = `Use a read-only token that can access ${platform}.`) {
  return evidenceItem(provider, checkId, "GAP", `${provider} token cannot read ${platform}.`, {
    recommendation,
    blockKey: "block_on_connector_auth_failure",
    source: platform,
  });
}

function readableBaseUrl(provider, entry) {
  const value = entry.base_url || "";
  if (!value) {
    return {
      ok: false,
      item: missingConfig(provider, provider === "bytebase" ? "database-migration-governance" : "alerting-evidence", "base_url"),
    };
  }
  return { ok: true, value: value.replace(/\/+$/, "") };
}

function defaultEvidenceTitle(provider, checkId) {
  const readable = checkId.replace(/-/g, " ");
  return `${provider} ${readable}`;
}

function sanitizeDetails(value) {
  if (Array.isArray(value)) return value.map((item) => sanitizeDetails(item));
  if (!isPlainObject(value)) return value;
  const sanitized = {};
  for (const [key, child] of Object.entries(value)) {
    if (tokenLikeKeys.has(key.toLowerCase()) || /authorization/i.test(key)) {
      sanitized[key] = "[redacted]";
    } else {
      sanitized[key] = sanitizeDetails(child);
    }
  }
  return sanitized;
}

async function getJson(url, options = {}) {
  const fetchImpl = options.fetch || globalThis.fetch;
  if (typeof fetchImpl !== "function") throw new Error("fetch is unavailable in this Node.js runtime.");
  const headers = {
    Accept: "application/json",
    ...(options.headers || {}),
  };
  const response = await fetchImpl(url, {
    method: "GET",
    headers,
    signal: options.signal,
  });
  const text = await response.text();
  let body = null;
  try {
    body = text ? JSON.parse(text) : null;
  } catch {
    body = { raw: text.slice(0, 2000) };
  }
  return {
    ok: response.ok,
    status: response.status,
    body,
  };
}

function appendQuery(url, params) {
  const parsed = new URL(url);
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== null && value !== "") parsed.searchParams.set(key, String(value));
  }
  return parsed.toString();
}

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

function extractList(body, keys = []) {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== "object") return [];
  for (const key of keys) {
    const value = body[key];
    if (Array.isArray(value)) return value;
  }
  if (Array.isArray(body.result)) return body.result;
  if (Array.isArray(body.results)) return body.results;
  if (Array.isArray(body.items)) return body.items;
  return [];
}

function parsePrometheusRules(body) {
  const groups = body?.data?.groups || [];
  return groups.flatMap((group) => group.rules || []).filter((rule) => (rule.type || "alerting") === "alerting" || rule.alert);
}

function isFailedStatus(value) {
  return /fail|error|cancel|terminated/i.test(String(value || ""));
}

function isHealthyDeploymentStatus(value) {
  return /success|ready|live|active|succeeded|complete|healthy/i.test(String(value || ""));
}

function runCommand(command, args, options = {}) {
  if (typeof options.runCommand === "function") return options.runCommand(command, args, options);
  // This helper is only used for fixed local connector commands such as `atlas migrate lint`.
  // nosemgrep: javascript.lang.security.detect-child-process.detect-child-process
  return spawnSync(command, args, {
    cwd: options.cwd,
    encoding: "utf8",
    timeout: 60000,
    windowsHide: true,
  });
}

function githubHeaders(token) {
  return {
    Accept: "application/vnd.github+json",
    Authorization: `Bearer ${token}`,
    "X-GitHub-Api-Version": "2026-03-10",
  };
}

function hasRequiredReviewers(environment) {
  return (environment.protection_rules || []).some((rule) => rule.type === "required_reviewers" && (rule.reviewers || []).length > 0);
}

async function runGitHubConnector(entry, token, options) {
  const items = [];
  if (!entry.owner || !entry.repo) {
    return [
      evidenceItem("github", "release-approval", "GAP", "GitHub connector needs owner and repo.", {
        recommendation: "Set connectors.github.owner and connectors.github.repo.",
        blockKey: "block_on_missing_release_approval",
      }),
    ];
  }

  const environment = encodeURIComponent(entry.environment || "production");
  const base = options.apiBase || "https://api.github.com";
  const envUrl = `${base}/repos/${encodeURIComponent(entry.owner)}/${encodeURIComponent(entry.repo)}/environments/${environment}`;
  const envResult = await getJson(envUrl, { fetch: options.fetch, headers: githubHeaders(token) });
  if (envResult.status === 401 || envResult.status === 403) {
    return [
      evidenceItem("github", "release-approval", "GAP", "GitHub token cannot read repository environments.", {
        recommendation: "Use a token with read access to Actions/environments for this repository.",
        blockKey: "block_on_connector_auth_failure",
        source: "GitHub Environments API",
      }),
    ];
  }
  if (!envResult.ok) {
    return [
      evidenceItem("github", "release-approval", "GAP", `GitHub environment '${entry.environment || "production"}' could not be read.`, {
        recommendation: "Create a production environment or adjust connectors.github.environment.",
        blockKey: "block_on_missing_release_approval",
        source: "GitHub Environments API",
        details: { status: envResult.status },
      }),
    ];
  }

  const requiredReviewers = hasRequiredReviewers(envResult.body || {});
  items.push(evidenceItem(
    "github",
    "release-approval",
    requiredReviewers ? "PASS" : "WARN",
    requiredReviewers
      ? `GitHub environment '${envResult.body.name || entry.environment}' has required reviewers.`
      : `GitHub environment '${envResult.body.name || entry.environment}' exists but required reviewers were not found.`,
    {
      recommendation: requiredReviewers ? "" : "Add required reviewers or document another release approval control.",
      source: "GitHub Environments API",
      blockKey: "block_on_missing_release_approval",
      details: {
        environment: envResult.body.name,
        protectionRules: (envResult.body.protection_rules || []).map((rule) => rule.type),
      },
    },
  ));

  const deploymentsUrl = appendQuery(`${base}/repos/${encodeURIComponent(entry.owner)}/${encodeURIComponent(entry.repo)}/deployments`, {
    environment: entry.environment || "production",
    per_page: 1,
  });
  const deployments = await getJson(deploymentsUrl, { fetch: options.fetch, headers: githubHeaders(token) });
  if (deployments.ok && Array.isArray(deployments.body) && deployments.body.length) {
    const latest = deployments.body[0];
    items.push(evidenceItem("github", "production-deployment", "PASS", "GitHub has a recent deployment record for the configured environment.", {
      source: "GitHub Deployments API",
      details: {
        id: latest.id,
        sha: latest.sha,
        environment: latest.environment,
        created_at: latest.created_at,
      },
    }));
  } else {
    items.push(evidenceItem("github", "production-deployment", "WARN", "No GitHub deployment record was found for the configured environment.", {
      recommendation: "Use GitHub deployments or document the deployment provider connector.",
      source: "GitHub Deployments API",
    }));
  }

  return items;
}

function sentryBaseUrl(entry) {
  return (entry.base_url || "https://sentry.io").replace(/\/+$/, "");
}

async function runSentryConnector(entry, token, options) {
  if (!entry.organization || !entry.project) {
    return [
      evidenceItem("sentry", "error-monitoring", "GAP", "Sentry connector needs organization and project.", {
        recommendation: "Set connectors.sentry.organization and connectors.sentry.project.",
        blockKey: "block_on_missing_error_monitoring",
      }),
    ];
  }
  const base = options.apiBase || sentryBaseUrl(entry);
  const headers = { Authorization: `Bearer ${token}` };
  const projectUrl = `${base}/api/0/projects/${encodeURIComponent(entry.organization)}/${encodeURIComponent(entry.project)}/`;
  const projectResult = await getJson(projectUrl, { fetch: options.fetch, headers });
  if (projectResult.status === 401 || projectResult.status === 403) {
    return [
      evidenceItem("sentry", "error-monitoring", "GAP", "Sentry token cannot read the configured project.", {
        recommendation: "Use a Sentry token with project read access.",
        blockKey: "block_on_connector_auth_failure",
        source: "Sentry API",
      }),
    ];
  }
  if (!projectResult.ok) {
    return [
      evidenceItem("sentry", "error-monitoring", "GAP", "Sentry project could not be read.", {
        recommendation: "Check organization/project slugs and token scope.",
        blockKey: "block_on_missing_error_monitoring",
        source: "Sentry API",
        details: { status: projectResult.status },
      }),
    ];
  }

  const items = [
    evidenceItem("sentry", "error-monitoring", "PASS", "Sentry project exists and is readable.", {
      source: "Sentry Projects API",
      blockKey: "block_on_missing_error_monitoring",
      details: {
        slug: projectResult.body?.slug,
        platform: projectResult.body?.platform,
      },
    }),
  ];

  const releasesUrl = `${base}/api/0/projects/${encodeURIComponent(entry.organization)}/${encodeURIComponent(entry.project)}/releases/?per_page=1`;
  const releases = await getJson(releasesUrl, { fetch: options.fetch, headers });
  if (releases.ok && Array.isArray(releases.body) && releases.body.length) {
    items.push(evidenceItem("sentry", "release-tracking", "PASS", "Sentry has release tracking evidence for this project.", {
      source: "Sentry Releases API",
      details: {
        version: releases.body[0]?.version,
        dateCreated: releases.body[0]?.dateCreated,
      },
    }));
  } else {
    items.push(evidenceItem("sentry", "release-tracking", "WARN", "Sentry project is readable, but no release evidence was found.", {
      recommendation: "Configure Sentry releases during deployment so incidents can be tied back to commits.",
      source: "Sentry Releases API",
    }));
  }

  return items;
}

async function runVercelConnector(entry, token, options) {
  if (!entry.project_id) {
    return [
      evidenceItem("vercel", "production-deployment", "GAP", "Vercel connector needs project_id.", {
        recommendation: "Set connectors.vercel.project_id. Use team_id when the project belongs to a team.",
        blockKey: "block_on_missing_deployment_evidence",
      }),
    ];
  }
  const base = options.apiBase || "https://api.vercel.com";
  const headers = { Authorization: `Bearer ${token}` };
  const projectUrl = appendQuery(`${base}/v9/projects/${encodeURIComponent(entry.project_id)}`, { teamId: entry.team_id });
  const projectResult = await getJson(projectUrl, { fetch: options.fetch, headers });
  if (projectResult.status === 401 || projectResult.status === 403) {
    return [
      evidenceItem("vercel", "production-deployment", "GAP", "Vercel token cannot read the configured project.", {
        recommendation: "Use a Vercel access token with read access to the project.",
        blockKey: "block_on_connector_auth_failure",
        source: "Vercel Projects API",
      }),
    ];
  }
  if (!projectResult.ok) {
    return [
      evidenceItem("vercel", "production-deployment", "GAP", "Vercel project could not be read.", {
        recommendation: "Check project_id, team_id, and token access.",
        blockKey: "block_on_missing_deployment_evidence",
        source: "Vercel Projects API",
        details: { status: projectResult.status },
      }),
    ];
  }

  const deploymentsUrl = appendQuery(`${base}/v6/deployments`, {
    projectId: entry.project_id,
    target: "production",
    limit: 1,
    teamId: entry.team_id,
  });
  const deployments = await getJson(deploymentsUrl, { fetch: options.fetch, headers });
  const latest = deployments.ok && Array.isArray(deployments.body?.deployments) ? deployments.body.deployments[0] : null;
  if (!latest) {
    return [
      evidenceItem("vercel", "production-deployment", "WARN", "Vercel project is readable, but no production deployment was found.", {
        recommendation: "Deploy to production or document another production deployment provider.",
        source: "Vercel Deployments API",
        blockKey: "block_on_missing_deployment_evidence",
      }),
    ];
  }

  return [
    evidenceItem("vercel", "production-deployment", "PASS", "Vercel has a recent production deployment record.", {
      source: "Vercel Deployments API",
      blockKey: "block_on_missing_deployment_evidence",
      details: {
        uid: latest.uid,
        url: latest.url,
        state: latest.state,
        target: latest.target,
        createdAt: latest.createdAt,
        meta: {
          githubCommitSha: latest.meta?.githubCommitSha,
          githubCommitRef: latest.meta?.githubCommitRef,
        },
      },
    }),
  ];
}

async function runGrafanaConnector(entry, token, options) {
  const base = readableBaseUrl("grafana", entry);
  if (!base.ok) return [base.item];
  const url = `${base.value}/api/v1/provisioning/alert-rules`;
  const result = await getJson(url, { fetch: options.fetch, headers: authHeaders(token) });
  if (result.status === 401 || result.status === 403) {
    return [connectorAuthGap("grafana", "alerting-evidence", "Grafana alert rules")];
  }
  if (!result.ok) {
    return [evidenceItem("grafana", "alerting-evidence", "GAP", "Grafana alert rules could not be read.", {
      recommendation: "Check connectors.grafana.base_url and token permissions.",
      source: "Grafana Alerting Provisioning API",
      blockKey: "block_on_missing_alerting",
      details: { status: result.status },
    })];
  }
  const rules = extractList(result.body);
  return [
    evidenceItem("grafana", "alerting-evidence", rules.length ? "PASS" : "WARN", rules.length
      ? "Grafana alert rules are readable and at least one rule exists."
      : "Grafana is readable, but no alert rule was found.", {
      recommendation: rules.length ? "" : "Create at least one production alert rule or document another alerting system.",
      source: "Grafana Alerting Provisioning API",
      blockKey: "block_on_missing_alerting",
      details: { ruleCount: rules.length, rules: rules.slice(0, 5).map((rule) => ({ uid: rule.uid, title: rule.title, folderUID: rule.folderUID })) },
    }),
  ];
}

async function runPrometheusConnector(entry, token, options) {
  const base = readableBaseUrl("prometheus", entry);
  if (!base.ok) return [base.item];
  const headers = token ? authHeaders(token) : {};
  const rules = await getJson(`${base.value}/api/v1/rules?type=alert`, { fetch: options.fetch, headers });
  if (rules.status === 401 || rules.status === 403) {
    return [connectorAuthGap("prometheus", "alerting-evidence", "Prometheus alert rules")];
  }
  if (!rules.ok || rules.body?.status === "error") {
    return [evidenceItem("prometheus", "alerting-evidence", "GAP", "Prometheus alert rules could not be read.", {
      recommendation: "Check connectors.prometheus.base_url and read token.",
      source: "Prometheus HTTP API",
      blockKey: "block_on_missing_alerting",
      details: { status: rules.status, prometheusStatus: rules.body?.status },
    })];
  }

  const alertRules = parsePrometheusRules(rules.body);
  const items = [
    evidenceItem("prometheus", "alerting-evidence", alertRules.length ? "PASS" : "WARN", alertRules.length
      ? "Prometheus alerting rules are readable and at least one rule exists."
      : "Prometheus is readable, but no alerting rule was found.", {
      recommendation: alertRules.length ? "" : "Add alerting rules for production symptoms or document another alerting system.",
      source: "Prometheus HTTP API /api/v1/rules",
      blockKey: "block_on_missing_alerting",
      details: { ruleCount: alertRules.length, rules: alertRules.slice(0, 5).map((rule) => ({ name: rule.name || rule.alert, state: rule.state, health: rule.health })) },
    }),
  ];

  const alerts = await getJson(`${base.value}/api/v1/alerts`, { fetch: options.fetch, headers });
  if (alerts.ok && alerts.body?.status !== "error") {
    const activeAlerts = alerts.body?.data?.alerts || [];
    items.push(evidenceItem("prometheus", "alert-status", "PASS", "Prometheus current alert state is readable.", {
      source: "Prometheus HTTP API /api/v1/alerts",
      details: { activeAlertCount: activeAlerts.length },
    }));
  } else {
    items.push(evidenceItem("prometheus", "alert-status", "WARN", "Prometheus alerting rules are readable, but current alert state could not be read.", {
      recommendation: "Allow read access to /api/v1/alerts or document alert status elsewhere.",
      source: "Prometheus HTTP API /api/v1/alerts",
      details: { status: alerts.status, prometheusStatus: alerts.body?.status },
    }));
  }
  return items;
}

function bytebaseProjectName(entry) {
  if (!entry.project) return "";
  return String(entry.project).startsWith("projects/") ? String(entry.project) : `projects/${entry.project}`;
}

async function runBytebaseConnector(entry, token, options) {
  const base = readableBaseUrl("bytebase", entry);
  if (!base.ok) return [base.item];
  const project = bytebaseProjectName(entry);
  if (!project) {
    return [missingConfig("bytebase", "database-migration-governance", "project", {
      blockKey: "block_on_missing_database_governance",
    })];
  }

  const headers = authHeaders(token);
  const projectResult = await getJson(`${base.value}/v1/${project}`, { fetch: options.fetch, headers });
  if (projectResult.status === 401 || projectResult.status === 403) {
    return [connectorAuthGap("bytebase", "database-migration-governance", "Bytebase project")];
  }
  if (!projectResult.ok) {
    return [evidenceItem("bytebase", "database-migration-governance", "GAP", "Bytebase project could not be read.", {
      recommendation: "Check connectors.bytebase.base_url, project, and token permissions.",
      source: "Bytebase API",
      blockKey: "block_on_missing_database_governance",
      details: { status: projectResult.status },
    })];
  }

  const databaseUrl = appendQuery(`${base.value}/v1/${project}/databases`, { pageSize: 20 });
  const databaseResult = await getJson(databaseUrl, { fetch: options.fetch, headers });
  const rolloutUrl = appendQuery(`${base.value}/v1/rollouts`, { pageSize: 10, filter: `project == "${project}"` });
  const rolloutResult = await getJson(rolloutUrl, { fetch: options.fetch, headers });
  const issueUrl = appendQuery(`${base.value}/v1/${project}/issues`, { pageSize: 10 });
  const issueResult = await getJson(issueUrl, { fetch: options.fetch, headers });

  const databases = databaseResult.ok ? extractList(databaseResult.body, ["databases"]) : [];
  const rollouts = rolloutResult.ok ? extractList(rolloutResult.body, ["rollouts"]) : [];
  const issues = issueResult.ok ? extractList(issueResult.body, ["issues"]) : [];
  const failedRollout = rollouts.find((rollout) => isFailedStatus(rollout.status || rollout.state));
  if (failedRollout) {
    return [evidenceItem("bytebase", "database-migration-governance", "FAIL", "Bytebase has a failed rollout for the configured project.", {
      recommendation: "Resolve the failed rollout before releasing database changes.",
      source: "Bytebase Rollouts API",
      blockKey: "block_on_missing_database_governance",
      details: { project, rollout: { name: failedRollout.name, status: failedRollout.status || failedRollout.state } },
    })];
  }

  const hasGovernanceEvidence = databases.length > 0 || rollouts.length > 0 || issues.length > 0;
  return [evidenceItem("bytebase", "database-migration-governance", hasGovernanceEvidence ? "PASS" : "WARN", hasGovernanceEvidence
    ? "Bytebase project is readable and database migration governance evidence was found."
    : "Bytebase project is readable, but no database, issue, or rollout evidence was found.", {
    recommendation: hasGovernanceEvidence ? "" : "Route schema changes through Bytebase databases/issues/rollouts or document another migration review path.",
    source: "Bytebase API",
    blockKey: "block_on_missing_database_governance",
    details: {
      project,
      databaseCount: databases.length,
      issueCount: issues.length,
      rolloutCount: rollouts.length,
    },
  })];
}

async function runAtlasConnector(entry, _token, options) {
  const migrationsDir = entry.migrations_dir || "migrations";
  const migrationsPath = path.resolve(options.root || process.cwd(), migrationsDir);
  if (!fs.existsSync(migrationsPath)) {
    return [evidenceItem("atlas", "migration-lint", "GAP", "Atlas migration lint could not run because the migrations directory was not found.", {
      recommendation: "Set connectors.atlas.migrations_dir to the migration directory.",
      source: "Atlas CLI",
      blockKey: "block_on_missing_database_governance",
      details: { migrationsDir },
    })];
  }
  const devUrlEnv = entry.dev_url_env || "ATLAS_DEV_URL";
  const devUrl = (options.env || process.env)[devUrlEnv];
  if (!devUrl) {
    return [evidenceItem("atlas", "migration-lint", "GAP", `${devUrlEnv} is not set.`, {
      recommendation: "Set a disposable development database URL for Atlas migration lint. Do not commit it.",
      source: "Atlas CLI",
      blockKey: "block_on_missing_database_governance",
      details: { migrationsDir, devUrlEnv },
    })];
  }
  const latest = Number.isFinite(Number(entry.latest)) ? Number(entry.latest) : 1;
  const args = ["migrate", "lint", "--dir", `file://${migrationsPath}`, "--dev-url", devUrl, "--latest", String(latest)];
  const result = runCommand("atlas", args, { ...options, cwd: options.root || process.cwd() });
  if (result.error && result.error.code === "ENOENT") {
    return [evidenceItem("atlas", "migration-lint", "GAP", "Atlas CLI is not installed or not on PATH.", {
      recommendation: "Install Atlas CLI or use Bytebase/Squawk for migration review evidence.",
      source: "Atlas CLI",
      blockKey: "block_on_missing_database_governance",
      details: { migrationsDir, latest },
    })];
  }
  if (result.error) {
    return [evidenceItem("atlas", "migration-lint", "GAP", "Atlas migration lint could not be executed.", {
      recommendation: "Check that Atlas CLI can run in this shell.",
      source: "Atlas CLI",
      blockKey: "block_on_missing_database_governance",
      details: { error: result.error.code || result.error.name, latest },
    })];
  }
  return [evidenceItem("atlas", "migration-lint", result.status === 0 ? "PASS" : "FAIL", result.status === 0
    ? "Atlas migration lint completed successfully."
    : "Atlas migration lint reported unsafe or invalid migrations.", {
    recommendation: result.status === 0 ? "" : "Fix the migration lint findings before releasing database changes.",
    source: "Atlas CLI migrate lint",
    blockKey: "block_on_missing_database_governance",
    details: { exitCode: result.status, migrationsDir, latest },
  })];
}

async function runCloudflareConnector(entry, token, options) {
  if (!entry.account_id || !entry.project_name) {
    return [missingConfig("cloudflare", "production-deployment", "account_id and project_name", {
      blockKey: "block_on_missing_deployment_evidence",
    })];
  }
  const base = options.apiBase || "https://api.cloudflare.com/client/v4";
  const url = `${base}/accounts/${encodeURIComponent(entry.account_id)}/pages/projects/${encodeURIComponent(entry.project_name)}/deployments`;
  const result = await getJson(url, { fetch: options.fetch, headers: authHeaders(token) });
  if (result.status === 401 || result.status === 403) {
    return [connectorAuthGap("cloudflare", "production-deployment", "Cloudflare Pages deployments")];
  }
  if (!result.ok || result.body?.success === false) {
    return [evidenceItem("cloudflare", "production-deployment", "GAP", "Cloudflare Pages deployments could not be read.", {
      recommendation: "Check account_id, project_name, and token permissions.",
      source: "Cloudflare Pages API",
      blockKey: "block_on_missing_deployment_evidence",
      details: { status: result.status, success: result.body?.success },
    })];
  }
  const deployments = extractList(result.body, ["result"]);
  const latest = deployments[0];
  if (!latest) {
    return [evidenceItem("cloudflare", "production-deployment", "WARN", "Cloudflare Pages project is readable, but no deployment was found.", {
      recommendation: "Deploy to production or document another deployment provider.",
      source: "Cloudflare Pages API",
      blockKey: "block_on_missing_deployment_evidence",
    })];
  }
  const status = latest.latest_stage?.status || latest.status || latest.deployment_trigger?.metadata?.commit_hash;
  return [evidenceItem("cloudflare", "production-deployment", isFailedStatus(status) ? "FAIL" : "PASS", isFailedStatus(status)
    ? "The latest Cloudflare Pages deployment appears failed."
    : "Cloudflare Pages has deployment evidence for this project.", {
    recommendation: isFailedStatus(status) ? "Fix or roll forward the failed deployment before release." : "",
    source: "Cloudflare Pages API",
    blockKey: "block_on_missing_deployment_evidence",
    details: {
      id: latest.id,
      environment: latest.environment,
      status,
      created_on: latest.created_on,
      commitHash: latest.deployment_trigger?.metadata?.commit_hash,
    },
  })];
}

async function runRenderConnector(entry, token, options) {
  if (!entry.service_id) {
    return [missingConfig("render", "production-deployment", "service_id", {
      blockKey: "block_on_missing_deployment_evidence",
    })];
  }
  const base = options.apiBase || "https://api.render.com/v1";
  const headers = authHeaders(token);
  const service = await getJson(`${base}/services/${encodeURIComponent(entry.service_id)}`, { fetch: options.fetch, headers });
  if (service.status === 401 || service.status === 403) {
    return [connectorAuthGap("render", "production-deployment", "Render service")];
  }
  if (!service.ok) {
    return [evidenceItem("render", "production-deployment", "GAP", "Render service could not be read.", {
      recommendation: "Check connectors.render.service_id and token permissions.",
      source: "Render API",
      blockKey: "block_on_missing_deployment_evidence",
      details: { status: service.status },
    })];
  }
  const deploys = await getJson(`${base}/services/${encodeURIComponent(entry.service_id)}/deploys?limit=1`, { fetch: options.fetch, headers });
  const latestWrapper = deploys.ok ? extractList(deploys.body)[0] : null;
  const latest = latestWrapper?.deploy || latestWrapper;
  if (!latest) {
    return [evidenceItem("render", "production-deployment", "WARN", "Render service is readable, but no deploy was found.", {
      recommendation: "Deploy the service or document another deployment provider.",
      source: "Render API",
      blockKey: "block_on_missing_deployment_evidence",
    })];
  }
  const status = latest.status || latest.deployStatus;
  return [evidenceItem("render", "production-deployment", isFailedStatus(status) ? "FAIL" : (isHealthyDeploymentStatus(status) ? "PASS" : "WARN"), isFailedStatus(status)
    ? "The latest Render deploy appears failed."
    : "Render has recent deployment evidence for this service.", {
    recommendation: isFailedStatus(status) ? "Fix or roll forward the failed Render deploy before release." : "",
    source: "Render API",
    blockKey: "block_on_missing_deployment_evidence",
    details: { id: latest.id, status, createdAt: latest.createdAt, commitId: latest.commit?.id || latest.commitId },
  })];
}

async function runFlyConnector(entry, token, options) {
  if (!entry.app_name) {
    return [missingConfig("fly", "runtime-evidence", "app_name", {
      blockKey: "block_on_missing_deployment_evidence",
    })];
  }
  const base = options.apiBase || "https://api.machines.dev/v1";
  const machines = await getJson(`${base}/apps/${encodeURIComponent(entry.app_name)}/machines`, { fetch: options.fetch, headers: authHeaders(token) });
  if (machines.status === 401 || machines.status === 403) {
    return [connectorAuthGap("fly", "runtime-evidence", "Fly Machines")];
  }
  if (!machines.ok) {
    return [evidenceItem("fly", "runtime-evidence", "GAP", "Fly Machines could not be read.", {
      recommendation: "Check connectors.fly.app_name and token permissions.",
      source: "Fly Machines API",
      blockKey: "block_on_missing_deployment_evidence",
      details: { status: machines.status },
    })];
  }
  const machineList = extractList(machines.body);
  if (!machineList.length) {
    return [evidenceItem("fly", "runtime-evidence", "WARN", "Fly app is readable, but no Machines were found.", {
      recommendation: "Confirm the app is deployed or document another production runtime.",
      source: "Fly Machines API",
      blockKey: "block_on_missing_deployment_evidence",
    })];
  }
  const failed = machineList.filter((machine) => isFailedStatus(machine.state || machine.status));
  return [evidenceItem("fly", "runtime-evidence", failed.length ? "FAIL" : "PASS", failed.length
    ? "One or more Fly Machines appear failed."
    : "Fly Machines runtime evidence is readable.", {
    recommendation: failed.length ? "Investigate failed Machines before release." : "",
    source: "Fly Machines API",
    blockKey: "block_on_missing_deployment_evidence",
    details: {
      app: entry.app_name,
      machineCount: machineList.length,
      failedCount: failed.length,
      machines: machineList.slice(0, 5).map((machine) => ({ id: machine.id, state: machine.state, region: machine.region, imageRef: machine.config?.image })),
    },
  })];
}

async function runProvider(provider, entry, options) {
  const auth = envToken(provider, entry, options.env || process.env);
  if (!auth.ok) return [auth.item];
  if (provider === "github") return runGitHubConnector(entry, auth.token, options);
  if (provider === "sentry") return runSentryConnector(entry, auth.token, options);
  if (provider === "vercel") return runVercelConnector(entry, auth.token, options);
  if (provider === "grafana") return runGrafanaConnector(entry, auth.token, options);
  if (provider === "prometheus") return runPrometheusConnector(entry, auth.token, options);
  if (provider === "bytebase") return runBytebaseConnector(entry, auth.token, options);
  if (provider === "atlas") return runAtlasConnector(entry, auth.token, options);
  if (provider === "cloudflare") return runCloudflareConnector(entry, auth.token, options);
  if (provider === "render") return runRenderConnector(entry, auth.token, options);
  if (provider === "fly") return runFlyConnector(entry, auth.token, options);
  return [evidenceItem(provider, "connector-implementation", "GAP", `${provider} connector is not implemented in this version.`)];
}

function secretFieldItems(secretFields) {
  return secretFields.map((field) => evidenceItem("connectors", "secret-in-config", "FAIL", `Secret-like field '${field}' is present in connectors.yml.`, {
    recommendation: "Remove secrets from connectors.yml and store the value in an environment variable instead.",
    source: connectorsRelativePath,
    blockKey: "block_on_connector_auth_failure",
  }));
}

export async function runEvidence(projectRoot, options = {}) {
  const loaded = loadConnectorsConfig(projectRoot);
  const items = [];
  items.push(...secretFieldItems(loaded.secretFields));
  for (const error of loaded.parseErrors) {
    items.push(evidenceItem("connectors", "parse-error", "GAP", `${error.path}: ${error.reason}`, {
      recommendation: "Fix connectors.yml so platform evidence can be checked.",
    }));
  }

  if (!loaded.initialized) {
    items.push(evidenceItem("connectors", "connector-config", "GAP", "connectors.yml has not been initialized.", {
      recommendation: "Run init-audit or create .ai-maintainer/connectors.yml with token_env values.",
    }));
  }

  const onlyProviders = options.providers ? new Set(options.providers) : null;
  for (const [provider, entry] of providerConfigEntries(loaded.config)) {
    if (onlyProviders && !onlyProviders.has(provider)) continue;
    if (!entry.enabled && !options.includeDisabled) continue;
    const providerItems = await runProvider(provider, entry, {
      env: options.env || process.env,
      fetch: options.fetch || globalThis.fetch,
      apiBase: options.apiBase,
      root: loaded.root,
      runCommand: options.runCommand,
    });
    items.push(...providerItems);
  }

  return {
    schemaVersion: 1,
    root: loaded.root,
    generatedAt: new Date().toISOString(),
    connectorsEnabled: providerConfigEntries(loaded.config).some(([, entry]) => Boolean(entry.enabled)),
    initialized: loaded.initialized,
    items,
    warnings: items.filter((item) => item.status === "WARN"),
    gaps: items.filter((item) => item.status === "GAP"),
    failures: items.filter((item) => item.status === "FAIL"),
  };
}

export function evidenceChecks(evidenceReport, riskPolicy = {}) {
  if (!evidenceReport) return [];
  const productionEvidencePolicy = riskPolicy.production_evidence || {};
  return (evidenceReport.items || [])
    .filter((item) => item.status !== "N/A")
    .map((item) => {
      const configuredBlock = item.blockKey ? Boolean(productionEvidencePolicy[item.blockKey]) : false;
      const blocking = item.status === "FAIL" || (configuredBlock && ["GAP", "WARN"].includes(item.status));
      return {
        checkId: `evidence-${item.provider}-${item.checkId}`,
        name: `production evidence: ${item.title}`,
        group: "production-evidence",
        status: item.status,
        blocking,
        coverageGap: item.status === "GAP",
        evidenceLevel: item.status === "GAP" ? "GAP" : (item.provider === "connectors" ? "TOOL_VERIFIED" : "PLATFORM_VERIFIED"),
        summary: item.summary,
        recommendation: item.recommendation,
        evidence: {
          provider: item.provider,
          source: item.source,
          details: item.details,
        },
      };
    });
}

export function applyEvidenceToAudit(audit, evidenceReport) {
  if (!audit || !evidenceReport) return audit;
  const mappings = new Map([
    ["github:release-approval", "release-approval"],
    ["sentry:error-monitoring", "observability-errors"],
    ["grafana:alerting-evidence", "observability-alerts"],
    ["prometheus:alerting-evidence", "observability-alerts"],
    ["bytebase:database-migration-governance", "database-migrations"],
    ["atlas:migration-lint", "database-migrations"],
  ]);
  const passItems = (evidenceReport.items || []).filter((item) => item.status === "PASS");
  if (!passItems.length) return audit;
  const updatedPlan = audit.plan.map((entry) => {
    const matching = passItems.find((item) => mappings.get(`${item.provider}:${item.checkId}`) === entry.id);
    if (!matching || entry.status !== "GAP") return entry;
    return {
      ...entry,
      status: "PASS",
      summary: `${entry.summary} Verified by ${matching.source}: ${matching.summary}`,
      recommendation: "",
      connectorEvidence: {
        provider: matching.provider,
        checkId: matching.checkId,
        source: matching.source,
      },
    };
  });
  return {
    ...audit,
    plan: updatedPlan,
    evidence: updatedPlan.filter((entry) => entry.status === "PASS"),
    coverageGaps: updatedPlan.filter((entry) => entry.status === "GAP"),
    userDecisions: updatedPlan.filter((entry) => entry.status === "USER_DECISION"),
  };
}

export function writeEvidenceReport(evidenceReport, outputPath) {
  const resolved = path.resolve(outputPath);
  fs.mkdirSync(path.dirname(resolved), { recursive: true });
  fs.writeFileSync(resolved, JSON.stringify(evidenceReport, null, 2));
}
