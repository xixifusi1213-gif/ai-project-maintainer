#!/usr/bin/env node
import fs from "node:fs";
import https from "node:https";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { buildJsonReport, toMarkdown } from "../../ai-project-maintainer/scripts/lib/report.mjs";

const generatedAt = "2026-06-30T00:00:00.000Z";

export const CASE_STUDIES = [
  {
    id: "siyuan-electron-rce",
    title: "SiYuan Electron RCE advisory",
    type: "electron",
    repo: "siyuan-note/siyuan",
    advisory: "GHSA-x63q-3rcj-hhp5",
    advisoryUrl: "https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5",
    vulnerableRef: "v3.6.3",
    fixedRef: "v3.6.4",
    patchCommit: "bb326aa992b26096eedea64b69b182c3d2449681",
    patchUrl: "https://github.com/siyuan-note/siyuan/commit/bb326aa992b26096eedea64b69b182c3d2449681",
    releaseUrl: "https://github.com/siyuan-note/siyuan/releases/tag/v3.6.4",
    filePath: "app/electron/main.js",
    fallback: {
      vulnerable: "new BrowserWindow({ webPreferences: { nodeIntegration: true, webSecurity: false, contextIsolation: false } });",
      fixed: "new BrowserWindow({ webPreferences: { nodeIntegration: true, webSecurity: false, contextIsolation: false } });",
      hardened: "new BrowserWindow({ webPreferences: { nodeIntegration: false, webSecurity: true, contextIsolation: true, sandbox: true } });",
    },
  },
  {
    id: "ghost-sql-injection",
    title: "Ghost Content API SQL injection advisory",
    type: "web-api-db",
    repo: "TryGhost/Ghost",
    advisory: "GHSA-w52v-v783-gw97",
    advisoryUrl: "https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97",
    vulnerableRef: "ebf4bb79cb45e487e277318df61c6c559752fd0a",
    fixedRef: "30868d632b2252b638bc8a4c8ebf73964592ed91",
    fixedRelease: "v6.19.1",
    patchCommit: "30868d632b2252b638bc8a4c8ebf73964592ed91",
    patchUrl: "https://github.com/TryGhost/Ghost/commit/30868d632b2252b638bc8a4c8ebf73964592ed91",
    releaseUrl: "https://github.com/TryGhost/Ghost/releases/tag/v6.19.1",
    filePath: "ghost/core/core/server/api/endpoints/utils/serializers/input/utils/slug-filter-order.js",
    fallback: {
      vulnerable: "order += `WHEN table.slug = '${slug}' THEN ${index}`;",
      fixed: "caseParts.push('WHEN table.slug = ? THEN ?'); bindings.push(slug.trim(), index);",
    },
  },
];

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");

function parseArgs(argv) {
  const args = {
    verify: false,
    updateDocs: false,
    allowNetwork: true,
    outputDir: path.join(repoRoot, "reports", "oss-case-studies"),
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === "--verify") args.verify = true;
    else if (arg === "--update-docs") {
      args.updateDocs = true;
      args.outputDir = path.join(repoRoot, "docs", "cases");
    } else if (arg === "--offline") args.allowNetwork = false;
    else if (arg === "--output") {
      args.outputDir = path.resolve(argv[i + 1]);
      i += 1;
    }
  }

  return args;
}

function fetchText(url, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const request = https.get(url, { headers: { "user-agent": "ai-project-maintainer-case-study" } }, (response) => {
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

    request.setTimeout(timeoutMs, () => {
      request.destroy(new Error(`Timeout fetching ${url}`));
    });
    request.on("error", reject);
  });
}

