/**
 * Durable descriptors for Electron-owned Pi runs.
 *
 * The descriptor is deliberately not a transcript or a credential store. It
 * only keeps enough immutable run metadata to identify a waiting interaction
 * after Main/child restart. Provider keys, auth tokens, cookies and host/run
 * tickets are removed before anything reaches disk. The session journal remains
 * the source used to rebuild Pi's message history.
 */
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const SCHEMA = "vibe.agent.run_descriptor.v1";
const MAX_DESCRIPTOR_BYTES = 32 * 1024 * 1024;
const MAX_LIST = 500;
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,256}$/;
const CREDENTIAL_KEYS = new Set([
  "api_key", "apiKey", "apikey", "auth_token", "authToken", "access_token", "accessToken", "refresh_token", "refreshToken",
  "run_token", "runToken",
  "proxy_token", "proxyToken", "session_token", "sessionToken", "provider_token", "providerToken",
  "provider_session_token", "providerSessionToken",
  "host_ticket", "hostTicket", "authorization", "cookie", "set-cookie",
  "proxy_authorization", "proxy-authorization", "password", "passwd", "secret",
  "private_key", "client_secret", "headers",
]);

function isCredentialKey(key) {
  const raw = String(key || "").trim();
  const normalized = raw
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .toLowerCase().replaceAll("-", "_");
  return CREDENTIAL_KEYS.has(raw)
    || CREDENTIAL_KEYS.has(normalized)
    || normalized === "x_api_key"
    || normalized === "access_key"
    || normalized === "auth_token"
    || normalized === "id_token"
    || normalized === "secret"
    || normalized === "secret_key"
    || normalized === "signing_key"
    || normalized === "credentials"
    || normalized === "bearer"
    || normalized.endsWith("_api_key")
    || normalized.endsWith("_auth_token")
    || normalized.endsWith("_access_token")
    || normalized.endsWith("_authorization")
    || normalized.endsWith("_cookie");
}

const ACTIVE_PHASES = new Set([
  "starting", "running", "provider_in_flight", "tool_in_flight", "candidate_in_flight",
  "response_in_flight",
]);
const RECOVERABLE_PHASES = new Set(["waiting_user", "resume_ready"]);
const TERMINAL_STATES = new Set(["completed", "failed", "aborted", "cancelled", "closed"]);
const DEFAULT_PROVIDER_BUDGET = Object.freeze({
  model_calls: 0,
  input_tokens: 0,
  output_tokens: 0,
  reserved_output_tokens: 0,
  max_model_calls: 12,
  max_context_tokens: 275_000,
  max_total_tokens: 300_000,
  output_reserve_tokens: 8_192,
  max_wall_clock_s: 360,
  step_timeout_s: 180,
  compute_elapsed_s: 0,
});

function runId(value) {
  const id = String(value ?? "").trim();
  if (!ID_PATTERN.test(id)) throw new Error("vibe_agent_run_descriptor_id_invalid");
  return id;
}

function accountId(value) {
  const result = String(value ?? "").trim();
  if (!ID_PATTERN.test(result)) throw new Error("vibe_agent_run_descriptor_account_invalid");
  return result;
}

function cloneWithoutCredentials(value, depth = 0) {
  if (depth > 64) throw new Error("vibe_agent_run_descriptor_depth_invalid");
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map((item) => cloneWithoutCredentials(item, depth + 1));
  const output = {};
  for (const [key, item] of Object.entries(value)) {
    if (isCredentialKey(key)) continue;
    output[key] = cloneWithoutCredentials(item, depth + 1);
  }
  return output;
}

function safeChild(root, child) {
  const base = path.resolve(root);
  const target = path.resolve(base, child);
  const relative = path.relative(base, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("vibe_agent_run_descriptor_path_invalid");
  }
  return target;
}

function descriptorDir(root, id) {
  return safeChild(root, encodeURIComponent(runId(id)));
}

function descriptorPath(root, id) {
  return path.join(descriptorDir(root, id), "descriptor.json");
}

async function atomicWrite(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temporary, content, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temporary, filePath);
  } catch (error) {
    await fs.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function readJson(filePath) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch (error) {
    if (error?.code === "ENOENT") return null;
    throw new Error("vibe_agent_run_descriptor_unreadable");
  }
}

