import { randomUUID } from "node:crypto";

export const PROTOCOL_VERSION = 3;
export const MAX_FRAME_BYTES = 16 * 1024 * 1024;
// The Electron child is client-owned; server-hosted Agent frames are retired.
export const EXECUTION_MODES = Object.freeze(["local"]);

const ENVELOPE_KEYS = new Set([
  "protocol_version", "type", "run_id", "turn_id", "request_id",
  "message_id", "reply_to", "payload",
]);
const REQUEST_TYPES = new Set(["start", "abort", "complete_no_tools"]);
const RESPONSE_TYPES = new Set([
  "session_open_result", "tool_wave_result", "interaction_response", "finish", "repair_final",
]);
const OUTBOUND_TYPES = new Set([
  "ready", "session_open", "session_checkpoint", "provider_payload", "assistant_delta",
  "assistant_end", "tool_wave", "local_tool_start", "local_tool_update", "local_tool_end", "tool_rejected", "skill_loaded",
  "interaction_request", "candidate_final", "compaction_start", "compaction_end",
  "complete_no_tools_result", "session_title", "done", "error", "aborted",
]);

export class ProtocolError extends Error {
  constructor(code) {
    super(code);
    this.name = "ProtocolError";
    this.code = code;
  }
}

function fail(code) {
  throw new ProtocolError(code);
}

function object(value, code) {
  if (value === null || typeof value !== "object" || Array.isArray(value)) fail(code);
  return value;
}

function exact(value, allowed, required, code) {
  const row = object(value, code);
  for (const key of Object.keys(row)) if (!allowed.has(key)) fail(`${code}_unknown_field`);
  for (const key of required) if (!Object.hasOwn(row, key)) fail(`${code}_missing_field`);
  return row;
}

function string(value, code, { allowEmpty = false, max = 1_000_000 } = {}) {
  if (typeof value !== "string" || (!allowEmpty && value.length === 0) || value.length > max) fail(code);
  return value;
}

function optionalString(value, code, options) {
  if (value !== undefined && value !== null) string(value, code, options);
}

function boolean(value, code) {
  if (typeof value !== "boolean") fail(code);
}

function finiteNumber(value, code, { min = -Infinity, max = Infinity, integer = false } = {}) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) fail(code);
  if (integer && !Number.isInteger(value)) fail(code);
}

function array(value, code, max = 10_000) {
  if (!Array.isArray(value) || value.length > max) fail(code);
  return value;
}

function jsonValue(value, code, depth = 0) {
  if (depth > 64) fail(code);
  if (value === null || ["string", "boolean"].includes(typeof value)) return;
  if (typeof value === "number" && Number.isFinite(value)) return;
  if (Array.isArray(value)) {
    if (value.length > 100_000) fail(code);
    for (const item of value) jsonValue(item, code, depth + 1);
    return;
  }
  if (typeof value === "object") {
    if (Object.keys(value).length > 100_000) fail(code);
    for (const item of Object.values(value)) jsonValue(item, code, depth + 1);
    return;
  }
  fail(code);
}

function validateUrl(value, code) {
  const raw = string(value, code, { max: 4096 });
  if (raw !== raw.trim() || raw.includes("\\") || /[\u0000-\u001f\u007f]/u.test(raw)) fail(code);
  let parsed;
  try {
    parsed = new URL(raw);
  } catch {
    fail(code);
  }
  if (!new Set(["https:", "http:"]).has(parsed.protocol)
    || parsed.username || parsed.password || parsed.search || parsed.hash) fail(code);
}

function validateHeaders(value, code) {
  const headers = object(value, code);
  const entries = Object.entries(headers);
  if (entries.length > 32) fail(code);
  const seen = new Set();
  for (const [name, rawValue] of entries) {
    const normalized = String(name).toLowerCase();
    if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,128}$/u.test(name)
      || seen.has(normalized)
      || typeof rawValue !== "string"
      || rawValue.length > 32_768
      || /[\u0000-\u001f\u007f]/u.test(rawValue)) fail(code);
    seen.add(normalized);
  }
}

function validateModel(value) {
  const row = exact(value, new Set([
    "id", "name", "api", "provider", "base_url", "reasoning", "input", "cost",
    "context_window", "max_tokens", "compat", "sampling_params", "headers",
  ]), new Set(["id", "provider"]), "start_model_invalid");
  string(row.id, "start_model_id_invalid", { max: 512 });
  optionalString(row.name, "start_model_name_invalid", { max: 512 });
  optionalString(row.api, "start_model_api_invalid", { max: 128 });
  string(row.provider, "start_model_provider_invalid", { max: 256 });
  optionalString(row.base_url, "start_model_base_url_invalid", { max: 4096 });
  if (row.reasoning !== undefined) boolean(row.reasoning, "start_model_reasoning_invalid");
  if (row.input !== undefined) {
    for (const item of array(row.input, "start_model_input_invalid", 4)) {
      if (!new Set(["text", "image"]).has(item)) fail("start_model_input_invalid");
    }
  }
  for (const key of ["cost", "compat", "sampling_params"]) {
    if (row[key] !== undefined) jsonValue(object(row[key], `start_model_${key}_invalid`), `start_model_${key}_invalid`);
  }
  if (row.headers !== undefined) validateHeaders(row.headers, "start_model_headers_invalid");
  if (row.context_window !== undefined) finiteNumber(row.context_window, "start_model_context_window_invalid", { min: 1, integer: true });
  if (row.max_tokens !== undefined) finiteNumber(row.max_tokens, "start_model_max_tokens_invalid", { min: 1, integer: true });
}