async function sourceFor(caseStudy, stage, options) {
  const ref = stage === "before" ? caseStudy.vulnerableRef : caseStudy.fixedRef;
  const fallbackKey = stage === "after-hardened" ? "hardened" : stage === "before" ? "vulnerable" : "fixed";
  const fallbackText = caseStudy.fallback[fallbackKey];

  if (!options.allowNetwork || stage === "after-hardened") {
    return { text: fallbackText, evidenceSource: stage === "after-hardened" ? "apm-hardening-template" : "offline-pinned-metadata" };
  }

  const rawUrl = `https://raw.githubusercontent.com/${caseStudy.repo}/${ref}/${caseStudy.filePath}`;
  try {
    return { text: await fetchText(rawUrl), evidenceSource: rawUrl };
  } catch (error) {
    return { text: fallbackText, evidenceSource: `offline-pinned-metadata (${error.message})` };
  }
}

function electronDangerousSettings(source) {
  const findings = [];
  for (const [label, re] of [
    ["nodeIntegration: true", /nodeIntegration\s*:\s*true/],
    ["contextIsolation: false", /contextIsolation\s*:\s*false/],
    ["webSecurity: false", /webSecurity\s*:\s*false/],
    ["allowRunningInsecureContent: true", /allowRunningInsecureContent\s*:\s*true/],
  ]) {
    if (re.test(source)) findings.push(label);
  }
  return findings;
}

function ghostSqlSignals(source) {
  return {
    interpolatesSlug: /'\$\{slug\}'/.test(source) || /slug'\s*\+/.test(source) || /\$\{slug\}/.test(source),
    hasParameterizedBindings: /bindings/.test(source) && /\?/.test(source),
  };
}

