# AI Project Maintainer 使用说明

## 这是什么

`ai-project-maintainer` 是一个面向 AI coding 和开源项目维护者的半自动维护门禁。

它不会保证项目绝对安全，也不会替你完全自动维护生产项目。它负责把常见、专业、可重复的检查组织起来：测试、secret、依赖漏洞、静态安全扫描、CI 配置、SBOM、Electron 风险、数据库迁移风险和报告证据包。

## 推荐用法：npx

发布到 npm 后，推荐这样使用：

```powershell
npx ai-project-maintainer doctor
npx ai-project-maintainer init "E:\我的项目" --profile oss --ci github
npx ai-project-maintainer gate "E:\我的项目" --strict --release --output reports/security-report.json
npx ai-project-maintainer summary "E:\我的项目\reports\security-report.json"
```

## 从源码运行

如果你还没有用 npm 版本，也可以从 GitHub 克隆后直接运行源码脚本：

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
npm install
node .\ai-project-maintainer\scripts\doctor.mjs
node .\ai-project-maintainer\scripts\init-project.mjs "E:\我的项目" --profile oss --ci github
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\我的项目" --strict --release --output reports/security-report.json
```

## 安装为 Codex Skill

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

复制完成后重启 Codex，然后在项目线程中输入：

```text
$ai-project-maintainer 对这个项目运行严格安全门禁，发现阻断项就帮我修到通过。
```

## 初始化项目

```powershell
npx ai-project-maintainer init "E:\我的项目" --profile oss --ci github --pre-commit
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

重复运行不会覆盖你已经手工修改过的文件。

## 门禁通过和失败

通过表示当前启用的检查没有阻断项。

失败表示发现了阻断项，例如：

- 测试、构建或打包失败。
- secret 泄露。
- 生产依赖高危漏洞。
- Semgrep 阻断发现。
- Trivy 数据库在严格模式下不可用。
- Electron 危险配置。
- GitHub Actions 高风险配置。

缺少可选工具不会直接失败，会作为覆盖缺口和维护分扣分。

## 维护分

报告里会有 `0-100` 的开源维护分。它只帮助你判断项目健康度，不直接决定通过失败。

真正决定是否失败的是阻断项。
