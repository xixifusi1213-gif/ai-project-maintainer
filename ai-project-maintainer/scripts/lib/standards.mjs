export const standardsSources = [
  {
    id: "nist-ssdf",
    title: "NIST SSDF SP 800-218",
    url: "https://csrc.nist.gov/pubs/sp/800/218/final",
    summary: "Secure software development practices for design, implementation, verification, release, and vulnerability response.",
  },
  {
    id: "owasp-samm",
    title: "OWASP SAMM",
    url: "https://owasp.org/www-project-samm/",
    summary: "Software assurance maturity model covering governance, design, implementation, verification, and operations.",
  },
  {
    id: "slsa",
    title: "SLSA",
    url: "https://slsa.dev/",
    summary: "Supply-chain integrity framework for source, build, provenance, and artifact trust.",
  },
  {
    id: "openssf-scorecard",
    title: "OpenSSF Scorecard",
    url: "https://scorecard.dev/",
    summary: "Automated checks for open source project security posture and supply-chain hygiene.",
  },
  {
    id: "google-sre-release",
    title: "Google SRE Release Engineering",
    url: "https://sre.google/sre-book/release-engineering/",
    summary: "Release engineering practices for repeatable builds, automation, policy enforcement, audit trails, and rollback.",
  },
  {
    id: "google-sre-monitoring",
    title: "Google SRE Monitoring Distributed Systems",
    url: "https://sre.google/sre-book/monitoring-distributed-systems/",
    summary: "Monitoring and alerting practices for detecting production failure and paging humans only when action is needed.",
  },
  {
    id: "google-sre-risk",
    title: "Google SRE Embracing Risk",
    url: "https://sre.google/sre-book/embracing-risk/",
    summary: "Explicit reliability risk management and owner-approved risk acceptance.",
  },
  {
    id: "cis-control-11",
    title: "CIS Control 11: Data Recovery",
    url: "https://www.cisecurity.org/controls/data-recovery",
    summary: "Backup and recovery controls for restoring data after destructive events or operational failures.",
  },
  {
    id: "nist-sp-800-34",
    title: "NIST SP 800-34 Rev. 1",
    url: "https://csrc.nist.gov/pubs/sp/800/34/r1/upd1/final",
    summary: "Contingency planning guidance for backup, recovery, and continuity of operations.",
  },
  {
    id: "dora",
    title: "DORA research",
    url: "https://dora.dev/research/",
    summary: "Software delivery and operational performance research, including continuous delivery and recovery capabilities.",
  },
  {
    id: "owasp-llm-top-10",
    title: "OWASP Top 10 for LLM Applications",
    url: "https://owasp.org/www-project-top-10-for-large-language-model-applications/",
    summary: "LLM application risk categories including prompt injection, sensitive information disclosure, supply-chain risk, and excessive agency.",
  },
  {
    id: "owasp-agentic-ai",
    title: "OWASP Agentic AI Threats and Mitigations",
    url: "https://genai.owasp.org/resource/agentic-ai-threats-and-mitigations/",
    summary: "Threat model and mitigations for agents that can use tools, access resources, and take actions.",
  },
];

const refs = new Map(standardsSources.map((source) => [source.id, source]));

function ref(id, relationship = "supports") {
  const source = refs.get(id);
  if (!source) throw new Error(`Unknown standards source: ${id}`);
  return {
    id,
    title: source.title,
    url: source.url,
    relationship,
  };
}

const groupMappings = {
  tests: [ref("nist-ssdf"), ref("dora"), ref("google-sre-release")],
  secrets: [ref("nist-ssdf"), ref("owasp-samm")],
  dependencies: [ref("nist-ssdf"), ref("slsa"), ref("openssf-scorecard")],
  sast: [ref("nist-ssdf"), ref("owasp-samm")],
  "supply-chain": [ref("slsa"), ref("openssf-scorecard"), ref("nist-ssdf")],
  "ci-security": [ref("openssf-scorecard"), ref("slsa"), ref("google-sre-release")],
  iac: [ref("owasp-samm"), ref("nist-ssdf")],
  electron: [ref("nist-ssdf"), ref("owasp-samm")],
  database: [ref("owasp-samm"), ref("google-sre-release")],
  "oss-hygiene": [ref("openssf-scorecard"), ref("slsa")],
  "production-audit": [
    ref("google-sre-monitoring"),
    ref("google-sre-release"),
    ref("google-sre-risk"),
    ref("cis-control-11"),
    ref("nist-sp-800-34"),
  ],
  "production-evidence": [
    ref("google-sre-monitoring"),
    ref("google-sre-release"),
    ref("google-sre-risk"),
    ref("cis-control-11"),
    ref("nist-sp-800-34"),
  ],
  "agent-risk": [ref("owasp-llm-top-10"), ref("owasp-agentic-ai"), ref("nist-ssdf"), ref("owasp-samm")],
};

