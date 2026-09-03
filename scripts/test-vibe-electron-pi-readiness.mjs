import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { ElectronPiReadiness } from "../electron/vibeAgent/readiness.node.js";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const readiness = new ElectronPiReadiness({
  execPath: electron,
  runnerPath: path.join(root, "electron", "vibeAgent", "runtime", "runner.mjs"),
  env: {
    PATH: process.env.PATH,
    LANG: process.env.LANG || "C",
    ELECTRON_RUN_AS_NODE: "1",
    NODE_NO_WARNINGS: "1",
    VIBE_PI_PARENT_PID: String(process.pid),
    VIBE_PI_APP_ROOT: root,
  },
  appVersion: "self-check-test",
  platform: process.platform,
  arch: process.arch,
});

const first = await readiness.check();
const second = await readiness.check();
assert.equal(first, second, "startup self-check should be cached for the app lifetime");
assert.deepEqual({
  schema: first.schema,
  ok: first.ok,
  runner_spawn: first.runner_spawn,
  dependencies_loaded: first.dependencies_loaded,
  protocol_version: first.protocol_version,
  agent_core_version: first.agent_core_version,
  pi_ai_version: first.pi_ai_version,
  pi_coding_agent_version: first.pi_coding_agent_version,
  undici_version: first.undici_version,
}, {
  schema: "electron_pi_readiness.v1",
  ok: true,
  runner_spawn: true,
  dependencies_loaded: true,
  protocol_version: 2,
  agent_core_version: "0.84.4",
  pi_ai_version: "0.84.4",
  pi_coding_agent_version: "0.84.4",
  undici_version: "8.9.0",
});
assert.match(first.timestamp, /^\d{4}-\d{2}-\d{2}T/);
console.log("PASS: Electron Pi local startup self-check");
