import { app } from "electron";
import { spawn } from "node:child_process";
import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";

import {
  MAX_FRAME_BYTES,
  PROTOCOL_VERSION,
  identityOf,
  makeFrame,
  parseInboundLine,
  parseOutboundLine,
} from "./runtime/protocol.mjs";
import { localRunConstants } from "./run/localRunStore.node.js";

const AGENT_CORE_VERSION = "0.84.4";
const PI_AI_VERSION = "0.84.4";
const PI_CODING_AGENT_VERSION = "0.84.4";
const RUN_SCHEMA = "electron_agent_run.v1";
const EVENT_SCHEMA = "vibe_agent_event.v1";
const MAX_ACTIVE_RUNS = 5;
const GRACEFUL_ABORT_MS = 2_000;
const TERMINATE_WAIT_MS = 2_000;

function boundedString(value, name, max = 512, { allowTextControls = false } = {}) {
  const text = String(value ?? "").trim();
  if (!text || text.length > max
    || [...text].some((character) => {
      const code = character.codePointAt(0) || 0;
      return code === 0x7f || (code < 0x20
        && !(allowTextControls && (character === "\n" || character === "\r" || character === "\t")));
    })) throw new Error(`vibe_agent_${name}_invalid`);
  return text;
}

function stableClientIdentity() {
  const file = path.join(app.getPath("userData"), "vibe-agent-client.json");
  try {
    const parsed = JSON.parse(fs.readFileSync(file, "utf8"));
    const id = boundedString(parsed.client_instance_id, "client_instance_id", 128);
    if (!/^[a-zA-Z0-9_-]{16,128}$/.test(id)) throw new Error("invalid");
    return id;
  } catch {
    const id = randomUUID().replaceAll("-", "");
    fs.mkdirSync(path.dirname(file), { recursive: true });
    const temporary = `${file}.${process.pid}.${randomUUID()}.tmp`;
    fs.writeFileSync(temporary, JSON.stringify({
      schema: "vibe_agent_client_identity.v1",
      client_instance_id: id,
    }), { encoding: "utf8", mode: 0o600 });
    fs.renameSync(temporary, file);
    try { fs.chmodSync(file, 0o600); } catch {}
    return id;
  }
}

function runValue(source, snake, camel = snake) {
  return source[snake] ?? source[camel];
}

function sessionOwner(accountId, sessionId) {
  const account = String(accountId || "").trim();
  if (account && !/^[A-Za-z0-9._:-]{1,160}$/.test(account)) throw new Error("vibe_agent_account_id_invalid");
  return {
    accountId: account,
    sessionId: boundedString(sessionId, "session_id", 256),
  };
}

function sameSessionOwner(left, right) {
  if (!left || !right || left.sessionId !== right.sessionId) return false;
  // Older descriptors do not carry account_id. Treat an unknown account as
  // conflicting instead of allowing two Goals to mutate one local journal.
  return !left.accountId || !right.accountId || left.accountId === right.accountId;
}

function lifecycleState(state) {
  const value = String(state || "");
  if (value === "queued" || value === "connecting") return "queued";
  if (value === "waiting_user") return "waiting_user";
  if (["completed", "failed", "aborted", "cancelled", "closed"].includes(value)) return "terminal";
  return "running";
}

function validatedInteractionResponse(pendingId, value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) throw new Error("vibe_agent_response_invalid");
  const allowed = new Set(["interaction_id", "confirmation_id", "action", "clarification_response"]);
  if (Object.keys(value).some((key) => !allowed.has(key))) throw new Error("vibe_agent_response_unknown_field");
  if ((value.interaction_id !== undefined && value.interaction_id !== null && typeof value.interaction_id !== "string")
    || (value.confirmation_id !== undefined && value.confirmation_id !== null && typeof value.confirmation_id !== "string")) {
    throw new Error("vibe_agent_response_identity_invalid");
  }
  const interactionId = String(value.interaction_id ?? "").trim();
  const confirmationId = String(value.confirmation_id ?? "").trim();
  if (Boolean(interactionId) === Boolean(confirmationId)) throw new Error("vibe_agent_response_identity_invalid");
  if ((interactionId || confirmationId) !== pendingId) throw new Error("vibe_agent_response_pending_drift");
  if (confirmationId) {
    if (typeof value.action !== "string") throw new Error("vibe_agent_response_action_invalid");
    const action = value.action.trim();
    if (!new Set(["apply", "cancel", "stop_all"]).has(action)) throw new Error("vibe_agent_response_action_invalid");
    return { confirmation_id: confirmationId, action };
  }
  const reply = value.clarification_response;
  if (!reply || typeof reply !== "object" || Array.isArray(reply)) throw new Error("vibe_agent_clarification_response_invalid");
  if (reply.type === "option") {
    if (typeof reply.option_id !== "string") throw new Error("vibe_agent_clarification_response_invalid");
    const optionId = boundedString(reply.option_id, "option_id", 256);
    if (Object.keys(reply).some((key) => !new Set(["type", "option_id"]).has(key))) throw new Error("vibe_agent_clarification_response_unknown_field");
    return { interaction_id: interactionId, clarification_response: { type: "option", option_id: optionId } };
  }
  if (reply.type === "input") {
    if (typeof reply.text !== "string") throw new Error("vibe_agent_clarification_response_invalid");
    const text = boundedString(reply.text, "response_text", 2_000_000, { allowTextControls: true });
    if (Object.keys(reply).some((key) => !new Set(["type", "text"]).has(key))) throw new Error("vibe_agent_clarification_response_unknown_field");
    return { interaction_id: interactionId, clarification_response: { type: "input", text } };
  }
  throw new Error("vibe_agent_clarification_response_type_invalid");
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

function responseSignature(value) {
  return JSON.stringify({
    action: value?.action || "",
    clarification_response: value?.clarification_response || null,
  });
}

