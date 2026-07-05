# Project Profiles

Project profiles make the gate behave more like a specialist reviewer for the project in front of it.

The default is `--profile auto`: the tool detects local signals, chooses one main profile, and records the decision in the report.

## Supported Profiles

| Profile | Best for | Extra focus |
| --- | --- | --- |
| `electron-desktop` | Electron desktop apps | IPC/preload, local file access, shell/openExternal, auto-update trust, packaged release trust |
| `nextjs-web` | Next.js web apps | auth middleware, API routes, Server Actions, public env vars, headers/CORS/uploads, deployment evidence |
| `node-api` | Node API services | authz, input validation, rate limits, CORS, log redaction, API tests |
| `database-prisma` | Prisma-backed projects | schema and migrations, destructive changes, backups, rollback/forward-fix, transactions and concurrency |
| `oss-library` | npm libraries and CLIs | package metadata, license, README, CI, Scorecard, SBOM, provenance, SemVer, release notes |

Legacy `oss` is still accepted and maps to `oss-library`.

## Detection Priority

When multiple profiles match, the main profile is selected in this order:

```text
electron-desktop > database-prisma > nextjs-web > node-api > oss-library
```

The report still shows all matched signals so maintainers can spot mixed projects.

## Override Order

Profile selection is merged in this order:

```text
tool default policy < profile policy < .ai-maintainer/policy.yml < CLI --profile
```

Use `--profile auto` for normal use:

```powershell
npx ai-project-maintainer init ".\my-project" --profile auto --ci github
npx ai-project-maintainer audit-plan ".\my-project" --profile auto
npx ai-project-maintainer gate ".\my-project" --profile auto --production --agent-risk --strict --release
```

Use an explicit profile when auto-detection chooses the wrong main risk surface:

```powershell
npx ai-project-maintainer gate ".\my-project" --profile database-prisma --production --strict --release
```

Or pin it in `.ai-maintainer/policy.yml`:

```yaml
profile: database-prisma
mode: strict
```

## What Profiles Change

Profiles change:

- default check levels
- audit-plan emphasis
- wizard questions
- report risk focus
- recommended next steps

Profiles do not replace maintainer judgment. Business behavior, risk acceptance, and production responsibility still belong to the project owner.
