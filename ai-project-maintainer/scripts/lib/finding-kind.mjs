const safeStatuses = new Set(["pass", "passed", "ok", "n/a", "na", "not_applicable"]);

const productionEvidenceGroups = new Set([
  "production-audit",
  "production-evidence",
  "data-exposure",
  "auth-boundary",
  "business-flow-safety",
  "database-safety",
  "operational-safety",
  "ai-repair-safety",
]);

const scannerGroups = new Set([
  "dependencies",
  "secrets",
  "sast",
  "supply-chain",
  "ci-security",
  "iac",
  "electron",
  "database",
  "agent-risk",
  "security",
]);

export const findingKindDefinitions = [
  {
    id: "confirmed_vulnerability",
    label: "Confirmed vulnerabilities",
    description: "Validated vulnerability evidence. This label is never inferred from scanner output alone.",
  },
  {
    id: "untriaged_scanner_finding",
    label: "Untriaged scanner findings",
    description: "A scanner matched something that still needs project-specific validation.",
  },
  {
    id: "verified_check_failure",
    label: "Verified check failures",
    description: "A deterministic test, build, or engineering check failed; this is not automatically a vulnerability.",
  },
  {
    id: "production_evidence_gap",
    label: "Production evidence gaps",
    description: "Required production proof is missing; this is missing proof, not a discovered vulnerability.",
  },
  {
    id: "maintainer_decision",
    label: "Maintainer decisions",
    description: "Business context or risk acceptance must be supplied by a human maintainer.",
  },
  {
    id: "environment_tooling_issue",
    label: "Environment or tooling issues",
    description: "A scanner, database, dependency, or local tool was unavailable, so evidence is incomplete.",
  },
];

const validKinds = new Set(findingKindDefinitions.map((item) => item.id));

function statusKey(status) {
  return String(status || "unknown").toLowerCase();
}

export function classifyFindingKind(item = {}) {
  const status = statusKey(item.status);
  if (safeStatuses.has(status)) return null;
  if (validKinds.has(item.findingKind)) return item.findingKind;
  if (item.invalidException || status === "user_decision") return "maintainer_decision";
  if (productionEvidenceGroups.has(item.group)) return "production_evidence_gap";
  if (item.coverageGap || status === "missing" || status === "skipped") return "environment_tooling_issue";
  if (scannerGroups.has(item.group)) return "untriaged_scanner_finding";
  return "verified_check_failure";
}

export function withFindingKind(item = {}) {
  const findingKind = classifyFindingKind(item);
  return findingKind ? { ...item, findingKind } : { ...item };
}

export function buildFindingSummary(items = []) {
  const byKind = Object.fromEntries(findingKindDefinitions.map((item) => [item.id, 0]));
  let total = 0;
  for (const item of items) {
    const findingKind = classifyFindingKind(item);
    if (!findingKind) continue;
    byKind[findingKind] += 1;
    total += 1;
  }
  return { total, byKind };
}

export function findingKindLabel(findingKind) {
  return findingKindDefinitions.find((item) => item.id === findingKind)?.label || findingKind || "Unclassified finding";
}
