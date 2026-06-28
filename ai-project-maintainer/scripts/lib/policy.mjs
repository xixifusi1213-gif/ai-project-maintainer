import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

export const defaultPolicy = {
  profile: "oss",
  mode: "strict",
  tool_groups: [],
  checks: {
    gitleaks: "block",
    trivy: "block",
    semgrep: "block",
    "osv-scanner": "warn",
    syft: "warn",
    grype: "warn",
    actionlint: "block",
    zizmor: "warn",
    checkov: "warn",
    "trivy-config": "warn",
    scorecard: "warn",
    megalinter: "warn",
    "pre-commit": "warn",
  },
  fail_on: {
    tests: true,
    secrets: true,
    dependency_high_or_critical: true,
    semgrep_blocking: true,
    trivy_unavailable: true,
    electron_dangerous_settings: true,
    ci_security_high: true,
  },
  warn_on: {
    dev_dependency_vulnerabilities: true,
    missing_optional_tools: true,
  },
};

function parseYamlFile(filePath, fallback) {
  try {
    const text = fs.readFileSync(filePath, "utf8").replace(/^\uFEFF/, "");
    return YAML.parse(text) || fallback;
  } catch {
    return fallback;
  }
}

function mergePolicy(customPolicy) {
  return {
    ...defaultPolicy,
    ...customPolicy,
    checks: { ...defaultPolicy.checks, ...(customPolicy.checks || {}) },
    fail_on: { ...defaultPolicy.fail_on, ...(customPolicy.fail_on || {}) },
    warn_on: { ...defaultPolicy.warn_on, ...(customPolicy.warn_on || {}) },
  };
}

export function loadPolicyBundle(projectRoot) {
  const root = path.resolve(projectRoot);
  const policyPath = path.join(root, ".ai-maintainer", "policy.yml");
  const exceptionsPath = path.join(root, ".ai-maintainer", "exceptions.yml");
  const customPolicy = fs.existsSync(policyPath) ? parseYamlFile(policyPath, {}) : {};
  const exceptionDocument = fs.existsSync(exceptionsPath) ? parseYamlFile(exceptionsPath, { exceptions: [] }) : { exceptions: [] };
  const exceptions = fs.existsSync(exceptionsPath)
    ? (Array.isArray(exceptionDocument.exceptions) ? exceptionDocument.exceptions : [])
    : [];

  return {
    policy: mergePolicy(customPolicy),
    exceptions,
    paths: { policyPath, exceptionsPath },
  };
}

export function validateExceptions(exceptions, now = new Date()) {
  const valid = [];
  const invalid = [];
  const today = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));

  for (const item of exceptions || []) {
    const missing = ["id", "check", "reason", "expires", "owner"].filter((key) => !item[key]);
    if (missing.length) {
      invalid.push({ ...item, reason: `exception is missing required field(s): ${missing.join(", ")}` });
      continue;
    }

    const expires = new Date(`${item.expires}T00:00:00Z`);
    if (Number.isNaN(expires.getTime())) {
      invalid.push({ ...item, reason: "exception expires date is invalid" });
      continue;
    }

    if (expires < today) {
      invalid.push({ ...item, reason: `exception expired on ${item.expires}` });
      continue;
    }

    valid.push(item);
  }

  return { valid, invalid };
}

function matchesException(check, exception) {
  const target = String(exception.check || "").toLowerCase();
  return [check.checkId, check.name, check.group]
    .map((value) => String(value || "").toLowerCase())
    .includes(target);
}

function policyKeyForCheck(check) {
  if (check.group === "tests") return "tests";
  if (check.group === "secrets") return "secrets";
  if (check.group === "sast") return "semgrep_blocking";
  if (check.group === "electron") return "electron_dangerous_settings";
  if (check.group === "ci-security") return "ci_security_high";
  if (check.group === "dependencies" && check.name?.includes("trivy") && ["error", "missing"].includes(check.status)) return "trivy_unavailable";
  if (check.group === "dependencies" || check.group === "supply-chain") return "dependency_high_or_critical";
  return null;
}

export function applyPolicy(checks, bundle, now = new Date()) {
  const validation = validateExceptions(bundle.exceptions, now);
  const applied = checks.map((check) => ({ ...check }));
  const failOn = bundle.policy?.fail_on || {};
  const checkLevels = bundle.policy?.checks || {};

  for (const check of applied) {
    if (!check.blocking) continue;
    const checkLevel = checkLevels[check.checkId];
    if (checkLevel === "warn" || checkLevel === "off") {
      check.blocking = false;
      check.policyLevel = checkLevel;
      continue;
    }
    const policyKey = policyKeyForCheck(check);
    if (policyKey && failOn[policyKey] === false) {
      check.blocking = false;
      check.policyDowngrade = `fail_on.${policyKey}=false`;
      continue;
    }
    const exception = validation.valid.find((item) => matchesException(check, item));
    if (!exception) continue;
    check.blocking = false;
    check.exception = exception;
  }

  return {
    checks: applied,
    invalidExceptions: validation.invalid,
  };
}