function validateProvider(value) {
  const row = exact(value, new Set([
    "id", "name", "provider_type", "base_url", "proxy_url", "api_key", "model", "model_name", "model_config", "api", "headers",
    "context_window", "max_tokens", "cost", "reasoning", "input", "compat", "mode",
  ]), new Set(["model", "mode", "base_url", "api_key"]), "start_provider_invalid");
  if (row.mode !== "direct") fail("start_provider_mode_invalid");
  // Electron Main receives one complete run snapshot and is the only caller
  // allowed to inject this credential into the child start frame.
  validateUrl(row.base_url, "start_provider_base_url_invalid");
  if (row.proxy_url !== undefined) validateUrl(row.proxy_url, "start_provider_proxy_url_invalid");
  string(row.api_key, "start_provider_api_key_invalid", { max: 32_768 });
  if (/[\u0000-\u001f\u007f]/u.test(row.api_key)) fail("start_provider_api_key_invalid");
  for (const key of ["id", "name", "provider_type", "model", "model_name", "api"]) {
    optionalString(row[key], `start_provider_${key}_invalid`, { max: 512 });
  }
  for (const key of ["cost", "compat", "model_config"]) {
    if (row[key] !== undefined) jsonValue(object(row[key], `start_provider_${key}_invalid`), `start_provider_${key}_invalid`);
  }
  if (row.headers !== undefined) validateHeaders(row.headers, "start_provider_headers_invalid");
  if (row.context_window !== undefined) finiteNumber(row.context_window, "start_provider_context_invalid", { min: 1, integer: true });
  if (row.max_tokens !== undefined) finiteNumber(row.max_tokens, "start_provider_max_tokens_invalid", { min: 1, integer: true });
  if (row.reasoning !== undefined) boolean(row.reasoning, "start_provider_reasoning_invalid");
  if (row.input !== undefined) {
    const input = array(row.input, "start_provider_input_invalid", 2);
    if (!input.length || !input.includes("text")
      || input.some((item) => !new Set(["text", "image"]).has(item))) {
      fail("start_provider_input_invalid");
    }
  }
}

function validateToolChoice(value, code) {
  if (new Set(["auto", "none", "required"]).has(value)) return;
  const choice = exact(value, new Set(["type", "function"]), new Set(["type", "function"]), code);
  if (choice.type !== "function") fail(code);
  const fn = exact(choice.function, new Set(["name"]), new Set(["name"]), code);
  string(fn.name, code, { max: 128 });
}

function validateRequestOverrides(value, code) {
  const overrides = exact(value, new Set(["enable_thinking", "tool_stream", "thinking"]), new Set(), code);
  if (overrides.enable_thinking !== undefined && overrides.enable_thinking !== false) fail(code);
  if (overrides.tool_stream !== undefined) boolean(overrides.tool_stream, code);
  if (overrides.thinking !== undefined) {
    const thinking = exact(overrides.thinking, new Set(["type"]), new Set(["type"]), code);
    if (thinking.type !== "disabled") fail(code);
  }
}

function validateOptions(value) {
  const row = exact(value, new Set([
    "temperature", "max_tokens", "timeout_ms", "max_retries", "max_retry_delay_ms",
    "sampling_params", "payload_overrides", "payload_capture", "session_id", "tool_choice",
    "transport", "ipc_timeout_ms", "generate_session_title", "thinking_level",
    "max_model_calls", "max_wall_clock_ms",
  ]), new Set(), "start_options_invalid");
  if (row.temperature !== undefined) finiteNumber(row.temperature, "start_temperature_invalid", { min: 0, max: 2 });
  if (row.max_tokens !== undefined) finiteNumber(row.max_tokens, "start_max_tokens_invalid", { min: 1, integer: true });
  if (row.timeout_ms !== undefined) finiteNumber(row.timeout_ms, "start_timeout_invalid", { min: 1, max: 1_200_000, integer: true });
  if (row.max_retries !== undefined && row.max_retries !== 0) fail("start_max_retries_must_be_zero");
  if (row.max_retry_delay_ms !== undefined) finiteNumber(row.max_retry_delay_ms, "start_retry_delay_invalid", { min: 0, max: 60_000, integer: true });
  if (row.ipc_timeout_ms !== undefined) finiteNumber(row.ipc_timeout_ms, "start_ipc_timeout_invalid", { min: 1_000, max: 1_200_000, integer: true });
  if (row.payload_capture !== undefined) boolean(row.payload_capture, "start_payload_capture_invalid");
  if (row.generate_session_title !== undefined) boolean(row.generate_session_title, "start_generate_session_title_invalid");
  if (row.max_model_calls !== undefined) finiteNumber(
    row.max_model_calls, "start_max_model_calls_invalid", { min: 1, max: 100, integer: true },
  );
  if (row.max_wall_clock_ms !== undefined) finiteNumber(
    row.max_wall_clock_ms, "start_max_wall_clock_invalid", { min: 1_000, max: 3_600_000, integer: true },
  );
  if (row.thinking_level !== undefined
    && !new Set(["off", "minimal", "low", "medium", "high", "xhigh", "max"]).has(row.thinking_level)) {
    fail("start_thinking_level_invalid");
  }
  if (row.session_id !== undefined) string(row.session_id, "start_session_id_invalid", { max: 512 });
  if (row.tool_choice !== undefined) validateToolChoice(row.tool_choice, "start_tool_choice_invalid");
  if (row.transport !== undefined && !new Set(["sse", "auto"]).has(row.transport)) fail("start_transport_invalid");
  if (row.payload_overrides !== undefined) validateRequestOverrides(row.payload_overrides, "start_payload_overrides_invalid");
  if (row.sampling_params !== undefined) jsonValue(object(row.sampling_params, "start_sampling_params_invalid"), "start_sampling_params_invalid");
}

