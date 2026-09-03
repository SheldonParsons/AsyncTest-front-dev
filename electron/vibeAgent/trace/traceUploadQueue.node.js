import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";

import { TRACE_UPLOAD_SCHEMA, sha256, withoutCredentials } from "./traceModel.mjs";

// Stay below Django's default request-body ceiling; deployments may opt into
// larger chunks (up to the server's 8MiB contract) explicitly.
const DEFAULT_CHUNK_SIZE = 2 * 1024 * 1024;
const MAX_CHUNK_SIZE = 8 * 1024 * 1024;
const MAX_ATTEMPTS = 3;
const MAX_RESPONSE_BYTES = 4 * 1024 * 1024;
const UPLOAD_STATE_FILE = "upload.json";
const BUNDLE_FILE = ".trace.bundle";
const TRUSTED_ORIGINS = new Set(["https://www.asynctest.com", "http://10.23.224.40"]);
const AGENT_BINDING_HEADER = "X-Vibe-Agent-Run-Binding";
const MAX_AGENT_BINDING_LENGTH = 4096;

function normalizeAgentBinding(value) {
  const token = value && typeof value === "object" && !Array.isArray(value)
    ? value.token
    : value;
  if (token === undefined || token === null || token === "") return "";
  if (typeof token !== "string") throw new Error("vibe_agent_trace_binding_invalid");
  const result = token.trim();
  if (!result || result.length > MAX_AGENT_BINDING_LENGTH
    || /[\u0000-\u001f\u007f]/u.test(result)) {
    throw new Error("vibe_agent_trace_binding_invalid");
  }
  return result;
}

function trustedHeaders(headers, bindingToken) {
  const token = normalizeAgentBinding(bindingToken);
  return token ? { ...headers, [AGENT_BINDING_HEADER]: token } : { ...headers };
}

function requireTraceId(value) {
  const traceId = String(value ?? "").trim();
  if (!traceId || traceId.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(traceId)) throw new Error("vibe_agent_trace_id_invalid");
  return traceId;
}

function requireUploadId(value) {
  const uploadId = String(value ?? "").trim();
  if (!/^atu_[0-9a-f]{32}$/.test(uploadId)) throw new Error("vibe_agent_trace_upload_id_invalid");
  return uploadId;
}

function normalizeChunkSize(value) {
  const size = Number(value ?? DEFAULT_CHUNK_SIZE);
  if (!Number.isSafeInteger(size) || size < 64 * 1024 || size > MAX_CHUNK_SIZE) throw new Error("vibe_agent_trace_chunk_size_invalid");
  return size;
}

function safeUploadHeaders(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const output = {};
  const seen = new Set();
  for (const [rawName, rawValue] of Object.entries(value).slice(0, 32)) {
    const name = String(rawName).trim();
    const lower = name.toLowerCase();
    if (!/^[A-Za-z0-9-]{1,128}$/u.test(name) || seen.has(lower)) continue;
    if (new Set([
      "cookie", "set-cookie", "host", "content-length", "content-type",
      "transfer-encoding", "connection", "proxy-authorization",
      AGENT_BINDING_HEADER.toLowerCase(),
    ]).has(lower)) continue;
    if (typeof rawValue !== "string") continue;
    const text = rawValue;
    if (text.length > 32_768 || /[\u0000-\u001f\u007f]/u.test(text)) continue;
    if (lower === "authorization" && !/^token=[^\s\r\n]+$/u.test(text)) continue;
    seen.add(lower);
    output[name] = text;
  }
  return output;
}

function safeTraceDir(rootPath, traceId) {
  const root = path.resolve(rootPath);
  const target = path.resolve(root, encodeURIComponent(requireTraceId(traceId)));
  const relative = path.relative(root, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) throw new Error("vibe_agent_trace_path_invalid");
  return target;
}

