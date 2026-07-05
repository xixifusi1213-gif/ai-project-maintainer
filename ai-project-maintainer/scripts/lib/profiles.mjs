const profileOrder = ["electron-desktop", "database-prisma", "nextjs-web", "node-api", "oss-library"];

export const defaultProfileId = "auto";

function depsOf(project) {
  return {
    ...(project?.packageJson?.dependencies || {}),
    ...(project?.packageJson?.devDependencies || {}),
    ...(project?.packageJson?.peerDependencies || {}),
  };
}

function hasAnyDependency(project, names) {
  const deps = depsOf(project);
  return names.some((name) => Boolean(deps[name]));
}

function hasFile(project, pattern) {
  return (project?.files || []).some((file) => pattern.test(file));
}

function signal(id, evidence) {
  return { id, evidence };
}

const profileDefinitions = {
  "electron-desktop": {
    id: "electron-desktop",
    title: "Electron desktop app",
    aliases: ["electron"],
    riskFocus: [
      "IPC/preload boundary",
      "local file permissions",
      "shell/openExternal usage",
      "auto-update integrity",
      "packaging and release trust",
    ],
    policy: {
      checks: { electron: "block", actionlint: "block", zizmor: "warn" },
      fail_on: { electron_dangerous_settings: true },
    },
    auditPlan: [
      ["electron-ipc-preload", "Electron IPC/preload boundary", "GAP", "Review preload exposure, contextIsolation, nodeIntegration, and IPC allowlists.", "Keep privileged actions in the main process and expose narrow IPC APIs."],
      ["electron-local-files", "Electron local file access", "GAP", "Review local file import/export authorization.", "Prefer main-process file pickers or path tokens over renderer-supplied arbitrary paths."],
      ["electron-update-trust", "Electron update trust", "GAP", "Review update metadata, signatures, and integrity checks.", "Use signed update metadata or fail closed when integrity evidence is missing."],
    ],
    wizardQuestions: [
      { id: "electron_shell_access", prompt: "Does the app open shell commands, external URLs, or local files from renderer-controlled input?", riskKey: "electron_shell_access" },
      { id: "electron_packaging", prompt: "Is the desktop build signed or otherwise tied to a trusted release artifact?", riskKey: "electron_packaging_trust" },
    ],
  },
  "database-prisma": {
    id: "database-prisma",
    title: "Prisma database project",
    aliases: ["prisma"],
    riskFocus: [
      "Prisma schema and migrations",
      "destructive migration review",
      "backup before data changes",
      "rollback or forward-fix plan",
      "transaction and concurrent write safety",
    ],
    policy: {
      checks: { database: "block", "package-audit": "block" },
    },
    auditPlan: [
      ["prisma-schema", "Prisma schema review", "GAP", "Prisma schema or migrations require compatibility review before production.", "Review schema changes for destructive operations and data backfills."],
      ["prisma-migration-safety", "Prisma migration safety", "GAP", "Migration governance evidence is required for production database changes.", "Use Prisma migrate review plus Atlas, Bytebase, Squawk, or documented manual review."],
      ["prisma-data-consistency", "Prisma data consistency", "USER_DECISION", "Maintainer must identify transaction, uniqueness, and concurrent write risks.", "Document critical writes and add tests for transaction boundaries."],
    ],
    wizardQuestions: [
      { id: "prisma_destructive_migrations", prompt: "Can Prisma migrations drop, rename, or rewrite production data?", riskKey: "prisma_destructive_migrations" },
      { id: "prisma_transaction_boundaries", prompt: "Are critical writes protected by transactions or uniqueness constraints?", riskKey: "prisma_transaction_boundaries" },
    ],
  },
  "nextjs-web": {
    id: "nextjs-web",
    title: "Next.js web app",
    aliases: ["next", "nextjs", "web"],
    riskFocus: [
      "auth middleware and route protection",
      "API routes and server actions",
      "public vs server-only environment variables",
      "headers, CORS, and uploads",
      "deployment and observability evidence",
    ],
    policy: {
      checks: { semgrep: "block", actionlint: "block", zizmor: "warn" },
    },
    auditPlan: [
      ["nextjs-auth-boundary", "Next.js auth boundary", "USER_DECISION", "Confirm protected routes, middleware, and server actions are covered.", "Declare auth-critical flows and tests in business-flows.yml."],
      ["nextjs-env-boundary", "Next.js environment variable boundary", "GAP", "Review public NEXT_PUBLIC_* exposure and server-only secrets.", "Keep secrets server-only and verify no sensitive env is exposed to clients."],
      ["nextjs-production-evidence", "Next.js production evidence", "GAP", "Deployment, logs, errors, and rollback evidence should be declared.", "Connect Vercel/Cloudflare/Render evidence or document manual release controls."],
    ],
    wizardQuestions: [
      { id: "nextjs_server_actions", prompt: "Does the app use Server Actions or API routes that mutate data?", riskKey: "nextjs_server_actions" },
      { id: "nextjs_public_env", prompt: "Does the app expose any NEXT_PUBLIC_* values that require review?", riskKey: "nextjs_public_env_review" },
    ],
  },
  "node-api": {
    id: "node-api",
    title: "Node API service",
    aliases: ["api"],
    riskFocus: [
      "authentication and authorization",
      "input validation",
      "rate limiting and abuse controls",
      "CORS and public API boundaries",
      "logging redaction and API tests",
    ],
    policy: {
      checks: { semgrep: "block", "package-audit": "block" },
    },
    auditPlan: [
      ["node-api-authz", "API authentication and authorization", "USER_DECISION", "Maintainer must confirm protected endpoints and privilege boundaries.", "Declare protected API flows and tests."],
      ["node-api-input-validation", "API input validation", "GAP", "Public endpoints need input validation and error handling evidence.", "Add validation tests for request bodies, query params, and auth failures."],
      ["node-api-abuse-controls", "API abuse controls", "GAP", "Rate limit, CORS, and logging redaction evidence is missing.", "Document rate limits, allowed origins, and sensitive log redaction."],
    ],
    wizardQuestions: [
      { id: "api_rate_limit", prompt: "Does the API have rate limits or abuse protection?", riskKey: "api_rate_limit" },
      { id: "api_log_redaction", prompt: "Are tokens, passwords, and personal data redacted from logs?", riskKey: "api_log_redaction" },
    ],
  },
  "oss-library": {
    id: "oss-library",
    title: "Open source library or CLI",
    aliases: ["oss", "library", "cli"],
    riskFocus: [
      "package metadata and license",
      "CI and contributor safety",
      "SBOM and provenance",
      "SemVer and release notes",
      "OpenSSF Scorecard hygiene",
    ],
    policy: {
      checks: { scorecard: "warn", syft: "warn", grype: "warn", "pre-commit": "warn" },
    },
    auditPlan: [
      ["oss-package-metadata", "OSS package metadata", "GAP", "Package metadata, license, repository, and bug tracker should be complete.", "Keep package.json metadata, README, LICENSE, and SECURITY.md aligned."],
      ["oss-release-trust", "OSS release trust", "GAP", "SBOM, provenance, manifest, and release notes improve downstream trust.", "Use npm provenance, GitHub Release artifacts, and release manifests."],
      ["oss-contributor-safety", "OSS contributor safety", "GAP", "Contributor docs and issue templates improve maintainability.", "Document contribution, security reporting, and PR expectations."],
    ],
    wizardQuestions: [
      { id: "oss_public_api", prompt: "Does this package expose public APIs that require SemVer compatibility?", riskKey: "oss_public_api_compatibility" },
      { id: "oss_release_provenance", prompt: "Is release provenance or package signing enabled?", riskKey: "oss_release_provenance" },
    ],
  },
};

