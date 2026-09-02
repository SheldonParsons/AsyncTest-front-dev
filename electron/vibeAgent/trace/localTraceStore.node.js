import nodeFs from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import os from "node:os";
import { randomUUID } from "node:crypto";
import readline from "node:readline";

import {
  TRACE_SCHEMA,
  canonicalTraceEnvelope,
  newSpanId,
  newTraceId,
  safeTraceName,
  sha256,
  withoutCredentials,
} from "./traceModel.mjs";

const DEFAULT_ROOT = path.join(os.tmpdir(), "asynctest-vibe-agent-traces");
const MANIFEST_FILE = "manifest.json";
const EVENTS_FILE = "events.jsonl";
const PAYLOAD_DIR = "payload";
const UPLOAD_FILE = "upload.json";
const MAX_TRACE_ID = 128;
const MAX_LIST = 500;
const MAX_PAYLOAD_BYTES = 256 * 1024 * 1024;
const MAX_ATTRIBUTE_BYTES = 4 * 1024 * 1024;
const MAX_TAIL_REPAIR_BYTES = 4 * 1024 * 1024;
const MAX_DETAIL_PAYLOAD_BYTES = 8 * 1024 * 1024;
const MAX_DETAIL_TOTAL_PAYLOAD_BYTES = 64 * 1024 * 1024;

function accountId(value) {
  const result = String(value ?? "").trim();
  if (!result || result.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(result)) {
    throw new Error("vibe_agent_trace_account_id_invalid");
  }
  return result;
}

function id(value, label = "trace_id") {
  const text = String(value ?? "").trim();
  if (!text || text.length > MAX_TRACE_ID || !/^[A-Za-z0-9._:-]+$/.test(text)) {
    throw new Error(`vibe_agent_trace_${label}_invalid`);
  }
  return text;
}

function rootChild(root, child) {
  const resolvedRoot = path.resolve(root);
  const target = path.resolve(root, child);
  const relative = path.relative(resolvedRoot, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("vibe_agent_trace_path_invalid");
  }
  return target;
}

function payloadChild(traceRoot, payloadRef) {
  const relative = String(payloadRef ?? "").replaceAll("\\", "/");
  const parts = relative.split("/");
  if (parts.length !== 2 || parts[0] !== PAYLOAD_DIR || !parts[1]
    || parts[1] === "." || parts[1] === "..") {
    throw new Error("vibe_agent_trace_payload_path_invalid");
  }
  return rootChild(traceRoot, relative);
}

function traceDir(root, traceId) {
  // Encode the logical ID so the same store works on POSIX and Windows (where
  // a colon is not a valid filename character).
  return rootChild(root, encodeURIComponent(id(traceId)));
}

function payloadFileName(sequence, name) {
  return `${String(sequence).padStart(8, "0")}-${safeTraceName(name, "payload")}.json`;
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

async function readJson(filePath, fallback = null) {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8"));
  } catch {
    return fallback;
  }
}

