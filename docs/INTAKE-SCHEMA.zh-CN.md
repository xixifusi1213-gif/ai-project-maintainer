# Intake 配置说明

`init-audit` 生成的文件用于告诉工具“这个项目是什么、有哪些资源、哪些风险需要重点审”。公开用户不需要提供所有资源，缺失项会作为 `GAP` 写入报告。

## project-profile.yml

```yaml
schema_version: 1
project:
  name: ""
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

建议：

- `type` 可以保持 `auto`，工具会自动识别 Electron、Web、API、Node 或通用项目。
- `has_database` 可以保持 `auto`，工具会根据 migration、Prisma、Drizzle、SQL 等文件推断。
- 涉及登录、权限、支付、财务、隐私数据时，要把对应字段改为 `true`。

## evidence-sources.yml

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

这里不要写密钥。只写证据类型，例如：

```yaml
observability:
  errors: sentry
  logs: vercel
  metrics: grafana
  alerts: email
```

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

默认：

```yaml
production:
  block_on_coverage_gaps: false
  block_on_user_decisions: false
  require_intake: false
```

如果你希望生产证据缺口也直接失败：

```yaml
production:
  block_on_coverage_gaps: true
```

## 状态含义

- `PASS`：已检查并通过。
- `FAIL`：已检查并失败。
- `WARN`：有风险但默认不阻断。
- `GAP`：缺少证据，无法判断。
- `N/A`：该项目不适用。
- `USER_DECISION`：需要项目负责人判断。
