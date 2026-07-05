import assert from "node:assert/strict";
import crypto from "node:crypto";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import YAML from "yaml";

import { writeReleaseManifest } from "../ai-project-maintainer/scripts/release-manifest.mjs";
import { verifyPrepublish, verifyPublished } from "../ai-project-maintainer/scripts/verify-release.mjs";
import { buildJsonReport } from "../ai-project-maintainer/scripts/lib/report.mjs";

function sha256(text) {
  return crypto.createHash("sha256").update(text).digest("hex");
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

test("release manifest records tarball, SBOM, and security report hashes", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-release-manifest-"));
  const tarball = path.join(dir, "ai-project-maintainer-1.0.0.tgz");
  const sbom = path.join(dir, "sbom.cdx.json");
  const report = path.join(dir, "security-report.json");
  const output = path.join(dir, "release-manifest.json");
  fs.writeFileSync(tarball, "package-bytes");
  fs.writeFileSync(sbom, '{"bomFormat":"CycloneDX"}');
  fs.writeFileSync(report, '{"overallStatus":"PASS"}');

  const { manifest, markdownOutput } = writeReleaseManifest({
    version: "1.0.0",
    tag: "v1.0.0",
    tarball,
    sbom,
    report,
    output,
    commit: "abc123",
  });

  assert.equal(manifest.package.version, "1.0.0");
  assert.equal(manifest.git.tag, "v1.0.0");
  assert.equal(manifest.git.commit, "abc123");
  assert.equal(manifest.artifacts.tarball.sha256, sha256("package-bytes"));
  assert.equal(manifest.artifacts.sbom.sha256, sha256('{"bomFormat":"CycloneDX"}'));
  assert.equal(manifest.artifacts.securityReport.sha256, sha256('{"overallStatus":"PASS"}'));
  assert.equal(fs.existsSync(output), true);
  assert.match(fs.readFileSync(markdownOutput, "utf8"), /Release Manifest: ai-project-maintainer@1\.0\.0/);
});

test("prepublish verification validates versions, tag, release notes, and tarball name", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-prepublish-"));
  writeJson(path.join(root, "package.json"), { name: "ai-project-maintainer", version: "1.0.0" });
  writeJson(path.join(root, "package-lock.json"), {
    version: "1.0.0",
    packages: { "": { version: "1.0.0" } },
  });
  fs.mkdirSync(path.join(root, "docs", "releases"), { recursive: true });
  fs.writeFileSync(path.join(root, "docs", "releases", "v1.0.0.md"), "# v1.0.0\n");

  assert.deepEqual(verifyPrepublish({
    root,
    version: "1.0.0",
    tag: "v1.0.0",
    tarball: path.join(root, "ai-project-maintainer-1.0.0.tgz"),
  }), { ok: true, version: "1.0.0", tag: "v1.0.0" });

  assert.throws(() => verifyPrepublish({ root, version: "1.0.0", tag: "release-1.0.0" }), /Expected tag v1\.0\.0/);
  assert.throws(() => verifyPrepublish({
    root,
    version: "1.0.0",
    tag: "v1.0.0",
    tarball: path.join(root, "ai-project-maintainer-0.9.0.tgz"),
  }), /Expected tarball ai-project-maintainer-1\.0\.0\.tgz/);
});

