# Intake Schema

`.ai-maintainer/` 下的文件用于描述项目画像、生产证据、业务流程和风险策略。工具不会要求你把 token、密码、DSN 或云密钥写进仓库。

## project-profile.yml

描述项目类型和风险面：

```yaml
schema_version: 1
project:
  name: my-project
  type: auto
  lifecycle: development
  production: false
risk:
  handles_auth: false
  handles_sensitive_data: false
  handles_payments: false
  handles_financial_data: false
  handles_health_data: false
  has_database: auto
  has_deployment: false
  has_user_generated_content: false
```

常用取值：

- `type`: `auto`、`web`、`api`、`electron`、`node`、`generic`
- `has_database`: `auto`、`true`、`false`
- `production`: 项目是否已经或准备公开生产使用

## evidence-sources.yml

描述生产证据目前在哪里：

```yaml
schema_version: 1
evidence:
  github_actions: auto
  deployment:
    provider: none
    has_staging: false
    has_production: false
    production_requires_approval: false
  observability:
    errors: none
    logs: none
    metrics: none
    alerts: none
  database:
    migrations: auto
    review_tool: none
    backup_policy: none
    rollback_plan: none
```

这些字段可以写 `none`、`unknown`、`present`，也可以写系统名，例如 `sentry`、`grafana`、`bytebase`。

## connectors.yml

连接器配置只记录“从哪个环境变量读取 token”，不记录 token 值。

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
    organization: your-org
    project: your-project
  vercel:
    enabled: true
    token_env: VERCEL_TOKEN
    project_id: prj_xxx
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

v0.7.0 支持 GitHub、Sentry、Vercel、Grafana、Prometheus、Bytebase、Atlas 本地迁移 lint、Cloudflare Pages、Render 和 Fly。所有连接器都是可选、只读、用户自带 token。

## business-flows.yml

把核心业务流程写成可审查条目：

```yaml
business_flows:
  - id: save-project
    name: 保存项目
    criticality: high
    expected_behavior: 保存后重启应用，数据必须保持一致。
    tests:
      - test/save-project.test.mjs
```

如果没有填写真实流程，报告会给出 `USER_DECISION`。

## risk-policy.yml

默认策略：

```yaml
production:
  block_on_coverage_gaps: false
  block_on_user_decisions: false
  require_intake: false

production_evidence:
  block_on_missing_release_approval: false
  block_on_missing_error_monitoring: false
  block_on_missing_alerting: false
  block_on_missing_database_governance: false
  block_on_missing_deployment_evidence: false
  block_on_connector_auth_failure: false
```

如果项目已经接近生产发布，可以逐步把关键缺口设为阻断：

```yaml
production:
  block_on_coverage_gaps: true

production_evidence:
  block_on_missing_release_approval: true
  block_on_missing_error_monitoring: true
  block_on_missing_alerting: true
  block_on_missing_database_governance: true
  block_on_missing_deployment_evidence: true
```

## 状态含义

- `PASS`: 已检查并通过。
- `FAIL`: 已检查并失败，会阻断。
- `WARN`: 有风险或证据弱，默认不阻断。
- `GAP`: 缺少证据，默认不阻断。
- `N/A`: 不适用于该项目。
- `USER_DECISION`: 需要维护者判断或确认。
