import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash } from "node:crypto";

import { fetchRuntimeSnapshot } from "../electron/vibeAgent/runtimeSnapshotClient.node.js";
import { makeFrame, parseOutboundLine } from "../electron/vibeAgent/runtime/protocol.mjs";
import { LocalRunStore } from "../electron/vibeAgent/run/localRunStore.node.js";

const run = {
  run_id: "run-direct-1",
  turn_id: "turn-direct-1",
  account_id: "account-1",
  project_id: "7",
  session_id: "session-direct-1",
};
const skillContent = "---\nname: vibe-knowledge\ndescription: 测试知识规范。\n---\n\n# 测试\n";
const skill = {
  schema: "vibe_agent_skill.v1",
  name: "vibe-knowledge",
  description: "测试知识规范。",
  version: "test-1",
  sha256: createHash("sha256").update(skillContent).digest("hex"),
  content: skillContent,
};
const agentBinding = (accountId = run.account_id) => ({
  schema: "electron_agent_binding.v1",
  binding_id: "a".repeat(32),
  token: "binding-test",
  account_id: String(accountId),
  project_id: run.project_id,
  session_id: run.session_id,
  run_id: run.run_id,
  turn_id: run.turn_id,
  client_instance_id: "client-test",
  protocol_version: 3,
});
let calls = 0;
const fetchImpl = async (url, init) => {
  calls += 1;
  assert.match(String(url), /\/vibe\/foundation\/agent-bootstrap$/);
  assert.equal(init.method, "POST");
  assert.equal(init.headers.Authorization, "token=login-token");
  const request = JSON.parse(init.body);
  assert.equal(request.schema, "electron_pi_runtime_snapshot_request.v1");
  // The server derives the account from the login credential. Main verifies
  // the authoritative account_id in the response instead of asserting one in
  // the request body.
  assert.equal(Object.hasOwn(request, "account_id"), false);
  assert.equal(request.llm_provider_id, "provider-1");
  assert.equal(JSON.stringify(request).includes("provider-secret"), false);
  return new Response(JSON.stringify({
    schema: "electron_pi_runtime_snapshot.v1",
    account_id: run.account_id,
    project_id: run.project_id,
    session_id: run.session_id,
    provider: {
      id: "provider-1",
      name: "Baitong-DeepSeek",
      api: "openai-completions",
      mode: "direct",
      base_url: "https://provider.example/v1",
      api_key: "provider-secret",
      model: "strong-model",
      reasoning: false,
      context_window: 275000,
      max_tokens: 8192,
    },
    system_prompt: "请使用简体中文。",
    tools: [
      "get_knowledge_overview", "search_knowledge", "read_knowledge",
      "add_knowledge", "edit_knowledge", "delete_knowledge",
      "search_vibe_platform_docs", "ask_clarification",
    ].map((name, index) => ({
      name,
      description: "",
      execution_mode: index < 3 || index === 6 ? "parallel" : "sequential",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    })),
    tool_manifest: { schema: "knowledge_tool_manifest.v3", version: 3 },
    agent_binding: agentBinding(),
    skill,
    hidden_tools: [],
    options: {
      max_retries: 0,
      max_model_calls: 12,
      max_wall_clock_ms: 360000,
      payload_overrides: { enable_thinking: false },
    },
  }), { status: 200, headers: { "Content-Type": "application/json" } });
};

const snapshot = await fetchRuntimeSnapshot({
  baseUrl: "http://127.0.0.1:6001",
  authToken: "login-token",
  isDevelopment: true,
  run,
  providerId: "provider-1",
  identity: {
    appVersion: "test",
    protocolVersion: 3,
    piAgentCoreVersion: "0.84.4",
    piAiVersion: "0.84.4",
    clientInstanceId: "client-test",
  },
  fetchImpl,
});

assert.equal(calls, 1);
assert.equal(snapshot.provider.mode, "direct");
assert.equal(snapshot.provider.api_key, "provider-secret");
assert.equal(snapshot.provider.model, "strong-model");
assert.equal(snapshot.account_id, run.account_id);
assert.equal(snapshot.options.max_model_calls, 12);
assert.equal(snapshot.options.max_wall_clock_ms, 360000);

// Older deployments returned the authenticated account as a JSON number.
// The client accepts that compatible representation but exposes one canonical
// string identity to the rest of Main.
const numericRun = { ...run, account_id: "1" };
const numericSnapshot = await fetchRuntimeSnapshot({
  baseUrl: "http://127.0.0.1:6001",
  authToken: "login-token",
  isDevelopment: true,
  run: numericRun,
  providerId: "provider-1",
  identity: {
    appVersion: "test",
    protocolVersion: 3,
    piAgentCoreVersion: "0.84.4",
    piAiVersion: "0.84.4",
    clientInstanceId: "client-test",
  },
  fetchImpl: async (...args) => {
    const response = await fetchImpl(...args);
    const payload = await response.json();
    payload.account_id = 1;
    payload.agent_binding.account_id = "1";
    return new Response(JSON.stringify(payload), { status: 200, headers: { "Content-Type": "application/json" } });
  },
});
assert.equal(numericSnapshot.account_id, "1");

