import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { LocalTraceStore } from "../electron/vibeAgent/trace/localTraceStore.node.js";
import {
  assistantPartialPayload,
  assistantStreamSummary,
  contentReference,
  createAssistantStream,
  recordAssistantDelta,
  traceStartPayload,
} from "../electron/vibeAgent/trace/traceCompaction.mjs";

async function treeBytes(root) {
  let total = 0;
  for (const entry of await fs.readdir(root, { withFileTypes: true })) {
    const target = path.join(root, entry.name);
    total += entry.isDirectory() ? await treeBytes(target) : (await fs.stat(target)).size;
  }
  return total;
}

const temp = await fs.mkdtemp(path.join(os.tmpdir(), "vibe-trace-compaction-"));
const compactRoot = path.join(temp, "compact");
const naiveRoot = path.join(temp, "naive");
const accountId = "account-1";
const traceId = "trace-compact-1";
const finalText = Array.from({ length: 400 }, (_, index) => `片段-${index}-${"中".repeat(80)}`).join("");
const deltas = Array.from({ length: 400 }, (_, index) => `片段-${index}-${"中".repeat(80)}`);

try {
  const start = traceStartPayload({
    execution_mode: "local",
    prompt: "请总结",
    history_messages: [{ role: "user", content: "历史" }],
    provider: { id: "provider-1", model: "strong", mode: "direct" },
    options: { max_retries: 0 },
    system_prompt: "不能重复保存的系统提示词",
    tools: [{ name: "search_knowledge", parameters: { type: "object" } }],
  });
  assert.equal(JSON.stringify(start).includes("不能重复保存的系统提示词"), false);
  assert.equal(JSON.stringify(start).includes("search_knowledge"), false);
  assert.equal(start.system_prompt_summary.count, "不能重复保存的系统提示词".length);
  assert.equal(start.tools_summary.count, 1);
  assert.match(start.system_prompt_summary.sha256, /^[0-9a-f]{64}$/);
  assert.match(start.tools_summary.sha256, /^[0-9a-f]{64}$/);

  const compact = new LocalTraceStore({ rootPath: compactRoot });
  await compact.create({ traceId, accountId, runId: "run-1", sessionId: "session-1", goalId: "goal-1" });
  await compact.updateMetadata(traceId, {
    accountId,
    metadata: { request_text: "请总结", turn_id: "turn-1", project_id: "project-1" },
  });
  await compact.append({ traceId, accountId, name: "agent.start", payload: start });
  await compact.append({
    traceId,
    accountId,
    name: "pi.provider_payload",
    payload: { body: { model: "strong", messages: [{ role: "user", content: "请总结" }] } },
  });

  let stream = createAssistantStream({ callId: "call-1", purpose: "main_agent", startedAt: 1_000 });
  deltas.forEach((text, index) => { stream = recordAssistantDelta(stream, text, 1_010 + index); });
  const summary = assistantStreamSummary(stream, { callId: "call-1", purpose: "main_agent", endedAt: 1_500 });
  await compact.append({ traceId, accountId, name: "pi.assistant_stream", attributes: summary });
  await compact.append({
    traceId,
    accountId,
    name: "pi.assistant_end",
    payload: { type: "assistant_end", payload: { call_id: "call-1", purpose: "main_agent", text: finalText } },
  });
  const reference = contentReference(finalText);
  await compact.append({ traceId, accountId, name: "pi.candidate_final", attributes: {
    text_sha256: reference.sha256, text_characters: reference.characters, text_bytes: reference.bytes,
  } });
  await compact.append({ traceId, accountId, name: "agent.final.accepted", payload: { text: finalText } });
  await compact.finish({ traceId, accountId, status: "completed", attributes: {
    terminal_status: "completed", accepted_final_sha256: reference.sha256,
  } });

  const detail = await compact.detail(traceId, { accountId, includePayload: true });
  assert.equal(detail.manifest.metadata.request_text, "请总结");
  assert.equal(detail.manifest.metadata.turn_id, "turn-1");
  assert.equal(detail.manifest.metadata.project_id, "project-1");
  assert.equal(detail.events.some((event) => event.name === "pi.assistant_delta"), false);
  const streamEvents = detail.events.filter((event) => event.name === "pi.assistant_stream");
  assert.equal(streamEvents.length, 1);
  assert.equal(streamEvents[0].attributes.chunk_count, deltas.length);
  assert.equal(streamEvents[0].attributes.character_count, finalText.length);
  assert.equal(streamEvents[0].payload_ref, undefined);
  assert.equal(detail.events.find((event) => event.name === "pi.assistant_end")?.payload?.payload?.text, finalText);
  assert.equal(detail.events.find((event) => event.name === "agent.final.accepted")?.payload?.text, finalText);
  assert.equal(detail.events.find((event) => event.name === "pi.provider_payload")?.payload?.body?.model, "strong");
  assert.equal(detail.events.find((event) => event.name === "agent.run.completed")?.payload_ref, undefined);

  let partial = createAssistantStream({ callId: "call-partial", startedAt: 2_000 });
  partial = recordAssistantDelta(partial, "尚未完成", 2_025);
  const failed = assistantPartialPayload(partial, { endedAt: 2_050 });
  assert.equal(failed.text, "尚未完成");
  assert.equal(failed.chunk_count, 1);
  assert.equal(failed.complete, false);
  await compact.close();

  const naive = new LocalTraceStore({ rootPath: naiveRoot });
  await naive.create({ traceId: "trace-naive-1", accountId, runId: "run-2", sessionId: "session-2", goalId: "goal-2" });
  for (const delta of deltas) {
    await naive.append({ traceId: "trace-naive-1", accountId, name: "pi.assistant_delta", payload: { text_chars: delta.length } });
  }
  await naive.append({ traceId: "trace-naive-1", accountId, name: "pi.assistant_end", payload: { text: finalText } });
  await naive.append({ traceId: "trace-naive-1", accountId, name: "pi.candidate_final", payload: { text: finalText } });
  await naive.append({ traceId: "trace-naive-1", accountId, name: "agent.candidate_final", payload: { text: finalText } });
  await naive.finish({ traceId: "trace-naive-1", accountId, status: "completed", payload: { text: finalText } });
  await naive.close();

  const compactBytes = await treeBytes(compactRoot);
  const naiveBytes = await treeBytes(naiveRoot);
  assert.ok(compactBytes < naiveBytes * 0.55, `expected compact ${compactBytes} < 55% of naive ${naiveBytes}`);

  const ipcSource = await fs.readFile(new URL("../electron/vibeAgent/ipcMain.node.js", import.meta.url), "utf8");
  const deltaBranch = ipcSource.slice(ipcSource.indexOf('if (frame?.type === "assistant_delta")'), ipcSource.indexOf('if (frame?.type === "assistant_end")'));
  assert.doesNotMatch(deltaBranch, /appendTrace|traceStore\.append/);
  assert.match(ipcSource, /agent\.final\.accepted/);
  assert.match(ipcSource, /VIBE_PI_TRACE_CAPTURE_PAYLOAD/);
  assert.match(ipcSource, /payload_capture: localTracePayloadCapture/);
  assert.doesNotMatch(ipcSource, /payload_capture: true/);
  const uploadSource = await fs.readFile(new URL("../electron/vibeAgent/trace/traceUploadQueue.node.js", import.meta.url), "utf8");
  assert.match(uploadSource, /format: "framed-v1"/);
  assert.match(uploadSource, /bundle_sha256/);

  const raceRoot = path.join(temp, "create-race");
  const race = new LocalTraceStore({ rootPath: raceRoot });
  await Promise.all(Array.from({ length: 8 }, (_, index) => (
    race.create({ traceId: "trace-create-race", accountId, runId: "run-race", sessionId: "session-race", goalId: "goal-race" })
      .then(() => race.append({ traceId: "trace-create-race", accountId, name: `event-${index}` }))
  )));
  const raceDetail = await race.detail("trace-create-race", { accountId, includePayload: false });
  assert.deepEqual(raceDetail.events.map((event) => event.sequence), [1, 2, 3, 4, 5, 6, 7, 8]);
  assert.equal(raceDetail.manifest.event_count, 8);
  assert.equal(raceDetail.manifest.next_sequence, 9);
  await race.close();

  const legacyRoot = path.join(temp, "legacy-startup-race");
  const legacy = new LocalTraceStore({ rootPath: legacyRoot });
  await legacy.create({ traceId: "trace-legacy-race", accountId, runId: "run-legacy", sessionId: "session-legacy", goalId: "goal-legacy" });
  await legacy.append({ traceId: "trace-legacy-race", accountId, name: "provider.snapshot.acquired" });
  await legacy.append({ traceId: "trace-legacy-race", accountId, name: "agent.start" });
  await legacy.append({ traceId: "trace-legacy-race", accountId, name: "pi.ready" });
  await legacy.close();
  const legacyDir = path.join(legacyRoot, "trace-legacy-race");
  const legacyEventsPath = path.join(legacyDir, "events.jsonl");
  const legacyEvents = (await fs.readFile(legacyEventsPath, "utf8")).trim().split("\n").map(JSON.parse);
  legacyEvents.forEach((event, index) => { event.sequence = index === 0 ? 1 : index; });
  await fs.writeFile(legacyEventsPath, `${legacyEvents.map((event) => JSON.stringify(event)).join("\n")}\n`, "utf8");
  const legacyManifestPath = path.join(legacyDir, "manifest.json");
  const legacyManifest = JSON.parse(await fs.readFile(legacyManifestPath, "utf8"));
  legacyManifest.event_count = 2;
  legacyManifest.next_sequence = 3;
  await fs.writeFile(legacyManifestPath, JSON.stringify(legacyManifest, null, 2), "utf8");
  const recovered = new LocalTraceStore({ rootPath: legacyRoot });
  const recoveredDetail = await recovered.detail("trace-legacy-race", { accountId, includePayload: false });
  assert.equal(recoveredDetail.sequence_projection, "startup_create_race_v1");
  assert.deepEqual(recoveredDetail.events.map((event) => event.sequence), [1, 2, 3]);
  assert.deepEqual(recoveredDetail.events.map((event) => event.recorded_sequence), [1, 1, 2]);
  assert.deepEqual(
    (await fs.readFile(legacyEventsPath, "utf8")).trim().split("\n").map((line) => JSON.parse(line).sequence),
    [1, 1, 2],
  );
  await recovered.close();

  console.log(`vibe trace compaction contract: PASS (${compactBytes}/${naiveBytes} bytes)`);
} finally {
  await fs.rm(temp, { recursive: true, force: true });
}
