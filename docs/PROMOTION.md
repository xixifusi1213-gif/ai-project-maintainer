# Promotion Kit

Use this after npm, CI, the Security workflow, demo, license, social preview, and a release are ready.

## Account Boundary

I can prepare posts, screenshots, demos, titles, and issue text. Posting to external communities still needs an account controlled by the maintainer.

Start with channels you control:

- GitHub README
- GitHub Release
- npm package page
- demo case
- benchmark docs
- quickstart smoke summary
- production gate smoke summary
- quickstart feedback issues

## GitHub About

Description:

```text
Production maintenance gate for AI-coded projects.
```

Topics:

```text
ai-coding
devsecops
security
production-readiness
codex
github-actions
semgrep
trivy
gitleaks
ai-agents
```

## Links To Share

```text
GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.5.0
Demo case: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/demo-output/before-after-case.md
Benchmark: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/BENCHMARK.md
Quickstart smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/REAL-PROJECT-SMOKE.md
Production gate smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/PRODUCTION-GATE-SMOKE.md
Production gate research: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/PRODUCTION-GATE-RESEARCH.zh-CN.md
```

## Main CTA

First run:

```bash
npx ai-project-maintainer quickstart .
```

Strict release gate:

```bash
npx ai-project-maintainer gate . --profile auto --production --agent-risk --strict --release --output reports/security-report.json
```

## Positioning

AI Project Maintainer is not a vulnerability scanner pretending to be a compliance certificate. It is a local and CI production maintenance gate for AI-coded projects.

The core promise:

```text
AI-coded projects should not ship just because tests pass.
They need evidence for data boundaries, authorization, business-flow safety, database safety, release controls, and AI repair safety.
```

v1.5.0 adds a production accident / data exposure layer:

- data boundaries and sensitive fields;
- object-level authorization and tenant/owner boundaries;
- sensitive log redaction evidence;
- payment/order/webhook/cron/queue idempotency and replay safety;
- database write, migration, backup, rollback, and audit-log evidence;
- AI repair-pack boundaries that prevent agents from inventing evidence or removing controls to pass the gate.

## Trust Boundary

Use this wording consistently:

```text
The strict production gate surfaces release-blocking findings and production-readiness gaps.
Those findings are not automatically confirmed upstream vulnerabilities.
They need maintainer triage and project-specific context.
```

Avoid:

```text
Found vulnerabilities in mature projects.
```

Prefer:

```text
The v1.5.0 strict production gate did not rubber-stamp real public projects. It generated structured reports and surfaced release-blocking security findings and production-readiness gaps.
```

## English Short Post

```text
I released AI Project Maintainer v1.5.0: a production accident gate for AI-coded projects.

AI writes code fast, but production use still needs evidence: data boundaries, object-level authorization, critical business flows, database write safety, monitoring, release controls, and maintainer decisions.

The first command is still:

npx ai-project-maintainer quickstart .

Quickstart is report-only by default. It detects the project profile, runs a lightweight gate, writes a short summary, and generates an AI repair-pack only when blockers exist.

v1.5.0 adds a stricter production gate for data exposure, authorization matrices, sensitive log boundaries, idempotency/replay safety, database safety, and AI repair safety.

I also ran the published package against real public projects. The strict production gate did not rubber-stamp them; it surfaced release-blocking scanner findings and production-readiness gaps. These are not automatic vulnerability claims. They are maintainer-triage signals.

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.5.0
Production smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/PRODUCTION-GATE-SMOKE.md
```

## Show HN

Title:

```text
Show HN: Production accident gate for AI-coded projects
```

Body:

```text
I built AI Project Maintainer, a local/CI gate for AI-coded projects.

AI can write code quickly, but the hard part is proving a project is ready enough to ship. This tool turns that into a repeatable loop:

project profile -> production intake -> local/CI gate -> evidence report -> AI repair-pack -> rerun

The first command is:

npx ai-project-maintainer quickstart .

Quickstart is intentionally low-friction and report-only. It detects the project profile, runs a lightweight gate, writes a short summary, and generates an AI repair-pack only when blockers exist.

v1.5.0 adds production accident checks for data exposure, object-level authorization, sensitive logs, business-flow idempotency, replay safety, database write safety, and abuse controls.

The strict production gate is harder. In a post-release smoke against real public projects, it generated structured reports and surfaced release-blocking findings and production-readiness gaps. These are not automatic vulnerability disclosures; they are maintainer-triage signals.

Feedback on first-run friction, false positives, and which production evidence gaps are most useful would be very helpful.
```

