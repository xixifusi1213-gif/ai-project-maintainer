# AI Project Maintainer Benchmark Summary

This benchmark uses public OSS advisories, releases, postmortems, and generated APM reports. It is not an exploit corpus and does not claim any project is absolutely production-safe.

| Case | Project type | Before | Auto-fix tasks | Manual review tasks | User decisions | After | Remaining gaps |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SiYuan Electron RCE advisory | electron-desktop | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |
| Ghost Content API SQL injection advisory | database | FAIL | 0 | 2 | 0 | PASS_WITH_GAPS | 1 |
| Next.js middleware authorization bypass advisory | web-api | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |
| tj-actions/changed-files supply-chain compromise | ci-supply-chain | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |
| TanStack npm package compromise postmortem | oss-library | FAIL | 2 | 0 | 0 | PASS_WITH_GAPS | 1 |

Run locally with:

```powershell
npm run benchmark:verify
```