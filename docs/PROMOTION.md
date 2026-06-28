# Promotion Kit

Use this after the repository has npm, CI, Security workflow, demo, license, social preview, and a release.

## Account Boundary

I can prepare posts, screenshots, demos, titles, and issue text. Posting to external communities still needs an account controlled by the maintainer.

You do not need every account on day one. Start with channels you can control:

- GitHub README
- GitHub Release
- npm package page
- direct link to the demo case

When you later create accounts for V2EX, Hacker News, Reddit, X/Twitter, Zhihu, or Juejin, reuse the drafts below.

## GitHub About

Description:

```text
Production-readiness audit and CI gate for AI-coded projects.
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
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v0.4.0
Demo case: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/demo-output/before-after-case.md
```

## English Short Post

```text
I built AI Project Maintainer: a production-readiness gate for AI-coded projects.

AI writes code fast, but shipping safely still needs tests, security checks, release evidence, monitoring gaps, and maintainer decisions.

The demo shows a broken before state, failing business tests, the fixed after state, a production gate report, and a green GitHub Security workflow.

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
```

## Show HN

Title:

```text
Show HN: AI Project Maintainer - production-readiness gate for AI-coded projects
```

Body:

```text
I built a local/CI gate for AI-coded projects.

The idea is simple: AI can write code quickly, but the hard part is proving a project is ready enough to ship. This tool turns that into a repeatable loop:

project profile -> audit plan -> local/CI gate -> evidence report -> AI fixes -> rerun

It wraps common tools like Gitleaks, Trivy, Semgrep, OSV-Scanner, Syft, Grype, actionlint, and zizmor, but adds a production audit layer. It reports missing monitoring, release approval, database backup/rollback evidence, and business-flow test gaps as explicit GAP or USER_DECISION items.

The repo dogfoods itself with GitHub CI and a heavier Security workflow. There is also a runnable demo app showing a broken before state, failing business tests, the fixed after state, and the production gate report.

It is account-free by default. External APIs can be added later as optional user-provided evidence sources.

Feedback on the workflow and positioning would be very useful.
```

## Chinese Short Post

```text
我做了一个给 AI coding 项目的生产级半自动维护门禁：AI Project Maintainer。

AI 写代码很快，但上线前仍然需要业务测试、安全扫描、依赖审计、发布证据、监控告警、回滚策略和维护者判断。

这个工具把流程串成一条可重复链路：

项目画像 -> 审计计划 -> 本地/CI 门禁 -> 证据报告 -> Codex 修阻断项 -> 重新运行

现在仓库已经有 npm 包、真实 demo、CI badge、Security workflow，并且 demo 展示了 before 状态测试失败、修复后通过、生产 gate 报告 GAP 的完整闭环。

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
```

## V2EX / Zhihu / Juejin Outline

```text
标题：我做了一个给 AI coding 项目的生产级半自动维护门禁

1. 背景：AI 写代码变快后，维护、测试、安全和生产证据成了新的瓶颈。
2. 问题：个人开发者没有安全团队、SRE、DBA，但仍然要对上线负责。
3. 方案：把项目画像、审计计划、本地/CI 门禁和生产证据缺口串起来。
4. Demo：展示 broken before state、业务测试失败、修复后通过、gate --production 报告。
5. 边界：不是绝对安全，不替代最终人工审计，不托管用户数据。
6. 想要反馈：真实项目场景、缺失检查、误报、文档可读性、定位是否清楚。
```

## Reddit Targets

- `r/SideProject`
- `r/programming`
- `r/github`
- `r/devops`
- `r/LocalLLaMA`

Suggested title:

```text
I built a production-readiness gate for AI-coded projects
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
- [ ] 90-second GIF or recorded video exported from `docs/demo-output/90-second-demo.html`.
- [ ] First external post published by the maintainer.
