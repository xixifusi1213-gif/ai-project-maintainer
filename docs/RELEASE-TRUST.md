# Release Trust

`ai-project-maintainer` checks release readiness for other projects, so its own releases must be traceable.

Starting with v1.0.0, releases are designed around a trusted publishing chain:

```text
Git tag -> GitHub Actions gate -> npm package -> SBOM -> release manifest -> GitHub Release
```

This is evidence, not a guarantee. It shows where the package came from and what checks ran before publication.

## Trusted Publishing Setup

The npm package should be configured with npm Trusted Publishing:

| Field | Value |
| --- | --- |
| Package | `ai-project-maintainer` |
| Publisher | GitHub Actions |
| GitHub owner | `xixifusi1213-gif` |
| GitHub repository | `ai-project-maintainer` |
| Workflow filename | `publish.yml` |
| Environment | empty |

The publish workflow does not use `NPM_TOKEN` or `NODE_AUTH_TOKEN`. npm receives an OpenID Connect identity from GitHub Actions and records provenance for the package.

## Release Artifacts

Each v1.0+ release should upload these files to GitHub Releases:

- npm tarball: `ai-project-maintainer-<version>.tgz`
- SBOM: `sbom.cdx.json`
- release manifest: `release-manifest.json`
- human-readable manifest: `release-manifest.md`
- security report: `security-report.json`, `security-report.md`, `security-report.sarif`

The release manifest records SHA256 hashes for the npm tarball, SBOM, and security report.

## Verification Commands

Before tagging:

```powershell
npm test
npm run check
npm run smoke:npm
npm run cases:verify
npm pack --dry-run
npm run release:verify:pre
```

After the GitHub publish workflow completes:

```powershell
npm view ai-project-maintainer version dist-tags --registry=https://registry.npmjs.org/ --json
npx ai-project-maintainer@1.1.0 --version
node ai-project-maintainer/scripts/verify-release.mjs --published --version 1.1.0 --tag v1.1.0 --manifest dist/release-manifest.json
```

## What This Does Not Prove

The release chain does not prove that every bug or vulnerability is absent. It proves that the published package is traceable to a GitHub tag, passed the repository gate, and has matching release evidence.
