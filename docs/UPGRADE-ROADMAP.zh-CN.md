# 升级路线图

## 第一阶段：免账号本地和 CI 门禁

当前版本优先实现：

- `doctor.mjs`：检查 Node、Git、包管理器和扫描器可用性。
- `init-project.mjs`：给任意项目生成 policy、exceptions、GitHub Actions 和报告目录。
- `run-local-gate.mjs`：运行本地门禁，输出 JSON、Markdown、SARIF。
- `report-summary.mjs`：读取 JSON 报告并打印摘要。
- Gitleaks、Trivy、Semgrep、OSV-Scanner、Syft、Grype、actionlint、zizmor、Checkov、Squawk 路由。
- Electron 危险配置和可疑 IPC 检查。
- policy 和 exceptions 机制。
- GitHub Actions 模板。

这个阶段不要求任何账号。

## 第二阶段：平台增强

后续可以增强：

- Bytebase：接入 SQL Review、审批流、发布状态。
- Atlas：schema diff 和 migration lint。
- 云平台：IAM、网络、安全组、公开入口检查。
- Kubernetes：集群实时状态、NetworkPolicy、RBAC、PodSecurity、镜像风险。
- Sentry/Grafana/Loki/Datadog：事故时间线、错误率、日志和 trace 证据。

这些能力通常需要账号、token 或只读权限，所以不作为第一阶段硬依赖。

## 第三阶段：修复辅助

可以继续做：

- 根据报告自动生成修复清单。
- 对安全 finding 生成最小补丁。
- 对重复 finding 自动建议项目测试。
- 给 GitHub issue 或 PR comment 输出结构化报告。
- 将 SARIF 上传到 GitHub Code Scanning。

默认仍应保持“先发现和阻断，再由人确认修复”的安全边界。

## 不做什么

第一阶段不做：

- GUI。
- 自动改生产数据库。
- 主动攻击公网目标。
- 把扫描器二进制提交进仓库。
- 要求用户必须有 Bytebase、云、K8s 或监控账号。
