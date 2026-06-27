import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import { runCommand } from "../ai-project-maintainer/scripts/lib/command-runner.mjs";

test("runCommand can execute Windows cmd shims safely", { skip: process.platform !== "win32" }, () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), "apm-cmd-"));
  fs.writeFileSync(path.join(dir, "fake-tool.cmd"), "@echo off\r\necho fake-ok\r\n");

  const result = runCommand("fake-tool", ["--version"], {
    envPath: dir,
    allowedCommands: new Set(["fake-tool"]),
  });

  assert.equal(result.status, "pass");
  assert.match(result.stdout, /fake-ok/);
});