function validateTools(value) {
  for (const tool of array(value, "start_tools_invalid", 128)) {
    const row = exact(tool, new Set(["name", "label", "description", "parameters", "execution_mode", "type", "function"]), new Set(), "start_tool_invalid");
    if (row.type !== undefined || row.function !== undefined) {
      if (row.type !== "function") fail("start_tool_type_invalid");
      const fn = exact(row.function, new Set(["name", "description", "parameters", "strict"]), new Set(["name", "parameters"]), "start_tool_function_invalid");
      string(fn.name, "start_tool_name_invalid", { max: 128 });
      optionalString(fn.description, "start_tool_description_invalid", { allowEmpty: true, max: 8192 });
      jsonValue(object(fn.parameters, "start_tool_parameters_invalid"), "start_tool_parameters_invalid");
      if (fn.strict !== undefined) boolean(fn.strict, "start_tool_strict_invalid");
      continue;
    }
    string(row.name, "start_tool_name_invalid", { max: 128 });
    optionalString(row.label, "start_tool_label_invalid", { allowEmpty: true, max: 256 });
    optionalString(row.description, "start_tool_description_invalid", { allowEmpty: true, max: 8192 });
    jsonValue(object(row.parameters, "start_tool_parameters_invalid"), "start_tool_parameters_invalid");
    if (row.execution_mode !== undefined && !new Set(["parallel", "sequential"]).has(row.execution_mode)) fail("start_tool_execution_mode_invalid");
  }
}

function validateSkill(value) {
  const row = exact(value, new Set([
    "schema", "name", "description", "version", "sha256", "content", "file_path",
  ]), new Set([
    "schema", "name", "description", "version", "sha256", "content", "file_path",
  ]), "start_skill_invalid");
  if (row.schema !== "vibe_agent_skill.v1" || row.name !== "vibe-knowledge") fail("start_skill_identity_invalid");
  string(row.description, "start_skill_description_invalid", { max: 1024 });
  string(row.version, "start_skill_version_invalid", { max: 64 });
  if (!/^[0-9a-f]{64}$/.test(String(row.sha256 || ""))) fail("start_skill_hash_invalid");
  string(row.content, "start_skill_content_invalid", { max: 200_000 });
  string(row.file_path, "start_skill_path_invalid", { max: 4096 });
  if (/[\u0000-\u001f\u007f]/u.test(row.file_path)) fail("start_skill_path_invalid");
}

function validateLocalFiles(value) {
  for (const item of array(value, "start_local_files_invalid", 10)) {
    const row = exact(item, new Set([
      "schema", "ref_id", "name", "absolute_path", "mime", "size", "last_modified", "dev", "ino",
    ]), new Set([
      "schema", "ref_id", "name", "absolute_path", "mime", "size", "last_modified", "dev", "ino",
    ]), "start_local_file_invalid");
    if (row.schema !== "local_file_ref.v1") fail("start_local_file_schema_invalid");
    string(row.ref_id, "start_local_file_ref_invalid", { max: 128 });
    string(row.name, "start_local_file_name_invalid", { max: 1024 });
    string(row.absolute_path, "start_local_file_path_invalid", { max: 4096 });
    if (/[\u0000-\u001f\u007f]/u.test(row.name) || /[\u0000-\u001f\u007f]/u.test(row.absolute_path)) {
      fail("start_local_file_path_invalid");
    }
    string(row.mime, "start_local_file_mime_invalid", { max: 256 });
    finiteNumber(row.size, "start_local_file_size_invalid", { min: 0, integer: true });
    finiteNumber(row.last_modified, "start_local_file_mtime_invalid", { min: 0, integer: true });
    finiteNumber(row.dev, "start_local_file_dev_invalid", { min: 0, integer: true });
    finiteNumber(row.ino, "start_local_file_ino_invalid", { min: 0, integer: true });
  }
}

function validatePiSession(value) {
  const row = exact(value, new Set([
    "schema", "mode", "session_id", "directory", "file_path", "format_version",
    "bootstrap_messages", "bootstrap_sequence", "resume_messages", "resume_key",
  ]), new Set([
    "schema", "mode", "session_id", "directory", "file_path", "format_version",
  ]), "start_pi_session_invalid");
  if (row.schema !== "vibe.pi_session.v1") fail("start_pi_session_schema_invalid");
  if (!new Set(["create", "open"]).has(row.mode)) fail("start_pi_session_mode_invalid");
  string(row.session_id, "start_pi_session_id_invalid", { max: 160 });
  for (const key of ["directory", "file_path"]) {
    string(row[key], "start_pi_session_path_invalid", { max: 4096 });
    if (/[\u0000-\u001f\u007f]/u.test(row[key])) fail("start_pi_session_path_invalid");
  }
  if (row.format_version !== 3) fail("start_pi_session_version_invalid");
  if (row.bootstrap_messages !== undefined) {
    jsonValue(array(row.bootstrap_messages, "start_pi_session_bootstrap_invalid", 100_000), "start_pi_session_bootstrap_invalid");
  }
  if (row.bootstrap_sequence !== undefined) {
    finiteNumber(row.bootstrap_sequence, "start_pi_session_bootstrap_sequence_invalid", { min: 0, integer: true });
  }
  if (row.resume_messages !== undefined) {
    jsonValue(array(row.resume_messages, "start_pi_session_resume_invalid", 8), "start_pi_session_resume_invalid");
  }
  optionalString(row.resume_key, "start_pi_session_resume_key_invalid", { max: 512 });
  if (row.mode === "create") {
    if (!Array.isArray(row.bootstrap_messages) || row.bootstrap_sequence === undefined
      || row.resume_messages !== undefined || row.resume_key !== undefined) {
      fail("start_pi_session_create_invalid");
    }
  } else if (row.bootstrap_messages !== undefined || row.bootstrap_sequence !== undefined
    || Boolean(row.resume_messages) !== Boolean(row.resume_key)) {
    fail("start_pi_session_open_invalid");
  }
}

