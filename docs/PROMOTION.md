# Promotion Kit

Use this after npm, CI, the Security workflow, demo, license, social preview, and a release are ready.

## Account Boundary

I can prepare posts, screenshots, demos, titles, and issue text. Posting to external communities still needs an account controlled by the maintainer.

Start with channels you control:

- GitHub README
- GitHub Release
- npm package page
- direct link to the demo case
- direct link to the real-project smoke summary
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
Real project smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/REAL-PROJECT-SMOKE.md
Production gate research: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/PRODUCTION-GATE-RESEARCH.zh-CN.md
```

## English Short Post

```text
I built AI Project Maintainer v1.5.0: a production accident gate for AI-coded projects.

AI writes code fast, but production use still needs evidence for data boundaries, object-level authorization, critical business flows, database write safety, monitoring gaps, and maintainer decisions.

The first command is still:

npx ai-project-maintainer quickstart .

Quickstart is report-only by default. It detects the project profile, runs a lightweight gate, writes a short summary, and generates an AI repair-pack only when blockers exist.

v1.5.0 adds structured production accident checks for data exposure, authorization matrices, sensitive log boundaries, idempotency/replay safety, and business-flow abuse controls. Missing evidence becomes an explicit gap in quickstart and can become a blocker in the full production release gate.

PASS_WITH_GAPS is not a production safety guarantee. It means no quickstart blocker failed, while release evidence still needs maintainer confirmation.

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.5.0
Benchmark: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/BENCHMARK.md
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

v1.5.0 adds production accident checks for data exposure, object-level authorization, sensitive logs, business-flow idempotency, replay safety, database write safety, and abuse controls. PASS_WITH_GAPS is not a production safety guarantee; it means missing evidence stays visible instead of being mistaken for readiness.

Feedback on first-run friction, false positives, and which production evidence gaps are most useful would be very helpful.
```

## Chinese Short Post

```text
我做了 AI Project Maintainer v1.5.0：一个给 AI-coded 产品用的生产事故门禁。

AI 写代码很快，但真正上线还需要证明：用户数据边界清楚、对象级授权有测试、关键业务流不会重复扣费/重复发货、数据库写入有事务/唯一约束/恢复方案、监控告警和发布证据不是空白。

第一次使用仍然只需要：

npx ai-project-maintainer quickstart .

quickstart 默认只生成报告，不改项目配置。它会识别项目类型，跑轻量 gate，生成 summary；只有发现 blocker 时才生成 AI repair-pack。

v1.5.0 新增的是生产事故层：data-boundaries.yml、authz-matrix.yml、业务流幂等/重放/滥用控制、敏感日志边界、数据库写入安全。quickstart 会把缺口显示成 GAP；完整 production strict release gate 可以把缺证据变成 blocker。

PASS_WITH_GAPS 不是生产安全保证。它表示没有 quickstart blocker，但仍有生产证据或维护者决策缺口。

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.5.0
```

## V2EX / Zhihu / Juejin Outline

```text
标题：我做了一个给 AI-coded 产品用的生产事故门禁

1. 背景：AI coding 让一个人能做真实产品，但生产事故风险没有消失。
2. 问题：常见事故不是 0day，而是数据越权、敏感日志、重复扣费、数据库误操作、监控和回滚缺失。
3. 入口：第一次先跑 npx ai-project-maintainer quickstart .
4. 输出：项目类型、轻量检查、summary；有 blocker 时自动生成 AI repair-pack。
5. v1.5.0：新增 data-boundaries.yml、authz-matrix.yml、业务流幂等/重放/滥用控制。
6. 边界：PASS_WITH_GAPS 不是生产安全保证；缺证据不能当成通过。
7. 想要反馈：哪些 gap 有用，哪些太吵，报告是否能交给 Cursor / Claude Code / Cline / Codex。
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

## Launch Checklist

- [x] GitHub About description updated.
- [x] Topics added.
- [x] Social preview uploaded.
- [x] npm package published.
- [x] CI badge is green.
- [x] Security badge is green.
- [x] Real demo link works.
- [x] Before/after case exists.
- [x] Real project smoke summary exists.
- [x] Quickstart feedback issue template exists.
- [ ] v1.5.0 release published.
- [ ] First external post published by the maintainer.
