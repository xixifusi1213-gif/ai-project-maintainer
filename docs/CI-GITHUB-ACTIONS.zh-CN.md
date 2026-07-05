# GitHub Actions 接入说明

## 生成 CI

如果已经发布到 npm，可以用：

```powershell
npx ai-project-maintainer init "E:\我的项目" --profile auto --ci github
```

如果还没有 npm 账号或还没有发布 npm 包，也可以从源码运行初始化脚本：

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
npm install
node .\ai-project-maintainer\scripts\init-project.mjs "E:\我的项目" --profile auto --ci github
```

会生成：

```text
.github/workflows/security-gate.yml
.github/dependabot.yml
```

## CI 如何调用工具包

生成出来的 GitHub Actions 模板不依赖 npm 包发布，也不需要 npm 账号。

默认 workflow 会：

- checkout 你的项目代码。
- 安装 Node。
- 根据 lockfile 安装你的项目依赖。
- 安装常用安全扫描器。
- 临时 clone `https://github.com/xixifusi1213-gif/ai-project-maintainer.git` 到 runner。
- 在 runner 里安装工具包依赖。
- 如果项目存在 `.ai-maintainer/project-profile.yml`，自动追加 `--production`。
- 运行 `node "$RUNNER_TEMP/ai-project-maintainer/ai-project-maintainer/scripts/run-local-gate.mjs" "$GITHUB_WORKSPACE" --strict --release $EXTRA_FLAGS --output reports/security-report.json`。
- 把 Markdown 报告写入 GitHub Step Summary。
- 尝试上传 SARIF 到 GitHub Code Scanning。
- 上传 `reports/` 作为 artifact。

这意味着：只要你的工具包 GitHub 仓库是公开可 clone 的，同学的项目就能直接使用这套 CI 门禁，不需要你先发布 npm 包。

## 阻断标准

默认阻断：

- 测试、构建、打包失败。
- secret 扫描命中。
- 生产依赖高危或严重漏洞。
- Semgrep 阻断发现。
- Trivy 数据库在严格模式下不可用。
- Electron 危险配置。
- GitHub Actions 高风险配置。
- 过期或缺字段的例外。

默认不阻断：

- 缺少生产监控、日志、备份、回滚、发布审批等证据，报告中标记为 `GAP`。
- `USER_DECISION` 项，例如核心业务流程尚未由项目负责人确认。

如果希望生产证据缺口也阻断 CI，在 `.ai-maintainer/risk-policy.yml` 设置：

```yaml
production:
  block_on_coverage_gaps: true
```

## 报告

CI 上传的 `security-reports` artifact 通常包含：

```text
security-report.json
security-report.md
security-report.sarif
sbom.cdx.json
```

`security-report.md` 会包含 `Production Audit`、`Coverage Gaps` 和 `User Decisions`。
