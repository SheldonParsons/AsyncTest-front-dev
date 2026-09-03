/**
 * Client-side Pi 的唯一知识后端适配器。
 *
 * 这个模块不认识会话编排、不执行本地文件，也不保存响应；它只把一枚
 * 已认证的用户 token 和一个严格的 knowledge_tool_request.v1 发给后端。
 * 原始附件绝不会进入这里，附件经过 Pi 选择后的正文才可以作为 model_authored
 * documents 发送给 Knowledge Capability。
 */
import { createHash, randomUUID } from "node:crypto";

const REQUEST_SCHEMA = "knowledge_tool_request.v1";
const RESPONSE_SCHEMA = "knowledge_tool_response.v1";
const ERROR_SCHEMA = "knowledge_tool_error.v1";
const WAVE_REQUEST_SCHEMA = "knowledge_tool_wave_request.v1";
const WAVE_RESPONSE_SCHEMA = "knowledge_tool_wave_response.v1";
const MAX_BODY_BYTES = 16 * 1024 * 1024;
const ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,159}$/;
const TRUSTED_ORIGINS = new Set(["https://www.asynctest.com", "http://10.23.224.40"]);
const CREDENTIAL_KEYS = new Set([
  "headers", "header", "request_headers",
  "api_key", "apikey", "authorization", "cookie", "password", "passwd",
  "client_secret", "secret", "secret_key", "signing_key", "credentials",
  "access_key", "access_token", "auth_token", "id_token", "refresh_token", "private_key",
  "proxy_authorization", "proxy_auth", "provider_key", "x_api_key",
  "session_token", "session_ticket", "run_token", "host_ticket", "provider_ticket",
  "proxy_token", "bearer", "token",
]);
const OUTCOME_STATUSES = new Set([
  "completed", "waiting_user", "needs_follow_up", "cancelled",
  "retryable_failure", "non_retryable_failure",
]);

const AGENT_BINDING_HEADER = "X-Vibe-Agent-Run-Binding";
const MAX_AGENT_BINDING_LENGTH = 4096;

function normalizeAgentBinding(value) {
  // The binding is issued by the authenticated bootstrap response and is
  // consumed only by Electron Main.  Keep it out of JSON payloads so Pi
  // cannot accidentally echo it to the Knowledge capability.
  const token = value && typeof value === "object" && !Array.isArray(value)
    ? value.token
    : value;
  if (token === undefined || token === null || token === "") return "";
  if (typeof token !== "string") throw new Error("vibe_agent_knowledge_binding_invalid");
  const result = token.trim();
  if (!result || result.length > MAX_AGENT_BINDING_LENGTH
    || /[\u0000-\u001f\u007f]/u.test(result)) {
    throw new Error("vibe_agent_knowledge_binding_invalid");
  }
  return result;
}

function outcomeContractError(code, status, payload) {
  return new KnowledgeRemoteError(
    code,
    "知识服务结果合同无效",
    Number(status || 0),
    payload,
  );
}

function validateRemoteError(value, code, status, payload) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || typeof value.code !== "string" || !value.code.trim()) {
    throw outcomeContractError(code, status, payload);
  }
  if (value.retryable !== undefined && typeof value.retryable !== "boolean") {
    throw outcomeContractError(code, status, payload);
  }
  if (value.message !== undefined && typeof value.message !== "string") {
    throw outcomeContractError(code, status, payload);
  }
  if (value.details !== undefined
    && (!value.details || typeof value.details !== "object" || Array.isArray(value.details))) {
    throw outcomeContractError(code, status, payload);
  }
  return value;
}

/**
 * Validate the six-state CapabilityOutcome envelope before it reaches the
 * local router. Internal fields from an older server outcome are retained for
 * compatibility, but the public identity/status invariants are strict.
 */