function validateLocalRun(input) {
  const source = input?.run;
  if (!source || typeof source !== "object" || Array.isArray(source)) throw new Error("vibe_agent_run_invalid");
  if (source.schema !== RUN_SCHEMA || source.execution_host !== "electron") throw new Error("vibe_agent_run_schema_invalid");
  if (source.execution_mode !== "local") throw new Error("vibe_agent_local_mode_required");
  const run = {
    schema: RUN_SCHEMA,
    execution_host: "electron",
    execution_mode: "local",
    protocol_version: Number(runValue(source, "protocol_version", "protocolVersion") ?? PROTOCOL_VERSION),
    run_id: boundedString(runValue(source, "run_id", "runId"), "run_id", 256),
    turn_id: boundedString(runValue(source, "turn_id", "turnId"), "turn_id", 256),
    request_id: boundedString(runValue(source, "request_id", "requestId"), "request_id", 256),
    session_id: boundedString(runValue(source, "session_id", "sessionId"), "session_id", 256),
    account_id: String(runValue(source, "account_id", "accountId") ?? "").trim(),
    project_id: boundedString(
      runValue(source, "project_id", "projectId") ?? source.project,
      "project_id",
      256,
    ),
    host_id: boundedString(runValue(source, "host_id", "hostId") ?? "electron-main", "host_id", 256),
    trace_id: source.trace_id ?? source.traceId ?? "",
    goal_id: source.goal_id ?? source.goalId ?? "",
    provider_mode: String(source.provider_mode ?? source.providerMode ?? ""),
  };
  if (run.protocol_version !== PROTOCOL_VERSION) throw new Error("vibe_agent_protocol_version_mismatch");
  if (run.account_id && !/^[A-Za-z0-9._:-]{1,160}$/.test(run.account_id)) {
    throw new Error("vibe_agent_account_id_invalid");
  }
  if (run.provider_mode !== "direct") throw new Error("vibe_agent_provider_mode_invalid");
  for (const [key, label] of [["trace_id", "trace_id"], ["goal_id", "goal_id"]]) {
    if (run[key] !== "" && !/^[A-Za-z0-9._:-]{1,160}$/.test(String(run[key]))) {
      throw new Error(`vibe_agent_${label}_invalid`);
    }
    run[key] = String(run[key] || "");
  }
  const payload = input?.start_payload ?? input?.start ?? input?.payload;
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("vibe_agent_local_start_payload_missing");
  // Reuse the child protocol validator at this trust boundary instead of
  // duplicating the large provider/tool schema here.
  const { serialized } = makeFrame(identityOf({ ...run }), "start", {
    ...payload,
    execution_mode: "local",
  });
  const frame = parseInboundLine(serialized);
  if (frame.payload.operation === "self_check") throw new Error("vibe_agent_self_check_internal_only");
  return { run, payload: frame.payload };
}

export function vibeAgentRuntimePath() {
  const relative = path.join("electron", "vibeAgent", "runtime", "runner.mjs");
  if (app.isPackaged) {
    const unpacked = path.join(process.resourcesPath, "app.asar.unpacked", relative);
    if (fs.existsSync(unpacked)) return unpacked;
  }
  return path.join(app.getAppPath(), relative);
}

export function vibeAgentChildEnvironment() {
  const allowed = {};
  for (const [key, value] of Object.entries(process.env)) {
    const upper = key.toUpperCase();
    if (
      upper === "PATH"
      || [
        "LANG", "LC_ALL", "TZ", "TMPDIR", "TMP", "TEMP", "HOME", "USERPROFILE",
        "SYSTEMROOT", "COMSPEC", "PROGRAMFILES", "PROGRAMFILES(X86)",
        "SSL_CERT_FILE", "SSL_CERT_DIR", "NODE_EXTRA_CA_CERTS",
      ].includes(upper)
    ) allowed[key] = value;
  }
  allowed.ELECTRON_RUN_AS_NODE = "1";
  // The child stderr channel is a fixed error-code protocol. Suppress Node's
  // own deprecation/warning chatter so it cannot be mistaken for an invalid
  // runner diagnostic frame.
  allowed.NODE_NO_WARNINGS = "1";
  // A crashed Electron Main must not leave a Pi child with a Provider
  // credential alive. The runner watches this PID and exits when the parent
  // disappears; normal shutdown still uses the graceful abort path.
  allowed.VIBE_PI_PARENT_PID = String(process.pid);
  // Packaged builds intentionally unpack only the runner so it can be
  // spawned as a real file. Pi's ESM dependencies remain in app.asar; pass
  // that trusted root explicitly so the runner resolves public exports to
  // absolute asar paths instead of relying on NODE_PATH (unsupported by ESM).
  allowed.VIBE_PI_APP_ROOT = app.getAppPath();
  return allowed;
}

function waitForExit(child, timeoutMs) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return Promise.resolve(true);
  return new Promise((resolve) => {
    const timer = setTimeout(() => resolve(false), timeoutMs);
    timer.unref?.();
    child.once("exit", () => {
      clearTimeout(timer);
      resolve(true);
    });
  });
}

class HostedRun {
  constructor({ run, sender, host, startPayload, localHandlers = {}, localContext = {}, runStore = null, resume = false }) {
    this.run = run;
    this.sender = sender;
    this.host = host;
    this.startPayload = startPayload;
    this.localHandlers = localHandlers;
    this.runStore = runStore;
    this.resume = Boolean(resume);
    this.localContext = Object.freeze({ ...(localContext || {}) });
    this.localPending = new Map();
    this.localResolving = new Set();
    this.localResolved = new Map();
    // A malformed/replayed child frame must not execute a tool wave or create
    // a second interaction. Keep a bounded correlation digest in Main; exact
    // duplicates are harmless, conflicting IDs fail closed.
    this.seenChildMessageDigests = new Map();
    this.childFrameChain = Promise.resolve();
    this.abortController = new AbortController();
    this.child = undefined;
    this.protocolIdentity = undefined;
    this.state = "connecting";
    this.startedAt = Date.now();
    this.assistantPartialText = "";
    this.closed = false;
    this.ready = undefined;
    this.readyResolve = undefined;
    this.readyReject = undefined;
    this.localTerminalState = undefined;
    this.readyReached = false;
    this.crashNotified = false;
    this.crashRecoveryPromise = Promise.resolve();
  }

  event(type, fields = {}) {
    const event = {
      schema: EVENT_SCHEMA,
      runId: this.run.run_id,
      turnId: this.run.turn_id,
      sessionId: this.run.session_id,
      type,
      ...fields,
    };
    this.host.emitTo(this.sender, event);
  }

  setState(state, code = "") {
    if (state === "running" && this.state !== "running") this.startedAt = Date.now();
    this.state = state;
    this.event("state", { state, ...(code ? { code } : {}) });
  }

  async start() {
    this.ready = new Promise((resolve, reject) => {
      this.readyResolve = resolve;
      this.readyReject = reject;
    });
    this.protocolIdentity = identityOf({
      run_id: this.run.run_id,
      turn_id: this.run.turn_id,
      request_id: this.run.request_id,
    });
    const traceStart = structuredClone(this.startPayload);
    if (traceStart?.provider && typeof traceStart.provider === "object") {
      traceStart.provider = {
        id: traceStart.provider.id,
        name: traceStart.provider.name,
        model: traceStart.provider.model,
        mode: traceStart.provider.mode,
        reasoning: false,
        context_window: traceStart.provider.context_window,
        max_tokens: traceStart.provider.max_tokens,
      };
    }
    // The handler writes the authoritative user-message journal before the
    // child can call a Provider. Its Trace append is already best-effort;
    // any remaining error must stop startup rather than lose context.
    await this.localHandlers.onStart?.({ run: this.run, payload: traceStart, context: this.localContext });
    // Persist the secret-free descriptor before the child can issue a
    // Provider request. A crash between this write and `ready` is therefore
    // classified as interrupted instead of being silently replayed.
    await this.runStore?.create({
      run: this.run,
      startPayload: this.startPayload,
      localContext: this.localContext,
      replace: this.resume,
    });
    this.spawnChild();
    await this.writeChildFrame(makeFrame(this.protocolIdentity, "start", this.startPayload).serialized);
    // The child now owns its private copy. Remove credentials from Main's
    // live run object immediately instead of waiting for terminal cleanup.
    if (this.startPayload?.provider && typeof this.startPayload.provider === "object") {
      delete this.startPayload.provider.api_key;
      delete this.startPayload.provider.apiKey;
      delete this.startPayload.provider.headers;
    }
    const timeout = setTimeout(() => this.readyReject?.(new Error("vibe_agent_runner_ready_timeout")), 10_000);
    timeout.unref?.();
    try {
      await this.ready;
    } finally {
      clearTimeout(timeout);
    }
    return this.status();
  }

