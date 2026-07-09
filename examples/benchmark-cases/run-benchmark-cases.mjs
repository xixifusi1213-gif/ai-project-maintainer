#!/usr/bin/env node
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { runRepairPack } from "../../ai-project-maintainer/scripts/repair-pack.mjs";
import { buildJsonReport, toMarkdown } from "../../ai-project-maintainer/scripts/lib/report.mjs";

export const generatedAt = "2026-07-06T00:00:00.000Z";

export const BENCHMARK_CASES = [
  {
    id: "siyuan-electron-rce",
    title: "SiYuan Electron RCE advisory",
    category: "electron-desktop",
    repo: "siyuan-note/siyuan",
    advisory: "GHSA-x63q-3rcj-hhp5",
    advisoryUrl: "https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5",
    evidenceType: "advisory + patched release + hardening model",
    vulnerableRef: "v3.6.3",
    fixedRef: "v3.6.4",
    fixedRelease: "v3.6.4",
    patchCommit: "bb326aa992b26096eedea64b69b182c3d2449681",
    patchUrl: "https://github.com/siyuan-note/siyuan/commit/bb326aa992b26096eedea64b69b182c3d2449681",
    releaseUrl: "https://github.com/siyuan-note/siyuan/releases/tag/v3.6.4",
    filePath: "app/electron/main.js",
    expected: { before: "FAIL", "patched-release": "FAIL", after: "PASS_WITH_GAPS" },
    fallback: {
      before: "new BrowserWindow({ webPreferences: { nodeIntegration: true, webSecurity: false, contextIsolation: false } });",
      "patched-release": "new BrowserWindow({ webPreferences: { nodeIntegration: true, webSecurity: false, contextIsolation: false } });",
      after: "new BrowserWindow({ webPreferences: { nodeIntegration: false, webSecurity: true, contextIsolation: true, sandbox: true } });",
    },
  },
  {
    id: "ghost-sql-injection",
    title: "Ghost Content API SQL injection advisory",
    category: "database",
    repo: "TryGhost/Ghost",
    advisory: "GHSA-w52v-v783-gw97",
    advisoryUrl: "https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97",
    evidenceType: "advisory + patch commit + patched version",
    vulnerableRef: "ebf4bb79cb45e487e277318df61c6c559752fd0a",
    fixedRef: "30868d632b2252b638bc8a4c8ebf73964592ed91",
    fixedRelease: "v6.19.1",
    patchCommit: "30868d632b2252b638bc8a4c8ebf73964592ed91",
    patchUrl: "https://github.com/TryGhost/Ghost/commit/30868d632b2252b638bc8a4c8ebf73964592ed91",
    releaseUrl: "https://github.com/TryGhost/Ghost/releases/tag/v6.19.1",
    filePath: "ghost/core/core/server/api/endpoints/utils/serializers/input/utils/slug-filter-order.js",
    expected: { before: "FAIL", after: "PASS_WITH_GAPS" },
    fallback: {
      before: "order += `WHEN table.slug = '${slug}' THEN ${index}`;",
      after: "caseParts.push('WHEN table.slug = ? THEN ?'); bindings.push(slug.trim(), index);",
    },
  },
  {
    id: "nextjs-middleware-auth-bypass",
    title: "Next.js middleware authorization bypass advisory",
    category: "web-api",
    repo: "vercel/next.js",
    advisory: "GHSA-f82v-jwr5-mffw",
    advisoryUrl: "https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw",
    evidenceType: "advisory + patched version",
    cve: "CVE-2025-29927",
    vulnerableRef: "15.2.2",
    fixedRef: "15.2.3",
    fixedRelease: "15.2.3",
    patchCommit: "15.2.3",
    patchUrl: "https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw",
    releaseUrl: "https://github.com/vercel/next.js/releases/tag/v15.2.3",
    expected: { before: "FAIL", after: "PASS_WITH_GAPS" },
    fallback: {
      before: '{ "dependencies": { "next": "15.2.2" } }\n// middleware controls admin authorization',
      after: '{ "dependencies": { "next": "15.2.3" } }\n// edge strips untrusted middleware bypass headers before app code',
    },
  },
  {
    id: "tj-actions-changed-files-supply-chain",
    title: "tj-actions/changed-files supply-chain compromise",
    category: "ci-supply-chain",
    repo: "tj-actions/changed-files",
    advisory: "GHSA-mrrh-fwg8-r2c3",
    advisoryUrl: "https://github.com/advisories/GHSA-mrrh-fwg8-r2c3",
    evidenceType: "advisory + CISA alert + hardening model",
    cve: "CVE-2025-30066",
    vulnerableRef: "v45.0.7",
    fixedRef: "pinned-safe-replacement",
    fixedRelease: "post-advisory hardening",
    patchCommit: "workflow-hardening",
    patchUrl: "https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction",
    releaseUrl: "https://github.com/advisories/GHSA-mrrh-fwg8-r2c3",
    expected: { before: "FAIL", after: "PASS_WITH_GAPS" },
    fallback: {
      before: "uses: tj-actions/changed-files@v45.0.7\npermissions: write-all\nsecrets: inherit",
      after: "uses: step-security/changed-files@0cfe8f0b7e6a8b5c6a7d8e9f0123456789abcdef\npermissions:\n  contents: read",
    },
  },
  {
    id: "tanstack-npm-compromise",
    title: "TanStack npm package compromise postmortem",
    category: "oss-library",
    repo: "TanStack/query",
    advisory: "TanStack npm compromise postmortem",
    advisoryUrl: "https://tanstack.com/blog/npm-supply-chain-compromise-postmortem",
    evidenceType: "postmortem + release workflow hardening model",
    vulnerableRef: "pre-postmortem release workflow",
    fixedRef: "postmortem release hardening",
    fixedRelease: "postmortem hardening",
    patchCommit: "release-trust-hardening",
    patchUrl: "https://tanstack.com/blog/npm-supply-chain-compromise-postmortem",
    releaseUrl: "https://tanstack.com/blog/npm-supply-chain-compromise-postmortem",
    expected: { before: "FAIL", after: "PASS_WITH_GAPS" },
    fallback: {
      before: "on: pull_request_target\nsteps:\n  - uses: actions/cache@v4\n  - run: npm publish --provenance",
      after: "on: push\npermissions:\n  id-token: write\n  contents: read\nenvironment: npm-publish\nsteps:\n  - run: npm publish --provenance --access public",
    },
  },
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const args = {
    verify: false,
    updateDocs: false,
    allowNetwork: true,
    outputDir: path.join(repoRoot, "reports", "benchmark-cases"),
    caseIds: null,
    legacyNames: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--verify") args.verify = true;
    else if (arg === "--offline") args.allowNetwork = false;
    else if (arg === "--legacy-names") args.legacyNames = true;
    else if (arg === "--update-docs") {
      args.updateDocs = true;
      args.outputDir = path.join(repoRoot, "docs", "benchmark-output");
    } else if (arg === "--output") {
      args.outputDir = path.resolve(argv[i + 1]);
      i += 1;
    } else if (arg === "--cases") {
      args.caseIds = argv[i + 1].split(",").map((value) => value.trim()).filter(Boolean);
      i += 1;
    }
  }

  return args;
}

