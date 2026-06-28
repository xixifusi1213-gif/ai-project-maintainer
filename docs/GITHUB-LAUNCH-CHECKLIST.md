# GitHub Launch Checklist

These steps require GitHub UI access if `gh` is not authenticated locally.

## Repository About

Open the repository page and click the gear icon in the About panel.

Description:

```text
Production-readiness audit and CI gate for AI-coded projects.
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

Create release:

```text
Tag: v0.3.0
Title: v0.3.0: Production audit intake and gate for AI-coded projects
```

Release notes:

```text
## Highlights

- Added `init-audit` to generate project profile and production evidence templates.
- Added `audit-plan` to produce project-specific production-readiness plans.
- Added `gate --production` to combine scanner evidence with production audit evidence.
- GitHub Actions can automatically enable production mode when `.ai-maintainer/project-profile.yml` exists.
- Reports now include `GAP`, `N/A`, and `USER_DECISION` production audit states.

## Verification

- npm test
- npm run check
- npm pack --dry-run
```

## First Launch Posts

Use `docs/PROMOTION.md` for English and Chinese launch copy.