function validateStartPayload(value) {
  const candidate = object(value, "start_payload_invalid");
  const operation = candidate.operation ?? "agent";
  const allowed = new Set([
    "operation", "system_prompt", "prompt", "user_text", "tools", "model", "provider",
    "options", "fake", "execution_mode", "skill", "local_files",
    ...(operation === "complete_no_tools" ? ["messages"] : []),
    ...(operation === "agent" ? ["pi_session"] : []),
  ]);
  const required = operation === "self_check"
    ? new Set(["operation", "execution_mode"])
    : operation === "agent"
      ? new Set(["system_prompt", "tools", "provider", "execution_mode", "pi_session"])
      : new Set(["system_prompt", "tools", "provider", "execution_mode"]);
  const row = exact(candidate, allowed, required, "start_payload_invalid");
  if (!new Set(["agent", "complete_no_tools", "self_check"]).has(operation)) fail("start_operation_invalid");
  const executionMode = row.execution_mode ?? "local";
  if (!EXECUTION_MODES.includes(executionMode)) fail("start_execution_mode_invalid");
  if (operation === "self_check") {
    if (Object.keys(row).some((key) => !new Set(["operation", "execution_mode"]).has(key))) {
      fail("start_self_check_invalid");
    }
    return;
  }
  string(row.system_prompt, "start_system_prompt_invalid", { allowEmpty: true, max: 2_000_000 });
  if (row.messages !== undefined) jsonValue(array(row.messages, "start_messages_invalid", 100_000), "start_messages_invalid");
  if (row.prompt !== undefined) jsonValue(row.prompt, "start_prompt_invalid");
  optionalString(row.user_text, "start_user_text_invalid", { allowEmpty: true, max: 2_000_000 });
  validateTools(row.tools);
  if (row.skill !== undefined) validateSkill(row.skill);
  if (row.local_files !== undefined) validateLocalFiles(row.local_files);
  if (row.pi_session !== undefined) validatePiSession(row.pi_session);
  if (row.model !== undefined) validateModel(row.model);
  validateProvider(row.provider);
  validateOptions(row.options ?? {});
  if (row.fake !== undefined && row.fake !== null) jsonValue(object(row.fake, "start_fake_invalid"), "start_fake_invalid");
  if (row.prompt === undefined && row.user_text === undefined && operation !== "complete_no_tools") fail("start_prompt_missing");
}

function validateToolResult(value, code) {
  const row = exact(value, new Set(["content", "details", "is_error", "terminate", "usage"]), new Set(["content"]), code);
  jsonValue(row.content, `${code}_content_invalid`);
  if (row.details !== undefined) jsonValue(row.details, `${code}_details_invalid`);
  if (row.is_error !== undefined) boolean(row.is_error, `${code}_error_invalid`);
  if (row.terminate !== undefined) boolean(row.terminate, `${code}_terminate_invalid`);
  if (row.usage !== undefined) jsonValue(row.usage, `${code}_usage_invalid`);
  return row;
}

function validateInteraction(value, code) {
  const row = exact(value, new Set([
    "interaction_id", "confirmation_id", "sequence", "kind", "spec_digest",
    "question_to_user", "description", "options", "input", "preview",
  ]), new Set(["interaction_id", "sequence", "kind", "spec_digest"]), code);
  string(row.interaction_id, `${code}_id_invalid`, { max: 256 });
  optionalString(row.confirmation_id, `${code}_confirmation_invalid`, { max: 256 });
  finiteNumber(row.sequence, `${code}_sequence_invalid`, { min: 1, max: 1_000_000, integer: true });
  if (!new Set(["clarification", "knowledge_confirmation"]).has(row.kind)) fail(`${code}_kind_invalid`);
  if (typeof row.spec_digest !== "string" || !/^[0-9a-f]{64}$/.test(row.spec_digest)) fail(`${code}_digest_invalid`);
  for (const key of ["question_to_user", "description"]) {
    if (row[key] !== undefined) optionalString(row[key], `${code}_${key}_invalid`, { allowEmpty: true, max: 2_000_000 });
  }
  if (row.options !== undefined) jsonValue(array(row.options, `${code}_options_invalid`, 32), `${code}_options_invalid`);
  if (row.input !== undefined) jsonValue(object(row.input, `${code}_input_invalid`), `${code}_input_invalid`);
  if (row.preview !== undefined) jsonValue(row.preview, `${code}_preview_invalid`);
  return row;
}

