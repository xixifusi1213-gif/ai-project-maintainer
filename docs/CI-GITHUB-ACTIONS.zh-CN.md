# GitHub Actions 接入说明

## 生成 CI

```powershell
npx ai-project-maintainer init "E:\我的项目" --profile oss --ci github
```

会生成：

```text
.github/workflows/security-gate.yml
.github/dependabot.yml
```

## CI 做什么

默认 workflow 会：

- checkout 项目代码。
- 安装 Node。
- 根据 lockfile 安装项目依赖。
- 安装常用安全扫描器。
- 运行 `npx ai-project-maintainer gate "$GITHUB_WORKSPACE" --strict --release --output reports/security-report.json`。
- 把 Markdown 报告写入 GitHub Step Summary。
- 尝试上传 SARIF 到 GitHub Code Scanning。
- 上传 `reports/` 作为 artifact。

## 阻断标准

默认阻断：

- 测试、构建、打包失败。
- secret 扫描命中。
- 生产依赖高危或严重漏洞。
- Semgrep 阻断发现。
- Trivy 数据库在严格模式下不可用。
- Electron 危险配置。
- GitHub Actions 高风险配置。

默认警告：

- OSV-Scanner、Syft、Grype、zizmor、Checkov、Scorecard、MegaLinter、pre-commit 等可选增强检查缺失或失败。

## 报告

CI 上传的 `security-reports` artifact 通常包含：

```text
security-report.json
security-report.md
security-report.sarif
sbom.cdx.json
```

`sbom.cdx.json` 只有 Syft 可用时生成。