async function atomicJson(filePath, value) {
  const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  await fsp.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  try {
    await fsp.writeFile(temp, JSON.stringify(value, null, 2), { encoding: "utf8", mode: 0o600 });
    await fsp.rename(temp, filePath);
  } catch (error) {
    await fsp.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

async function readJson(filePath) {
  try { return JSON.parse(await fsp.readFile(filePath, "utf8")); } catch { return null; }
}

async function listFiles(root) {
  const output = [];
  async function walk(directory, prefix = "") {
    let entries = [];
    try { entries = await fsp.readdir(directory, { withFileTypes: true }); } catch { return; }
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === UPLOAD_STATE_FILE || entry.name === BUNDLE_FILE) continue;
      const absolute = path.join(directory, entry.name);
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(absolute, relative);
      else if (entry.isFile()) {
        const stat = await fsp.stat(absolute);
        output.push({ absolute, path: relative.replaceAll(path.sep, "/"), bytes: stat.size });
      }
    }
  }
  await walk(root);
  return output;
}

async function buildBundle(traceDir) {
  const bundlePath = path.join(traceDir, BUNDLE_FILE);
  const files = await listFiles(traceDir);
  const output = fs.createWriteStream(bundlePath, { mode: 0o600 });
  let outputError;
  output.once("error", (error) => { outputError = error; });
  const hash = createHash("sha256");
  let totalBytes = 0;
  const write = async (chunk) => {
    hash.update(chunk);
    totalBytes += chunk.length;
    if (!output.write(chunk)) await new Promise((resolve, reject) => { output.once("drain", resolve); output.once("error", reject); });
  };
  try {
    // framed-v1 keeps the upload stream bounded and lets the server recover
    // each original local trace file without materialising a 256MiB payload.
    await write(Buffer.from(`${JSON.stringify({ schema: TRACE_UPLOAD_SCHEMA, format: "framed-v1" })}\n`, "utf8"));
    for (const file of files) {
      await write(Buffer.from(`${JSON.stringify({ path: file.path, bytes: file.bytes })}\n`, "utf8"));
      const input = fs.createReadStream(file.absolute, { highWaterMark: 1024 * 1024 });
      for await (const chunk of input) await write(chunk);
      await write(Buffer.from("\n", "utf8"));
    }
    output.end();
    await new Promise((resolve, reject) => { output.once("close", resolve); output.once("error", reject); });
    if (outputError) throw outputError;
  } catch (error) {
    output.destroy();
    await fsp.rm(bundlePath, { force: true }).catch(() => {});
    throw error;
  }
  return { bundlePath, files, totalBytes, bundleSha256: hash.digest("hex") };
}

function endpoint(baseUrl, suffix, { isDevelopment = false } = {}) {
  if (baseUrl !== undefined && baseUrl !== null && typeof baseUrl !== "string") {
    throw new Error("vibe_agent_trace_upload_url_invalid");
  }
  const rawBaseUrl = String(baseUrl ?? "");
  if (rawBaseUrl !== rawBaseUrl.trim() || rawBaseUrl.includes("\\")
    || /[\u0000-\u001f\u007f]/u.test(rawBaseUrl)) {
    throw new Error("vibe_agent_trace_upload_url_invalid");
  }
  const base = new URL(rawBaseUrl);
  const loopback = new Set(["localhost", "127.0.0.1", "::1", "[::1]"]).has(base.hostname);
  if (base.protocol !== "https:" && !TRUSTED_ORIGINS.has(base.origin) && !(isDevelopment && base.protocol === "http:" && loopback)) {
    throw new Error("vibe_agent_trace_upload_url_not_allowed");
  }
  if (base.username || base.password || base.hash || base.search) throw new Error("vibe_agent_trace_upload_url_invalid");
  const root = base.toString().replace(/\/$/, "");
  const basePath = base.pathname.replace(/\/+$/, "");
  const route = basePath.endsWith("/vibe/foundation")
    ? suffix
    : basePath.endsWith("/vibe")
      ? `/foundation${suffix}`
      : `/vibe/foundation${suffix}`;
  return `${root}${route}`;
}