function validateOutcome(value, code, status, payload) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.schema !== "knowledge_capability.outcome.v1"
    || typeof value.status !== "string" || !OUTCOME_STATUSES.has(value.status)) {
    throw outcomeContractError(code, status, payload);
  }
  const hasResult = Object.hasOwn(value, "result")
    && value.result !== null && value.result !== undefined;
  const hasError = Object.hasOwn(value, "error") && value.error !== null && value.error !== undefined;
  if (value.status === "completed" && (!hasResult || value.result === null)) {
    throw outcomeContractError(code, status, payload);
  }
  if (["retryable_failure", "non_retryable_failure"].includes(value.status)) {
    if (hasResult || !hasError) throw outcomeContractError(code, status, payload);
    validateRemoteError(value.error, code, status, payload);
    if (value.error.retryable !== undefined
      && value.error.retryable !== (value.status === "retryable_failure")) {
      throw outcomeContractError(code, status, payload);
    }
  } else if (hasError) {
    throw outcomeContractError(code, status, payload);
  }
  if (value.status === "cancelled" && hasResult) {
    throw outcomeContractError(code, status, payload);
  }
  if (value.gaps !== undefined
    && (!Array.isArray(value.gaps) || value.gaps.length > 128
      || value.gaps.some((item) => typeof item !== "string"))) {
    throw outcomeContractError(code, status, payload);
  }
  if (value.capability !== undefined && typeof value.capability !== "string") {
    throw outcomeContractError(code, status, payload);
  }
  return value;
}

/**
 * Read a JSON response without allowing a hostile/misconfigured server to
 * make Electron materialize an unbounded body.  The fake Responses used by
 * the contract tests only expose `.json()`, while undici exposes a reader;
 * support both without weakening the size ceiling.
 */
async function readJsonBounded(response, maxBytes = MAX_BODY_BYTES) {
  const declared = Number(response?.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) {
    throw new KnowledgeRemoteError(
      "knowledge_response_too_large",
      "知识服务响应超过本机上限",
      Number(response?.status || 0),
    );
  }
  let text;
  if (response?.body?.getReader) {
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    const chunks = [];
    let total = 0;
    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = value instanceof Uint8Array ? value : new Uint8Array(value || []);
        total += chunk.byteLength;
        if (total > maxBytes) {
          await reader.cancel().catch(() => {});
          throw new KnowledgeRemoteError(
            "knowledge_response_too_large",
            "知识服务响应超过本机上限",
            Number(response?.status || 0),
          );
        }
        chunks.push(decoder.decode(chunk, { stream: true }));
      }
      chunks.push(decoder.decode());
      text = chunks.join("");
    } finally {
      reader.releaseLock?.();
    }
  } else if (typeof response?.text === "function") {
    text = await response.text();
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new KnowledgeRemoteError(
        "knowledge_response_too_large",
        "知识服务响应超过本机上限",
        Number(response?.status || 0),
      );
    }
  } else if (typeof response?.json === "function") {
    // Compatibility fallback for tiny test doubles.  A real Fetch Response
    // takes one of the bounded branches above.
    const value = await response.json();
    text = JSON.stringify(value);
    if (Buffer.byteLength(text, "utf8") > maxBytes) {
      throw new KnowledgeRemoteError(
        "knowledge_response_too_large",
        "知识服务响应超过本机上限",
        Number(response?.status || 0),
      );
    }
  } else {
    throw new KnowledgeRemoteError(
      "knowledge_response_invalid",
      "知识服务返回了无效 JSON",
      Number(response?.status || 0),
    );
  }
  try {
    return JSON.parse(text);
  } catch {
    throw new KnowledgeRemoteError(
      "knowledge_response_invalid",
      "知识服务返回了无效 JSON",
      Number(response?.status || 0),
    );
  }
}

function id(value, name, { optional = false } = {}) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error(`vibe_agent_knowledge_${name}_invalid`);
  }
  const text = String(value ?? "").trim();
  if (!text && optional) return "";
  if (!ID_PATTERN.test(text)) throw new Error(`vibe_agent_knowledge_${name}_invalid`);
  return text;
}

