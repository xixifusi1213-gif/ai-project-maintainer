#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { runAgentRisk, toAgentRiskMarkdown } from "./lib/agent-risk.mjs";
import { runAuditPlan } from "./audit-plan.mjs";
import { runDoctor } from "./doctor.mjs";
import { initAudit, initAuditWizard } from "./init-audit.mjs";
import { initProject } from "./init-project.mjs";
import { runRepairPack } from "./repair-pack.mjs";
import { runLocalGate, runLocalGateAsync } from "./run-local-gate.mjs";
import { summarizeReport } from "./report-summary.mjs";
import { runConnectorsDoctor, runEvidence, writeEvidenceReport } from "./lib/connectors.mjs";
import { toMarkdown } from "./lib/report.mjs";
import { planIntakeWizard } from "./lib/intake-wizard.mjs";

function readOption(args, name, fallback = null) {
  const index = args.indexOf(name);
  if (index === -1) {
    const inline = args.find((arg) => arg.startsWith(`${name}=`));
    return inline ? inline.slice(name.length + 1) : fallback;
  }
  return args[index + 1] || fallback;
}

function firstPositional(args, optionValueNames = []) {
  return args.find((arg, index) => !arg.startsWith("--") && !optionValueNames.includes(args[index - 1]));
}

function packageVersion() {
  const cliDir = path.dirname(fileURLToPath(import.meta.url));
  const packagePath = path.resolve(cliDir, "..", "..", "package.json");
  return JSON.parse(fs.readFileSync(packagePath, "utf8")).version;
}

export function parseCliArgs(argv) {
  const [command = "help", ...rest] = argv;

  if (command === "--version" || command === "-v") {
    return { command: "version", args: {} };
  }

  if (command === "doctor") {
    return {
      command,
      args: {
        jsonOnly: rest.includes("--json"),
        checkTrivyDb: !rest.includes("--no-trivy-db"),
      },
    };
  }

  if (command === "init") {
    return {
      command,
      args: {
        projectRoot: firstPositional(rest, ["--profile", "--ci"]) || process.cwd(),
        profile: readOption(rest, "--profile", "auto"),
        ci: readOption(rest, "--ci", "github"),
        preCommit: rest.includes("--pre-commit"),
      },
    };
  }

  if (command === "gate") {
    return {
      command,
      args: {
        projectRoot: firstPositional(rest, ["--output", "--profile"]) || process.cwd(),
        strict: rest.includes("--strict"),
        release: rest.includes("--release"),
        noTests: rest.includes("--no-tests"),
        jsonOnly: rest.includes("--json"),
        production: rest.includes("--production"),
        connectors: rest.includes("--connectors"),
        agentRisk: rest.includes("--agent-risk"),
        profile: readOption(rest, "--profile", "auto"),
        outputPath: readOption(rest, "--output", null),
      },
    };
  }

  if (command === "agent-risk") {
    return {
      command,
      args: {
        projectRoot: firstPositional(rest, ["--output"]) || process.cwd(),
        outputPath: readOption(rest, "--output", null),
        jsonOnly: rest.includes("--json"),
      },
    };
  }

  if (command === "connectors") {
    const [subcommand = "help", ...connectorArgs] = rest;
    return {
      command,
      args: {
        subcommand,
        projectRoot: firstPositional(connectorArgs) || process.cwd(),
        jsonOnly: connectorArgs.includes("--json"),
      },
    };
  }

  if (command === "evidence") {
    return {
      command,
      args: {
        projectRoot: firstPositional(rest, ["--output"]) || process.cwd(),
        outputPath: readOption(rest, "--output", null),
        jsonOnly: rest.includes("--json"),
      },
    };
  }

  if (command === "init-audit") {
    const langIndex = rest.indexOf("--lang");
    return {
      command,
      args: {
        projectRoot: firstPositional(rest, ["--lang", "--profile"]) || process.cwd(),
        wizard: rest.includes("--wizard"),
        dryRun: rest.includes("--dry-run"),
        lang: langIndex === -1 ? "en" : rest[langIndex + 1] || "en",
        profile: readOption(rest, "--profile", "auto"),
      },
    };
  }

  if (command === "audit-plan") {
    return {
      command,
      args: {
        projectRoot: firstPositional(rest, ["--output", "--profile"]) || process.cwd(),
        outputPath: readOption(rest, "--output", null),
        jsonOnly: rest.includes("--json"),
        profile: readOption(rest, "--profile", "auto"),
      },
    };
  }

  if (command === "summary") {
    return {
      command,
      args: {
        reportPath: rest.find((arg) => !arg.startsWith("--")),
      },
    };
  }

  if (command === "repair-pack") {
    return {
      command,
      args: {
        reportPath: firstPositional(rest, ["--project", "--output"]) || "reports/security-report.json",
        projectRoot: readOption(rest, "--project", null),
        outputDir: readOption(rest, "--output", null),
        jsonOnly: rest.includes("--json"),
      },
    };
  }

  return { command: "help", args: {} };
}