  async writeChildFrame(serialized) {
    if (!this.child?.stdin?.writable) throw new Error("vibe_agent_runner_stdin_closed");
    if (Buffer.byteLength(serialized, "utf8") > MAX_FRAME_BYTES) throw new Error("vibe_agent_child_frame_too_large");
    if (this.child.stdin.write(`${serialized}\n`, "utf8")) return;
    await new Promise((resolve, reject) => {
      this.child.stdin.once("drain", resolve);
      this.child.stdin.once("error", reject);
    });
  }

  spawnChild() {
    const child = spawn(process.execPath, [vibeAgentRuntimePath()], {
      stdio: ["pipe", "pipe", "pipe"],
      windowsHide: true,
      env: vibeAgentChildEnvironment(),
    });
    this.child = child;
    const output = readline.createInterface({ input: child.stdout, crlfDelay: Infinity, terminal: false });
    output.on("line", (line) => {
      // Keep frame handling ordered.  Local tool/interaction callbacks are
      // asynchronous and must not let a later frame overtake their reply.
      this.childFrameChain = this.childFrameChain
        .then(() => this.acceptChildLine(line))
        .catch((error) => {
          this.fail(String(error?.code || error?.message || "child_frame_invalid"));
        });
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr = `${stderr}${chunk.toString("utf8")}`.slice(-512);
      for (const line of stderr.split(/\r?\n/).slice(0, -1)) {
        if (!/^PI_BRIDGE_ERROR:[A-Za-z0-9_]{1,128}$/.test(line)) this.fail("runner_stderr_invalid");
      }
      stderr = stderr.split(/\r?\n/).at(-1) ?? "";
    });
    child.once("error", () => this.fail("runner_spawn_failed"));
    child.once("close", (code, signal) => {
      void (async () => {
        if (this.closed) return;
        // `readline` delivers the final line before `close`, but the handler
        // is intentionally serialized through an async promise chain.  Give
        // that chain a short bounded window to consume a terminal/done frame;
        // otherwise a clean waiting exit can be misclassified as a missing
        // terminal and the durable pending descriptor is lost.
        await Promise.race([
          this.childFrameChain.catch(() => undefined),
          new Promise((resolve) => {
            const timer = setTimeout(resolve, 2_000);
            timer.unref?.();
          }),
        ]);
        if (this.closed) return;
        if (code !== 0) {
          if (await this.handleUnexpectedLocalExit(code, signal)) return;
          // The runner may have emitted a validated terminal `done` frame and
          // then exit non-zero because the parent protocol failed. Preserve
          // that authoritative status instead of reclassifying a known
          // failure as an unknown in-flight Provider/tool outcome.
          if (["completed", "failed", "aborted", "cancelled"].includes(String(this.localTerminalState || ""))) {
            await this.close({ state: this.localTerminalState, fromExit: true });
            return;
          }
          if (this.runStore) {
            const descriptor = await this.runStore.get(this.run.run_id).catch(() => null);
            const phase = String(descriptor?.phase || "");
            const unknown = phase === "provider_in_flight" || phase === "response_in_flight"
              ? "provider_outcome_unknown"
              : phase === "tool_in_flight" ? "tool_outcome_unknown" : "runner_interrupted";
            await this.runStore.markTerminal(this.run.run_id, "failed", unknown).catch(() => undefined);
            this.fail(unknown);
            return;
          }
          this.fail(signal ? "runner_signalled" : "runner_exited");
          return;
        }
        if (!this.localTerminalState) {
          this.fail("runner_terminal_missing");
          return;
        }
        if (this.localTerminalState === "waiting_user") {
          // Pi intentionally exits after publishing a waiting checkpoint.
          // This is not a terminal run: retain the durable descriptor and
          // let a later response cold-start the continuation.
          const descriptor = await this.runStore?.get(this.run.run_id).catch(() => null);
          if (!descriptor?.pending && !localRunConstants.RECOVERABLE_PHASES.has(String(descriptor?.phase || ""))) {
            this.fail("runner_waiting_without_interaction");
            return;
          }
          await Promise.resolve().then(() => this.localHandlers.onPark?.({
            run: this.run,
            context: this.localContext,
            reason: "waiting_child_exit",
          })).catch(() => undefined);
          await this.close({ state: "waiting_user", fromExit: true, preserveWaiting: true });
          return;
        }
        await this.close({ state: this.localTerminalState, fromExit: true });
      })();
    });
  }

  async acceptChildLine(line) {
    if (this.closed) return;
    const frame = parseOutboundLine(line, this.protocolIdentity);
    const childCorrelation = frame.message_id
      ? `message_id:${String(frame.message_id)}`
      : `reply_to:${String(frame.reply_to || "")}`;
    if (childCorrelation !== "reply_to:") {
      const messageId = childCorrelation;
      const digest = createHash("sha256")
        .update(JSON.stringify(frame))
        .digest("hex");
      const previous = this.seenChildMessageDigests.get(messageId);
      if (previous !== undefined) {
        if (previous !== digest) throw new Error("vibe_agent_child_message_id_conflict");
        return;
      }
      this.seenChildMessageDigests.set(messageId, digest);
      while (this.seenChildMessageDigests.size > 4096) {
        this.seenChildMessageDigests.delete(this.seenChildMessageDigests.keys().next().value);
      }
    }
    // A dependency/handshake failure is terminal for this child.  Surface it
    // immediately instead of leaving HostedRun.start waiting for the generic
    // ten-second ready timeout (which looks like a frozen UI to the user).
    if (!this.readyReached && frame.type === "error") {
      const code = String(frame.payload?.code || "vibe_agent_runner_start_failed");
      this.readyReject?.(new Error(code));
    } else if (!this.readyReached && frame.type === "done"
      && String(frame.payload?.status || "") !== "waiting_user") {
      const code = String(frame.payload?.code || "vibe_agent_runner_start_failed");
      this.readyReject?.(new Error(code));
    }
    if (frame.type === "ready") {
      if (
        frame.payload.agent_core_version !== AGENT_CORE_VERSION
        || frame.payload.pi_ai_version !== PI_AI_VERSION
        || frame.payload.pi_coding_agent_version !== PI_CODING_AGENT_VERSION
        || frame.payload.bridge_protocol_version !== PROTOCOL_VERSION
        || frame.payload.execution_mode !== "local"
      ) throw new Error("vibe_agent_runner_version_mismatch");
      this.setState("running");
      this.readyReached = true;
      this.readyResolve?.(true);
    }
    if (frame.type === "assistant_delta" && frame.payload.text) {
      this.assistantPartialText = `${this.assistantPartialText}${String(frame.payload.text)}`.slice(-2_000_000);
      this.event("assistant_delta", { text: String(frame.payload.text) });
    }
    await this.acceptLocalFrame(frame);
  }

