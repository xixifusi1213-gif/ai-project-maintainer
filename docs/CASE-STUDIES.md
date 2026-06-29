# Real OSS Case Studies

These case studies use public open source advisories, releases, and patch commits. They are not synthetic demo bugs.

The repository does not vendor the upstream projects. The runner reads only pinned metadata and the small relevant upstream file path into a temporary workspace, then writes APM-style before/after reports.

Run them locally:

```powershell
npm run cases:verify
```

Generated reports are written to `reports/oss-case-studies/`. The committed reports under `docs/cases/` are the launch snapshots for readers who do not want to run anything first.

## Cases

| Case | Upstream evidence | APM result |
| --- | --- | --- |
| [SiYuan Electron RCE](cases/electron-oss-before-after.md) | [GHSA-x63q-3rcj-hhp5](https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5), [patch commit](https://github.com/siyuan-note/siyuan/commit/bb326aa992b26096eedea64b69b182c3d2449681), [v3.6.4 release](https://github.com/siyuan-note/siyuan/releases/tag/v3.6.4) | vulnerable and official patched release still fail APM Electron hardening; APM hardening becomes `PASS_WITH_GAPS` |
| [Ghost SQL injection](cases/ghost-sql-injection-before-after.md) | [GHSA-w52v-v783-gw97](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97), [patch commit](https://github.com/TryGhost/Ghost/commit/30868d632b2252b638bc8a4c8ebf73964592ed91), [v6.19.1 release](https://github.com/TryGhost/Ghost/releases/tag/v6.19.1) | vulnerable ref fails database query review; patched ref becomes `PASS_WITH_GAPS` |

## What This Proves

- The tool can explain real upstream security fixes in release-readiness language.
- A fixed CVE is not automatically a production-ready release: monitoring, rollback, approvals, and runtime hardening may still be gaps.
- AI/Codex can use the report as a repair loop: fix blockers, keep gaps visible, rerun.

## What This Does Not Do

- It does not ship exploit code.
- It does not claim the upstream projects are currently insecure.
- It does not replace each upstream maintainer's full security process.
- It does not copy complete third-party source trees into this package.
