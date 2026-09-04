/**
 * Local Pi tool adapter.
 *
 * Pi remains the decision maker. This adapter only dispatches an already
 * selected tool call to the remote Knowledge Capability. Native file tools are
 * owned directly by Pi's child runtime; this adapter never proxies attachments.
 */
import { createHash } from "node:crypto";
import {
  authoredMarkdownChunks,
  codePointLength,
  DEFAULT_MARKDOWN_CHUNK_CHARS,
} from "./markdownChunkProtocol.node.js";

const KNOWLEDGE_TOOLS = new Map([
  ["search_knowledge", "search"],
  ["search_vibe_platform_docs", "search"],
  ["get_knowledge_overview", "overview"],
  ["read_knowledge", "read_source"],
  ["add_knowledge", "prepare_change"],
  ["edit_knowledge", "prepare_change"],
  ["delete_knowledge", "prepare_change"],
  ["move_knowledge_section", "prepare_change"],
]);
const HIDDEN_TOOLS = new Set(["apply_confirmation", "cancel_confirmation", "read", "bash", "edit", "write"]);
const READ_WAVE_TOOLS = new Set([
  "search_knowledge", "search_vibe_platform_docs", "get_knowledge_overview", "read_knowledge",
]);
const NATURAL_TARGET_WRITE_TOOLS = new Set([
  "edit_knowledge", "delete_knowledge", "move_knowledge_section",
]);
const INLINE_READ_BYTES = 256 * 1024;

function jsonText(value) {
  if (typeof value === "string") return value;
  return JSON.stringify(value ?? {}, null, 2);
}

function stableErrorCode(error, fallback = "vibe_agent_tool_failed") {
  const candidate = String(error?.code || error?.message || "").trim();
  // Node filesystem errors can include the absolute local attachment path in
  // `message`. Keep Trace/provider tool results to a fixed code vocabulary.
  const safe = /^(?:vibe_agent|knowledge|natural|provider|pi|electron|attachment|invalid|project|account|resource|receipt|interaction|run|trace|client|model|context|total|wall|candidate|unsupported|missing|document|source|permission|unauthenticated|not_found|upload|chunk|bundle|credential|operation|response|tool|local)(?:[A-Za-z0-9_.:-]*)$/u;
  return safe.test(candidate) ? candidate : fallback;
}

