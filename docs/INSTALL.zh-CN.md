# AI Project Maintainer 使用说明

## 这是什么

`ai-project-maintainer` 是一个面向 AI coding 和开源项目维护者的半自动维护门禁。

它不会保证项目绝对安全，也不会替你完全自动维护生产项目。它负责把常见、专业、可重复的检查组织起来：测试、secret、依赖漏洞、静态安全扫描、CI 配置、SBOM、Electron 风险、数据库迁移风险、生产证据缺口和报告证据包。

## 推荐用法：npx

发布到 npm 后，可以这样使用：

```powershell
npx ai-project-maintainer doctor
npx ai-project-maintainer init "E:\我的项目" --profile auto --ci github
npx ai-project-maintainer init-audit "E:\我的项目" --wizard --lang zh-CN
npx ai-project-maintainer audit-plan "E:\我的项目" --output reports/audit-plan.json
npx ai-project-maintainer gate "E:\我的项目" --production --strict --release --output reports/security-report.json
npx ai-project-maintainer connectors doctor "E:\我的项目"
npx ai-project-maintainer evidence "E:\我的项目" --output reports/evidence-report.json
npx ai-project-maintainer summary "E:\我的项目\reports\security-report.json"
```

## 从源码运行

如果还没有 npm 版本，也可以从 GitHub 克隆后直接运行源码脚本：

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
npm install
node .\ai-project-maintainer\scripts\doctor.mjs
node .\ai-project-maintainer\scripts\init-project.mjs "E:\我的项目" --profile auto --ci github
node .\ai-project-maintainer\scripts\init-audit.mjs "E:\我的项目" --wizard --lang zh-CN
node .\ai-project-maintainer\scripts\audit-plan.mjs "E:\我的项目" --output reports/audit-plan.json
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\我的项目" --production --strict --release --output reports/security-report.json
```

## 安装为 Codex Skill

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

复制完成后重启 Codex，然后在项目线程中输入：

```text
$ai-project-maintainer 先为这个项目生成生产审查画像，再生成审计计划，最后运行生产级门禁并修复阻断项。
```

## 初始化项目

```powershell
npx ai-project-maintainer init "E:\我的项目" --profile auto --ci github --pre-commit
```

会生成：

```text
.ai-maintainer/policy.yml
.ai-maintainer/exceptions.yml
.github/workflows/security-gate.yml
.github/dependabot.yml
.pre-commit-config.yaml
reports/.gitkeep
```

生成的 GitHub Actions workflow 不要求工具包已经发布到 npm。CI 会临时 clone `https://github.com/xixifusi1213-gif/ai-project-maintainer.git`，然后用 `node` 运行仓库里的门禁脚本。

## 生产级审查

正式审查前先运行：

```powershell
npx ai-project-maintainer init-audit "E:\我的项目" --wizard --lang zh-CN
```

这会通过问答生成项目画像、证据来源、核心业务流程、风险策略、连接器配置模板、威胁模型、发布清单、事故手册、数据库迁移策略、观测性清单和 `intake-summary.md`。如果只想预览：

```powershell
npx ai-project-maintainer init-audit "E:\我的项目" --wizard --lang zh-CN --dry-run
```

用户需要填写业务判断和证据来源，例如：

- 这个项目是否有登录、权限、支付、财务、隐私数据。
- 核心业务流程是什么，哪些结果不能错。
- 是否有数据库、迁移、备份、回滚。
- 是否有 CI、发布审批、监控、日志、指标、告警。

再运行：

```powershell
npx ai-project-maintainer audit-plan "E:\我的项目" --output reports/audit-plan.json
npx ai-project-maintainer gate "E:\我的项目" --production --strict --release --output reports/security-report.json
```

默认情况下，缺少生产证据会标记为 `GAP`，不会直接失败。已经检查失败的高风险项仍然会失败，例如测试失败、secret 泄露、危险 Electron 配置、过期例外。

如果你已经有 GitHub Environments、Sentry、Vercel、Grafana、Prometheus、Bytebase、Atlas、Cloudflare Pages、Render 或 Fly，可以选择接入只读连接器：

```powershell
npx ai-project-maintainer connectors doctor "E:\我的项目"
npx ai-project-maintainer evidence "E:\我的项目" --output reports/evidence-report.json
npx ai-project-maintainer gate "E:\我的项目" --production --connectors --strict --release --output reports/security-report.json
```

连接器只读取平台证据，不部署、不回滚、不修改环境变量、不改数据库。token 只放在环境变量或 CI secrets 中，不要写进 `.ai-maintainer/connectors.yml`。v0.7.0 完整实现 GitHub、Sentry、Vercel、Grafana、Prometheus、Bytebase、Atlas 本地迁移 lint、Cloudflare Pages、Render 和 Fly。

如果希望缺少生产证据也阻断发布，在 `.ai-maintainer/risk-policy.yml` 设置：

```yaml
production:
  block_on_coverage_gaps: true
```

## 门禁状态

- `PASS`：已检查并通过。
- `FAIL`：已检查并失败。
- `WARN`：有风险但默认不阻断。
- `GAP`：缺少证据，无法判断。
- `N/A`：该项目不适用。
- `USER_DECISION`：需要项目负责人判断。

真正决定是否失败的是阻断项；维护分和生产证据缺口用于帮助你判断项目健康度。
