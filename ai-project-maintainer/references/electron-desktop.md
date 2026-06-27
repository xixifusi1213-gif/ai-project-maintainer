# Electron Desktop Review

Use this reference when `electron` appears in dependencies, `BrowserWindow` is used, or files such as `main.js`, `preload.js`, or `renderer.js` exist.

## Blockers

Block release for:

- `nodeIntegration: true` in renderer windows.
- `contextIsolation: false`.
- `webSecurity: false` or `allowRunningInsecureContent: true`.
- IPC APIs that read, write, delete, execute, or open arbitrary caller-supplied paths.
- Preload APIs that expose broad filesystem, shell, child process, or network capabilities without per-operation authorization.
- Auto-update flows that trust a remote hash from the same mutable location as the update metadata.

## Review Checklist

- Main process owns privileged actions. Renderers request narrow operations.
- File import/export paths come from a main-process dialog or a short-lived path token created by the main process.
- IPC validates sender frame/origin, input schema, allowed path roots, and operation intent.
- `shell.openExternal` only opens validated `https:` URLs from allowlisted domains.
- Navigation and new-window handlers deny untrusted destinations.
- Preload exposes small, named commands instead of raw filesystem or shell primitives.
- Updates are signed or verified with a trust root not controlled by the update metadata source.
- Multi-window writes use revision checks, merge-by-scope, or conflict rejection in the main process.

## Useful Tests

- Renderer cannot read an arbitrary local file through import IPC.
- Renderer cannot write outside approved export locations.
- Main process rejects IPC from unexpected sender frames where feasible.
- Two windows saving stale snapshots cannot overwrite newer data without conflict detection.
- Update metadata without valid integrity/signature fails closed.

## Output Standard

For Electron findings, include:

- Exact exposed API or `BrowserWindow` setting.
- Attack precondition such as XSS, malicious import data, or compromised update metadata.
- Privilege gained by renderer code.
- Main-process authorization fix.
- Regression test to prove the privilege path is closed.