function rejectCredentials(value, path = "payload") {
  if (Array.isArray(value)) {
    for (let i = 0; i < value.length; i += 1) rejectCredentials(value[i], `${path}[${i}]`);
    return;
  }
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    const normalized = String(key).trim().replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase().replaceAll("-", "_");
    if (CREDENTIAL_KEYS.has(normalized)) {
      throw new Error(`vibe_agent_knowledge_credential_field:${path}.${key}`);
    }
    rejectCredentials(child, `${path}.${key}`);
  }
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalJson).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}

function traceparent(traceId) {
  const raw = String(traceId || "").replace(/[^0-9a-f]/gi, "").toLowerCase();
  const id32 = (raw + createHash("sha256").update(String(traceId || "")).digest("hex")).slice(0, 32);
  const span = createHash("sha256").update(`${traceId}:${randomUUID()}`).digest("hex").slice(0, 16);
  return `00-${id32}-${span}-01`;
}

function knowledgeRequestBody({
  operation,
  projectId,
  sessionId,
  turnId = "",
  goalId = "",
  requestId = randomUUID().replaceAll("-", ""),
  toolCallId = "",
  payload = {},
  idempotencyKey = "",
  traceId = "",
} = {}) {
  const op = String(operation ?? "").trim().toLowerCase();
  if (!new Set(["search", "overview", "structure", "read_source", "prepare_change", "resolve_confirmation", "get_receipt"]).has(op)) {
    throw new Error("vibe_agent_knowledge_operation_invalid");
  }
  const bodyPayload = payload === undefined || payload === null
    ? {}
    : payload && typeof payload === "object" && !Array.isArray(payload)
      ? payload
      : (() => { throw new Error("vibe_agent_knowledge_payload_invalid"); })();
  rejectCredentials(bodyPayload);
  if (op === "prepare_change") {
    const attachmentKeys = ["attachments", "attachment_resources", "attachment_selection", "replacement"];
    if (attachmentKeys.some((key) => {
      const value = bodyPayload[key];
      return value !== undefined && value !== null && value !== "" && !(Array.isArray(value) && value.length === 0)
        && !(value && typeof value === "object" && !Array.isArray(value) && Object.keys(value).length === 0);
    })) {
      throw new KnowledgeRemoteError(
        "attachment_not_supported",
        "原始附件只能在本机读取；Knowledge Tool 只接收确认前的 model_authored 正文",
      );
    }
    if (Array.isArray(bodyPayload.documents)) {
      for (const document of bodyPayload.documents) {
        if (!document || typeof document !== "object" || String(document.origin_kind || "model_authored") !== "model_authored") {
          throw new KnowledgeRemoteError(
            "attachment_not_supported",
            "Knowledge Tool 只接收本机整理后的 model_authored 正文",
          );
        }
      }
    }
  }
  return {
    schema: REQUEST_SCHEMA,
    operation: op,
    request_id: id(requestId, "request_id"),
    project_id: id(projectId, "project_id"),
    session_id: id(sessionId, "session_id"),
    ...(turnId ? { turn_id: id(turnId, "turn_id") } : {}),
    ...(goalId ? { goal_id: id(goalId, "goal_id") } : {}),
    ...(toolCallId ? { tool_call_id: id(toolCallId, "tool_call_id") } : {}),
    ...(traceId ? { trace_id: id(traceId, "trace_id") } : {}),
    ...(idempotencyKey ? { idempotency_key: id(idempotencyKey, "idempotency_key") } : {}),
    ...(traceId ? { traceparent: traceparent(traceId) } : {}),
    payload: bodyPayload,
  };
}

export class KnowledgeRemoteError extends Error {
  constructor(code, message, status = 0, payload = undefined) {
    super(message || code);
    this.name = "KnowledgeRemoteError";
    this.code = String(code || "vibe_agent_knowledge_failed");
    this.status = Number(status || 0);
    this.payload = payload;
  }
}

const PUBLIC_ERROR_CODE = /^(?:knowledge|invalid|missing|payload|project|cross|resource|receipt|attachment|candidate|unsupported|unauthenticated|mixed|document|source|confirmation|provider|interaction|request|upload|chunk|bundle|trace|system|operation|permission|account|vibe_agent)(?:[A-Za-z0-9_.:-]*)$/u;

