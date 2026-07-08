import fs from "node:fs";
import path from "node:path";
import readline from "node:readline/promises";
import { detectProject } from "./project-detect.mjs";
import {
  deepMerge,
  defaultAuthzMatrix,
  defaultBusinessFlows,
  defaultDataBoundaries,
  defaultEvidenceSources,
  defaultProjectProfile,
  defaultRiskPolicy,
  loadIntake,
} from "./intake.mjs";
import { normalizeProfileId, profileIds } from "./profiles.mjs";
import { stringifyYaml } from "./yaml-support.mjs";

const summaryPath = ".ai-maintainer/intake-summary.md";
const yesValues = new Set(["yes", "y", "true", "1", "present"]);
const noValues = new Set(["no", "n", "false", "0", "none"]);
const unknownValues = new Set(["unknown", "u", "skip", ""]);

function rel(root, relativePath) {
  return path.join(root, ...relativePath.split("/"));
}

function normalizeChoice(value, fallback = "unknown") {
  const normalized = String(value ?? "").trim().toLowerCase();
  if (!normalized) return fallback;
  if (yesValues.has(normalized)) return "yes";
  if (noValues.has(normalized)) return "no";
  if (unknownValues.has(normalized)) return "unknown";
  return normalized;
}

function yesNo(value, fallback = false) {
  const normalized = normalizeChoice(value, fallback ? "yes" : "no");
  if (normalized === "yes") return true;
  if (normalized === "no") return false;
  return fallback;
}

function evidenceValue(value) {
  const normalized = normalizeChoice(value);
  if (normalized === "yes") return "present";
  if (normalized === "no") return "none";
  return "unknown";
}

function boolDefault(value, detected = false) {
  if (value === true) return "yes";
  if (value === false) return "no";
  if (typeof value === "string" && value !== "auto") return normalizeChoice(value);
  return detected ? "yes" : "unknown";
}

function hasEvidence(value) {
  if (value === true) return "yes";
  if (!value || value === "auto") return "unknown";
  if (typeof value === "string") {
    return ["none", "missing", "unknown", "false", "no"].includes(value.toLowerCase()) ? "no" : "yes";
  }
  return "yes";
}

function projectKind(project, intake) {
  if (intake.profile.derived?.profileId) return intake.profile.derived.profileId;
  if (intake.profile.project?.type && intake.profile.project.type !== "auto") return intake.profile.project.type;
  return intake.profile.derived?.projectType || (project.electron?.detected ? "electron" : "generic");
}

function packageName(project, root) {
  return project.packageJson?.name || path.basename(root);
}

