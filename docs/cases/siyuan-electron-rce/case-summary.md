# SiYuan Electron RCE advisory

Repository: [siyuan-note/siyuan](https://github.com/siyuan-note/siyuan)
Advisory: [GHSA-x63q-3rcj-hhp5](https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5)
Patch commit: [bb326aa992b2](https://github.com/siyuan-note/siyuan/commit/bb326aa992b26096eedea64b69b182c3d2449681)
Fixed release: [v3.6.4](https://github.com/siyuan-note/siyuan/releases/tag/v3.6.4)

| Stage | Overall Status | Passed | Why it matters |
| --- | --- | --- | --- |
| before | FAIL | no | APM found dangerous Electron settings: nodeIntegration: true, contextIsolation: false, webSecurity: false. |
| patched-release | FAIL | no | APM found dangerous Electron settings: nodeIntegration: true, contextIsolation: false, webSecurity: false. |
| after | PASS_WITH_GAPS | yes | The case proves the code review signal, but deployment monitoring and release approval remain project-specific evidence. |

This case stores links, metadata, and generated APM reports only. It does not vendor the upstream project source code.