function validateToolWaveResult(value) {
  const row = exact(value, new Set(["wave_id", "results", "stop_after_wave"]), new Set(["wave_id", "results"]), "tool_wave_result_payload_invalid");
  string(row.wave_id, "tool_wave_result_wave_invalid", { max: 256 });
  if (row.stop_after_wave !== undefined) boolean(row.stop_after_wave, "tool_wave_result_stop_invalid");
  let interactionCount = 0;
  for (const result of array(row.results, "tool_wave_result_results_invalid", 128)) {
    const item = exact(result, new Set(["tool_call_id", "content", "details", "is_error", "terminate", "usage", "interaction"]), new Set(["tool_call_id"]), "tool_wave_result_invalid");
    string(item.tool_call_id, "tool_wave_result_call_invalid", { max: 256 });
    if (item.interaction !== undefined) {
      if (Object.keys(item).some((key) => !new Set(["tool_call_id", "interaction"]).has(key))) fail("tool_wave_result_interaction_mixed");
      validateInteraction(item.interaction, "tool_wave_result_interaction_invalid");
      interactionCount += 1;
    } else {
      validateToolResult(Object.fromEntries(Object.entries(item).filter(([key]) => key !== "tool_call_id")), "tool_wave_result_invalid");
    }
  }
  if (interactionCount > 1) fail("tool_wave_result_interaction_multiple");
  if (interactionCount && row.stop_after_wave) fail("tool_wave_result_interaction_stop_conflict");
}

function validateInteractionResponse(value) {
  const row = exact(value, new Set([
    "interaction_id", "confirmation_id", "sequence", "wave_id", "tool_call_id", "spec_digest",
    "status", "result", "user_message",
  ]), new Set([
    "interaction_id", "sequence", "wave_id", "tool_call_id", "spec_digest", "status", "result",
  ]), "interaction_response_payload_invalid");
  string(row.interaction_id, "interaction_response_id_invalid", { max: 256 });
  optionalString(row.confirmation_id, "interaction_response_confirmation_invalid", { max: 256 });
  finiteNumber(row.sequence, "interaction_response_sequence_invalid", { min: 1, max: 1_000_000, integer: true });
  string(row.wave_id, "interaction_response_wave_invalid", { max: 256 });
  string(row.tool_call_id, "interaction_response_call_invalid", { max: 256 });
  if (typeof row.spec_digest !== "string" || !/^[0-9a-f]{64}$/.test(row.spec_digest)) fail("interaction_response_digest_invalid");
  if (!new Set(["resolved", "applied", "replayed", "cancelled", "stale", "failed", "stopped"]).has(row.status)) fail("interaction_response_status_invalid");
  optionalString(row.user_message, "interaction_response_user_message_invalid", { max: 2_000_000 });
  validateToolResult(row.result, "interaction_response_result_invalid");
}

function parseFrame(line, session) {
  if (typeof line !== "string" || Buffer.byteLength(line, "utf8") > MAX_FRAME_BYTES) fail("frame_too_large");
  let parsed;
  try {
    parsed = JSON.parse(line);
  } catch {
    fail("frame_json_invalid");
  }
  const frame = exact(parsed, ENVELOPE_KEYS, new Set(["protocol_version", "type", "run_id", "turn_id", "request_id", "payload"]), "frame_invalid");
  if (frame.protocol_version !== PROTOCOL_VERSION) fail("protocol_version_invalid");
  string(frame.type, "frame_type_invalid", { max: 128 });
  for (const key of ["run_id", "turn_id", "request_id"]) string(frame[key], `frame_${key}_invalid`, { max: 256 });
  const hasMessageId = Object.hasOwn(frame, "message_id");
  const hasReplyTo = Object.hasOwn(frame, "reply_to");
  if (hasMessageId === hasReplyTo) fail("frame_correlation_invalid");
  if (hasMessageId) string(frame.message_id, "frame_message_id_invalid", { max: 256 });
  if (hasReplyTo) string(frame.reply_to, "frame_reply_to_invalid", { max: 256 });
  if (session && [frame.run_id, frame.turn_id, frame.request_id].some((value, index) => value !== [session.run_id, session.turn_id, session.request_id][index])) fail("frame_identity_mismatch");
  return { frame, hasMessageId, hasReplyTo };
}

export function parseInboundLine(line, session = undefined) {
  const { frame, hasMessageId, hasReplyTo } = parseFrame(line, session);
  if (REQUEST_TYPES.has(frame.type) && !hasMessageId) fail("frame_request_correlation_invalid");
  if (RESPONSE_TYPES.has(frame.type) && !hasReplyTo) fail("frame_response_correlation_invalid");
  if (![...REQUEST_TYPES, ...RESPONSE_TYPES].includes(frame.type)) fail("frame_type_unknown");
  if (frame.type === "start") validateStartPayload(frame.payload);
  else if (frame.type === "abort") exact(frame.payload, new Set(["reason"]), new Set(), "abort_payload_invalid");
  else if (frame.type === "complete_no_tools") {
    const payload = exact(frame.payload, new Set(["purpose", "system_prompt", "messages", "prompt", "call_id", "max_output_tokens"]), new Set(["purpose", "prompt", "call_id", "max_output_tokens"]), "complete_no_tools_payload_invalid");
    if (payload.purpose !== "language_repair") fail("complete_no_tools_purpose_invalid");
    string(payload.call_id, "complete_no_tools_call_id_invalid", { max: 256 });
    finiteNumber(payload.max_output_tokens, "complete_no_tools_max_output_invalid", { min: 1, max: 65_536, integer: true });
    optionalString(payload.system_prompt, "complete_no_tools_system_prompt_invalid", { allowEmpty: true, max: 200_000 });
    jsonValue(payload.messages ?? [], "complete_no_tools_messages_invalid");
    jsonValue(payload.prompt, "complete_no_tools_prompt_invalid");
  } else if (frame.type === "session_open_result") {
    const row = exact(frame.payload, new Set(["accepted"]), new Set(["accepted"]), "session_open_result_payload_invalid");
    if (row.accepted !== true) fail("session_open_result_rejected");
  } else if (frame.type === "tool_wave_result") validateToolWaveResult(frame.payload);
  else if (frame.type === "interaction_response") validateInteractionResponse(frame.payload);
  else if (frame.type === "finish") {
    const row = exact(frame.payload, new Set(["publish_text"]), new Set(), "finish_payload_invalid");
    optionalString(row.publish_text, "finish_publish_text_invalid", { allowEmpty: true, max: 2_000_000 });
  } else {
    const row = exact(frame.payload, new Set(["instruction", "system_prompt"]), new Set(["instruction"]), "repair_final_payload_invalid");
    string(row.instruction, "repair_final_instruction_invalid", { max: 200_000 });
    optionalString(row.system_prompt, "repair_final_system_prompt_invalid", { allowEmpty: true, max: 200_000 });
  }
  return frame;
}