function splitList(value) {
  return String(value || "")
    .split(/[,;\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function localized(lang, en, zh) {
  return lang === "zh-CN" ? zh : en;
}

export function buildWizardQuestions(project, intake, options = {}) {
  const lang = options.lang || "en";
  const typeDefault = projectKind(project, intake);
  const detectedDatabase = Boolean(project.riskSurfaces?.database?.length);
  const detectedCi = Boolean(project.riskSurfaces?.ci?.length);
  const detectedElectron = Boolean(project.electron?.detected);
  const evidence = intake.evidence.evidence || {};
  const deployment = evidence.deployment || {};
  const observability = evidence.observability || {};
  const database = evidence.database || {};
  const hasDeployment = Boolean(intake.profile.derived?.hasDeployment);
  const resolvedProfile = intake.profile.derived?.profile;
  const electronProfileIds = new Set(["electron", "electron-desktop"]);
  const webOrApiProfileIds = new Set(["web", "api", "fullstack", "nextjs-web", "node-api"]);
  const databaseProfileIds = new Set(["database-prisma"]);

  const questions = [
    { id: "project_name", kind: "text", default: intake.profile.project?.name || packageName(project, project.root), prompt: localized(lang, "Project name", "项目名称") },
    { id: "project_type", kind: "choice", choices: profileIds(), default: typeDefault, prompt: localized(lang, "Project profile", "项目规则包") },
    { id: "lifecycle", kind: "choice", choices: ["development", "pre-production", "production", "maintenance"], default: intake.profile.project?.lifecycle || "development", prompt: localized(lang, "Lifecycle stage", "项目阶段") },
    { id: "handles_auth", kind: "yes-no", default: boolDefault(intake.profile.risk?.handles_auth), prompt: localized(lang, "Does it have login, sessions, or user accounts?", "是否有登录、会话或用户账号？") },
    { id: "handles_sensitive_data", kind: "yes-no", default: boolDefault(intake.profile.risk?.handles_sensitive_data), prompt: localized(lang, "Does it handle private or sensitive user data?", "是否处理隐私或敏感用户数据？") },
    { id: "handles_payments", kind: "yes-no", default: boolDefault(intake.profile.risk?.handles_payments), prompt: localized(lang, "Does it handle payments?", "是否处理支付？") },
    { id: "handles_financial_data", kind: "yes-no", default: boolDefault(intake.profile.risk?.handles_financial_data), prompt: localized(lang, "Does it handle financial or reimbursement data?", "是否处理财务、报销或账务数据？") },
    { id: "handles_health_data", kind: "yes-no", default: boolDefault(intake.profile.risk?.handles_health_data), prompt: localized(lang, "Does it handle health or medical data?", "是否处理医疗或健康数据？") },
    { id: "has_user_generated_content", kind: "yes-no", default: boolDefault(intake.profile.risk?.has_user_generated_content), prompt: localized(lang, "Can users create or import content?", "用户是否可以创建、导入或上传内容？") },
    { id: "has_database", kind: "yes-no", default: boolDefault(intake.profile.risk?.has_database, detectedDatabase), prompt: localized(lang, "Does it use a database or durable data store?", "是否使用数据库或持久化数据存储？") },
    { id: "has_deployment", kind: "yes-no", default: boolDefault(intake.profile.risk?.has_deployment, hasDeployment), prompt: localized(lang, "Does it have staging or production deployment?", "是否有测试环境或生产部署？") },
    { id: "deployment_provider", kind: "text", default: deployment.provider || "none", prompt: localized(lang, "Deployment provider or distribution channel", "部署平台或分发渠道") },
    { id: "has_staging", kind: "yes-no", default: boolDefault(deployment.has_staging), when: (answers) => yesNo(answers.has_deployment), prompt: localized(lang, "Is there a staging environment?", "是否有 staging/测试环境？") },
    { id: "has_production", kind: "yes-no", default: boolDefault(deployment.has_production), when: (answers) => yesNo(answers.has_deployment), prompt: localized(lang, "Is there a production environment or public release?", "是否有生产环境或公开发布？") },
    { id: "production_requires_approval", kind: "yes-no", default: boolDefault(deployment.production_requires_approval), when: (answers) => yesNo(answers.has_deployment), prompt: localized(lang, "Does production release require approval?", "生产发布是否需要审批？") },
    { id: "observability_errors", kind: "yes-no", default: hasEvidence(observability.errors), prompt: localized(lang, "Is error monitoring configured, such as Sentry?", "是否配置错误监控，例如 Sentry？") },
    { id: "observability_logs", kind: "yes-no", default: hasEvidence(observability.logs), prompt: localized(lang, "Are production logs available?", "是否有生产日志？") },
    { id: "observability_metrics", kind: "yes-no", default: hasEvidence(observability.metrics), prompt: localized(lang, "Are production metrics available?", "是否有生产指标？") },
    { id: "observability_alerts", kind: "yes-no", default: hasEvidence(observability.alerts), prompt: localized(lang, "Are production alerts configured?", "是否配置生产告警？") },
    { id: "critical_flows", kind: "text", default: "", prompt: localized(lang, "Critical business flows, comma-separated", "核心业务流程，用逗号分隔") },
    { id: "business_flow_tests", kind: "yes-no", default: "unknown", prompt: localized(lang, "Do critical flows already have automated tests?", "核心业务流程是否已有自动化测试？") },
    { id: "flow_side_effects", kind: "text", default: "", prompt: localized(lang, "Side effects for critical flows, comma-separated", "核心流程的副作用，用逗号分隔") },
    { id: "flow_abuse_controls", kind: "text", default: "", prompt: localized(lang, "Abuse controls for critical flows, comma-separated", "核心流程的滥用控制，用逗号分隔") },
    { id: "flow_idempotency_required", kind: "yes-no", default: "unknown", prompt: localized(lang, "Do critical flows require idempotency or duplicate-execution protection?", "核心流程是否需要幂等或防重复执行？") },
    { id: "flow_replay_safe", kind: "yes-no", default: "unknown", prompt: localized(lang, "Are critical flows safe against replay or duplicate submissions?", "核心流程是否能防重放或重复提交？") },
    { id: "data_classes", kind: "text", default: "", prompt: localized(lang, "Sensitive data classes, comma-separated", "敏感数据类型，用逗号分隔") },
    { id: "data_boundary_tests", kind: "yes-no", default: "unknown", prompt: localized(lang, "Do sensitive data boundaries already have tests?", "敏感数据边界是否已有测试？") },
    { id: "authz_resources", kind: "text", default: "", prompt: localized(lang, "Protected resources for authorization, comma-separated", "需要鉴权的资源，用逗号分隔") },
    { id: "authz_tests", kind: "yes-no", default: "unknown", prompt: localized(lang, "Do protected resources already have object-level authorization tests?", "受保护资源是否已有对象级授权测试？") },
    { id: "strict_production", kind: "yes-no", default: "no", prompt: localized(lang, "Should missing production evidence block release?", "缺少生产证据时是否阻断发布？") },

    { id: "electron_ipc", kind: "yes-no", default: detectedElectron ? "yes" : "unknown", when: (answers) => detectedElectron || electronProfileIds.has(answers.project_type), prompt: localized(lang, "Does the Electron app expose IPC APIs?", "Electron 应用是否暴露 IPC API？") },
    { id: "electron_file_access", kind: "yes-no", default: "unknown", when: (answers) => detectedElectron || electronProfileIds.has(answers.project_type), prompt: localized(lang, "Does it read local files selected or provided by users?", "是否读取用户选择或提供的本地文件？") },
    { id: "electron_auto_update", kind: "yes-no", default: "unknown", when: (answers) => detectedElectron || electronProfileIds.has(answers.project_type), prompt: localized(lang, "Does it have an auto-update mechanism?", "是否有自动更新机制？") },
    { id: "electron_signed_updates", kind: "yes-no", default: "unknown", when: (answers) => detectedElectron || electronProfileIds.has(answers.project_type), prompt: localized(lang, "Are updates signed or integrity-verified?", "更新是否签名或做完整性校验？") },

    { id: "public_api", kind: "yes-no", default: "unknown", when: (answers) => webOrApiProfileIds.has(answers.project_type), prompt: localized(lang, "Does it expose public API routes?", "是否暴露公开 API 路由？") },
    { id: "file_uploads", kind: "yes-no", default: "unknown", when: (answers) => webOrApiProfileIds.has(answers.project_type), prompt: localized(lang, "Does it accept file uploads?", "是否接受文件上传？") },
    { id: "admin_roles", kind: "yes-no", default: "unknown", when: (answers) => webOrApiProfileIds.has(answers.project_type), prompt: localized(lang, "Does it have admin or privileged roles?", "是否有管理员或高权限角色？") },
    { id: "cross_origin", kind: "yes-no", default: "unknown", when: (answers) => webOrApiProfileIds.has(answers.project_type), prompt: localized(lang, "Does it allow cross-origin browser access?", "是否允许跨域浏览器访问？") },

    { id: "db_migrations", kind: "yes-no", default: hasEvidence(database.migrations), when: (answers) => yesNo(answers.has_database) || detectedDatabase || databaseProfileIds.has(answers.project_type), prompt: localized(lang, "Are database changes managed by migrations?", "数据库变更是否通过迁移管理？") },
    { id: "db_backup", kind: "yes-no", default: hasEvidence(database.backup_policy), when: (answers) => yesNo(answers.has_database) || detectedDatabase || databaseProfileIds.has(answers.project_type), prompt: localized(lang, "Is there a backup policy before production data changes?", "生产数据变更前是否有备份策略？") },
    { id: "db_rollback", kind: "yes-no", default: hasEvidence(database.rollback_plan), when: (answers) => yesNo(answers.has_database) || detectedDatabase || databaseProfileIds.has(answers.project_type), prompt: localized(lang, "Is there a rollback or forward-fix plan for migrations?", "数据库迁移是否有回滚或 forward-fix 方案？") },
    { id: "db_concurrency", kind: "yes-no", default: "unknown", when: (answers) => yesNo(answers.has_database) || detectedDatabase || databaseProfileIds.has(answers.project_type), prompt: localized(lang, "Can concurrent writes affect correctness?", "并发写入是否可能影响数据正确性？") },
    { id: "db_audit_log", kind: "yes-no", default: "unknown", when: (answers) => yesNo(answers.has_database) || detectedDatabase || databaseProfileIds.has(answers.project_type), prompt: localized(lang, "Is there audit logging for important data changes?", "关键数据变更是否有审计日志？") },
  ];

  const profileQuestions = (resolvedProfile?.wizardQuestions || []).map((question) => ({
    id: question.id,
    kind: question.kind || "yes-no",
    default: question.default || "unknown",
    prompt: localized(lang, question.prompt, question.promptZh || question.prompt),
    profileQuestion: true,
  }));

  return [...questions, ...profileQuestions];
}

function defaultAnswers(questions) {
  return Object.fromEntries(questions.map((question) => [question.id, question.default ?? "unknown"]));
}

async function collectInteractiveAnswers(questions, initialAnswers, options) {
  const input = options.input || process.stdin;
  const output = options.output || process.stdout;
  if (!input.isTTY) {
    throw new Error("init-audit --wizard requires an interactive terminal. Use --dry-run, or let Codex run the AI-assisted intake flow.");
  }

  const rl = readline.createInterface({ input, output });
  const answers = { ...initialAnswers };
  try {
    for (const question of questions) {
      if (question.when && !question.when(answers)) continue;
      const choices = question.kind === "choice" ? ` (${question.choices.join("/")})` : " (yes/no/unknown/skip)";
      const raw = await rl.question(`${question.prompt}${choices} [${answers[question.id]}]: `);
      answers[question.id] = raw.trim() ? raw.trim() : answers[question.id];
    }
  } finally {
    rl.close();
  }
  return answers;
}

function answerLabel(value) {
  const normalized = normalizeChoice(value);
  if (normalized === "yes") return "yes";
  if (normalized === "no") return "no";
  return "unknown";
}

function buildBusinessFlows(answers) {
  const flows = splitList(answers.critical_flows);
  if (!flows.length) return defaultBusinessFlows;
  const sideEffects = splitList(answers.flow_side_effects);
  const abuseControls = splitList(answers.flow_abuse_controls);
  return {
    schema_version: 1,
    business_flows: flows.map((name, index) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `critical-flow-${index + 1}`,
      name,
      criticality: "high",
      expected_behavior: "Maintainer confirmed this flow must not break.",
      side_effects: sideEffects,
      abuse_controls: abuseControls,
      idempotency_required: yesNo(answers.flow_idempotency_required),
      replay_safe: yesNo(answers.flow_replay_safe),
      tests: answerLabel(answers.business_flow_tests) === "yes" ? ["Declare concrete test files here"] : [],
    })),
  };
}

function buildDataBoundaries(answers) {
  const dataClasses = splitList(answers.data_classes);
  if (!dataClasses.length) return defaultDataBoundaries;
  return {
    schema_version: 1,
    data_classes: dataClasses.map((name, index) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `data-class-${index + 1}`,
      sensitivity: "personal",
      fields: [],
      stored_in: ["database"],
      exposed_to: ["self", "admin"],
      may_appear_in_logs: false,
      tests: answerLabel(answers.data_boundary_tests) === "yes" ? ["Declare concrete data-boundary test files here"] : [],
    })),
  };
}

