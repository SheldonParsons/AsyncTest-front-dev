import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { identityOf, makeFrame, parseOutboundLine } from "../electron/vibeAgent/runtime/protocol.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), "vibe-pi-compaction-"));
const directory = path.join(temporary, "pi-session");
const filePath = path.join(directory, "session.jsonl");
const bootstrap = [];
for (let index = 0; index < 30; index += 1) {
  bootstrap.push({ role: "user", content: `历史问题 ${index}：${"上下文".repeat(900)}` });
  bootstrap.push({ role: "assistant", content: `历史回答 ${index}：${"历史信息".repeat(900)}` });
}
const identity = { run_id: "compact-run", turn_id: "compact-turn", request_id: "compact-request" };
const start = makeFrame(identity, "start", {
  execution_mode: "local",
  system_prompt: "只回答问题。",
  prompt: "给出本轮结论。",
  tools: [],
  pi_session: {
    schema: "vibe.pi_session.v1", mode: "create", session_id: "compact-session",
    directory, file_path: filePath, format_version: 3,
    bootstrap_messages: bootstrap, bootstrap_sequence: bootstrap.length,
  },
  provider: {
    id: "fake", model: "fake-model", api: "openai-completions", mode: "direct",
    base_url: "https://example.invalid/v1", api_key: "fake-key", reasoning: false,
    context_window: 30_000, max_tokens: 8_192,
  },
  options: { max_retries: 0, tool_choice: "auto", session_id: "compact-session" },
  fake: { responses: [{ text: "原生压缩摘要。" }, { text: "本轮回答。" }] },
});

try {
  const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
  const child = spawn(electron, [path.join(root, "electron", "vibeAgent", "runtime", "runner.mjs")], {
    cwd: root,
    stdio: ["pipe", "pipe", "pipe"],
    env: {
      PATH: process.env.PATH,
      LANG: process.env.LANG || "C",
      TMPDIR: process.env.TMPDIR || os.tmpdir(),
      ELECTRON_RUN_AS_NODE: "1",
      NODE_NO_WARNINGS: "1",
      VIBE_PI_APP_ROOT: root,
      VIBE_PI_PARENT_PID: String(process.pid),
    },
  });
  const frames = [];
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += String(chunk); });
  child.stdin.write(`${start.serialized}\n`);
  for await (const line of readline.createInterface({ input: child.stdout, crlfDelay: Infinity })) {
    const frame = parseOutboundLine(line, identityOf(start.frame));
    frames.push(frame);
    if (frame.type === "session_open") {
      child.stdin.write(`${makeFrame(identity, "session_open_result", { accepted: true }, { reply_to: frame.message_id }).serialized}\n`);
    } else if (frame.type === "candidate_final") {
      child.stdin.write(`${makeFrame(identity, "finish", {}, { reply_to: frame.message_id }).serialized}\n`);
    }
  }
  const exitCode = await new Promise((resolve) => child.once("close", resolve));
  assert.equal(exitCode, 0, stderr);
  assert.equal(frames.find((frame) => frame.type === "candidate_final")?.payload.text, "本轮回答。");
  assert.equal(frames.find((frame) => frame.type === "compaction_start")?.payload.reason, "threshold");
  const compacted = frames.find((frame) => frame.type === "compaction_end")?.payload;
  assert.equal(compacted?.aborted, false);
  assert.equal(compacted?.summary, "原生压缩摘要。");
  assert.ok(compacted?.tokens_before > compacted?.estimated_tokens_after);
  const rows = (await readFile(filePath, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
  const entry = rows.find((row) => row.type === "compaction");
  assert.equal(entry?.summary, "原生压缩摘要。");
  assert.equal(entry?.id, compacted.entry_id);
  console.log("PASS: Pi native threshold compaction persists one CompactionEntry and preserves the final answer");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
