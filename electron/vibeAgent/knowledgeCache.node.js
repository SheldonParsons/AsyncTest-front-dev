import { createHash, randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import fs from "node:fs/promises";
import path from "node:path";

const SHA256 = /^[0-9a-f]{64}$/;
const MAX_RESOURCE_BYTES = 256 * 1024 * 1024;

async function fileDigest(file) {
  const hash = createHash("sha256");
  for await (const chunk of createReadStream(file)) hash.update(chunk);
  return hash.digest("hex");
}

function boundHandle(value, { accountId, projectId, sessionId }) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.schema !== "resource_handle.v1"
    || value.provider_id !== "knowledge") throw new Error("vibe_agent_resource_handle_invalid");
  const digest = String(value.content_hash || "").toLowerCase();
  const version = String(value.version || "").toLowerCase();
  const bytes = Number(value.byte_size);
  if (!SHA256.test(digest) || version !== digest || !Number.isSafeInteger(bytes) || bytes < 0 || bytes > MAX_RESOURCE_BYTES
    || String(value.actor_id) !== String(accountId)
    || String(value.project_id) !== String(projectId)
    || String(value.session_id) !== String(sessionId)
    || !String(value.resource_id || "")
    || !Array.isArray(value.allowed_capabilities)
    || !value.allowed_capabilities.includes("knowledge.download_source")) throw new Error("vibe_agent_resource_handle_identity_drift");
  return { ...value, content_hash: digest, byte_size: bytes };
}

export class KnowledgeResourceCache {
  constructor({ rootPath } = {}) {
    if (!path.isAbsolute(String(rootPath || ""))) throw new Error("vibe_agent_knowledge_cache_root_invalid");
    this.rootPath = path.resolve(rootPath);
    this.inflight = new Map();
  }

  async materialize({ client, handle, accountId, projectId, sessionId, signal } = {}) {
    const resource = boundHandle(handle, { accountId, projectId, sessionId });
    if (!client || typeof client.downloadResource !== "function") throw new Error("vibe_agent_knowledge_download_unavailable");
    // Scope deduplication by the immutable handle identity. A content hash
    // alone must not make one account/session's authorization stand in for
    // another's concurrent download.
    const inflightKey = [
      String(accountId), String(projectId), String(sessionId),
      String(resource.resource_id), resource.content_hash,
    ].join(":");
    const existing = this.inflight.get(inflightKey);
    // A shared task must not inherit one caller's abort signal. Reuse only
    // when both callers supplied the same signal object (or both omitted it).
    if (!existing || existing.signal !== signal) {
      const task = this.#materialize({ client, resource, signal })
        .finally(() => {
          if (this.inflight.get(inflightKey)?.task === task) this.inflight.delete(inflightKey);
        });
      this.inflight.set(inflightKey, { signal, task });
    }
    return this.inflight.get(inflightKey).task;
  }

  async #materialize({ client, resource, signal }) {
    await fs.mkdir(this.rootPath, { recursive: true, mode: 0o700 });
    const target = path.join(this.rootPath, `${resource.content_hash}.md`);
    try {
      const stat = await fs.stat(target);
      if (stat.isFile() && stat.size === resource.byte_size
        && await fileDigest(target) === resource.content_hash) return target;
      await fs.unlink(target);
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }

    const temporary = path.join(this.rootPath, `.${resource.content_hash}.${process.pid}.${randomUUID()}.tmp`);
    let file;
    try {
      const response = await client.downloadResource({ handle: resource, signal });
      const expectedHash = String(response.headers.get("x-content-hash") || "").toLowerCase();
      const etag = String(response.headers.get("etag") || "").replace(/^W\//, "").replace(/^"|"$/g, "").toLowerCase();
      const length = Number(response.headers.get("content-length"));
      if (expectedHash !== resource.content_hash || etag !== resource.content_hash
        || length !== resource.byte_size || !response.headers.get("content-disposition")
        || !response.body) throw new Error("vibe_agent_knowledge_download_headers_invalid");
      file = await fs.open(temporary, "wx", 0o600);
      const hash = createHash("sha256");
      let bytes = 0;
      try {
        for await (const chunk of response.body) {
          signal?.throwIfAborted?.();
          const buffer = Buffer.from(chunk);
          bytes += buffer.length;
          if (bytes > resource.byte_size) throw new Error("vibe_agent_knowledge_download_size_invalid");
          hash.update(buffer);
          await file.write(buffer);
        }
      } finally {
        response.vibeAgentCleanup?.();
      }
      await file.sync();
      await file.close();
      file = undefined;
      if (bytes !== resource.byte_size || hash.digest("hex") !== resource.content_hash) {
        throw new Error("vibe_agent_knowledge_download_hash_invalid");
      }
      await fs.rename(temporary, target);
      return target;
    } catch (error) {
      await file?.close().catch(() => undefined);
      await fs.unlink(temporary).catch(() => undefined);
      throw error;
    }
  }
}