function buildAuthzMatrix(answers) {
  const resources = splitList(answers.authz_resources);
  if (!resources.length) return defaultAuthzMatrix;
  return {
    schema_version: 1,
    roles: ["anonymous", "user", "admin"],
    resources: resources.map((name, index) => ({
      id: name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || `resource-${index + 1}`,
      owner_field: "userId",
      tenant_field: "",
      actions: {
        read: {
          allowed_roles: ["owner", "admin"],
          tests: answerLabel(answers.authz_tests) === "yes" ? ["Declare concrete object-authorization test files here"] : [],
        },
      },
    })),
  };
}

function profileRiskAnswers(intake, answers) {
  const questions = intake.profile.derived?.profile?.wizardQuestions || [];
  return Object.fromEntries(questions.map((question) => [question.riskKey || question.id, yesNo(answers[question.id])]));
}

function buildDocuments(root, project, intake, answers, options = {}) {
  const detectedDatabase = Boolean(project.riskSurfaces?.database?.length);
  const detectedElectron = Boolean(project.electron?.detected);
  const confirmedDatabase = yesNo(answers.has_database, detectedDatabase);
  const confirmedDeployment = yesNo(answers.has_deployment, false);
  const hasProduction = confirmedDeployment && yesNo(answers.has_production, false);
  const selectedProfile = normalizeProfileId(answers.project_type || intake.profile.derived?.profileId || "auto") || "auto";
  const profile = deepMerge(intake.profile, {
    schema_version: 1,
    project: {
      name: answers.project_name || packageName(project, root),
      type: answers.project_type || projectKind(project, intake),
      profile: selectedProfile,
      lifecycle: answers.lifecycle || "development",
      production: hasProduction,
    },
    risk: {
      handles_auth: yesNo(answers.handles_auth),
      handles_sensitive_data: yesNo(answers.handles_sensitive_data),
      handles_payments: yesNo(answers.handles_payments),
      handles_financial_data: yesNo(answers.handles_financial_data),
      handles_health_data: yesNo(answers.handles_health_data),
      has_database: confirmedDatabase,
      has_deployment: confirmedDeployment,
      has_user_generated_content: yesNo(answers.has_user_generated_content),
      has_public_api: yesNo(answers.public_api),
      accepts_file_uploads: yesNo(answers.file_uploads),
      has_admin_roles: yesNo(answers.admin_roles),
      has_cross_origin_access: yesNo(answers.cross_origin),
      electron_ipc: yesNo(answers.electron_ipc, detectedElectron),
      electron_local_file_access: yesNo(answers.electron_file_access),
      electron_auto_update: yesNo(answers.electron_auto_update),
      electron_signed_updates: yesNo(answers.electron_signed_updates),
      database_concurrent_writes: yesNo(answers.db_concurrency),
      database_audit_log: yesNo(answers.db_audit_log),
      ...profileRiskAnswers(intake, answers),
    },
  });

  const evidence = deepMerge(intake.evidence, {
    schema_version: 1,
    evidence: {
      github_actions: project.riskSurfaces?.ci?.length ? true : "auto",
      deployment: {
        provider: answers.deployment_provider || "none",
        has_staging: yesNo(answers.has_staging),
        has_production: hasProduction,
        production_requires_approval: yesNo(answers.production_requires_approval),
      },
      observability: {
        errors: evidenceValue(answers.observability_errors),
        logs: evidenceValue(answers.observability_logs),
        metrics: evidenceValue(answers.observability_metrics),
        alerts: evidenceValue(answers.observability_alerts),
      },
      database: {
        migrations: evidenceValue(answers.db_migrations),
        review_tool: intake.evidence.evidence?.database?.review_tool || "none",
        backup_policy: evidenceValue(answers.db_backup),
        rollback_plan: evidenceValue(answers.db_rollback),
      },
    },
  });

  const riskPolicy = deepMerge(intake.riskPolicy, {
    schema_version: 1,
    production: {
      block_on_coverage_gaps: yesNo(answers.strict_production),
      block_on_user_decisions: yesNo(answers.strict_production),
      require_intake: true,
    },
  });

  const businessFlows = buildBusinessFlows(answers);
  const dataBoundaries = buildDataBoundaries(answers);
  const authzMatrix = buildAuthzMatrix(answers);
  const summary = buildIntakeSummary(root, project, { profile, evidence, dataBoundaries, authzMatrix, businessFlows, riskPolicy }, answers, options);
  const persistedProfile = { ...profile };
  delete persistedProfile.derived;

  return { profile: persistedProfile, evidence, dataBoundaries, authzMatrix, businessFlows, riskPolicy, summary };
}

