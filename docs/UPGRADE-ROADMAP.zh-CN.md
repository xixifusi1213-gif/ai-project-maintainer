# 升级路线图

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

## V2 后续增强

优先增强：

- GitHub Action 独立发布，减少 workflow 中的安装成本。
- OpenSSF Scorecard 更细粒度解析。
- MegaLinter profile 配置模板。
- pre-commit 官方 hook 模板。
- SARIF 更精确定位到文件和行。
- 报告转 GitHub PR comment。

## V3：平台证据接入

可选接入：

- Bytebase：SQL Review、审批流、发布状态。
- Sentry/Grafana/Loki/Datadog：发布后错误率、日志、trace 和事故时间线。
- 云平台：IAM、网络、安全组、公开入口。
- Kubernetes：RBAC、NetworkPolicy、PodSecurity、镜像和运行时风险。

这些能力需要账号或只读 token，所以不作为 V2 硬依赖。

## 不做

默认不做：

- 自动修改生产数据库。
- 主动攻击公网目标。
- 自动承担发布责任。
- 把扫描器二进制提交进仓库。
- 用 AI 替代维护者的最终判断。
