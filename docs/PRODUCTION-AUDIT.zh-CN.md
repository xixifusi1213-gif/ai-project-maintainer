# 生产级半自动审查流程

这个流程面向个人开发者和 AI 协作维护生产级项目。目标不是证明项目绝对安全，而是把专业审查拆成可执行的证据链：

```text
项目画像 -> 资源清单 -> 审计计划 -> 门禁检查 -> AI 修复 -> 用户审批
```

## 1. 生成审查画像

```powershell
npx ai-project-maintainer init-audit "E:\我的项目"
```

填写生成的文件：

```text
.ai-maintainer/project-profile.yml
.ai-maintainer/evidence-sources.yml
.ai-maintainer/business-flows.yml
.ai-maintainer/risk-policy.yml
.ai-maintainer/threat-model.md
.ai-maintainer/release-checklist.yml
.ai-maintainer/incident-runbook.md
.ai-maintainer/db-migration-policy.yml
.ai-maintainer/observability-checklist.yml
```

这些文件只记录证据来源和风险判断，不记录 token、密码、DSN 或云凭证。

## 2. 生成审计计划

```powershell
npx ai-project-maintainer audit-plan "E:\我的项目" --output reports/audit-plan.json
```

审计计划会说明：

- 哪些检查适用于当前项目。
- 哪些检查不适用，标记为 `N/A`。
- 哪些证据缺失，标记为 `GAP`。
- 哪些事项必须由项目负责人判断，标记为 `USER_DECISION`。

## 3. 执行生产门禁

```powershell
npx ai-project-maintainer gate "E:\我的项目" --production --strict --release --output reports/security-report.json
```

生产门禁会继续运行原有安全门禁，并额外加入生产准备度证据：

- 核心业务流程和测试覆盖。
- CI 和发布审批。
- 错误监控、日志、指标、告警。
- 数据库迁移、备份、回滚或 forward-fix。
- Electron IPC、preload、文件权限和更新机制。

## 4. 如何理解结果

- `PASS`：已检查并通过。
- `FAIL`：已检查并失败。
- `WARN`：有风险但默认不阻断。
- `GAP`：缺少证据，无法判断。
- `N/A`：该项目不适用。
- `USER_DECISION`：需要项目负责人判断。

默认情况下，`GAP` 不阻断；它代表“证据不足”，不是“安全”。如果你要把生产证据缺口作为硬门禁，设置：

```yaml
production:
  block_on_coverage_gaps: true
```

## 5. 用户和 AI 的分工

用户负责：

- 定义核心业务流程。
- 判断哪些风险不能接受。
- 提供只读证据来源或说明。
- 审批发布和例外。

AI/Codex 负责：

- 读取画像和审计计划。
- 执行检查。
- 修复阻断项。
- 重新运行门禁。
- 把缺口写成报告和下一步清单。
