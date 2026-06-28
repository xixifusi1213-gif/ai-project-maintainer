# Promotion Kit

Use these posts after the repository has README, license, demo, issue templates, and a release.

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

## English Short Post

```text
I built AI Project Maintainer: a production-readiness gate for AI-coded projects.

AI writes code fast, but shipping safely still needs tests, security checks, release evidence, monitoring gaps, and maintainer decisions.

This tool creates a project profile, generates an audit plan, runs local/CI gates, reports production evidence gaps, and lets Codex fix blockers until the release is defensible.

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
```

## Show HN

Title:

```text
Show HN: AI Project Maintainer – production-readiness gate for AI-coded projects
```

Body:

```text
I built a local/CI gate for AI-coded projects.

The idea is simple: AI can write code quickly, but the hard part is proving a project is ready enough to ship. This tool turns that into a repeatable loop:

project profile -> audit plan -> local/CI gate -> evidence report -> AI fixes -> rerun

It wraps common tools like Gitleaks, Trivy, Semgrep, OSV-Scanner, Syft, Grype, actionlint, zizmor, and Checkov, but adds a production audit layer. It reports missing monitoring, release approval, database backup/rollback evidence, and business-flow test gaps as explicit GAP or USER_DECISION items.

It is account-free by default. External APIs can be added later as optional user-provided evidence sources.

Feedback on the workflow and positioning would be very useful.
```

## Chinese Short Post

```text
我做了一个给 AI coding 项目的生产级半自动维护门禁：AI Project Maintainer。

它不是单纯安全扫描器，而是把项目画像、资源清单、审计计划、CI 门禁、生产证据缺口和 AI 修复串成一条链路。

流程是：
项目画像 -> 审计计划 -> 本地/CI 门禁 -> 证据报告 -> Codex 修阻断项 -> 重新运行

它会明确告诉你：
- 哪些检查通过了
- 哪些是阻断项
- 哪些生产证据缺失
- 哪些需要项目负责人判断

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
```

## V2EX / Zhihu Outline

```text
标题：我做了一个给 AI coding 项目的生产级半自动维护门禁

1. 背景：AI 写代码变快后，维护、测试、安全和生产证据成了新瓶颈。
2. 问题：个人开发者没有安全团队、SRE、DBA，但仍然要对上线负责。
3. 方案：把项目画像、审计计划、本地/CI 门禁和生产证据缺口串起来。
4. Demo：展示 init-audit、audit-plan、gate --production 的输出。
5. 边界：不是绝对安全，不替代最终人工审计，不托管用户数据。
6. 反馈：希望大家提真实项目场景、缺失检查、误报和改进方向。
```

## Reddit Targets

- `r/SideProject`
- `r/programming`
- `r/github`
- `r/LocalLLaMA`

Suggested title:

```text
I built a production-readiness gate for AI-coded projects
```

## Launch Checklist

- [ ] GitHub About description updated.
- [ ] Topics added.
- [ ] Social preview uploaded from `assets/social-preview.svg` or a PNG export.
- [ ] `v0.3.0` release created.
- [ ] Demo link works.
- [ ] README first screen explains the value in under 10 seconds.