function detectedSignals(project) {
  return [
    project.packageJson ? "Node package detected" : null,
    project.electron?.detected ? "Electron surface detected" : null,
    project.riskSurfaces?.database?.length ? `Database evidence detected (${project.riskSurfaces.database.slice(0, 3).join(", ")})` : null,
    project.riskSurfaces?.ci?.length ? `CI workflow detected (${project.riskSurfaces.ci.slice(0, 3).join(", ")})` : null,
    project.packageJson?.scripts?.test ? "Test script detected" : null,
    project.packageJson?.scripts?.build ? "Build script detected" : null,
  ].filter(Boolean);
}

function userDecisionItems(project, answers) {
  const items = [];
  const unknownIds = [
    ["observability_errors", "Confirm error monitoring evidence."],
    ["observability_logs", "Confirm production log evidence."],
    ["observability_metrics", "Confirm production metrics evidence."],
    ["observability_alerts", "Confirm production alert evidence."],
    ["business_flow_tests", "Link automated tests to critical business flows."],
  ];
  for (const [id, message] of unknownIds) {
    if (answerLabel(answers[id]) === "unknown") items.push(message);
  }
  if (project.riskSurfaces?.database?.length && answerLabel(answers.has_database) === "no") {
    items.push("Database evidence was detected, but maintainer answered that no database is used.");
  }
  if (splitList(answers.critical_flows).length === 0) {
    items.push("Critical business flows are not declared.");
  }
  return items;
}