function doctorToMarkdown(report) {
  const lines = [];
  lines.push(`# AI Project Maintainer Doctor: ${report.passed ? "PASS" : "WARN"}`);
  lines.push("");
  lines.push(`- node: ${report.node.version}`);
  lines.push("");
  lines.push("## Required Scanners");
  for (const tool of report.required) lines.push(`- ${tool.name}: ${tool.status}${tool.version ? ` (${tool.version})` : ""}`);
  lines.push("");
  lines.push("## Optional Scanners");
  for (const tool of report.optional) lines.push(`- ${tool.name}: ${tool.status}${tool.version ? ` (${tool.version})` : ""}`);
  lines.push("");
  lines.push("## Trivy DB");
  lines.push(`- ${report.trivyDb.status}: ${report.trivyDb.summary}`);
  return lines.join("\n");
}

export function runCli(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  const parsed = parseCliArgs(argv);

  if (parsed.command === "version") {
    io.stdout.write(`${packageVersion()}\n`);
    return 0;
  }

  if (parsed.command === "doctor") {
    const report = runDoctor({ checkTrivyDb: parsed.args.checkTrivyDb });
    io.stdout.write(`${parsed.args.jsonOnly ? JSON.stringify(report, null, 2) : doctorToMarkdown(report)}\n`);
    return report.passed ? 0 : 1;
  }

  if (parsed.command === "init") {
    const result = initProject(parsed.args.projectRoot, {
      profile: parsed.args.profile,
      ci: parsed.args.ci,
      preCommit: parsed.args.preCommit,
    });
    io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  if (parsed.command === "gate") {
    const report = runLocalGate(parsed.args.projectRoot, {
      strict: parsed.args.strict,
      release: parsed.args.release,
      noTests: parsed.args.noTests,
      production: parsed.args.production,
      agentRisk: parsed.args.agentRisk,
      connectors: false,
      profile: parsed.args.profile,
      outputPath: parsed.args.outputPath,
      writeReports: true,
    });
    io.stdout.write(`${parsed.args.jsonOnly ? JSON.stringify(report, null, 2) : toMarkdown(report)}\n`);
    return report.passed ? 0 : 1;
  }

  if (parsed.command === "agent-risk") {
    const outputPath = parsed.args.outputPath || path.resolve(parsed.args.projectRoot, "reports", "agent-risk-report.json");
    const report = runAgentRisk(parsed.args.projectRoot, {
      outputPath,
      writeReports: true,
    });
    io.stdout.write(`${parsed.args.jsonOnly ? JSON.stringify(report, null, 2) : toAgentRiskMarkdown(report)}\n`);
    return report.passed ? 0 : 1;
  }

  if (parsed.command === "connectors" && parsed.args.subcommand === "doctor") {
    const report = runConnectorsDoctor(parsed.args.projectRoot);
    io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return report.passed ? 0 : 1;
  }

  if (parsed.command === "init-audit") {
    if (parsed.args.wizard) {
      if (!parsed.args.dryRun) {
        io.stderr.write("Usage error: init-audit --wizard is interactive. Use the installed CLI directly, or add --dry-run for a non-writing preview.\n");
        return 2;
      }
      const result = planIntakeWizard(parsed.args.projectRoot, {
        dryRun: true,
        lang: parsed.args.lang,
        profile: parsed.args.profile,
      });
      io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    }
    const result = initAudit(parsed.args.projectRoot, { profile: parsed.args.profile });
    io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return 0;
  }

  if (parsed.command === "audit-plan") {
    const audit = runAuditPlan(parsed.args.projectRoot, { outputPath: parsed.args.outputPath, profile: parsed.args.profile });
    io.stdout.write(`${JSON.stringify(audit, null, 2)}\n`);
    return 0;
  }

  if (parsed.command === "summary" && parsed.args.reportPath) {
    io.stdout.write(`${summarizeReport(parsed.args.reportPath)}\n`);
    return 0;
  }

  if (parsed.command === "repair-pack") {
    try {
      const result = runRepairPack(parsed.args.reportPath, {
        projectRoot: parsed.args.projectRoot,
        outputDir: parsed.args.outputDir,
      });
      if (parsed.args.jsonOnly) {
        io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      } else {
        io.stdout.write(`AI Agent Repair Pack generated: ${result.repairPack.summary.total} task(s)\n`);
        for (const file of Object.values(result.files)) io.stdout.write(`- ${file}\n`);
      }
      return 0;
    } catch (error) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
  }

  io.stderr.write("Usage: ai-project-maintainer <doctor|init|init-audit|audit-plan|gate|agent-risk|connectors|evidence|summary|repair-pack> [options]\n");
  io.stderr.write("       ai-project-maintainer --version\n");
  return 2;
}

export async function runCliAsync(argv = process.argv.slice(2), io = { stdout: process.stdout, stderr: process.stderr }) {
  const parsed = parseCliArgs(argv);
  if (parsed.command === "gate" && parsed.args.connectors) {
    try {
      const report = await runLocalGateAsync(parsed.args.projectRoot, {
        strict: parsed.args.strict,
        release: parsed.args.release,
        noTests: parsed.args.noTests,
        production: parsed.args.production,
        agentRisk: parsed.args.agentRisk,
        connectors: true,
        profile: parsed.args.profile,
        outputPath: parsed.args.outputPath,
        writeReports: true,
      });
      io.stdout.write(`${parsed.args.jsonOnly ? JSON.stringify(report, null, 2) : toMarkdown(report)}\n`);
      return report.passed ? 0 : 1;
    } catch (error) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
  }
  if (parsed.command === "evidence") {
    try {
      const report = await runEvidence(parsed.args.projectRoot);
      if (parsed.args.outputPath) writeEvidenceReport(report, path.isAbsolute(parsed.args.outputPath) ? parsed.args.outputPath : path.resolve(parsed.args.projectRoot, parsed.args.outputPath));
      io.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
      return report.failures.length ? 1 : 0;
    } catch (error) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
  }
  if (parsed.command === "init-audit" && parsed.args.wizard) {
    try {
      const result = await initAuditWizard(parsed.args.projectRoot, {
        dryRun: parsed.args.dryRun,
        lang: parsed.args.lang,
        profile: parsed.args.profile,
        input: io.input || process.stdin,
        output: io.promptOutput || process.stdout,
      });
      io.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
      return 0;
    } catch (error) {
      io.stderr.write(`${error.message}\n`);
      return 2;
    }
  }
  return runCli(argv, io);
}

function isDirectRun() {
  if (!process.argv[1]) return false;
  const modulePath = fileURLToPath(import.meta.url);
  try {
    return fs.realpathSync(process.argv[1]) === modulePath;
  } catch {
    return path.resolve(process.argv[1]) === modulePath;
  }
}

if (isDirectRun()) {
  runCliAsync().then((code) => process.exit(code));
}
