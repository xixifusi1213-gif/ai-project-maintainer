# Live Connector Validation

这个页面用于维护者自己验证 v0.7.0 的生产证据连接器。普通 CI 不需要真实平台 token；live 验证适合在发布前、维护者本机或带 secrets 的私有 CI 中手动运行。

## 原则

- token 由用户自己提供，工具不托管账号。
- token 只放环境变量或 CI secrets，不写进仓库。
- 连接器只读，不部署、不回滚、不修改环境变量、不创建告警、不改数据库。
- 没有环境变量的平台输出 `SKIP`。
- API 不可读、401/403、工具缺失会进入 evidence，并默认记为 `GAP`。
- 只有 Atlas 会调用本地 CLI：`atlas migrate lint`。

## 运行命令

```powershell
npm run smoke:connectors:live -- "E:\my-project"
```

如果你在工具仓库自身验证：

```powershell
npm run smoke:connectors:live
```

## 环境变量示例

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

## 平台最小证据

| 平台 | 最小配置 | 需要的只读能力 | 通过条件 |
| --- | --- | --- | --- |
| GitHub | owner、repo、environment | 读取 repository environment 和 deployments | 环境可读；required reviewers 存在时审批证据 PASS |
| Sentry | organization、project | 读取 project 和 releases | 项目可读；有 release tracking 更强 |
| Vercel | project_id、可选 team_id | 读取 project 和 deployments | 找到 production deployment |
| Grafana | base_url | 读取 alert rules | 找到至少一条 alert rule |
| Prometheus | base_url | 读取 `/api/v1/rules` 和 `/api/v1/alerts` | 找到至少一条 alerting rule，当前 alert 状态可读 |
| Bytebase | base_url、project | 读取 project/database/issue/rollout | 找到数据库、issue 或 rollout 证据；失败 rollout 会 FAIL |
| Atlas | migrations_dir、dev_url_env | 本地 Atlas CLI 和一次性 dev DB | `atlas migrate lint` 返回 0 |
| Cloudflare Pages | account_id、project_name | 读取 Pages deployments | 找到部署记录 |
| Render | service_id | 读取 service 和 deploys | 找到最近 deploy，失败 deploy 会 FAIL |
| Fly | app_name | 读取 Machines | 找到 Machines；失败状态会 FAIL |

## 常见结果

- `PASS`：平台可读，并找到了目标证据。
- `WARN`：平台可读，但证据弱，例如没有告警规则或没有部署记录。
- `GAP`：未配置、缺 token、401/403、API 不可用、工具缺失。
- `FAIL`：明确发现不应发布的状态，例如 Atlas lint 失败、Bytebase rollout 失败、最新部署失败。
- `SKIP`：live smoke 中该 provider 没有启用或环境变量未设置。

## 不要这样做

- 不要把 token 粘贴给 AI。
- 不要把 token 写进 `.ai-maintainer/connectors.yml`。
- 不要用可写 token 做验证，除非平台没有只读 token 选项。
- 不要把真实生产数据库 URL 用作 `ATLAS_DEV_URL`。Atlas lint 应使用一次性开发数据库。
