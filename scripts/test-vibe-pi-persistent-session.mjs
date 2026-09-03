import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { identityOf, makeFrame, parseOutboundLine } from "../electron/vibeAgent/runtime/protocol.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const runner = path.join(root, "electron", "vibeAgent", "runtime", "runner.mjs");
const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
const temporary = await mkdtemp(path.join(os.tmpdir(), "vibe-pi-session-"));
const sessionDirectory = path.join(temporary, "pi-session");
const sessionFile = path.join(sessionDirectory, "session.jsonl");
const productSessionId = "persistent-session";

async function runTurn(number, mode, prompt, answer, bootstrapMessages = undefined) {
  const identity = {
    run_id: `persistent-run-${number}`,
    turn_id: `persistent-turn-${number}`,
    request_id: `persistent-request-${number}`,
  };
  const start = makeFrame(identity, "start", {
    execution_mode: "local",
    system_prompt: "只回答用户问题。",
    prompt,
    tools: [],
    pi_session: {
      schema: "vibe.pi_session.v1",
      mode,
      session_id: productSessionId,
      directory: sessionDirectory,
      file_path: sessionFile,
      format_version: 3,
      ...(mode === "create" ? {
        bootstrap_messages: bootstrapMessages ?? [],
        bootstrap_sequence: bootstrapMessages?.length ?? 0,
      } : {}),
    },
    provider: {
      id: "fake", model: "fake-model", api: "openai-completions", mode: "direct",
      base_url: "https://example.invalid/v1", api_key: "fake-key", reasoning: false,
    },
    options: { max_retries: 0, tool_choice: "auto", session_id: productSessionId },
    fake: { responses: [{ text: answer, chunks: [answer.slice(0, 2), answer.slice(2)] }] },
  });
  const frames = [];
  await new Promise((resolvePromise, reject) => {
    const child = spawn(electron, [runner], {
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
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    const output = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    output.on("line", (line) => {
      try {
        const frame = parseOutboundLine(line, identityOf(start.frame));
        frames.push(frame);
        if (frame.type === "session_open") {
          child.stdin.write(`${makeFrame(identity, "session_open_result", { accepted: true }, { reply_to: frame.message_id }).serialized}\n`);
        } else if (frame.type === "candidate_final") {
          child.stdin.write(`${makeFrame(identity, "finish", {}, { reply_to: frame.message_id }).serialized}\n`);
        }
      } catch (error) {
        child.kill();
        reject(error);
      }
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) reject(new Error(`runner exited ${code}: ${stderr}`));
      else resolvePromise();
    });
    child.stdin.write(`${start.serialized}\n`);
  });
  return frames;
}

try {
  const first = await runTurn(1, "create", "第一轮问题", "第一轮回答", [
    { role: "user", content: "迁移前问题" },
    { role: "assistant", content: "迁移前回答" },
  ]);
  const second = await runTurn(2, "open", "第二轮问题", "第二轮回答");

  assert.equal(first.find((frame) => frame.type === "session_open")?.payload.resumed, false);
  assert.equal(second.find((frame) => frame.type === "session_open")?.payload.resumed, true);
  assert.equal(first.filter((frame) => frame.type === "assistant_delta").length, 2);
  assert.equal(second.filter((frame) => frame.type === "assistant_delta").length, 2);
  assert.equal(second.find((frame) => frame.type === "candidate_final")?.payload.text, "第二轮回答");
  assert.equal(second.find((frame) => frame.type === "session_checkpoint")?.payload.phase, "completed");

  const rows = (await readFile(sessionFile, "utf8")).trim().split("\n").map((line) => JSON.parse(line));
  assert.equal(rows[0].type, "session");
  assert.equal(rows[0].version, 3);
  assert.equal(rows.filter((row) => row.type === "custom" && row.customType === "vibe.bootstrap.v1").length, 1);
  const messages = rows.filter((row) => row.type === "message").map((row) => row.message);
  assert.deepEqual(messages.filter((message) => message.role === "user")
    .map((message) => message.content.map((block) => block.text).join("")), ["迁移前问题", "第一轮问题", "第二轮问题"]);
  assert.deepEqual(messages.filter((message) => message.role === "assistant")
    .map((message) => message.content.filter((block) => block.type === "text").map((block) => block.text).join("")), [
    "迁移前回答", "第一轮回答", "第二轮回答",
  ]);
  console.log("PASS: Pi official JSONL session survives child exit and resumes without history replay");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
