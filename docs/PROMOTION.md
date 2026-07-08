# Promotion Kit

Use this after the repository has npm, CI, Security workflow, demo, license, social preview, and a release.

## Account Boundary

I can prepare posts, screenshots, demos, titles, and issue text. Posting to external communities still needs an account controlled by the maintainer.

Start with channels you control:

- GitHub README
- GitHub Release
- npm package page
- direct link to the demo case
- direct link to the real-project smoke summary

## GitHub About

Description:

```text
Release readiness gate for AI-coded projects.
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
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.4.4
Demo case: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/demo-output/before-after-case.md
Benchmark: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/BENCHMARK.md
Real project smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/REAL-PROJECT-SMOKE.md
```

## English Short Post

```text
I built AI Project Maintainer: a release readiness gate for AI-coded projects.

AI writes code fast, but shipping safely still needs tests, security checks, release evidence, monitoring gaps, and maintainer decisions.

The first command is now:

npx ai-project-maintainer quickstart .

It is report-only by default: detect the project profile, run a lightweight gate, write a short summary, and generate an AI repair-pack only when blockers exist. PASS_WITH_GAPS is not a production safety guarantee. It means quickstart found no blockers, but release evidence or maintainer decisions are still missing.

I also ran ai-project-maintainer@latest against public projects including p-limit, defu, cors, chalk, and execa. Four completed as PASS_WITH_GAPS; execa produced a real Semgrep child-process blocker for maintainer triage. That is the shape I want: low-friction first run, conservative blockers, and explicit gaps instead of false confidence.

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.4.4
Benchmark: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/BENCHMARK.md
Real project smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/REAL-PROJECT-SMOKE.md
```

## Show HN

Title:

```text
Show HN: AI Project Maintainer - quickstart gate for AI-coded projects
```

Body:

```text
I built a local/CI gate for AI-coded projects.

The idea is simple: AI can write code quickly, but the hard part is proving a project is ready enough to ship. This tool turns that into a repeatable loop:

project profile -> audit plan -> local/CI gate -> evidence report -> AI fixes -> rerun

The first command is now:

npx ai-project-maintainer quickstart .

Quickstart is intentionally low-friction and report-only. It detects the project profile, runs a lightweight gate, writes a short summary, and generates an AI repair-pack only when blockers exist.

It wraps tools like Gitleaks, Trivy, Semgrep, OSV-Scanner, Syft, Grype, actionlint, and zizmor, but adds a production audit layer. It reports missing monitoring, release approval, database backup/rollback evidence, and business-flow test gaps as explicit GAP or USER_DECISION items.

I ran the published npm package against five public projects. The command completed for all five; four reported PASS_WITH_GAPS with no repair pack, and one generated a repair pack for a code-level Semgrep blocker.

PASS_WITH_GAPS is not a production safety guarantee. It means no quickstart blocker failed, while release evidence still needs maintainer confirmation.

Feedback on the first-run report, false positives, and positioning would be very useful.
```

## Chinese Short Post

```text
我做了一个给 AI coding 项目的发布前维护门禁：AI Project Maintainer。

AI 写代码很快，但上线前仍然需要测试、安全检查、依赖审计、发布证据、监控告警、回滚策略和维护者判断。

现在陌生用户第一步只需要跑：

npx ai-project-maintainer quickstart .

它会自动识别项目类型，跑轻量 gate，生成简短 summary；只有发现 blocker 时才生成 AI repair-pack。PASS_WITH_GAPS 不是生产安全保证，只表示 quickstart 没发现阻断项，但仍有证据缺口或需要维护者确认的事项。

我也用 npm latest 跑了 5 个真实公开项目 smoke：p-limit、defu、cors、chalk、execa。5 个命令都能跑完，4 个是 PASS_WITH_GAPS，1 个因为 Semgrep 发现代码级 child_process 风险而生成 repair-pack。

GitHub: https://github.com/xixifusi1213-gif/ai-project-maintainer
npm: https://www.npmjs.com/package/ai-project-maintainer
Release: https://github.com/xixifusi1213-gif/ai-project-maintainer/releases/tag/v1.4.4
Benchmark: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/BENCHMARK.zh-CN.md
Real project smoke: https://github.com/xixifusi1213-gif/ai-project-maintainer/blob/main/docs/REAL-PROJECT-SMOKE.md
```

## V2EX / Zhihu / Juejin Outline

```text
标题：我做了一个给 AI coding 项目的发布前维护门禁

1. 背景：AI 写代码变快后，维护、测试、安全和生产证据成了新的瓶颈。
2. 问题：个人开发者和小团队不一定有安全团队、SRE、DBA，但仍然要对上线负责。
3. 入口：第一次先跑 npx ai-project-maintainer quickstart .，不用先理解完整 gate 链条。
4. 输出：项目类型、轻量检查、简短 summary；有 blocker 时自动生成 AI repair-pack。
5. 边界：PASS_WITH_GAPS 不是生产安全保证，不替代最终人工审查，不托管用户数据。
6. 真实 smoke：用 npm latest 跑 5 个公开项目，5 个命令都能完成，4 个无 blocker，1 个生成 repair-pack。
7. 想要反馈：报告是否看得懂、哪些 blocker 太严格、哪些 gap 表达不清、真实项目首跑是否顺畅。
```

## Reddit Targets

- `r/SideProject`
- `r/programming`
- `r/github`
- `r/devops`
- `r/LocalLLaMA`

Suggested title:

```text
I built a quickstart release-readiness gate for AI-coded projects
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
- [x] 90-second GIF exported from `docs/demo-output/90-second-demo.html`.
- [x] Real project smoke summary exists.
- [x] Quickstart feedback issue template exists.
- [ ] First external post published by the maintainer.