async function reconcileSequence(directory, manifest) {
  const eventsPath = path.join(directory, EVENTS_FILE);
  try { await fs.access(eventsPath); } catch { return manifest; }
  const input = nodeFs.createReadStream(eventsPath, { encoding: "utf8", highWaterMark: 256 * 1024 });
  input.once("error", () => {});
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let highest = 0;
  let invalidTail = false;
  try {
    for await (const line of lines) {
      if (invalidTail && line.trim()) {
        // A malformed line followed by another event is corruption in the
        // middle of the journal, not a crash-truncated tail.  Do not skip it
        // and silently renumber later events.
        throw new Error("vibe_agent_trace_journal_corrupt");
      }
      try {
        const event = JSON.parse(line);
        if (!event || typeof event !== "object" || Array.isArray(event)
          || !Number.isSafeInteger(event.sequence) || event.sequence < 1
          || event.sequence <= highest) {
          invalidTail = true;
        } else {
          highest = event.sequence;
        }
      } catch {
        invalidTail = true;
      }
    }
  } finally {
    lines.close();
    input.destroy();
  }
  // A crash can leave a valid final JSON event without its newline, or a
  // partially written JSON tail.  Normalize that tail before the next append;
  // otherwise the next event would be concatenated to invalid JSON forever.
  try {
    const stat = await fs.stat(eventsPath);
    if (stat.size > 0) {
      const handle = await fs.open(eventsPath, "r");
      try {
        const last = Buffer.alloc(1);
        await handle.read(last, 0, 1, stat.size - 1);
        if (last[0] !== 0x0a) {
          // Event payloads live in separate files, so the JSONL envelope is
          // expected to be small.  Read only a bounded tail while repairing a
          // crash-truncated final line; never load a multi-hundred-MB journal
          // merely to find its last newline.
          const start = Math.max(0, stat.size - MAX_TAIL_REPAIR_BYTES);
          const bytes = Buffer.alloc(stat.size - start);
          await handle.read(bytes, 0, bytes.length, start);
          const newline = bytes.lastIndexOf(0x0a);
          const tail = bytes.subarray(newline + 1).toString("utf8").trim();
          let valid = false;
          try { JSON.parse(tail); valid = Boolean(tail); } catch { /* partial tail */ }
          if (valid) {
            await fs.appendFile(eventsPath, "\n", { encoding: "utf8" });
          } else {
            // If the incomplete line is larger than the bounded tail, keep
            // only the last known-good prefix.  A later append then starts at
            // a clean JSONL boundary.
            const truncateAt = newline >= 0 ? start + newline + 1 : start;
            await fs.truncate(eventsPath, truncateAt);
          }
        }
      } finally {
        await handle.close();
      }
    }
  } catch {
    // A missing/locked journal is handled by the normal trace failure path.
  }
  if (highest + 1 > Number(manifest.next_sequence)) {
    manifest.next_sequence = highest + 1;
    manifest.event_count = Math.max(Number(manifest.event_count || 0), highest);
  }
  return manifest;
}

function serializePayload(payload) {
  const clean = withoutCredentials(payload);
  const text = typeof clean === "string" ? clean : JSON.stringify(clean);
  if (Buffer.byteLength(text ?? "", "utf8") > MAX_PAYLOAD_BYTES) throw new Error("vibe_agent_trace_payload_too_large");
  return text ?? "null";
}

function boundedText(value, label, max = 512) {
  const text = String(value ?? "");
  if (text.length > max) throw new Error(`vibe_agent_trace_${label}_too_large`);
  return text;
}

function normalizeManifest(manifest, traceId) {
  if (!manifest || manifest.schema !== TRACE_SCHEMA || String(manifest.trace_id) !== traceId) {
    throw new Error("vibe_agent_trace_manifest_invalid");
  }
  if (!Number.isSafeInteger(Number(manifest.next_sequence)) || Number(manifest.next_sequence) < 1) manifest.next_sequence = 1;
  return manifest;
}

function assertAccount(manifest, expectedAccountId) {
  const expected = accountId(expectedAccountId);
  if (String(manifest?.account_id || "") !== expected) throw new Error("vibe_agent_trace_account_drift");
}

function assertProject(manifest, expectedProjectId) {
  const expected = String(expectedProjectId ?? "").trim();
  if (expected && String(manifest?.project_id || "") !== expected) {
    throw new Error("vibe_agent_trace_project_drift");
  }
}

export class LocalTraceStore {
  constructor({ rootPath = DEFAULT_ROOT } = {}) {
    this.rootPath = path.resolve(rootPath);
    this.chains = new Map();
    this.manifests = new Map();
  }

  tracePath(traceId) {
    return traceDir(this.rootPath, traceId);
  }

