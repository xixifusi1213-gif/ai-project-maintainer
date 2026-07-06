# AI Project Maintainer Benchmark Summary

This benchmark uses public OSS advisories, releases, postmortems, and generated APM reports. It is not an exploit corpus, does not modify upstream projects, and does not claim upstream fixes were made by this tool.

| Case | Project type | Evidence type | Before | Auto-fix tasks | Manual review tasks | User decisions | After | Remaining gaps |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| SiYuan Electron RCE advisory | electron-desktop | advisory + patched release + hardening model | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |
| Ghost Content API SQL injection advisory | database | advisory + patch commit + patched version | FAIL | 0 | 2 | 0 | PASS_WITH_GAPS | 1 |
| Next.js middleware authorization bypass advisory | web-api | advisory + patched version | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |
| tj-actions/changed-files supply-chain compromise | ci-supply-chain | advisory + CISA alert + hardening model | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |
| TanStack npm package compromise postmortem | oss-library | postmortem + release workflow hardening model | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |

Run locally with:

```powershell
npm run benchmark:verify
```