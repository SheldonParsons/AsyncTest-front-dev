import { createHash } from "node:crypto";
import { validatedBackendUrl } from "./backendUrl.node.js";

const REQUEST_SCHEMA = "electron_pi_runtime_snapshot_request.v1";
const RESPONSE_SCHEMA = "electron_pi_runtime_snapshot.v1";
const MAX_RESPONSE_BYTES = 16 * 1024 * 1024;
const EXPECTED_TOOL_MANIFEST_SCHEMA = "knowledge_tool_manifest.v2";
const EXPECTED_TOOL_MANIFEST_VERSION = 2;
const EXPECTED_PUBLIC_TOOLS = [
  "get_knowledge_overview", "search_knowledge", "read_knowledge",
  "add_knowledge", "edit_knowledge", "delete_knowledge",
  "move_knowledge_section", "search_vibe_platform_docs", "ask_clarification",
];
const EXPECTED_TOOL_MODES = [
  "parallel", "parallel", "parallel",
  "sequential", "sequential", "sequential", "sequential",
  "parallel", "sequential",
];

function toolManifestMatches(tools) {
  if (!Array.isArray(tools) || tools.length !== EXPECTED_PUBLIC_TOOLS.length) return false;
  return tools.every((item, index) => {
    if (!item || typeof item !== "object" || Array.isArray(item)
      || String(item.name || "") !== EXPECTED_PUBLIC_TOOLS[index]
      || String(item.execution_mode || "") !== EXPECTED_TOOL_MODES[index]
      || typeof item.description !== "string"
      || !item.parameters || typeof item.parameters !== "object"
      || Array.isArray(item.parameters)
      || item.parameters.type !== "object"
      || item.parameters.additionalProperties !== false) return false;
    return true;
  });
}

function validateSkillDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.schema !== "vibe_agent_skill.v1"
    || value.name !== "vibe-knowledge"
    || typeof value.description !== "string" || !value.description.trim()
    || typeof value.version !== "string" || !value.version.trim()
    || typeof value.content !== "string" || !value.content
    || value.content.length > 200_000
    || !/^[0-9a-f]{64}$/u.test(String(value.sha256 || ""))) {
    throw new Error("vibe_agent_runtime_snapshot_skill_invalid");
  }
  const digest = createHash("sha256").update(value.content, "utf8").digest("hex");
  if (digest !== String(value.sha256).toLowerCase()) throw new Error("vibe_agent_runtime_snapshot_skill_hash_invalid");
  return value;
}

function endpoint(base) {
  const root = base.toString().replace(/\/$/, "");
  const path = base.pathname.replace(/\/+$/, "");
  const suffix = path.endsWith("/vibe/foundation")
    ? "/agent-bootstrap"
    : path.endsWith("/vibe") ? "/foundation/agent-bootstrap" : "/vibe/foundation/agent-bootstrap";
  return `${root}${suffix}`;
}

function required(value, code, max = 4096) {
  if (value !== undefined && value !== null && typeof value !== "string") throw new Error(code);
  const result = String(value ?? "").trim();
  if (!result || result.length > max) throw new Error(code);
  return result;
}

// The backend historically serialized account ids as JSON numbers while the
// local runtime contract stores them as opaque string identities.  Accept only
// non-negative safe integers for this one field and normalize them once at the
// boundary; arbitrary objects/booleans must still fail closed.
function requiredAccountId(value, code, max = 160) {
  if (typeof value !== "string"
    && !(Number.isSafeInteger(value) && value >= 0)) throw new Error(code);
  const result = String(value ?? "").trim();
  if (!result || result.length > max || !/^[A-Za-z0-9._:-]+$/u.test(result)) throw new Error(code);
  return result;
}

function safeHeaderValue(value, code) {
  if (value !== undefined && value !== null && typeof value !== "string") throw new Error(code);
  const result = String(value ?? "");
  if (/[\u0000-\u001f\u007f]/u.test(result)) throw new Error(code);
  return result;
}

async function responseTextBounded(response, maxBytes) {
  const declared = Number(response?.headers?.get?.("content-length") || 0);
  if (Number.isFinite(declared) && declared > maxBytes) throw new Error("vibe_agent_runtime_snapshot_too_large");
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
          try { await reader.cancel(); } catch {}
          throw new Error("vibe_agent_runtime_snapshot_too_large");
        }
        chunks.push(decoder.decode(chunk, { stream: true }));
      }
      chunks.push(decoder.decode());
      return chunks.join("");
    } finally {
      reader.releaseLock?.();
    }
  }
  const raw = typeof response?.text === "function"
    ? await response.text()
    : typeof response?.json === "function" ? JSON.stringify(await response.json()) : "";
  if (Buffer.byteLength(raw, "utf8") > maxBytes) throw new Error("vibe_agent_runtime_snapshot_too_large");
  return raw;
}

function providerDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("vibe_agent_runtime_snapshot_provider_invalid");
  if (value.mode !== "direct" || value.reasoning !== false) throw new Error("vibe_agent_runtime_snapshot_provider_policy_invalid");
  const baseUrl = required(value.base_url, "vibe_agent_runtime_snapshot_provider_url_missing");
  if (/[\u0000-\u001f\u007f]/u.test(baseUrl) || baseUrl.includes("\\")) throw new Error("vibe_agent_runtime_snapshot_provider_url_invalid");
  try {
    const parsed = new URL(baseUrl);
    if (!new Set(["https:", "http:"]).has(parsed.protocol) || !parsed.hostname
      || parsed.username || parsed.password || parsed.hash || parsed.search) throw new Error();
  } catch { throw new Error("vibe_agent_runtime_snapshot_provider_url_invalid"); }
  const apiKey = safeHeaderValue(required(value.api_key, "vibe_agent_runtime_snapshot_provider_key_missing", 32_768), "vibe_agent_runtime_snapshot_provider_key_invalid");
  const model = required(value.model ?? value.model_name, "vibe_agent_runtime_snapshot_model_missing", 512);
  const result = {
    id: required(value.id, "vibe_agent_runtime_snapshot_provider_id_missing", 256),
    name: String(value.name || value.id),
    api: String(value.api || "openai-completions"),
    mode: "direct",
    base_url: baseUrl,
    api_key: apiKey,
    model,
    model_name: model,
    reasoning: false,
    context_window: Number(value.context_window || 275_000),
    max_tokens: Number(value.max_tokens || 8_192),
  };
  if (!Number.isSafeInteger(result.context_window) || result.context_window < 1
    || result.context_window > 2_000_000
    || !Number.isSafeInteger(result.max_tokens) || result.max_tokens < 1
    || result.max_tokens > 1_000_000) {
    throw new Error("vibe_agent_runtime_snapshot_provider_limits_invalid");
  }
  if (value.proxy_url) {
    const proxy = required(value.proxy_url, "vibe_agent_runtime_snapshot_proxy_url_invalid");
    if (/[\u0000-\u001f\u007f]/u.test(proxy) || proxy.includes("\\")) throw new Error("vibe_agent_runtime_snapshot_proxy_url_invalid");
    try {
      const parsed = new URL(proxy);
      if (!new Set(["https:", "http:"]).has(parsed.protocol) || !parsed.hostname
        || parsed.username || parsed.password || parsed.hash || parsed.search) throw new Error();
    } catch { throw new Error("vibe_agent_runtime_snapshot_proxy_url_invalid"); }
    result.proxy_url = proxy;
  }
  if (value.headers !== undefined) {
    if (!value.headers || typeof value.headers !== "object" || Array.isArray(value.headers)) {
      throw new Error("vibe_agent_runtime_snapshot_provider_headers_invalid");
    }
    const entries = Object.entries(value.headers);
    if (entries.length > 32) throw new Error("vibe_agent_runtime_snapshot_provider_headers_invalid");
    const seenHeaderNames = new Set();
    result.headers = Object.fromEntries(entries.map(([name, header]) => {
      if (!/^[A-Za-z0-9!#$%&'*+.^_`|~-]{1,128}$/u.test(String(name))) {
        throw new Error("vibe_agent_runtime_snapshot_provider_headers_invalid");
      }
      const normalizedName = String(name).toLowerCase();
      if (seenHeaderNames.has(normalizedName)) {
        throw new Error("vibe_agent_runtime_snapshot_provider_headers_invalid");
      }
      seenHeaderNames.add(normalizedName);
      const safe = safeHeaderValue(header, "vibe_agent_runtime_snapshot_provider_headers_invalid");
      if (safe.length > 32_768) throw new Error("vibe_agent_runtime_snapshot_provider_headers_invalid");
      return [String(name), safe];
    }));
  }
  for (const key of ["cost", "compat", "model_config"]) {
    if (value[key] !== undefined) result[key] = structuredClone(value[key]);
  }
  return result;
}

function agentBinding(value, run) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.schema !== "electron_agent_binding.v1"
    || typeof value.token !== "string" || !value.token.trim()
    || value.token.length > 4096
    || !/^[A-Za-z0-9._:-]+$/u.test(value.token)
    || typeof value.binding_id !== "string"
    || !/^[0-9a-f]{32}$/iu.test(value.binding_id)) {
    throw new Error("vibe_agent_runtime_snapshot_binding_invalid");
  }
  const expected = {
    account_id: String(run?.account_id || ""),
    project_id: String(run?.project_id || ""),
    session_id: String(run?.session_id || ""),
    run_id: String(run?.run_id || ""),
    turn_id: String(run?.turn_id || ""),
  };
  for (const [key, wanted] of Object.entries(expected)) {
    if (String(value[key] || "") !== wanted) {
      throw new Error("vibe_agent_runtime_snapshot_binding_identity_drift");
    }
  }
  if (typeof value.client_instance_id !== "string"
    || !value.client_instance_id.trim()
    || Number(value.protocol_version) !== 2) {
    throw new Error("vibe_agent_runtime_snapshot_binding_invalid");
  }
  return structuredClone(value);
}

