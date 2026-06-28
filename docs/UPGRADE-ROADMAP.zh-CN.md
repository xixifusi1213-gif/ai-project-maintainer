# 升级路线图

## v0.4.0：真实 demo 项目和重型安全 workflow

本阶段目标是把项目可信度从“有说明、有轻量 CI”提升到“陌生人能直接跑 demo，并且仓库自己跑重型安全证据链”。

已完成目标：

- 新增可复现的 `examples/demo-ai-app`，展示健康项目、坏掉的 before 状态、生产审查报告。
- 新增独立 `.github/workflows/security.yml`，安装并运行 Gitleaks、Trivy、Semgrep、OSV-Scanner、Syft、Grype、actionlint、zizmor、OpenSSF Scorecard 等安全工具。
- README 增加 Security badge 和 Real Demo 入口。
- Demo 文档改成基于真实项目，而不是纯文本示例。

阻断策略：

- 高置信风险阻断：测试、build、secret、Trivy high/critical、Semgrep blocking、actionlint、production gate。
- 可选生态信号先记录证据：OSV、Syft、Grype、zizmor、Scorecard。

后续还可以补：

- 90 秒 GIF/视频，演示 `before -> gate -> fix -> pass`。
- GitHub PR comment，把报告摘要直接写到 PR。
- 把稳定的可选检查逐步提升为阻断项。

## V2：开源维护者专业半自动平台

当前目标：

- 提供 npm/npx CLI。
- 保留 Codex skill 和旧 Node 脚本兼容。
- 使用插件化检查注册表。
- 使用 `yaml@2.9.0` 解析真实 YAML 配置。
- 生成 GitHub Actions、Dependabot、pre-commit 起步配置。
- 生成 JSON、Markdown、SARIF、SBOM 报告。
- 提供开源维护分。

V2 仍然免账号优先，不依赖 Bytebase、云、K8s、Sentry 或 Grafana。

## V3：平台证据接入

可选接入：

- Bytebase：SQL Review、审批流、发布状态。
- Sentry/Grafana/Loki/Datadog：发布后错误率、日志、trace 和事故时间线。
- 云平台：IAM、网络、安全组、公开入口。
- Kubernetes：RBAC、NetworkPolicy、PodSecurity、镜像和运行时风险。

这些能力需要账号或只读 token，所以不作为默认硬依赖。

## 不做

默认不做：

- 自动修改生产数据库。
- 主动攻击公网目标。
- 自动承担发布责任。
- 把扫描器二进制提交进仓库。
- 用 AI 替代维护者的最终判断。
