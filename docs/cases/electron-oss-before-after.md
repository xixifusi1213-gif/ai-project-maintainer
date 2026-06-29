# Electron OSS Before/After: SiYuan RCE Advisory

This case uses the public SiYuan advisory [GHSA-x63q-3rcj-hhp5](https://github.com/siyuan-note/siyuan/security/advisories/GHSA-x63q-3rcj-hhp5), the upstream patch commit [`bb326aa`](https://github.com/siyuan-note/siyuan/commit/bb326aa992b26096eedea64b69b182c3d2449681), and the [v3.6.4 release](https://github.com/siyuan-note/siyuan/releases/tag/v3.6.4).

The point is not to criticize the upstream project. The point is to show how APM separates three different facts:

- the vulnerable version had a real advisory
- the official patch can fix the reported vulnerability
- release-readiness may still need Electron runtime hardening and production evidence

## Reproduce

```powershell
npm run cases:verify
```

Reports are generated under:

```text
reports/oss-case-studies/siyuan-electron-rce/
```

Launch snapshots are committed here:

- [case summary](siyuan-electron-rce/case-summary.md)
- [before report](siyuan-electron-rce/before-report.md)
- [patched release report](siyuan-electron-rce/patched-release-report.md)
- [APM hardening report](siyuan-electron-rce/after-report.md)

## Outcome

| Stage | Result | Meaning |
| --- | --- | --- |
| before | `FAIL` | APM sees dangerous Electron runtime settings on the vulnerable ref. |
| patched release | `FAIL` | The official advisory patch is recognized, but Electron hardening still needs review. |
| APM hardening | `PASS_WITH_GAPS` | The Electron runtime baseline is hardened, while production evidence remains a gap. |

This is the honest behavior a maintenance gate should have: do not convert "CVE fixed" into "everything is production-ready."
