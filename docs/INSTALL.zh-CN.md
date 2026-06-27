# AI Project Maintainer 使用说明

## 这是什么

`ai-project-maintainer` 是一个给 AI coding 项目使用的 Codex skill 和本地安全门禁工具包。

它的目标不是保证项目绝对安全，而是把常见、靠谱、可重复的发布前检查串起来：测试、secret、依赖漏洞、静态安全扫描、Trivy、Electron 风险、数据库迁移、IaC、CI 配置和报告输出。

## 从 GitHub 安装到 Codex Skills

推荐用 Git 克隆，后续升级更方便：

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

如果你是下载 ZIP，解压后进入解压目录，再执行同样的复制命令。

复制后目录应类似：

```text
C:\Users\<你的用户名>\.codex\skills\ai-project-maintainer\SKILL.md
C:\Users\<你的用户名>\.codex\skills\ai-project-maintainer\scripts\run-local-gate.mjs
C:\Users\<你的用户名>\.codex\skills\ai-project-maintainer\references\
```

复制完成后重启 Codex。

## 在 Codex 里使用

在你的项目线程里输入：

```text
$ai-project-maintainer 对这个项目运行严格本地安全门禁，发现阻断项就帮我修到通过。
```

也可以指定路径：

```text
$ai-project-maintainer 审查 E:\我的项目，按严格发布门禁检查。
```

## 直接用命令运行

先检查本机环境：

```powershell
node .\ai-project-maintainer\scripts\doctor.mjs
```

给一个项目初始化安全配置：

```powershell
node .\ai-project-maintainer\scripts\init-project.mjs "E:\我的项目"
```

普通采用期门禁：

```powershell
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\我的项目"
```

发布前严格门禁：

```powershell
node .\ai-project-maintainer\scripts\run-local-gate.mjs "E:\我的项目" --strict --release --output reports/security-report.json
```

查看报告摘要：

```powershell
node .\ai-project-maintainer\scripts\report-summary.mjs "E:\我的项目\reports\security-report.json"
```

## 初始化会生成什么

`init-project.mjs` 会创建：

```text
.ai-maintainer/policy.yml
.ai-maintainer/exceptions.yml
.github/workflows/security-gate.yml
reports/.gitkeep
```

它不会覆盖你已经手工修改过的同名文件。

如果还想生成 pre-commit 起步配置：

```powershell
node .\ai-project-maintainer\scripts\init-project.mjs "E:\我的项目" --pre-commit
```

## 安装本地扫描工具

这个工具包默认不需要账号。常用扫描器可以装到本机：

```powershell
powershell -ExecutionPolicy Bypass -File .\ai-project-maintainer\scripts\bootstrap-local-tools.ps1 -Tools gitleaks,trivy,semgrep,checkov
```

工具作用：

- `gitleaks`：检查密钥、token、私钥泄露。
- `trivy`：检查依赖漏洞、secret、配置风险。
- `semgrep`：静态代码安全扫描。
- `osv-scanner`：依赖漏洞补充扫描。
- `actionlint`、`zizmor`：GitHub Actions 语法和安全风险。
- `syft`、`grype`：SBOM 和供应链漏洞。
- `checkov`：Terraform、Kubernetes 等 IaC 安全检查。
- `squawk`：SQL migration 风险检查。

Trivy 第一次运行需要下载漏洞数据库。如果网络访问不到数据库源，严格模式会失败。这是合理的，因为依赖漏洞覆盖不完整。

## 通过、失败、覆盖缺口

通过表示：当前启用的检查没有发现阻断项。

失败表示：发现真实阻断问题，或严格模式下关键工具缺失，或工具可用但漏洞库/扫描能力不可用。

覆盖缺口表示：某个风险面没有被完整检查。例如缺少工具、没有可扫描的 migration 文件，或当前项目没有对应技术栈。

## 分享给同学

直接把仓库链接发给同学：

```text
https://github.com/xixifusi1213-gif/ai-project-maintainer
```

同学只需要：

1. 克隆或下载仓库。
2. 复制 `ai-project-maintainer` 文件夹到自己的 `.codex/skills/`。
3. 重启 Codex。
4. 在自己的项目里运行 `$ai-project-maintainer` 或直接运行 CLI。

## 推荐维护循环

1. 新项目先运行 `doctor.mjs` 和 `init-project.mjs`。
2. 开发期运行普通门禁，先看阻断项和覆盖缺口。
3. 发布前运行 `--strict --release`。
4. 失败就修复，重新跑，直到通过。
5. 每次发现新的 bug 类型，就把它沉淀成项目测试、策略或 CI 门禁。