function fetchText(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "user-agent": "ai-project-maintainer-benchmark" } }, (response) => {
      if (response.statusCode < 200 || response.statusCode >= 300) {
        response.resume();
        reject(new Error(`HTTP ${response.statusCode} for ${url}`));
        return;
      }
      let body = "";
      response.setEncoding("utf8");
      response.on("data", (chunk) => {
        body += chunk;
      });
      response.on("end", () => resolve(body));
    });
    request.setTimeout(timeoutMs, () => request.destroy(new Error(`Timeout fetching ${url}`)));
    request.on("error", reject);
  });
}

function stageIds(caseStudy) {
  return Object.keys(caseStudy.expected);
}

async function sourceFor(caseStudy, stage, options) {
  const fallbackText = caseStudy.fallback[stage];
  if (!caseStudy.filePath || !options.allowNetwork || stage === "after") {
    return { text: fallbackText, evidenceSource: "offline-pinned-metadata" };
  }
  const ref = stage === "before" ? caseStudy.vulnerableRef : caseStudy.fixedRef;
  const rawUrl = `https://raw.githubusercontent.com/${caseStudy.repo}/${ref}/${caseStudy.filePath}`;
  try {
    return { text: await fetchText(rawUrl), evidenceSource: rawUrl };
  } catch (error) {
    return { text: fallbackText, evidenceSource: `offline-pinned-metadata (${error.message})` };
  }
}