function publicRemoteErrorCode(value, status = 0) {
  const candidate = String(value || "").trim();
  return PUBLIC_ERROR_CODE.test(candidate)
    ? candidate.slice(0, 160)
    : `knowledge_http_${Number(status) || 0}`;
}

function publicRemoteErrorMessage(value, fallback = "知识服务请求失败") {
  if (value !== undefined && value !== null && typeof value !== "string") return fallback;
  const message = String(value || "").trim();
  if (!message || message.length > 240
    || /[\u0000-\u001f\u007f]/u.test(message)
    || message.includes("/") || message.includes("\\")
    || /(?:api[_-]?key|authorization|password|secret|token)/iu.test(message)) {
    return fallback;
  }
  return message;
}

export class KnowledgeRemoteClient {
  constructor({ baseUrl, authToken, agentBinding = "", bindingToken = "", fetchImpl = globalThis.fetch, isDevelopment = false } = {}) {
    if (baseUrl !== undefined && baseUrl !== null && typeof baseUrl !== "string") {
      throw new Error("vibe_agent_knowledge_base_url_invalid");
    }
    const raw = String(baseUrl ?? "");
    if (raw !== raw.trim() || raw.includes("\\") || /[\u0000-\u001f\u007f]/u.test(raw)) {
      throw new Error("vibe_agent_knowledge_base_url_invalid");
    }
    let parsed;
    try { parsed = new URL(raw); } catch { throw new Error("vibe_agent_knowledge_base_url_invalid"); }
    const loopback = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]).has(parsed.hostname);
    if (!new Set(["http:", "https:"]).has(parsed.protocol)
      || (!TRUSTED_ORIGINS.has(parsed.origin) && !(isDevelopment && parsed.protocol === "http:" && loopback))
      || parsed.username || parsed.password || parsed.hash || parsed.search) {
      throw new Error("vibe_agent_knowledge_base_url_invalid");
    }
    if (authToken !== undefined && authToken !== null && typeof authToken !== "string") {
      throw new Error("vibe_agent_knowledge_auth_missing");
    }
    const token = String(authToken ?? "").trim();
    if (!token || token.length > 32_768 || /[\u0000-\u001f\u007f]/u.test(token)) {
      throw new Error("vibe_agent_knowledge_auth_missing");
    }
    if (typeof fetchImpl !== "function") throw new Error("vibe_agent_knowledge_fetch_unavailable");
    this.baseUrl = parsed;
    this.authToken = token;
    this.agentBinding = normalizeAgentBinding(
      agentBinding || bindingToken,
    );
    this.fetch = fetchImpl;
  }

  endpoint(suffix) {
    const base = new URL(this.baseUrl.toString());
    const pathName = base.pathname.replace(/\/+$/, "");
    const routeRoot = pathName.endsWith("/vibe/foundation")
      ? ""
      : pathName.endsWith("/vibe") ? "/foundation" : "/vibe/foundation";
    return `${base.toString().replace(/\/$/, "")}${routeRoot}${suffix}`;
  }

  sessionEndpoint(sessionId, resourceId) {
    const base = new URL(this.baseUrl.toString());
    const pathName = base.pathname.replace(/\/+$/, "");
    const routeRoot = pathName.endsWith("/vibe/foundation")
      ? pathName.slice(0, -"/foundation".length)
      : pathName.endsWith("/vibe") ? pathName : `${pathName}/vibe`;
    base.pathname = `${routeRoot}/sessions/${encodeURIComponent(sessionId)}/sources/${encodeURIComponent(resourceId)}/download`;
    base.search = "";
    base.hash = "";
    return base.toString();
  }

  async call({
    operation,
    projectId,
    sessionId,
    turnId = "",
    goalId = "",
    requestId = randomUUID().replaceAll("-", ""),
    toolCallId = "",
    payload = {},
    idempotencyKey = "",
    traceId = "",
    signal,
  } = {}) {
    if (turnId && !this.agentBinding) {
      throw new KnowledgeRemoteError(
        "agent_binding_required",
        "本机 Agent 请求缺少身份绑定",
      );
    }
    const body = knowledgeRequestBody({
      operation, projectId, sessionId, turnId, goalId, requestId, toolCallId,
      payload, idempotencyKey, traceId,
    });
    const op = body.operation;
    const serialized = JSON.stringify(body);
    if (Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES) throw new Error("vibe_agent_knowledge_payload_too_large");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    timer.unref?.();
    const abort = () => controller.abort();
    signal?.addEventListener?.("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const response = await this.fetch(this.endpoint("/knowledge/tool"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `token=${this.authToken}`,
          ...(this.agentBinding ? { [AGENT_BINDING_HEADER]: this.agentBinding } : {}),
        },
        body: serialized,
        signal: controller.signal,
      });
      const parsed = await readJsonBounded(response);
      if (!response.ok) {
      // retryable/non-retryable capability outcomes are business results, not
      // transport failures. Preserve them for the local tool loop so the
      // pending card can resolve and the model can continue from the exact
      // authoritative outcome. Only an error envelope is thrown.
        if (parsed?.schema === RESPONSE_SCHEMA
          && parsed?.operation === op
          && parsed?.request_id === body.request_id
          && parsed?.outcome && typeof parsed.outcome === "object") {
          return validateOutcome(
            parsed.outcome,
            "knowledge_response_contract_invalid",
            response.status,
            parsed,
          );
        }
        const nested = parsed?.outcome?.error;
        const code = publicRemoteErrorCode(
          nested?.code || parsed?.code || parsed?.detail,
          response.status,
        );
        throw new KnowledgeRemoteError(
          code,
          publicRemoteErrorMessage(nested?.message || parsed?.detail, "知识服务请求失败"),
          response.status,
          parsed,
        );
      }
      if (!parsed || parsed.schema !== RESPONSE_SCHEMA || parsed.operation !== op || parsed.request_id !== body.request_id) {
        throw new KnowledgeRemoteError("knowledge_response_contract_invalid", "知识服务响应合同无效", response.status, parsed);
      }
      return validateOutcome(
        parsed.outcome,
        "knowledge_response_contract_invalid",
        response.status,
        parsed,
      );
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", abort);
    }
  }

  async callWave({ calls = [], signal } = {}) {
    if (!Array.isArray(calls) || !calls.length || calls.length > 20) {
      throw new Error("vibe_agent_knowledge_wave_calls_invalid");
    }
    const requestCalls = calls.map((call) => knowledgeRequestBody(call));
    if (requestCalls.some((call) => call.turn_id) && !this.agentBinding) {
      throw new KnowledgeRemoteError(
        "agent_binding_required",
        "本机 Agent 请求缺少身份绑定",
      );
    }
    if (requestCalls.some((call) => !new Set(["search", "overview", "read_source"]).has(call.operation))) {
      throw new Error("vibe_agent_knowledge_wave_read_only_required");
    }
    const callIds = requestCalls.map((call) => call.tool_call_id);
    const requestIds = requestCalls.map((call) => call.request_id);
    if (callIds.some((value) => !value)
      || new Set(callIds).size !== callIds.length
      || new Set(requestIds).size !== requestIds.length) {
      throw new Error("vibe_agent_knowledge_wave_identity_invalid");
    }
    const ownerIdentity = requestCalls[0];
    if (requestCalls.some((call) => ["project_id", "session_id", "turn_id", "goal_id", "trace_id"]
      .some((key) => call[key] !== ownerIdentity[key]))) {
      throw new Error("vibe_agent_knowledge_wave_identity_invalid");
    }
    const serialized = JSON.stringify({ schema: WAVE_REQUEST_SCHEMA, calls: requestCalls });
    if (Buffer.byteLength(serialized, "utf8") > MAX_BODY_BYTES) throw new Error("vibe_agent_knowledge_payload_too_large");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    timer.unref?.();
    const abort = () => controller.abort();
    signal?.addEventListener?.("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    try {
      const response = await this.fetch(this.endpoint("/knowledge/tool-wave"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json",
          Authorization: `token=${this.authToken}`,
          ...(this.agentBinding ? { [AGENT_BINDING_HEADER]: this.agentBinding } : {}),
        },
        body: serialized,
        signal: controller.signal,
      });
      const parsed = await readJsonBounded(response);
      if (!response.ok) {
        const code = publicRemoteErrorCode(parsed?.code || parsed?.detail, response.status);
        throw new KnowledgeRemoteError(
          code,
          publicRemoteErrorMessage(parsed?.detail, "知识服务批处理失败"),
          response.status,
          parsed,
        );
      }
      if (!parsed || parsed.schema !== WAVE_RESPONSE_SCHEMA || !Array.isArray(parsed.results)
        || parsed.results.length !== requestCalls.length) {
        throw new KnowledgeRemoteError("knowledge_wave_response_contract_invalid", "知识服务批响应合同无效", response.status, parsed);
      }
      for (let index = 0; index < requestCalls.length; index += 1) {
        const expected = requestCalls[index];
        const actual = parsed.results[index];
        if (!actual || actual.tool_call_id !== expected.tool_call_id
          || actual.request_id !== expected.request_id || actual.operation !== expected.operation
          || Boolean(actual.outcome) === Boolean(actual.error)) {
          throw new KnowledgeRemoteError("knowledge_wave_response_identity_invalid", "知识服务批响应身份无效", response.status, parsed);
        }
        if (actual.outcome !== undefined) {
          validateOutcome(
            actual.outcome,
            "knowledge_wave_response_contract_invalid",
            response.status,
            parsed,
          );
        } else {
          validateRemoteError(
            actual.error,
            "knowledge_wave_response_contract_invalid",
            response.status,
            parsed,
          );
        }
      }
      return parsed.results;
    } finally {
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", abort);
    }
  }

  async downloadResource({ handle, signal } = {}) {
    const sessionId = id(handle?.session_id, "resource_session_id");
    const resourceId = id(handle?.resource_id, "resource_id");
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 180_000);
    timer.unref?.();
    const abort = () => controller.abort();
    signal?.addEventListener?.("abort", abort, { once: true });
    if (signal?.aborted) controller.abort();
    let response;
    let cleaned = false;
    const cleanup = () => {
      if (cleaned) return;
      cleaned = true;
      clearTimeout(timer);
      signal?.removeEventListener?.("abort", abort);
    };
    try {
      response = await this.fetch(
        this.sessionEndpoint(sessionId, resourceId),
        {
          method: "GET",
          headers: {
            Accept: "text/markdown, text/plain",
            Authorization: `token=${this.authToken}`,
            ...(this.agentBinding ? { [AGENT_BINDING_HEADER]: this.agentBinding } : {}),
          },
          signal: controller.signal,
        },
      );
      if (!response.ok) {
        throw new KnowledgeRemoteError(
          publicRemoteErrorCode(`knowledge_download_http_${response.status}`, response.status),
          "知识来源下载失败",
          response.status,
        );
      }
      // The caller owns the response body. Keep the deadline alive until it
      // finishes (or the caller explicitly releases it), preventing a stalled
      // stream from surviving after fetch resolves its headers.
      try {
        Object.defineProperty(response, "vibeAgentCleanup", {
          value: cleanup,
          configurable: true,
        });
      } catch {
        // If a test double is non-extensible, the deadline still aborts it;
        // callers can finish normally and the short-lived timer is unref'd.
      }
      return response;
    } catch (error) {
      cleanup();
      throw error;
    }
  }
}

export const knowledgeRemoteConstants = {
  REQUEST_SCHEMA, RESPONSE_SCHEMA, ERROR_SCHEMA,
  WAVE_REQUEST_SCHEMA, WAVE_RESPONSE_SCHEMA, MAX_BODY_BYTES,
  AGENT_BINDING_HEADER, MAX_AGENT_BINDING_LENGTH,
};
