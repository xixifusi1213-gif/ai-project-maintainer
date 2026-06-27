# AI Project Maintainer 使用说明

## 这是什么

`ai-project-maintainer` 是一个给 AI coding 项目使用的 Codex skill 和本地安全门禁工具包。

它的目标不是保证项目绝对安全，而是把常见、可靠的发布前检查自动串起来，让你和同学不用一条条手工排查：

- 项目测试、E2E、构建、打包
- secret 泄露检查
- 依赖漏洞检查
- Semgrep 静态安全扫描
- Trivy 依赖、secret、配置扫描
- Electron 桌面应用 IPC、preload、更新、文件权限风险检查
- 数据库 migration、Docker、K8s、Terraform、CI 配置风险识别
- 通过、失败、覆盖缺口报告

## 从 GitHub 安装

打开仓库页面后，可以用两种方式获取：

1. 点 GitHub 的 `Code` -> `Download ZIP`，下载后解压。
2. 或者用 Git 克隆：

```powershell
git clone https://github.com/<owner>/ai-project-maintainer.git
```

然后把里面的 `ai-project-maintainer` 文件夹复制到 Codex skills 目录：

```powershell
Copy-Item -Recurse .\ai-project-maintainer "$env:USERPROFILE\.codex\skills\ai-project-maintainer"
```

目录最后应该类似：

```text
C:\Users\<你的用户名>\.codex\skills\ai-project-maintainer\SKILL.md
C:\Users\<你的用户名>\.codex\skills\ai-project-maintainer\scripts\run-local-gate.mjs
C:\Users\<你的用户名>\.codex\skills\ai-project-maintainer\references\
```

复制后重启 Codex。

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

第一次接入项目，先跑普通模式：

```powershell
node "$env:USERPROFILE\.codex\skills\ai-project-maintainer\scripts\run-local-gate.mjs" "E:\我的项目"
```

发布前跑严格模式：

```powershell
node "$env:USERPROFILE\.codex\skills\ai-project-maintainer\scripts\run-local-gate.mjs" "E:\我的项目" --strict --release
```

推荐流程：

1. 先跑普通模式，看缺哪些工具和覆盖哪些风险。
2. 修复明显问题。
3. 发布前跑 `--strict --release`。
4. 失败就继续修复。
5. 反复运行，直到通过。

## 安装本地扫描工具

这个工具包默认不需要账号。常用扫描工具可以安装到本机：

```powershell
powershell -ExecutionPolicy Bypass -File "$env:USERPROFILE\.codex\skills\ai-project-maintainer\scripts\bootstrap-local-tools.ps1" -Tools gitleaks,trivy,semgrep
```

工具作用：

- `gitleaks`：检查是否提交了密钥、token、私钥
- `trivy`：检查依赖漏洞、secret、配置风险
- `semgrep`：静态代码安全扫描

注意：Trivy 第一次运行需要下载漏洞数据库。如果网络访问不到数据库源，严格模式会失败。这是合理的，因为依赖漏洞检查没有完整覆盖。

## 通过、失败、覆盖缺口

通过表示：当前启用的检查没有发现阻断项。

失败表示：发现真实阻断问题，或者严格模式下关键工具缺失，或者工具可用但漏洞库、网络、扫描能力不可用。

覆盖缺口表示：某个风险面没有被完整检查。例如没有数据库 migration，就不会跑数据库 migration lint；没有 K8s/Terraform 文件，就不会跑对应配置扫描。

## 常见阻断项

这些通常应该阻断发布：

- 单元测试、E2E、构建、打包失败
- 提交了 secret、token、私钥
- 生产依赖存在高危或严重漏洞
- Electron 开启危险配置，例如 `nodeIntegration: true`
- Electron IPC 暴露任意文件读取、写入、删除能力
- 自动更新校验只信任远程文件里的 hash，没有独立信任链
- 数据库 migration 可能锁表、重写大表、不可回滚
- Docker/K8s/Terraform 暴露公网管理面、特权容器、明文密钥、过宽权限

## 账号是不是必须

不是。

本地安全门禁不需要 GitHub、Bytebase、云、K8s 或监控账号。

只有这些高级能力需要账号或环境：

- Bytebase：数据库发布平台、SQL Review、审批流
- 云平台：真实 IAM、网络、安全组检查
- K8s：真实集群状态、运行时事件
- Sentry/Grafana/Loki/Datadog：生产事故日志、监控、trace
- ZAP/Nuclei：对 staging URL 做主动动态扫描

没有这些账号时，工具包仍然能审代码、配置文件、依赖、secret、测试和打包流程。

## 分享给同学

直接把 GitHub 仓库链接发给同学即可。

同学只需要：

1. 下载或克隆仓库。
2. 复制 `ai-project-maintainer` 文件夹到自己的 `.codex/skills/`。
3. 重启 Codex。
4. 在自己的项目里运行 `$ai-project-maintainer`。

## 长期用法

每个项目都按这个循环维护：

1. 新功能写完后跑普通门禁。
2. 发现阻断项就修。
3. 每次发现新类型 bug，就补一个项目测试。
4. 发布前跑严格门禁。
5. 项目成熟后，把稳定命令接进 CI。

这个工具包不是一次性扫完就结束，而是每次失败都把风险变成测试、规则或流程。