  async acceptLocalFrame(frame) {
    // Register an interaction before publishing any observer event so a fast
    // renderer cannot answer between the IPC notification and pending-map
    // insertion.
    if (frame.type === "interaction_request") {
      this.localPending.set(frame.message_id, frame);
      // Persist the recoverable checkpoint before Trace/session observers or
      // renderer notifications run.  A Main crash in either observer must
      // not turn an already-materialized confirmation into an unknown tool
      // outcome on the next launch.
      if (this.state !== "cancelling") {
        await this.runStore?.markWaiting(this.run.run_id, frame.payload, {
          last_call: {
            tool_call_id: frame.payload?.tool_call_id,
            tool_name: frame.payload?.tool_name,
            wave_id: frame.payload?.wave_id,
          },
        });
        this.setState("waiting_user");
      }
    }
    if (this.runStore) {
      if (frame.type === "provider_payload") {
        await this.runStore.phase(this.run.run_id, "provider_in_flight", {
          state: "running",
          last_call: {
            call_id: frame.payload?.call_id,
            purpose: frame.payload?.purpose,
            frame_type: frame.type,
          },
        });
      } else if (frame.type === "tool_wave") {
        await this.runStore.phase(this.run.run_id, "tool_in_flight", {
          state: "running",
          last_call: { wave_id: frame.payload?.wave_id, frame_type: frame.type },
        });
      } else if (frame.type === "candidate_final") {
        await this.runStore.phase(this.run.run_id, "candidate_in_flight", {
          state: "running",
          last_call: { frame_type: frame.type },
        });
      } else if (frame.type === "assistant_end") {
        // The Provider stream has produced a complete assistant message. A
        // later crash is no longer an in-flight Provider outcome; the next
        // phase (tool wave or candidate final) will be recorded separately.
        await this.runStore.phase(this.run.run_id, "running", {
          state: "running",
          last_call: { frame_type: frame.type },
          ...(frame.payload?.budget && typeof frame.payload.budget === "object"
            ? { provider_budget: frame.payload.budget } : {}),
        });
      }
    }
    // Every Pi frame is exposed as a diagnostic event.  The renderer may use
    // the typed convenience events below, while a Trace writer can retain the
    // original payload without another child protocol.
    this.event("pi_frame", {
      frameType: frame.type,
      messageId: frame.message_id,
      replyTo: frame.reply_to,
      payload: frame.payload,
    });
    try {
      const observed = this.localHandlers.onFrame?.({ run: this.run, frame, context: this.localContext });
      if (frame.type === "assistant_delta") {
        // Streaming narration is observational; never serialize Pi token
        // delivery behind a disk write. The Trace store still preserves order.
        Promise.resolve(observed).catch(() => this.event("trace_error", { frameType: frame.type }));
      } else {
        await observed;
      }
    } catch (error) {
      // These frames update the authoritative local conversation journal.
      // Continuing without them would make the next Goal rebuild a different
      // transcript from the one the user just saw.
      if (new Set(["assistant_end", "local_tool_end", "interaction_request", "session_title"]).has(frame.type)) throw error;
      // Streaming/Trace telemetry remains observational.
      this.event("trace_error", { frameType: frame.type });
    }
    if (frame.type === "assistant_end") this.assistantPartialText = "";
    if (this.closed) return;
    if (frame.type === "tool_wave") {
      const callback = this.localHandlers.onToolWave;
      if (typeof callback !== "function") throw new Error("vibe_agent_local_tool_handler_unconfigured");
      const outcome = await callback({
        run: this.run,
        request: frame.payload,
        signal: this.abortController.signal,
        context: this.localContext,
      });
      if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) throw new Error("vibe_agent_local_tool_result_invalid");
      const payload = {
        wave_id: frame.payload.wave_id,
        results: outcome.results,
        ...(outcome.stop_after_wave === undefined ? {} : { stop_after_wave: Boolean(outcome.stop_after_wave) }),
      };
      const interactionResult = Array.isArray(outcome.results)
        ? outcome.results.find((item) => item?.interaction && typeof item.interaction === "object")
        : null;
      if (interactionResult?.interaction && this.runStore) {
        // The Knowledge preview may already be durable before Pi emits its
        // explicit interaction_request. Save a complete enough pending card
        // now so a crash in that narrow gap is still recoverable.
        await this.runStore.markWaiting(this.run.run_id, {
          ...interactionResult.interaction,
          wave_id: frame.payload.wave_id,
          tool_call_id: interactionResult.tool_call_id,
          tool_name: (frame.payload.calls || []).find((call) => String(call?.id || "") === String(interactionResult.tool_call_id || ""))?.name || "",
        });
      }
      await this.writeChildFrame(makeFrame(this.protocolIdentity, "tool_wave_result", payload, { reply_to: frame.message_id }).serialized);
      // The inbound result is part of the local Pi transcript as well.  It is
      // not sent back through the child twice; this observer frame only lets
      // the local session journal retain assistant tool-call/result pairs for
      // later turns and reloads.
      this.event("pi_frame", {
        frameType: "tool_wave_result",
        replyTo: frame.message_id,
        payload,
      });
      return;
    }
    if (frame.type === "interaction_request") {
      if (this.state === "cancelling") return;
      this.setState("waiting_user");
      // Preserve the complete payload for the renderer while retaining the
      // legacy top-level fields used by older listeners.
      this.event("interaction_request", { ...frame.payload, payload: frame.payload });
      try {
        await this.localHandlers.onInteraction?.({
          run: this.run,
          request: frame.payload,
          pendingId: frame.payload.interaction_id,
          context: this.localContext,
        });
      } catch {
        this.event("interaction_observer_error", { interactionId: frame.payload.interaction_id });
      }
      return;
    }
    if (frame.type === "session_title") {
      try {
        const outcome = await this.localHandlers.onSessionTitle?.({
          run: this.run,
          title: frame.payload.title,
          usage: frame.payload.usage,
          context: this.localContext,
        });
        if (outcome?.applied !== false) {
          this.event("session_title", { title: String(outcome?.title || frame.payload.title) });
        }
      } catch {
        // 标题是附属产物；持久化失败时保留默认标题，不改变主 Agent 终态。
        this.event("session_title_error", { code: "session_title_persist_failed" });
      }
      return;
    }
    if (frame.type === "candidate_final") {
      let outcome;
      try {
        outcome = await this.localHandlers.onCandidateFinal?.({ run: this.run, candidate: frame.payload, context: this.localContext });
      } catch {
        this.event("candidate_observer_error", { callId: frame.payload.call_id });
      }
      if (outcome?.repair) {
        await this.writeChildFrame(makeFrame(this.protocolIdentity, "repair_final", {
          instruction: String(outcome.instruction ?? ""),
          ...(outcome.system_prompt === undefined ? {} : { system_prompt: outcome.system_prompt }),
        }, { reply_to: frame.message_id }).serialized);
      } else {
        await this.writeChildFrame(makeFrame(this.protocolIdentity, "finish", {
          ...(outcome?.publish_text === undefined ? { publish_text: frame.payload.text } : { publish_text: String(outcome.publish_text) }),
        }, { reply_to: frame.message_id }).serialized);
      }
      return;
    }
    if (frame.type === "done") {
      this.localTerminalState = frame.payload.status === "completed"
        ? "completed"
        : frame.payload.status === "aborted" ? "aborted" : frame.payload.status;
      this.event("done", { ...frame.payload, payload: frame.payload });
      if (this.runStore) {
        if (frame.payload.status === "waiting_user") {
          await this.runStore.phase(this.run.run_id, "waiting_user", { state: "waiting_user" }).catch(() => undefined);
        } else {
          await this.runStore.markTerminal(this.run.run_id, this.localTerminalState, frame.payload.code || "").catch(() => undefined);
        }
      }
      return;
    }
    if (frame.type === "error") this.event("error", { ...frame.payload, payload: frame.payload });
  }

  attach(sender) {
    this.sender = sender;
    const pending = [...this.localPending.values()].find((item) => !item.responded);
    if (pending) queueMicrotask(() => {
      if (!this.closed && this.state !== "cancelling") {
        this.event("interaction_request", { ...pending.payload, payload: pending.payload });
      }
    });
    return this.status();
  }

  async respond(pendingId, response) {
    const id = boundedString(pendingId, "pending_id", 256);
    const projected = validatedInteractionResponse(id, response);
    return this.respondLocal(id, projected);
  }

  async respondLocal(pendingId, projected) {
    const pending = [...this.localPending.values()].find((frame) => {
      const id = frame.payload?.interaction_id;
      return id === pendingId || frame.payload?.confirmation_id === pendingId;
    });
    if (!pending) {
      const replay = this.localResolved.get(pendingId);
      if (replay) return { accepted: true, replayed: true, runId: this.run.run_id, pendingId };
      throw new Error("vibe_agent_local_interaction_not_found");
    }
    if (projected.clarification_response?.type === "option"
      && !clarificationOptionAllowed(pending.payload?.options, projected.clarification_response.option_id)) {
      throw new Error("vibe_agent_clarification_option_invalid");
    }
    if (pending.responded) {
      // The business side may already have accepted this response.  Do not
      // send a second frame to Pi (its original request is no longer pending).
      if (pending.response
        && responseSignature(pending.response) !== responseSignature(projected)) {
        throw new Error("vibe_agent_response_replay_mismatch");
      }
      return { accepted: true, replayed: true, runId: this.run.run_id, pendingId };
    }
    const resolvedInMemory = this.localResolved.get(pendingId)
      || this.localResolved.get(String(pending.payload?.confirmation_id || pending.payload?.interaction_id || ""));
    if (resolvedInMemory) {
      // The Knowledge operation completed before a child-pipe failure (or a
      // lost UI response). Never invoke the business callback twice. A later
      // cold-recovery path will use the durable resume_ready checkpoint to
      // deliver the already-known result to Pi.
      if (resolvedInMemory.response
        && responseSignature(resolvedInMemory.response) !== responseSignature(projected)) {
        throw new Error("vibe_agent_response_replay_mismatch");
      }
      return { accepted: true, replayed: true, runId: this.run.run_id, pendingId };
    }
    if (this.localResolving.has(pending.message_id)) throw new Error("vibe_agent_local_interaction_response_in_flight");
    const callback = this.localHandlers.onInteractionResponse;
    if (typeof callback !== "function") throw new Error("vibe_agent_local_interaction_handler_unconfigured");
    this.localResolving.add(pending.message_id);
    try {
      // The response-in-flight checkpoint is part of the idempotency
      // boundary. If it cannot be persisted, do not execute the Knowledge
      // transaction: a later retry would otherwise be unable to distinguish a
      // committed result from an unknown side effect.
      await this.runStore?.markResponseInFlight(this.run.run_id, projected);
      const outcome = await callback({ run: this.run, request: pending.payload, response: projected, context: this.localContext });
      if (!outcome || typeof outcome !== "object" || Array.isArray(outcome)) throw new Error("vibe_agent_local_interaction_result_invalid");
      const result = outcome.result;
      if (!result || typeof result !== "object" || Array.isArray(result)) throw new Error("vibe_agent_local_interaction_tool_result_missing");
      const status = String(outcome.status ?? "resolved");
      const allowed = new Set(["resolved", "applied", "replayed", "cancelled", "stale", "failed", "stopped"]);
      if (!allowed.has(status)) throw new Error("vibe_agent_local_interaction_status_invalid");
      const payload = {
        interaction_id: pending.payload.interaction_id,
        ...(pending.payload.confirmation_id === undefined ? {} : { confirmation_id: pending.payload.confirmation_id }),
        sequence: pending.payload.sequence,
        wave_id: pending.payload.wave_id,
        tool_call_id: pending.payload.tool_call_id,
        spec_digest: pending.payload.spec_digest,
        status,
        result,
        ...(outcome.user_message === undefined ? {} : { user_message: String(outcome.user_message) }),
      };
      // Record the business outcome before touching the child pipe.  If the
      // pipe dies at this exact point, a later UI retry is a replay, never a
      // second Knowledge commit.
      const resolvedRecord = {
        status,
        result,
        userMessage: outcome.user_message,
        response: projected,
      };
      this.localResolved.set(pendingId, resolvedRecord);
      const alternateId = pending.payload.confirmation_id || pending.payload.interaction_id;
      if (alternateId && alternateId !== pendingId) this.localResolved.set(alternateId, resolvedRecord);
      // Persist the resolved business result before writing to the child. A
      // Main crash in the narrow pipe window must leave a `resume_ready`
      // checkpoint; otherwise reconcile would classify a durable Knowledge
      // commit as an unknown in-flight response and discard its receipt.
      await this.runStore?.markResumeReady(this.run.run_id, projected, resolvedRecord);
      await this.writeChildFrame(makeFrame(this.protocolIdentity, "interaction_response", payload, { reply_to: pending.message_id }).serialized);
      // Retain the record until terminal cleanup so a repeated UI action is
      // an idempotent replay instead of a second child/Knowledge operation.
      pending.responded = true;
      pending.response = projected;
      await this.runStore?.phase(this.run.run_id, "running", {
        state: "running",
        pending: null,
        response: undefined,
        resolved_result: undefined,
        runtime_lost: false,
      }).catch(() => undefined);
      this.setState("running");
      return { accepted: true, runId: this.run.run_id, pendingId };
    } catch (error) {
      // A business result may already be durable when the child pipe dies.
      // Keep a replayable checkpoint so a later cold attach never submits the
      // same confirmation twice.
      const resolved = this.localResolved.get(pendingId);
      if (resolved) {
        await this.runStore?.markResumeReady(this.run.run_id, projected, resolved).catch(() => undefined);
      } else {
        await this.runStore?.phase(this.run.run_id, "waiting_user", {
          state: "waiting_user",
          runtime_lost: true,
        }).catch(() => undefined);
      }
      throw error;
    } finally {
      this.localResolving.delete(pending.message_id);
    }
  }

  async cancel({ turnId, sessionId }) {
    if (String(turnId) !== this.run.turn_id || String(sessionId) !== this.run.session_id) throw new Error("vibe_agent_cancel_identity_drift");
    this.setState("cancelling");
    this.abortController.abort();
    await this.writeChildFrame(makeFrame(this.protocolIdentity, "abort", { reason: "user_cancelled" }).serialized).catch(() => undefined);
    return { accepted: true, runId: this.run.run_id };
  }

  status() {
    const pending = [...this.localPending.values()].find((item) => !item.responded);
    const terminalState = this.localTerminalState && this.localTerminalState !== "waiting_user"
      ? this.localTerminalState : "";
    const effectiveState = terminalState || (pending && !this.closed && this.state !== "cancelling"
      ? "waiting_user" : this.state);
    return {
      execution_host: "electron",
      run_id: this.run.run_id,
      turn_id: this.run.turn_id,
      session_id: this.run.session_id,
      project_id: this.run.project_id,
      account_id: String(this.run.account_id || ""),
      runId: this.run.run_id,
      turnId: this.run.turn_id,
      sessionId: this.run.session_id,
      state: effectiveState,
      lifecycle: lifecycleState(effectiveState),
      protocolVersion: PROTOCOL_VERSION,
      agentCoreVersion: AGENT_CORE_VERSION,
      piAgentCoreVersion: AGENT_CORE_VERSION,
      piAiVersion: PI_AI_VERSION,
      piCodingAgentVersion: PI_CODING_AGENT_VERSION,
      executionMode: "local",
      startedAt: this.startedAt,
      assistantPartialText: this.assistantPartialText,
      ...(this.run.trace_id ? { traceId: this.run.trace_id } : {}),
      ...(this.run.goal_id ? { goalId: this.run.goal_id } : {}),
      ...(pending
        ? {
            pendingInteraction: pending.payload,
            pending_interaction: pending.payload,
          }
        : {}),
    };
  }

  async handleUnexpectedLocalExit(code, signal) {
    if (this.closed) return false;
    const pending = [...this.localPending.values()].find((item) => !item.responded);
    const descriptor = await this.runStore?.get(this.run.run_id).catch(() => null);
    const phase = String(descriptor?.phase || "");
    const recoverable = Boolean(pending) || localRunConstants.RECOVERABLE_PHASES.has(phase);
    if (!recoverable) return false;
    const pendingPayload = pending?.payload || descriptor?.pending;
    if (phase === "resume_ready" && descriptor?.response && descriptor?.resolved_result) {
      await this.runStore?.phase(this.run.run_id, "resume_ready", {
        state: "waiting_user",
        runtime_lost: true,
      }).catch(() => undefined);
    } else if (pendingPayload) {
      await this.runStore?.markWaiting(this.run.run_id, pendingPayload, {
        runtime_lost: true,
        last_call: { code: String(code || ""), signal: String(signal || "") },
      }).catch(() => undefined);
    } else {
      await this.runStore?.phase(this.run.run_id, "waiting_user", {
        state: "waiting_user",
        runtime_lost: true,
      }).catch(() => undefined);
    }
    // The child is gone. Keep only the durable descriptor; the renderer will
    // reattach the pending card and explicitly request a safe continuation.
    this.state = "waiting_user";
    this.event("state", { state: "waiting_user", code: "runner_restarted" });
    if (pendingPayload) this.event("interaction_request", { ...pendingPayload, payload: pendingPayload });
    await Promise.resolve().then(() => this.localHandlers.onPark?.({
      run: this.run,
      context: this.localContext,
      reason: "runner_crashed",
      code,
      signal,
    })).catch(() => undefined);
    await this.close({ state: "waiting_user", fromExit: true, preserveWaiting: true });
    return true;
  }

  fail(code) {
    if (this.closed) return;
    const rawCode = String(code || "").trim();
    const safeCode = /^(?:vibe_agent|runner|pi|provider|tool|interaction|knowledge|electron|backend|trace|session|local|attachment|context|model|wall|total|credential|protocol|request|response|candidate|unknown|cancel|host)[A-Za-z0-9_.:-]{0,127}$/u.test(rawCode)
      ? rawCode
      : "vibe_agent_failed";
    if (!this.crashNotified) {
      this.crashNotified = true;
      try {
        this.crashRecoveryPromise = Promise.resolve(this.localHandlers.onCrash?.({
          run: this.run,
          code: safeCode,
          context: this.localContext,
          pending_tool_call_id: [...this.localPending.values()]
            .find((item) => !item.responded)?.payload?.tool_call_id || "",
        })).catch(() => undefined);
      } catch { this.crashRecoveryPromise = Promise.resolve(); }
    }
    try {
      Promise.resolve(this.localHandlers.onError?.({
        run: this.run,
        code: safeCode,
        context: this.localContext,
        startup_recovery: this.resume && !this.readyReached,
      })).catch(() => {});
    } catch { /* diagnostics must not mask the terminal failure */ }
    this.setState("failed", safeCode);
    this.event("error", { code: safeCode });
    this.readyReject?.(new Error(safeCode));
    void this.close({
      state: "failed",
      preserveWaiting: this.resume && !this.readyReached,
    });
  }

  async close({ state = "closed", fromExit = false, preserveWaiting = false } = {}) {
    if (this.closed) return;
    this.closed = true;
    this.state = state;
    this.abortController.abort();
    await this.crashRecoveryPromise;
    const child = this.child;
    if (child && !fromExit && child.exitCode === null && child.signalCode === null) {
      if (this.protocolIdentity && child.stdin?.writable) {
        const { serialized } = makeFrame(this.protocolIdentity, "abort", { reason: "electron_host_closing" });
        child.stdin.write(`${serialized}\n`, "utf8");
      }
      if (!await waitForExit(child, GRACEFUL_ABORT_MS)) child.kill("SIGTERM");
      if (!await waitForExit(child, TERMINATE_WAIT_MS)) child.kill("SIGKILL");
    }
    try { child?.stdin?.destroy(); } catch {}
    try { child?.stdout?.destroy(); } catch {}
    try { child?.stderr?.destroy(); } catch {}
    if (this.startPayload?.provider && typeof this.startPayload.provider === "object") {
      delete this.startPayload.provider.api_key;
      delete this.startPayload.provider.apiKey;
    }
    if (String(state) === "aborted") {
      try {
        await this.localHandlers.onClose?.({ run: this.run, context: this.localContext, state });
      } catch {
        // Trace finalization is observational. A broken local disk or upload
        // observer must not leave the child/Host lifecycle half-closed.
        this.event("trace_error", { frameType: "terminal" });
      }
    }
    const preserveFailedResumeCheckpoint = this.resume && !this.readyReached && String(state) === "failed";
    if (this.runStore && !preserveWaiting && !preserveFailedResumeCheckpoint && String(state) !== "waiting_user") {
      const terminalState = ["completed", "failed", "aborted", "cancelled", "closed"].includes(String(state))
        ? String(state) : "failed";
      await this.runStore.markTerminal(this.run.run_id, terminalState, terminalState).catch(() => undefined);
    }
    this.localPending.clear();
    this.localResolving.clear();
    this.localResolved.clear();
    this.seenChildMessageDigests.clear();
    if (!preserveWaiting) this.event("terminal", { state });
    this.host.release(this.run.run_id);
  }
}