export function buildIntakeSummary(root, project, documents, answers, options = {}) {
  const lang = options.lang || "en";
  const profileInfo = documents.profile.derived?.profile || {};
  const confirmed = [
    `Profile: ${documents.profile.project.profile || profileInfo.id || "auto"}`,
    `Project type: ${documents.profile.project.type}`,
    `Lifecycle: ${documents.profile.project.lifecycle}`,
    `Production/public release: ${documents.profile.project.production ? "yes" : "no"}`,
    `Auth/accounts: ${documents.profile.risk.handles_auth ? "yes" : "no"}`,
    `Sensitive data: ${documents.profile.risk.handles_sensitive_data ? "yes" : "no"}`,
    `Database: ${documents.profile.risk.has_database ? "yes" : "no"}`,
    `Deployment provider: ${documents.evidence.evidence.deployment.provider}`,
  ];
  const policy = documents.riskPolicy.production || {};
  const decisions = userDecisionItems(project, answers);
  const signals = detectedSignals(project);
  const riskFocus = profileInfo.riskFocus || documents.profile.derived?.profileRiskFocus || [];
  const title = localized(lang, "Project Intake Summary", "项目画像摘要");
  const confirmedTitle = localized(lang, "Maintainer Confirmed", "用户已确认");
  const inferredTitle = localized(lang, "AI-Inferred Signals", "AI 推断信号");
  const policyTitle = localized(lang, "Release Policy", "发布策略");
  const decisionsTitle = localized(lang, "User Decisions Still Needed", "仍需用户确认");

  return [
    `# ${title}`,
    "",
    `Root: ${root}`,
    "",
    `## ${confirmedTitle}`,
    ...confirmed.map((item) => `- ${item}`),
    "",
    `## ${inferredTitle}`,
    ...(signals.length ? signals.map((item) => `- ${item}`) : ["- No strong local signals detected."]),
    "",
    "## Profile Risk Focus",
    ...(riskFocus.length ? riskFocus.map((item) => `- ${item}`) : ["- No profile-specific risk focus selected."]),
    "",
    `## ${policyTitle}`,
    `- Block on coverage gaps: ${Boolean(policy.block_on_coverage_gaps)}`,
    `- Block on user decisions: ${Boolean(policy.block_on_user_decisions)}`,
    `- Require intake before production review: ${Boolean(policy.require_intake)}`,
    "",
    `## ${decisionsTitle}`,
    ...(decisions.length ? decisions.map((item) => `- ${item}`) : ["- None"]),
    "",
    "<!-- Generated by ai-project-maintainer init-audit --wizard. Do not store secrets, tokens, DSNs, or passwords here. -->",
  ].join("\n");
}