async function responseJson(response, code) {
  try {
    const declared = Number(response?.headers?.get?.("content-length") || 0);
    if (Number.isFinite(declared) && declared > MAX_RESPONSE_BYTES) throw new Error(`${code}_response_too_large`);
    const raw = await response.text();
    if (Buffer.byteLength(raw, "utf8") > MAX_RESPONSE_BYTES) throw new Error(`${code}_response_too_large`);
    let payload = {};
    try { payload = raw ? JSON.parse(raw) : {}; } catch { throw new Error(`${code}_json_invalid`); }
    if (!response.ok) {
      const error = new Error(String(payload.code || `${code}_http_${response.status}`));
      error.code = String(payload.code || `${code}_http_${response.status}`);
      error.status = response.status;
      throw error;
    }
    return payload;
  } finally {
    response?.vibeAgentCleanup?.();
  }
}

export class TraceUploadQueue {
  constructor({ store, rootPath = "", fetchImpl = globalThis.fetch, onStatus, isDevelopment = false } = {}) {
    if (!store || typeof store.tracePath !== "function") throw new Error("vibe_agent_trace_store_required");
    if (typeof fetchImpl !== "function") throw new Error("vibe_agent_trace_fetch_unavailable");
    this.store = store;
    this.rootPath = path.resolve(rootPath || store.rootPath || process.cwd());
    this.fetch = fetchImpl;
    this.isDevelopment = Boolean(isDevelopment);
    this.onStatus = typeof onStatus === "function" ? onStatus : () => {};
    this.pending = new Map();
    this.running = new Map();
    this.abortControllers = new Set();
    this.closed = false;
    this.closing = false;
    this.closePromise = null;
  }

  endpoint(baseUrl, suffix) {
    return endpoint(baseUrl, suffix, { isDevelopment: this.isDevelopment });
  }

  statePath(traceId) {
    return path.join(safeTraceDir(this.rootPath, traceId), UPLOAD_STATE_FILE);
  }

  emit(traceId, status, extra = {}) {
    const event = { schema: TRACE_UPLOAD_SCHEMA, trace_id: requireTraceId(traceId), status, ...extra };
    try { this.onStatus(event); } catch { /* Observer errors never affect Agent. */ }
    return event;
  }

  async request(url, init, timeoutMs = 35_000) {
    if (this.closed) throw new Error("vibe_agent_trace_upload_queue_closed");
    const controller = new AbortController();
    this.abortControllers.add(controller);
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    timer.unref?.();
    try {
      const response = await this.fetch(url, { ...init, signal: controller.signal });
      let cleaned = false;
      const cleanup = () => {
        if (cleaned) return;
        cleaned = true;
        clearTimeout(timer);
        this.abortControllers.delete(controller);
      };
      try {
        Object.defineProperty(response, "vibeAgentCleanup", {
          value: cleanup,
          configurable: true,
        });
      } catch {
        // Non-extensible test doubles still get the timeout; clean it up on
        // the next turn so a successful tiny response does not retain state.
        queueMicrotask(cleanup);
      }
      return response;
    } catch (error) {
      clearTimeout(timer);
      this.abortControllers.delete(controller);
      throw error;
    }
  }

  async enqueue(traceId, { accountId, baseUrl, headers = {}, bindingToken = "", agentBinding = "", chunkSize = DEFAULT_CHUNK_SIZE, force = false } = {}) {
    if (this.closed || this.closing) throw new Error("vibe_agent_trace_upload_queue_closed");
    const id = requireTraceId(traceId);
    this.endpoint(baseUrl, "/agent-traces/uploads");
    const size = normalizeChunkSize(chunkSize);
    // A second caller cannot safely replace an in-flight upload; it may use
    // `force` after the current attempt settles to rebuild the bundle.
    if (this.running.has(id)) return { trace_id: id, status: "queued" };
    const existing = this.pending.get(id);
    if (existing && !force) {
      // A terminal run may supply a binding after an earlier restart-resume
      // queued the same trace without one. Upgrade the in-memory request
      // before it reaches postBegin; never replace an active upload.
      const suppliedBinding = normalizeAgentBinding(bindingToken || agentBinding);
      if (existing.bindingToken && suppliedBinding && existing.bindingToken !== suppliedBinding) {
        throw new Error("vibe_agent_trace_binding_conflict");
      }
      if (!existing.bindingToken && suppliedBinding) existing.bindingToken = suppliedBinding;
      return { trace_id: id, status: "queued" };
    }
    const request = {
      traceId: id,
      accountId: String(accountId || ""),
      baseUrl: String(baseUrl),
      headers: safeUploadHeaders(headers),
      // The bootstrap binding stays in Main memory. upload.json contains only
      // resumable chunk state and never receives this bearer value.
      bindingToken: normalizeAgentBinding(bindingToken || agentBinding),
      chunkSize: size,
    };
    await this.store.ensure(id, { accountId: request.accountId });
    this.pending.set(id, request);
    if (!this.running.has(id)) {
      const work = this.run(request).finally(() => {
        this.running.delete(id);
        this.pending.delete(id);
      });
      this.running.set(id, work);
      void work.catch(() => {});
    }
    return this.emit(id, "queued");
  }