export class VibeAgentHost {
  constructor({ localHandlers = {}, maxActiveRuns = MAX_ACTIVE_RUNS, runStore = null } = {}) {
    this.localHandlers = localHandlers;
    this.runStore = runStore;
    this.maxActiveRuns = Number.isFinite(maxActiveRuns) && maxActiveRuns > 0 ? Math.floor(maxActiveRuns) : MAX_ACTIVE_RUNS;
    this.runs = new Map();
    this.localReservations = new Map();
    this.activeSlots = 0;
    this.reservationChain = Promise.resolve();
    const clientInstanceId = stableClientIdentity();
    this.identityFacts = {
      appVersion: app.getVersion(),
      protocolVersion: PROTOCOL_VERSION,
      agentCoreVersion: AGENT_CORE_VERSION,
      piAgentCoreVersion: AGENT_CORE_VERSION,
      piAiVersion: PI_AI_VERSION,
      piCodingAgentVersion: PI_CODING_AGENT_VERSION,
      executionModes: ["local"],
      clientInstanceId,
      clientInstanceHash: createHash("sha256").update(clientInstanceId).digest("hex"),
    };
  }

  identity() {
    return { ...this.identityFacts };
  }

  emitTo(sender, event) {
    if (sender && !sender.isDestroyed?.()) sender.send("vibeAgent:event", event);
  }