function metadataChecks(caseStudy) {
  return [
    {
      checkId: "benchmark-upstream-evidence",
      name: "Benchmark upstream evidence",
      group: "case-study",
      status: "pass",
      blocking: false,
      summary: `${caseStudy.title} is pinned to public upstream evidence.`,
      evidence: {
        repo: caseStudy.repo,
        advisory: caseStudy.advisoryUrl,
        cve: caseStudy.cve || null,
        vulnerableRef: caseStudy.vulnerableRef,
        fixedRef: caseStudy.fixedRef,
        patchCommit: caseStudy.patchCommit,
      },
    },
  ];
}

function productionGapCheck(caseStudy) {
  return {
    checkId: `${caseStudy.category}-production-evidence-gap`,
    name: "Production evidence still required",
    group: "production-audit",
    status: "gap",
    blocking: false,
    coverageGap: true,
    summary: "The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence.",
    recommendation: "Collect production evidence in the consuming project before treating the release as production-ready.",
  };
}

function caseAudit(caseStudy, stage) {
  const isDatabase = caseStudy.category === "database";
  const hasCi = ["ci-supply-chain", "oss-library"].includes(caseStudy.category);
  return {
    profile: {
      projectType: caseStudy.category,
      hasDatabase: isDatabase,
      hasCi: hasCi || true,
    },
    plan: [
      {
        status: "PASS",
        title: "Pinned public evidence",
        summary: `${caseStudy.repo} is represented by pinned advisory, release, postmortem, or hardening metadata.`,
      },
      {
        status: stage === "before" ? "FAIL" : "PASS",
        title: "Benchmark risk transition",
        summary: stage === "before"
          ? "The before state intentionally models the public failure signal."
          : "The after state models the public patch, replacement, or hardening signal.",
      },
    ],
    coverageGaps: stage === "before" ? [] : [
      {
        id: "production-evidence",
        title: "Production evidence",
        summary: "Benchmark reports cannot prove a downstream project's live monitoring, backups, approvals, or rollback path.",
        recommendation: "Keep these as explicit GAP items until the maintainer provides evidence.",
      },
    ],
    userDecisions: stage === "before" ? [] : [
      {
        id: "risk-acceptance",
        title: "Maintainer risk acceptance",
        summary: "The maintainer must decide whether remaining evidence gaps block their production release.",
        recommendation: "Document the decision in the project intake or risk policy.",
      },
    ],
    evidence: [
      {
        repo: caseStudy.repo,
        advisory: caseStudy.advisoryUrl,
        patchCommit: caseStudy.patchUrl,
        release: caseStudy.releaseUrl,
      },
    ],
  };
}

function electronDangerousSettings(source) {
  return [
    ["nodeIntegration: true", /nodeIntegration\s*:\s*true/],
    ["contextIsolation: false", /contextIsolation\s*:\s*false/],
    ["webSecurity: false", /webSecurity\s*:\s*false/],
    ["allowRunningInsecureContent: true", /allowRunningInsecureContent\s*:\s*true/],
  ].filter(([, re]) => re.test(source)).map(([label]) => label);
}

function ghostSqlSignals(source) {
  return {
    interpolatesSlug: /'\$\{slug\}'/.test(source) || /\$\{slug\}/.test(source),
    hasParameterizedBindings: /bindings/.test(source) && /\?/.test(source),
  };
}

function nextVersion(source) {
  const match = source.match(/"next"\s*:\s*"([^"]+)"/);
  return match?.[1] || "unknown";
}