function runtimeSnapshot(payload, run, { allowManifestDrift = false } = {}) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload) || payload.schema !== RESPONSE_SCHEMA) {
    throw new Error("vibe_agent_runtime_snapshot_invalid");
  }
  if (String(payload.account_id || "") !== String(run.account_id || "")
    || String(payload.project_id || "") !== String(run.project_id || "")
    || String(payload.session_id || "") !== String(run.session_id || "")) {
    throw new Error("vibe_agent_runtime_snapshot_identity_drift");
  }
  if (typeof payload.system_prompt !== "string" || !Array.isArray(payload.tools)
    || !payload.options || typeof payload.options !== "object" || Array.isArray(payload.options)
    || (!allowManifestDrift
      && (!payload.skill || typeof payload.skill !== "object" || Array.isArray(payload.skill)))) {
    throw new Error("vibe_agent_runtime_snapshot_contract_invalid");
  }
  const manifestMatches = payload.tool_manifest
    && payload.tool_manifest.schema === EXPECTED_TOOL_MANIFEST_SCHEMA
    && Number(payload.tool_manifest.version) === EXPECTED_TOOL_MANIFEST_VERSION
    && toolManifestMatches(payload.tools)
    && !payload.tools.some((item) => ["read", "write", "edit", "bash", "list_knowledge_structure"].includes(String(item?.name || "")));
  if (!allowManifestDrift && !manifestMatches) {
    throw new Error("vibe_agent_runtime_snapshot_manifest_invalid");
  }
  if (payload.skill !== undefined) validateSkillDescriptor(payload.skill);
  const binding = agentBinding(payload.agent_binding, run);
  return {
    schema: RESPONSE_SCHEMA,
    account_id: requiredAccountId(payload.account_id, "vibe_agent_runtime_snapshot_account_missing"),
    project_id: String(payload.project_id),
    session_id: String(payload.session_id),
    provider: providerDescriptor(payload.provider),
    system_prompt: payload.system_prompt,
    tools: structuredClone(payload.tools),
    hidden_tools: Array.isArray(payload.hidden_tools) ? payload.hidden_tools.map(String) : [],
    tool_manifest: structuredClone(payload.tool_manifest),
    agent_binding: binding,
    ...(payload.skill && typeof payload.skill === "object" && !Array.isArray(payload.skill)
      ? { skill: structuredClone(payload.skill) } : {}),
    options: structuredClone(payload.options),
  };
}

/** Main-only, one-shot exchange. The returned secret is never cached here. */
export async function fetchRuntimeSnapshot({
  baseUrl, authToken, isDevelopment = false, run, providerId = "", identity = {},
  allowManifestDrift = false, fetchImpl = globalThis.fetch,
} = {}) {
  if (typeof fetchImpl !== "function") throw new Error("vibe_agent_runtime_snapshot_fetch_unavailable");
  const base = validatedBackendUrl(baseUrl, { isDevelopment });
  const token = required(authToken, "vibe_agent_runtime_snapshot_auth_missing", 32_768);
  if ([...token].some((character) => {
    const code = character.codePointAt(0) || 0;
    return code < 0x20 || code === 0x7f;
  })) throw new Error("vibe_agent_runtime_snapshot_auth_invalid");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 20_000);
  timer.unref?.();
  try {
    const response = await fetchImpl(endpoint(base), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
        Authorization: `token=${token}`,
      },
      body: JSON.stringify({
        schema: REQUEST_SCHEMA,
        run_id: required(run?.run_id, "vibe_agent_runtime_snapshot_run_missing", 256),
        turn_id: required(run?.turn_id, "vibe_agent_runtime_snapshot_turn_missing", 256),
        project_id: required(run?.project_id, "vibe_agent_runtime_snapshot_project_missing", 256),
        session_id: required(run?.session_id, "vibe_agent_runtime_snapshot_session_missing", 256),
        ...(providerId ? { llm_provider_id: String(providerId) } : {}),
        client: {
          app_version: String(identity.appVersion || ""),
          protocol_version: Number(identity.protocolVersion || 0),
          pi_agent_core_version: String(identity.piAgentCoreVersion || ""),
          pi_ai_version: String(identity.piAiVersion || ""),
          client_instance_id: String(identity.clientInstanceId || ""),
        },
      }),
      signal: controller.signal,
    });
    const raw = await responseTextBounded(response, MAX_RESPONSE_BYTES);
    let payload;
    try { payload = raw ? JSON.parse(raw) : {}; } catch { throw new Error("vibe_agent_runtime_snapshot_json_invalid"); }
    if (!response.ok) {
      const error = new Error(String(payload?.code || `vibe_agent_runtime_snapshot_http_${response.status}`));
      error.status = response.status;
      throw error;
    }
    return runtimeSnapshot(payload, run, { allowManifestDrift });
  } finally {
    clearTimeout(timer);
  }
}

export const runtimeSnapshotConstants = { REQUEST_SCHEMA, RESPONSE_SCHEMA, MAX_RESPONSE_BYTES };