function normalize(raw, expectedId = "") {
  if (!raw || raw.schema !== SCHEMA) throw new Error("vibe_agent_run_descriptor_invalid");
  const cleanRaw = cloneWithoutCredentials(raw);
  const id = runId(cleanRaw.run_id);
  if (expectedId && id !== expectedId) throw new Error("vibe_agent_run_descriptor_identity_invalid");
  if (!cleanRaw.run || typeof cleanRaw.run !== "object" || Array.isArray(cleanRaw.run)) {
    throw new Error("vibe_agent_run_descriptor_run_missing");
  }
  if (cleanRaw.run.schema !== "electron_agent_run.v1"
    || cleanRaw.run.execution_host !== "electron"
    || cleanRaw.run.execution_mode !== "local") {
    throw new Error("vibe_agent_run_descriptor_run_invalid");
  }
  if (String(cleanRaw.run.run_id || "") !== id) throw new Error("vibe_agent_run_descriptor_identity_invalid");
  const owner = accountId(cleanRaw.run.account_id);
  if (String(cleanRaw.local_context?.account_id || "") !== owner) {
    throw new Error("vibe_agent_run_descriptor_account_drift");
  }
  if (!cleanRaw.start_payload || typeof cleanRaw.start_payload !== "object" || Array.isArray(cleanRaw.start_payload)) {
    throw new Error("vibe_agent_run_descriptor_payload_missing");
  }
  const state = String(cleanRaw.state || "running");
  const phase = String(cleanRaw.phase || state || "running");
  if (phase === "resume_ready" && (!cleanRaw.response || !cleanRaw.resolved_result)) {
    throw new Error("vibe_agent_run_descriptor_resume_checkpoint_invalid");
  }
  const pending = cleanRaw.pending && typeof cleanRaw.pending === "object" && !Array.isArray(cleanRaw.pending)
    ? cleanRaw.pending : null;
  if (pending) {
    if (!String(pending.interaction_id || "").trim()
      || !String(pending.tool_call_id || "").trim()
      || !String(pending.tool_name || "").trim()
      || !Number.isSafeInteger(Number(pending.sequence))
      || Number(pending.sequence) < 1
      || !["clarification", "knowledge_confirmation"].includes(String(pending.kind || ""))
      || !/^[0-9a-f]{64}$/i.test(String(pending.spec_digest || ""))) {
      throw new Error("vibe_agent_run_descriptor_pending_invalid");
    }
  }
  // Descriptors created by the removed attachment workspace may still be on
  // disk after an upgrade.  Keep only the context needed to reattach a native
  // local-file run; silently dropping the obsolete workspace identity makes
  // old descriptors harmless instead of reviving the deleted API.
  const storedContext = cleanRaw.local_context && typeof cleanRaw.local_context === "object"
    && !Array.isArray(cleanRaw.local_context) ? cleanRaw.local_context : {};
  const localContext = {
    account_id: owner,
    ...(typeof storedContext.knowledge_base_url === "string"
      ? { knowledge_base_url: storedContext.knowledge_base_url } : {}),
    ...(typeof storedContext.trace_upload_base_url === "string"
      ? { trace_upload_base_url: storedContext.trace_upload_base_url } : {}),
    ...(typeof storedContext.request_text === "string"
      ? { request_text: storedContext.request_text } : {}),
  };
  return {
    ...cleanRaw,
    schema: SCHEMA,
    run_id: id,
    state,
    phase,
    provider_budget: normalizeProviderBudget(cleanRaw.provider_budget),
    pending,
    run: cleanRaw.run,
    start_payload: cleanRaw.start_payload,
    local_context: localContext,
  };
}

function phaseFailure(phase) {
  if (phase === "provider_in_flight" || phase === "response_in_flight") return "provider_outcome_unknown";
  if (phase === "tool_in_flight") return "tool_outcome_unknown";
  return "runner_interrupted";
}