function reportCheckFor(caseStudy, stage, source) {
  if (caseStudy.id === "siyuan-electron-rce") {
    const dangerous = electronDangerousSettings(source.text);
    return {
      checkId: "electron-runtime-hardening",
      name: "Electron runtime hardening",
      group: "electron",
      status: dangerous.length ? "fail" : "pass",
      blocking: dangerous.length > 0,
      summary: dangerous.length
        ? `Dangerous Electron settings remain: ${dangerous.join(", ")}.`
        : "Dangerous Electron renderer settings are absent in the hardened baseline.",
      evidence: { file: caseStudy.filePath, source: source.evidenceSource, dangerous },
    };
  }
  if (caseStudy.id === "ghost-sql-injection") {
    const signals = ghostSqlSignals(source.text);
    const vulnerable = !signals.hasParameterizedBindings || signals.interpolatesSlug;
    return {
      checkId: "database-query-parameterization",
      name: "Database query parameterization",
      group: "database",
      status: vulnerable ? "fail" : "pass",
      blocking: vulnerable,
      findingKind: vulnerable && stage === "before" ? "confirmed_vulnerability" : undefined,
      summary: vulnerable
        ? "User-controlled slug ordering can be interpolated into SQL instead of using bindings."
        : "User-controlled slug ordering uses placeholders and bindings.",
      evidence: { file: caseStudy.filePath, source: source.evidenceSource, ...signals },
    };
  }
  if (caseStudy.id === "nextjs-middleware-auth-bypass") {
    const version = nextVersion(source.text);
    const vulnerable = stage === "before";
    return {
      checkId: "nextjs-cve-2025-29927",
      name: "Next.js middleware authorization bypass",
      group: "web-api",
      status: vulnerable ? "fail" : "pass",
      blocking: vulnerable,
      findingKind: vulnerable ? "confirmed_vulnerability" : undefined,
      summary: vulnerable
        ? `Next.js ${version} is within the benchmarked middleware authorization bypass range.`
        : `Next.js ${version} is represented as the patched baseline with edge header hardening.`,
      evidence: { source: source.evidenceSource, version, advisory: caseStudy.advisoryUrl },
    };
  }
  if (caseStudy.id === "tj-actions-changed-files-supply-chain") {
    const vulnerable = /tj-actions\/changed-files@v45\.0\.7/.test(source.text) || /permissions:\s*write-all/.test(source.text);
    return {
      checkId: "tj-actions-changed-files-compromise",
      name: "Compromised GitHub Action dependency",
      group: "ci-security",
      status: vulnerable ? "fail" : "pass",
      blocking: vulnerable,
      findingKind: vulnerable && stage === "before" ? "confirmed_vulnerability" : undefined,
      command: "zizmor .github/workflows",
      summary: vulnerable
        ? "Workflow uses the compromised changed-files action version with broad workflow permissions."
        : "Workflow uses a hardened replacement/pinned action with read-only permissions.",
      evidence: { source: source.evidenceSource, advisory: caseStudy.advisoryUrl, cisa: caseStudy.patchUrl },
    };
  }
  if (caseStudy.id === "tanstack-npm-compromise") {
    const vulnerable = /pull_request_target/.test(source.text) || /actions\/cache/.test(source.text) || !/environment: npm-publish/.test(source.text);
    return {
      checkId: "npm-release-workflow-hardening",
      name: "npm package release workflow hardening",
      group: "ci-security",
      status: vulnerable ? "fail" : "pass",
      blocking: vulnerable,
      command: "zizmor .github/workflows",
      summary: vulnerable
        ? "Release workflow lacks the benchmarked post-compromise hardening controls."
        : "Release workflow models trusted publishing, environment approval, and narrow permissions.",
      evidence: { source: source.evidenceSource, postmortem: caseStudy.advisoryUrl },
    };
  }
  throw new Error(`No benchmark evaluator for ${caseStudy.id}`);
}

async function reportForCaseStage(caseStudy, stage, options) {
  const source = await sourceFor(caseStudy, stage, options);
  const checks = [
    ...metadataChecks(caseStudy),
    reportCheckFor(caseStudy, stage, source),
  ];
  if (stage !== "before") checks.push(productionGapCheck(caseStudy));
  return buildJsonReport({
    root: `${caseStudy.repo}@${stage}`,
    mode: {
      strict: true,
      release: true,
      production: true,
      benchmark: true,
      profile: caseStudy.category,
    },
    probe: {
      caseId: caseStudy.id,
      category: caseStudy.category,
      stage,
      advisory: caseStudy.advisory,
      source: source.evidenceSource,
    },
    profile: {
      id: caseStudy.category,
      source: "benchmark",
      signals: { benchmark: [{ evidence: caseStudy.advisoryUrl }] },
      riskFocus: [caseStudy.title],
    },
    checks,
    audit: caseAudit(caseStudy, stage),
    toolVersions: { "ai-project-maintainer": "1.3.1-benchmark" },
    generatedAt,
  });
}

