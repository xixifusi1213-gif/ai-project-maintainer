import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { detectProject } from "../ai-project-maintainer/scripts/lib/project-detect.mjs";
import { runElectronChecks } from "../ai-project-maintainer/scripts/lib/checks.mjs";

test("Electron check blocks dangerous settings and flags privileged IPC", () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "apm-electron-"));
  fs.writeFileSync(path.join(root, "package.json"), JSON.stringify({ devDependencies: { electron: "1.0.0" } }));
  fs.writeFileSync(
    path.join(root, "main.js"),
    [
      "const { BrowserWindow, ipcMain } = require('electron');",
      "new BrowserWindow({ webPreferences: { nodeIntegration: true, contextIsolation: false } });",
      "ipcMain.handle('read-file', (_event, filePath) => fs.readFileSync(filePath, 'utf8'));",
      "",
    ].join("\n"),
  );

  const project = detectProject(root);
  const checks = runElectronChecks(project);

  assert.equal(checks.length, 1);
  assert.equal(checks[0].status, "fail");
  assert.equal(checks[0].blocking, true);
  assert.deepEqual(checks[0].evidence.dangerous, [
    "main.js: nodeIntegration: true",
    "main.js: contextIsolation: false",
  ]);
  assert.equal(checks[0].evidence.suspiciousIpc.includes("main.js"), true);
});