function caseAudit(caseStudy, stage) {
  const isDatabase = caseStudy.type === "web-api-db";
  const isElectron = caseStudy.type === "electron";
  const hasGaps = stage !== "before";

  return {
    profile: {
      projectType: caseStudy.type,
      hasDatabase: isDatabase,
      hasCi: true,
    },
    plan: [
      {
        status: "PASS",
        title: "Pinned OSS evidence",
        summary: `${caseStudy.repo} is referenced by advisory, release, and patch commit metadata.`,
      },
      {
        status: isElectron ? "USER_DECISION" : "PASS",
        title: isElectron ? "Electron hardening boundary" : "Database query boundary",
        summary: isElectron
          ? "Official advisory fixes must still be reviewed against Electron runtime hardening."
          : "The patched commit moves user-controlled ordering input behind query bindings.",
      },
    ],
    coverageGaps: hasGaps
      ? [
          {
            id: "production-monitoring",
            title: "Production monitoring evidence",
            summary: "The OSS case verifies code-level remediation, not the maintainer's deployed monitoring.",
            recommendation: "Require release, logging, metric, and alert evidence in the consuming project.",
          },
        ]
      : [],
    userDecisions: isElectron
      ? [
          {
            id: "electron-runtime-risk",
            title: "Electron runtime risk acceptance",
            summary: "Maintainers must decide whether any remaining Node-enabled renderer surface is acceptable.",
            recommendation: "Prefer nodeIntegration=false, contextIsolation=true, webSecurity=true, and narrow preload IPC.",
          },
        ]
      : [],
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

function metadataChecks(caseStudy) {
  return [
    {
      checkId: "oss-advisory-reference",
      name: "OSS advisory reference",
      group: "case-study",
      status: "pass",
      blocking: false,
      summary: `${caseStudy.advisory} is pinned to ${caseStudy.advisoryUrl}.`,
      evidence: {
        repo: caseStudy.repo,
        vulnerableRef: caseStudy.vulnerableRef,
        fixedRef: caseStudy.fixedRef,
        patchCommit: caseStudy.patchCommit,
      },
    },
  ];
}

function reportForElectron(caseStudy, stage, source) {
  const dangerous = electronDangerousSettings(source.text);
  const checks = [
    ...metadataChecks(caseStudy),
    {
      checkId: "electron-runtime-hardening",
      name: "Electron runtime hardening",
      group: "electron",
      status: dangerous.length ? "fail" : "pass",
      blocking: dangerous.length > 0,
      summary: dangerous.length
        ? `APM found dangerous Electron settings: ${dangerous.join(", ")}.`
        : "APM hardening pass: dangerous Electron settings are not present in the reviewed renderer baseline.",
      evidence: {
        file: caseStudy.filePath,
        source: source.evidenceSource,
        dangerous,
      },
    },
  ];

  if (stage !== "before") {
    checks.push({
      checkId: "production-evidence-gap",
      name: "Production evidence for OSS case",
      group: "production-audit",
      status: "gap",
      blocking: false,
      coverageGap: true,
      summary: "The case proves the code review signal, but deployment monitoring and release approval remain project-specific evidence.",
    });
  }

  return buildJsonReport({
    root: `${caseStudy.repo}@${stage}`,
    mode: { strict: true, release: true, production: true, caseStudy: true },
    probe: {
      caseId: caseStudy.id,
      stage,
      advisory: caseStudy.advisory,
      source: source.evidenceSource,
    },
    checks,
    audit: caseAudit(caseStudy, stage),
    toolVersions: { "ai-project-maintainer": "0.5.0-case-study" },
    generatedAt,
  });
}

function reportForGhost(caseStudy, stage, source) {
  const signals = ghostSqlSignals(source.text);
  const vulnerable = !signals.hasParameterizedBindings || signals.interpolatesSlug;
  const checks = [
    ...metadataChecks(caseStudy),
    {
      checkId: "database-query-parameterization",
      name: "Database query parameterization",
      group: "database",
      status: vulnerable ? "fail" : "pass",
      blocking: vulnerable,
      summary: vulnerable
        ? "The reviewed slug ordering path can construct SQL with user-controlled slug values instead of bindings."
        : "The reviewed slug ordering path uses parameterized placeholders and bindings for user-controlled slug values.",
      evidence: {
        file: caseStudy.filePath,
        source: source.evidenceSource,
        interpolatesSlug: signals.interpolatesSlug,
        hasParameterizedBindings: signals.hasParameterizedBindings,
      },
    },
  ];

  if (stage !== "before") {
    checks.push({
      checkId: "production-db-evidence-gap",
      name: "Production database release evidence",
      group: "production-audit",
      status: "gap",
      blocking: false,
      coverageGap: true,
      summary: "The patch fixes the query construction issue, but backup, rollback, and deployed monitoring evidence are outside the OSS commit.",
    });
  }

  return buildJsonReport({
    root: `${caseStudy.repo}@${stage}`,
    mode: { strict: true, release: true, production: true, caseStudy: true },
    probe: {
      caseId: caseStudy.id,
      stage,
      advisory: caseStudy.advisory,
      source: source.evidenceSource,
    },
    checks,
    audit: caseAudit(caseStudy, stage),
    toolVersions: { "ai-project-maintainer": "0.5.0-case-study" },
    generatedAt,
  });
}

async function reportsForCase(caseStudy, options) {
  if (caseStudy.type === "electron") {
    const before = reportForElectron(caseStudy, "before", await sourceFor(caseStudy, "before", options));
    const patched = reportForElectron(caseStudy, "patched-release", await sourceFor(caseStudy, "patched-release", options));
    const after = reportForElectron(caseStudy, "after-hardened", await sourceFor(caseStudy, "after-hardened", options));
    return { before, "patched-release": patched, after };
  }

  const before = reportForGhost(caseStudy, "before", await sourceFor(caseStudy, "before", options));
  const after = reportForGhost(caseStudy, "after", await sourceFor(caseStudy, "after", options));
  return { before, after };
}

function caseSummary(caseStudy, reports) {
  const lines = [];
  lines.push(`# ${caseStudy.title}`);
  lines.push("");
  lines.push(`Repository: [${caseStudy.repo}](https://github.com/${caseStudy.repo})`);
  lines.push(`Advisory: [${caseStudy.advisory}](${caseStudy.advisoryUrl})`);
  lines.push(`Patch commit: [${caseStudy.patchCommit.slice(0, 12)}](${caseStudy.patchUrl})`);
  lines.push(`Fixed release: [${caseStudy.fixedRelease || caseStudy.fixedRef}](${caseStudy.releaseUrl})`);
  lines.push("");
  lines.push("| Stage | Overall Status | Passed | Why it matters |");
  lines.push("| --- | --- | --- | --- |");
  for (const [stage, report] of Object.entries(reports)) {
    const reason = report.blockers[0]?.summary || report.coverageGaps[0]?.summary || "No blockers in the generated case report.";
    lines.push(`| ${stage} | ${report.overallStatus} | ${report.passed ? "yes" : "no"} | ${reason.replaceAll("|", "\\|")} |`);
  }
  lines.push("");
  lines.push("This case stores links, metadata, and generated APM reports only. It does not vendor the upstream project source code.");
  return lines.join("\n");
}

function writeCase(caseStudy, reports, outputDir) {
  const caseDir = path.join(outputDir, caseStudy.id);
  fs.mkdirSync(caseDir, { recursive: true });

  for (const [stage, report] of Object.entries(reports)) {
    fs.writeFileSync(path.join(caseDir, `${stage}-report.json`), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(caseDir, `${stage}-report.md`), toMarkdown(report));
  }

  fs.writeFileSync(path.join(caseDir, "case-summary.md"), caseSummary(caseStudy, reports));
}

function assertSafeOutput(outputDir) {
  const forbidden = [
    /sk-[A-Za-z0-9_-]{20,}/,
    /github_pat_[A-Za-z0-9_]+/,
    /ghp_[A-Za-z0-9_]+/,
    /AIza[0-9A-Za-z_-]{20,}/,
    /xox[baprs]-[0-9A-Za-z-]+/,
    /postgres:\/\/\S+/i,
    /mysql:\/\/\S+/i,
    /mongodb(\+srv)?:\/\/\S+/i,
    /C:\\Users\\tianf/i,
    /E:\\/i,
  ];

  const files = [];
  function walk(dir) {
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) files.push(full);
    }
  }
  walk(outputDir);

  for (const file of files) {
    const text = fs.readFileSync(file, "utf8");
    for (const re of forbidden) {
      if (re.test(text)) throw new Error(`Forbidden sensitive pattern in ${file}: ${re}`);
    }
  }
}