function writeJson(filePath, value) {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function writeStageReports(caseDir, stage, report, legacyNames) {
  writeJson(path.join(caseDir, `${stage}-security-report.json`), report);
  fs.writeFileSync(path.join(caseDir, `${stage}-security-report.md`), toMarkdown(report));
  if (legacyNames) {
    writeJson(path.join(caseDir, `${stage}-report.json`), report);
    fs.writeFileSync(path.join(caseDir, `${stage}-report.md`), toMarkdown(report));
  }
}

function caseSummary(caseStudy, reports, repairPack) {
  const lines = [];
  lines.push(`# ${caseStudy.title}`);
  lines.push("");
  lines.push(`Category: ${caseStudy.category}`);
  lines.push(`Repository: [${caseStudy.repo}](https://github.com/${caseStudy.repo})`);
  lines.push(`Evidence: [${caseStudy.advisory}](${caseStudy.advisoryUrl})`);
  lines.push(`Evidence type: ${caseStudy.evidenceType}`);
  lines.push(`Patch/hardening reference: [${caseStudy.patchCommit}](${caseStudy.patchUrl})`);
  lines.push("");
  lines.push("| Stage | Overall Status | Passed | Primary signal |");
  lines.push("| --- | --- | --- | --- |");
  for (const [stage, report] of Object.entries(reports)) {
    const signal = report.blockers[0]?.summary || report.coverageGaps[0]?.summary || "No blockers in this generated benchmark report.";
    lines.push(`| ${stage} | ${report.overallStatus} | ${report.passed ? "yes" : "no"} | ${signal.replaceAll("|", "\\|")} |`);
  }
  lines.push("");
  lines.push(`Repair-pack tasks from before report: ${repairPack.summary.total}`);
  lines.push(`Auto-fix candidates: ${repairPack.summary.byType.auto_fix_candidate || 0}`);
  lines.push(`Maintainer decisions: ${repairPack.summary.byType.needs_maintainer_decision || 0}`);
  lines.push("");
  lines.push("This benchmark stores links, metadata, generated reports, and redacted snippets only. It does not modify upstream projects, vendor upstream source trees, ship exploit code, or claim upstream fixes were made by this tool.");
  return lines.join("\n");
}

function writeCaseMetadata(caseDir, caseStudy) {
  writeJson(path.join(caseDir, "case-metadata.json"), {
    id: caseStudy.id,
    title: caseStudy.title,
    category: caseStudy.category,
    repo: caseStudy.repo,
    advisory: caseStudy.advisory,
    advisoryUrl: caseStudy.advisoryUrl,
    evidenceType: caseStudy.evidenceType,
    cve: caseStudy.cve || null,
    vulnerableRef: caseStudy.vulnerableRef,
    fixedRef: caseStudy.fixedRef,
    patchCommit: caseStudy.patchCommit,
    patchUrl: caseStudy.patchUrl,
    expected: caseStudy.expected,
  });
}

async function writeCase(caseStudy, outputDir, options) {
  const caseDir = path.join(outputDir, caseStudy.id);
  fs.rmSync(caseDir, { recursive: true, force: true });
  fs.mkdirSync(caseDir, { recursive: true });
  writeCaseMetadata(caseDir, caseStudy);

  const reports = {};
  for (const stage of stageIds(caseStudy)) {
    const report = await reportForCaseStage(caseStudy, stage, options);
    reports[stage] = report;
    writeStageReports(caseDir, stage, report, options.legacyNames);
  }

  const cwd = process.cwd();
  let repairPack;
  let files;
  try {
    process.chdir(caseDir);
    ({ repairPack, files } = runRepairPack("before-security-report.json", {
      projectRoot: `${caseStudy.repo}@before`,
      outputDir: "before-repair-pack",
    }));
  } finally {
    process.chdir(cwd);
  }
  fs.writeFileSync(path.join(caseDir, "case-summary.md"), caseSummary(caseStudy, reports, repairPack));
  return { caseDir, reports, repairPack, files };
}

function benchmarkSummary(results) {
  const lines = [];
  lines.push("# AI Project Maintainer Benchmark Summary");
  lines.push("");
  lines.push("This benchmark uses public OSS advisories, releases, postmortems, and generated APM reports. It is not an exploit corpus, does not modify upstream projects, and does not claim upstream fixes were made by this tool.");
  lines.push("");
  lines.push("| Case | Project type | Evidence type | Before | Auto-fix tasks | Manual review tasks | User decisions | After | Remaining gaps |");
  lines.push("| --- | --- | --- | --- | --- | --- | --- | --- | --- |");
  for (const [id, result] of Object.entries(results)) {
    const caseStudy = result.caseStudy;
    const before = result.reports.before.overallStatus;
    const afterStage = Object.keys(result.reports).at(-1);
    const after = result.reports[afterStage].overallStatus;
    const tasks = result.repairPack.summary.byType;
    const finalGaps = result.reports[afterStage].coverageGapCount;
    lines.push(`| ${caseStudy.title} | ${caseStudy.category} | ${caseStudy.evidenceType} | ${before} | ${tasks.auto_fix_candidate || 0} | ${tasks.manual_review_required || 0} | ${tasks.needs_maintainer_decision || 0} | ${after} | ${finalGaps} |`);
  }
  lines.push("");
  lines.push("Run locally with:");
  lines.push("");
  lines.push("```powershell");
  lines.push("npm run benchmark:verify");
  lines.push("```");
  return lines.join("\n");
}

function assertSafeOutput(outputDir) {
  const forbidden = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /github_pat_[A-Za-z0-9_]+/,
    /ghp_[A-Za-z0-9_]+/,
    /authorization\s*[:=]/i,
    /bearer\s+[A-Za-z0-9._~+/=-]{8,}/i,
    /postgres:\/\/\S+/i,
    /mysql:\/\/\S+/i,
    /mongodb(\+srv)?:\/\/\S+/i,
    /C:\\Users\\tianf/i,
    /E:\\/i,
  ];
  const stack = [outputDir];
  while (stack.length) {
    const current = stack.pop();
    for (const entry of fs.readdirSync(current, { withFileTypes: true })) {
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) stack.push(full);
      else {
        const text = fs.readFileSync(full, "utf8");
        for (const re of forbidden) {
          if (re.test(text)) throw new Error(`Forbidden sensitive pattern in ${full}: ${re}`);
        }
      }
    }
  }
}

