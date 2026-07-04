# Production Evidence Connectors

`ai-project-maintainer` is account-free by default. Connectors are optional read-only evidence checks for maintainers who want the production audit to verify platform facts instead of relying only on intake YAML.

## What v0.7.0 Implements

All v0.7.0 connectors are opt-in and read-only:

| Provider | Evidence checked |
| --- | --- |
| GitHub Environments | Production environment, required reviewers, deployment records |
| Sentry | Error monitoring project and release tracking |
| Vercel | Production deployment records |
| Grafana | Alert rules |
| Prometheus | Alert rules and current alert state |
| Bytebase | Project/database/issue/rollout evidence for migration governance |
| Atlas | Local `atlas migrate lint` against a disposable dev database |
| Cloudflare Pages | Pages deployment records |
| Render | Service and latest deploy evidence |
| Fly | Machines runtime evidence |

The tool does not create environments, alerts, deploys, rollbacks, issues, rollouts, databases, or migrations.

## Security Model

- Tokens are read from environment variables only.
- `.ai-maintainer/connectors.yml` stores `token_env`, never token values.
- Reports redact token-like fields and never include Authorization headers.
- HTTP connectors use `GET` requests only.
- Atlas uses a local read-only lint command; it does not call Atlas Cloud.
- API failures, missing tokens, missing tools, or unreadable platforms become `GAP` by default.
- Missing evidence blocks only when your risk policy opts in.

## Configure

Run the normal production audit initialization:

```powershell
npx ai-project-maintainer init-audit "E:\my-project"
```

Then edit `.ai-maintainer/connectors.yml`:

```yaml
connectors:
  github:
    enabled: true
    token_env: GITHUB_TOKEN
    owner: your-org
    repo: your-repo
    environment: production

  sentry:
    enabled: true
    token_env: SENTRY_AUTH_TOKEN
    organization: your-sentry-org
    project: your-sentry-project
    base_url: https://sentry.io

  vercel:
    enabled: true
    token_env: VERCEL_TOKEN
    project_id: prj_xxx
    team_id: ""

  grafana:
    enabled: true
    token_env: GRAFANA_TOKEN
    base_url: https://grafana.example.com

  prometheus:
    enabled: true
    token_env: PROMETHEUS_BEARER_TOKEN
    base_url: https://prometheus.example.com

  bytebase:
    enabled: true
    token_env: BYTEBASE_TOKEN
    base_url: https://bytebase.example.com
    project: projects/my-project

  atlas:
    enabled: true
    migrations_dir: migrations
    dev_url_env: ATLAS_DEV_URL
    latest: 1

  cloudflare:
    enabled: true
    token_env: CLOUDFLARE_API_TOKEN
    account_id: xxx
    project_name: my-pages-project

  render:
    enabled: true
    token_env: RENDER_API_KEY
    service_id: srv_xxx

  fly:
    enabled: true
    token_env: FLY_API_TOKEN
    app_name: my-app
```

Set tokens in your shell or CI secrets:

```powershell
$env:GITHUB_TOKEN="..."
$env:SENTRY_AUTH_TOKEN="..."
$env:VERCEL_TOKEN="..."
$env:GRAFANA_TOKEN="..."
$env:PROMETHEUS_BEARER_TOKEN="..."
$env:BYTEBASE_TOKEN="..."
$env:ATLAS_DEV_URL="postgres://user:password@localhost:5432/dev"
$env:CLOUDFLARE_API_TOKEN="..."
$env:RENDER_API_KEY="..."
$env:FLY_API_TOKEN="..."
```

Do not commit these values.

## Run

Check connector configuration without calling the platform APIs:

```powershell
npx ai-project-maintainer connectors doctor "E:\my-project"
```

Run evidence checks:

```powershell
npx ai-project-maintainer evidence "E:\my-project" --output reports/evidence-report.json
```

Include connector evidence in the production gate:

```powershell
npx ai-project-maintainer gate "E:\my-project" --production --connectors --strict --release --output reports/security-report.json
```

Without `--connectors`, the gate stays local and account-free.

## Optional Live Validation

Maintainers can run a live smoke test after setting environment variables:

```powershell
npm run smoke:connectors:live -- "E:\my-project"
```

Missing environment variables are reported as `SKIP`, not failure. Real provider failures are reported in the evidence section. The live smoke also checks that token values do not appear in its output.

## Blocking Policy

By default, missing platform evidence is reported as `GAP` and does not fail the gate. To make specific production evidence mandatory, edit `.ai-maintainer/risk-policy.yml`:

```yaml
production_evidence:
  block_on_missing_release_approval: true
  block_on_missing_error_monitoring: true
  block_on_missing_alerting: true
  block_on_missing_database_governance: true
  block_on_missing_deployment_evidence: true
  block_on_connector_auth_failure: true
```

Use strict blocking only when the project is close to production release and the platform accounts are expected to exist.
