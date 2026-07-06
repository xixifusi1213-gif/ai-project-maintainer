# GitHub Launch Checklist

These steps require GitHub UI access if `gh` is not authenticated locally.

## Repository About

Open the repository page and click the gear icon in the About panel.

Description:

```text
Release readiness gate for AI-coded projects.
```

Topics:

```text
ai-coding
devsecops
security
production-readiness
codex
github-actions
semgrep
trivy
gitleaks
ai-agents
```

## Social Preview

Upload a social preview image in repository settings.

Recommended source:

```text
assets/social-preview.png
```

Editable source:

```text
assets/social-preview.svg
```

If GitHub asks for PNG/JPG, export the SVG to PNG at `1280x640`.

## Release

Current release:

```text
Tag: v1.4.0
Title: v1.4.0: Quickstart first-run experience
```

Release URL:

```text
https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.4.0
```

Release asset checklist:

- [x] npm tarball
- [x] SBOM
- [x] `release-manifest.json`
- [x] `release-manifest.md`
- [x] security report JSON
- [x] security report Markdown
- [x] SARIF

## First Launch Posts

Use `docs/PROMOTION.md` for English and Chinese launch copy.
