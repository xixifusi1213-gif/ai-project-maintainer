# TanStack npm package compromise postmortem

Category: oss-library
Repository: [TanStack/query](https://github.com/TanStack/query)
Evidence: [TanStack npm compromise postmortem](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem)
Patch/hardening reference: [release-trust-hardening](https://tanstack.com/blog/npm-supply-chain-compromise-postmortem)

| Stage | Overall Status | Passed | Primary signal |
| --- | --- | --- | --- |
| before | FAIL | no | Release workflow lacks the benchmarked post-compromise hardening controls. |
| after | PASS_WITH_GAPS | yes | The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence. |

Repair-pack tasks from before report: 2
Auto-fix candidates: 2
Maintainer decisions: 0

This benchmark stores links, metadata, generated reports, and redacted snippets only. It does not vendor the upstream project or ship exploit code.