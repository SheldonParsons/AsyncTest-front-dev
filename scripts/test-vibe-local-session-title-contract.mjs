import assert from "node:assert/strict";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { identityOf, makeFrame, parseOutboundLine } from "../electron/vibeAgent/runtime/protocol.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const runner = path.join(root, "electron", "vibeAgent", "runtime", "runner.mjs");
const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");

async function fakeRun(title) {
  const identity = {
    run_id: `session-title-${title.length}`,
    turn_id: `turn-title-${title.length}`,
    request_id: `request-title-${title.length}`,
  };
  const start = makeFrame(identity, "start", {
    execution_mode: "local",
    system_prompt: "请完成用户任务。",
    tools: [],
    provider: {
      id: "fake-provider",
      mode: "direct",
      api: "openai-completions",
      base_url: "https://provider.invalid/v1",
      api_key: "fake-only",
      model: "fake-model",
      reasoning: false,
    },
    options: {
      max_retries: 0,
      generate_session_title: true,
      budget: { max_model_calls: 12 },
    },
    prompt: "请规划知识库迁移。",
    fake: {
      responses: [
        { text: "知识库迁移方案已经完成。" },
        { text: title },
      ],
    },
  });
  const frames = [];
  await new Promise((resolve, reject) => {
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
    const output = readline.createInterface({ input: child.stdout, crlfDelay: Infinity });
    let stderr = "";
    child.stderr.on("data", (chunk) => { stderr += String(chunk); });
    output.on("line", (line) => {
      try {
        const frame = parseOutboundLine(line, identityOf(start.frame));
        frames.push(frame);
        if (frame.type === "candidate_final") {
          child.stdin.write(`${makeFrame(identity, "finish", {}, { reply_to: frame.message_id }).serialized}\n`);
        }
      } catch (error) {
        reject(error);
        child.kill();
      }
    });
    child.once("error", reject);
    child.once("close", (code) => {
      if (code !== 0) reject(new Error(`runner exited ${code}: ${stderr}`));
      else resolve();
    });
    child.stdin.write(`${start.serialized}\n`);
  });
  return frames;
}

const valid = await fakeRun("知识库迁移规划");
assert.equal(valid.filter((frame) => frame.type === "session_title").length, 1);
assert.equal(valid.find((frame) => frame.type === "session_title")?.payload.title, "知识库迁移规划");
assert.equal(valid.filter((frame) => frame.type === "candidate_final").length, 1);
assert.equal(valid.at(-1)?.type, "done");
assert.equal(valid.at(-1)?.payload.status, "completed");
assert.equal(valid.find((frame) => frame.type === "assistant_end" && frame.payload.purpose === "session_title")?.payload.has_tool_calls, false);
assert.equal(valid.find((frame) => frame.type === "assistant_end" && frame.payload.purpose === "session_title")?.payload.budget.model_calls, 2);

const invalid = await fakeRun("这是一个明显超过十二个字符限制的标题");
assert.equal(invalid.some((frame) => frame.type === "session_title"), false);
assert.equal(invalid.at(-1)?.type, "done");
assert.equal(invalid.at(-1)?.payload.status, "completed");

console.log("vibe local session title contract: PASS");
