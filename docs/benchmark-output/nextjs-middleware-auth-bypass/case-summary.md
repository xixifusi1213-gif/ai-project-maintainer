# Next.js middleware authorization bypass advisory

Category: web-api
Repository: [vercel/next.js](https://github.com/vercel/next.js)
Evidence: [GHSA-f82v-jwr5-mffw](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw)
Patch/hardening reference: [15.2.3](https://github.com/vercel/next.js/security/advisories/GHSA-f82v-jwr5-mffw)

| Stage | Overall Status | Passed | Primary signal |
| --- | --- | --- | --- |
| before | FAIL | no | Next.js 15.2.2 is within the benchmarked middleware authorization bypass range. |
| after | PASS_WITH_GAPS | yes | The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence. |

Repair-pack tasks from before report: 2
Auto-fix candidates: 2
Maintainer decisions: 0

This benchmark stores links, metadata, generated reports, and redacted snippets only. It does not vendor the upstream project or ship exploit code.