## Chinese Short Post

```text
我发布了 AI Project Maintainer v1.5.0：一个给 AI-coded 产品用的生产事故门禁。

AI 写代码很快，但真实上线不能只看“测试过了”。还需要证明：用户数据边界清楚、对象级授权有测试、关键业务流不会重复扣费或重复执行、数据库写入有迁移/备份/回滚/审计证据、监控告警和发布控制不是空白。

第一次使用仍然只需要：

npx ai-project-maintainer quickstart .

quickstart 默认只生成报告，不改项目配置。它会识别项目类型，跑轻量 gate，生成 summary；只有发现 blocker 时才生成 AI repair-pack。

v1.5.0 新增的是生产事故层：data-boundaries.yml、authz-matrix.yml、业务流幂等/重放/滥用控制、敏感日志边界、数据库写入安全、AI 修复安全边界。

我也用 npm 公开版跑了真实公开项目的 strict production gate。结果不是“随便放行”，而是生成结构化报告，并暴露发布前必须处理的安全风险和生产证据缺口。注意：这些不是自动确认的上游漏洞，而是需要维护者结合项目上下文 triage 的 release-blocking findings。

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.5.0
Production smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/PRODUCTION-GATE-SMOKE.md
```

## V2EX / Zhihu / Juejin Outline

```text
标题：我做了一个给 AI-coded 产品用的生产事故门禁

1. 背景：AI coding 让一个人能做真实产品，但生产事故风险没有消失。
2. 问题：很多事故不是 0day，而是数据越权、敏感日志、重复扣费、数据库误操作、监控和回滚缺失。
3. 入口：第一次先跑 npx ai-project-maintainer quickstart .
4. 输出：项目类型、轻量检查、summary；有 blocker 时自动生成 AI repair-pack。
5. v1.5.0：新增 data-boundaries.yml、authz-matrix.yml、业务流幂等/重放/滥用控制、敏感日志边界、数据库写入安全。
6. 严格门禁：production strict release gate 会把缺证据和高风险发现变成 blocker。
7. 边界：PASS_WITH_GAPS 不是生产安全保证；strict gate findings 也不是自动确认的上游漏洞，需要维护者 triage。
8. 真实项目 smoke：npm 公开版可以在真实公开项目上生成结构化生产门禁报告，并暴露 release-blocking findings 和 production-readiness gaps。
9. 想要反馈：哪些 gap 有用，哪些太吵，报告是否能交给 Cursor / Claude Code / Cline / Codex。
```

## Reddit Targets

- `r/SideProject`
- `r/programming`
- `r/github`
- `r/devops`
- `r/LocalLLaMA`

Suggested title:

```text
I built a production accident gate for AI-coded projects
```

## Feedback CTA

Ask users to open a Quickstart feedback issue and paste only redacted summary data:

```text
Version:
Command:
Project type:
Status:
Blockers / warnings / gaps:
What was confusing or too strict:
```

For strict production gate feedback, ask for a redacted summary only:

```text
Version:
Command:
Profile:
Status:
Blocker classes:
Production evidence gaps:
Which findings were useful:
Which findings need clearer wording:
```

## Launch Checklist

- [x] GitHub About description updated.
- [x] Topics added.
- [x] Social preview uploaded.
- [x] npm package published.
- [x] CI badge is green.
- [x] Security badge is green.
- [x] Real demo link works.
- [x] Before/after case exists.
- [x] Real project quickstart smoke summary exists.
- [x] Production gate smoke summary exists.
- [x] Quickstart feedback issue template exists.
- [x] v1.5.0 release published.
- [ ] First external post published by the maintainer.
