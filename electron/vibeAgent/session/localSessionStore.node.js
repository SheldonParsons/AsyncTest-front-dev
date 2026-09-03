/**
 * Electron-owned conversation journal for the client Agent.
 *
 * A session is a local append-only message log. The server is not needed to
 * keep the Agent alive; Knowledge calls carry only the session identity and
 * the current request. Writes are serialized per session and use atomic
 * manifest updates, so a renderer reload can attach without replaying a
 * provider call.
 */
import nodeFs from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";
import readline from "node:readline";

import { withoutCredentials } from "../trace/traceModel.mjs";

const SCHEMA = "vibe.agent.session.v1";
const EVENT_SCHEMA = "vibe.agent.session_event.v1";
const PI_SESSION_SCHEMA = "vibe.pi_session.v1";
const PI_SESSION_FORMAT_VERSION = 3;
const PI_SESSION_RELATIVE_PATH = "pi-session/session.jsonl";
const ID_PATTERN = /^[A-Za-z0-9._:-]{1,160}$/;
const MAX_EVENT_BYTES = 16 * 1024 * 1024;
const MAX_LOCAL_KEY_INDEX = 10_000;

function accountId(value) {
  const result = String(value ?? "").trim();
  if (!ID_PATTERN.test(result)) throw new Error("vibe_agent_session_account_id_invalid");
  return result;
}

function id(value, name) {
  const text = String(value ?? "").trim();
  if (!ID_PATTERN.test(text)) throw new Error(`vibe_agent_session_${name}_invalid`);
  return text;
}

function text(value, max = 2_000_000) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error("vibe_agent_session_text_invalid");
  }
  const result = String(value ?? "");
  if (result.length > max) throw new Error("vibe_agent_session_text_too_large");
  return result;
}

function safeChild(root, child) {
  const base = path.resolve(root);
  const target = path.resolve(base, child);
  const relative = path.relative(base, target);
  if (!relative || relative === ".." || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
    throw new Error("vibe_agent_session_path_invalid");
  }
  return target;
}

async function atomicWrite(filePath, content) {
  await fs.mkdir(path.dirname(filePath), { recursive: true, mode: 0o700 });
  const temp = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fs.writeFile(temp, content, { encoding: "utf8", mode: 0o600 });
    await fs.rename(temp, filePath);
  } catch (error) {
    await fs.rm(temp, { force: true }).catch(() => {});
    throw error;
  }
}

async function findEventByLocalKey(filePath, localKey) {
  const wanted = String(localKey || '').trim()
  if (!wanted) return null
  let input
  input = nodeFs.createReadStream(filePath, { encoding: 'utf8', highWaterMark: 256 * 1024 })
  const lines = readline.createInterface({ input, crlfDelay: Infinity })
  try {
    for await (const line of lines) {
      if (!line.trim()) continue
      const event = JSON.parse(line)
      if (String(event?.meta?.local_event_key || '').trim() === wanted) return event
    }
  } finally {
    lines.close()
    input.destroy()
  }
  return null
}

async function repairPartialTail(filePath) {
  let handle;
  try { handle = await fs.open(filePath, "r+"); }
  catch (error) {
    if (error?.code === "ENOENT") throw new Error("vibe_agent_session_not_found");
    throw error;
  }
  try {
    const stat = await handle.stat();
    const size = Number(stat.size || 0);
    if (!size) return;
    const tailBytes = Math.min(size, MAX_EVENT_BYTES + 1);
    const buffer = Buffer.allocUnsafe(tailBytes);
    await handle.read(buffer, 0, tailBytes, size - tailBytes);
    if (buffer[tailBytes - 1] === 0x0a) return;
    const newline = buffer.lastIndexOf(0x0a);
    const tail = buffer.subarray(newline + 1).toString("utf8").trim();
    let valid = false;
    try { JSON.parse(tail); valid = Boolean(tail); } catch { /* partial tail */ }
    if (valid) {
      await handle.write("\n", size);
    } else {
      await handle.truncate(newline < 0 ? 0 : size - tailBytes + newline + 1);
    }
  } finally {
    await handle.close();
  }
}

