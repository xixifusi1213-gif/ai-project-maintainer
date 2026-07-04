# 升级路线图

## v0.7.0：可选生产证据连接器

目标：把生产审查从“用户声明有证据”推进到“工具能读取用户自己平台上的只读证据”。

已完成：

- 新增 `.ai-maintainer/connectors.yml`，只记录 `token_env`、项目标识和开关，不记录 token 值。
- 新增 `connectors doctor`，用于检查连接器配置和环境变量是否准备好。
- 新增 `evidence` 命令，生成 `reports/evidence-report.json`。
- `gate --production --connectors` 可以把平台证据并入生产门禁报告。
- 完整实现 GitHub Environments、Sentry、Vercel、Grafana、Prometheus、Bytebase、Atlas 本地迁移 lint、Cloudflare Pages、Render 和 Fly。
- 新增 `npm run smoke:connectors:live`，用于维护者可选 live 验证。
- 连接器只读，不部署、不回滚、不改环境变量、不改数据库、不创建告警。
- 缺 token、认证失败、API 不可用默认记为 `GAP`，不阻断；用户可在 `risk-policy.yml` 中显式开启阻断。

## v0.6.0：AI 辅助项目画像向导

目标：把“手填 YAML”升级为“AI 辅助的专业项目画像访谈”。

- 新增 `init-audit --wizard`，用问答生成生产审查画像。
- 新增 `--lang zh-CN` 和 `--dry-run`，支持中文问题和无写入预览。
- 新增 `.ai-maintainer/intake-summary.md`，区分用户确认事实、工具推断信号和仍需决策事项。
- Codex skill 推荐先解释问题、逐段追问，再把确认内容落到 YAML。
- CLI 不调用 OpenAI API，不需要账号；AI 辅助由 Codex 对话完成。

## v0.5.0：真实开源 Before/After 案例

目标：把可信度从“可运行 demo”推进到“真实开源漏洞案例”。

- 新增 `docs/CASE-STUDIES.md`，集中展示真实 OSS advisory、release 和 patch commit。
- 新增 SiYuan Electron RCE 案例，展示“官方漏洞修复”和“Electron runtime release-readiness”不是同一件事。
- 新增 Ghost SQL injection 案例，展示数据库查询风险如何从 `FAIL` 变成 `PASS_WITH_GAPS`。
- 新增 `npm run cases:verify`，本地生成案例报告，并检查报告不包含 token、DSN、私有路径等敏感内容。
- 不复制第三方完整源码，不发布 exploit，只保存链接、元数据和 APM 报告。

## v0.4.x：首轮可信分发

- 发布 npm 包和 `npx` CLI。
- 增加 CI、Security workflow、npm smoke、版本命令。
- 增加真实 demo app、重型安全 workflow 和 GitHub 展示素材。
- 明确 `PASS_WITH_GAPS` 表示“无阻断项但仍有生产证据缺口”，不是生产上线背书。

## 后续方向

- v0.7.x：用真实维护者 token 做更多 live 验证记录，补充各平台最小权限示例。
- v0.8.x：细化连接器证据语义，例如部署回滚能力、Bytebase 审批策略、Grafana 联系点和通知策略。
- v0.9.x：优化报告解释和 AI 修复工作流，让用户更容易从 `FAIL/GAP/WARN` 走到可接受发布状态。

## 不做

- 不托管用户账号或 token。
- 不替用户做部署、回滚、数据库变更或云资源修改。
- 不宣传为绝对安全保证。
- 不替代高风险系统最终人工审计。
