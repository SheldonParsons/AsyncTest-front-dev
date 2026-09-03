import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { mkdtemp, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { spawn } from "node:child_process";
import readline from "node:readline";
import { fileURLToPath } from "node:url";

import { VibeSkillCache } from "../electron/vibeAgent/skillCache.node.js";
import { identityOf, makeFrame, parseOutboundLine } from "../electron/vibeAgent/runtime/protocol.mjs";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const temporary = await mkdtemp(path.join(os.tmpdir(), "vibe-skill-"));
const content = `---\nname: vibe-knowledge\ndescription: 始终启用的测试知识规范。\n---\n\n# 规范\n\n先查证，再回答。\n`;
const sha256 = createHash("sha256").update(content).digest("hex");
const descriptor = {
  schema: "vibe_agent_skill.v1",
  name: "vibe-knowledge",
  description: "始终启用的测试知识规范。",
  version: "test-1",
  sha256,
  content,
};

try {
  const skill = await new VibeSkillCache({ rootPath: temporary }).put(descriptor);
  assert.equal(skill.file_path, path.join(temporary, sha256, "vibe-knowledge", "SKILL.md"));
  await assert.rejects(
    new VibeSkillCache({ rootPath: temporary }).put({ ...descriptor, sha256: "0".repeat(64) }),
    /hash_mismatch/,
  );

  const identity = { run_id: "skill-run", turn_id: "skill-turn", request_id: "skill-request" };
  const piDirectory = path.join(temporary, "pi-session");
  const start = makeFrame(identity, "start", {
    execution_mode: "local",
    system_prompt: "基础系统提示。",
    prompt: "完成。",
    pi_session: {
      schema: "vibe.pi_session.v1", mode: "create", session_id: "skill-session",
      directory: piDirectory, file_path: path.join(piDirectory, "session.jsonl"), format_version: 3,
      bootstrap_messages: [], bootstrap_sequence: 0,
    },
    tools: [],
    skill,
    provider: {
      id: "fake", model: "fake-model", api: "openai-completions", mode: "direct",
      base_url: "https://example.invalid/v1", api_key: "fake-key", reasoning: false,
    },
    options: { max_retries: 0, tool_choice: "auto", session_id: "skill-session" },
    fake: { responses: [{ text: "完成。" }] },
  });
  const electron = path.join(root, "node_modules", ".bin", process.platform === "win32" ? "electron.cmd" : "electron");
  const child = spawn(electron, [path.join(root, "electron", "vibeAgent", "runtime", "runner.mjs")], {
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
  let stderr = "";
  child.stderr.on("data", (chunk) => { stderr += chunk.toString("utf8"); });
  child.stdin.write(`${start.serialized}\n`);
  const frames = [];
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
  const loaded = frames.find((frame) => frame.type === "skill_loaded")?.payload;
  assert.equal(loaded?.name, descriptor.name);
  assert.equal(loaded?.version, descriptor.version);
  assert.equal(loaded?.sha256, descriptor.sha256);
  assert.match(loaded?.system_prompt_sha256 || "", /^[0-9a-f]{64}$/);
  assert.equal(frames.at(-1)?.payload.status, "completed");
  console.log("PASS: frozen Vibe Knowledge Skill is hash-verified and fully injected through Pi's public API");
} finally {
  await rm(temporary, { recursive: true, force: true });
}
