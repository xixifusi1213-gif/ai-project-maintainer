# Public Benchmark

The benchmark shows how AI Project Maintainer handles real open source risk patterns across project types.

It is not an exploit corpus and it does not claim any project is absolutely safe. It records public upstream evidence, generated APM reports, repair-pack tasks, and remaining production gaps. It does not modify upstream projects, vendor upstream source trees, ship exploit code, or claim upstream fixes were made by this tool.

The `before` and `after` states are generated benchmark reports from public evidence, sanitized snippets, patched versions, or hardening models. They are not pull requests or releases created by AI Project Maintainer.

Run it locally:

```powershell
npm run benchmark:verify
```

Generated reports are written to `reports/benchmark-cases/`. The committed launch snapshot is under `docs/benchmark-output/`.

## Cases

| Category | Case | Evidence type | Evidence |
| --- | --- | --- | --- |
| Electron desktop | SiYuan Electron RCE | advisory + patched release + hardening model | [GHSA-x63q-3rcj-hhp5](https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5) |
| Database | Ghost Content API SQL injection | advisory + patch commit + patched version | [GHSA-w52v-v783-gw97](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97) |
| Web/API | Next.js middleware authorization bypass | advisory + patched version | [GHSA-f82v-jwr5-mffw](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw) |
| CI / supply chain | tj-actions/changed-files compromise | advisory + CISA alert + hardening model | [GHSA-mrrh-fwg8-r2c3](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3), [CISA alert](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction) |
| OSS npm library | TanStack npm package compromise | postmortem + release workflow hardening model | [TanStack postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem) |

## Outputs

Each case writes:

- `before-security-report.json`
- `before-repair-pack/agent-tasks.json`
- `before-repair-pack/fix-plan.md`
- `after-security-report.json`
- `case-summary.md`

Some cases also have intermediate stages, such as `patched-release` for Electron runtime hardening.

## How To Read It

- `FAIL` means the benchmarked blocker was detected.
- `PASS_WITH_GAPS` means deterministic blockers are resolved, but production evidence still needs maintainer confirmation.
- `GAP` means evidence is missing or project-specific; it is not proof of safety.
- `auto_fix_candidate` tasks are suitable for an AI coding assistant to attempt.
- `manual_review_required` and `needs_maintainer_decision` tasks require maintainer judgment.

The benchmark intentionally keeps `GAP` visible after code or workflow fixes. That is the point: production maintenance is not only code correctness. AI repair-pack tasks can help fix deterministic blockers, but they must not invent production evidence or accept risk on behalf of a maintainer.