async function reconcileJournal(filePath, sessionId) {
  await repairPartialTail(filePath);
  const input = nodeFs.createReadStream(filePath, { encoding: "utf8", highWaterMark: 256 * 1024 });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  let highest = 0;
  let count = 0;
  const localKeys = new Map();
  try {
    for await (const line of lines) {
      if (!line.trim()) continue;
      let event;
      try { event = JSON.parse(line); }
      catch { throw new Error("vibe_agent_session_journal_corrupt"); }
      const sequence = Number(event?.sequence);
      if (event?.schema !== EVENT_SCHEMA || String(event?.session_id || "") !== sessionId
        || !Number.isSafeInteger(sequence) || sequence < 1 || sequence <= highest) {
        throw new Error("vibe_agent_session_journal_corrupt");
      }
      highest = sequence;
      count += 1;
      const localKey = String(event?.meta?.local_event_key || "").trim();
      if (localKey) {
        localKeys.set(localKey, event);
        while (localKeys.size > MAX_LOCAL_KEY_INDEX) localKeys.delete(localKeys.keys().next().value);
      }
    }
  } finally {
    lines.close();
    input.destroy();
  }
  return { highest, count, localKeys };
}

function assertAccount(manifest, expectedAccountId) {
  const expected = accountId(expectedAccountId);
  if (String(manifest?.account_id || "") !== expected) throw new Error("vibe_agent_session_account_drift");
  return expected;
}

function projectHistory(rows) {
  const source = Array.isArray(rows) ? rows : [];
  return source.filter((event) => {
    const role = String(event?.role || "");
    if (!["user", "assistant", "tool", "toolResult"].includes(role)) return false;
    if (role === "assistant" && event?.meta?.clarification) return false;
    // Lifecycle receipts are rendered by the conversation UI, but they are
    // not model-authored turns. Do not feed a cancellation notice back into
    // Pi as if it were an assistant answer on the next user turn.
    if (role === "assistant" && event?.meta?.outcome === "cancelled") return false;
    return !(role === "assistant" && new Set(["context_checkpoint", "language_repair"])
      .has(String(event?.meta?.purpose || "")));
  }).map((event) => {
    const role = event.role === "toolResult" ? "tool" : event.role;
    const structured = role === "tool" ? event?.meta?.tool_result : null;
    return {
      role,
      content: structured?.content ?? String(event.content || ""),
      ...(role === "assistant" && Array.isArray(event?.meta?.tool_calls) ? { tool_calls: event.meta.tool_calls } : {}),
      ...(role === "tool" && event?.meta?.tool_call_id ? { tool_call_id: event.meta.tool_call_id } : {}),
      ...(role === "tool" && event?.meta?.name ? { name: event.meta.name } : {}),
      ...(role === "tool" && structured?.details !== undefined ? { details: structured.details } : {}),
      ...(role === "tool" && structured?.is_error !== undefined ? { is_error: structured.is_error } : {}),
    };
  });
}

export class LocalSessionStore {
  constructor({ rootPath } = {}) {
    if (!rootPath) throw new Error("vibe_agent_session_root_required");
    this.rootPath = path.resolve(rootPath);
    this.chains = new Map();
    this.localKeys = new Map();
    this.reconciled = new Set();
  }

  dir(sessionId) { return safeChild(this.rootPath, id(sessionId, "id")); }
  manifestPath(sessionId) { return path.join(this.dir(sessionId), "manifest.json"); }
  eventsPath(sessionId) { return path.join(this.dir(sessionId), "events.jsonl"); }

