# Ghost Content API SQL injection advisory

Repository: [TryGhost/Ghost](https://github.com/TryGhost/Ghost)
Advisory: [GHSA-w52v-v783-gw97](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97)
Patch commit: [30868d632b22](https://github.com/TryGhost/Ghost/commit/30868d632b2252b638bc8a4c8ebf73964592ed91)
Fixed release: [v6.19.1](https://github.com/TryGhost/Ghost/releases/tag/v6.19.1)

| Stage | Overall Status | Passed | Why it matters |
| --- | --- | --- | --- |
| before | FAIL | no | The reviewed slug ordering path can construct SQL with user-controlled slug values instead of bindings. |
| after | PASS_WITH_GAPS | yes | The patch fixes the query construction issue, but backup, rollback, and deployed monitoring evidence are outside the OSS commit. |

This case stores links, metadata, and generated APM reports only. It does not vendor the upstream project source code.