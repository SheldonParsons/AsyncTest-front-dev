import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { KnowledgeRemoteClient } from "../electron/vibeAgent/knowledgeRemoteClient.node.js";
import { LocalRunStore } from "../electron/vibeAgent/run/localRunStore.node.js";
import { LocalTraceStore } from "../electron/vibeAgent/trace/localTraceStore.node.js";
import { TraceUploadQueue } from "../electron/vibeAgent/trace/traceUploadQueue.node.js";

const binding = "signed-binding-test";
const identity = {
  projectId: "1137",
  sessionId: "session-binding",
  turnId: "lt-binding",
  goalId: "lt-binding",
  traceId: "trace-binding",
};

let knowledgeHeaders;
const knowledge = new KnowledgeRemoteClient({
  baseUrl: "http://127.0.0.1:6001",
  authToken: "test-token",
  agentBinding: binding,
  isDevelopment: true,
  fetchImpl: async (_url, init) => {
    knowledgeHeaders = init.headers;
    const request = JSON.parse(init.body);
    return new Response(JSON.stringify({
      schema: "knowledge_tool_response.v1",
      operation: request.operation,
      request_id: request.request_id,
      outcome: {
        schema: "knowledge_capability.outcome.v1",
        status: "completed",
        result: { ok: true },
      },
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  },
});
await knowledge.call({
  operation: "search",
  projectId: identity.projectId,
  sessionId: identity.sessionId,
  turnId: identity.turnId,
  goalId: identity.goalId,
  payload: { query: "binding" },
});
assert.equal(knowledgeHeaders["X-Vibe-Agent-Run-Binding"], binding);
await assert.rejects(
  new KnowledgeRemoteClient({
    baseUrl: "http://127.0.0.1:6001",
    authToken: "test-token",
    isDevelopment: true,
    fetchImpl: async () => { throw new Error("must not fetch"); },
  }).call({
    operation: "search",
    projectId: identity.projectId,
    sessionId: identity.sessionId,
    turnId: identity.turnId,
    payload: { query: "binding" },
  }),
  (error) => error?.code === "agent_binding_required",
);

const root = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-binding-contract-"));
try {
  const traceStore = new LocalTraceStore({ rootPath: root });
  await traceStore.create({
    traceId: identity.traceId,
    accountId: "9",
    projectId: identity.projectId,
    sessionId: identity.sessionId,
    goalId: identity.goalId,
    runId: "lpr-binding",
  });
  await traceStore.append({
    traceId: identity.traceId,
    accountId: "9",
    projectId: identity.projectId,
    name: "binding.test",
    payload: { ok: true },
  });
  const seen = [];
  const uploadId = "atu_0123456789abcdef0123456789abcdef";
  const queue = new TraceUploadQueue({
    store: traceStore,
    isDevelopment: true,
    fetchImpl: async (_url, init) => {
      seen.push(init.headers);
      if (init.method === "POST" && String(init.body).includes('"trace_id"')) {
        const body = JSON.parse(init.body);
        if (body.schema === "vibe.agent.trace.upload.v1" && body.total_chunks !== undefined) {
          return new Response(JSON.stringify({
            schema: "vibe.agent.trace.upload.v1",
            upload_id: uploadId,
            trace_id: body.trace_id,
            status: "uploading",
            total_chunks: body.total_chunks,
            total_bytes: body.total_bytes,
            bundle_sha256: body.bundle_sha256,
          }), { status: 200, headers: { "Content-Type": "application/json" } });
        }
      }
      if (init.method === "POST") {
        return new Response(JSON.stringify({
          schema: "vibe.agent.trace.upload.v1",
          upload_id: uploadId,
          trace_id: identity.traceId,
          status: "completed",
        }), { status: 200, headers: { "Content-Type": "application/json" } });
      }
      return new Response(JSON.stringify({ status: "accepted" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    },
  });
  await queue.enqueue(identity.traceId, {
    accountId: "9",
    baseUrl: "http://127.0.0.1:6001",
    bindingToken: binding,
    headers: {
      Authorization: "token=test-token",
      "X-Vibe-Agent-Run-Binding": "renderer-forged",
    },
  });
  await queue.wait(identity.traceId);
  assert.ok(seen.length >= 2);
  for (const headers of seen) {
    assert.equal(headers["X-Vibe-Agent-Run-Binding"], binding);
  }

  const runStore = new LocalRunStore({ rootPath: path.join(root, "runs") });
  const descriptor = await runStore.create({
    run: {
      schema: "electron_agent_run.v1",
      execution_host: "electron",
      execution_mode: "local",
      run_id: "lpr-descriptor",
      account_id: "9",
      project_id: identity.projectId,
      session_id: identity.sessionId,
      turn_id: identity.turnId,
      request_id: "lreq-descriptor",
      provider_mode: "direct",
    },
    startPayload: {
      provider: { id: "provider", api_key: "should-not-persist" },
      agent_binding: binding,
      user_text: "hello",
    },
    localContext: { accountId: "9" },
  });
  const onDisk = JSON.stringify(descriptor);
  assert.doesNotMatch(onDisk, /agent_binding|binding-test|should-not-persist/);
} finally {
  await fs.rm(root, { recursive: true, force: true });
}

console.log("vibe agent binding transport contract: PASS");
