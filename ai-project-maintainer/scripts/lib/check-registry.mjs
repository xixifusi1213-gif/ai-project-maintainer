import {
  runActionlintChecks,
  runDatabaseChecks,
  runElectronChecks,
  runGrypeChecks,
  runIacChecks,
  runMegaLinterChecks,
  runOsvScannerChecks,
  runPackageAuditChecks,
  runPreCommitChecks,
  runSastChecks,
  runScorecardChecks,
  runSecretChecks,
  runSyftChecks,
  runTestChecks,
  runTrivyFilesystemChecks,
  runZizmorChecks,
} from "./checks.mjs";

const builtinCheckRegistry = [
  { id: "tests", group: "tests", title: "Project tests and release scripts", requiredTools: ["npm", "pnpm", "yarn", "bun"], detect: (project) => Boolean(project.packageJson), run: ({ project, options }) => runTestChecks(project, options), defaultLevel: "block" },
  { id: "package-audit", group: "dependencies", title: "Package manager production audit", requiredTools: ["npm", "pnpm", "yarn"], detect: (project) => Boolean(project.packageJson), run: ({ project, options }) => runPackageAuditChecks(project, options), defaultLevel: "block" },
  { id: "gitleaks", group: "secrets", title: "Gitleaks secret scan", requiredTools: ["gitleaks"], detect: () => true, run: ({ project, options }) => runSecretChecks(project, options), defaultLevel: "block" },
  { id: "trivy", group: "dependencies", title: "Trivy filesystem scan", requiredTools: ["trivy"], detect: () => true, run: ({ project, options }) => runTrivyFilesystemChecks(project, options), defaultLevel: "block" },
  { id: "osv-scanner", group: "dependencies", title: "OSV-Scanner dependency scan", requiredTools: ["osv-scanner"], detect: (project) => (project.files || []).some((file) => /(^|\/)(package-lock\.json|pnpm-lock\.yaml|yarn\.lock|bun\.lockb?|go\.sum|requirements.*\.txt|poetry\.lock|Cargo\.lock|Gemfile\.lock)$/i.test(file)), run: ({ project, options }) => runOsvScannerChecks(project, options), defaultLevel: "warn" },
  { id: "semgrep", group: "sast", title: "Semgrep static scan", requiredTools: ["semgrep"], detect: () => true, run: ({ project, options }) => runSastChecks(project, options), defaultLevel: "block" },
  { id: "syft", group: "supply-chain", title: "Syft SBOM", requiredTools: ["syft"], detect: () => true, run: ({ project, options }) => runSyftChecks(project, options), defaultLevel: "warn" },
  { id: "grype", group: "supply-chain", title: "Grype vulnerability scan", requiredTools: ["grype"], detect: () => true, run: ({ project, options }) => runGrypeChecks(project, options), defaultLevel: "warn" },
  { id: "actionlint", group: "ci-security", title: "actionlint workflow lint", requiredTools: ["actionlint"], detect: (project) => (project.riskSurfaces?.ci || []).length > 0, run: ({ project, options }) => runActionlintChecks(project, options), defaultLevel: "block" },
  { id: "zizmor", group: "ci-security", title: "zizmor workflow security", requiredTools: ["zizmor"], detect: (project) => (project.riskSurfaces?.ci || []).length > 0, run: ({ project, options }) => runZizmorChecks(project, options), defaultLevel: "warn" },
  { id: "checkov", group: "iac", title: "Checkov IaC scan", requiredTools: ["checkov"], detect: (project) => (project.riskSurfaces?.infra || []).length > 0, run: ({ project, options }) => runIacChecks(project, options).filter((check) => check.checkId === "checkov" || check.checkId === "trivy-config"), defaultLevel: "warn" },
  { id: "electron", group: "electron", title: "Electron baseline", requiredTools: [], detect: (project) => Boolean(project.electron?.detected), run: ({ project }) => runElectronChecks(project), defaultLevel: "block" },
  { id: "database", group: "database", title: "Database migration review", requiredTools: ["squawk"], detect: (project) => (project.riskSurfaces?.database || []).length > 0, run: ({ project, options }) => runDatabaseChecks(project, options), defaultLevel: "block" },
  { id: "scorecard", group: "oss-hygiene", title: "OpenSSF Scorecard", requiredTools: ["scorecard"], detect: () => true, run: ({ project, options }) => runScorecardChecks(project, options), defaultLevel: "warn" },
  { id: "pre-commit", group: "oss-hygiene", title: "pre-commit hooks", requiredTools: ["pre-commit"], detect: () => true, run: ({ project, options }) => runPreCommitChecks(project, options), defaultLevel: "warn" },
  { id: "megalinter", group: "oss-hygiene", title: "MegaLinter security profile", requiredTools: ["mega-linter-runner"], detect: () => true, run: ({ project, options }) => runMegaLinterChecks(project, options), defaultLevel: "warn" },
];

export function getBuiltinCheckRegistry() {
  return builtinCheckRegistry.map((check) => ({ ...check }));
}

export function resolveEnabledChecks(registry, policy = {}) {
  const configuredLevels = policy.checks || {};
  return registry
    .map((check) => ({ ...check, level: configuredLevels[check.id] || check.defaultLevel }))
    .filter((check) => check.level !== "off");
}

export function runRegisteredChecks(project, options = {}) {
  const policy = options.policy || {};
  const registry = options.registry || getBuiltinCheckRegistry();
  const enabledChecks = resolveEnabledChecks(registry, policy);
  const results = [];

  for (const definition of enabledChecks) {
    if (!definition.detect(project, options)) continue;
    const checks = definition.run({ project, options, definition });
    for (const check of checks) {
      results.push({
        checkId: check.checkId || definition.id,
        policyLevel: definition.level,
        ...check,
      });
    }
  }

  return results;
}
