import assert from "node:assert/strict";

import { KnowledgeRemoteClient } from "../electron/vibeAgent/knowledgeRemoteClient.node.js";
import { LocalToolRouter } from "../electron/vibeAgent/localToolRouter.node.js";

let httpCalls = 0;
const client = new KnowledgeRemoteClient({
  baseUrl: "http://127.0.0.1:6001",
  authToken: "test-token",
  agentBinding: "binding-test",
  isDevelopment: true,
  fetchImpl: async (url, init) => {
    httpCalls += 1;
    assert.match(String(url), /\/foundation\/knowledge\/tool-wave$/);
    const request = JSON.parse(init.body);
    assert.equal(init.headers["X-Vibe-Agent-Run-Binding"], "binding-test");
    assert.equal(request.schema, "knowledge_tool_wave_request.v1");
    assert.deepEqual(
      request.calls.map((item) => item.tool_call_id),
      httpCalls === 1 ? ["search-1", "read-1"] : ["search-single"],
    );
    return new Response(JSON.stringify({
      schema: "knowledge_tool_wave_response.v1",
      results: request.calls.map((item, index) => ({
        tool_call_id: item.tool_call_id,
        request_id: item.request_id,
        operation: item.operation,
        outcome: {
          schema: "knowledge_capability.outcome.v1",
          status: "completed",
          result: { index, tool_call_id: item.tool_call_id },
        },
      })),
    }), { status: 200, headers: { "Content-Type": "application/json" } });
  },
});

const router = new LocalToolRouter({
  knowledgeClient: client,
  run: {
    run_id: "run-wave",
    turn_id: "turn-wave",
    goal_id: "goal-wave",
    trace_id: "trace-wave",
    project_id: "1137",
    session_id: "session-wave",
  },
});
const outcome = await router.executeWave({ calls: [
  { id: "search-1", name: "search_knowledge", arguments: { query: "alpha" } },
  { id: "read-1", name: "read_knowledge", arguments: { target: { source_name: "one.md" } } },
] });

assert.equal(httpCalls, 1);
assert.deepEqual(outcome.results.map((item) => item.tool_call_id), ["search-1", "read-1"]);
assert.deepEqual(outcome.results.map((item) => JSON.parse(item.content[0].text).index), [0, 1]);
console.log("PASS: one Pi read wave becomes one ordered Knowledge HTTP wave");

const single = await router.executeWave({ calls: [
  { id: "search-single", name: "search_knowledge", arguments: { query: "single" } },
] });
assert.equal(httpCalls, 2);
assert.equal(single.results[0].tool_call_id, "search-single");
console.log("PASS: a single Pi search uses the same Knowledge HTTP wave owner");

let waveCalls = 0;
let singleCalls = 0;
const writeClient = {
  callWave: async () => { waveCalls += 1; throw new Error("write must not use wave"); },
  call: async () => { singleCalls += 1; return { status: "waiting_user", result: { clarification: { question: "确认" } } }; },
};
const writeRouter = new LocalToolRouter({
  knowledgeClient: writeClient,
  run: { run_id: "run-write", turn_id: "turn-write", goal_id: "goal-write", project_id: "1137", session_id: "session-write" },
});
const writes = await writeRouter.executeWave({ calls: [
  { id: "write-1", name: "add_knowledge", arguments: { documents: [{ filename: "a.md", body: "# A" }] } },
  { id: "write-2", name: "add_knowledge", arguments: { documents: [{ filename: "b.md", body: "# B" }] } },
] });
assert.equal(waveCalls, 0);
assert.equal(singleCalls, 1);
assert.equal(writes.results[1].is_error, true);
console.log("PASS: knowledge writes remain serial and stop after one pending interaction");

const largeRouter = new LocalToolRouter();
const largeBody = "# 大文档\n\n" + "内容。".repeat(130_000);
const largeDocument = await largeRouter.authoredDocument({ filename: "large.md", body: largeBody });
assert.ok(Array.isArray(largeDocument.chunks));
assert.equal(largeDocument.content, undefined);
assert.equal(largeDocument.content_hash.length, 64);
console.log("PASS: Main automatically chunks large authored Markdown without exposing chunk schema to the model");