const checkIdMappings = [
  [/gitleaks|secret/i, [ref("nist-ssdf"), ref("owasp-samm")]],
  [/semgrep|sast/i, [ref("nist-ssdf"), ref("owasp-samm")]],
  [/trivy|osv|package-audit|dependency|grype/i, [ref("nist-ssdf"), ref("slsa"), ref("openssf-scorecard")]],
  [/syft|sbom|scorecard/i, [ref("slsa"), ref("openssf-scorecard")]],
  [/actionlint|zizmor|workflow/i, [ref("openssf-scorecard"), ref("slsa"), ref("google-sre-release")]],
  [/release-approval/i, [ref("google-sre-release"), ref("google-sre-risk")]],
  [/error-monitoring|alerting|alert-status|observability|logs|metrics/i, [ref("google-sre-monitoring"), ref("google-sre-risk")]],
  [/database|migration|bytebase|atlas|squawk/i, [ref("owasp-samm"), ref("google-sre-release")]],
  [/backup|rollback|recovery/i, [ref("cis-control-11"), ref("nist-sp-800-34"), ref("google-sre-release")]],
  [/deployment|runtime/i, [ref("google-sre-release"), ref("dora")]],
  [/agent|mcp|prompt|codex|claude|cursor/i, [ref("owasp-llm-top-10"), ref("owasp-agentic-ai"), ref("nist-ssdf")]],
];

function statusKey(status) {
  return String(status || "").toLowerCase();
}

function dedupeRefs(standardRefs) {
  const seen = new Set();
  const deduped = [];
  for (const item of standardRefs || []) {
    if (!item?.id || seen.has(item.id)) continue;
    seen.add(item.id);
    deduped.push(item);
  }
  return deduped;
}

export function standardRefsForCheck(check) {
  if (Array.isArray(check.standardRefs) && check.standardRefs.length) return dedupeRefs(check.standardRefs);
  const lookup = `${check.checkId || ""} ${check.name || ""}`;
  const matched = checkIdMappings.find(([pattern]) => pattern.test(lookup));
  return dedupeRefs(matched?.[1] || groupMappings[check.group] || []);
}

export function evidenceLevelForCheck(check) {
  if (check.evidenceLevel) return check.evidenceLevel;
  const status = statusKey(check.status);
  if (["gap", "missing", "skipped"].includes(status) || check.coverageGap) return "GAP";
  if (check.group === "production-evidence") return "PLATFORM_VERIFIED";
  if (check.group === "production-audit") {
    if (status === "user_decision") return "USER_REPORTED";
    return "INFERRED";
  }
  if (check.command || ["tests", "secrets", "dependencies", "sast", "supply-chain", "ci-security", "iac", "database", "electron", "oss-hygiene", "agent-risk"].includes(check.group)) {
    return "TOOL_VERIFIED";
  }
  return "INFERRED";
}

export function enrichChecksWithTrustMetadata(checks) {
  return (checks || []).map((check) => ({
    ...check,
    evidenceLevel: evidenceLevelForCheck(check),
    standardRefs: standardRefsForCheck(check),
  }));
}

export function buildStandardsSummary(checks) {
  const mappings = [];
  const seen = new Set();
  for (const check of checks || []) {
    const refsForCheck = standardRefsForCheck(check);
    const key = `${check.group || "unknown"}:${check.checkId || check.name || "unknown"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    mappings.push({
      group: check.group || "unknown",
      checkId: check.checkId || null,
      name: check.name || null,
      refs: refsForCheck,
    });
  }
  return {
    sources: standardsSources,
    mappings,
  };
}
