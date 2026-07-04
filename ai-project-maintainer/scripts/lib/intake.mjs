import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const intakeRelativePaths = {
  profile: ".ai-maintainer/project-profile.yml",
  evidence: ".ai-maintainer/evidence-sources.yml",
  businessFlows: ".ai-maintainer/business-flows.yml",
  riskPolicy: ".ai-maintainer/risk-policy.yml",
};

export const defaultProjectProfile = {
  schema_version: 1,
  project: {
    name: "",
    type: "auto",
    lifecycle: "development",
    production: false,
  },
  risk: {
    handles_auth: false,
    handles_sensitive_data: false,
    handles_payments: false,
    handles_financial_data: false,
    handles_health_data: false,
    has_database: "auto",
    has_deployment: false,
    has_user_generated_content: false,
  },
};

export const defaultEvidenceSources = {
  schema_version: 1,
  evidence: {
    github_actions: "auto",
    deployment: {
      provider: "none",
      has_staging: false,
      has_production: false,
      production_requires_approval: false,
    },
    observability: {
      errors: "none",
      logs: "none",
      metrics: "none",
      alerts: "none",
    },
    database: {
      migrations: "auto",
      review_tool: "none",
      backup_policy: "none",
      rollback_plan: "none",
    },
  },
};

export const defaultBusinessFlows = {
  schema_version: 1,
  business_flows: [
    {
      id: "example-critical-flow",
      name: "Replace with a real critical user flow",
      criticality: "high",
      expected_behavior: "Describe what must never break.",
      tests: [],
      template: true,
    },
  ],
};

export const defaultRiskPolicy = {
  schema_version: 1,
  production: {
    block_on_coverage_gaps: false,
    block_on_user_decisions: false,
    require_intake: false,
  },
  production_evidence: {
    block_on_missing_release_approval: false,
    block_on_missing_error_monitoring: false,
    block_on_missing_alerting: false,
    block_on_missing_database_governance: false,
    block_on_missing_deployment_evidence: false,
    block_on_connector_auth_failure: false,
  },
};

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function deepMerge(base, custom) {
  if (!isPlainObject(base) || !isPlainObject(custom)) return custom ?? base;
  const merged = { ...base };
  for (const [key, value] of Object.entries(custom)) {
    merged[key] = isPlainObject(value) && isPlainObject(base[key]) ? deepMerge(base[key], value) : value;
  }
  return merged;
}

function readYaml(root, relativePath, fallback, parseErrors) {
  const fullPath = path.join(root, ...relativePath.split("/"));
  if (!fs.existsSync(fullPath)) return { exists: false, value: fallback };

  try {
    const text = fs.readFileSync(fullPath, "utf8").replace(/^\uFEFF/, "");
    return { exists: true, value: YAML.parse(text) || fallback };
  } catch (error) {
    parseErrors.push({ path: relativePath, reason: error.message });
    return { exists: true, value: fallback };
  }
}

function booleanFrom(value, fallback) {
  if (value === "auto" || value === undefined || value === null) return fallback;
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["true", "yes", "present"].includes(value.toLowerCase());
  return Boolean(value);
}

function hasExternalEvidence(value) {
  if (value === true) return true;
  if (!value || value === "auto") return false;
  if (typeof value === "string") return !["none", "missing", "unknown", "false", "no"].includes(value.toLowerCase());
  return Boolean(value);
}

function inferProjectType(project, configuredType) {
  if (configuredType && configuredType !== "auto") return configuredType;
  if (project?.electron?.detected) return "electron";
  const deps = { ...(project?.packageJson?.dependencies || {}), ...(project?.packageJson?.devDependencies || {}) };
  if (deps.next || deps.react || deps.vue || deps.svelte || deps.vite) return "web";
  if (deps.express || deps.fastify || deps["@nestjs/core"] || deps.koa) return "api";
  if (project?.packageJson) return "node";
  return "generic";
}

export function loadIntake(projectRoot, project = {}) {
  const root = path.resolve(projectRoot);
  const parseErrors = [];
  const profileDocument = readYaml(root, intakeRelativePaths.profile, defaultProjectProfile, parseErrors);
  const evidenceDocument = readYaml(root, intakeRelativePaths.evidence, defaultEvidenceSources, parseErrors);
  const businessDocument = readYaml(root, intakeRelativePaths.businessFlows, defaultBusinessFlows, parseErrors);
  const riskDocument = readYaml(root, intakeRelativePaths.riskPolicy, defaultRiskPolicy, parseErrors);

  const profile = deepMerge(defaultProjectProfile, profileDocument.value);
  const evidence = deepMerge(defaultEvidenceSources, evidenceDocument.value);
  const businessFlows = deepMerge(defaultBusinessFlows, businessDocument.value);
  const riskPolicy = deepMerge(defaultRiskPolicy, riskDocument.value);

  const detectedDatabase = Boolean(project?.riskSurfaces?.database?.length);
  const detectedCi = Boolean(project?.riskSurfaces?.ci?.length);
  const projectType = inferProjectType(project, profile.project?.type);
  const hasDatabase = booleanFrom(profile.risk?.has_database, detectedDatabase);
  const hasCi = booleanFrom(evidence.evidence?.github_actions, detectedCi);
  const deployment = evidence.evidence?.deployment || {};

  profile.derived = {
    projectType,
    hasDatabase,
    hasCi,
    hasElectron: Boolean(project?.electron?.detected),
    hasDeployment: Boolean(profile.risk?.has_deployment || deployment.has_staging || deployment.has_production),
    hasObservability: ["errors", "logs", "metrics", "alerts"].some((key) => hasExternalEvidence(evidence.evidence?.observability?.[key])),
  };

  return {
    initialized: profileDocument.exists,
    profile,
    evidence,
    businessFlows,
    riskPolicy,
    parseErrors,
    paths: Object.fromEntries(Object.entries(intakeRelativePaths).map(([key, relativePath]) => [key, path.join(root, ...relativePath.split("/"))])),
  };
}

export function hasConfiguredEvidence(value) {
  return hasExternalEvidence(value);
}
