# 生产级半自动审查流程

这个流程面向个人开发者和 AI 协作维护生产级项目。目标不是证明项目绝对安全，而是把专业审查拆成可执行、可复查、可重复运行的证据链。

```text
项目画像 -> 资源清单 -> 审计计划 -> 门禁检查 -> 平台证据 -> AI 修复 -> 用户审批
```

## 1. 生成审查画像

推荐用向导生成 intake 文件：

```powershell
npx ai-project-maintainer init-audit "E:\我的项目" --wizard --lang zh-CN
```

也可以先预览，不写入文件：

```powershell
npx ai-project-maintainer init-audit "E:\我的项目" --wizard --lang zh-CN --dry-run
```

向导会生成：

```text
.ai-maintainer/project-profile.yml
.ai-maintainer/evidence-sources.yml
.ai-maintainer/business-flows.yml
.ai-maintainer/risk-policy.yml
.ai-maintainer/connectors.yml
.ai-maintainer/intake-summary.md
.ai-maintainer/threat-model.md
.ai-maintainer/release-checklist.yml
.ai-maintainer/incident-runbook.md
.ai-maintainer/db-migration-policy.yml
.ai-maintainer/observability-checklist.yml
```

这些文件记录项目事实、证据来源和风险策略。不要把 token、密码、DSN 或云凭证写进去。

## 2. 生成审计计划

```powershell
npx ai-project-maintainer audit-plan "E:\我的项目" --output reports/audit-plan.json
```

审计计划会说明：

- 哪些检查适用于当前项目。
- 哪些检查不适用，标记为 `N/A`。
- 哪些证据缺失，标记为 `GAP`。
- 哪些事项必须由项目负责人判断，标记为 `USER_DECISION`。

## 3. 执行本地生产门禁

```powershell
npx ai-project-maintainer gate "E:\我的项目" --production --strict --release --output reports/security-report.json
```

这一步保持免账号、本地优先。它会检查：

- 测试、E2E、build、dist。
- secret、依赖、SAST、供应链、CI、IaC。
- Electron IPC、preload、文件权限、更新机制。
- 数据库 migration、备份、回滚或 forward-fix 缺口。
- 监控、日志、指标、告警、发布审批等生产准备度缺口。

## 4. 可选：接入只读生产证据

如果项目已经有 GitHub Environments、Sentry 或 Vercel，可以用连接器把部分 `GAP` 变成真实证据。

先检查配置：

```powershell
npx ai-project-maintainer connectors doctor "E:\我的项目"
```

再运行证据检查：

```powershell
npx ai-project-maintainer evidence "E:\我的项目" --output reports/evidence-report.json
```

最后把证据并入生产门禁：

```powershell
npx ai-project-maintainer gate "E:\我的项目" --production --connectors --strict --release --output reports/security-report.json
```

v0.7.0 已完整实现 GitHub Environments、Sentry、Vercel、Grafana、Prometheus、Bytebase、Atlas 本地迁移 lint、Cloudflare Pages、Render 和 Fly。所有连接器都是可选、只读、用户自带 token；缺 token 或 API 不可读时默认记为 `GAP`。

## 5. 如何理解结果

- `PASS`：已检查并通过。
- `FAIL`：已检查并失败，通常需要修复。
- `WARN`：有风险或证据较弱，但默认不阻断。
- `GAP`：缺少证据，无法判断。
- `N/A`：当前项目不适用。
- `USER_DECISION`：需要项目负责人判断。

`PASS_WITH_GAPS` 不是“可以放心上线”。它只表示没有阻断项，但仍有生产证据缺口或用户决策事项。

## 6. 何时把 GAP 变成阻断

默认情况下，`GAP` 不阻断。正式生产发布前，可以在 `.ai-maintainer/risk-policy.yml` 中逐步开启：

```yaml
production:
  block_on_coverage_gaps: true

production_evidence:
  block_on_missing_release_approval: true
  block_on_missing_error_monitoring: true
  block_on_missing_deployment_evidence: true
  block_on_connector_auth_failure: true
```

建议先让报告稳定，再把关键证据缺口变成硬门禁。

## 7. 用户和 AI 的分工

用户负责：

- 定义核心业务流程。
- 判断哪些风险不能接受。
- 提供只读证据来源或说明。
- 审批发布和例外。

AI/Codex 负责：

- 解读画像和审计计划。
- 执行检查。
- 修复阻断项。
- 重新运行门禁。
- 把缺口整理成下一步清单。
