# tj-actions/changed-files supply-chain compromise

Category: ci-supply-chain
Repository: [tj-actions/changed-files](https://github.com/tj-actions/changed-files)
Evidence: [GHSA-mrrh-fwg8-r2c3](https://github.com/advisories/GHSA-mrrh-fwg8-r2c3)
Evidence type: advisory + CISA alert + hardening model
Patch/hardening reference: [workflow-hardening](https://www.cisa.gov/news-events/alerts/2025/03/18/supply-chain-compromise-third-party-tj-actionschanged-files-cve-2025-30066-and-reviewdogaction)

| Stage | Overall Status | Passed | Primary signal |
| --- | --- | --- | --- |
| before | FAIL | no | Workflow uses the compromised changed-files action version with broad workflow permissions. |
| after | PASS_WITH_GAPS | yes | The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence. |

Repair-pack tasks from before report: 2
Auto-fix candidates: 2
Maintainer decisions: 0

This benchmark stores links, metadata, generated reports, and redacted snippets only. It does not modify upstream projects, vendor upstream source trees, ship exploit code, or claim upstream fixes were made by this tool.