# GitHub Actions 接入说明

## 一键生成

在你的项目里运行：

```powershell
node .\ai-project-maintainer\scripts\init-project.mjs "E:\我的项目"
```

它会生成：

```text
.github/workflows/security-gate.yml
```

## CI 会做什么

默认 workflow 会：

- checkout 项目代码
- 安装 Node
- 根据 lockfile 安装项目依赖
- 安装常用安全扫描器
- 克隆公开的 `ai-project-maintainer` 工具包
- 运行严格发布门禁
- 上传 `reports/` 里的报告 artifact

阻断标准默认包括：

- 测试、构建、打包失败
- secret 扫描命中
- 高危或严重生产依赖漏洞
- Semgrep 阻断发现
- Trivy 数据库不可用
- Electron 危险配置
- GitHub Actions 高风险配置

## 为什么 CI 里还要克隆工具包

你的项目仓库一般只保留 `.ai-maintainer/policy.yml` 和 `.ai-maintainer/exceptions.yml`，不需要把整套工具包复制进去。

CI 运行时会临时克隆：

```text
https://github.com/xixifusi1213-gif/ai-project-maintainer
```

这样后续升级工具包时，不用改每个项目里的脚本。

## 常见调整

如果项目不用 Node，可以保留安全扫描步骤，把项目依赖安装和测试步骤改成自己的技术栈。

如果 CI 时间太长，可以先保留：

- Gitleaks
- Trivy
- Semgrep
- 项目测试/构建

等项目稳定后再打开 Syft、Grype、Checkov、zizmor 等增强检查。

## 报告在哪里

GitHub Actions 页面里会有一个 `security-reports` artifact，里面通常包含：

```text
security-report.json
security-report.md
security-report.sarif
sbom.cdx.json
```

`sbom.cdx.json` 只有 Syft 可用时才会生成。
