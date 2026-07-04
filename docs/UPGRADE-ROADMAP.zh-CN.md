# AI Project Maintainer 升级路线图

这份文档是后续规划的长期记忆。Codex 线程可能压缩、换线程或丢失上下文；以后继续开发时，应优先读取本文件，再读取 `TRUST.md`、`DESIGN.md` 和 `docs/STANDARDS-CROSSWALK.md`。

当前定位：

> 面向 AI coding 项目的生产级维护工作流：发布门禁、证据审查、AI 修复闭环。

工具不承诺“跑过就绝对生产安全”。它负责把生产级维护要求结构化、自动化、证据化；最终生产责任和风险接受仍在人类维护者。

## 已完成基线

### v0.9.0：AI Agent / MCP / Codex 使用风险检查

- 新增 `agent-risk` 命令，生成 `reports/agent-risk-report.json` 和 `reports/agent-risk-report.md`。
- `gate --agent-risk` 可把 AI agent 风险并入主发布门禁。
- 检查 MCP、Codex、Claude、Cursor、agent 配置中的过宽权限、明文 token、危险指令、prompt injection 文本和危险脚本。
- 本地只读，不调用 OpenAI/Codex API，不启动 MCP server，不执行项目脚本。
- 报告新增 `agentRisk` 字段，并映射到 OWASP LLM Top 10、OWASP Agentic AI、NIST SSDF、OWASP SAMM。

### v0.8.0：权威标准映射与信任证据层

- 新增 `TRUST.md`、`DESIGN.md`、`docs/STANDARDS-CROSSWALK.md`。
- 报告新增 `standards.sources`、`standards.mappings`、每个 check 的 `standardRefs`。
- 报告新增 `evidenceLevel`：`TOOL_VERIFIED`、`PLATFORM_VERIFIED`、`USER_REPORTED`、`INFERRED`、`GAP`。
- Markdown 报告新增 `Evidence Levels` 和 `Standards Crosswalk`。
- 明确标准映射不是认证、不是合规证明、不是安全保证。

### v0.7.0：可选生产证据连接器

- 新增 `.ai-maintainer/connectors.yml`，只记录 `token_env`、项目标识和开关，不记录 token 值。
- 新增 `connectors doctor`、`evidence`、`gate --production --connectors`。
- 完整实现 GitHub Environments、Sentry、Vercel、Grafana、Prometheus、Bytebase、Atlas 本地迁移 lint、Cloudflare Pages、Render、Fly。
- 连接器只读，不部署、不回滚、不改环境变量、不改数据库、不创建告警。
- 缺 token、认证失败、API 不可用默认记为 `GAP`，可由 `risk-policy.yml` 显式升级为阻断。

### v0.6.0：AI 辅助项目画像向导

- 新增 `init-audit --wizard`，用问答生成生产审查画像。
- 支持 `--lang zh-CN` 和 `--dry-run`。
- 新增 `.ai-maintainer/intake-summary.md`，区分用户确认事实、工具推断信号和仍需决策事项。
- CLI 不调用 OpenAI API；AI 辅助由 Codex 对话完成。

### v0.5.x：真实案例和展示可信度

- 新增真实 OSS before/after 案例：SiYuan Electron RCE、Ghost SQL injection。
- 新增 `npm run cases:verify`，本地生成案例报告。
- 不复制第三方完整源码，不发布 exploit，只保存链接、元数据和 APM 报告。
- 调整 SARIF 展示策略，避免把非阻断生产 GAP 变成 GitHub Code Scanning 的漏洞墙。

### v0.4.x：公开发布和首轮可信度

- 发布 npm 包和 `npx` CLI。
- 增加 CI、Security workflow、npm smoke、版本命令。
- 增加真实 demo app、重型安全 workflow 和 GitHub 展示素材。
- 明确 `PASS_WITH_GAPS` 表示“无阻断项但仍有生产证据缺口”，不是上线背书。

## 后续优先路线

### v0.10.0：项目类型 Profile 规则包

目标：从通用门禁升级为“按项目类型审查”。

第一批 profile：

- `electron-desktop`
- `nextjs-saas`
- `api-database`
- `cli-tool`
- `static-site`
- `browser-extension`

建议接口：

```powershell
npx ai-project-maintainer init "E:\my-project" --profile electron-desktop
npx ai-project-maintainer audit-plan "E:\my-project" --profile nextjs-saas
```

各 profile 的重点：

- Electron：IPC、preload、本地文件权限、自动更新、签名发布。
- Next.js/SaaS：登录、权限、支付回调、服务端边界、Sentry、部署回滚。
- API+DB：认证、授权、输入边界、数据库迁移、备份、回滚、并发写入。
- CLI：本地文件权限、token 处理、供应链、发布包可信度。
- Static site：构建、依赖、CSP、部署回滚。
- Browser extension：manifest 权限、content script、外部连接、token 存储。

### v0.11.0：Codex 修复任务包

目标：把报告从“发现问题”升级为“可交给 AI 修复的任务包”。

新增输出：

```text
reports/fix-plan.md
reports/codex-tasks.json
reports/recheck-commands.ps1
```

每个 blocker / high-value GAP 应包含：

- 修复目标。
- 影响文件或区域。
- 风险解释。
- 推荐验证命令。
- 是否需要用户判断。
- 修复后复跑命令。

原则：

- 生成任务，不自动修。
- AI 可以按任务修复，工具负责复验。
- 用户负责业务判断和风险接受。

### v0.12.0：真实案例库和公开 benchmark

目标：用可复现案例证明工具不是口号。

案例方向：

- Electron RCE / IPC 风险。
- SQL injection / migration 风险。
- GitHub Actions supply-chain 风险。
- secret 泄露。
- AI agent 权限误用。
- 缺监控导致事故不可见。

建议命令：

```powershell
npm run benchmark:cases
```

每个案例输出：

- before 发现什么。
- after 如何变化。
- 最终是 `PASS`、`PASS_WITH_GAPS` 还是 `FAIL`。
- 工具漏了什么。
- 哪些必须人工判断。

### v1.0.0：发布可信链与稳定接口

v1.0 不应只是再加功能，而应成为可信正式版。

目标：

- npm provenance。
- SLSA GitHub Actions provenance。
- SBOM 和 npm 包内容对齐。
- signed tag，或至少明确 tag / GitHub Release / npm 三方对齐验证。
- 报告 schema 稳定。
- CLI 命令稳定。
- 自己 dogfood 自己的 gate。
- `TRUST.md`、`DESIGN.md`、`STANDARDS-CROSSWALK.md` 完整并持续维护。

v1.0 宣传语：

> Release readiness gate for AI-coded projects.

## 暂不优先

- 付费云平台深度写操作。
- 自动部署、自动回滚、自动改数据库。
- 托管用户 token 或账号。
- 宣传为合规认证、安全保证、替代人工审计。
- 做复杂 GUI。短期继续优先 CLI、CI、Codex 工作流。

## 长期判断

这个项目的核心机会不在“替代 Semgrep、Trivy、CodeQL”，而在把成熟工具、生产证据、AI 修复流程和人类风险判断组织成一条可复用的维护链路。

最重要的差异化方向是：

1. AI agent 维护项目时的权限风险。
2. 生产证据可信度分层。
3. 项目类型专用审查规则。
4. 报告到 Codex 修复任务的闭环。
5. 真实案例库和可复现 benchmark。