  reservationStatus(reservation) {
    return {
      execution_host: "electron",
      execution_mode: "local",
      executionMode: "local",
      run_id: reservation.runId,
      turn_id: reservation.turnId,
      session_id: reservation.sessionId,
      project_id: reservation.projectId,
      account_id: reservation.accountId,
      runId: reservation.runId,
      turnId: reservation.turnId,
      sessionId: reservation.sessionId,
      state: "queued",
      lifecycle: "queued",
      protocolVersion: PROTOCOL_VERSION,
      agentCoreVersion: AGENT_CORE_VERSION,
      piAgentCoreVersion: AGENT_CORE_VERSION,
      piAiVersion: PI_AI_VERSION,
      piCodingAgentVersion: PI_CODING_AGENT_VERSION,
    };
  }

  async withReservationLock(task) {
    const next = this.reservationChain.then(task, task);
    this.reservationChain = next.catch(() => undefined);
    return next;
  }

  liveSessionOwners(exceptRunId = "") {
    const owners = [];
    for (const [runId, hosted] of this.runs) {
      if (runId === exceptRunId) continue;
      // `done` is the logical end of a Goal. The child can need a short
      // cleanup window before its close event, but that window must not make a
      // just-finished session look occupied to the next user submission.
      if (hosted.localTerminalState && hosted.localTerminalState !== "waiting_user") continue;
      owners.push(sessionOwner(hosted.run.account_id, hosted.run.session_id));
    }
    for (const [runId, reservation] of this.localReservations) {
      if (runId === exceptRunId) continue;
      owners.push(sessionOwner(reservation.accountId, reservation.sessionId));
    }
    return owners;
  }