  async wait(traceId) {
    const work = this.running.get(requireTraceId(traceId));
    if (work) return await work;
    return null;
  }

  async resumePending({ accountId, baseUrl, headers = {}, bindingToken = "", agentBinding = "", limit = 100 } = {}) {
    if (this.closed || this.closing) throw new Error("vibe_agent_trace_upload_queue_closed");
    this.endpoint(baseUrl, "/agent-traces/uploads");
    const count = Number(limit);
    if (!Number.isSafeInteger(count) || count < 1 || count > 500) {
      throw new Error("vibe_agent_trace_resume_limit_invalid");
    }
    const manifests = await this.store.list({ accountId, limit: count });
    const queued = [];
    for (const manifest of manifests) {
      const traceId = String(manifest?.trace_id || "").trim();
      const state = String(manifest?.status || "");
      // A running/waiting trace is still being written. It is enqueued by its
      // terminal handler; resuming it here would upload a moving bundle.
      if (!traceId || state === "running" || state === "waiting_user" || state === "uploaded") continue;
      try {
        queued.push(await this.enqueue(traceId, {
          accountId, baseUrl, headers,
          bindingToken: bindingToken || agentBinding,
        }));
      } catch (error) {
        // One stale/corrupt local trace must not prevent newer traces from
        // being resumed. The caller receives the successfully queued set.
        this.emit(traceId, "failed", {
          code: String(error?.code || error?.message || "resume_failed").replace(/[^A-Za-z0-9_:-]/g, "_").slice(0, 160),
        });
      }
    }
    return { schema: TRACE_UPLOAD_SCHEMA, queued };
  }

  status(traceId) {
    const id = requireTraceId(traceId);
    return this.running.has(id) ? this.emit(id, "uploading") : this.emit(id, "idle");
  }