function verifyReports(allReports) {
  const electron = allReports["siyuan-electron-rce"];
  const ghost = allReports["ghost-sql-injection"];

  if (electron.before.overallStatus !== "FAIL") throw new Error("Electron before report must fail.");
  if (electron["patched-release"].overallStatus !== "FAIL") {
    throw new Error("Electron patched-release report must still fail when dangerous Electron settings remain.");
  }
  if (electron.after.overallStatus !== "PASS_WITH_GAPS") throw new Error("Electron after hardening report must pass with gaps.");
  if (ghost.before.overallStatus !== "FAIL") throw new Error("Ghost before report must fail.");
  if (ghost.after.overallStatus !== "PASS_WITH_GAPS") throw new Error("Ghost after report must pass with gaps.");
}

export async function runOssCaseStudies(options = {}) {
  const outputDir = path.resolve(options.outputDir || path.join(os.tmpdir(), "apm-oss-case-studies"));
  fs.rmSync(outputDir, { recursive: true, force: true });
  fs.mkdirSync(outputDir, { recursive: true });

  const allReports = {};
  for (const caseStudy of CASE_STUDIES) {
    const reports = await reportsForCase(caseStudy, options);
    allReports[caseStudy.id] = reports;
    writeCase(caseStudy, reports, outputDir);
  }

  if (options.verify) {
    verifyReports(allReports);
    assertSafeOutput(outputDir);
  }

  return { outputDir, reports: allReports };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const args = parseArgs(process.argv.slice(2));
  const result = await runOssCaseStudies(args);
  console.log(`OSS case study reports written to ${result.outputDir}`);
}