  async create({ traceId = newTraceId(), accountId: rawAccountId, sessionId = "", goalId = "", runId = "", projectId = "", metadata = {} } = {}) {
    const resolvedId = id(traceId);
    const owner = accountId(rawAccountId);
    const directory = this.tracePath(resolvedId);
    const manifestFile = path.join(directory, MANIFEST_FILE);
    await fs.mkdir(path.join(directory, PAYLOAD_DIR), { recursive: true, mode: 0o700 });
    let existingRaw;
    try {
      existingRaw = await fs.readFile(manifestFile, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw new Error("vibe_agent_trace_manifest_unavailable");
    }
    if (existingRaw !== undefined) {
      let existing;
      try { existing = JSON.parse(existingRaw); } catch { throw new Error("vibe_agent_trace_manifest_invalid"); }
      const manifest = normalizeManifest(existing, resolvedId);
      // A renderer may know an old trace id from a visible event, but it must
      // not be able to attach a different run/session/goal to that chain.  An
      // omitted identity keeps the low-level trace API usable for inspection;
      // when Main supplies one, a mismatch is a hard boundary failure.
      for (const [field, expected] of [
        ["account_id", owner],
        ["session_id", sessionId],
        ["goal_id", goalId],
        ["run_id", runId],
        ["project_id", projectId],
      ]) {
        const value = String(expected ?? "").trim();
        if (value && String(manifest[field] ?? "") !== value) {
          throw new Error("vibe_agent_trace_identity_conflict");
        }
      }
      if (projectId && !String(manifest.project_id || "")) {
        manifest.project_id = String(projectId);
        await atomicWrite(manifestFile, JSON.stringify(manifest, null, 2));
      }
      this.manifests.set(resolvedId, manifest);
      return { ...manifest };
    }
    const cleanMetadata = withoutCredentials(metadata);
    if (Buffer.byteLength(JSON.stringify(cleanMetadata), "utf8") > MAX_ATTRIBUTE_BYTES) throw new Error("vibe_agent_trace_metadata_too_large");
    const manifest = {
      schema: TRACE_SCHEMA,
      trace_id: resolvedId,
      account_id: owner,
      session_id: String(sessionId ?? ""),
      goal_id: String(goalId ?? ""),
      run_id: String(runId ?? ""),
      project_id: String(projectId ?? ""),
      execution_host: "electron",
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      next_sequence: 1,
      event_count: 0,
      status: "running",
      metadata: cleanMetadata,
    };
    await atomicWrite(manifestFile, JSON.stringify(manifest, null, 2));
    await fs.writeFile(path.join(directory, EVENTS_FILE), "", { encoding: "utf8", mode: 0o600 });
    this.manifests.set(resolvedId, manifest);
    return { ...manifest };
  }

  async ensure(traceId, { accountId: rawAccountId, projectId: expectedProjectId } = {}) {
    const resolvedId = id(traceId);
    const cached = this.manifests.get(resolvedId);
    if (cached) {
      if (rawAccountId !== undefined) assertAccount(cached, rawAccountId);
      if (expectedProjectId !== undefined) assertProject(cached, expectedProjectId);
      return cached;
    }
    const directory = this.tracePath(resolvedId);
    const manifest = normalizeManifest(await readJson(path.join(directory, MANIFEST_FILE)), resolvedId);
    if (rawAccountId !== undefined) assertAccount(manifest, rawAccountId);
    if (expectedProjectId !== undefined) assertProject(manifest, expectedProjectId);
    await reconcileSequence(directory, manifest);
    this.manifests.set(resolvedId, manifest);
    return manifest;
  }

  async updateMetadata(traceId, { accountId: rawAccountId, projectId: expectedProjectId, metadata = {} } = {}) {
    const resolvedId = id(traceId);
    return this.enqueue(resolvedId, async () => {
      const manifest = await this.ensure(resolvedId, {
        accountId: rawAccountId,
        ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
      });
      const clean = withoutCredentials(metadata);
      if (!clean || typeof clean !== "object" || Array.isArray(clean)) {
        throw new Error("vibe_agent_trace_metadata_invalid");
      }
      const merged = { ...(manifest.metadata || {}), ...clean };
      if (Buffer.byteLength(JSON.stringify(merged), "utf8") > MAX_ATTRIBUTE_BYTES) {
        throw new Error("vibe_agent_trace_metadata_too_large");
      }
      manifest.metadata = merged;
      manifest.updated_at = new Date().toISOString();
      await atomicWrite(path.join(this.tracePath(resolvedId), MANIFEST_FILE), JSON.stringify(manifest, null, 2));
      return { ...manifest };
    });
  }

  enqueue(traceId, task) {
    const resolvedId = id(traceId);
    const previous = this.chains.get(resolvedId) ?? Promise.resolve();
    const next = previous.then(task);
    this.chains.set(resolvedId, next.catch(() => {}));
    return next;
  }

  async append({ traceId, accountId: rawAccountId, projectId: expectedProjectId, kind = "event", name = "agent.event", spanId = newSpanId(), parentSpanId = "", status = "ok", attributes = {}, payload } = {}) {
    const resolvedId = id(traceId);
    return this.enqueue(resolvedId, async () => {
      const manifest = await this.ensure(resolvedId, {
        accountId: rawAccountId,
        ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
      });
      const resolvedKind = boundedText(kind, "kind", 64);
      const resolvedName = boundedText(name, "name", 256);
      const resolvedSpan = boundedText(spanId, "span_id", 256);
      const resolvedParent = boundedText(parentSpanId, "parent_span_id", 256);
      const cleanAttributes = withoutCredentials(attributes);
      if (Buffer.byteLength(JSON.stringify(cleanAttributes), "utf8") > MAX_ATTRIBUTE_BYTES) throw new Error("vibe_agent_trace_attributes_too_large");
      const sequence = Number(manifest.next_sequence);
      const directory = this.tracePath(resolvedId);
      let payloadRef;
      let payloadSha256;
      let payloadBytes;
      if (payload !== undefined) {
        const serialized = serializePayload(payload);
        const fileName = payloadFileName(sequence, resolvedName);
        await atomicWrite(path.join(directory, PAYLOAD_DIR, fileName), serialized);
        payloadRef = `${PAYLOAD_DIR}/${fileName}`;
        payloadBytes = Buffer.byteLength(serialized, "utf8");
        payloadSha256 = sha256(serialized);
      }
      const event = canonicalTraceEnvelope({
        traceId: resolvedId,
        sessionId: manifest.session_id,
        goalId: manifest.goal_id,
        runId: manifest.run_id,
        sequence,
        kind: resolvedKind,
        name: resolvedName,
        spanId: resolvedSpan,
        parentSpanId: resolvedParent,
        status,
        attributes: cleanAttributes,
        payloadRef,
        payloadSha256,
        payloadBytes,
      });
      await fs.appendFile(path.join(directory, EVENTS_FILE), `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
      manifest.next_sequence = sequence + 1;
      manifest.event_count = Number(manifest.event_count || 0) + 1;
      manifest.updated_at = new Date().toISOString();
      await atomicWrite(path.join(directory, MANIFEST_FILE), JSON.stringify(manifest, null, 2));
      return { ...event };
    });
  }

  async finish({ traceId, accountId: rawAccountId, projectId: expectedProjectId, status = "ok", attributes = {}, payload } = {}) {
    const event = await this.append({
      traceId,
      accountId: rawAccountId,
      ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
      kind: "span_end",
      name: "agent.run.completed",
      status,
      attributes,
      payload,
    });
    await this.enqueue(traceId, async () => {
      const manifest = await this.ensure(traceId, {
        accountId: rawAccountId,
        ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
      });
      manifest.status = String(status);
      manifest.updated_at = new Date().toISOString();
      await atomicWrite(path.join(this.tracePath(traceId), MANIFEST_FILE), JSON.stringify(manifest, null, 2));
    });
    // The files remain the durable Trace source; release the hot manifest so
    // long-running clients do not retain one object per completed Goal.
    this.manifests.delete(id(traceId));
    return event;
  }

  async list({ accountId: rawAccountId, limit = MAX_LIST } = {}) {
    const owner = accountId(rawAccountId);
    const count = Number(limit);
    if (!Number.isSafeInteger(count) || count < 1 || count > MAX_LIST) throw new Error("vibe_agent_trace_list_limit_invalid");
    let entries = [];
    try { entries = await fs.readdir(this.rootPath, { withFileTypes: true }); } catch { return []; }
    const manifests = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      const manifest = await readJson(path.join(this.rootPath, entry.name, MANIFEST_FILE));
      if (!manifest) continue;
      try {
        const normalized = normalizeManifest(manifest, id(manifest.trace_id));
        if (String(normalized.account_id || "") === owner) manifests.push(normalized);
      } catch { /* ignore corrupt records */ }
    }
    manifests.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    return manifests.slice(0, count).map((item) => ({ ...item }));
  }

  async detail(traceId, { accountId: rawAccountId, projectId: expectedProjectId, includePayload = true, afterSequence = 0, limit = 2_000 } = {}) {
    const resolvedId = id(traceId);
    const manifest = await this.ensure(resolvedId, {
      accountId: rawAccountId,
      ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
    });
    const cursor = Number(afterSequence);
    const count = Number(limit);
    if (!Number.isSafeInteger(cursor) || cursor < 0 || !Number.isSafeInteger(count) || count < 1 || count > 10_000) {
      throw new Error("vibe_agent_trace_detail_range_invalid");
    }
    const events = [];
    let expandedPayloadBytes = 0;
    let hasMore = false;
    const eventsPath = path.join(this.tracePath(resolvedId), EVENTS_FILE);
    let input;
    try {
      await fs.access(eventsPath);
      input = nodeFs.createReadStream(eventsPath, { encoding: "utf8", highWaterMark: 256 * 1024 });
    } catch {
      return { manifest: { ...manifest }, events: [], next_sequence: cursor, has_more: false };
    }
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        let event;
        try { event = JSON.parse(line); } catch { continue; }
        if (!Number.isSafeInteger(event?.sequence) || event.sequence <= cursor) continue;
        if (events.length >= count) { hasMore = true; break; }
        if (includePayload && event.payload_ref) {
          const payloadPath = payloadChild(this.tracePath(resolvedId), event.payload_ref);
          let payloadBytes = Number(event.payload_bytes || 0);
          if (!payloadBytes) {
            payloadBytes = Number((await fs.stat(payloadPath).catch(() => ({ size: 0 }))).size || 0);
          }
          if (Number.isFinite(payloadBytes) && payloadBytes >= 0
            && payloadBytes <= MAX_DETAIL_PAYLOAD_BYTES
            && expandedPayloadBytes + payloadBytes <= MAX_DETAIL_TOTAL_PAYLOAD_BYTES) {
            event.payload = await readJson(payloadPath, null);
            if (event.payload === null) {
              try { event.payload = await fs.readFile(payloadPath, "utf8"); } catch { event.payload = "[payload unavailable]"; }
            }
            expandedPayloadBytes += payloadBytes;
          } else {
            event.payload = {
              schema: "vibe_agent_trace_payload_omitted.v1",
              bytes: payloadBytes,
              reason: "payload_too_large_for_detail",
              payload_ref: String(event.payload_ref),
            };
          }
        }
        events.push(event);
      }
    } finally {
      lines.close();
      input.destroy();
    }
    return {
      manifest: { ...manifest },
      events,
      next_sequence: events.length ? events.at(-1).sequence : cursor,
      has_more: hasMore,
    };
  }

  async readPayload(traceId, payloadRef, { accountId: rawAccountId, projectId: expectedProjectId } = {}) {
    await this.ensure(traceId, {
      accountId: rawAccountId,
      ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
    });
    const target = payloadChild(this.tracePath(traceId), payloadRef);
    return await fs.readFile(target, "utf8");
  }

  async export(traceId, destinationPath, { accountId: rawAccountId, projectId: expectedProjectId } = {}) {
    const resolvedId = id(traceId);
    await this.ensure(resolvedId, {
      accountId: rawAccountId,
      ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
    });
    const source = this.tracePath(resolvedId);
    const rawDestination = String(destinationPath ?? "").trim();
    if (!rawDestination || rawDestination === "." || rawDestination === "..") throw new Error("vibe_agent_trace_export_path_invalid");
    const destination = path.resolve(rawDestination);
    if (destination === source || destination.startsWith(`${source}${path.sep}`)) throw new Error("vibe_agent_trace_export_path_invalid");
    await fs.cp(source, destination, { recursive: true, errorOnExist: true, force: false });
    return { trace_id: resolvedId, path: destination };
  }

  async remove(traceId, { accountId: rawAccountId, projectId: expectedProjectId } = {}) {
    const resolvedId = id(traceId);
    await this.enqueue(resolvedId, async () => {
      await this.ensure(resolvedId, {
        accountId: rawAccountId,
        ...(expectedProjectId === undefined ? {} : { projectId: expectedProjectId }),
      });
      await fs.rm(this.tracePath(resolvedId), { recursive: true, force: true });
      this.manifests.delete(resolvedId);
    });
    return { trace_id: resolvedId, removed: true };
  }

  async close() {
    await Promise.allSettled([...this.chains.values()]);
    this.chains.clear();
  }
}

export const localTraceConstants = {
  TRACE_SCHEMA,
  MANIFEST_FILE,
  EVENTS_FILE,
  PAYLOAD_DIR,
  UPLOAD_FILE,
  MAX_PAYLOAD_BYTES,
  MAX_DETAIL_PAYLOAD_BYTES,
  MAX_DETAIL_TOTAL_PAYLOAD_BYTES,
};
