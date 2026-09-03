import { app, BrowserWindow, dialog, ipcMain } from "electron";
import fs from "node:fs/promises";
import path from "node:path";

import {
  VibeAgentHost,
  vibeAgentChildEnvironment,
  vibeAgentRuntimePath,
} from "./agentHost.node.js";
import { LocalTraceStore } from "./trace/localTraceStore.node.js";
import { TraceUploadQueue } from "./trace/traceUploadQueue.node.js";
import {
  assistantPartialPayload,
  assistantStreamSummary,
  contentReference,
  createAssistantStream,
  recordAssistantDelta,
  traceStartPayload,
} from "./trace/traceCompaction.mjs";
import { KnowledgeRemoteClient } from "./knowledgeRemoteClient.node.js";
import { KnowledgeResourceCache } from "./knowledgeCache.node.js";
import { VibeSkillCache } from "./skillCache.node.js";
import { LocalFileRefs } from "./localFileRefs.node.js";
import { LocalToolRouter } from "./localToolRouter.node.js";
import { LocalSessionStore } from "./session/localSessionStore.node.js";
import { LocalRunStore } from "./run/localRunStore.node.js";
import { validatedBackendUrl } from "./backendUrl.node.js";
import { fetchRuntimeSnapshot } from "./runtimeSnapshotClient.node.js";
import { ElectronPiReadiness } from "./readiness.node.js";
import { AccountBinding, normalizeBoundAccountId } from "./accountBinding.node.js";

const CHANNELS = [
  "vibeAgent:readinessCheck",
  "vibeAgent:readinessExport",
  "vibeAgent:startLocal",
  "vibeAgent:recoverableLocal",
  "vibeAgent:recoverLocal",
  "vibeAgent:attach",
  "vibeAgent:respond",
  "vibeAgent:cancel",
  "vibeAgent:status",
  "vibeAgent:list",
  "vibeAgent:logout",
  "vibeAgent:localFilePick",
  "vibeAgent:localFilePreview",
  "vibeAgent:traceCreate",
  "vibeAgent:traceAppend",
  "vibeAgent:traceFinish",
  "vibeAgent:traceList",
  "vibeAgent:traceDetail",
  "vibeAgent:tracePayload",
  "vibeAgent:traceExport",
  "vibeAgent:traceRemove",
  "vibeAgent:traceUpload",
  "vibeAgent:traceResume",
  "vibeAgent:traceUploadWait",
  "vibeAgent:traceUploadStatus",
  "vibeAgent:traceSubscribe",
  "vibeAgent:sessionCreate",
  "vibeAgent:sessionManifest",
  "vibeAgent:sessionList",
  "vibeAgent:sessionEvents",
  "vibeAgent:sessionAppend",
  "vibeAgent:sessionUpdate",
  "vibeAgent:sessionTitle",
  "vibeAgent:sessionRemove",
];

// Full Provider request bodies contain the complete prompt, history and tool
// schemas.  Keep them out of normal local Traces; the digest, size and tool
// metadata emitted by the runner are sufficient for routine diagnosis.  A
// developer can explicitly opt into the original payload capture for a
// controlled diagnostic run without giving the Renderer a way to enable it.
const localTracePayloadCapture = process.env.VIBE_PI_TRACE_CAPTURE_PAYLOAD === "1";

function requireManagedSender(event, windowManager) {
  const browserWindow = BrowserWindow.fromWebContents(event.sender);
  if (!browserWindow || browserWindow.isDestroyed()) throw new Error("vibe_agent_ipc_sender_invalid");
  const ownerKey = windowManager?.listKeys?.().find((key) => {
    const candidate = windowManager.get(key);
    return candidate?.webContents === event.sender;
  });
  // Vibe 工作台是受管的 `vibe-workbench`（以及其 vibe-* 子窗口），
  // 不是应用主窗口；思维导图等非 Vibe 窗口不能枚举、接管或取消 Agent Run。
  if (ownerKey !== "main" && ownerKey !== "vibe" && !ownerKey?.startsWith("vibe-")) {
    throw new Error("vibe_agent_ipc_sender_unmanaged");
  }
  return event.sender;
}