  async reserveLocal({ runId, turnId, sessionId, projectId, accountId = "", resume = false } = {}, sender) {
    const id = boundedString(runId, "run_id", 256);
    const owner = sessionOwner(accountId, sessionId);
    return this.withReservationLock(async () => {
      if (this.runs.has(id) || this.localReservations.has(id)) throw new Error("vibe_agent_run_conflict");
      if (this.liveSessionOwners(id).some((item) => sameSessionOwner(item, owner))) {
        throw new Error("vibe_agent_session_busy");
      }
      if (this.runStore) {
        const waiting = await this.runStore.list({ recoverableOnly: true, includeTerminal: false });
        const conflicting = waiting.find((item) => {
          const stored = item?.run || {};
          if (resume && String(stored.run_id || item?.run_id || "") === id) return false;
          // The descriptor write can lag the child `done` frame by one async
          // filesystem turn. If this Main still owns that same run and has
          // already observed its terminal frame, the stale waiting descriptor
          // is no longer a live session owner; do not reject the follow-up.
          const hosted = this.runs.get(String(stored.run_id || item?.run_id || ""));
          if (hosted?.localTerminalState && hosted.localTerminalState !== "waiting_user") return false;
          return sameSessionOwner(sessionOwner(stored.account_id, stored.session_id), owner);
        });
        if (conflicting) throw new Error("vibe_agent_session_busy");
      }
      // Local admission is a front-door check, not a five-second queue. No
      // Provider snapshot is requested unless a real child slot is reserved.
      if (this.activeSlots >= this.maxActiveRuns) throw new Error("vibe_agent_host_busy");
      const reservation = {
        reservationId: randomUUID(),
        runId: id,
        turnId: boundedString(turnId, "turn_id", 256),
        sessionId: owner.sessionId,
        projectId: boundedString(projectId, "project_id", 256),
        accountId: owner.accountId,
        sender,
      };
      this.activeSlots += 1;
      this.localReservations.set(id, reservation);
      this.emitTo(sender, {
        schema: EVENT_SCHEMA,
        runId: id,
        turnId: reservation.turnId,
        sessionId: reservation.sessionId,
        type: "state",
        state: "queued",
      });
      return { reservationId: reservation.reservationId, status: this.reservationStatus(reservation) };
    });
  }

  async bindLocalReservation({ runId, reservationId, accountId, sessionId } = {}) {
    const id = boundedString(runId, "run_id", 256);
    const authoritative = sessionOwner(accountId, sessionId);
    return this.withReservationLock(async () => {
      const reservation = this.localReservations.get(id);
      if (!reservation || reservation.reservationId !== reservationId) {
        throw new Error("vibe_agent_local_reservation_missing");
      }
      if (reservation.sessionId !== authoritative.sessionId
        || (reservation.accountId && reservation.accountId !== authoritative.accountId)) {
        throw new Error("vibe_agent_runtime_snapshot_account_drift");
      }
      if (!authoritative.accountId) throw new Error("vibe_agent_runtime_snapshot_account_missing");
      if (this.liveSessionOwners(id).some((item) => sameSessionOwner(item, authoritative))) {
        throw new Error("vibe_agent_session_busy");
      }
      reservation.accountId = authoritative.accountId;
      return this.reservationStatus(reservation);
    });
  }

