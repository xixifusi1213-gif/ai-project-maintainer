# 生产证据连接器

`ai-project-maintainer` 默认仍然免账号、本地优先。连接器是可选增强：当维护者愿意提供自己的只读 token 时，工具可以读取真实平台证据，而不是只依赖 intake YAML 里的人工声明。

## v0.7.0 已实现

所有连接器都需要用户显式启用，且只读：

| 平台 | 检查的证据 |
| --- | --- |
| GitHub Environments | 生产环境、required reviewers、部署记录 |
| Sentry | 错误监控项目、release tracking |
| Vercel | 生产部署记录 |
| Grafana | 告警规则 |
| Prometheus | 告警规则、当前告警状态 |
| Bytebase | project/database/issue/rollout 等数据库迁移治理证据 |
| Atlas | 本地 `atlas migrate lint`，使用一次性 dev 数据库 |
| Cloudflare Pages | Pages 部署记录 |
| Render | service 和最近 deploy 证据 |
| Fly | Machines 运行时证据 |

工具不会创建环境、告警、部署、回滚、issue、rollout、数据库或迁移。

## 安全边界

- token 只从环境变量读取。
- `.ai-maintainer/connectors.yml` 只写 `token_env`，不写 token 值。
- 报告会脱敏 token-like 字段，不输出 Authorization header。
- HTTP 连接器只发 `GET` 请求。
- Atlas 只跑本地 lint 命令，不接 Atlas Cloud。
- token 缺失、API 不可读、工具缺失默认记为 `GAP`。
- 只有用户在 risk policy 中显式开启，缺证据才会阻断发布。

## 配置方式

先初始化生产审查：

```powershell
npx ai-project-maintainer init-audit "E:\my-project"
```

然后编辑 `.ai-maintainer/connectors.yml`：

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

在本机或 CI secrets 中设置环境变量：

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

不要把这些值提交进仓库。

## 使用方式

只检查连接器配置，不调用平台 API：

```powershell
npx ai-project-maintainer connectors doctor "E:\my-project"
```

运行生产证据检查：

```powershell
npx ai-project-maintainer evidence "E:\my-project" --output reports/evidence-report.json
```

把平台证据并入生产门禁：

```powershell
npx ai-project-maintainer gate "E:\my-project" --production --connectors --strict --release --output reports/security-report.json
```

不加 `--connectors` 时，门禁仍然保持本地、免账号、不联网。

## 可选 live 验证

维护者设置好环境变量后，可以运行：

```powershell
npm run smoke:connectors:live -- "E:\my-project"
```

没有设置环境变量的平台会显示 `SKIP`，不会失败。真实平台返回的失败会进入 evidence。live smoke 还会检查输出里是否意外包含 token 值。

## 阻断策略

默认情况下，缺少平台证据只报告为 `GAP`，不会让命令失败。如果项目已经接近生产发布，可以在 `.ai-maintainer/risk-policy.yml` 中开启严格策略：

```yaml
production_evidence:
  block_on_missing_release_approval: true
  block_on_missing_error_monitoring: true
  block_on_missing_alerting: true
  block_on_missing_database_governance: true
  block_on_missing_deployment_evidence: true
  block_on_connector_auth_failure: true
```

建议只在确认相关平台账号和只读 token 已准备好时，再把这些缺口变成硬阻断。
