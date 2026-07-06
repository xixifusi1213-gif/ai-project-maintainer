# Ghost Content API SQL injection advisory

Category: database
Repository: [TryGhost/Ghost](https://github.com/TryGhost/Ghost)
Evidence: [GHSA-w52v-v783-gw97](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97)
Patch/hardening reference: [30868d632b2252b638bc8a4c8ebf73964592ed91](https://github.com/TryGhost/Ghost/commit/30868d632b2252b638bc8a4c8ebf73964592ed91)

| Stage | Overall Status | Passed | Primary signal |
| --- | --- | --- | --- |
| before | FAIL | no | User-controlled slug ordering can be interpolated into SQL instead of using bindings. |
| after | PASS_WITH_GAPS | yes | The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence. |

Repair-pack tasks from before report: 2
Auto-fix candidates: 0
Maintainer decisions: 0

This benchmark stores links, metadata, generated reports, and redacted snippets only. It does not vendor the upstream project or ship exploit code.