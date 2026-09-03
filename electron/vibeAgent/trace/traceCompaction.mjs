import { sha256 } from "./traceModel.mjs";

const MAX_PARTIAL_CHARS = 4 * 1024 * 1024;

function serialized(value) {
  return typeof value === "string" ? value : JSON.stringify(value ?? null);
}

export function contentReference(value) {
  const text = String(value ?? "");
  return {
    characters: text.length,
    bytes: Buffer.byteLength(text, "utf8"),
    sha256: sha256(text),
  };
}

export function traceStartPayload(payload = {}) {
  const source = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
  const systemPrompt = String(source.system_prompt ?? "");
  const tools = Array.isArray(source.tools) ? source.tools : [];
  const toolJson = serialized(tools);
  const output = {
    execution_mode: source.execution_mode,
    provider: source.provider,
    options: source.options,
    system_prompt_summary: { count: systemPrompt.length, ...contentReference(systemPrompt) },
    tools_summary: {
      count: tools.length,
      bytes: Buffer.byteLength(toolJson, "utf8"),
      sha256: sha256(toolJson),
    },
    ...(source.pi_session && typeof source.pi_session === "object" ? {
      pi_session: {
        schema: String(source.pi_session.schema || ""),
        mode: String(source.pi_session.mode || ""),
        format_version: Number(source.pi_session.format_version || 0),
        bootstrap_message_count: Array.isArray(source.pi_session.bootstrap_messages)
          ? source.pi_session.bootstrap_messages.length : 0,
        bootstrap_sequence: Number(source.pi_session.bootstrap_sequence || 0),
        resume_message_count: Array.isArray(source.pi_session.resume_messages)
          ? source.pi_session.resume_messages.length : 0,
      },
    } : {}),
    ...(source.skill && typeof source.skill === "object" ? { skill: {
      name: String(source.skill.name || ""),
      version: String(source.skill.version || ""),
      sha256: String(source.skill.sha256 || ""),
    } } : {}),
  };
  for (const key of ["prompt", "user_text", "messages"]) {
    if (source[key] !== undefined) output[key] = source[key];
  }
  return output;
}

export function createAssistantStream({ callId = "", purpose = "main_agent", startedAt = Date.now() } = {}) {
  const timestamp = Number(startedAt);
  return {
    callId: String(callId || ""),
    purpose: String(purpose || "main_agent"),
    startedAt: Number.isFinite(timestamp) ? timestamp : Date.now(),
    firstDeltaAt: null,
    lastDeltaAt: null,
    chunkCount: 0,
    characterCount: 0,
    retainedText: "",
    partialTruncated: false,
  };
}

export function recordAssistantDelta(stream, text, now = Date.now()) {
  const state = stream || createAssistantStream({ startedAt: now });
  const value = String(text ?? "");
  const timestamp = Number(now);
  const at = Number.isFinite(timestamp) ? timestamp : Date.now();
  state.chunkCount += 1;
  state.characterCount += value.length;
  if (state.firstDeltaAt === null) state.firstDeltaAt = at;
  state.lastDeltaAt = at;
  const combined = `${state.retainedText}${value}`;
  if (combined.length > MAX_PARTIAL_CHARS) state.partialTruncated = true;
  state.retainedText = combined.slice(-MAX_PARTIAL_CHARS);
  return state;
}

export function assistantStreamSummary(stream, { callId = "", purpose = "", endedAt = Date.now() } = {}) {
  const state = stream || createAssistantStream({ callId, purpose, startedAt: endedAt });
  const finish = Number.isFinite(Number(endedAt)) ? Number(endedAt) : Date.now();
  return {
    call_id: String(callId || state.callId || ""),
    purpose: String(purpose || state.purpose || "main_agent"),
    chunk_count: Number(state.chunkCount || 0),
    character_count: Number(state.characterCount || 0),
    started_at: new Date(state.startedAt).toISOString(),
    first_delta_at: state.firstDeltaAt === null ? null : new Date(state.firstDeltaAt).toISOString(),
    last_delta_at: state.lastDeltaAt === null ? null : new Date(state.lastDeltaAt).toISOString(),
    ended_at: new Date(finish).toISOString(),
    stream_duration_ms: Math.max(0, finish - state.startedAt),
    first_delta_latency_ms: state.firstDeltaAt === null ? null : Math.max(0, state.firstDeltaAt - state.startedAt),
  };
}

export function assistantPartialPayload(stream, options = {}) {
  const state = stream || createAssistantStream(options);
  return {
    ...assistantStreamSummary(state, options),
    complete: false,
    text: state.retainedText,
    retained_character_count: state.retainedText.length,
    partial_truncated: Boolean(state.partialTruncated),
  };
}

export const traceCompactionConstants = { MAX_PARTIAL_CHARS };