  async run(request) {
    const { traceId, accountId, baseUrl, headers, bindingToken, chunkSize } = request;
    const directory = safeTraceDir(this.rootPath, traceId);
    let bundle;
    try {
        bundle = await buildBundle(directory);
        const manifest = await this.store.ensure(traceId, { accountId });
      const stateFile = this.statePath(traceId);
      let state = await readJson(stateFile);
      if (state?.status === "uploaded" && state.bundle_sha256 === bundle.bundleSha256) {
        const uploadId = requireUploadId(state.upload_id);
        this.emit(traceId, "uploaded", { upload_id: state.upload_id });
        return { trace_id: traceId, status: "uploaded", upload_id: uploadId, result: state.result };
      }
      let stateUploadValid = false;
      try { requireUploadId(state?.upload_id); stateUploadValid = true; } catch { /* begin a fresh/resumed upload */ }
      if (!state || !stateUploadValid || state.bundle_sha256 !== bundle.bundleSha256 || state.chunk_size !== chunkSize
        || Number(state.total_chunks) !== Math.ceil(bundle.totalBytes / chunkSize)) {
        const begin = await this.postBegin(baseUrl, headers, {
          schema: TRACE_UPLOAD_SCHEMA,
          trace_id: traceId,
          trace_schema: manifest.schema,
          session_id: manifest.session_id,
          goal_id: manifest.goal_id,
          manifest: withoutCredentials(manifest),
          files: bundle.files.map(({ path: filePath, bytes }) => ({ path: filePath, bytes })),
          total_bytes: bundle.totalBytes,
          chunk_size: chunkSize,
          total_chunks: Math.ceil(bundle.totalBytes / chunkSize),
          bundle_sha256: bundle.bundleSha256,
        }, bindingToken);
        if (begin.bundle_sha256 && String(begin.bundle_sha256).toLowerCase() !== bundle.bundleSha256) {
          throw new Error("vibe_agent_trace_upload_bundle_conflict");
        }
        // The server is the durable upload owner.  A client can lose its
        // local upload.json (profile repair, app reinstall, or a crash) after
        // the server has already committed the bundle.  In that case begin is
        // intentionally idempotent and returns `completed`; do not send any
        // more chunks to an upload that is already terminal.
        if (String(begin.status || "") === "completed") {
          state = {
            schema: TRACE_UPLOAD_SCHEMA,
            trace_id: traceId,
            upload_id: requireUploadId(begin.upload_id ?? begin.id),
            bundle_sha256: bundle.bundleSha256,
            chunk_size: chunkSize,
            total_chunks: Math.ceil(bundle.totalBytes / chunkSize),
            completed_chunks: Array.from({ length: Math.ceil(bundle.totalBytes / chunkSize) }, (_, index) => index),
            status: "uploaded",
            created_at: new Date().toISOString(),
            completed_at: new Date().toISOString(),
            result: withoutCredentials(begin),
          };
          await atomicJson(stateFile, state);
          this.emit(traceId, "uploaded", { upload_id: state.upload_id, result: state.result });
          return { trace_id: traceId, status: "uploaded", upload_id: state.upload_id, result: begin };
        }
        state = {
          schema: TRACE_UPLOAD_SCHEMA,
          trace_id: traceId,
          upload_id: String(begin.upload_id ?? begin.id ?? ""),
          bundle_sha256: bundle.bundleSha256,
          chunk_size: chunkSize,
          total_chunks: Math.ceil(bundle.totalBytes / chunkSize),
          completed_chunks: [],
          created_at: new Date().toISOString(),
        };
        state.upload_id = requireUploadId(state.upload_id);
        await atomicJson(stateFile, state);
      }
      const completed = new Set((Array.isArray(state.completed_chunks) ? state.completed_chunks : []).map(Number));
      const handle = await fsp.open(bundle.bundlePath, "r");
      try {
        for (let index = 0; index < state.total_chunks; index += 1) {
          if (completed.has(index)) continue;
          const offset = index * chunkSize;
          const length = Math.min(chunkSize, bundle.totalBytes - offset);
          const buffer = Buffer.allocUnsafe(length);
          const result = await handle.read(buffer, 0, length, offset);
          if (result.bytesRead !== length) throw new Error("vibe_agent_trace_bundle_read_short");
          await this.putChunk(baseUrl, headers, state, index, buffer, bindingToken);
          completed.add(index);
          state.completed_chunks = [...completed].sort((a, b) => a - b);
          await atomicJson(stateFile, state);
          this.emit(traceId, "uploading", { chunk_index: index, total_chunks: state.total_chunks });
        }
      } finally {
        await handle.close();
      }
      const complete = await this.postComplete(baseUrl, headers, state, bindingToken);
      state.status = "uploaded";
      state.completed_at = new Date().toISOString();
      state.result = withoutCredentials(complete);
      await atomicJson(stateFile, state);
      this.emit(traceId, "uploaded", { upload_id: state.upload_id, result: state.result });
      return { trace_id: traceId, status: "uploaded", upload_id: state.upload_id, result: complete };
    } catch (error) {
      const code = String(error?.code || error?.message || "vibe_agent_trace_upload_failed").replace(/[^A-Za-z0-9_:-]/g, "_").slice(0, 160);
      this.emit(traceId, "failed", { code });
      throw error;
    } finally {
      if (bundle?.bundlePath) await fsp.rm(bundle.bundlePath, { force: true }).catch(() => {});
    }
  }