export function initVibeAgentMain({ windowManager, isDevelopment, localHandlers, maxActiveRuns } = {}) {
  const userDataPath = app.getPath("userData");
  const readiness = new ElectronPiReadiness({
    execPath: process.execPath,
    runnerPath: vibeAgentRuntimePath(),
    env: vibeAgentChildEnvironment(),
    appVersion: app.getVersion(),
    platform: process.platform,
    arch: process.arch,
  });
  // Purely local release diagnostics: load the packaged runner once at app
  // startup. This does not create a Run, access a Provider, or call a server.
  const readinessPromise = readiness.check();
  const sessionStore = new LocalSessionStore({
    rootPath: path.join(userDataPath, "vibe-agent", "sessions"),
  });
  const runStore = new LocalRunStore({
    rootPath: path.join(userDataPath, "vibe-agent", "runs"),
  });
  // A Main restart has no trustworthy child/process state. Reconcile once:
  // waiting interactions stay resumable; every in-flight phase becomes an
  // explicit unknown/failed descriptor and is never replayed automatically.
  const runReconcilePromise = runStore.reconcileAfterRestart().catch(() => []);
  let localFileRefs = new LocalFileRefs();
  const traceStore = new LocalTraceStore({
    rootPath: path.join(userDataPath, "vibe-agent", "traces"),
  });
  const knowledgeCache = new KnowledgeResourceCache({
    rootPath: path.join(userDataPath, "vibe-agent", "knowledge-cache"),
  });
  const skillCache = new VibeSkillCache({
    rootPath: path.join(userDataPath, "vibe-agent", "skills"),
  });
  const traceSubscribers = new Set();
  const createTraceUploadQueue = () => new TraceUploadQueue({
    store: traceStore,
    isDevelopment,
    onStatus: (event) => {
      for (const sender of traceSubscribers) {
        if (sender?.isDestroyed?.()) {
          traceSubscribers.delete(sender);
          continue;
        }
        try { sender.send("vibeAgent:trace-upload-status", event); } catch { traceSubscribers.delete(sender); }
      }
    },
  });
  let traceUploadQueue = createTraceUploadQueue();
  const reconcileTracePromise = runReconcilePromise.then(async () => {
    // If Main died while a child was in flight, the run descriptor is now a
    // durable failure but its local Trace may still say `running`. Close that
    // diagnostic span locally; upload remains explicit and authenticated on
    // the next Trace resume call.
    const descriptors = await runStore.list({ includeTerminal: true, limit: 500 }).catch(() => []);
    for (const descriptor of descriptors) {
      const state = String(descriptor?.state || "");
      if (!new Set(["failed", "aborted", "cancelled", "closed"]).has(state)) continue;
      const traceId = traceIdFor(descriptor.run);
      if (!traceId) continue;
      const current = await traceStore.ensure(traceId, {
        accountId: descriptor.run?.account_id,
        projectId: descriptor.run?.project_id,
      }).catch(() => null);
      if (!current || String(current.status || "running") !== "running") continue;
      await traceStore.finish({
        traceId,
        accountId: descriptor.run?.account_id,
        projectId: descriptor.run?.project_id,
        status: state === "cancelled" ? "cancelled" : state === "aborted" ? "aborted" : state === "closed" ? "closed" : "failed",
        payload: { code: String(descriptor.terminal_reason || "runner_interrupted") },
      }).catch(() => undefined);
    }
  }).catch(() => undefined);
  const routers = new Map();
  // Per-run binding tokens are bootstrap credentials. Keep them in Main
  // memory only; neither the renderer nor a durable run descriptor receives
  // the bearer value.
  const runBindings = new Map();
  const traces = new Map();
  // A renderer-provided account id is only a routing hint.  Bind the Main
  // process to the account returned by the first authenticated runtime
  // snapshot, then require the same identity for every local store/Run IPC.
  // The binding is intentionally memory-only. The typed logout IPC drains the
  // bound account before releasing it for a later login in the same process.
  const accountBinding = new AccountBinding();
  let accountContextEpoch = 0;
  const payloadAccountId = (payload = {}, code = "vibe_agent_account_required") => {
    const raw = payload?.accountId ?? payload?.account_id;
    return normalizeBoundAccountId(raw, code);
  };
  const accountForLocalOperation = (value, code = "vibe_agent_account_required") => {
    const accountId = normalizeBoundAccountId(value, code);
    // Preserve the first-run flow (the Renderer creates its local session and
    // picks files before the first bootstrap).  Once an authenticated
    // bootstrap has supplied the account, every later local operation is
    // fail-closed on identity drift.
    return accountBinding.accept(accountId);
  };
  // Handlers close over the host identity for trace metadata; assign the host
  // after the handlers are assembled, before any IPC call can invoke them.
  let host;
  const assistantStreams = new Map();
  const runtimeSnapshotRequests = new Map();
  // `HostedRun.cancel()` returns as soon as the abort frame is accepted.  Keep
  // the explicit user intent until the runner's terminal `done` frame arrives
  // so an `aborted` status can be distinguished from an app-exit/crash abort.
  const localUserCancelRequests = new Map();
  const LOCAL_CANCELLATION_RECEIPT = "已停止本轮处理，本轮未产生任何录入或改动。";
  const localPromptText = (value) => {
    if (typeof value === "string") return value;
    if (Array.isArray(value)) return value.map((item) => localPromptText(item?.content ?? item)).filter(Boolean).join("\n");
    if (value && typeof value === "object") return localPromptText(value.content ?? "");
    return "";
  };
  const isDefaultSessionTitle = (value) => {
    const title = String(value ?? "").trim();
    return !title || new Set(["新的需求对话", "Vibe 需求对话", "未命名对话"]).has(title);
  };
  const appendLocalSessionEvent = async (run, role, content, meta = {}, attachments = []) => {
    if (String(run?.execution_mode || "") !== "local") return;
    const sessionId = String(run?.session_id || run?.sessionId || "").trim();
    const runId = String(run?.run_id || run?.runId || "").trim();
    const value = String(content ?? "");
    const hasToolCalls = Array.isArray(meta?.tool_calls) && meta.tool_calls.length > 0;
    if (!sessionId || !runId || (!value && !hasToolCalls && !attachments.length)) return;
    await sessionStore.append({
      sessionId,
      accountId: run.account_id ?? run.accountId,
      role,
      content: value,
      meta: {
        local_agent: true,
        run_id: runId,
        trace_id: traceIdFor(run),
        ...meta,
      },
      attachments: Array.isArray(attachments) ? attachments : [],
      internal: true,
    });
  };
  // Cancellation is a lifecycle receipt, not a model answer. Persist it under
  // its own idempotent key so it survives reload and never replaces a partial
  // or completed assistant message from the same Run.
  const appendLocalCancellationReceipt = async (run, {
    reason = "user_cancelled",
    terminalStatus = "cancelled",
  } = {}) => {
    if (String(run?.execution_mode || "") !== "local") return false;
    const sessionId = String(run?.session_id || run?.sessionId || "").trim();
    const runId = String(run?.run_id || run?.runId || "").trim();
    const accountId = String(run?.account_id || run?.accountId || "").trim();
    if (!sessionId || !runId || !accountId) return false;
    await appendLocalSessionEvent(run, "assistant", LOCAL_CANCELLATION_RECEIPT, {
      local_event_key: `${runId}:cancelled`,
      message_kind: "status",
      outcome: "cancelled",
      stop_reason: String(reason || "user_cancelled"),
      terminal_status: String(terminalStatus || "cancelled"),
    });
    return true;
  };
  const repairDanglingLocalToolResults = async ({ run, code, pending_tool_call_id = "" }) => {
    if (String(run?.execution_mode || "") !== "local") return;
    const sessionId = String(run?.session_id || run?.sessionId || "").trim();
    const runId = String(run?.run_id || run?.runId || "").trim();
    const accountId = String(run?.account_id || run?.accountId || "").trim();
    if (!sessionId || !runId || !accountId) return;
    const history = await sessionStore.history(sessionId, { accountId }).catch(() => []);
    const completed = new Set(
      history.filter((item) => item?.role === "tool" && item?.tool_call_id)
        .map((item) => String(item.tool_call_id)),
    );
    const pending = String(pending_tool_call_id || run?.pending_tool_call_id || "").trim();
    for (const assistant of history.filter((item) => item?.role === "assistant")) {
      const calls = Array.isArray(assistant?.tool_calls) ? assistant.tool_calls : [];
      for (const call of calls) {
        const callId = String(call?.id || call?.tool_call_id || "").trim();
        if (!callId || completed.has(callId) || callId === pending) continue;
        const toolName = String(call?.name || "tool").trim();
        const content = [{
          type: "text",
          text: "本机工具执行结果未知，系统未自动重试；如需继续请重新提出请求。",
        }];
        await appendLocalSessionEvent(run, "tool", content[0].text, {
          local_event_key: `recovery-tool:${runId}:${callId}`,
          tool_call_id: callId,
          name: toolName,
          is_error: true,
          details: { code: String(code || "tool_outcome_unknown"), recovered: true },
          tool_result: {
            tool_call_id: callId,
            content,
            details: { code: String(code || "tool_outcome_unknown"), recovered: true },
            is_error: true,
          },
        });
        completed.add(callId);
      }
    }
  };
  const localResponseEventKey = (pendingId, response) => {
    const clarification = response?.clarification_response || {};
    const value = [
      String(pendingId || ""),
      String(response?.action || ""),
      String(clarification.type || ""),
      String(clarification.option_id || clarification.text || ""),
    ].join(":");
    let hash = 2166136261;
    for (let index = 0; index < value.length; index += 1) {
      hash ^= value.charCodeAt(index);
      hash = Math.imul(hash, 16777619);
    }
    return `response:${String(pendingId || "")}:${(hash >>> 0).toString(16)}`;
  };
  const localResponseText = (request, response) => {
    if (response?.action === "apply") return "确认执行";
    if (response?.action === "cancel") return "先不处理";
    if (response?.action === "stop_all") return "停止本轮";
    const clarification = response?.clarification_response;
    if (clarification?.type === "option") {
      const option = Array.isArray(request?.options)
        ? request.options.find((item) => String(item?.id || "") === String(clarification.option_id || ""))
        : null;
      return String(option?.label || clarification.option_id || "已选择");
    }
    if (clarification?.type === "input") return String(clarification.text || "").trim();
    return "已回复";
  };
  const localToolContentText = (value) => Array.isArray(value)
    ? value.map((item) => String(item?.text || "")).join("")
    : value && typeof value === "object" ? JSON.stringify(value) : String(value ?? "");
  const validContext = (context) => {
    const value = context && typeof context === "object" && !Array.isArray(context) ? context : {};
    const aliasedText = (keys, code, {
      max = 32_768, trim = true, allowTextControls = false,
    } = {}) => {
      const present = keys.filter((key) => Object.hasOwn(value, key)
        && value[key] !== undefined && value[key] !== null);
      for (const key of present) {
        if (typeof value[key] !== "string") throw new Error(code);
      }
      const values = present.map((key) => (trim ? value[key].trim() : value[key]));
      if (values.length > 1 && values.some((item) => item !== values[0])) throw new Error(code);
      const result = values[0] ?? "";
      if (result.length > max || [...result].some((character) => {
        const point = character.codePointAt(0) || 0;
        return point === 0x7f || (point < 0x20
          && !(allowTextControls && (character === "\n" || character === "\r" || character === "\t")));
      })) throw new Error(code);
      return result;
    };
    const authToken = aliasedText(["auth_token", "authToken"], "vibe_agent_local_auth_invalid");
    const rawBaseUrl = aliasedText(
      ["knowledge_base_url", "knowledgeBaseUrl", "baseUrl"],
      "vibe_agent_local_backend_url_not_allowed",
    );
    const rawTraceUrl = aliasedText(
      ["trace_upload_base_url", "traceUploadBaseUrl"],
      "vibe_agent_local_backend_url_not_allowed",
    ) || rawBaseUrl;
    const validateBase = (raw) => {
      if (!raw) return "";
      try {
        return validatedBackendUrl(raw, { isDevelopment }).toString().replace(/\/$/, "");
      } catch {
        throw new Error("vibe_agent_local_backend_url_not_allowed");
      }
    };
    const baseUrl = validateBase(rawBaseUrl);
    const traceUploadBaseUrl = validateBase(rawTraceUrl);
    const rawAccountId = Object.hasOwn(value, "account_id") ? value.account_id : value.accountId;
    if (rawAccountId !== undefined && rawAccountId !== null
      && typeof rawAccountId !== "string" && !(Number.isSafeInteger(rawAccountId) && rawAccountId >= 0)) {
      throw new Error("vibe_agent_local_account_invalid");
    }
    const accountId = String(rawAccountId ?? "").trim();
    if (/[\u0000-\u001f\u007f]/u.test(accountId)) throw new Error("vibe_agent_local_account_invalid");
    if (!accountId || !/^[A-Za-z0-9._:-]{1,160}$/.test(accountId)) throw new Error("vibe_agent_local_account_invalid");
    const requestText = aliasedText(
      ["request_text", "requestText"],
      "vibe_agent_local_request_text_invalid",
      { max: 20_000, trim: false, allowTextControls: true },
    );
    if (requestText.length > 20_000) throw new Error("vibe_agent_local_request_text_too_large");
    const rawTraceHeaders = value.trace_upload_headers ?? value.traceHeaders;
    const traceHeaderNames = new Set();
    const traceHeaders = rawTraceHeaders && typeof rawTraceHeaders === "object" && !Array.isArray(rawTraceHeaders)
      ? Object.fromEntries(Object.entries(rawTraceHeaders).slice(0, 32).filter(([name, header]) => {
          const normalized = String(name).toLowerCase();
          // Authentication and hop-by-hop headers are owned by Main/Fetch;
          // accepting a differently-cased duplicate (for example
          // `authorization`) could produce an ambiguous request on the wire.
          if (new Set(["authorization", "cookie", "set-cookie", "proxy-authorization", "host", "content-length", "content-type"]).has(normalized)
            || traceHeaderNames.has(normalized)) return false;
          traceHeaderNames.add(normalized);
          return /^[A-Za-z0-9-]{1,128}$/.test(name)
            && typeof header === "string"
            && header.length <= 32_768
            && !/[\u0000-\u001f\u007f]/u.test(header);
        }).map(([name, header]) => [name, String(header)]))
      : {};
    const rawBinding = value.agent_binding ?? value.agentBinding;
    const bindingToken = rawBinding && typeof rawBinding === "object" && !Array.isArray(rawBinding)
      ? rawBinding.token
      : rawBinding;
    if (bindingToken !== undefined && bindingToken !== null && typeof bindingToken !== "string") {
      throw new Error("vibe_agent_local_binding_invalid");
    }
    const agentBinding = String(bindingToken ?? "").trim();
    if (agentBinding.length > 4096 || /[\u0000-\u001f\u007f]/u.test(agentBinding)) {
      throw new Error("vibe_agent_local_binding_invalid");
    }
    return {
      accountId,
      authToken,
      baseUrl,
      requestText,
      traceUploadBaseUrl,
      traceHeaders,
      agentBinding,
    };
  };
  const localContextPayload = (context) => ({
    account_id: context.accountId,
    auth_token: context.authToken,
    knowledge_base_url: context.baseUrl,
    trace_upload_base_url: context.traceUploadBaseUrl,
    trace_upload_headers: context.traceHeaders,
    request_text: context.requestText,
  });
  const traceIdFor = (run) => String(run?.trace_id || run?.traceId || run?.run_id || run?.runId || "").trim();
  const ensureTrace = async (run) => {
    const traceId = traceIdFor(run);
    if (!traceId) return "";
    if (!traces.has(traceId)) {
      try {
          await traceStore.create({
          traceId,
          accountId: run.account_id ?? run.accountId,
            runId: run.run_id,
            sessionId: run.session_id,
            goalId: run.goal_id || run.run_id,
            projectId: run.project_id,
          metadata: {
            agent_execution_host: "electron",
            execution_host: "electron",
            agent_core_version: host?.identity?.().piAgentCoreVersion || "0.84.4",
            pi_ai_version: host?.identity?.().piAiVersion || "0.84.4",
            bridge_protocol_version: host?.identity?.().protocolVersion || 3,
            client_instance_hash: host?.identity?.().clientInstanceHash || "",
            turn_id: run.turn_id,
            project_id: run.project_id,
            // Keep the transport boundary visible in the Trace manifest. This
            // is metadata only: the Main-owned injector still decides the mode,
            // and the Renderer cannot select another Provider transport.
            provider_transport: "electron_direct",
            // New Goals use opaque native local_file_ref values.  A run with
            // no selected file is explicitly marked as such in the manifest.
            attachment_transport: String(run?.attachment_transport || "none"),
          },
        });
      } catch (error) {
        // Storage outages are observational and may be ignored, but an
        // identity collision means a renderer tried to join another Run's
        // Trace. Fail that boundary closed instead of silently appending to
        // the existing chain.
        if (new Set([
          "vibe_agent_trace_identity_conflict",
          "vibe_agent_trace_account_drift",
          "vibe_agent_trace_project_drift",
          "vibe_agent_trace_manifest_invalid",
        ]).has(String(error?.message || ""))) throw error;
      }
      traces.set(traceId, true);
    }
    return traceId;
  };
  const appendTrace = async (run, name, payload, status = "ok", attributes = {}) => {
    const traceId = await ensureTrace(run);
    if (!traceId) return;
    await traceStore.append({
      traceId,
      accountId: run.account_id ?? run.accountId,
      projectId: run.project_id ?? run.projectId ?? run.project,
      name,
      status,
      attributes,
      ...(payload === undefined ? {} : { payload }),
    }).catch((error) => {
      if (new Set([
        "vibe_agent_trace_identity_conflict",
        "vibe_agent_trace_account_drift",
        "vibe_agent_trace_project_drift",
        "vibe_agent_trace_manifest_invalid",
      ]).has(String(error?.message || ""))) throw error;
      return undefined;
    });
  };
  const finishTrace = async (run, context, status, payload, attributes = {}) => {
    const traceId = await ensureTrace(run);
    if (!traceId) return;
    const resolvedStatus = String(status || "ok");
    if (resolvedStatus !== "waiting_user") {
      const current = await traceStore.ensure(traceId, {
        accountId: run.account_id ?? run.accountId,
        projectId: run.project_id ?? run.projectId ?? run.project,
      }).catch(() => null);
      if (current && String(current.status || "running") !== "running") return;
    }
    const partial = assistantStreams.get(traceId);
    if (partial) {
      await traceStore.append({
        traceId,
        accountId: run.account_id ?? run.accountId,
        projectId: run.project_id ?? run.projectId ?? run.project,
        name: "agent.assistant_partial",
        status: resolvedStatus === "waiting_user" ? "waiting_user" : "error",
        payload: assistantPartialPayload(partial, { endedAt: Date.now() }),
      }).catch(() => undefined);
      assistantStreams.delete(traceId);
    }
    // A waiting turn is a checkpoint, not the end of the logical Goal. Keep
    // its local journal open so a later interaction response can append to the
    // same trace and upload only once at the real terminal state.
    if (resolvedStatus === "waiting_user") {
      await traceStore.append({
        traceId,
        accountId: run.account_id ?? run.accountId,
        projectId: run.project_id ?? run.projectId ?? run.project,
        name: "agent.run.waiting_user",
        status: resolvedStatus,
        payload,
      }).catch(() => undefined);
      return;
    }
    await traceStore.finish({
      traceId,
      accountId: run.account_id ?? run.accountId,
      projectId: run.project_id ?? run.projectId ?? run.project,
      status: resolvedStatus,
      attributes,
      ...(payload === undefined ? {} : { payload }),
    }).catch(() => undefined);
    const normalized = validContext(context);
    if (normalized.authToken && normalized.traceUploadBaseUrl
      && !accountBinding.isReleasing(run.account_id ?? run.accountId)) {
      void traceUploadQueue.enqueue(traceId, {
        accountId: run.account_id ?? run.accountId,
        baseUrl: normalized.traceUploadBaseUrl,
        headers: { ...normalized.traceHeaders, Authorization: `token=${normalized.authToken}` },
        bindingToken: normalized.agentBinding || runBindings.get(String(run?.run_id || run?.runId || ""))?.token || "",
      }).catch(() => undefined);
    }
    runBindings.delete(String(run?.run_id || run?.runId || ""));
  };
  // Complete traces for runs discovered as in-flight during a Main restart.
  // This writes only a local failure checkpoint; authenticated upload remains
  // the normal renderer/Main responsibility once a user session is available.
  void runReconcilePromise.then(async () => {
    const descriptors = await runStore.list({ includeTerminal: true }).catch(() => []);
    for (const descriptor of descriptors) {
      const reason = String(descriptor?.terminal_reason || "");
      const traceId = String(descriptor?.run?.trace_id || "").trim();
      if (!traceId) continue;
      const manifest = await traceStore.ensure(traceId, {
        accountId: descriptor.run?.account_id,
        projectId: descriptor.run?.project_id,
      }).catch(() => null);
      if (!manifest || String(manifest.status || "running") !== "running") continue;
      if (!reason && ["waiting_user", "resume_ready"].includes(String(descriptor?.phase || ""))) {
        await traceStore.append({
          traceId,
          accountId: descriptor.run?.account_id,
          projectId: descriptor.run?.project_id,
          name: "agent.run.recovered_waiting",
          status: "waiting_user",
          payload: { phase: descriptor.phase, runtime_lost: true },
        }).catch(() => undefined);
        continue;
      }
      if (!["provider_outcome_unknown", "tool_outcome_unknown", "runner_interrupted"].includes(reason)) continue;
      await traceStore.finish({
        traceId,
        accountId: descriptor.run?.account_id,
        projectId: descriptor.run?.project_id,
        status: "failed",
        payload: { code: reason, recovery: "main_restart" },
      }).catch(() => undefined);
    }
  }).catch(() => undefined);
  const routerFor = (run, context, { refresh = false } = {}) => {
    const key = String(run?.run_id || run?.runId || "");
    if (refresh) routers.delete(key);
    if (routers.has(key)) return routers.get(key);
    const normalized = validContext(context);
    const bindingToken = normalized.agentBinding || runBindings.get(key)?.token || "";
    const knowledgeClient = normalized.authToken && normalized.baseUrl
      ? new KnowledgeRemoteClient({
          baseUrl: normalized.baseUrl,
          authToken: normalized.authToken,
          agentBinding: bindingToken,
          isDevelopment,
        })
      : null;
    const router = new LocalToolRouter({
      knowledgeClient,
      knowledgeCache,
      run,
      defaultQuery: normalized.requestText,
      onTrace: ({ name, payload, status }) => appendTrace(run, name, payload, status),
    });
    routers.set(key, router);
    return router;
  };
  const builtInLocalHandlers = {
    onStart: async ({ run, payload, context }) => {
      // Main owns the durable journal write as well as the child lifecycle.
      // Renderer still writes an optimistic copy for instant UI feedback;
      // local_event_key makes the two paths one idempotent event.
      const localFiles = Array.isArray(payload?.local_files) ? payload.local_files.map((item) => ({
        schema: "local_file_ref.v1",
        id: String(item.ref_id || ""),
        resource_id: String(item.ref_id || ""),
        ref_id: String(item.ref_id || ""),
        name: String(item.name || ""),
        filename: String(item.name || ""),
        mime: String(item.mime || "application/octet-stream"),
        size: Number(item.size || 0),
        kind: "local-file",
      })) : [];
      const userText = payload?.user_text !== undefined
        ? localPromptText(payload.user_text)
        : localPromptText(payload?.prompt);
      await appendLocalSessionEvent(run, "user", userText, {
        local_event_key: `${String(run?.run_id || run?.runId || "")}:user`,
      }, localFiles);
      const traceId = await ensureTrace(run);
      if (traceId) {
        await traceStore.updateMetadata(traceId, {
          accountId: run.account_id ?? run.accountId,
          projectId: run.project_id ?? run.projectId ?? run.project,
          metadata: {
            request_text: String(context?.request_text ?? context?.requestText ?? localPromptText(payload?.prompt ?? payload?.user_text)),
            turn_id: String(run?.turn_id || run?.turnId || ""),
            project_id: String(run?.project_id || run?.projectId || ""),
            ...(payload?.skill ? {
              skill_name: String(payload.skill.name || ""),
              skill_version: String(payload.skill.version || ""),
              skill_sha256: String(payload.skill.sha256 || ""),
            } : {}),
          },
        }).catch(() => undefined);
      }
      return appendTrace(run, "agent.start", traceStartPayload(payload));
    },
    onSessionOpen: async ({ run, session }) => {
      const sessionId = String(run?.session_id || run?.sessionId || "").trim();
      const accountId = String(run?.account_id || run?.accountId || "").trim();
      if (String(session?.session_id || "") !== sessionId) {
        throw new Error("vibe_agent_pi_session_identity_drift");
      }
      await sessionStore.recordPiSession(sessionId, {
        accountId,
        piSessionId: session.pi_session_id,
        entryCount: session.entry_count,
        contextMessageCount: session.context_message_count,
        lastEntryId: session.last_entry_id,
        bootstrapSequence: session.bootstrap_sequence,
        resumed: Boolean(session.resumed),
      });
      return { accepted: true };
    },
    onPark: async ({ run, reason, code, signal }) => {
      return appendTrace(run, "agent.run.parked", {
        reason: String(reason || "waiting_child_exit"),
        ...(code === undefined ? {} : { code: String(code) }),
        ...(signal === undefined ? {} : { signal: String(signal) }),
      }, "waiting_user");
    },
    onClose: async ({ run, context, state }) => {
      // A normal app quit closes the child before it can emit its own `done`
      // frame. Finalize the local Trace from the Host lifecycle so an abort
      // is still visible and can be uploaded; finishTrace is idempotent when
      // a terminal frame was already persisted.
      const resolvedState = String(state || "aborted");
      const runId = String(run?.run_id || run?.runId || "").trim();
      const requestedCancelReason = String(localUserCancelRequests.get(runId) || "").trim();
      // If the child exits before emitting `done`, this is the last reliable
      // lifecycle boundary for a user stop. App-exit cleanup does not set the
      // intent map, so an application shutdown is never mislabeled here.
      if (requestedCancelReason && ["aborted", "cancelled"].includes(resolvedState)) {
        await appendLocalCancellationReceipt(run, {
          reason: requestedCancelReason,
          terminalStatus: resolvedState,
        }).catch(() => undefined);
        localUserCancelRequests.delete(runId);
      }
      const traceStatus = resolvedState === "failed" ? "failed" : resolvedState === "closed" ? "closed" : "aborted";
      return finishTrace(run, context, traceStatus, { code: `host_${traceStatus}` });
    },
    onError: ({ run, code, context, startup_recovery = false }) => {
      if (String(run?.execution_mode || "") !== "local") return undefined;
      if (startup_recovery) {
        void appendTrace(run, "agent.run.recovery_start_failed", { code: String(code || "") }, "error");
        // Keep the waiting descriptor. The outer recovery handler records the
        // known response and lets the user retry.
        return undefined;
      }
      const result = finishTrace(run, context, "failed", { code: String(code || "vibe_agent_failed") });
      routers.delete(String(run?.run_id || run?.runId || ""));
      return result;
    },
    onCrash: ({ run, code, pending_tool_call_id }) => repairDanglingLocalToolResults({ run, code, pending_tool_call_id }),
    onFrame: async ({ run, frame, context }) => {
      const name = `pi.${String(frame?.type || "frame")}`;
      if (frame?.type === "done") {
        const status = String(frame.payload?.status || "ok");
        const runId = String(run?.run_id || run?.runId || "").trim();
        if (status === "waiting_user") {
          // A waiting interaction is not a terminal Trace. Flush any partial
          // narration, retain the router's pending interaction, and let the
          // same logical Goal append more frames after the user responds.
          return finishTrace(run, context, status, frame.payload);
        }
        const frameCode = String(frame.payload?.code || frame.payload?.reason || "").trim();
        const requestedCancelReason = String(localUserCancelRequests.get(runId) || "").trim();
        // Runner uses `aborted` for the normal user stop path. Cold cancellation
        // is handled before a child starts and therefore never enters here.
        const explicitCancelReason = requestedCancelReason
          || (frameCode === "user_stop_all" || frameCode === "user_cancelled" ? frameCode : "");
        if (status === "aborted" && explicitCancelReason) {
          const persisted = await appendLocalCancellationReceipt(run, {
            reason: explicitCancelReason,
            terminalStatus: status,
          }).catch(() => false);
          // A later Host close can make one final idempotent persistence
          // attempt if the journal was momentarily unavailable here.
          if (persisted) localUserCancelRequests.delete(runId);
          else localUserCancelRequests.set(runId, explicitCancelReason);
        } else {
          localUserCancelRequests.delete(runId);
        }
        const finalReference = status === "completed" && frame.payload?.text !== undefined
          ? contentReference(frame.payload.text) : null;
        const result = finishTrace(
          run,
          context,
          status,
          status === "completed" ? undefined : frame.payload,
          {
            terminal_status: status,
            ...(finalReference ? {
              accepted_final_sha256: finalReference.sha256,
              accepted_final_characters: finalReference.characters,
              accepted_final_bytes: finalReference.bytes,
            } : {}),
          },
        );
        routers.delete(String(run?.run_id || run?.runId || ""));
        return result;
      }
      if (frame?.type === "interaction_request") {
        const interaction = frame.payload || {};
        const interactionId = String(interaction.confirmation_id || interaction.interaction_id || "").trim();
        const question = String(
          interaction.question_to_user
          || interaction.description
          || (interaction.kind === "knowledge_confirmation" ? "请确认是否执行这项知识变更。" : "请补充这项操作所需的信息。"),
        ).trim();
        if (interactionId && question) {
          const confirmation = String(interaction.kind || "") === "knowledge_confirmation";
          const preview = interaction.preview && typeof interaction.preview === "object" ? interaction.preview : {};
          const raw = {
            schema: "clarification.v2",
            kind: confirmation ? "confirm" : "ask",
            run_id: String(run?.run_id || run?.runId || ""),
            turn_id: String(run?.turn_id || run?.turnId || ""),
            goal_turn_id: String(run?.turn_id || run?.turnId || ""),
            ...(confirmation ? { decision_type: "confirmation", confirmation_id: interactionId } : { interaction_id: interactionId }),
            title: question,
            question,
            description: String(interaction.description || ""),
            options: Array.isArray(interaction.options) && interaction.options.length
              ? interaction.options
              : confirmation
                ? [
                    { id: "apply", label: "确认执行", action: "apply" },
                    { id: "cancel", label: "先不处理", action: "cancel", is_cancel: true },
                  ]
                : [],
            ...(interaction.input && typeof interaction.input === "object" ? { input: interaction.input } : {}),
            ...(preview.old_body !== undefined ? { old_body: String(preview.old_body || "") } : {}),
            ...(preview.new_body !== undefined ? { new_body: String(preview.new_body || "") } : {}),
            ...(preview.preview_truncated !== undefined ? { preview_truncated: Boolean(preview.preview_truncated) } : {}),
            ...(preview.preview_excerpt !== undefined ? { preview_excerpt: String(preview.preview_excerpt || "") } : {}),
            ...(Object.keys(preview).length ? { preview } : {}),
          };
          await appendLocalSessionEvent(run, "assistant", question, {
            local_event_key: `interaction:${interactionId}`,
            clarification: { question, raw, pending: [] },
          });
        }
      }
      if (frame?.type === "assistant_end") {
        const messageId = String(frame.message_id || "").trim();
        const purpose = String(frame.payload?.purpose || "main_agent");
        const toolCalls = Array.isArray(frame.payload?.tool_calls) ? frame.payload.tool_calls : [];
        if (purpose === "main_agent") {
          const key = !toolCalls.length
            ? `${String(run?.run_id || run?.runId || "")}:assistant`
            : messageId
              ? `assistant:${messageId}`
              : `assistant:${purpose}:${JSON.stringify(frame.payload || {}).length}`;
          await appendLocalSessionEvent(run, "assistant", String(frame.payload?.text || ""), {
            local_event_key: key,
            tool_calls: toolCalls,
            purpose,
            stop_reason: frame.payload?.stop_reason,
            usage: frame.payload?.usage,
          });
        }
      }
      if (frame?.type === "local_tool_end" || frame?.type === "tool_rejected") {
        const toolCallId = String(frame.payload?.tool_call_id || "").trim();
        const result = frame.payload?.result && typeof frame.payload.result === "object"
          ? frame.payload.result : { content: [] };
        if (toolCallId) {
          await appendLocalSessionEvent(run, "tool", localToolContentText(result.content), {
            local_event_key: `${frame.type === "tool_rejected" ? "tool-rejected" : "local-tool"}:${String(run?.run_id || run?.runId || "")}:${toolCallId}`,
            tool_call_id: toolCallId,
            name: String(frame.payload?.tool_name || ""),
            is_error: Boolean(frame.payload?.is_error),
            details: result.details,
            tool_result: {
              tool_call_id: toolCallId,
              content: result.content,
              details: result.details,
              is_error: Boolean(frame.payload?.is_error),
              ...(result.usage === undefined ? {} : { usage: result.usage }),
              ...(result.terminate === undefined ? {} : { terminate: Boolean(result.terminate) }),
            },
          });
        }
      }
      if (frame?.type === "provider_payload") {
        // Native compaction streams into Pi's CompactionEntry, not the user
        // answer lane, and therefore has no ordinary assistant_end frame.
        // Tracking it as a public stream would leave a false partial-answer
        // event when the run finishes immediately after compaction.
        if (String(frame.payload?.purpose || "main_agent") !== "compaction") {
          assistantStreams.set(traceIdFor(run), createAssistantStream({
            callId: frame.payload?.call_id,
            purpose: frame.payload?.purpose,
            startedAt: Date.now(),
          }));
        }
      }
      // assistant_end/provider_payload carry the complete evidence. Deltas are
      // accumulated in memory and produce one metric-only stream event per
      // Provider call; they never create one Trace row/payload per token chunk.
      if (frame?.type === "assistant_delta") {
        const traceId = traceIdFor(run);
        const stream = assistantStreams.get(traceId) || createAssistantStream({ startedAt: Date.now() });
        assistantStreams.set(traceId, recordAssistantDelta(stream, frame.payload?.text, Date.now()));
        return;
      }
      if (frame?.type === "assistant_end") {
        const traceId = traceIdFor(run);
        const stream = assistantStreams.get(traceId) || createAssistantStream({
          callId: frame.payload?.call_id,
          purpose: frame.payload?.purpose,
          startedAt: Date.now(),
        });
        await appendTrace(run, "pi.assistant_stream", undefined, "ok", assistantStreamSummary(stream, {
          callId: frame.payload?.call_id,
          purpose: frame.payload?.purpose,
          endedAt: Date.now(),
        }));
        assistantStreams.delete(traceId);
      }
      if (frame?.type === "session_checkpoint") {
        await sessionStore.recordPiSession(String(run?.session_id || run?.sessionId || ""), {
          accountId: String(run?.account_id || run?.accountId || ""),
          piSessionId: frame.payload?.pi_session_id,
          entryCount: frame.payload?.entry_count,
          contextMessageCount: frame.payload?.context_message_count,
          lastEntryId: frame.payload?.last_entry_id,
          bootstrapSequence: frame.payload?.bootstrap_sequence,
          resumed: Boolean(frame.payload?.resumed),
        });
      }
      if (frame?.type === "candidate_final") {
        const reference = contentReference(frame.payload?.text);
        return appendTrace(run, name, undefined, "ok", {
          type: frame.type,
          ...(frame?.message_id ? { message_id: frame.message_id } : {}),
          text_sha256: reference.sha256,
          text_characters: reference.characters,
          text_bytes: reference.bytes,
          stop_reason: String(frame.payload?.stop_reason || ""),
          purpose: String(frame.payload?.purpose || "main_agent"),
        });
      }
      return appendTrace(run, name, {
        type: frame?.type,
        ...(frame?.message_id ? { message_id: frame.message_id } : {}),
        ...(frame?.reply_to ? { reply_to: frame.reply_to } : {}),
        payload: frame?.payload,
      });
    },
    onToolWave: async ({ run, request, signal, context }) => {
      const outcome = await routerFor(run, context).executeWave({ calls: request.calls, signal });
      const names = new Map((Array.isArray(request?.calls) ? request.calls : []).map((call) => [
        String(call?.id || ""), String(call?.name || ""),
      ]));
      for (const item of Array.isArray(outcome?.results) ? outcome.results : []) {
        const toolCallId = String(item?.tool_call_id || "").trim();
        if (!toolCallId) continue;
        // An interaction has no completed tool result yet. Persisting its
        // placeholder would create two toolResult messages for the same call
        // during cold continuation. The resolved result is written by
        // onInteractionResponse after the user chooses.
        if (item?.interaction) continue;
        await appendLocalSessionEvent(run, "tool", localToolContentText(item?.content ?? item), {
          local_event_key: `tool:${String(run?.run_id || run?.runId || "")}:${toolCallId}`,
          tool_call_id: toolCallId,
          ...(names.get(toolCallId) ? { name: names.get(toolCallId) } : {}),
          is_error: Boolean(item?.is_error),
          details: item?.details,
          // Keep the structured result so a cold continuation can rebuild a
          // valid Pi toolResult without re-running the original wave.
          tool_result: item,
        });
      }
      return outcome;
    },
    onInteractionResponse: async ({ run, request, response, context }) => {
      const outcome = await routerFor(run, context).resolveInteraction(
        request.interaction_id,
        response,
      );
      const resolvedToolCallId = String(request.tool_call_id || "").trim();
      if (resolvedToolCallId) {
        await appendLocalSessionEvent(
          run,
          "tool",
          localToolContentText(outcome?.result?.content ?? outcome?.result ?? outcome),
          {
            local_event_key: `interaction-result:${String(run?.run_id || run?.runId || "")}:${resolvedToolCallId}`,
            tool_call_id: resolvedToolCallId,
            name: String(request.tool_name || ""),
            is_error: Boolean(outcome?.result?.is_error),
            details: outcome?.result?.details,
            tool_result: outcome?.result,
          },
        );
      }
      const text = localResponseText(request, response);
      if (text) {
        await appendLocalSessionEvent(run, "user", text, {
          local_event_key: localResponseEventKey(request.confirmation_id || request.interaction_id, response),
          interaction_id: request.interaction_id,
          ...(request.confirmation_id ? { confirmation_id: request.confirmation_id } : {}),
          interaction_response: response,
        });
      }
      return outcome;
    },
    onSessionTitle: async ({ run, title }) => {
      const sessionId = String(run?.session_id || run?.sessionId || "").trim();
      const accountId = String(run?.account_id || run?.accountId || "").trim();
      const current = await sessionStore.manifest(sessionId, { accountId });
      // A user rename while Pi was running always wins over the delayed
      // private summary.
      if (!isDefaultSessionTitle(current.title)) return { applied: false, title: current.title };
      const updated = await sessionStore.update(sessionId, { accountId, title });
      return { applied: true, title: updated.title };
    },
    onCandidateFinal: async ({ run, candidate, context }) => {
      await appendTrace(run, "agent.final.accepted", {
        text: String(candidate?.text || ""),
        usage: candidate?.usage,
        stop_reason: candidate?.stop_reason,
      }, "ok");
      void context;
      // Pi owns the business decision and final wording. This callback only
      // acknowledges the protocol; it never runs a corrective model call.
      return { publish_text: String(candidate?.text || "") };
    },
  };
  const effectiveLocalHandlers = { ...builtInLocalHandlers, ...(localHandlers || {}) };
  host = new VibeAgentHost({ localHandlers: effectiveLocalHandlers, maxActiveRuns, runStore });
  // Main owns the single runtime bootstrap exchange. Renderer contributes
  // only the current prompt/history and Provider choice; prompt policy, tools,
  // options and the Provider credential arrive together from the server.
  const fetchRunSnapshot = async (run, context, providerId = "", { resume = false } = {}) => {
    const runId = String(run.run_id || run.runId || "").trim();
    if (!runId) throw new Error("vibe_agent_run_invalid");
    const accountId = String(run.account_id || run.accountId || "").trim();
    if (accountBinding.isReleasing(accountId)) throw new Error("vibe_agent_account_releasing");
    const controller = new AbortController();
    const request = { accountId, controller };
    runtimeSnapshotRequests.set(runId, request);
    try {
      const snapshot = await fetchRuntimeSnapshot({
        baseUrl: context.baseUrl,
        authToken: context.authToken,
        isDevelopment,
        run,
        providerId,
        identity: host.identity(),
        fetchImpl: (url, init = {}) => globalThis.fetch(url, {
          ...init,
          signal: init.signal
            ? AbortSignal.any([init.signal, controller.signal])
            : controller.signal,
        }),
      });
      if (String(context.accountId || "") !== accountId
        || String(snapshot.account_id || "") !== accountId) {
        throw new Error("vibe_agent_local_account_drift");
      }
      accountBinding.bind(snapshot.account_id);
      if (String(snapshot.project_id || "") !== String(run.project_id || run.projectId || run.project || "")) {
        throw new Error("vibe_agent_local_project_drift");
      }
      const binding = snapshot.agent_binding;
      const bindingToken = String(binding?.token || "").trim();
      if (!bindingToken) throw new Error("vibe_agent_runtime_snapshot_binding_invalid");
      // The bearer remains in Main memory and is never sent to the child.
      runBindings.set(runId, structuredClone(binding));
      return snapshot;
    } finally {
      if (runtimeSnapshotRequests.get(runId) === request) runtimeSnapshotRequests.delete(runId);
    }
  };
  const injectLocalStartPayload = async (candidate, sender) => {
    const start = candidate?.start_payload;
    if (!start || typeof start !== "object" || Array.isArray(start)) throw new Error("vibe_agent_local_start_payload_missing");
    const run = candidate.run;
    const context = validContext({
      ...(candidate.local_context || {}),
    });
    if (!context.authToken || !context.baseUrl) throw new Error("vibe_agent_runtime_snapshot_auth_missing");
    const dynamicKeys = new Set(["execution_mode", "prompt", "user_text"]);
    if (!candidate?.resume && Object.keys(start).some((key) => !dynamicKeys.has(key))) {
      throw new Error("vibe_agent_local_start_renderer_field_forbidden");
    }
    const dynamic = Object.fromEntries(Object.entries(start).filter(([key]) => dynamicKeys.has(key)));
    const requestedLocalRefs = candidate?.local_file_refs;
    const selectedLocalFiles = candidate?.resume
      ? null
      : requestedLocalRefs === undefined
        ? []
        : await localFileRefs.resolve(requestedLocalRefs, context.accountId);
    const providerId = String(candidate?.provider_id ?? "").trim();
    if ((candidate?._runtime_snapshot || candidate?._pi_resume) && !candidate?.resume) {
      throw new Error("vibe_agent_local_start_renderer_field_forbidden");
    }
    const snapshot = candidate?._runtime_snapshot
      || await fetchRunSnapshot(run, context, providerId, { resume: Boolean(candidate?.resume) });
    const priorDescriptor = candidate?.resume
      ? await runStore.get(String(run.run_id || ""), { accountId: snapshot.account_id })
      : null;
    if (candidate?.resume) {
      const frozenProvider = priorDescriptor?.start_payload?.provider || {};
      if (!priorDescriptor || String(frozenProvider.id || "") !== String(snapshot.provider.id || "")
        || String(frozenProvider.model || "") !== String(snapshot.provider.model || "")
        || ["base_url", "proxy_url", "api"].some((key) => (
          frozenProvider[key] !== undefined
          && String(frozenProvider[key] || "") !== String(snapshot.provider[key] || "")
        ))) {
        throw new Error("provider_config_drift");
      }
    }
    const sessionManifest = await sessionStore.update(String(run.session_id || ""), {
      accountId: snapshot.account_id,
      providerId: snapshot.provider.id,
    });
    const sessionProjectId = String(sessionManifest?.project_id || "").trim();
    if (sessionProjectId && sessionProjectId !== String(run.project_id || "").trim()) {
      throw new Error("vibe_agent_session_project_drift");
    }
    const piSession = await sessionStore.piSession(String(run.session_id || ""), {
      accountId: snapshot.account_id,
    });
    if (candidate?.resume && piSession.mode !== "open") {
      throw new Error("vibe_agent_pi_session_missing");
    }
    const bootstrapHistory = piSession.mode === "create"
      ? await sessionStore.history(String(run.session_id || ""), { accountId: snapshot.account_id })
      : [];
    const bootstrapSequence = Math.max(0, Number(sessionManifest.next_sequence || 1) - 1);
    const piResume = candidate?.resume ? candidate?._pi_resume : null;
    if (candidate?.resume && (!piResume || typeof piResume !== "object" || Array.isArray(piResume)
      || !Array.isArray(piResume.messages) || !piResume.messages.length
      || typeof piResume.resume_key !== "string" || !piResume.resume_key.trim())) {
      throw new Error("vibe_agent_pi_session_resume_invalid");
    }
    const inheritedTitleRequest = candidate?.resume && start?.options?.generate_session_title === true;
    const generateSessionTitle = isDefaultSessionTitle(sessionManifest.title)
      && (inheritedTitleRequest || (!candidate?.resume && bootstrapSequence === 0));
    const frozenStart = priorDescriptor?.start_payload && typeof priorDescriptor.start_payload === "object"
      ? priorDescriptor.start_payload : null;
    if (candidate?.resume && (!frozenStart
      || !Array.isArray(frozenStart.tools)
      || !frozenStart.skill
      || typeof frozenStart.skill !== "object"
      || Array.isArray(frozenStart.skill))) {
      // A cold continuation must use the exact Skill/tool ABI that created
      // the waiting card.  If an old/corrupt descriptor cannot provide it,
      // fail closed instead of silently switching to today's snapshot.
      throw new Error("vibe_agent_frozen_descriptor_incomplete");
    }
    if (candidate?.resume && Array.isArray(frozenStart?.local_files)) {
      for (const file of frozenStart.local_files) {
        if (!file || typeof file !== "object" || Array.isArray(file)
          || typeof file.absolute_path !== "string"
          || !Number.isSafeInteger(file.size) || !Number.isSafeInteger(file.last_modified)
          || !Number.isSafeInteger(file.dev) || !Number.isSafeInteger(file.ino)) {
          throw new Error("vibe_agent_local_file_ref_invalid");
        }
        let current;
        try { current = await fs.stat(file.absolute_path); }
        catch { throw new Error("vibe_agent_local_file_changed"); }
        if (!current.isFile() || Number(current.dev) !== file.dev || Number(current.ino) !== file.ino
          || Number(current.size) !== file.size
          || Math.trunc(current.mtimeMs) !== file.last_modified) {
          throw new Error("vibe_agent_local_file_changed");
        }
      }
    }
    const localFiles = candidate?.resume
      ? (Array.isArray(frozenStart?.local_files) ? structuredClone(frozenStart.local_files) : [])
      : selectedLocalFiles;
    // Trace metadata distinguishes a native file reference from a prompt with
    // No local copy is created or persisted; Pi receives native file refs.
    run.attachment_transport = localFiles.length ? "electron_local_file_ref" : "none";
    let systemPrompt = candidate?.resume ? String(frozenStart?.system_prompt || "") : snapshot.system_prompt.trim();
    let tools = candidate?.resume && Array.isArray(frozenStart?.tools)
      ? structuredClone(frozenStart.tools) : snapshot.tools;
    const baseOptions = candidate?.resume && frozenStart?.options && typeof frozenStart.options === "object"
      ? structuredClone(frozenStart.options) : structuredClone(snapshot.options);
    delete baseOptions.budget;
    const frozenSkill = candidate?.resume ? frozenStart.skill : snapshot.skill;
    const skill = frozenSkill ? await skillCache.put(frozenSkill) : null;
    if (!candidate?.resume && !skill) throw new Error("vibe_agent_skill_required");
    if (!systemPrompt || !Array.isArray(tools)) throw new Error("vibe_agent_run_descriptor_policy_missing");
    const binding = snapshot.agent_binding;
    if (!binding || typeof binding !== "object" || Array.isArray(binding)
      || !String(binding.token || "").trim()) {
      throw new Error("vibe_agent_runtime_snapshot_binding_invalid");
    }
    const bindingRunId = String(run.run_id || run.runId || "").trim();
    if (!bindingRunId) throw new Error("vibe_agent_run_invalid");
    const knownBinding = runBindings.get(bindingRunId);
    if (knownBinding && String(knownBinding.token || "") !== String(binding.token || "")) {
      throw new Error("vibe_agent_runtime_snapshot_binding_drift");
    }
    if (!knownBinding) runBindings.set(bindingRunId, structuredClone(binding));
    run.account_id = snapshot.account_id;
    run.provider_mode = "direct";
    await appendTrace(run, "provider.snapshot.acquired", {
      mode: "direct",
      provider_id: snapshot.provider.id,
      model: snapshot.provider.model,
      ...(skill ? {
        skill_name: skill.name,
        skill_version: skill.version,
        skill_sha256: skill.sha256,
      } : {}),
    });
    void sender;
    return {
      ...candidate,
      start_payload: {
        ...dynamic,
        execution_mode: "local",
        system_prompt: systemPrompt,
        tools,
        pi_session: {
          ...piSession,
          ...(piSession.mode === "create" ? {
            bootstrap_messages: bootstrapHistory,
            bootstrap_sequence: bootstrapSequence,
          } : {}),
          ...(piResume ? {
            resume_messages: piResume.messages,
            resume_key: piResume.resume_key,
          } : {}),
        },
        ...(localFiles?.length ? { local_files: localFiles } : {}),
        ...(skill ? { skill } : {}),
        provider: snapshot.provider,
        options: {
          ...baseOptions,
          session_id: String(run.session_id || ""),
          payload_capture: localTracePayloadCapture,
          max_retries: 0,
          generate_session_title: generateSessionTitle,
        },
      },
    };
  };
  const recoveryResponse = (value) => {
    if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("vibe_agent_response_invalid");
    // Pending identity is carried alongside the response so cold recovery can
    // bind it before stripping transport-only fields from the child payload.
    const allowed = new Set(["action", "clarification_response", "confirmation_id", "interaction_id"]);
    if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error("vibe_agent_response_unknown_field");
    if (value.action !== undefined && value.action !== null && typeof value.action !== "string") {
      throw new Error("vibe_agent_response_action_invalid");
    }
    if (value.confirmation_id !== undefined && value.confirmation_id !== null && typeof value.confirmation_id !== "string") {
      throw new Error("vibe_agent_response_identity_invalid");
    }
    if (value.interaction_id !== undefined && value.interaction_id !== null && typeof value.interaction_id !== "string") {
      throw new Error("vibe_agent_response_identity_invalid");
    }
    const action = String(value.action || "").trim();
    if (action) {
      if (value.clarification_response !== undefined) throw new Error("vibe_agent_response_ambiguous");
      if (!new Set(["apply", "cancel", "stop_all"]).has(action)) throw new Error("vibe_agent_response_action_invalid");
      return { action };
    }
    const clarification = value.clarification_response;
    if (!clarification || typeof clarification !== "object" || Array.isArray(clarification)) throw new Error("vibe_agent_clarification_response_invalid");
    if (clarification.type === "option") {
      if (typeof clarification.option_id !== "string") throw new Error("vibe_agent_clarification_response_invalid");
      const optionId = clarification.option_id.trim();
      if (!optionId || Object.keys(clarification).some((key) => !new Set(["type", "option_id"]).has(key))) throw new Error("vibe_agent_clarification_response_invalid");
      return { clarification_response: { type: "option", option_id: optionId } };
    }
    if (clarification.type === "input") {
      if (typeof clarification.text !== "string") throw new Error("vibe_agent_clarification_response_invalid");
      const text = clarification.text;
      if (!text.trim() || text.length > 2_000_000
        || [...text].some((character) => {
          const point = character.codePointAt(0) || 0;
          return point === 0x7f || (point < 0x20
            && !["\n", "\r", "\t"].includes(character));
        })
        || Object.keys(clarification).some((key) => !new Set(["type", "text"]).has(key))) throw new Error("vibe_agent_clarification_response_invalid");
      return { clarification_response: { type: "input", text } };
    }
    throw new Error("vibe_agent_clarification_response_invalid");
  };
  const responseSignature = (value) => JSON.stringify({
    action: value?.action || "",
    clarification_response: value?.clarification_response || null,
  });
  const recoverLocalUnsafe = async (payload, sender) => {
    await runReconcilePromise;
    const runId = String(payload?.run_id ?? payload?.runId ?? "").trim();
    if (!runId) throw new Error("vibe_agent_run_descriptor_id_invalid");
    const requestedAccount = String(payload?.account_id ?? payload?.accountId ?? "").trim();
    if (!requestedAccount) throw new Error("vibe_agent_recovery_identity_required");
    const descriptor = await runStore.get(runId, { accountId: requestedAccount });
    if (!descriptor) throw new Error("vibe_agent_run_descriptor_not_found");
    // If Main never actually restarted and the child is still alive, route
    // through the normal Host response path. Resolving the business tool here
    // first would otherwise submit the same confirmation twice.
    try {
      const live = host.status({ runId, accountId: requestedAccount });
      if (live) {
        const pendingId = String(payload?.response?.confirmation_id || payload?.response?.interaction_id || "").trim();
        if (!pendingId) throw new Error("vibe_agent_response_identity_invalid");
        return host.respond({ runId, pendingId, response: payload.response });
      }
    } catch (error) {
      if (String(error?.message || "") !== "vibe_agent_run_not_found") throw error;
    }
    const requestedProject = String(payload?.project_id ?? payload?.projectId ?? "").trim();
    const requestedSession = String(payload?.session_id ?? payload?.sessionId ?? "").trim();
    const descriptorProject = String(descriptor?.run?.project_id || "").trim();
    const descriptorSession = String(descriptor?.run?.session_id || "").trim();
    const descriptorAccount = String(descriptor?.run?.account_id || "").trim();
    if (!requestedProject || !requestedSession) throw new Error("vibe_agent_recovery_identity_required");
    if (requestedProject && descriptorProject && requestedProject !== descriptorProject) {
      throw new Error("vibe_agent_run_project_drift");
    }
    if (requestedSession && descriptorSession && requestedSession !== descriptorSession) {
      throw new Error("vibe_agent_run_session_drift");
    }
    if (requestedAccount !== descriptorAccount) throw new Error("vibe_agent_run_account_drift");
    if (!new Set(["waiting_user", "resume_ready"]).has(String(descriptor.phase || ""))) {
      throw new Error("vibe_agent_run_not_recoverable");
    }
    const suppliedContext = payload?.local_context ?? {};
    const descriptorContext = descriptor.local_context && typeof descriptor.local_context === "object" ? descriptor.local_context : {};
    const context = validContext({
      ...descriptorContext,
      ...(suppliedContext || {}),
      account_id: descriptorAccount,
      // The original request is part of the frozen Goal. A recovery caller
      // may refresh auth/endpoints, but cannot silently change the query used
      // as the Knowledge router's default.
      request_text: String(descriptorContext.request_text || ""),
    });
    const pending = descriptor.pending;
    if (!pending || typeof pending !== "object") throw new Error("vibe_agent_run_descriptor_pending_missing");
    const rawResponse = payload?.response;
    const expectedPendingId = String(pending.confirmation_id || pending.interaction_id || "").trim();
    const suppliedPendingId = String(rawResponse?.confirmation_id || rawResponse?.interaction_id || "").trim();
    if (suppliedPendingId && suppliedPendingId !== expectedPendingId) {
      throw new Error("vibe_agent_response_pending_drift");
    }
    const response = recoveryResponse(rawResponse);
    if (String(pending.kind || "") === "knowledge_confirmation" && !response.action) {
      throw new Error("vibe_agent_confirmation_action_invalid");
    }
    if (String(pending.kind || "") === "clarification" && !response.clarification_response) {
      throw new Error("vibe_agent_clarification_response_invalid");
    }
    if (descriptor.response && responseSignature(descriptor.response) !== responseSignature(response)) {
      throw new Error("vibe_agent_response_replay_mismatch");
    }
    const run = descriptor.run;
    const basePayload = descriptor.start_payload && typeof descriptor.start_payload === "object"
      ? descriptor.start_payload : {};
    // Acquire the fresh signed binding before resolving the pending business
    // interaction. The same snapshot is passed into injectLocalStartPayload
    // below, so a cold continuation performs one bootstrap exchange only.
    const recoverySnapshot = await fetchRunSnapshot(
      run,
      context,
      String(basePayload.provider?.id || ""),
      { resume: true },
    );
    let outcome = descriptor.resolved_result;
    // Always refresh the per-run router with the recovery caller's current
    // authenticated context.  Even a resume_ready checkpoint may continue
    // with another read after the child restarts; reusing a router that held
    // an expired token would otherwise route that call through stale state.
    const recoveryRouter = routerFor(run, context, { refresh: true });
    if (!outcome) {
      await runStore.markResponseInFlight(runId, response);
      recoveryRouter.restorePending(pending, {
        toolCallId: pending.tool_call_id,
        toolName: pending.tool_name,
        result: pending.result,
      });
      try {
        outcome = await effectiveLocalHandlers.onInteractionResponse({ run, request: pending, response, context });
        if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) throw new Error("vibe_agent_local_interaction_result_invalid");
        await runStore.markResumeReady(runId, response, outcome);
      } catch (error) {
        await runStore.markWaiting(runId, pending, { runtime_lost: true }).catch(() => undefined);
        throw error;
      }
    }
    // Reassert the two journal entries idempotently. This covers a crash after
    // the business response was known but before one of the local append
    // operations reached disk; it never invokes the Knowledge operation again.
    const resolvedCallId = String(pending.tool_call_id || "").trim();
    if (resolvedCallId) {
      await appendLocalSessionEvent(
        run,
        "tool",
        localToolContentText(outcome?.result?.content ?? outcome?.result ?? outcome),
        {
          local_event_key: `interaction-result:${runId}:${resolvedCallId}`,
          tool_call_id: resolvedCallId,
          name: String(pending.tool_name || ""),
          is_error: Boolean(outcome?.result?.is_error),
          details: outcome?.result?.details,
          tool_result: outcome?.result,
        },
      );
    }
    const responseText = localResponseText(pending, response);
    if (responseText) {
      await appendLocalSessionEvent(run, "user", responseText, {
        local_event_key: localResponseEventKey(expectedPendingId, response),
        interaction_id: pending.interaction_id,
        ...(pending.confirmation_id ? { confirmation_id: pending.confirmation_id } : {}),
        interaction_response: response,
      });
    }
    if (response.action === "stop_all" || outcome?.result?.terminate) {
      // `stop_all` is a user terminal decision. Do not cold-start a child just
      // to ask Pi for another answer; that would violate the original stop
      // semantics and could trigger a new Provider call.
      await runStore.markTerminal(runId, "cancelled", "user_stop_all").catch(() => undefined);
      await appendLocalCancellationReceipt(run, {
        reason: "user_stop_all",
        terminalStatus: "cancelled",
      }).catch(() => undefined);
      await finishTrace(run, context, "cancelled", { code: "user_stop_all", recovery: "cold" }).catch(() => undefined);
      host.emitTo(sender, {
        schema: "vibe_agent_event.v1",
        runId,
        turnId: run.turn_id,
        sessionId: run.session_id,
        type: "terminal",
        state: "cancelled",
      });
      return { accepted: true, stopped: true, runId };
    }
    if (!resolvedCallId || !outcome?.result || typeof outcome.result !== "object"
      || Array.isArray(outcome.result) || outcome.result.content === undefined) {
      throw new Error("vibe_agent_run_descriptor_tool_result_missing");
    }
    const recoveryMessages = [{
      role: "tool",
      content: outcome.result.content,
      tool_call_id: resolvedCallId,
      name: String(pending.tool_name || ""),
      ...(outcome.result.details === undefined ? {} : { details: outcome.result.details }),
      ...(outcome.result.usage === undefined ? {} : { usage: outcome.result.usage }),
      is_error: Boolean(outcome.result.is_error),
    }];
    const resumeContext = localContextPayload(context);
    const candidate = {
      run,
      resume: true,
      provider_id: basePayload.provider?.id,
      start_payload: {
        ...basePayload,
        execution_mode: "local",
        prompt: responseText,
      },
      local_context: resumeContext,
      _runtime_snapshot: recoverySnapshot,
      _pi_resume: {
        messages: recoveryMessages,
        resume_key: `${runId}:${resolvedCallId}:${responseSignature(response)}`,
      },
    };
    const reservation = await host.reserveLocal({
      runId,
      turnId: run.turn_id,
      sessionId: run.session_id,
      projectId: run.project_id,
      accountId: run.account_id,
      resume: true,
    }, sender);
    try {
      const enriched = await injectLocalStartPayload(candidate, sender);
      await host.bindLocalReservation({
        runId,
        reservationId: reservation.reservationId,
        accountId: enriched.run?.account_id,
        sessionId: enriched.run?.session_id,
      });
      return await host.startLocal(
        { ...enriched, resume: true, local_context: resumeContext },
        sender,
        { reservationId: reservation.reservationId },
      );
    } catch (error) {
      // Keep the already-resolved business result replayable if child startup
      // fails after a confirmation was accepted.
      await runStore.markResumeReady(runId, response, outcome).catch(() => undefined);
      throw error;
    } finally {
      host.releaseLocalReservation(runId, reservation.reservationId);
    }
  };
  // A confirmation card can be clicked from two renderer windows while a
  // reload is settling. Serialize recovery per logical run so only one
  // snapshot exchange and one child are ever created.
  const recoveryInFlight = new Map();
  const recoverLocal = (payload, sender) => {
    const runId = String(payload?.run_id ?? payload?.runId ?? "").trim();
    if (!runId) return recoverLocalUnsafe(payload, sender);
    const existing = recoveryInFlight.get(runId);
    if (existing) {
      if (existing.signature !== responseSignature(payload?.response)) {
        return Promise.reject(new Error("vibe_agent_response_replay_mismatch"));
      }
      return existing.promise;
    }
    const accountId = String(payload?.accountId ?? payload?.account_id ?? "").trim();
    const task = Promise.resolve()
      .then(() => recoverLocalUnsafe(payload, sender))
      .finally(() => {
        if (recoveryInFlight.get(runId)?.promise === task) recoveryInFlight.delete(runId);
      });
    recoveryInFlight.set(runId, {
      promise: task,
      signature: responseSignature(payload?.response),
      accountId,
    });
    return task;
  };
  const register = (channel, handler) => {
    ipcMain.handle(channel, async (event, payload = {}) => {
      const sender = requireManagedSender(event, windowManager);
      return await handler(payload, sender);
    });
  };
  const localStartInFlight = new Map();
  let accountLogoutInFlight = null;
  register("vibeAgent:logout", async (payload) => {
    const supplied = payload?.accountId ?? payload?.account_id;
    const requestedAccountId = supplied === undefined || supplied === null || supplied === ""
      ? ""
      : normalizeBoundAccountId(supplied, "vibe_agent_logout_account_required");
    const boundAccountId = accountBinding.get();
    if (boundAccountId && requestedAccountId && boundAccountId !== requestedAccountId) {
      throw new Error("vibe_agent_account_drift");
    }
    const accountId = boundAccountId || requestedAccountId;
    if (!accountId) {
      return {
        schema: "vibe_agent_logout.v1",
        account_id: "",
        terminated_runs: 0,
        released_reservations: 0,
        terminated_parked_runs: 0,
        released: true,
      };
    }
    if (accountLogoutInFlight) {
      if (accountLogoutInFlight.accountId !== accountId) {
        throw new Error("vibe_agent_account_binding_conflict");
      }
      return accountLogoutInFlight.promise;
    }
    accountBinding.beginRelease(accountId);
    accountContextEpoch += 1;
    const task = (async () => {
      const before = await runStore.list({ accountId, includeTerminal: false }).catch(() => []);
      for (const request of runtimeSnapshotRequests.values()) {
        if (request.accountId === accountId) request.controller.abort();
      }
      const pendingTasks = [
        ...[...localStartInFlight.values()]
          .filter((entry) => entry.accountId === accountId)
          .map((entry) => entry.promise),
        ...[...recoveryInFlight.values()]
          .filter((entry) => entry.accountId === accountId)
          .map((entry) => entry.promise),
      ];
      const first = await host.terminateAccount(accountId, { reason: "account_logout" });
      await Promise.allSettled(pendingTasks);
      const second = await host.terminateAccount(accountId, { reason: "account_logout" });
      const after = await runStore.list({ accountId, includeTerminal: false }).catch(() => []);
      const descriptors = new Map(
        [...before, ...after]
          .filter((descriptor) => descriptor?.run_id)
          .map((descriptor) => [String(descriptor.run_id), descriptor]),
      );
      const liveRuns = new Map(
        [...(first.runs || []), ...(second.runs || [])]
          .filter((run) => run?.run_id)
          .map((run) => [String(run.run_id), run]),
      );
      for (const descriptor of descriptors.values()) {
        const pending = descriptor.pending;
        if (pending && typeof pending === "object") {
          const pendingId = String(pending.confirmation_id || pending.interaction_id || "");
          if (pendingId) {
            await appendLocalSessionEvent(descriptor.run, "user", "本轮已因退出登录取消", {
              local_event_key: `response:${pendingId}:account_logout`,
              interaction_id: pending.interaction_id,
              ...(pending.confirmation_id ? { confirmation_id: pending.confirmation_id } : {}),
              interaction_response: { action: "stop_all", reason: "account_logout" },
            }).catch(() => undefined);
          }
        }
        await runStore.markTerminal(descriptor.run_id, "aborted", "account_logout").catch(() => undefined);
        await appendLocalCancellationReceipt(descriptor.run, {
          reason: "account_logout",
          terminalStatus: "aborted",
        }).catch(() => undefined);
        await finishTrace(
          descriptor.run,
          descriptor.local_context || { account_id: accountId },
          "aborted",
          { code: "account_logout" },
        ).catch(() => undefined);
      }
      for (const run of liveRuns.values()) {
        if (descriptors.has(String(run.run_id))) continue;
        await appendLocalCancellationReceipt(run, {
          reason: "account_logout",
          terminalStatus: "aborted",
        }).catch(() => undefined);
      }
      return {
        schema: "vibe_agent_logout.v1",
        account_id: accountId,
        terminated_runs: new Set([
          ...(first.runIds || []),
          ...(second.runIds || []),
          ...descriptors.keys(),
        ]).size,
        released_reservations: new Set([
          ...(first.reservationRunIds || []),
          ...(second.reservationRunIds || []),
        ]).size,
        terminated_parked_runs: [...descriptors.values()]
          .filter((descriptor) => new Set(["waiting_user", "resume_ready"])
            .has(String(descriptor.phase || ""))).length,
        released: true,
      };
    })();
    let operation;
    operation = (async () => {
      try {
        return await task;
      } finally {
        for (const request of runtimeSnapshotRequests.values()) request.controller.abort();
        for (const router of routers.values()) router?.pending?.clear?.();
        routers.clear();
        runBindings.clear();
        traces.clear();
        assistantStreams.clear();
        localUserCancelRequests.clear();
        recoveryInFlight.clear();
        localStartInFlight.clear();
        runtimeSnapshotRequests.clear();
        knowledgeCache.inflight?.clear?.();
        traceSubscribers.clear();
        localFileRefs = new LocalFileRefs();
        const uploadQueue = traceUploadQueue;
        traceUploadQueue = createTraceUploadQueue();
        await uploadQueue.close().catch(() => undefined);
        try {
          accountBinding.release(accountId);
        } finally {
          host.finishAccountTermination(accountId);
          if (accountLogoutInFlight?.promise === operation) accountLogoutInFlight = null;
        }
      }
    })();
    accountLogoutInFlight = { accountId, promise: operation };
    return await operation;
  });
  register("vibeAgent:readinessCheck", async () => readinessPromise);
  register("vibeAgent:readinessExport", async (_payload, sender) => {
    const report = await readinessPromise;
    const choice = await dialog.showSaveDialog(BrowserWindow.fromWebContents(sender), {
      title: "导出 Electron Agent 启动自检结果",
      defaultPath: path.join(app.getPath("documents"), "electron_agent_readiness.json"),
      filters: [{ name: "JSON", extensions: ["json"] }],
    });
    if (choice.canceled || !choice.filePath) return { canceled: true, report };
    await fs.writeFile(choice.filePath, `${JSON.stringify(report, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
    return { canceled: false, filePath: choice.filePath, report };
  });
  register("vibeAgent:startLocal", async (payload, sender) => {
    await runReconcilePromise;
    if (payload?.resume === true) throw new Error("vibe_agent_resume_internal_only");
    const runId = String(payload?.run?.run_id ?? "").trim();
    if (!runId) throw new Error("vibe_agent_run_invalid");
    const requestedAccountId = accountForLocalOperation(
      normalizeBoundAccountId(
        payload?.run?.account_id,
        "vibe_agent_run_account_required",
      ),
    );
    try {
      return host.attach({ runId, accountId: requestedAccountId }, sender);
    } catch (error) {
      if (String(error?.message || "") !== "vibe_agent_run_not_found") throw error;
    }
    const active = localStartInFlight.get(runId);
    if (active) {
      if (active.accountId !== requestedAccountId) throw new Error("vibe_agent_run_account_drift");
      await active.promise;
      return host.attach({ runId, accountId: requestedAccountId }, sender);
    }
    const task = (async () => {
      const requestedRun = payload?.run || {};
      const reservation = await host.reserveLocal({
        runId,
        turnId: requestedRun.turn_id,
        sessionId: requestedRun.session_id,
        projectId: requestedRun.project_id ?? requestedRun.project,
        accountId: requestedRun.account_id,
      }, sender);
      const candidate = payload?.start_payload;
      try {
        const suppliedKey = candidate?.provider?.api_key ?? candidate?.provider?.apiKey;
        if (suppliedKey !== undefined) throw new Error("vibe_agent_local_provider_key_renderer_forbidden");
        const enriched = await injectLocalStartPayload(payload, sender);
        if (!enriched || typeof enriched !== "object" || Array.isArray(enriched)) {
          throw new Error("vibe_agent_local_start_payload_invalid");
        }
        const injectedProvider = enriched.start_payload?.provider;
        if (String(injectedProvider?.mode || "") !== "direct") throw new Error("vibe_agent_provider_mode_invalid");
        const context = {
          ...(payload?.local_context ?? {}),
          ...(enriched?.local_context ?? {}),
        };
        validContext(context);
        const run = enriched.run || enriched;
        await host.bindLocalReservation({
          runId,
          reservationId: reservation.reservationId,
          accountId: run.account_id,
          sessionId: run.session_id,
        });
        const traceId = traceIdFor(run);
        if (traceId) await ensureTrace(run);
        try {
          return await host.startLocal(
            { ...enriched, local_context: context },
            sender,
            { reservationId: reservation.reservationId },
          );
        } catch (error) {
          if (traceId) {
            const code = String(error?.code || error?.message || "vibe_agent_start_failed")
              .replace(/[^A-Za-z0-9_:-]/g, "_").slice(0, 160);
            await finishTrace(run, context, "failed", { code }).catch(() => undefined);
          }
          throw error;
        }
      } finally {
        host.releaseLocalReservation(runId, reservation.reservationId);
      }
    })();
    localStartInFlight.set(runId, { promise: task, accountId: requestedAccountId });
    try {
      return await task;
    } finally {
      if (localStartInFlight.get(runId)?.promise === task) localStartInFlight.delete(runId);
    }
  });
  const localRunAccount = (payload = {}) => {
    const runId = String(payload?.runId ?? payload?.run_id ?? "").trim();
    if (!runId) return false;
    try {
      return String(host.status({ runId }).executionMode || "") === "local";
    } catch {
      return false;
    }
  };
  register("vibeAgent:attach", async (payload, sender) => {
    const accountId = payloadAccountId(payload);
    if (localRunAccount(payload)) accountForLocalOperation(accountId);
    return host.attach({ ...payload, accountId }, sender);
  });
  register("vibeAgent:respond", async (payload) => {
    const accountId = payloadAccountId(payload);
    if (localRunAccount(payload)) accountForLocalOperation(accountId);
    return host.respond({ ...payload, accountId });
  });
  register("vibeAgent:recoverableLocal", async (payload) => {
    await runReconcilePromise;
    const accountId = accountForLocalOperation(payloadAccountId(payload));
    return runStore.list({ accountId, recoverableOnly: true, includeTerminal: false });
  });
  register("vibeAgent:recoverLocal", async (payload, sender) => {
    const accountId = accountForLocalOperation(payloadAccountId(payload));
    return recoverLocal({ ...payload, accountId }, sender);
  });
  register("vibeAgent:cancel", async (payload, sender) => {
    await runReconcilePromise;
    const runId = String(payload?.runId ?? payload?.run_id ?? "").trim();
    const accountId = accountForLocalOperation(payloadAccountId(payload, "vibe_agent_cancel_identity_drift"), "vibe_agent_cancel_identity_drift");
    if (!runId) throw new Error("vibe_agent_cancel_identity_drift");
    const descriptorIdentity = await runStore.get(runId, { accountId });
    if (!descriptorIdentity) throw new Error("vibe_agent_run_descriptor_not_found");
    try {
      const liveStatus = host.status({ runId, accountId });
      const pending = liveStatus?.pending_interaction || liveStatus?.pendingInteraction;
      if (pending && typeof pending === "object") {
        const pendingId = String(pending.confirmation_id || pending.interaction_id || "");
        if (pendingId) {
          await appendLocalSessionEvent(
            { ...liveStatus, execution_mode: "local" },
            "user",
            "本轮已取消",
            {
              local_event_key: `response:${pendingId}:cancelled`,
              interaction_id: pending.interaction_id,
              ...(pending.confirmation_id ? { confirmation_id: pending.confirmation_id } : {}),
              interaction_response: { action: "stop_all", reason: "user_cancelled" },
            },
          );
        }
      }
      // Mark the explicit user intent before asking Host to abort.  The child
      // reports `aborted` (rather than `cancelled`) for this live path; the
      // marker lets the `done` observer attach the receipt without treating a
      // crash or app shutdown as a user cancellation.
      localUserCancelRequests.set(runId, "user_cancelled");
      return await host.cancel(payload);
    } catch (error) {
      // A failed live cancel must not leak intent into a later terminal frame.
      if (String(error?.message || "") !== "vibe_agent_run_not_found") {
        localUserCancelRequests.delete(runId);
      }
      // A waiting run may have no child after a crash/release. Cancel its
      // durable checkpoint directly instead of falling through to the server
      // Agent endpoint (which does not own local runs).
      if (String(error?.message || "") !== "vibe_agent_run_not_found") throw error;
      const descriptor = descriptorIdentity;
      if (!descriptor || !["waiting_user", "resume_ready"].includes(String(descriptor.phase || ""))) {
        localUserCancelRequests.delete(runId);
        throw error;
      }
      if (String(payload?.turnId ?? payload?.turn_id ?? "") !== String(descriptor.run?.turn_id || "")
        || String(payload?.sessionId ?? payload?.session_id ?? "") !== String(descriptor.run?.session_id || "")) {
        localUserCancelRequests.delete(runId);
        throw new Error("vibe_agent_cancel_identity_drift");
      }
      await runStore.markTerminal(runId, "cancelled", "user_cancelled");
      const pending = descriptor.pending;
      if (pending && typeof pending === "object") {
        const pendingId = String(pending.confirmation_id || pending.interaction_id || "");
        if (pendingId) {
          await appendLocalSessionEvent(descriptor.run, "user", "本轮已取消", {
            local_event_key: `response:${pendingId}:cancelled`,
            interaction_id: pending.interaction_id,
            ...(pending.confirmation_id ? { confirmation_id: pending.confirmation_id } : {}),
            interaction_response: { action: "stop_all", reason: "user_cancelled" },
          });
        }
      }
      await appendLocalCancellationReceipt(descriptor.run, {
        reason: "user_cancelled",
        terminalStatus: "cancelled",
      }).catch(() => undefined);
      localUserCancelRequests.delete(runId);
      const context = validContext(descriptor.local_context || {});
      await finishTrace(descriptor.run, context, "cancelled", { code: "user_cancelled", recovery: "cold" }).catch(() => undefined);
      host.emitTo(sender, {
        schema: "vibe_agent_event.v1",
        runId,
        turnId: descriptor.run.turn_id,
        sessionId: descriptor.run.session_id,
        type: "terminal",
        state: "cancelled",
      });
      return { accepted: true, runId, cancelled: true };
    }
  });
  register("vibeAgent:status", async (payload) => {
    const accountId = payloadAccountId(payload);
    if (localRunAccount(payload)) accountForLocalOperation(accountId);
    return host.status({ ...payload, accountId });
  });
  register("vibeAgent:list", async (payload) => {
    const accountId = payloadAccountId(payload);
    // Before the first authenticated local bootstrap, retain the existing
    // first-run session/list flow.  Once bound, a different account is
    // rejected before any local descriptor is read.
    accountForLocalOperation(accountId);
    return host.list({ accountId });
  });
  register("vibeAgent:localFilePick", async (_payload, sender) => {
    const requestEpoch = accountContextEpoch;
    const requestedAccount = accountForLocalOperation(
      payloadAccountId(_payload, "vibe_agent_local_file_account_required"),
      "vibe_agent_local_file_account_required",
    );
    const browserWindow = BrowserWindow.fromWebContents(sender);
    const result = await dialog.showOpenDialog(browserWindow && !browserWindow.isDestroyed() ? browserWindow : undefined, {
      title: "选择本机文件",
      properties: ["openFile", "multiSelections"],
    });
    if (result.canceled || !result.filePaths?.length) {
      return { schema: "vibe_agent_local_file_selection.v1", canceled: true, files: [] };
    }
    if (requestEpoch !== accountContextEpoch) throw new Error("vibe_agent_account_context_changed");
    accountForLocalOperation(requestedAccount, "vibe_agent_local_file_account_required");
    return localFileRefs.admit(result.filePaths, requestedAccount);
  });
  register("vibeAgent:localFilePreview", async (payload) => {
    const requestEpoch = accountContextEpoch;
    const accountId = accountForLocalOperation(payloadAccountId(payload, "vibe_agent_local_file_account_required"), "vibe_agent_local_file_account_required");
    const result = await localFileRefs.preview(
      payload?.refId ?? payload?.ref_id,
      accountId,
    );
    if (requestEpoch !== accountContextEpoch) throw new Error("vibe_agent_account_context_changed");
    accountForLocalOperation(accountId, "vibe_agent_local_file_account_required");
    return result;
  });
  const accountBoundPayload = (payload = {}) => {
    const accountId = accountForLocalOperation(payloadAccountId(payload));
    return { ...payload, accountId };
  };
  const rendererTraceUploadPayload = (payload = {}) => {
    const bound = accountBoundPayload(payload);
    // A renderer may request an upload, but it cannot supply or override the
    // bootstrap bearer. Terminal handlers inject the trusted token directly;
    // restart/resume uploads intentionally use the server's upload_id owner
    // path until a fresh run bootstrap is available.
    const {
      bindingToken: _bindingToken,
      agentBinding: _agentBinding,
      ...withoutBinding
    } = bound;
    return withoutBinding;
  };
  register("vibeAgent:traceCreate", async (payload) => traceStore.create(accountBoundPayload(payload)));
  register("vibeAgent:traceAppend", async (payload) => traceStore.append(accountBoundPayload(payload)));
  register("vibeAgent:traceFinish", async (payload) => traceStore.finish(accountBoundPayload(payload)));
  register("vibeAgent:traceList", async (payload) => traceStore.list(accountBoundPayload(payload)));
  register("vibeAgent:traceDetail", async (payload) => traceStore.detail(payload?.traceId ?? payload?.trace_id, accountBoundPayload(payload)));
  register("vibeAgent:tracePayload", async (payload) => traceStore.readPayload(payload?.traceId ?? payload?.trace_id, payload?.payloadRef ?? payload?.payload_ref, accountBoundPayload(payload)));
  register("vibeAgent:traceExport", async (payload) => traceStore.export(payload?.traceId ?? payload?.trace_id, payload?.destinationPath ?? payload?.destination_path, accountBoundPayload(payload)));
  register("vibeAgent:traceRemove", async (payload) => traceStore.remove(payload?.traceId ?? payload?.trace_id, accountBoundPayload(payload)));
  register("vibeAgent:traceUpload", async (payload) => traceUploadQueue.enqueue(payload?.traceId ?? payload?.trace_id, rendererTraceUploadPayload(payload)));
  register("vibeAgent:traceResume", async (payload) => {
    await runReconcilePromise;
    await reconcileTracePromise;
    return traceUploadQueue.resumePending(rendererTraceUploadPayload(payload));
  });
  register("vibeAgent:traceUploadWait", async (payload) => {
    await traceStore.ensure(payload?.traceId ?? payload?.trace_id, accountBoundPayload(payload));
    return traceUploadQueue.wait(payload?.traceId ?? payload?.trace_id);
  });
  register("vibeAgent:traceUploadStatus", async (payload) => {
    await traceStore.ensure(payload?.traceId ?? payload?.trace_id, accountBoundPayload(payload));
    return traceUploadQueue.status(payload?.traceId ?? payload?.trace_id);
  });
  register("vibeAgent:traceSubscribe", async (_payload, sender) => {
    traceSubscribers.add(sender);
    sender.once?.("destroyed", () => traceSubscribers.delete(sender));
    return { subscribed: true };
  });
  register("vibeAgent:sessionCreate", async (payload) => sessionStore.create(accountBoundPayload(payload)));
  register("vibeAgent:sessionManifest", async (payload) => {
    const bound = accountBoundPayload(payload);
    return sessionStore.manifest(payload?.sessionId ?? payload?.session_id, bound);
  });
  register("vibeAgent:sessionList", async (payload) => sessionStore.list(accountBoundPayload(payload)));
  register("vibeAgent:sessionEvents", async (payload) => {
    const bound = accountBoundPayload(payload);
    return sessionStore.events(payload?.sessionId ?? payload?.session_id, bound);
  });
  register("vibeAgent:sessionAppend", async (payload) => {
    const value = payload && typeof payload === "object" && !Array.isArray(payload) ? payload : {};
    const { internal: _rendererInternal, ...publicPayload } = value;
    return sessionStore.append(accountBoundPayload(publicPayload));
  });
  register("vibeAgent:sessionUpdate", async (payload) => {
    const bound = accountBoundPayload(payload);
    return sessionStore.update(payload?.sessionId ?? payload?.session_id, bound);
  });
  register("vibeAgent:sessionTitle", async (payload) => {
    const bound = accountBoundPayload(payload);
    return sessionStore.updateTitle(payload?.sessionId ?? payload?.session_id, payload?.title, bound);
  });
  register("vibeAgent:sessionRemove", async (payload) => {
    const bound = accountBoundPayload(payload);
    return sessionStore.remove(payload?.sessionId ?? payload?.session_id, bound);
  });
  return {
    host,
    async cleanup() {
      await accountLogoutInFlight?.promise?.catch(() => undefined);
      await host.cleanup();
      // Runs whose child already parked at a waiting interaction are no
      // longer present in Host's in-memory map. An intentional app exit still
      // cancels those logical Goals so a later launch does not resurrect a
      // card that the user explicitly closed the application for.
      const parked = await runStore.list({ recoverableOnly: true, includeTerminal: false }).catch(() => []);
      for (const descriptor of parked) {
        await runStore.markTerminal(descriptor.run_id, "aborted", "app_exit").catch(() => undefined);
        const pending = descriptor.pending;
        if (pending && typeof pending === "object") {
          const pendingId = String(pending.confirmation_id || pending.interaction_id || "");
          if (pendingId) {
            await appendLocalSessionEvent(
              descriptor.run,
              "user",
              "本轮已因应用退出取消",
              {
                local_event_key: `response:${pendingId}:app_exit`,
                interaction_id: pending.interaction_id,
                ...(pending.confirmation_id ? { confirmation_id: pending.confirmation_id } : {}),
                interaction_response: { action: "stop_all", reason: "app_exit" },
              },
            );
          }
        }
        await finishTrace(descriptor.run, descriptor.local_context || {}, "aborted", { code: "app_exit" }).catch(() => undefined);
      }
      // Host shutdown may persist one final local user/assistant/interaction
      // event. Drain the session journal only after all children have reached
      // their terminal state.
      await sessionStore.close();
      // Host termination can emit one final local Trace event. Close stores
      // only after all children have been drained.
      // Give terminal traces a short, bounded drain window. If the network is
      // unavailable, TraceUploadQueue persists its chunk cursor and the next
      // explicit upload can resume without delaying app shutdown forever.
      await traceUploadQueue.close({ drainMs: 5_000 });
      await traceStore.close();
      recoveryInFlight.clear();
      localStartInFlight.clear();
      localUserCancelRequests.clear();
      await runStore.close();
      traceSubscribers.clear();
      routers.clear();
      runBindings.clear();
      traces.clear();
      assistantStreams.clear();
      for (const channel of CHANNELS) ipcMain.removeHandler(channel);
    },
  };
}