const identity = { run_id: run.run_id, turn_id: run.turn_id, request_id: "request-direct-1" };
const assistantFrame = makeFrame(identity, "assistant_end", {
  call_id: "call-2",
  purpose: "main_agent",
  text: "完成",
  has_tool_calls: false,
  tool_calls: [],
  stop_reason: "stop",
  usage: { output: 8 },
});
assert.equal(parseOutboundLine(assistantFrame.serialized).payload.text, "完成");

const tempRoot = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-direct-provider-"));
try {
  const store = new LocalRunStore({ rootPath: tempRoot });
  await store.create({
    run: { ...run, schema: "electron_agent_run.v1", execution_host: "electron", execution_mode: "local", provider_mode: "direct" },
    startPayload: {
      system_prompt: "中文",
      tools: [],
      prompt: "测试",
      provider: { ...snapshot.provider, headers: { "X-Private-Token": "header-secret" } },
      options: {},
    },
    localContext: { account_id: run.account_id, auth_token: "login-token" },
  });
  const descriptor = await fs.readFile(path.join(tempRoot, encodeURIComponent(run.run_id), "descriptor.json"), "utf8");
  assert.equal(descriptor.includes("provider-secret"), false);
  assert.equal(descriptor.includes("header-secret"), false);
  assert.equal(descriptor.includes("login-token"), false);
  await store.close();
} finally {
  await fs.rm(tempRoot, { recursive: true, force: true });
}

const preload = await fs.readFile(new URL("../electron/preload.js", import.meta.url), "utf8");
const renderer = await fs.readFile(new URL("../src/views/electron_views/vibe/knowledge/index.vue", import.meta.url), "utf8");
const hostSource = await fs.readFile(new URL("../electron/vibeAgent/agentHost.node.js", import.meta.url), "utf8");
const runnerSource = await fs.readFile(new URL("../electron/vibeAgent/runtime/runner.mjs", import.meta.url), "utf8");
const ipcSource = await fs.readFile(new URL("../electron/vibeAgent/ipcMain.node.js", import.meta.url), "utf8");
assert.equal(preload.includes("vibeAgent:providerGet"), false);
assert.equal(preload.includes("vibeAgent:providerSet"), false);
assert.match(preload, /attach: \(\{ runId, accountId \}\)[\s\S]*vibeAgent:attach[^\n]*accountId/);
assert.match(preload, /respond: \(\{ runId, accountId, pendingId, response \}\)[\s\S]*vibeAgent:respond[^\n]*accountId/);
assert.match(preload, /cancel: \(\{ runId, accountId, turnId, sessionId \}\)[\s\S]*vibeAgent:cancel[^\n]*accountId/);
assert.equal(renderer.includes("getLocalPiBootstrap"), false);
assert.equal(renderer.includes("api_key"), false);
assert.match(hostSource, /const MAX_ACTIVE_RUNS = 5;/);
assert.match(hostSource, /sameSessionOwner[\s\S]*vibe_agent_session_busy/);
assert.match(hostSource, /localTerminalState[\s\S]*effectiveState/);
assert.match(hostSource, /liveSessionOwners[\s\S]*localTerminalState/);
assert.match(hostSource, /stale waiting descriptor[\s\S]*hosted\?\.localTerminalState/);
assert.match(runnerSource, /this\.budgetedModelCalls >= maxModelCalls[\s\S]*model_call_budget_exhausted/);
assert.match(runnerSource, /Date\.now\(\) - this\.runStartedAt - this\.userWaitMs[\s\S]*wall_clock_exhausted/);
const localStartBlock = ipcSource.slice(ipcSource.indexOf('register("vibeAgent:startLocal"'));
assert.ok(localStartBlock.indexOf("host.reserveLocal") < localStartBlock.indexOf("injectLocalStartPayload"));
assert.match(localStartBlock, /bindLocalReservation[\s\S]*host\.startLocal/);
const runningRefresh = renderer.slice(renderer.indexOf("async function refreshProjectRunningTurns"));
assert.match(runningRefresh, /await refreshLocalAgentStatuses\(\)/);
assert.doesNotMatch(runningRefresh, /listFoundationRunningTurns|replayFoundationTurn|cancelFoundationTurn/);
assert.match(renderer, /bridge\.list\?\.\(\{ accountId: localAccountId\(\) \}\)[\s\S]*liveRuns[\s\S]*>= 5/);
assert.match(renderer, /Electron prefixes an ipcRenderer\.invoke rejection/);
assert.match(renderer, /Main performs the authoritative atomic slot\/session admission/);

console.log("vibe direct Provider contract: PASS");
