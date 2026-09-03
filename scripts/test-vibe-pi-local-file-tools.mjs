import assert from "node:assert/strict";
import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { identityOf, makeFrame, parseOutboundLine } from "../electron/vibeAgent/runtime/protocol.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), "vibe-pi-files-"));
const readPath = path.join(temporary, "read.txt");
const writePath = path.join(temporary, "write.txt");
const editPath = path.join(temporary, "edit.txt");
const piDirectory = path.join(temporary, "pi-session");
await writeFile(readPath, "read-ok\n", "utf8");
await writeFile(editPath, "before\n", "utf8");

const identity = { run_id: "local-files-run", turn_id: "local-files-turn", request_id: "local-files-request" };
const start = makeFrame(identity, "start", {
  execution_mode: "local",
  system_prompt: "完成测试。",
  prompt: "运行工具。",
  pi_session: {
    schema: "vibe.pi_session.v1", mode: "create", session_id: "local-files-session",
    directory: piDirectory, file_path: path.join(piDirectory, "session.jsonl"), format_version: 3,
    bootstrap_messages: [], bootstrap_sequence: 0,
  },
  tools: [],
  provider: {
    id: "fake",
    model: "fake-model",
    api: "openai-completions",
    mode: "direct",
    base_url: "https://example.invalid/v1",
    api_key: "fake-key",
    reasoning: false,
  },
  options: { max_retries: 0, tool_choice: "auto", session_id: "local-files-session" },
  fake: { responses: [
    { tool_calls: [
      { id: "read-call", name: "read", arguments: { path: readPath } },
      { id: "write-call", name: "write", arguments: { path: writePath, content: "write-ok\n" } },
      { id: "edit-call", name: "edit", arguments: { path: editPath, edits: [{ oldText: "before", newText: "after" }] } },
      { id: "bash-call", name: "bash", arguments: { command: "printf 'bash-ok'" } },
    ] },
    { text: "测试完成。" },
  ] },
});

const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const child = spawn(electron, [path.join(root, "electron", "vibeAgent", "runtime", "runner.mjs")], {
  cwd: temporary,
  env: {
    PATH: process.env.PATH,
    LANG: process.env.LANG || "C",
    TMPDIR: process.env.TMPDIR || os.tmpdir(),
    ELECTRON_RUN_AS_NODE: "1",
    NODE_NO_WARNINGS: "1",
    VIBE_PI_PARENT_PID: String(process.pid),
    VIBE_PI_APP_ROOT: root,
  },
  stdio: ["pipe", "pipe", "pipe"],
});

const frames = [];
let stderr = "";
child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
const lines = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
child.stdin.write(`${start.serialized}\n`);
for await (const line of lines) {
  const frame = parseOutboundLine(line, identityOf(start.frame));
  frames.push(frame);
  if (frame.type === "session_open") {
    child.stdin.write(`${makeFrame(identity, "session_open_result", { accepted: true }, { reply_to: frame.message_id }).serialized}\n`);
  } else if (frame.type === "candidate_final") {
    child.stdin.write(`${makeFrame(identity, "finish", { publish_text: frame.payload.text }, { reply_to: frame.message_id }).serialized}\n`);
  }
}
const exitCode = await new Promise((resolve) => child.once("close", resolve));

try {
  assert.equal(exitCode, 0, stderr);
  assert.equal(frames.some((frame) => frame.type === "tool_wave"), false, "local tools must not cross Main's remote router");
  const starts = frames.filter((frame) => frame.type === "local_tool_start");
  const updates = frames.filter((frame) => frame.type === "local_tool_update");
  const ends = frames.filter((frame) => frame.type === "local_tool_end");
  assert.deepEqual(new Set(starts.map((frame) => frame.payload.tool_name)), new Set(["read", "write", "edit", "bash"]));
  assert.deepEqual(new Set(ends.map((frame) => frame.payload.tool_name)), new Set(["read", "write", "edit", "bash"]));
  assert.equal(updates.some((frame) => frame.payload.tool_name === "bash"), true);
  assert.equal(ends.every((frame) => frame.payload.is_error === false), true);
  assert.match(JSON.stringify(ends.find((frame) => frame.payload.tool_name === "read")?.payload.result), /read-ok/);
  assert.match(JSON.stringify(ends.find((frame) => frame.payload.tool_name === "bash")?.payload.result), /bash-ok/);
  assert.equal(await readFile(writePath, "utf8"), "write-ok\n");
  assert.equal(await readFile(editPath, "utf8"), "after\n");
  assert.equal(frames.at(-1)?.type, "done");
  console.log("PASS: Pi official local file tools stay in the child and emit paired JSONL observations");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