  async postBegin(baseUrl, headers, body, bindingToken = "") {
    const response = await this.request(this.endpoint(baseUrl, "/agent-traces/uploads"), {
      method: "POST",
      headers: trustedHeaders({ ...headers, "Content-Type": "application/json", Accept: "application/json" }, bindingToken),
      body: JSON.stringify(body),
    });
    return responseJson(response, "vibe_agent_trace_upload_begin");
  }

  async putChunk(baseUrl, headers, state, index, bytes, bindingToken = "") {
    const traceId = requireTraceId(state.trace_id);
    const uploadId = requireUploadId(state.upload_id);
    const url = this.endpoint(baseUrl, `/agent-traces/uploads/${encodeURIComponent(uploadId)}/chunks/${index}`);
    let lastError;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      try {
        const chunkHash = sha256(bytes);
        const response = await this.request(url, {
          method: "PUT",
          headers: trustedHeaders({
            ...headers,
            Accept: "application/json",
            "Content-Type": "application/octet-stream",
            "X-Vibe-Trace-Id": traceId,
            "X-Chunk-SHA256": chunkHash,
            // Kept for early development servers that used the prefixed name.
            "X-Vibe-Chunk-Sha256": chunkHash,
            "Idempotency-Key": `${uploadId}:${index}`,
          }, bindingToken),
          body: bytes,
        }, 60_000);
        await responseJson(response, "vibe_agent_trace_upload_chunk");
        return;
      } catch (error) {
        lastError = error;
        if (this.closed) break;
        const status = Number(error?.status || 0);
        const retryable = !status || status === 408 || status === 429 || status >= 500;
        if (!retryable || attempt >= MAX_ATTEMPTS) break;
        await new Promise((resolve) => {
          const timer = setTimeout(resolve, 250 * attempt);
          timer.unref?.();
        });
      }
    }
    throw lastError;
  }

  async postComplete(baseUrl, headers, state, bindingToken = "") {
    const uploadId = requireUploadId(state.upload_id);
    const url = this.endpoint(baseUrl, `/agent-traces/uploads/${encodeURIComponent(uploadId)}/complete`);
    const response = await this.request(url, {
      method: "POST",
      headers: trustedHeaders({ ...headers, "Content-Type": "application/json", Accept: "application/json" }, bindingToken),
      body: JSON.stringify({
        schema: TRACE_UPLOAD_SCHEMA,
        trace_id: state.trace_id,
        upload_id: uploadId,
        total_chunks: state.total_chunks,
        bundle_sha256: state.bundle_sha256,
        idempotency_key: `${uploadId}:complete`,
      }),
    });
    return responseJson(response, "vibe_agent_trace_upload_complete");
  }

  async close({ drainMs = 0 } = {}) {
    if (this.closePromise) return this.closePromise;
    const timeout = Number(drainMs);
    if (!Number.isSafeInteger(timeout) || timeout < 0 || timeout > 30_000) {
      throw new Error("vibe_agent_trace_upload_drain_invalid");
    }
    // Stop new work while allowing already-started uploads to finish. This is
    // important during app quit: Host cleanup may enqueue the final aborted
    // Trace immediately before the queue is closed.
    this.closing = true;
    this.closePromise = (async () => {
      const running = [...this.running.values()];
      if (timeout > 0 && running.length) {
        await Promise.race([
          Promise.allSettled(running),
          new Promise((resolve) => {
            const timer = setTimeout(resolve, timeout);
            timer.unref?.();
          }),
        ]);
      }
      this.closed = true;
      for (const controller of this.abortControllers) controller.abort();
      await Promise.allSettled([...this.running.values()]);
      this.pending.clear();
      this.running.clear();
      this.closing = false;
    })();
    return this.closePromise;
  }
}

export const traceUploadConstants = {
  TRACE_UPLOAD_SCHEMA,
  DEFAULT_CHUNK_SIZE,
  MAX_CHUNK_SIZE,
  BUNDLE_FILE,
  AGENT_BINDING_HEADER,
  MAX_AGENT_BINDING_LENGTH,
};