  releaseLocalReservation(runId, reservationId = "") {
    const id = String(runId || "").trim();
    const reservation = this.localReservations.get(id);
    if (!reservation || (reservationId && reservation.reservationId !== reservationId)) return false;
    this.localReservations.delete(id);
    this.releaseSlot();
    return true;
  }

  releaseSlot() {
    this.activeSlots = Math.max(0, this.activeSlots - 1);
  }

  release(runId) {
    const run = this.runs.get(runId);
    this.runs.delete(runId);
    if (!run) return;
    this.releaseSlot();
  }

  async startLocal(input, sender, { reservationId = "" } = {}) {
    const { run, payload } = validateLocalRun(input);
    const localContext = input?.local_context ?? input?.localContext ?? {};
    if (!localContext || typeof localContext !== "object" || Array.isArray(localContext)) {
      throw new Error("vibe_agent_local_context_invalid");
    }
    const contextKeys = new Set(["account_id", "auth_token", "knowledge_base_url", "trace_upload_base_url", "trace_upload_headers", "request_text"]);
    if (Object.keys(localContext).some((key) => !contextKeys.has(key))) {
      throw new Error("vibe_agent_local_context_unknown_field");
    }
    if (localContext.auth_token !== undefined
      && (typeof localContext.auth_token !== "string"
        || localContext.auth_token.length > 32_768
        || /[\u0000-\u001f\u007f]/u.test(localContext.auth_token))) {
      throw new Error("vibe_agent_local_auth_invalid");
    }
    if (String(localContext.account_id || "") !== run.account_id) {
      throw new Error("vibe_agent_local_account_drift");
    }
    const existing = this.runs.get(run.run_id);
    if (existing) {
      this.releaseLocalReservation(run.run_id, reservationId);
      return existing.attach(sender);
    }
    let reservation = this.localReservations.get(run.run_id);
    if (!reservation) {
      const acquired = await this.reserveLocal({
        runId: run.run_id,
        turnId: run.turn_id,
        sessionId: run.session_id,
        projectId: run.project_id,
        accountId: run.account_id,
        resume: Boolean(input?.resume),
      }, sender);
      reservationId = acquired.reservationId;
      reservation = this.localReservations.get(run.run_id);
    }
    if (!reservation || reservation.reservationId !== reservationId) {
      throw new Error("vibe_agent_local_reservation_missing");
    }
    if (reservation.sessionId !== run.session_id
      || (reservation.accountId && reservation.accountId !== String(run.account_id || ""))) {
      throw new Error("vibe_agent_local_reservation_identity_drift");
    }
    run.account_id = reservation.accountId || String(run.account_id || "");
    this.localReservations.delete(run.run_id);
    const hosted = new HostedRun({
      run,
      sender,
      host: this,
      startPayload: payload,
      localHandlers: this.localHandlers,
      localContext,
      runStore: this.runStore,
      resume: Boolean(input?.resume),
    });
    this.runs.set(run.run_id, hosted);
    try {
      return await hosted.start();
    } catch (error) {
      await hosted.close({ state: "failed" });
      throw error;
    }
  }

  setLocalHandlers(localHandlers = {}) {
    if (!localHandlers || typeof localHandlers !== "object" || Array.isArray(localHandlers)) {
      throw new Error("vibe_agent_local_handlers_invalid");
    }
    this.localHandlers = localHandlers;
  }

  attach({ runId, accountId = "" }, sender) {
    return this.requireRun(runId, { accountId }).attach(sender);
  }

  respond({ runId, accountId = "", pendingId, response }) {
    return this.requireRun(runId, { accountId }).respond(pendingId, response);
  }

  cancel({ runId, accountId = "", turnId, sessionId }) {
    return this.requireRun(runId, { accountId }).cancel({ turnId, sessionId });
  }

  status({ runId, accountId = "" }) {
    const id = boundedString(runId, "run_id", 256);
    const run = this.runs.get(id);
    if (run) {
      if (accountId && String(run.run.account_id || "") !== String(accountId)) throw new Error("vibe_agent_run_account_drift");
      return run.status();
    }
    const reservation = this.localReservations.get(id);
    if (reservation) {
      if (accountId && reservation.accountId !== String(accountId)) throw new Error("vibe_agent_run_account_drift");
      return this.reservationStatus(reservation);
    }
    throw new Error("vibe_agent_run_not_found");
  }

  async list({ accountId = "" } = {}) {
    const owner = String(accountId || "").trim();
    const values = [
      ...[...this.runs.values()]
        .filter((run) => !owner || String(run.run.account_id || "") === owner)
        .map((run) => run.status()),
      ...[...this.localReservations.values()]
        .filter((reservation) => !owner || reservation.accountId === owner)
        .map((reservation) => this.reservationStatus(reservation)),
    ];
    if (!this.runStore) return values;
    const known = new Set(values.map((item) => item.run_id));
    const waiting = await this.runStore.list({
      ...(owner ? { accountId: owner } : {}),
      recoverableOnly: true,
      includeTerminal: false,
    });
    for (const descriptor of waiting) {
      const run = descriptor.run || {};
      const runId = String(run.run_id || descriptor.run_id || "");
      if (!runId || known.has(runId)) continue;
      values.push({
        execution_host: "electron",
        execution_mode: "local",
        executionMode: "local",
        run_id: runId,
        turn_id: String(run.turn_id || ""),
        session_id: String(run.session_id || ""),
        project_id: String(run.project_id || ""),
        account_id: String(run.account_id || ""),
        runId,
        turnId: String(run.turn_id || ""),
        sessionId: String(run.session_id || ""),
        state: "waiting_user",
        lifecycle: "waiting_user",
        protocolVersion: PROTOCOL_VERSION,
        agentCoreVersion: AGENT_CORE_VERSION,
        piAgentCoreVersion: AGENT_CORE_VERSION,
        piAiVersion: PI_AI_VERSION,
        piCodingAgentVersion: PI_CODING_AGENT_VERSION,
        ...(descriptor.pending ? {
          pendingInteraction: descriptor.pending,
          pending_interaction: descriptor.pending,
        } : {}),
      });
    }
    return values;
  }

  requireRun(runId, { accountId = "" } = {}) {
    const id = boundedString(runId, "run_id", 256);
    const run = this.runs.get(id);
    if (!run) throw new Error("vibe_agent_run_not_found");
    const owner = String(accountId || "").trim();
    if (!owner) throw new Error("vibe_agent_run_account_required");
    if (owner && String(run.run.account_id || "") !== owner) throw new Error("vibe_agent_run_account_drift");
    return run;
  }

  async cleanup() {
    const runs = [...this.runs.values()];
    await Promise.allSettled(runs.map((run) => run.close({ state: "aborted" })));
    for (const reservation of [...this.localReservations.values()]) {
      this.releaseLocalReservation(reservation.runId, reservation.reservationId);
    }
  }
}

export const _test = {
  validateLocalRun,
  runtimePath: vibeAgentRuntimePath,
};