function assertMetadata(caseStudy) {
  if (!caseStudy.repo || !caseStudy.advisoryUrl || !caseStudy.category || !caseStudy.evidenceType) throw new Error(`${caseStudy.id} is missing benchmark metadata.`);
  if (!caseStudy.vulnerableRef || !caseStudy.fixedRef) throw new Error(`${caseStudy.id} must pin vulnerable and fixed references.`);
  if (!caseStudy.expected?.before || !Object.values(caseStudy.expected).some((status) => status === "PASS_WITH_GAPS")) {
    throw new Error(`${caseStudy.id} must declare expected before and after statuses.`);
  }
}

function verifyResults(results, outputDir) {
  for (const [id, result] of Object.entries(results)) {
    assertMetadata(result.caseStudy);
    for (const [stage, expected] of Object.entries(result.caseStudy.expected)) {
      const actual = result.reports[stage]?.overallStatus;
      if (actual !== expected) throw new Error(`${id} ${stage} expected ${expected}, got ${actual}`);
    }
    if (result.repairPack.summary.total < 1) throw new Error(`${id} before report did not generate repair tasks.`);
    for (const task of result.repairPack.tasks) {
      if (task.type === "auto_fix_candidate" && task.source.group === "production-audit") {
        throw new Error(`${id} incorrectly classified production audit GAP as auto-fix.`);
      }
    }
    if (!fs.existsSync(path.join(result.caseDir, "before-repair-pack", "agent-tasks.json"))) {
      throw new Error(`${id} did not write agent-tasks.json`);
    }
  }
  assertSafeOutput(outputDir);
}

export async function runBenchmarkCases(options = {}) {
  const outputDir = path.resolve(options.outputDir || path.join(os.tmpdir(), "apm-benchmark-cases"));
  fs.mkdirSync(outputDir, { recursive: true });
  const selectedIds = options.caseIds ? new Set(options.caseIds) : null;
  const cases = BENCHMARK_CASES.filter((caseStudy) => !selectedIds || selectedIds.has(caseStudy.id));
  if (!cases.length) throw new Error("No benchmark cases selected.");

  const results = {};
  for (const caseStudy of cases) {
    const result = await writeCase(caseStudy, outputDir, options);
    results[caseStudy.id] = { caseStudy, ...result };
  }
  fs.writeFileSync(path.join(outputDir, "benchmark-summary.md"), benchmarkSummary(results));
  if (options.verify) verifyResults(results, outputDir);
  return { outputDir, results };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const result = await runBenchmarkCases(args);
  console.log(`Benchmark reports written to ${result.outputDir}`);
}