test("published verification checks npm, GitHub Release, remote tag, and manifest alignment", () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-published-"));
  const manifestPath = path.join(dir, "release-manifest.json");
  writeJson(manifestPath, {
    package: { name: "ai-project-maintainer", version: "1.0.0" },
    git: { tag: "v1.0.0", commit: "abc123" },
  });

  const runner = (command, args) => {
    const joined = `${command} ${args.join(" ")}`;
    if (joined.startsWith("npm view")) {
      return { status: 0, stdout: JSON.stringify({ version: "1.0.0", "dist-tags": { latest: "1.0.0" } }) };
    }
    if (joined.startsWith("gh release view")) {
      return { status: 0, stdout: JSON.stringify({ tagName: "v1.0.0", targetCommitish: "abc123", url: "https://example.test/release" }) };
    }
    if (joined.startsWith("git ls-remote")) {
      return { status: 0, stdout: "abc123\trefs/tags/v1.0.0\n" };
    }
    return { status: 1, stderr: `unexpected command: ${joined}` };
  };

  assert.deepEqual(verifyPublished({
    version: "1.0.0",
    tag: "v1.0.0",
    manifest: manifestPath,
  }, { runner }).ok, true);

  const staleNpm = (command, args) => {
    if (command === "npm") return { status: 0, stdout: JSON.stringify({ version: "0.9.0", "dist-tags": { latest: "0.9.0" } }) };
    return runner(command, args);
  };
  assert.throws(() => verifyPublished({
    version: "1.0.0",
    tag: "v1.0.0",
    manifest: manifestPath,
  }, { runner: staleNpm }), /npm version 0\.9\.0/);
});

test("publish workflow uses OIDC trusted publishing and avoids long-lived npm tokens", () => {
  const workflowPath = path.resolve(".github", "workflows", "publish.yml");
  const workflowText = fs.readFileSync(workflowPath, "utf8");
  const workflow = YAML.parse(workflowText);

  assert.equal(workflow.permissions.contents, "write");
  assert.equal(workflow.permissions["id-token"], "write");
  assert.equal(workflow.permissions.attestations, "write");
  assert.doesNotMatch(workflowText, /NPM_TOKEN|NODE_AUTH_TOKEN/);
  assert.match(workflowText, /npm publish .*--access public/);
  assert.match(workflowText, /attest-build-provenance/);
});

test("stable report schema is documented for 1.x", () => {
  const schemaDoc = fs.readFileSync(path.resolve("docs", "REPORT-SCHEMA.md"), "utf8");
  const stableFields = [
    "schemaVersion",
    "overallStatus",
    "passed",
    "checks",
    "blockers",
    "warnings",
    "coverageGaps",
    "audit",
    "agentRisk",
    "standards",
    "evidenceLevel",
  ];
  const report = buildJsonReport({
    root: "C:/project",
    mode: { strict: true, release: true, production: true },
    probe: {},
    checks: [{ name: "package test", group: "tests", status: "pass", blocking: false }],
    toolVersions: {},
    invalidExceptions: [],
    audit: { profile: {}, plan: [], evidence: [], coverageGaps: [], userDecisions: [] },
    agentRisk: { status: "N/A", surfaces: [], findings: [], coverageGaps: [] },
  });

  for (const field of stableFields) {
    assert.equal(schemaDoc.includes(`\`${field}\``), true);
  }
  assert.equal(Object.hasOwn(report, "schemaVersion"), true);
  assert.equal(Object.hasOwn(report, "overallStatus"), true);
  assert.equal(Object.hasOwn(report, "audit"), true);
  assert.equal(Object.hasOwn(report, "agentRisk"), true);
  assert.equal(Object.hasOwn(report, "standards"), true);
  assert.equal(Object.hasOwn(report.checks[0], "evidenceLevel"), true);
});

test("release trust docs are linked from README and trust model", () => {
  const readme = fs.readFileSync(path.resolve("README.md"), "utf8");
  const trust = fs.readFileSync(path.resolve("TRUST.md"), "utf8");
  const releaseTrust = fs.readFileSync(path.resolve("docs", "RELEASE-TRUST.md"), "utf8");

  assert.match(readme, /How releases are trusted/);
  assert.match(readme, /docs\/RELEASE-TRUST\.md/);
  assert.match(readme, /SECURITY\.md/);
  assert.match(trust, /Release trust/);
  assert.match(releaseTrust, /Trusted Publishing/);
  assert.match(releaseTrust, /verify-release\.mjs/);
});
