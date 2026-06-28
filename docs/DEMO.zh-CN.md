# 演示：从 AI coding 项目到生产审查报告

这个 demo 不需要付费账号，也不需要外部 API。

## 1. 初始化项目门禁

```powershell
npx ai-project-maintainer init "E:\我的项目" --profile oss --ci github
```

这会生成本地策略、例外文件、GitHub Actions、Dependabot 配置和报告目录。

## 2. 生成生产审查画像

```powershell
npx ai-project-maintainer init-audit "E:\我的项目"
```

这会生成：

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

这些文件只记录项目事实和证据来源，不应该写 token、DSN、密码或生产 secret。

## 3. 生成审计计划

```powershell
npx ai-project-maintainer audit-plan "E:\我的项目" --output reports/audit-plan.json
```

示例输出：

```text
PASS          生产审查画像已存在。
USER_DECISION 需要项目负责人声明核心业务流程。
GAP           没有 GitHub Actions 证据。
GAP           没有生产发布审批证据。
GAP           缺少错误监控证据。
N/A           没有检测到数据库。
```

重点不是假装项目安全，而是把“缺少哪些生产证据”明确写出来。

## 4. 运行生产级门禁

```powershell
npx ai-project-maintainer gate "E:\我的项目" --production --strict --release --output reports/security-report.json
```

报告会把确定性扫描结果和生产准备度证据合在一起：

```text
PASS gitleaks secret scan
PASS trivy filesystem scan
PASS semgrep static scan
GAP  缺少错误监控证据。
GAP  缺少生产日志证据。
USER_DECISION 需要声明核心业务流程。
```

查看 [示例报告](demo-output/security-report.md)。

## 5. 让 Codex 修阻断项

对 Codex 说：

```text
$ai-project-maintainer 对这个项目运行生产级门禁，修复阻断项，然后重新运行直到通过。
```

Codex 可以处理确定性的阻断项。项目负责人仍然负责核心业务流程、风险接受和生产证据判断。
