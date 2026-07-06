# SiYuan Electron RCE advisory

Category: electron-desktop
Repository: [siyuan-note/siyuan](https://github.com/siyuan-note/siyuan)
Evidence: [GHSA-x63q-3rcj-hhp5](https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5)
Patch/hardening reference: [bb326aa992b26096eedea64b69b182c3d2449681](https://github.com/siyuan-note/siyuan/commit/bb326aa992b26096eedea64b69b182c3d2449681)

| Stage | Overall Status | Passed | Primary signal |
| --- | --- | --- | --- |
| before | FAIL | no | Dangerous Electron settings remain: nodeIntegration: true, contextIsolation: false, webSecurity: false. |
| patched-release | FAIL | no | Dangerous Electron settings remain: nodeIntegration: true, contextIsolation: false, webSecurity: false. |
| after | PASS_WITH_GAPS | yes | The benchmark verifies the code or workflow signal, but deployed monitoring, rollback, and owner approval remain project-specific evidence. |

Repair-pack tasks from before report: 2
Auto-fix candidates: 2
Maintainer decisions: 0

This benchmark stores links, metadata, generated reports, and redacted snippets only. It does not vendor the upstream project or ship exploit code.