function validateOutboundPayload(frame) {
  const payload = object(frame.payload, "outbound_payload_invalid");
  if (frame.type === "ready") {
    const row = exact(payload, new Set(["agent_core_version", "pi_ai_version", "pi_coding_agent_version", "undici_version", "bridge_protocol_version", "node_version", "execution_mode"]), new Set(["agent_core_version", "pi_ai_version", "pi_coding_agent_version", "undici_version", "bridge_protocol_version", "node_version", "execution_mode"]), "ready_payload_invalid");
    for (const key of ["agent_core_version", "pi_ai_version", "pi_coding_agent_version", "undici_version", "node_version"]) string(row[key], `ready_${key}_invalid`, { max: 64 });
    finiteNumber(row.bridge_protocol_version, "ready_protocol_invalid", { min: 1, integer: true });
    if (!EXECUTION_MODES.includes(row.execution_mode)) fail("ready_execution_mode_invalid");
  } else if (frame.type === "session_open") {
    const row = exact(payload, new Set([
      "schema", "session_id", "pi_session_id", "format_version", "resumed",
      "entry_count", "context_message_count", "last_entry_id", "bootstrap_sequence",
    ]), new Set([
      "schema", "session_id", "pi_session_id", "format_version", "resumed",
      "entry_count", "context_message_count", "bootstrap_sequence",
    ]), "session_open_payload_invalid");
    if (row.schema !== "vibe.pi_session.v1") fail("session_open_schema_invalid");
    for (const key of ["session_id", "pi_session_id"]) string(row[key], `session_open_${key}_invalid`, { max: 160 });
    if (row.format_version !== 3) fail("session_open_version_invalid");
    boolean(row.resumed, "session_open_resumed_invalid");
    for (const key of ["entry_count", "context_message_count", "bootstrap_sequence"]) {
      finiteNumber(row[key], `session_open_${key}_invalid`, { min: 0, integer: true });
    }
    optionalString(row.last_entry_id, "session_open_leaf_invalid", { max: 160 });
  } else if (frame.type === "session_checkpoint") {
    const row = exact(payload, new Set([
      "schema", "session_id", "pi_session_id", "format_version", "resumed", "phase",
      "entry_count", "context_message_count", "last_entry_id", "bootstrap_sequence",
    ]), new Set([
      "schema", "session_id", "pi_session_id", "format_version", "resumed", "phase",
      "entry_count", "context_message_count", "bootstrap_sequence",
    ]), "session_checkpoint_payload_invalid");
    if (row.schema !== "vibe.pi_session.v1") fail("session_checkpoint_schema_invalid");
    for (const key of ["session_id", "pi_session_id"]) string(row[key], `session_checkpoint_${key}_invalid`, { max: 160 });
    if (row.format_version !== 3) fail("session_checkpoint_version_invalid");
    boolean(row.resumed, "session_checkpoint_resumed_invalid");
    if (!new Set(["completed", "waiting_user", "aborted", "failed"]).has(row.phase)) {
      fail("session_checkpoint_phase_invalid");
    }
    for (const key of ["entry_count", "context_message_count", "bootstrap_sequence"]) {
      finiteNumber(row[key], `session_checkpoint_${key}_invalid`, { min: 0, integer: true });
    }
    optionalString(row.last_entry_id, "session_checkpoint_leaf_invalid", { max: 160 });
  } else if (frame.type === "provider_payload") {
    const row = exact(payload, new Set(["call_id", "purpose", "sha256", "characters", "tool_names", "body"]), new Set(["call_id", "purpose", "sha256", "characters", "tool_names"]), "provider_payload_invalid");
    string(row.call_id, "provider_payload_call_invalid", { max: 256 });
    if (!/^[0-9a-f]{64}$/.test(String(row.sha256 ?? ""))) fail("provider_payload_digest_invalid");
    finiteNumber(row.characters, "provider_payload_characters_invalid", { min: 0, integer: true });
    jsonValue(row.tool_names, "provider_payload_tools_invalid");
    if (row.body !== undefined) jsonValue(row.body, "provider_payload_body_invalid");
  } else if (frame.type === "assistant_delta") {
    const row = exact(payload, new Set(["text", "public"]), new Set(["text"]), "assistant_delta_payload_invalid");
    string(row.text, "assistant_delta_text_invalid", { allowEmpty: true, max: 2_000_000 });
    if (row.public !== undefined) boolean(row.public, "assistant_delta_public_invalid");
  } else if (frame.type === "assistant_end") {
    const row = exact(payload, new Set(["call_id", "purpose", "text", "has_tool_calls", "tool_calls", "stop_reason", "usage"]), new Set(["text", "has_tool_calls", "tool_calls", "stop_reason", "usage"]), "assistant_end_payload_invalid");
    optionalString(row.call_id, "assistant_end_call_invalid", { max: 256 });
    optionalString(row.purpose, "assistant_end_purpose_invalid", { max: 64 });
    string(row.text, "assistant_end_text_invalid", { allowEmpty: true, max: 2_000_000 });
    boolean(row.has_tool_calls, "assistant_end_tools_flag_invalid");
    jsonValue(array(row.tool_calls, "assistant_end_tools_invalid", 128), "assistant_end_tools_invalid");
    string(row.stop_reason, "assistant_end_stop_invalid", { max: 64 });
    jsonValue(row.usage, "assistant_end_usage_invalid");
  } else if (frame.type === "tool_wave") {
    const row = exact(payload, new Set(["wave_id", "calls"]), new Set(["wave_id", "calls"]), "tool_wave_payload_invalid");
    string(row.wave_id, "tool_wave_id_invalid", { max: 256 });
    jsonValue(array(row.calls, "tool_wave_calls_invalid", 128), "tool_wave_calls_invalid");
  } else if (frame.type === "local_tool_start") {
    const row = exact(payload, new Set(["tool_call_id", "tool_name", "arguments"]), new Set(["tool_call_id", "tool_name", "arguments"]), "local_tool_start_payload_invalid");
    string(row.tool_call_id, "local_tool_start_call_invalid", { max: 256 });
    if (!["read", "write", "edit", "bash"].includes(row.tool_name)) fail("local_tool_start_name_invalid");
    jsonValue(row.arguments, "local_tool_start_arguments_invalid");
  } else if (frame.type === "local_tool_update") {
    const row = exact(payload, new Set(["tool_call_id", "tool_name", "partial_result"]), new Set(["tool_call_id", "tool_name", "partial_result"]), "local_tool_update_payload_invalid");
    string(row.tool_call_id, "local_tool_update_call_invalid", { max: 256 });
    if (!["read", "write", "edit", "bash"].includes(row.tool_name)) fail("local_tool_update_name_invalid");
    jsonValue(row.partial_result, "local_tool_update_result_invalid");
  } else if (frame.type === "local_tool_end") {
    const row = exact(payload, new Set(["tool_call_id", "tool_name", "result", "is_error"]), new Set(["tool_call_id", "tool_name", "result", "is_error"]), "local_tool_end_payload_invalid");
    string(row.tool_call_id, "local_tool_end_call_invalid", { max: 256 });
    if (!["read", "write", "edit", "bash"].includes(row.tool_name)) fail("local_tool_end_name_invalid");
    validateToolResult(row.result, "local_tool_end_result_invalid");
    boolean(row.is_error, "local_tool_end_error_invalid");
  } else if (frame.type === "tool_rejected") {
    const row = exact(payload, new Set([
      "tool_call_id", "tool_name", "result", "is_error",
    ]), new Set([
      "tool_call_id", "tool_name", "result", "is_error",
    ]), "tool_rejected_payload_invalid");
    string(row.tool_call_id, "tool_rejected_call_invalid", { max: 256 });
    string(row.tool_name, "tool_rejected_name_invalid", { max: 128 });
    validateToolResult(row.result, "tool_rejected_result_invalid");
    if (row.is_error !== true) fail("tool_rejected_error_invalid");
  } else if (frame.type === "skill_loaded") {
    const row = exact(payload, new Set([
      "name", "version", "sha256", "system_prompt_sha256", "system_prompt_characters",
    ]), new Set([
      "name", "version", "sha256", "system_prompt_sha256", "system_prompt_characters",
    ]), "skill_loaded_payload_invalid");
    if (row.name !== "vibe-knowledge") fail("skill_loaded_name_invalid");
    string(row.version, "skill_loaded_version_invalid", { max: 64 });
    for (const key of ["sha256", "system_prompt_sha256"]) {
      if (!/^[0-9a-f]{64}$/.test(String(row[key] || ""))) fail(`skill_loaded_${key}_invalid`);
    }
    finiteNumber(row.system_prompt_characters, "skill_loaded_prompt_size_invalid", { min: 1, integer: true });
  } else if (frame.type === "interaction_request") {
    const row = exact(payload, new Set([
      "interaction_id", "confirmation_id", "sequence", "wave_id", "tool_call_id", "tool_name", "kind", "spec_digest",
      "question_to_user", "description", "options", "input", "preview",
    ]), new Set(["interaction_id", "sequence", "wave_id", "tool_call_id", "tool_name", "kind", "spec_digest"]), "interaction_request_payload_invalid");
    string(row.interaction_id, "interaction_request_id_invalid", { max: 256 });
    optionalString(row.confirmation_id, "interaction_request_confirmation_invalid", { max: 256 });
    finiteNumber(row.sequence, "interaction_request_sequence_invalid", { min: 1, integer: true });
    for (const key of ["wave_id", "tool_call_id", "tool_name", "kind", "spec_digest"]) string(row[key], `interaction_request_${key}_invalid`, { max: 256 });
    if (row.question_to_user !== undefined) optionalString(row.question_to_user, "interaction_request_question_invalid", { allowEmpty: true, max: 2_000_000 });
    if (row.description !== undefined) optionalString(row.description, "interaction_request_description_invalid", { allowEmpty: true, max: 2_000_000 });
    if (row.options !== undefined) jsonValue(array(row.options, "interaction_request_options_invalid", 32), "interaction_request_options_invalid");
    if (row.input !== undefined) jsonValue(object(row.input, "interaction_request_input_invalid"), "interaction_request_input_invalid");
    if (row.preview !== undefined) jsonValue(row.preview, "interaction_request_preview_invalid");
  } else if (frame.type === "candidate_final") {
    const row = exact(payload, new Set(["text", "usage", "stop_reason", "purpose"]), new Set(["text", "usage", "stop_reason"]), "candidate_final_payload_invalid");
    string(row.text, "candidate_final_text_invalid", { allowEmpty: true, max: 2_000_000 });
    jsonValue(row.usage, "candidate_final_usage_invalid");
    string(row.stop_reason, "candidate_final_stop_invalid", { max: 64 });
  } else if (frame.type === "compaction_start") {
    const row = exact(payload, new Set(["reason"]), new Set(["reason"]), "compaction_start_payload_invalid");
    if (!new Set(["manual", "threshold", "overflow"]).has(row.reason)) fail("compaction_start_reason_invalid");
  } else if (frame.type === "compaction_end") {
    const row = exact(payload, new Set([
      "reason", "aborted", "will_retry", "error", "summary", "first_kept_entry_id",
      "tokens_before", "estimated_tokens_after", "usage", "entry_id",
    ]), new Set(["reason", "aborted", "will_retry"]), "compaction_end_payload_invalid");
    if (!new Set(["manual", "threshold", "overflow"]).has(row.reason)) fail("compaction_end_reason_invalid");
    boolean(row.aborted, "compaction_end_aborted_invalid");
    boolean(row.will_retry, "compaction_end_retry_invalid");
    optionalString(row.error, "compaction_end_error_invalid", { max: 4096 });
    optionalString(row.summary, "compaction_end_summary_invalid", { allowEmpty: true, max: 2_000_000 });
    optionalString(row.first_kept_entry_id, "compaction_end_first_kept_invalid", { max: 160 });
    optionalString(row.entry_id, "compaction_end_entry_invalid", { max: 160 });
    for (const key of ["tokens_before", "estimated_tokens_after"]) {
      if (row[key] !== undefined) finiteNumber(row[key], `compaction_end_${key}_invalid`, { min: 0, integer: true });
    }
    if (row.usage !== undefined) jsonValue(row.usage, "compaction_end_usage_invalid");
    if (!row.aborted && !row.error && (row.summary === undefined
      || row.first_kept_entry_id === undefined || row.tokens_before === undefined
      || row.estimated_tokens_after === undefined || row.entry_id === undefined)) {
      fail("compaction_end_result_invalid");
    }
  } else if (frame.type === "complete_no_tools_result") {
    const row = exact(payload, new Set(["text", "usage"]), new Set(["text", "usage"]), "complete_no_tools_result_invalid");
    string(row.text, "complete_no_tools_text_invalid", { allowEmpty: true, max: 2_000_000 });
    jsonValue(row.usage, "complete_no_tools_usage_invalid");
  } else if (frame.type === "session_title") {
    const row = exact(payload, new Set(["title", "usage"]), new Set(["title", "usage"]), "session_title_payload_invalid");
    string(row.title, "session_title_invalid", { max: 24 });
    if ([...row.title].length > 12 || !/\p{Script=Han}/u.test(row.title) || /[\r\n`#*]/u.test(row.title)) fail("session_title_invalid");
    jsonValue(row.usage, "session_title_usage_invalid");
  } else if (frame.type === "done") {
    const row = exact(payload, new Set(["status", "text", "code"]), new Set(["status"]), "done_payload_invalid");
    if (!new Set(["completed", "waiting_user", "failed", "aborted"]).has(row.status)) fail("done_status_invalid");
    optionalString(row.text, "done_text_invalid", { allowEmpty: true, max: 2_000_000 });
    optionalString(row.code, "done_code_invalid", { max: 256 });
  } else if (frame.type === "error") {
    const row = exact(payload, new Set(["code", "node_version"]), new Set(["code"]), "error_payload_invalid");
    string(row.code, "error_code_invalid", { max: 256 });
    optionalString(row.node_version, "error_node_version_invalid", { max: 64 });
  } else if (frame.type === "aborted") {
    const row = exact(payload, new Set(["status"]), new Set(["status"]), "aborted_payload_invalid");
    string(row.status, "aborted_status_invalid", { max: 64 });
  }
}

export function parseOutboundLine(line, session = undefined) {
  const { frame } = parseFrame(line, session);
  if (!OUTBOUND_TYPES.has(frame.type)) fail("outbound_frame_type_unknown");
  validateOutboundPayload(frame);
  return frame;
}

export function makeFrame(identity, type, payload, correlation = {}) {
  const frame = {
    protocol_version: PROTOCOL_VERSION,
    type,
    run_id: identity.run_id,
    turn_id: identity.turn_id,
    request_id: identity.request_id,
    ...(correlation.reply_to ? { reply_to: correlation.reply_to } : { message_id: correlation.message_id ?? randomUUID() }),
    payload,
  };
  const serialized = JSON.stringify(frame);
  if (Buffer.byteLength(serialized, "utf8") > MAX_FRAME_BYTES) fail("frame_too_large");
  return { frame, serialized };
}

export function identityOf(frame) {
  return { run_id: frame.run_id, turn_id: frame.turn_id, request_id: frame.request_id };
}

export const _test = { exact, jsonValue, validateStartPayload, validateOutboundPayload };