export function normalizeProfileId(value) {
  const raw = String(value || "auto").trim().toLowerCase();
  if (!raw || raw === "auto") return "auto";
  for (const profile of Object.values(profileDefinitions)) {
    if (profile.id === raw || profile.aliases.includes(raw)) return profile.id;
  }
  return raw;
}

export function getProfileDefinition(id) {
  const normalized = normalizeProfileId(id);
  return profileDefinitions[normalized] || profileDefinitions["oss-library"];
}

export function detectProfileSignals(project = {}) {
  const signals = {};
  const deps = depsOf(project);
  const pkg = project.packageJson || {};

  signals["electron-desktop"] = [
    project.electron?.detected ? signal("electron-detected", "Electron dependency or main/preload/electron file detected") : null,
    hasAnyDependency(project, ["electron", "electron-builder", "electron-forge"]) ? signal("electron-dependency", "Electron desktop dependency detected") : null,
  ].filter(Boolean);

  signals["database-prisma"] = [
    hasAnyDependency(project, ["prisma", "@prisma/client"]) ? signal("prisma-dependency", "Prisma dependency detected") : null,
    hasFile(project, /(^|\/)prisma\/schema\.prisma$/i) ? signal("prisma-schema", "prisma/schema.prisma detected") : null,
    hasFile(project, /(^|\/)prisma\/migrations\//i) ? signal("prisma-migrations", "Prisma migrations detected") : null,
  ].filter(Boolean);

  signals["nextjs-web"] = [
    Boolean(deps.next) ? signal("next-dependency", "Next.js dependency detected") : null,
    hasFile(project, /(^|\/)next\.config\.(js|mjs|ts|cjs)$/i) ? signal("next-config", "next.config file detected") : null,
    hasFile(project, /(^|\/)app\/(layout|page|route)\.(js|jsx|ts|tsx)$/i) ? signal("next-app-router", "Next.js app router detected") : null,
    hasFile(project, /(^|\/)pages\/api\//i) ? signal("next-pages-api", "Next.js pages/api routes detected") : null,
  ].filter(Boolean);

  signals["node-api"] = [
    hasAnyDependency(project, ["express", "fastify", "koa", "hono", "@nestjs/core"]) ? signal("api-framework", "Node API framework dependency detected") : null,
    hasFile(project, /(^|\/)(routes?|controllers?|middleware)\//i) ? signal("api-folders", "API route/controller/middleware folders detected") : null,
    hasFile(project, /(^|\/)(server|app|api)\.(js|mjs|cjs|ts)$/i) && !signals["nextjs-web"].length ? signal("api-entrypoint", "Node server entrypoint detected") : null,
  ].filter(Boolean);

  signals["oss-library"] = [
    pkg.name && (pkg.main || pkg.exports || pkg.types || pkg.bin) ? signal("package-entrypoint", "package.json exposes library, CLI, or types entrypoint") : null,
    hasFile(project, /^README\.md$/i) ? signal("readme", "README detected") : null,
    hasFile(project, /^LICENSE(\.md|\.txt)?$/i) ? signal("license", "LICENSE detected") : null,
  ].filter(Boolean);

  return signals;
}

export function resolveProjectProfile(project = {}, options = {}) {
  const cliProfile = normalizeProfileId(options.cliProfile);
  const policyProfile = normalizeProfileId(options.policyProfile);
  const projectProfile = normalizeProfileId(options.projectProfile);
  const signals = detectProfileSignals(project);

  for (const [source, id] of [
    ["cli", cliProfile],
    ["policy", policyProfile],
    ["project-profile", projectProfile],
  ]) {
    if (id && id !== "auto") {
      const definition = getProfileDefinition(id);
      return {
        id: definition.id,
        source,
        title: definition.title,
        signals,
        matchedProfiles: profileOrder.filter((profileId) => signals[profileId]?.length),
        riskFocus: definition.riskFocus,
        policy: definition.policy,
        auditPlan: definition.auditPlan,
        wizardQuestions: definition.wizardQuestions,
      };
    }
  }

  const detected = profileOrder.find((profileId) => signals[profileId]?.length);
  const definition = getProfileDefinition(detected || "oss-library");
  return {
    id: definition.id,
    source: detected ? "detected" : "fallback",
    title: definition.title,
    signals,
    matchedProfiles: profileOrder.filter((profileId) => signals[profileId]?.length),
    riskFocus: definition.riskFocus,
    policy: definition.policy,
    auditPlan: definition.auditPlan,
    wizardQuestions: definition.wizardQuestions,
  };
}

export function buildProfilePolicy(profile) {
  return profile?.policy || {};
}

export function profileIds() {
  return ["auto", ...profileOrder];
}