function canonicalJson(value) {
  if (Array.isArray(value)) return `[${value.map((item) => canonicalJson(item)).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${canonicalJson(value[key])}`).join(",")}}`;
  }
  return value === undefined ? "null" : JSON.stringify(value);
}

function digest(value) {
  return createHash("sha256").update(canonicalJson(value)).digest("hex");
}

function traceableKnowledgePayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)
    || !String(payload.target_binding || "").trim()) return payload;
  const safe = { ...payload };
  safe.target_binding_sha256 = digest(String(safe.target_binding));
  delete safe.target_binding;
  return safe;
}

function naturalWriteTargets(name, payload) {
  if (!NATURAL_TARGET_WRITE_TOOLS.has(name)) return [];
  const raw = [];
  if (payload?.document?.target) raw.push(payload.document.target);
  for (const change of Array.isArray(payload?.changes) ? payload.changes : []) {
    if (change?.target) raw.push(change.target);
  }
  const seen = new Set();
  return raw.filter((target) => {
    if (!target || typeof target !== "object" || Array.isArray(target)) return false;
    const key = canonicalJson(target);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function withoutTargetBinding(outcome) {
  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) return outcome;
  const projected = { ...outcome };
  if (projected.result && typeof projected.result === "object" && !Array.isArray(projected.result)) {
    projected.result = { ...projected.result };
    delete projected.result.binding;
  }
  return projected;
}

function responseSignature(value) {
  return digest({
    action: value?.action || "",
    clarification_response: value?.clarification_response || null,
  });
}

function argsObject(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("vibe_agent_tool_arguments_invalid");
  return value;
}

function clarificationOptionAllowed(options, optionId) {
  if (!Array.isArray(options) || !options.length) return false;
  const wanted = String(optionId || "").trim();
  if (!wanted) return false;
  return options.some((item) => {
    if (typeof item === "string") return item.trim() === wanted;
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    return [item.id, item.option_id, item.value, item.label]
      .some((value) => String(value ?? "").trim() === wanted);
  });
}

function clarificationOption(options, optionId) {
  if (!Array.isArray(options)) return null;
  const wanted = String(optionId || "").trim();
  return options.find((item) => {
    if (typeof item === "string") return item.trim() === wanted;
    if (!item || typeof item !== "object" || Array.isArray(item)) return false;
    return [item.id, item.option_id, item.value, item.label]
      .some((value) => String(value ?? "").trim() === wanted);
  }) ?? null;
}

function result(toolCallId, value, { details = {}, isError = false } = {}) {
  return {
    tool_call_id: String(toolCallId),
    content: [{ type: "text", text: jsonText(value) }],
    details,
    is_error: Boolean(isError),
  };
}

function toolResult(value, { details = {}, isError = false, terminate = false } = {}) {
  return {
    content: [{ type: "text", text: jsonText(value) }],
    details,
    is_error: Boolean(isError),
    ...(terminate ? { terminate: true } : {}),
  };
}

function safeReceiptText(value, max = 1_000) {
  if (value !== undefined && value !== null && typeof value !== "string") return "";
  const text = String(value ?? "").trim();
  if (!text || text.length > max
    || /[\u0000-\u001f\u007f]/u.test(text)
    || /(?:api[_-]?key|authorization|password|secret|token|(?:document|source|span|generation|commit|confirmation|request|trace|turn|goal|provider|session|run)[_-]?id)\s*[:=]?/iu.test(text)
    || /(?:doc|src|spn|span|gen|cmt|turn|goal|kcf|kcm)[_-][A-Za-z0-9:-]{6,}/u.test(text)) {
    return "";
  }
  return text;
}

function knowledgeReceipt(outcome, action) {
  const row = outcome?.result && typeof outcome.result === "object" && !Array.isArray(outcome.result)
    ? outcome.result : {};
  const verification = row.verification && typeof row.verification === "object" && !Array.isArray(row.verification)
    ? row.verification : {};
  const expected = row.metadata?.expected_effects && typeof row.metadata.expected_effects === "object"
    ? row.metadata.expected_effects : {};
  const documents = (Array.isArray(verification.documents) ? verification.documents : expected.documents || [])
    .map((document) => ({
      ...(safeReceiptText(document?.filename, 240) ? { filename: safeReceiptText(document.filename, 240) } : {}),
      ...(safeReceiptText(document?.title, 240) ? { title: safeReceiptText(document.title, 240) } : {}),
      ...(typeof document?.active === "boolean" ? { active: document.active } : {}),
    }))
    .filter((document) => Object.keys(document).length);
  const operation = safeReceiptText(
    row.operation || verification.operation || expected.operation,
    64,
  );
  const summary = safeReceiptText(row.summary, 1_000);
  const userReceipt = safeReceiptText(row.user_receipt, 1_000);
  return {
    schema: "knowledge_change_receipt.v1",
    action: ["apply", "cancel", "stop_all"].includes(action) ? action : "cancel",
    status: safeReceiptText(outcome?.status || (action === "stop_all" ? "stopped" : "unknown"), 64) || "unknown",
    ...(operation ? { operation } : {}),
    ...(summary ? { summary } : {}),
    ...(userReceipt ? { user_receipt: userReceipt } : {}),
    ...(typeof verification.ok === "boolean" ? { verified: verification.ok } : {}),
    ...(documents.length ? { documents } : {}),
    ...(outcome?.error ? { error: stableErrorCode(outcome.error, "knowledge_change_failed") } : {}),
  };
}

function publicKnowledgeOutcome(outcome) {
  if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) return outcome;
  const status = String(outcome.status || "");
  if (["retryable_failure", "non_retryable_failure"].includes(status)) {
    const code = stableErrorCode(outcome.error, "knowledge_tool_failed");
    return {
      schema: "knowledge_capability.outcome.v1",
      capability: "knowledge",
      status,
      result: null,
      error: {
        code,
        retryable: status === "retryable_failure",
        message: code,
        details: {},
      },
      gaps: [],
    };
  }
  if (status === "cancelled") {
    return {
      schema: "knowledge_capability.outcome.v1",
      capability: "knowledge",
      status,
      result: null,
      error: null,
      gaps: [],
    };
  }
  return outcome;
}

export class LocalToolRouter {
  constructor({ knowledgeClient, knowledgeCache = null, run, defaultQuery = "", onTrace } = {}) {
    this.knowledgeClient = knowledgeClient;
    this.knowledgeCache = knowledgeCache;
    this.run = run || {};
    this.defaultQuery = String(defaultQuery || "").trim();
    this.onTrace = typeof onTrace === "function" ? onTrace : () => {};
    this.pending = new Map();
    this.interactionSequence = 0;
  }

  /** Restore the one interaction that was already materialized before Main
   * exited. No tool is re-run; only its identity is retained so a later user
   * response can resolve the original confirmation/clarification exactly once.
   */
  restorePending(interaction, { toolCallId = "", toolName = "", result: priorResult = {} } = {}) {
    if (!interaction || typeof interaction !== "object" || Array.isArray(interaction)) {
      throw new Error("vibe_agent_interaction_descriptor_invalid");
    }
    const interactionId = String(interaction.interaction_id || "").trim();
    if (!interactionId) throw new Error("vibe_agent_interaction_id_invalid");
    const sequence = Number(interaction.sequence || 0);
    if (!Number.isSafeInteger(sequence) || sequence < 1) throw new Error("vibe_agent_interaction_sequence_invalid");
    this.interactionSequence = Math.max(this.interactionSequence, sequence);
    this.pending.set(interactionId, {
      ...interaction,
      interaction_id: interactionId,
      toolCallId: String(toolCallId || interaction.tool_call_id || ""),
      toolName: String(toolName || interaction.tool_name || ""),
      result: priorResult && typeof priorResult === "object" ? priorResult : {},
    });
    return interactionId;
  }

  async trace(name, payload, status = "ok") {
    try { await this.onTrace({ name, payload, status }); } catch { /* trace is observational */ }
  }

  async executeWave({ calls = [], signal } = {}) {
    if (!Array.isArray(calls) || !calls.length || calls.length > 20) throw new Error("vibe_agent_tool_wave_invalid");
    const ids = new Set();
    for (const call of calls) {
      const toolCallId = String(call?.id ?? call?.tool_call_id ?? "").trim();
      if (!toolCallId || ids.has(toolCallId)) throw new Error("vibe_agent_tool_call_id_invalid");
      ids.add(toolCallId);
    }
    if (calls.every((call) => READ_WAVE_TOOLS.has(String(call?.name || "")))) {
      return { results: await this.executeKnowledgeWave(calls, signal) };
    }
    ids.clear();
    const results = [];
    let interactionSeen = false;
    for (const call of calls) {
      const toolCallId = String(call?.id ?? call?.tool_call_id ?? "").trim();
      const name = String(call?.name ?? "").trim();
      if (!toolCallId || ids.has(toolCallId)) throw new Error("vibe_agent_tool_call_id_invalid");
      ids.add(toolCallId);
      if (signal?.aborted) throw new Error("vibe_agent_tool_wave_aborted");
      // A single Pi assistant message may contain several tool calls. Once a
      // call opens an interaction, do not execute later calls in that same
      // wave: another pending confirmation would be impossible to resolve
      // deterministically. Return a normal tool error for the skipped call so
      // Pi can decide how to continue after the user responds.
      if (interactionSeen) {
        results.push(result(toolCallId, {
          code: "vibe_agent_interaction_pending",
          message: "前一个工具调用正在等待用户响应，本调用尚未执行。",
        }, { isError: true }));
        continue;
      }
      try {
        const value = await this.executeOne({ toolCallId, name, args: argsObject(call?.arguments ?? {}), signal });
        if (value?.interaction) {
          interactionSeen = true;
          this.pending.set(value.interaction.interaction_id, {
            ...value.interaction,
            toolCallId,
            toolName: name,
            result: value.result,
          });
          results.push({ tool_call_id: toolCallId, interaction: value.interaction });
        } else {
          results.push(result(toolCallId, value));
        }
      } catch (error) {
        const code = stableErrorCode(error);
        await this.trace("tool.error", { tool_call_id: toolCallId, tool: name, code }, "error");
        results.push(result(toolCallId, { code, message: code }, { isError: true }));
      }
    }
    return { results };
  }

  async executeKnowledgeWave(calls, signal) {
    if (!this.knowledgeClient) throw new Error("vibe_agent_knowledge_client_unconfigured");
    const prepared = [];
    const immediate = new Map();
    for (const call of calls) {
      const toolCallId = String(call?.id ?? call?.tool_call_id ?? "").trim();
      const name = String(call?.name ?? "").trim();
      try {
        const args = argsObject(call?.arguments ?? {});
        const operation = KNOWLEDGE_TOOLS.get(name);
        await this.trace("tool.requested", { tool_call_id: toolCallId, tool: name, arguments: args });
        const payload = await this.knowledgePayload(name, operation, args);
        await this.trace("knowledge.request", { tool_call_id: toolCallId, tool: name, payload });
        prepared.push({
          name,
          call: {
            operation,
            projectId: this.run.project_id ?? this.run.projectId ?? this.run.project,
            sessionId: this.run.session_id ?? this.run.sessionId,
            turnId: this.run.turn_id ?? this.run.turnId,
            goalId: this.run.goal_id ?? this.run.goalId,
            toolCallId,
            payload,
            idempotencyKey: `local:${digest([this.run.run_id || this.run.runId || "local", toolCallId])}`,
            traceId: this.run.trace_id ?? this.run.traceId ?? this.run.run_id,
          },
        });
      } catch (error) {
        const code = stableErrorCode(error);
        await this.trace("tool.error", { tool_call_id: toolCallId, tool: name, code }, "error");
        immediate.set(toolCallId, result(toolCallId, { code, message: code }, { isError: true }));
      }
    }
    if (!prepared.length) return calls.map((call) => immediate.get(String(call?.id ?? call?.tool_call_id ?? "")));
    let outcomes;
    try {
      if (typeof this.knowledgeClient.callWave === "function") {
        outcomes = await this.knowledgeClient.callWave({ calls: prepared.map((item) => item.call), signal });
      } else {
        outcomes = await Promise.all(prepared.map(async (item) => ({
          tool_call_id: item.call.toolCallId,
          request_id: item.call.requestId || "",
          operation: item.call.operation,
          outcome: await this.knowledgeClient.call(
            signal === undefined ? item.call : { ...item.call, signal },
          ),
        })));
      }
    } catch (error) {
      const code = stableErrorCode(error);
      for (const item of prepared) {
        await this.trace("tool.error", { tool_call_id: item.call.toolCallId, tool: item.name, code }, "error");
        immediate.set(item.call.toolCallId, result(item.call.toolCallId, { code, message: code }, { isError: true }));
      }
      return calls.map((call) => immediate.get(String(call?.id ?? call?.tool_call_id ?? "")));
    }
    const outcomeRows = Array.isArray(outcomes) ? outcomes : [];
    const expectedCallIds = new Set(prepared.map((item) => item.call.toolCallId));
    const outcomeByCallId = new Map();
    const malformedCallIds = new Set();
    let malformedWave = outcomeRows.length !== prepared.length;
    for (const response of outcomeRows) {
      const callId = String(response?.tool_call_id || "").trim();
      if (!callId || !prepared.some((item) => item.call.toolCallId === callId)
        || outcomeByCallId.has(callId)) {
        if (callId) malformedCallIds.add(callId);
        malformedWave = true;
        continue;
      }
      const hasOutcome = response?.outcome !== undefined;
      const hasError = response?.error !== undefined;
      const expected = prepared.find((item) => item.call.toolCallId === callId);
      const validOutcome = hasOutcome
        && response.outcome && typeof response.outcome === "object"
        && !Array.isArray(response.outcome)
        && typeof response.outcome.status === "string"
        && new Set([
          "completed", "waiting_user", "needs_follow_up", "cancelled",
          "retryable_failure", "non_retryable_failure",
        ]).has(response.outcome.status)
        && (() => {
          const outcome = response.outcome;
          const hasResult = outcome.result !== undefined && outcome.result !== null;
          const hasOutcomeError = outcome.error !== undefined && outcome.error !== null;
          if (outcome.status === "completed" && !hasResult) return false;
          if (["retryable_failure", "non_retryable_failure"].includes(outcome.status)) {
            if (hasResult || !hasOutcomeError
              || typeof outcome.error !== "object" || Array.isArray(outcome.error)
              || typeof outcome.error.code !== "string" || !outcome.error.code.trim()) return false;
            if (outcome.error.retryable !== undefined
              && typeof outcome.error.retryable !== "boolean") return false;
            if (outcome.error.retryable !== undefined
              && outcome.error.retryable !== (outcome.status === "retryable_failure")) return false;
          } else if (hasOutcomeError || outcome.status === "cancelled" && hasResult) {
            return false;
          }
          return true;
        })();
      const validError = hasError
        && response.error && typeof response.error === "object"
        && !Array.isArray(response.error)
        && typeof response.error.code === "string"
        && response.error.code.trim();
      if (response?.operation !== undefined
        && String(response.operation) !== String(expected.call.operation)
        || hasOutcome === hasError
        || (hasOutcome && !validOutcome)
        || (hasError && !validError)) {
        malformedCallIds.add(callId);
        malformedWave = true;
        continue;
      }
      outcomeByCallId.set(callId, response);
    }
    if (malformedWave) {
      for (const callId of expectedCallIds) malformedCallIds.add(callId);
    }
    let interactionSeen = false;
    for (const item of prepared) {
      const response = outcomeByCallId.get(item.call.toolCallId);
      if (!response || malformedCallIds.has(item.call.toolCallId)) {
        immediate.set(item.call.toolCallId, result(item.call.toolCallId, {
          code: response ? "knowledge_wave_response_invalid" : "knowledge_wave_response_missing",
          message: response ? "knowledge_wave_response_invalid" : "knowledge_wave_response_missing",
        }, { isError: true }));
        continue;
      }
      if (response.error) {
        const code = stableErrorCode(response.error);
        await this.trace("tool.error", { tool_call_id: item.call.toolCallId, tool: item.name, code }, "error");
        // Error messages from a remote adapter may contain database paths or
        // provider diagnostics.  The model only needs the stable code; keep
        // the detailed payload in the authenticated Trace instead.
        immediate.set(item.call.toolCallId, result(item.call.toolCallId, { code, message: code }, { isError: true }));
        continue;
      }
      await this.trace("knowledge.result", { tool_call_id: item.call.toolCallId, tool: item.name, outcome: response.outcome });
      let projectedOutcome = response.outcome;
      if (item.name === "read_knowledge") {
        try {
          projectedOutcome = await this.materializeReadOutcome(projectedOutcome, item.call.toolCallId, signal);
        } catch (error) {
          const code = stableErrorCode(error, "knowledge_read_materialization_failed");
          await this.trace("tool.error", {
            tool_call_id: item.call.toolCallId,
            tool: item.name,
            code,
          }, "error");
          immediate.set(
            item.call.toolCallId,
            result(item.call.toolCallId, { code, message: code }, { isError: true }),
          );
          continue;
        }
      }
      projectedOutcome = publicKnowledgeOutcome(projectedOutcome);
      // Only the first interaction in a read wave can become a pending card.
      // Avoid even materializing later cards: interactionFromOutcome allocates
      // a sequence number, and consuming it for a rejected sibling would make
      // the next legitimate card fail the contiguous-sequence check in Pi.
      if (interactionSeen) {
        immediate.set(item.call.toolCallId, result(item.call.toolCallId, {
          code: "vibe_agent_interaction_pending",
          message: "前一个工具调用正在等待用户响应，本调用尚未执行。",
        }, { isError: true }));
        continue;
      }
      let value;
      try {
        value = this.interactionFromOutcome(projectedOutcome, item.call.toolCallId, item.name);
      } catch (error) {
        const code = stableErrorCode(error, "vibe_agent_interaction_invalid");
        await this.trace("tool.error", { tool_call_id: item.call.toolCallId, tool: item.name, code }, "error");
        immediate.set(item.call.toolCallId, result(item.call.toolCallId, { code, message: code }, { isError: true }));
        continue;
      }
      if (value?.interaction) {
        interactionSeen = true;
        this.pending.set(value.interaction.interaction_id, {
          ...value.interaction,
          toolCallId: item.call.toolCallId,
          toolName: item.name,
          result: value.result,
        });
        immediate.set(item.call.toolCallId, { tool_call_id: item.call.toolCallId, interaction: value.interaction });
      } else {
        immediate.set(item.call.toolCallId, result(item.call.toolCallId, value));
      }
    }
    return calls.map((call) => immediate.get(String(call?.id ?? call?.tool_call_id ?? "")));
  }

  async executeOne({ toolCallId, name, args, signal }) {
    if (HIDDEN_TOOLS.has(name)) throw new Error("vibe_agent_tool_not_exposed");
    await this.trace("tool.requested", { tool_call_id: toolCallId, tool: name, arguments: args });
    if (name === "ask_clarification") {
      const question = String(args.question_to_user ?? args.question ?? args.text ?? "").trim();
      if (!question) throw new Error("vibe_agent_clarification_question_missing");
      const interactionId = `clarification-${toolCallId}`;
      return {
        interaction: {
          interaction_id: interactionId,
          sequence: ++this.interactionSequence,
          kind: "clarification",
          spec_digest: digest(args),
          question_to_user: question,
          ...(args.description ? { description: String(args.description) } : {}),
          ...(Array.isArray(args.options) ? { options: args.options } : {}),
          ...(args.input_hint ? { input: { enabled: true, placeholder: String(args.input_hint) } } : {}),
        },
        result: {
          question_to_user: question,
          description: args.description || "",
          options: args.options || [],
          ...(args.input_hint ? { input: { enabled: true, placeholder: String(args.input_hint) } } : {}),
        },
      };
    }
    const operation = KNOWLEDGE_TOOLS.get(name);
    if (!operation) throw new Error("vibe_agent_unknown_tool");
    if (!this.knowledgeClient) throw new Error("vibe_agent_knowledge_client_unconfigured");
    let payload = await this.knowledgePayload(name, operation, args);
    const bound = await this.bindNaturalWriteTargets(name, payload, toolCallId, signal);
    if (bound.outcome) {
      return this.interactionFromOutcome(
        publicKnowledgeOutcome(withoutTargetBinding(bound.outcome)),
        toolCallId,
        name,
      );
    }
    payload = bound.payload;
    // Trace the exact post-materialization request. For a large authored
    // document this is the chunks/hash payload, never a local source path.
    await this.trace("knowledge.request", {
      tool_call_id: toolCallId,
      tool: name,
      payload: traceableKnowledgePayload(payload),
    });
    let outcome = await this.knowledgeClient.call({
      operation,
      projectId: this.run.project_id ?? this.run.projectId ?? this.run.project,
      sessionId: this.run.session_id ?? this.run.sessionId,
      turnId: this.run.turn_id ?? this.run.turnId,
      goalId: this.run.goal_id ?? this.run.goalId,
      toolCallId,
      payload,
      idempotencyKey: `${this.run.run_id || this.run.runId || "local"}:${toolCallId}`,
      traceId: this.run.trace_id ?? this.run.traceId ?? this.run.run_id,
      signal,
    });
    if (name === "read_knowledge") outcome = await this.materializeReadOutcome(outcome, toolCallId, signal);
    await this.trace("knowledge.result", { tool_call_id: toolCallId, tool: name, outcome });
    return this.interactionFromOutcome(publicKnowledgeOutcome(outcome), toolCallId, name);
  }

  async bindNaturalWriteTargets(name, payload, toolCallId, signal) {
    const targets = naturalWriteTargets(name, payload);
    if (!targets.length) return { payload };
    const outcome = await this.knowledgeClient.call({
      operation: "bind_targets",
      projectId: this.run.project_id ?? this.run.projectId ?? this.run.project,
      sessionId: this.run.session_id ?? this.run.sessionId,
      turnId: this.run.turn_id ?? this.run.turnId,
      goalId: this.run.goal_id ?? this.run.goalId,
      toolCallId: `${toolCallId}:target-binding`,
      payload: { targets },
      traceId: this.run.trace_id ?? this.run.traceId ?? this.run.run_id,
      signal,
    });
    const binding = String(outcome?.result?.binding || "").trim();
    const outcomeStatus = String(outcome?.status || "unresolved");
    await this.trace("knowledge.target_binding", {
      tool_call_id: toolCallId,
      tool: name,
      target_count: targets.length,
      status: binding ? "resolved" : outcomeStatus,
      ...(binding ? { binding_sha256: digest(binding) } : {}),
      ...(!binding && outcome?.result?.error?.code
        ? { error_code: stableErrorCode(outcome.result.error, "knowledge_target_binding_failed") }
        : {}),
    }, new Set(["retryable_failure", "non_retryable_failure"]).has(outcomeStatus) ? "error" : "ok");
    return binding
      ? { payload: { ...payload, target_binding: binding } }
      : { payload, outcome: withoutTargetBinding(outcome) };
  }

  async materializeReadOutcome(outcome, toolCallId, signal) {
    const readResult = outcome?.result;
    if (!readResult || !Object.hasOwn(readResult, "complete")) return outcome;
    const hideHandle = (value) => {
      const safe = { ...value };
      delete safe.resource_handle;
      return safe;
    };
    if (readResult.complete === true) return { ...outcome, result: hideHandle(readResult) };
    const handle = readResult.resource_handle;
    if (!handle) throw new Error("knowledge_resource_handle_missing");
    const handleHash = String(handle.content_hash || "").toLowerCase();
    const handleVersion = String(handle.version || "").toLowerCase();
    const byteSize = Number(handle.byte_size);
    if (
      handle.schema !== "resource_handle.v1"
      || handle.provider_id !== "knowledge"
      || !/^[0-9a-f]{64}$/u.test(handleHash)
      || handleVersion !== handleHash
      || !Number.isSafeInteger(byteSize) || byteSize < 0
      || !String(handle.resource_id || "").trim()
      || String(handle.actor_id) !== String(this.run.account_id ?? this.run.accountId ?? "")
      || String(handle.project_id) !== String(this.run.project_id ?? this.run.projectId ?? this.run.project ?? "")
      || String(handle.session_id) !== String(this.run.session_id ?? this.run.sessionId ?? "")
      || !Array.isArray(handle.allowed_capabilities)
      || !handle.allowed_capabilities.includes("knowledge.download_source")
    ) throw new Error("knowledge_resource_handle_invalid");
    // Resource handles are Main-only capabilities.  Never leave the
    // backend's source/session identity in the model-visible tool result;
    // the local path (for large pages) and the ordinary cursor are sufficient
    // for Pi to continue reading.
    if (byteSize <= INLINE_READ_BYTES) {
      return { ...outcome, result: hideHandle(readResult) };
    }
    if (!this.knowledgeCache) throw new Error("vibe_agent_knowledge_cache_unavailable");
    const localPath = await this.knowledgeCache.materialize({
      client: this.knowledgeClient,
      handle,
      accountId: String(this.run.account_id ?? this.run.accountId ?? ""),
      projectId: String(this.run.project_id ?? this.run.projectId ?? this.run.project ?? ""),
      sessionId: String(this.run.session_id ?? this.run.sessionId ?? ""),
      signal,
    });
    await this.trace("knowledge.materialized", {
      tool_call_id: toolCallId,
      content_hash: handle.content_hash,
      byte_size: handle.byte_size,
    });
    return { ...outcome, result: { ...hideHandle(readResult), local_path: localPath } };
  }

  async authoredDocument(document) {
    if (!document || typeof document !== "object" || Array.isArray(document)) {
      throw new Error("vibe_agent_authored_document_invalid");
    }
    const rawFilename = document.filename ?? document.name;
    if (rawFilename !== undefined && rawFilename !== null && typeof rawFilename !== "string") {
      throw new Error("vibe_agent_authored_document_filename_invalid");
    }
    const filename = String(rawFilename ?? "");
    // The ordinary branch is Pi-authored text.  Do not forward its internal
    // source marker: the remote service should see only model_authored data.
    if (Array.isArray(document.chunks)) {
      if (document.chunks.some((chunk) => (
        !chunk || typeof chunk !== "object" || Array.isArray(chunk)
      ))) throw new Error("vibe_agent_authored_document_chunks_invalid");
      if (document.content_hash !== undefined
        && (typeof document.content_hash !== "string" || !document.content_hash.trim())) {
        throw new Error("vibe_agent_authored_document_hash_invalid");
      }
      return {
        filename,
        origin_kind: "model_authored",
        chunks: document.chunks.map((chunk) => ({ ...chunk })),
        ...(document.content_hash !== undefined ? { content_hash: String(document.content_hash) } : {}),
      };
    }
    const body = document.body ?? document.content;
    if (body !== undefined) {
      if (typeof body !== "string") throw new Error("vibe_agent_authored_document_body_invalid");
      const text = body;
      if (codePointLength(text) > DEFAULT_MARKDOWN_CHUNK_CHARS) {
        const materialized = authoredMarkdownChunks(text);
        return {
          filename,
          origin_kind: "model_authored",
          chunks: materialized.chunks,
          content_hash: materialized.content_hash,
        };
      }
      return {
        filename,
        origin_kind: "model_authored",
        content: text,
      };
    }
    throw new Error("vibe_agent_authored_document_source_invalid");
  }

  async knowledgePayload(name, operation, args) {
    const payload = { ...args };
    if (operation === "search" && !String(payload.query || "").trim() && this.defaultQuery) {
      payload.query = this.defaultQuery;
    }
    if (name === "search_vibe_platform_docs") payload.scope = "system";
    if (operation === "prepare_change") {
      // User text remains separate from the Main-only signed target binding.
      // Model arguments can provide natural locators but never authority.
      if (this.defaultQuery) {
        payload.request_text = this.defaultQuery;
        payload.original_request_text = this.defaultQuery;
      }
      payload.operation = name === "add_knowledge" ? "insert"
        : name === "edit_knowledge" ? "update"
          : name === "delete_knowledge" ? "delete" : "move";
      if (name === "move_knowledge_section") {
        payload.changes = [{
          target: payload.target,
          source_path: payload.source_path,
          target_path: payload.target_path,
        }];
        delete payload.target;
        delete payload.source_path;
        delete payload.target_path;
      }
      // Only Pi-authored, user-confirmed Markdown crosses the Knowledge API;
      // local source paths never cross this boundary.
      if (Array.isArray(payload.documents)) {
        const documents = [];
        for (const doc of payload.documents) documents.push(await this.authoredDocument(doc));
        payload.documents = documents;
      }
      const document = payload.document;
      if (document && typeof document === "object" && !Array.isArray(document)) {
        if (document.body !== undefined) {
          const materialized = await this.authoredDocument({
            filename: document.filename || document.target?.source_name || "document.md",
            body: document.body,
          });
          payload.document = {
            target: document.target,
            ...(materialized.chunks
              ? { chunks: materialized.chunks, content_hash: materialized.content_hash }
              : { body: materialized.content }),
          };
        }
      }
      delete payload.attachments;
      delete payload.attachment_resources;
    }
    return payload;
  }

  interactionFromOutcome(outcome, toolCallId, toolName) {
    if (!outcome || typeof outcome !== "object") return outcome;
    const status = String(outcome.status || "");
    const resultValue = outcome.result ?? outcome;
    // Some capability adapters return a completed envelope whose result is
    // the persisted `{ clarification: ... }` preview.  Treat that payload as
    // an interaction too; waiting_user is a transport hint, not the sole
    // authority for whether a confirmation card exists.
    if (status !== "waiting_user" && !resultValue?.knowledge_change_decision && !resultValue?.clarification) return resultValue;
    const clarification = resultValue?.clarification && typeof resultValue.clarification === "object"
      && !Array.isArray(resultValue.clarification) ? resultValue.clarification : null;
    const clarificationRaw = clarification?.raw && typeof clarification.raw === "object"
      && !Array.isArray(clarification.raw) ? clarification.raw : {};
    const clarificationExtra = clarification?.extra && typeof clarification.extra === "object"
      && !Array.isArray(clarification.extra) ? clarification.extra : clarificationRaw;
    const decision = resultValue?.knowledge_change_decision;
    if (status === "waiting_user" && !clarification && (!decision || typeof decision !== "object" || Array.isArray(decision))) {
      throw new Error("vibe_agent_interaction_invalid");
    }
    if (decision && (typeof decision !== "object" || Array.isArray(decision))) {
      throw new Error("vibe_agent_interaction_invalid");
    }
    const confirmationId = String(
      resultValue?.confirmation_id
      || decision?.decision_id
      || clarificationExtra.confirmation_id
      || clarification?.confirmation_id
      || "",
    ).trim();
    const interactionId = String(
      confirmationId
      || `local-interaction-${toolCallId}`,
    );
    const kind = confirmationId || decision || clarification?.kind === "knowledge_change"
      ? "knowledge_confirmation" : "clarification";
    const question = resultValue?.question_to_user || clarification?.question_to_user
      || clarification?.question || clarification?.title || clarificationRaw.title;
    const description = resultValue?.description || clarification?.description || clarificationRaw.description;
    const options = resultValue?.options || clarification?.options || clarificationRaw.options;
    const input = resultValue?.input || clarification?.input || clarificationRaw.input;
    if (kind === "knowledge_confirmation" && !confirmationId) {
      throw new Error("vibe_agent_confirmation_identity_invalid");
    }
    if (!question && !description
      && !(Array.isArray(options) && options.length)
      && (!input || typeof input !== "object" || Array.isArray(input))) {
      throw new Error("vibe_agent_interaction_question_missing");
    }
    return {
      interaction: {
        interaction_id: interactionId,
        ...(kind === "knowledge_confirmation" ? { confirmation_id: confirmationId || interactionId } : {}),
        sequence: ++this.interactionSequence,
        kind,
        spec_digest: digest(resultValue),
        ...(question ? { question_to_user: String(question) } : {}),
        ...(description ? { description: String(description) } : {}),
        ...(Array.isArray(options) ? { options } : {}),
        ...(input && typeof input === "object" ? { input } : {}),
        ...(decision
          ? { preview: decision }
          : kind === "knowledge_confirmation" && Object.keys(clarificationRaw).length
            ? { preview: clarificationRaw }
            : clarification?.preview ? { preview: clarification.preview } : {}),
      },
      result: resultValue,
    };
  }


  async resolveInteraction(interactionId, response) {
    const id = String(interactionId || "");
    const pending = this.pending.get(id)
      || [...this.pending.values()].find((item) => String(item.confirmation_id || "") === id);
    if (!pending) throw new Error("vibe_agent_interaction_not_found");
    // Keep the resolved value until the Run ends. If the child dies after a
    // remote apply but before receiving this response, a repeated UI action
    // must replay the same result rather than issue a second business call.
    if (pending.resolved) {
      if (pending.resolvedResponse
        && responseSignature(pending.resolvedResponse) !== responseSignature(response)) {
        throw new Error("vibe_agent_response_replay_mismatch");
      }
      return pending.resolved;
    }
    if (response?.action !== undefined && response?.action !== null && typeof response.action !== "string") {
      throw new Error("vibe_agent_confirmation_action_invalid");
    }
    const action = String(response?.action || "").trim();
    if (pending.kind === "knowledge_confirmation") {
      if (!new Set(["apply", "cancel", "stop_all"]).has(action)) throw new Error("vibe_agent_confirmation_action_invalid");
      if (!this.knowledgeClient) throw new Error("vibe_agent_knowledge_client_unconfigured");
      const confirmationId = String(pending.confirmation_id || id);
      const outcome = action === "stop_all" ? { status: "stopped", result: { stopped: true } } : await this.knowledgeClient.call({
        operation: "resolve_confirmation",
        projectId: this.run.project_id ?? this.run.projectId ?? this.run.project,
        sessionId: this.run.session_id ?? this.run.sessionId,
        turnId: this.run.turn_id ?? this.run.turnId,
        toolCallId: pending.toolCallId,
        payload: { confirmation_id: confirmationId, action },
        idempotencyKey: `${this.run.run_id || "local"}:${confirmationId}:${action}`,
        traceId: this.run.trace_id ?? this.run.traceId ?? this.run.run_id,
      });
      if (action !== "stop_all" && (!outcome || typeof outcome !== "object" || Array.isArray(outcome))) {
        throw new Error("knowledge_confirmation_result_invalid");
      }
      const outcomeStatus = String(outcome?.status || "").toLowerCase();
      if (action !== "stop_all" && !new Set([
        "completed", "applied", "replayed", "cancelled", "stale", "failed", "retryable_failure",
        "non_retryable_failure", "waiting_user", "needs_follow_up",
      ]).has(outcomeStatus)) {
        throw new Error("knowledge_confirmation_result_invalid");
      }
      if (action === "apply" && new Set(["completed", "applied", "replayed"]).has(outcomeStatus)
        && (!outcome.result || typeof outcome.result !== "object" || Array.isArray(outcome.result))) {
        throw new Error("knowledge_confirmation_result_invalid");
      }
      const outcomeFailed = new Set(["failed", "retryable_failure", "non_retryable_failure", "stale"])
        .has(outcomeStatus)
        || (Boolean(outcome?.error) && outcomeStatus !== "cancelled");
      const resolved = {
        status: action === "apply" && outcomeStatus === "stale"
          ? "stale"
          : outcomeFailed && action === "apply"
            ? "failed"
            : action === "apply" ? "applied" : action === "cancel" ? "cancelled" : "stopped",
        result: toolResult(knowledgeReceipt(outcome, action), {
          isError: outcomeFailed,
          terminate: action === "stop_all",
        }),
        user_message: action === "apply"
          ? outcomeFailed
            ? "用户已确认执行，但权威事务回执显示本次知识变更未成功提交。请结合原始请求自主决定下一步。"
            : "用户已确认执行；权威事务回执显示本次知识变更已经提交。请重新对照原始请求，自主决定下一步。"
          : action === "cancel"
            ? "用户已取消本次知识变更。请重新对照原始请求，自主决定下一步。"
            : "用户已停止本次任务。",
      };
      await this.trace("interaction.resolved", {
        interaction_id: id,
        confirmation_id: confirmationId,
        action,
        outcome,
      }, action === "apply" && outcomeFailed ? "error" : "ok");
      pending.resolved = resolved;
      pending.resolvedResponse = structuredClone(response);
      return resolved;
    }
    const clarification = response?.clarification_response;
    if (!clarification || !["option", "input"].includes(String(clarification.type))) throw new Error("vibe_agent_clarification_response_invalid");
    if (typeof clarification.type !== "string") throw new Error("vibe_agent_clarification_response_invalid");
    const selectedOption = clarification.type === "option"
      ? clarificationOption(pending.options, clarification.option_id)
      : null;
    const userMessage = clarification.type === "option"
      ? String(
        (selectedOption && typeof selectedOption === "object"
          ? selectedOption.label || selectedOption.value
          : selectedOption)
        || clarification.option_id || "",
      )
      : (() => {
        if (typeof clarification.text !== "string") throw new Error("vibe_agent_clarification_response_invalid");
        return clarification.text;
      })();
    if (!userMessage) throw new Error("vibe_agent_clarification_response_empty");
    if (clarification.type === "option"
      && typeof clarification.option_id !== "string") {
      throw new Error("vibe_agent_clarification_option_invalid");
    }
    if (clarification.type === "option"
      && !clarificationOptionAllowed(pending.options, clarification.option_id)) {
      throw new Error("vibe_agent_clarification_option_invalid");
    }
    const resolved = {
      status: "resolved",
      result: toolResult({ acknowledged: true }),
      user_message: userMessage,
    };
    await this.trace("interaction.resolved", {
      interaction_id: id,
      clarification_response: clarification,
    });
    pending.resolved = resolved;
    pending.resolvedResponse = structuredClone(response);
    return resolved;
  }
}

export const localToolRouterConstants = { KNOWLEDGE_TOOLS };
