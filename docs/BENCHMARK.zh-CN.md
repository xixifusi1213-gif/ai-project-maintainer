# 公开 Benchmark

这个 benchmark 用真实开源风险模式展示 AI Project Maintainer 在不同项目类型中的表现。

它不是漏洞利用库，也不声称任何项目“绝对安全”。它记录公开上游证据、APM 生成的报告、repair-pack 任务，以及仍然需要维护者确认的生产证据缺口。它不会修改上游项目，不会打包上游源码树，不提交 exploit，也不声称上游修复是由本工具完成的。

`before` 和 `after` 状态是基于公开证据、脱敏片段、已修复版本或加固模型生成的 benchmark 报告，不是 AI Project Maintainer 给上游提交的 PR 或发布。

本地运行：

```powershell
npm run benchmark:verify
```

生成报告在 `reports/benchmark-cases/`。仓库提交的首版快照在 `docs/benchmark-output/`。

## 案例

| 类型 | 案例 | 证据类型 | 证据 |
| --- | --- | --- | --- |
| Electron 桌面 | SiYuan Electron RCE | advisory + patched release + hardening model | [GHSA-x63q-3rcj-hhp5](https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5) |
| 数据库 | Ghost Content API SQL injection | advisory + patch commit + patched version | [GHSA-w52v-v783-gw97](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97) |
| Web/API | Next.js middleware authorization bypass | advisory + patched version | [GHSA-f82v-jwr5-mffw](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) |
| CI / 供应链 | tj-actions/changed-files compromise | advisory + CISA alert + hardening model | [GHSA-mrrh-fwg8-r2c3](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3), [CISA alert](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction) |
| OSS npm library | TanStack npm package compromise | postmortem + release workflow hardening model | [TanStack postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem) |

## 输出

每个案例都会生成：

- `before-security-report.json`
- `before-repair-pack/agent-tasks.json`
- `before-repair-pack/fix-plan.md`
- `after-security-report.json`
- `case-summary.md`

部分案例还有中间阶段，例如 Electron 的 `patched-release`，用来说明“上游 CVE 修复”和“发布前运行时加固”不是同一件事。

## 如何理解

- `FAIL`：工具识别到了该案例中的阻断风险。
- `PASS_WITH_GAPS`：确定性的阻断项已解决，但生产证据仍需维护者确认。
- `GAP`：证据缺失或需要具体项目提供，不是安全证明。
- `auto_fix_candidate`：AI coding assistant 可以尝试修。
- `manual_review_required` 和 `needs_maintainer_decision`：必须由维护者判断。

benchmark 会故意保留 `GAP`，因为生产级维护不只是代码修好，还包括监控、回滚、审批、风险接受等证据。AI repair-pack 可以帮助修确定性的阻断项，但不能替维护者编造生产证据或接受风险。
