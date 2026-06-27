# GitHub Actions 接入说明

生成 CI：

```powershell
npx ai-project-maintainer init "E:\我的项目" --profile oss --ci github
```

没有 npm 账号时，也可以从源码初始化：

```powershell
git clone https://github.com/xixifusi1213-gif/ai-project-maintainer.git
cd .\ai-project-maintainer
npm install
node .\ai-project-maintainer\scripts\init-project.mjs "E:\我的项目" --profile oss --ci github
```

生成的 `.github/workflows/security-gate.yml` 不要求工具包已经发布到 npm，也不需要 npm 账号。

CI 会先 checkout 你的项目，然后安装扫描器，再临时 clone 工具包仓库：

```bash
git clone --depth 1 https://github.com/xixifusi1213-gif/ai-project-maintainer.git "$RUNNER_TEMP/ai-project-maintainer"
cd "$RUNNER_TEMP/ai-project-maintainer"
npm ci --omit=dev || npm install --omit=dev
node "$RUNNER_TEMP/ai-project-maintainer/ai-project-maintainer/scripts/run-local-gate.mjs" "$GITHUB_WORKSPACE" --strict --release --output reports/security-report.json
```

CI 仍会上传：

```text
reports/security-report.json
reports/security-report.md
reports/security-report.sarif
reports/sbom.cdx.json
```

默认阻断项包括：测试/构建失败、secret 命中、生产依赖高危或严重漏洞、Semgrep 阻断发现、Trivy 严格模式不可用、Electron 危险配置、GitHub Actions 高风险配置。