  async piSession(sessionId, { accountId: rawAccountId } = {}) {
    const sid = id(sessionId, "id");
    return this.enqueue(sid, async () => {
      const manifest = await this.manifest(sid, { accountId: rawAccountId });
      const expected = {
        schema: PI_SESSION_SCHEMA,
        format_version: PI_SESSION_FORMAT_VERSION,
        relative_path: PI_SESSION_RELATIVE_PATH,
      };
      const stored = manifest.pi_session;
      if (stored === undefined) {
        manifest.pi_session = { ...expected, initialized: false };
        manifest.updated_at = new Date().toISOString();
        await atomicWrite(this.manifestPath(sid), JSON.stringify(manifest, null, 2));
      } else if (!stored || typeof stored !== "object" || Array.isArray(stored)
        || stored.schema !== expected.schema
        || stored.format_version !== expected.format_version
        || stored.relative_path !== expected.relative_path) {
        throw new Error("vibe_agent_pi_session_manifest_invalid");
      }

      const directory = safeChild(this.dir(sid), "pi-session");
      await fs.mkdir(directory, { recursive: true, mode: 0o700 });
      const directoryStat = await fs.lstat(directory);
      if (!directoryStat.isDirectory() || directoryStat.isSymbolicLink()) {
        throw new Error("vibe_agent_pi_session_path_invalid");
      }
      const filePath = safeChild(this.dir(sid), PI_SESSION_RELATIVE_PATH);
      let exists = false;
      try {
        const fileStat = await fs.lstat(filePath);
        if (!fileStat.isFile() || fileStat.isSymbolicLink()) {
          throw new Error("vibe_agent_pi_session_path_invalid");
        }
        exists = true;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      if (!exists && manifest.pi_session?.initialized === true) {
        throw new Error("vibe_agent_pi_session_missing");
      }
      return {
        schema: PI_SESSION_SCHEMA,
        mode: exists ? "open" : "create",
        session_id: sid,
        directory,
        file_path: filePath,
        format_version: PI_SESSION_FORMAT_VERSION,
      };
    });
  }

  async recordPiSession(sessionId, {
    accountId: rawAccountId,
    piSessionId,
    entryCount,
    contextMessageCount,
    lastEntryId = "",
    bootstrapSequence = 0,
    resumed = false,
  } = {}) {
    const sid = id(sessionId, "id");
    const piId = id(piSessionId, "pi_id");
    const entries = Number(entryCount);
    const messages = Number(contextMessageCount);
    const migrated = Number(bootstrapSequence);
    if (!Number.isSafeInteger(entries) || entries < 0
      || !Number.isSafeInteger(messages) || messages < 0
      || !Number.isSafeInteger(migrated) || migrated < 0
      || typeof resumed !== "boolean") {
      throw new Error("vibe_agent_pi_session_state_invalid");
    }
    const leaf = String(lastEntryId || "").trim();
    if (leaf && !/^[A-Za-z0-9._-]{1,160}$/.test(leaf)) {
      throw new Error("vibe_agent_pi_session_state_invalid");
    }
    return this.enqueue(sid, async () => {
      const manifest = await this.manifest(sid, { accountId: rawAccountId });
      const stored = manifest.pi_session;
      if (!stored || stored.schema !== PI_SESSION_SCHEMA
        || stored.format_version !== PI_SESSION_FORMAT_VERSION
        || stored.relative_path !== PI_SESSION_RELATIVE_PATH) {
        throw new Error("vibe_agent_pi_session_manifest_invalid");
      }
      if (stored.initialized === true && stored.pi_session_id
        && stored.pi_session_id !== piId) {
        throw new Error("vibe_agent_pi_session_identity_drift");
      }
      if (migrated > Math.max(0, Number(manifest.next_sequence || 1) - 1)) {
        throw new Error("vibe_agent_pi_session_state_invalid");
      }
      const filePath = safeChild(this.dir(sid), PI_SESSION_RELATIVE_PATH);
      const fileStat = await fs.lstat(filePath).catch((error) => {
        if (error?.code === "ENOENT") throw new Error("vibe_agent_pi_session_missing");
        throw error;
      });
      if (!fileStat.isFile() || fileStat.isSymbolicLink() || fileStat.size <= 0) {
        throw new Error("vibe_agent_pi_session_path_invalid");
      }
      manifest.pi_session = {
        ...stored,
        initialized: true,
        pi_session_id: piId,
        migrated_through_sequence: Math.max(
          Number(stored.migrated_through_sequence || 0),
          migrated,
        ),
        entry_count: entries,
        context_message_count: messages,
        ...(leaf ? { last_entry_id: leaf } : {}),
        last_opened_at: new Date().toISOString(),
        last_open_mode: resumed ? "open" : "create",
      };
      manifest.updated_at = new Date().toISOString();
      await atomicWrite(this.manifestPath(sid), JSON.stringify(manifest, null, 2));
      return manifest.pi_session;
    });
  }

  async create({ sessionId = randomUUID().replaceAll("-", ""), accountId: rawAccountId, projectId = "", title = "", providerId = "", draft = "" } = {}) {
    const sid = id(sessionId, "id");
    const owner = accountId(rawAccountId);
    const directory = this.dir(sid);
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    try {
      const existing = JSON.parse(await fs.readFile(this.manifestPath(sid), "utf8"));
      if (existing?.schema !== SCHEMA) throw new Error("vibe_agent_session_manifest_invalid");
      assertAccount(existing, owner);
      return existing;
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    const manifest = {
      schema: SCHEMA,
      session_id: sid,
      account_id: owner,
      project_id: String(projectId ?? ""),
      title: text(title, 512),
      provider_id: text(providerId, 512).trim(),
      draft: text(draft),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      next_sequence: 1,
      status: "active",
    };
    await atomicWrite(this.manifestPath(sid), JSON.stringify(manifest, null, 2));
    await fs.writeFile(this.eventsPath(sid), "", { encoding: "utf8", mode: 0o600 });
    this.reconciled.add(sid);
    return manifest;
  }

  async manifest(sessionId, { accountId: rawAccountId } = {}) {
    const sid = id(sessionId, "id");
    try {
      const value = JSON.parse(await fs.readFile(this.manifestPath(sid), "utf8"));
      if (!value || value.schema !== SCHEMA) throw new Error("vibe_agent_session_manifest_invalid");
      assertAccount(value, rawAccountId);
      if (!this.reconciled.has(sid)) {
        const journal = await reconcileJournal(this.eventsPath(sid), sid);
        if (Number(value.next_sequence || 1) !== journal.highest + 1 || Number(value.event_count || 0) !== journal.count) {
          value.next_sequence = journal.highest + 1;
          value.event_count = journal.count;
          await atomicWrite(this.manifestPath(sid), JSON.stringify(value, null, 2));
        }
        this.localKeys.set(sid, journal.localKeys);
        this.reconciled.add(sid);
      }
      return value;
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error("vibe_agent_session_not_found");
      throw error;
    }
  }

  enqueue(sessionId, work) {
    const sid = id(sessionId, "id");
    const previous = this.chains.get(sid) || Promise.resolve();
    const next = previous.then(work);
    this.chains.set(sid, next.catch(() => {}));
    return next;
  }

  async append({ sessionId, accountId: rawAccountId, role, content = "", meta = {}, attachments = [], internal = false } = {}) {
    const sid = id(sessionId, "id");
    const normalizedRole = String(role ?? "").trim();
    if (!new Set(["user", "assistant", "tool", "system"]).has(normalizedRole)) throw new Error("vibe_agent_session_role_invalid");
    const normalizedMeta = meta && typeof meta === "object" && !Array.isArray(meta)
      ? withoutCredentials(structuredClone(meta)) : {}
    // Old checkpoint rows remain hidden migration data. Renderer code may not
    // forge either marker and make a normal assistant message disappear.
    if (!internal && (normalizedMeta.private_checkpoint === true
      || String(normalizedMeta.purpose || "") === "context_checkpoint")) {
      throw new Error("vibe_agent_session_private_event_forbidden")
    }
    const localEventKey = String(normalizedMeta.local_event_key || '').trim()
    if (localEventKey.length > 512) throw new Error("vibe_agent_session_event_key_too_large")
    const event = {
      schema: EVENT_SCHEMA,
      event_id: randomUUID().replaceAll("-", ""),
      session_id: sid,
      role: normalizedRole,
      content: text(content),
      meta: normalizedMeta,
      attachments: Array.isArray(attachments)
        ? withoutCredentials(structuredClone(attachments)) : [],
      created_at: new Date().toISOString(),
    };
    const serialized = JSON.stringify(event);
    if (Buffer.byteLength(serialized, "utf8") > MAX_EVENT_BYTES) throw new Error("vibe_agent_session_event_too_large");
    return this.enqueue(sid, async () => {
      const manifest = await this.manifest(sid, { accountId: rawAccountId });
      // Local Pi can emit the same interaction again when a renderer
      // reattaches. A deterministic key makes that replay a read, not a
      // duplicate conversation message.
      if (localEventKey) {
        const index = this.localKeys.get(sid);
        if (index?.has(localEventKey)) return index.get(localEventKey);
        // The hot index is deliberately bounded. A retry of an older event
        // must still consult the durable journal after its key was evicted;
        // otherwise a long session can append a duplicate tool result.
        const existing = index?.size >= MAX_LOCAL_KEY_INDEX
          ? await findEventByLocalKey(this.eventsPath(sid), localEventKey)
          : null
        if (existing) {
          if (index) index.set(localEventKey, existing)
          else this.localKeys.set(sid, new Map([[localEventKey, existing]]));
          return existing
        }
      }
      event.sequence = Number(manifest.next_sequence || 1);
      await fs.appendFile(this.eventsPath(sid), `${JSON.stringify(event)}\n`, { encoding: "utf8", mode: 0o600 });
      manifest.next_sequence = event.sequence + 1;
      manifest.event_count = Number(manifest.event_count || 0) + 1;
      manifest.updated_at = new Date().toISOString();
      try {
        await atomicWrite(this.manifestPath(sid), JSON.stringify(manifest, null, 2));
      } catch (error) {
        // The event may already be durable while the manifest update failed.
        // Force the next operation to recover the sequence from the journal.
        this.reconciled.delete(sid);
        throw error;
      }
      if (localEventKey) {
        const index = this.localKeys.get(sid) || new Map();
        index.set(localEventKey, event);
        // The disk journal remains authoritative; cap the hot dedupe index so
        // a very long local session cannot retain one object per event forever.
        while (index.size > MAX_LOCAL_KEY_INDEX) index.delete(index.keys().next().value);
        this.localKeys.set(sid, index);
      }
      return event;
    });
  }

  async list({ accountId: rawAccountId, projectId = "", limit = 200 } = {}) {
    const owner = accountId(rawAccountId);
    const count = Number(limit);
    if (!Number.isSafeInteger(count) || count < 1 || count > 1000) throw new Error("vibe_agent_session_limit_invalid");
    let entries = [];
    try { entries = await fs.readdir(this.rootPath, { withFileTypes: true }); } catch { return []; }
    const values = [];
    for (const entry of entries) {
      if (!entry.isDirectory()) continue;
      try {
        const manifest = await this.manifest(entry.name, { accountId: owner });
        if (projectId && String(manifest.project_id) !== String(projectId)) continue;
        values.push(manifest);
      } catch (error) {
        const code = String(error?.message || "");
        if (code === "vibe_agent_session_account_drift" || code === "vibe_agent_session_not_found") continue;
        throw error;
      }
    }
    values.sort((a, b) => String(b.updated_at).localeCompare(String(a.updated_at)));
    return values.slice(0, count);
  }

  async events(sessionId, { accountId: rawAccountId, afterSequence = 0, limit = 10000 } = {}) {
    const sid = id(sessionId, "id");
    await this.manifest(sid, { accountId: rawAccountId });
    const start = Number(afterSequence);
    if (!Number.isSafeInteger(start) || start < 0) throw new Error("vibe_agent_session_cursor_invalid");
    const count = Number(limit);
    if (!Number.isSafeInteger(count) || count < 1 || count > 100000) throw new Error("vibe_agent_session_limit_invalid");
    const output = [];
    let input;
    try {
      input = nodeFs.createReadStream(this.eventsPath(sid), { encoding: "utf8", highWaterMark: 256 * 1024 });
    } catch { throw new Error("vibe_agent_session_not_found"); }
    const lines = readline.createInterface({ input, crlfDelay: Infinity });
    try {
      for await (const line of lines) {
        if (!line.trim()) continue;
        try {
          const event = JSON.parse(line);
          if (Number(event.sequence || 0) > start) output.push(event);
        } catch { throw new Error("vibe_agent_session_journal_corrupt"); }
        if (output.length >= count) break;
      }
    } catch (error) {
      if (error?.code === "ENOENT") throw new Error("vibe_agent_session_not_found");
      throw error;
    } finally {
      lines.close();
      input.destroy();
    }
    return output;
  }

  async history(sessionId, { accountId: rawAccountId } = {}) {
    return projectHistory(await this.events(sessionId, {
      accountId: rawAccountId,
      afterSequence: 0,
      limit: 100_000,
    }));
  }

  async update(sessionId, { accountId: rawAccountId, title, providerId, draft } = {}) {
    const sid = id(sessionId, "id");
    return this.enqueue(sid, async () => {
      const manifest = await this.manifest(sid, { accountId: rawAccountId });
      if (title !== undefined) manifest.title = text(title, 512).trim();
      if (providerId !== undefined) manifest.provider_id = text(providerId, 512).trim();
      if (draft !== undefined) manifest.draft = text(draft);
      manifest.updated_at = new Date().toISOString();
      await atomicWrite(this.manifestPath(sid), JSON.stringify(manifest, null, 2));
      return manifest;
    });
  }


  async updateTitle(sessionId, title, options = {}) {
    return this.update(sessionId, { ...options, title });
  }

  async remove(sessionId, { accountId: rawAccountId } = {}) {
    const sid = id(sessionId, "id");
    await this.enqueue(sid, async () => {
      await this.manifest(sid, { accountId: rawAccountId });
      await fs.rm(this.dir(sid), { recursive: true, force: true });
    });
    this.chains.delete(sid);
    this.localKeys.delete(sid);
    this.reconciled.delete(sid);
    return { session_id: sid, removed: true };
  }

  async close() {
    await Promise.allSettled([...this.chains.values()]);
    this.chains.clear();
    this.localKeys.clear();
    this.reconciled.clear();
  }
}

export const localSessionConstants = {
  SCHEMA,
  EVENT_SCHEMA,
  PI_SESSION_SCHEMA,
  PI_SESSION_FORMAT_VERSION,
  PI_SESSION_RELATIVE_PATH,
  MAX_EVENT_BYTES,
  MAX_LOCAL_KEY_INDEX,
};
export { projectHistory as projectLocalSessionHistory };
