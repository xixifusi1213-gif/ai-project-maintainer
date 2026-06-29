# Web/API/DB OSS Before/After: Ghost SQL Injection

This case uses the public Ghost advisory [GHSA-w52v-v783-gw97](https://github.com/TryGhost/Ghost/security/advisories/GHSA-w52v-v783-gw97), the upstream patch commit [`30868d6`](https://github.com/TryGhost/Ghost/commit/30868d632b2252b638bc8a4c8ebf73964592ed91), and the [v6.19.1 release](https://github.com/TryGhost/Ghost/releases/tag/v6.19.1).

The patch moves user-controlled ordering input from SQL string construction into parameterized bindings. APM turns that into a maintenance report: the blocking database query issue is gone, while deployment evidence remains visible.

## Reproduce

```powershell
npm run cases:verify
```

Reports are generated under:

```text
reports/oss-case-studies/ghost-sql-injection/
```

Launch snapshots are committed here:

- [case summary](ghost-sql-injection/case-summary.md)
- [before report](ghost-sql-injection/before-report.md)
- [after report](ghost-sql-injection/after-report.md)

## Outcome

| Stage | Result | Meaning |
| --- | --- | --- |
| before | `FAIL` | APM sees a database query construction risk on the vulnerable ref. |
| after | `PASS_WITH_GAPS` | The code-level blocker is fixed, but backup, rollback, and deployed monitoring evidence remain outside the OSS commit. |

This is the production-readiness distinction APM is designed to preserve: code repair is necessary, but production evidence still matters.