function normalizeProviderBudget(value) {
  const source = value && typeof value === "object" && !Array.isArray(value) ? value : {};
  const nonNegative = (key, maximum) => {
    const parsed = Number(source[key]);
    return Number.isSafeInteger(parsed) && parsed >= 0 && parsed <= maximum ? parsed : 0;
  };
  const elapsed = Number(source.compute_elapsed_s);
  return {
    ...DEFAULT_PROVIDER_BUDGET,
    model_calls: nonNegative("model_calls", DEFAULT_PROVIDER_BUDGET.max_model_calls),
    input_tokens: nonNegative("input_tokens", DEFAULT_PROVIDER_BUDGET.max_total_tokens),
    output_tokens: nonNegative("output_tokens", DEFAULT_PROVIDER_BUDGET.max_total_tokens),
    reserved_output_tokens: nonNegative("reserved_output_tokens", DEFAULT_PROVIDER_BUDGET.max_total_tokens),
    compute_elapsed_s: Number.isFinite(elapsed) && elapsed >= 0 && elapsed <= DEFAULT_PROVIDER_BUDGET.max_wall_clock_s
      ? elapsed : 0,
  };
}

/**
 * Main-process only durable run state. This is intentionally a small JSON
 * journal rather than another server-side runtime owner: local session events
 * and Trace hold the detailed evidence; descriptors only enable cold attach.
 */
export class LocalRunStore {
  constructor({ rootPath } = {}) {
    if (!rootPath) throw new Error("vibe_agent_run_descriptor_root_required");
    this.rootPath = path.resolve(rootPath);
    this.chains = new Map();
    this.cache = new Map();
  }

  enqueue(id, task) {
    const key = runId(id);
    const previous = this.chains.get(key) || Promise.resolve();
    const next = previous.then(task);
    this.chains.set(key, next.catch(() => {}));
    return next;
  }

  async write(value) {
    const clean = normalize(cloneWithoutCredentials(value), String(value.run_id));
    const serialized = JSON.stringify(clean, null, 2);
    if (Buffer.byteLength(serialized, "utf8") > MAX_DESCRIPTOR_BYTES) {
      throw new Error("vibe_agent_run_descriptor_too_large");
    }
    await atomicWrite(descriptorPath(this.rootPath, clean.run_id), serialized);
    this.cache.set(clean.run_id, clean);
    return { ...clean };
  }