function writeYaml(root, relativePath, value, result) {
  const full = rel(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const existed = fs.existsSync(full);
  fs.writeFileSync(full, stringifyYaml(value));
  result[existed ? "updated" : "created"].push(relativePath);
}

function writeText(root, relativePath, value, result) {
  const full = rel(root, relativePath);
  fs.mkdirSync(path.dirname(full), { recursive: true });
  const existed = fs.existsSync(full);
  fs.writeFileSync(full, value);
  result[existed ? "updated" : "created"].push(relativePath);
}

export function planIntakeWizard(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const project = detectProject(root);
  const intake = loadIntake(root, project, { profile: options.profile });
  const questions = buildWizardQuestions(project, intake, { lang: options.lang });
  const answers = { ...defaultAnswers(questions), ...(options.answers || {}) };
  const documents = buildDocuments(root, project, intake, answers, options);
  const result = {
    root,
    dryRun: Boolean(options.dryRun),
    language: options.lang || "en",
    questionCount: questions.filter((question) => !question.when || question.when(answers)).length,
    answers,
    summary: documents.summary,
  };
  if (options.includeDocuments) result.documents = documents;
  return result;
}

export async function runIntakeWizard(projectRoot, options = {}) {
  const root = path.resolve(projectRoot || process.cwd());
  const project = detectProject(root);
  const intake = loadIntake(root, project, { profile: options.profile });
  const questions = buildWizardQuestions(project, intake, { lang: options.lang });
  const initialAnswers = { ...defaultAnswers(questions), ...(options.answers || {}) };
  const answers = options.dryRun || options.interactive === false
    ? initialAnswers
    : await collectInteractiveAnswers(questions, initialAnswers, options);
  const documents = buildDocuments(root, project, intake, answers, options);
  const result = {
    root,
    dryRun: Boolean(options.dryRun),
    language: options.lang || "en",
    questionCount: questions.filter((question) => !question.when || question.when(answers)).length,
    created: [],
    updated: [],
    answers,
    summary: documents.summary,
  };

  if (options.dryRun) return result;

  writeYaml(root, ".ai-maintainer/project-profile.yml", documents.profile, result);
  writeYaml(root, ".ai-maintainer/evidence-sources.yml", documents.evidence, result);
  writeYaml(root, ".ai-maintainer/data-boundaries.yml", documents.dataBoundaries, result);
  writeYaml(root, ".ai-maintainer/authz-matrix.yml", documents.authzMatrix, result);
  writeYaml(root, ".ai-maintainer/business-flows.yml", documents.businessFlows, result);
  writeYaml(root, ".ai-maintainer/risk-policy.yml", documents.riskPolicy, result);
  writeText(root, summaryPath, documents.summary, result);
  return result;
}
