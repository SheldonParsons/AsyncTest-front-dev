import { createHash, randomBytes, randomUUID } from "node:crypto";

export const TRACE_SCHEMA = "vibe.agent.trace.v1";
export const TRACE_UPLOAD_SCHEMA = "vibe.agent.trace.upload.v1";
export const TRACE_PROTOCOL_VERSION = 1;

const CREDENTIAL_KEY = /^(?:headers?|request[_-]?headers|api[_-]?key|x[_-]?(?:api[_-]?key|auth[_-]?token)|auth[_-]?(?:token|header)|access[_-]?(?:token|key)|refresh[_-]?token|id[_-]?token|(?:session|run|host|proxy)[_-]?(?:token|ticket)|bearer|authorization|proxy[_-]?(?:authorization|auth)|cookie|set-cookie|password|passwd|secret|client[_-]?secret|provider[_-]?key|private[_-]?key|signing[_-]?key|credentials?|token)$/i;

function isCredentialKey(key) {
  const raw = String(key || "").trim();
  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replaceAll("-", "_");
  return CREDENTIAL_KEY.test(raw) || CREDENTIAL_KEY.test(normalized);
}

export function newTraceId() {
  return randomBytes(16).toString("hex");
}

export function newSpanId() {
  return randomBytes(8).toString("hex");
}

export function newEventId() {
  return randomUUID().replaceAll("-", "");
}

export function sha256(value) {
  const hash = createHash("sha256");
  hash.update(value);
  return hash.digest("hex");
}

/**
 * Trace is intentionally not privacy-redacted. User/model text, attachment
 * text, tool arguments and provider payloads are retained verbatim. Credential
 * bearing fields (Authorization, api_key, cookie, …) are removed as secret
 * safety, not privacy redaction; callers must not put secrets in free-form
 * text fields.
 */
export function withoutCredentials(value, key = "", seen = new WeakSet(), depth = 0) {
  if (depth > 64) return "[trace depth omitted]";
  if (typeof value === "string") return value;
  if (value === null || typeof value === "number" || typeof value === "boolean") return value;
  if (value === undefined) return undefined;
  if (isCredentialKey(key)) return "[credential omitted]";
  if (typeof value !== "object") return String(value);
  if (seen.has(value)) return "[trace circular value omitted]";
  seen.add(value);
  if (Array.isArray(value)) return value.map((item) => withoutCredentials(item, "", seen, depth + 1));
  const output = {};
  for (const [childKey, childValue] of Object.entries(value)) {
    if (isCredentialKey(childKey)) {
      // Omit the key entirely.  The Trace ingest API rejects credential field
      // names even when their values have already been replaced.
      continue;
    }
    output[childKey] = withoutCredentials(childValue, childKey, seen, depth + 1);
  }
  return output;
}

export function safeTraceName(value, fallback = "event") {
  const raw = String(value ?? fallback).trim();
  return raw.replace(/[^A-Za-z0-9._-]+/g, "_").slice(0, 160) || fallback;
}

export function normalizeTraceStatus(value) {
  const status = String(value ?? "ok").trim();
  return new Set(["ok", "completed", "error", "failed", "cancelled", "aborted", "closed", "interrupted", "running", "waiting_user"]).has(status)
    ? status
    : "ok";
}

export function canonicalTraceEnvelope({
  traceId,
  sessionId = "",
  goalId = "",
  runId = "",
  sequence,
  kind = "event",
  name = "agent.event",
  spanId = newSpanId(),
  parentSpanId = "",
  status = "ok",
  timestamp = new Date().toISOString(),
  attributes = {},
  payloadRef,
  payloadSha256,
  payloadBytes,
} = {}) {
  const event = {
    schema: TRACE_SCHEMA,
    protocol_version: TRACE_PROTOCOL_VERSION,
    event_id: newEventId(),
    trace_id: String(traceId ?? ""),
    session_id: String(sessionId ?? ""),
    goal_id: String(goalId ?? ""),
    run_id: String(runId ?? ""),
    sequence: Number(sequence),
    kind: String(kind),
    name: String(name),
    span_id: String(spanId),
    ...(parentSpanId ? { parent_span_id: String(parentSpanId) } : {}),
    timestamp: String(timestamp),
    status: normalizeTraceStatus(status),
    attributes: withoutCredentials(attributes),
  };
  if (payloadRef) event.payload_ref = String(payloadRef);
  if (payloadSha256) event.payload_sha256 = String(payloadSha256);
  if (payloadBytes !== undefined) event.payload_bytes = Number(payloadBytes);
  return event;
}