  async create({ run, startPayload, localContext = {}, replace = false } = {}) {
    if (!run || typeof run !== "object" || Array.isArray(run)) throw new Error("vibe_agent_run_descriptor_run_missing");
    const id = runId(run.run_id ?? run.runId);
    const owner = accountId(run.account_id ?? run.accountId);
    const contextOwner = accountId(localContext.account_id ?? localContext.accountId);
    if (owner !== contextOwner) throw new Error("vibe_agent_run_descriptor_account_drift");
    const payload = cloneWithoutCredentials(startPayload);
    // Cold recovery obtains a fresh Main-only runtime snapshot. Persist only
    // the chosen Provider identity: base/proxy URLs may contain embedded
    // credentials even when their field names do not look secret.
    if (payload.provider && typeof payload.provider === "object" && !Array.isArray(payload.provider)) {
      const providerId = String(payload.provider.id || "").trim();
      const model = String(payload.provider.model ?? payload.provider.model_name ?? "").trim();
      payload.provider = providerId ? { id: providerId, ...(model ? { model } : {}) } : {};
    }
    // The transcript is authoritative in LocalSessionStore. Keeping it out of
    // the descriptor both bounds restart metadata and prevents a duplicate
    // copy of large local-file excerpts.
    for (const key of ["messages", "history_messages", "seed_messages", "prompt", "user_text"]) delete payload[key];
    const descriptor = {
      schema: SCHEMA,
      run_id: id,
      run: cloneWithoutCredentials({
        schema: "electron_agent_run.v1",
        execution_host: "electron",
        execution_mode: "local",
        run_id: id,
        account_id: owner,
        turn_id: run.turn_id ?? run.turnId ?? "",
        request_id: run.request_id ?? run.requestId ?? "",
        session_id: run.session_id ?? run.sessionId ?? "",
        project_id: run.project_id ?? run.projectId ?? run.project ?? "",
        trace_id: run.trace_id ?? run.traceId ?? "",
        goal_id: run.goal_id ?? run.goalId ?? "",
        provider_mode: run.provider_mode ?? run.providerMode ?? "direct",
        host_id: run.host_id ?? run.hostId ?? "electron-main",
        protocol_version: run.protocol_version ?? run.protocolVersion ?? 2,
      }),
      start_payload: payload,
      provider_budget: { ...DEFAULT_PROVIDER_BUDGET },
      local_context: cloneWithoutCredentials({
        account_id: owner,
        knowledge_base_url: localContext.knowledge_base_url ?? localContext.knowledgeBaseUrl ?? "",
        trace_upload_base_url: localContext.trace_upload_base_url ?? localContext.traceUploadBaseUrl ?? "",
        request_text: localContext.request_text ?? localContext.requestText ?? "",
      }),
      state: "starting",
      phase: "starting",
      pending: null,
      attempt: 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    return this.enqueue(id, async () => {
      const existing = await readJson(descriptorPath(this.rootPath, id));
      if (existing) {
        const existingState = String(existing.state || "");
        const existingPhase = String(existing.phase || existingState || "");
        // A run id is single-use. Only an explicitly validated waiting
        // checkpoint may be replaced for cold continuation; terminal or
        // in-flight descriptors must never be overwritten/reanimated by a
        // renderer replay.
        if (!replace || !RECOVERABLE_PHASES.has(existingPhase)
          || TERMINAL_STATES.has(existingState)) {
          throw new Error("vibe_agent_run_descriptor_conflict");
        }
      }
      if (existing && replace) {
        descriptor.attempt = Math.max(1, Number(existing.attempt || 1) + 1);
        // Keep the original pending card/known result until the resumed child
        // reaches its next interaction or terminal state. If startup fails in
        // that narrow window, the user can retry without submitting again.
        if (existing.pending) {
          descriptor.pending = cloneWithoutCredentials(existing.pending);
          if (existing.response !== undefined) descriptor.response = cloneWithoutCredentials(existing.response);
          if (existing.resolved_result !== undefined) descriptor.resolved_result = cloneWithoutCredentials(existing.resolved_result);
        }
        if (existing.provider_budget && typeof existing.provider_budget === "object") {
          descriptor.provider_budget = cloneWithoutCredentials(existing.provider_budget);
        }
      }
      return this.write(descriptor);
    });
  }

  async get(rawId, { accountId: rawAccountId } = {}) {
    const id = runId(rawId);
    const cached = this.cache.get(id);
    if (cached) {
      if (rawAccountId !== undefined && String(cached.run.account_id || "") !== accountId(rawAccountId)) {
        throw new Error("vibe_agent_run_descriptor_account_drift");
      }
      return cloneWithoutCredentials(cached);
    }
    const raw = await readJson(descriptorPath(this.rootPath, id));
    if (!raw) return null;
    const value = normalize(raw, id);
    if (rawAccountId !== undefined && String(value.run.account_id || "") !== accountId(rawAccountId)) {
      throw new Error("vibe_agent_run_descriptor_account_drift");
    }
    this.cache.set(id, value);
    return cloneWithoutCredentials(value);
  }

  async update(rawId, patch = {}) {
    const id = runId(rawId);
    return this.enqueue(id, async () => {
      const current = await this.get(id);
      if (!current) throw new Error("vibe_agent_run_descriptor_not_found");
      const currentState = String(current.state || "");
      const requestedState = patch.state === undefined ? currentState : String(patch.state || "");
      const requestedPhase = patch.phase === undefined ? String(current.phase || "") : String(patch.phase || "");
      if (TERMINAL_STATES.has(currentState)
        && (requestedState !== currentState || (patch.phase !== undefined && requestedPhase !== String(current.phase || "")))) {
        throw new Error("vibe_agent_run_descriptor_terminal");
      }
      const next = {
        ...current,
        ...cloneWithoutCredentials(patch),
        run_id: id,
        updated_at: new Date().toISOString(),
      };
      return this.write(next);
    });
  }

  async phase(rawId, phase, fields = {}) {
    const value = String(phase || "").trim();
    if (!value || value.length > 64 || !/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("vibe_agent_run_descriptor_phase_invalid");
    const state = fields.state ?? (value === "waiting_user" || value === "resume_ready" ? "waiting_user" : TERMINAL_STATES.has(value) ? value : "running");
    return this.update(rawId, { ...fields, phase: value, state });
  }

  async updateBudget(rawId, budget) {
    return this.update(rawId, { provider_budget: normalizeProviderBudget(budget) });
  }

  async markWaiting(rawId, pending, extra = {}) {
    if (!pending || typeof pending !== "object" || Array.isArray(pending)) throw new Error("vibe_agent_run_descriptor_pending_invalid");
    return this.phase(rawId, "waiting_user", {
      state: "waiting_user",
      pending: cloneWithoutCredentials(pending),
      response: undefined,
      resolved_result: undefined,
      runtime_lost: Boolean(extra.runtime_lost),
      ...(extra.last_call ? { last_call: cloneWithoutCredentials(extra.last_call) } : {}),
    });
  }

  async markResponseInFlight(rawId, response) {
    return this.phase(rawId, "response_in_flight", {
      state: "running",
      response: cloneWithoutCredentials(response),
    });
  }

  async markResumeReady(rawId, response, result) {
    return this.phase(rawId, "resume_ready", {
      state: "waiting_user",
      response: cloneWithoutCredentials(response),
      resolved_result: cloneWithoutCredentials(result),
    });
  }

  async markTerminal(rawId, state, reason = "") {
    const id = runId(rawId);
    const value = TERMINAL_STATES.has(String(state)) ? String(state) : "failed";
    const result = await this.phase(id, value, {
      state: value,
      phase: value,
      pending: null,
      terminal_reason: String(reason || "").slice(0, 256),
      terminal_at: new Date().toISOString(),
      runtime_lost: false,
    });
    // Terminal descriptors remain on disk for diagnostics/recovery audits,
    // but no longer need a hot in-memory copy for every historical Run.
    this.cache.delete(id);
    return result;
  }

  async list({ accountId: rawAccountId, recoverableOnly = false, includeTerminal = true, limit = MAX_LIST } = {}) {
    const owner = rawAccountId === undefined ? "" : accountId(rawAccountId);
    const count = Number(limit);
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_LIST) throw new Error("vibe_agent_run_descriptor_limit_invalid");
    let entries = [];
    try { entries = await fs.readdir(this.rootPath, { withFileTypes: true }); } catch { return []; }
    const values = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const raw = await readJson(path.join(this.rootPath, entry.name, "descriptor.json"));
      if (!raw) continue;
      // Pre-account migration descriptors are deliberately unowned. They may
      // remain for diagnostics but can never be listed or resumed by a user.
      if (!String(raw?.run?.account_id || "").trim()) continue;
      const value = normalize(raw);
      if (owner && String(value.run.account_id || "") !== owner) continue;
      if (recoverableOnly && (!RECOVERABLE_PHASES.has(value.phase) || !value.pending)) continue;
      if (!includeTerminal && TERMINAL_STATES.has(value.state)) continue;
      values.push(value);
    }
    values.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    return values.slice(0, count).map((item) => cloneWithoutCredentials(item));
  }

  /**
   * Called once after Main starts. A lost child may not be replayed: only an
   * already-materialized waiting interaction remains recoverable. Any phase
   * that could have had an in-flight Provider/tool side effect is terminalized
   * with an explicit unknown outcome.
   */
  async reconcileAfterRestart() {
    const values = await this.list({ includeTerminal: false });
    for (const item of values) {
      if (RECOVERABLE_PHASES.has(item.phase) && item.pending) {
        await this.phase(item.run_id, item.phase, {
          state: "waiting_user",
          runtime_lost: true,
        }).catch(() => undefined);
        continue;
      }
      if (ACTIVE_PHASES.has(item.phase) || !TERMINAL_STATES.has(item.state)) {
        await this.markTerminal(item.run_id, "failed", phaseFailure(item.phase)).catch(() => undefined);
      }
    }
    return this.list({ recoverableOnly: true, includeTerminal: false });
  }

  async close() {
    await Promise.allSettled([...this.chains.values()]);
    this.chains.clear();
    this.cache.clear();
  }
}

export const localRunConstants = {
  SCHEMA,
  MAX_DESCRIPTOR_BYTES,
  ACTIVE_PHASES,
  RECOVERABLE_PHASES,
  TERMINAL_STATES,
};
