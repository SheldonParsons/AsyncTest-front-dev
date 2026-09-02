import fs from "node:fs";
import fsp from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { createHash, randomUUID } from "node:crypto";
import readline from "node:readline";
import {
  codePointLength,
  DEFAULT_MARKDOWN_CHUNK_CHARS,
  MARKDOWN_CHUNK_SCHEMA,
  MAX_AUTHORED_MARKDOWN_CHARS,
} from "./markdownChunkProtocol.node.js";

const WORKSPACE_SCHEMA = "vibe_agent_attachment_workspace.v1";
const ATTACHMENT_SCHEMA = "vibe_agent_attachment.v1";
const ADMISSION_SCHEMA = "vibe_agent_attachment_admission.v1";
const DEFAULT_ROOT = path.join(os.tmpdir(), "asynctest-vibe-agent-attachments");
const MAX_ID = 256;
const MAX_NAME = 512;
// Keep one tool result well below the 275K-token Provider context ceiling even
// for dense CJK Markdown. Large files are read through repeated pages.
const MAX_READ_BYTES = 512 * 1024;
const MAX_WRITE_BYTES = 64 * 1024 * 1024;
const MAX_WORKSPACE_BYTES = 512 * 1024 * 1024;
const MAX_OUTLINE_ITEMS = 2_000;
const MAX_SEARCH_RESULTS = 500;
const MAX_SEARCH_PATTERN = 4_096;
const MAX_ADMITTED_FILES = 10;
const ADMISSION_TTL_MS = 5 * 60 * 1000;
const MAX_ADMISSIONS = 256;

function decodeUtf8Chunk(buffer) {
  // A byte-range boundary may fall in the middle of a multi-byte Chinese
  // character. Read a few look-ahead bytes and only return a complete UTF-8
  // prefix; `next_offset` then remains safe for the following page.
  try {
    for (let end = buffer.length; end >= 0; end -= 1) {
      try {
        if (end === 0 && buffer.length > 0) break;
        const decoder = new TextDecoder("utf-8", { fatal: true });
        return { text: decoder.decode(buffer.subarray(0, end)), bytes: end, valid: true };
      } catch {
        // Drop at most the incomplete trailing code point and try again.
      }
    }
  } catch {
    // Older embedded runtimes may not expose a fatal TextDecoder; fall back
    // to the platform decoder while keeping the byte limit.
  }
  if (buffer.length > 0) {
    return { text: buffer.subarray(0, 1).toString("utf8"), bytes: 1, valid: false };
  }
  return { text: buffer.toString("utf8"), bytes: buffer.length, valid: false };
}

function safeId(value, label = "id") {
  const id = String(value ?? "").trim();
  if (!id || id.length > MAX_ID || !/^[A-Za-z0-9._-]+$/.test(id)) {
    throw new Error(`vibe_agent_attachment_${label}_invalid`);
  }
  return id;
}

function safeName(value, fallback = "attachment.md") {
  const raw = String(value ?? fallback);
  if (raw.includes("\0")) throw new Error("vibe_agent_attachment_name_invalid");
  const name = path.basename(raw).trim();
  if (!name || name === "." || name === ".." || name.length > MAX_NAME) {
    throw new Error("vibe_agent_attachment_name_invalid");
  }
  // The name is echoed into Pi's attachment manifest prompt. Reject control
  // characters so a filename cannot inject a second prompt line or corrupt
  // the JSONL/display contracts.
  if ([...name].some((character) => {
    const code = character.codePointAt(0) || 0;
    return code < 0x20 || code === 0x7f;
  })) throw new Error("vibe_agent_attachment_name_invalid");
  return name;
}

function safeRelative(root, target, code = "path_invalid") {
  const resolvedRoot = path.resolve(root);
  const resolvedTarget = path.resolve(target);
  const relative = path.relative(resolvedRoot, resolvedTarget);
  if (!relative || relative.startsWith(`..${path.sep}`) || relative === ".." || path.isAbsolute(relative)) {
    throw new Error(`vibe_agent_attachment_${code}`);
  }
  return resolvedTarget;
}

function safeWorkspacePath(root, workspaceId) {
  return safeRelative(root, path.join(root, safeId(workspaceId, "workspace_id")), "workspace_path_invalid");
}

function safeAttachmentPath(workspacePath, relativePath) {
  const target = safeRelative(workspacePath, path.join(workspacePath, String(relativePath ?? "")), "path_invalid");
  return target;
}

function normalizeMime(value, name) {
  const mime = String(value ?? "").trim();
  if (mime && mime.length <= 256 && /^[\w.+-]+\/[\w.+-]+$/.test(mime)) return mime;
  if (name.toLowerCase().endsWith(".md")) return "text/markdown";
  return "application/octet-stream";
}

function admissionOwner(value) {
  const owner = String(value ?? "").trim();
  if (!owner || owner.length > 128 || !/^[A-Za-z0-9._:-]+$/.test(owner)) {
    throw new Error("vibe_agent_attachment_admission_owner_invalid");
  }
  return owner;
}

async function rejectSymlinkComponents(sourcePath) {
  // Parent directories such as macOS `/var` can themselves be symlinks; that
  // is normal platform layout and is not a user-selected link. The selected
  // leaf is the security boundary: reject it explicitly before `stat`.
  let stat;
  try { stat = await fsp.lstat(sourcePath); } catch { throw new Error("vibe_agent_attachment_source_unavailable"); }
  if (stat.isSymbolicLink()) throw new Error("vibe_agent_attachment_source_symlink");
}

async function sourceIdentity(rawPath) {
  const raw = String(rawPath ?? "").trim();
  if (!raw || raw.includes("\0")) throw new Error("vibe_agent_attachment_source_path_invalid");
  const sourcePath = path.resolve(raw);
  if (!path.isAbsolute(sourcePath)) throw new Error("vibe_agent_attachment_source_path_invalid");
  await rejectSymlinkComponents(sourcePath);
  let stat;
  try { stat = await fsp.stat(sourcePath); } catch { throw new Error("vibe_agent_attachment_source_unavailable"); }
  if (!stat.isFile()) throw new Error("vibe_agent_attachment_source_not_file");
  const name = safeName(path.basename(sourcePath));
  if (!/\.(?:md|markdown)$/i.test(name)) throw new Error("vibe_agent_attachment_type_unsupported");
  return {
    sourcePath,
    name,
    mime: normalizeMime("", name),
    size: Number(stat.size),
    mtimeMs: Number(stat.mtimeMs),
    ctimeMs: Number(stat.ctimeMs),
    dev: Number(stat.dev),
    ino: Number(stat.ino),
  };
}

function sameSourceIdentity(expected, actual) {
  if (!expected || !actual) return false;
  if (expected.sourcePath !== actual.sourcePath
    || expected.size !== actual.size
    || expected.mtimeMs !== actual.mtimeMs
    || expected.ctimeMs !== actual.ctimeMs) return false;
  // Some Windows filesystems expose zero for dev/ino. Only compare them when
  // the platform supplied a useful value.
  if (expected.dev > 0 && actual.dev > 0 && expected.dev !== actual.dev) return false;
  if (expected.ino > 0 && actual.ino > 0 && expected.ino !== actual.ino) return false;
  return true;
}

async function sha256File(filePath) {
  const hash = createHash("sha256");
  let size = 0;
  await new Promise((resolve, reject) => {
    const input = fs.createReadStream(filePath);
    input.on("data", (chunk) => {
      size += chunk.length;
      hash.update(chunk);
    });
    input.once("error", reject);
    input.once("end", resolve);
  });
  return { sha256: hash.digest("hex"), size };
}

async function atomicWrite(filePath, data, options = {}) {
  await fsp.mkdir(path.dirname(filePath), { recursive: true });
  const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
  try {
    await fsp.writeFile(temporary, data, { encoding: "utf8", mode: 0o600, ...options });
    await fsp.rename(temporary, filePath);
  } catch (error) {
    await fsp.rm(temporary, { force: true }).catch(() => {});
    throw error;
  }
}

async function readJson(filePath, code) {
  let parsed;
  try {
    parsed = JSON.parse(await fsp.readFile(filePath, "utf8"));
  } catch {
    throw new Error(code);
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) throw new Error(code);
  return parsed;
}

async function streamLines(filePath, onLine) {
  const input = fs.createReadStream(filePath, { encoding: "utf8", highWaterMark: 256 * 1024 });
  const lines = readline.createInterface({ input, crlfDelay: Infinity });
  try {
    let lineNumber = 0;
    for await (const line of lines) {
      lineNumber += 1;
      const keepReading = await onLine(String(line), lineNumber);
      if (keepReading === false) {
        lines.close();
        input.destroy();
        break;
      }
    }
  } finally {
    lines.close();
    input.destroy();
  }
}

function normalizeFileInput(file, index) {
  const rawPath = String(file?.path ?? file?.filePath ?? "").trim();
  if (!rawPath || rawPath.includes("\0")) throw new Error("vibe_agent_attachment_source_path_invalid");
  const sourcePath = path.resolve(rawPath);
  if (!path.isAbsolute(sourcePath)) throw new Error("vibe_agent_attachment_source_path_invalid");
  const name = safeName(file?.name ?? path.basename(sourcePath), `attachment-${index + 1}.md`);
  if (!/\.(?:md|markdown)$/i.test(name)) throw new Error("vibe_agent_attachment_type_unsupported");
  return { sourcePath, name, mime: normalizeMime(file?.mime, name) };
}

function manifestPath(workspacePath) {
  return path.join(workspacePath, "manifest.json");
}

function normalizeManifest(manifest) {
  if (!manifest || manifest.schema !== WORKSPACE_SCHEMA || !Array.isArray(manifest.attachments)) {
    throw new Error("vibe_agent_attachment_manifest_invalid");
  }
  return manifest;
}

function assertManifestBinding(manifest, expectedRunId = "", expectedSessionId = "", expectedAccountId = "") {
  const runId = String(expectedRunId || "").trim();
  const sessionId = String(expectedSessionId || "").trim();
  const accountId = String(expectedAccountId || "").trim();
  if (runId && String(manifest.run_id || "") !== runId) {
    throw new Error("vibe_agent_attachment_run_drift");
  }
  if (sessionId && String(manifest.session_id || "") !== sessionId) {
    throw new Error("vibe_agent_attachment_session_drift");
  }
  if (accountId && String(manifest.account_id || "") !== accountId) {
    throw new Error("vibe_agent_attachment_account_drift");
  }
}

export class AttachmentWorkspace {
  constructor({ rootPath = DEFAULT_ROOT } = {}) {
    this.rootPath = path.resolve(rootPath);
    // Admission records are deliberately process-local and short lived. A
    // renderer can display only an opaque token; the source path remains in
    // Main and is resolved again immediately before copying.
    this.admissions = new Map();
  }

  workspacePath(workspaceId) {
    return safeWorkspacePath(this.rootPath, workspaceId);
  }

  pruneAdmissions(now = Date.now()) {
    for (const [token, record] of this.admissions) {
      if (record.expiresAt <= now || record.used) this.admissions.delete(token);
    }
    if (this.admissions.size <= MAX_ADMISSIONS) return;
    const oldest = [...this.admissions.entries()]
      .sort((a, b) => a[1].issuedAt - b[1].issuedAt)
      .slice(0, this.admissions.size - MAX_ADMISSIONS);
    for (const [token] of oldest) this.admissions.delete(token);
  }

  async admit({ ownerId, filePaths = [] } = {}) {
    const owner = admissionOwner(ownerId);
    if (!Array.isArray(filePaths) || filePaths.length < 1 || filePaths.length > MAX_ADMITTED_FILES) {
      throw new Error("vibe_agent_attachment_files_invalid");
    }
    this.pruneAdmissions();
    const now = Date.now();
    const files = [];
    const issued = [];
    try {
      for (const rawPath of filePaths) {
        const identity = await sourceIdentity(rawPath);
        const token = randomUUID();
        const record = {
          token,
          owner,
          ...identity,
          issuedAt: now,
          expiresAt: now + ADMISSION_TTL_MS,
          reserved: false,
          used: false,
        };
        this.admissions.set(token, record);
        issued.push(record);
        files.push({
          schema: ADMISSION_SCHEMA,
          admission_token: token,
          name: identity.name,
          mime: identity.mime,
          size: identity.size,
          last_modified: identity.mtimeMs,
          expires_at: new Date(record.expiresAt).toISOString(),
        });
      }
    } catch (error) {
      for (const record of issued) this.admissions.delete(record.token);
      throw error;
    }
    this.pruneAdmissions(now);
    return {
      schema: ADMISSION_SCHEMA,
      expires_at: new Date(now + ADMISSION_TTL_MS).toISOString(),
      files,
    };
  }

  async resolveAdmissions(files, ownerId) {
    const owner = admissionOwner(ownerId);
    if (!Array.isArray(files) || files.length < 1 || files.length > MAX_ADMITTED_FILES) {
      throw new Error("vibe_agent_attachment_files_invalid");
    }
    this.pruneAdmissions();
    const records = [];
    const resolved = [];
    const seen = new Set();
    try {
      for (let index = 0; index < files.length; index += 1) {
        const item = files[index];
        if (!item || typeof item !== "object" || Array.isArray(item)) {
          throw new Error("vibe_agent_attachment_admission_required");
        }
        const token = String(item.admission_token ?? item.admissionToken ?? "").trim();
        if (!token || seen.has(token)) throw new Error("vibe_agent_attachment_admission_invalid");
        seen.add(token);
        const record = this.admissions.get(token);
        if (!record || record.owner !== owner || record.used || record.reserved || record.expiresAt <= Date.now()) {
          throw new Error("vibe_agent_attachment_admission_expired");
        }
        // A webUtils.getPathForFile caller may retain its path for backwards
        // compatibility, but Main never trusts it: it must exactly match the
        // path captured by the native dialog admission.
        const suppliedPath = item.path ?? item.filePath;
        if (suppliedPath !== undefined && path.resolve(String(suppliedPath)) !== record.sourcePath) {
          throw new Error("vibe_agent_attachment_admission_source_mismatch");
        }
        if (item.name !== undefined && String(item.name) !== record.name) {
          throw new Error("vibe_agent_attachment_admission_name_mismatch");
        }
        if (item.name !== undefined && !/\.(?:md|markdown)$/i.test(String(item.name))) {
          throw new Error("vibe_agent_attachment_type_unsupported");
        }
        record.reserved = true;
        records.push(record);
        const current = await sourceIdentity(record.sourcePath);
        if (!sameSourceIdentity(record, current)) {
          throw new Error("vibe_agent_attachment_source_changed");
        }
        resolved.push({ path: record.sourcePath, name: record.name, mime: record.mime });
      }
      return { records, files: resolved };
    } catch (error) {
      for (const record of records) record.reserved = false;
      throw error;
    }
  }

  releaseAdmissions(records, used = false) {
    for (const record of Array.isArray(records) ? records : []) {
      if (!record) continue;
      if (used) record.used = true;
      record.reserved = false;
      if (used) this.admissions.delete(record.token);
    }
  }

  async create({ workspaceId = randomUUID().replaceAll("-", ""), accountId = "", runId = "", sessionId = "", files = [] } = {}, { admissionRecords = [] } = {}) {
    const id = safeId(workspaceId, "workspace_id");
    const workspacePath = this.workspacePath(id);
    await fsp.mkdir(path.join(workspacePath, "files"), { recursive: true, mode: 0o700 });
    const existingPath = manifestPath(workspacePath);
    let existingRaw;
    try {
      existingRaw = await fsp.readFile(existingPath, "utf8");
    } catch (error) {
      if (error?.code !== "ENOENT") throw new Error("vibe_agent_attachment_manifest_unavailable");
    }
    if (existingRaw !== undefined) {
      let existing;
      try { existing = JSON.parse(existingRaw); } catch { throw new Error("vibe_agent_attachment_manifest_invalid"); }
      const manifest = normalizeManifest(existing);
      // Reusing a known workspace id for another logical run/session would
      // let a renderer or stale recovery path read or mutate the wrong local
      // copy.  Treat the manifest binding as immutable, just like read/write
      // operations do below.
      assertManifestBinding(manifest, runId, sessionId, accountId);
      return manifest;
    }

    if (!Array.isArray(files) || files.length > MAX_ADMITTED_FILES) throw new Error("vibe_agent_attachment_files_invalid");
    if (!String(accountId || "").trim() || !String(runId || "").trim() || !String(sessionId || "").trim()) {
      throw new Error("vibe_agent_attachment_binding_required");
    }
    const attachments = [];
    let workspaceBytes = 0;
    try {
      for (let index = 0; index < files.length; index += 1) {
        const input = normalizeFileInput(files[index], index);
        const admission = Array.isArray(admissionRecords) ? admissionRecords[index] : null;
        if (admission) {
          // Check once more after the destination is prepared and immediately
          // after copy. A changed or replaced source must never be admitted.
          const beforeCopy = await sourceIdentity(admission.sourcePath);
          if (!sameSourceIdentity(admission, beforeCopy)) throw new Error("vibe_agent_attachment_source_changed");
        }
        let stat;
        try {
          const linkStat = await fsp.lstat(input.sourcePath);
          if (linkStat.isSymbolicLink()) throw new Error("vibe_agent_attachment_source_symlink");
          stat = await fsp.stat(input.sourcePath);
        } catch (error) {
          if (String(error?.message).startsWith("vibe_agent_attachment_source_symlink")) throw error;
          throw new Error("vibe_agent_attachment_source_unavailable");
        }
        if (!stat.isFile()) throw new Error("vibe_agent_attachment_source_not_file");
        workspaceBytes += stat.size;
        if (workspaceBytes > MAX_WORKSPACE_BYTES) throw new Error("vibe_agent_attachment_workspace_too_large");
        const attachmentId = `${String(index + 1).padStart(3, "0")}-${randomUUID().replaceAll("-", "").slice(0, 16)}`;
        const relativePath = path.join("files", `${attachmentId}-${input.name}`);
        const targetPath = safeAttachmentPath(workspacePath, relativePath);
        await fsp.copyFile(input.sourcePath, targetPath);
        if (admission) {
          const afterCopy = await sourceIdentity(admission.sourcePath);
          if (!sameSourceIdentity(admission, afterCopy)) throw new Error("vibe_agent_attachment_source_changed");
        }
        try { await fsp.chmod(targetPath, 0o600); } catch {}
        const digest = await sha256File(targetPath);
        attachments.push({
          schema: ATTACHMENT_SCHEMA,
          attachment_id: attachmentId,
          name: input.name,
          mime: input.mime,
          relative_path: relativePath,
          size: digest.size,
          sha256: digest.sha256,
        });
      }
    } catch (error) {
      // A failed batch must not leave orphaned local copies under userData.
      await fsp.rm(workspacePath, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
    const manifest = {
      schema: WORKSPACE_SCHEMA,
      workspace_id: id,
      account_id: String(accountId ?? ""),
      run_id: String(runId ?? ""),
      session_id: String(sessionId ?? ""),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      attachments,
    };
    try {
      await atomicWrite(existingPath, JSON.stringify(manifest, null, 2));
    } catch (error) {
      // A manifest write failure must not leave a copy that no Run can own or
      // clean up later.
      await fsp.rm(workspacePath, { recursive: true, force: true }).catch(() => {});
      throw error;
    }
    return manifest;
  }

  async manifest(workspaceId) {
    const workspacePath = this.workspacePath(workspaceId);
    return normalizeManifest(await readJson(manifestPath(workspacePath), "vibe_agent_attachment_workspace_not_found"));
  }

  async assertBinding(workspaceId, { accountId = "", runId = "", sessionId = "" } = {}) {
    const expectedAccount = String(accountId ?? "").trim();
    const expectedRun = String(runId ?? "").trim();
    const expectedSession = String(sessionId ?? "").trim();
    // A workspace is scoped to one logical Run and one session. Requiring both
    // identities prevents a renderer that knows a session id from borrowing a
    // different Run's local attachment by guessing its workspace id.
    if (!expectedAccount || !expectedRun || !expectedSession) throw new Error("vibe_agent_attachment_binding_required");
    const manifest = await this.manifest(workspaceId);
    if (String(manifest.account_id || "") !== expectedAccount
      || String(manifest.run_id || "") !== expectedRun || String(manifest.session_id || "") !== expectedSession) {
      throw new Error("vibe_agent_attachment_binding_mismatch");
    }
    return manifest;
  }

  async attachment(workspaceId, attachmentId, { expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const manifest = await this.manifest(workspaceId);
    assertManifestBinding(manifest, expectedRunId, expectedSessionId, expectedAccountId);
    const id = safeId(attachmentId, "attachment_id");
    const item = manifest.attachments.find((entry) => entry.attachment_id === id);
    if (!item) throw new Error("vibe_agent_attachment_not_found");
    const workspacePath = this.workspacePath(workspaceId);
    const filePath = safeAttachmentPath(workspacePath, item.relative_path);
    let stat;
    try { stat = await fsp.lstat(filePath); } catch { throw new Error("vibe_agent_attachment_unavailable"); }
    if (!stat.isFile() || stat.isSymbolicLink()) throw new Error("vibe_agent_attachment_path_invalid");
    return { manifest, item, workspacePath, filePath };
  }

  async list(workspaceId, options = {}) {
    const manifest = await this.manifest(workspaceId);
    assertManifestBinding(manifest, options.expectedRunId, options.expectedSessionId, options.expectedAccountId);
    return manifest.attachments.map((item) => ({ ...item }));
  }

  async read({ workspaceId, attachmentId, offset = 0, length = MAX_READ_BYTES, expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const { item, filePath } = await this.attachment(workspaceId, attachmentId, { expectedAccountId, expectedRunId, expectedSessionId });
    const start = Number(offset);
    const requested = Number(length);
    if (!Number.isSafeInteger(start) || start < 0 || !Number.isSafeInteger(requested) || requested < 1 || requested > MAX_READ_BYTES) {
      throw new Error("vibe_agent_attachment_read_range_invalid");
    }
    const handle = await fsp.open(filePath, "r");
    try {
      const stat = await handle.stat();
      const lookAhead = Math.min(3, Math.max(0, Number(stat.size) - start));
      const buffer = Buffer.allocUnsafe(Math.min(requested + lookAhead, Math.max(0, Number(stat.size) - start)));
      const result = await handle.read(buffer, 0, buffer.length, start);
      const bytes = buffer.subarray(0, result.bytesRead);
      const decoded = decodeUtf8Chunk(bytes);
      const consumed = decoded.bytes;
      return {
        schema: ATTACHMENT_SCHEMA,
        attachment_id: item.attachment_id,
        name: item.name,
        mime: item.mime,
        offset: start,
        next_offset: start + consumed,
        eof: start + consumed >= Number(stat.size),
        bytes_read: consumed,
        text: decoded.text,
      };
    } finally {
      await handle.close();
    }
  }

  /** Materialize a local authored source immediately before a Knowledge Tool
   * request. Only verified chunks and a digest are returned to the caller. */
  async authoredChunks({ workspaceId, attachmentId, maxChars, expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const { item, filePath } = await this.attachment(workspaceId, attachmentId, { expectedAccountId, expectedRunId, expectedSessionId });
    const requestedSize = maxChars === undefined ? DEFAULT_MARKDOWN_CHUNK_CHARS : Number(maxChars);
    if (!Number.isSafeInteger(requestedSize) || requestedSize < 1) {
      throw new Error("vibe_agent_attachment_chunk_size_invalid");
    }
    const size = Math.min(requestedSize, 1_000_000);
    const input = fs.createReadStream(filePath, { encoding: "utf8", highWaterMark: 256 * 1024 });
    const hash = createHash("sha256");
    const chunks = [];
    let buffer = "";
    let bufferChars = 0;
    let offset = 0;
    let charCount = 0;
    const emit = (part) => {
      if (!part) return;
      const length = codePointLength(part);
      const start = offset;
      offset += length;
      hash.update(part, "utf8");
      chunks.push({
        schema: MARKDOWN_CHUNK_SCHEMA,
        index: chunks.length,
        start_offset: start,
        end_offset: offset,
        text: part,
        content_hash: createHash("sha256").update(part, "utf8").digest("hex"),
      });
      return length;
    };
    try {
      for await (const piece of input) {
        buffer += String(piece);
        const pieceChars = codePointLength(piece);
        charCount += pieceChars;
        bufferChars += pieceChars;
        if (charCount > MAX_AUTHORED_MARKDOWN_CHARS) throw new Error("vibe_agent_attachment_authored_body_too_large");
        while (bufferChars > size) {
          // Find the cut using code-point count, without retaining a second
          // complete copy of the source. A paragraph boundary is preferred;
          // otherwise the exact budget boundary is used.
          let end = 0;
          let seen = 0;
          while (end < buffer.length && seen < size) {
            const code = buffer.codePointAt(end);
            end += code !== undefined && code > 0xffff ? 2 : 1;
            seen += 1;
          }
          // Match Python's exclusive ``rfind(..., limit)`` used by the
          // server chunk protocol (the JS search position is inclusive).
          const boundary = buffer.lastIndexOf("\n\n", end - 2);
          if (boundary > 0) end = boundary + 2;
          const emittedChars = emit(buffer.slice(0, end));
          bufferChars -= emittedChars;
          buffer = buffer.slice(end);
        }
      }
      emit(buffer);
      if (!chunks.length) throw new Error("vibe_agent_attachment_authored_body_empty");
      const contentHash = hash.digest("hex");
      // The manifest digest is updated by write/edit operations. A mismatch
      // here means the staging file changed while Pi was materializing it.
      if (item.sha256 && item.sha256 !== contentHash) throw new Error("vibe_agent_attachment_source_changed");
      return {
        schema: "knowledge_markdown_authored_source.v1",
        filename: item.name,
        content_hash: contentHash,
        char_count: charCount,
        chunks,
      };
    } catch (error) {
      input.destroy();
      throw error;
    }
  }

  async readLines({ workspaceId, attachmentId, startLine = 1, maxLines = 200, expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const { item, filePath } = await this.attachment(workspaceId, attachmentId, { expectedAccountId, expectedRunId, expectedSessionId });
    const first = Number(startLine);
    const count = Number(maxLines);
    if (!Number.isSafeInteger(first) || first < 1 || !Number.isSafeInteger(count) || count < 1 || count > 10_000) {
      throw new Error("vibe_agent_attachment_line_range_invalid");
    }
    const lines = [];
    let lastLine = first - 1;
    let eof = true;
    let bytes = 0;
    await streamLines(filePath, async (line, lineNumber) => {
      if (lineNumber < first) return;
      if (lines.length >= count) { eof = false; return false; }
      const lineBytes = Buffer.byteLength(line, "utf8") + 1;
      if (bytes + lineBytes > MAX_READ_BYTES) { eof = false; return false; }
      lines.push({ line: lineNumber, text: line });
      bytes += lineBytes;
      lastLine = lineNumber;
    });
    return {
      schema: ATTACHMENT_SCHEMA,
      attachment_id: item.attachment_id,
      name: item.name,
      start_line: first,
      next_line: lastLine + 1,
      eof,
      bytes_read: bytes,
      lines,
    };
  }

  async outline({ workspaceId, attachmentId, maxItems = MAX_OUTLINE_ITEMS, expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const { item, filePath } = await this.attachment(workspaceId, attachmentId, { expectedAccountId, expectedRunId, expectedSessionId });
    const limit = Number(maxItems);
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_OUTLINE_ITEMS) throw new Error("vibe_agent_attachment_outline_limit_invalid");
    const headings = [];
    let truncated = false;
    await streamLines(filePath, async (line, lineNumber) => {
      if (headings.length >= limit) { truncated = true; return false; }
      const match = /^(#{1,6})[ \t]+(.+?)\s*$/.exec(line);
      if (match) headings.push({ line: lineNumber, level: match[1].length, text: match[2] });
    });
    return { schema: ATTACHMENT_SCHEMA, attachment_id: item.attachment_id, name: item.name, headings, truncated };
  }

  async search({ workspaceId, attachmentId, pattern, maxResults = MAX_SEARCH_RESULTS, caseSensitive = false, expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const { item, filePath } = await this.attachment(workspaceId, attachmentId, { expectedAccountId, expectedRunId, expectedSessionId });
    const needle = String(pattern ?? "");
    const limit = Number(maxResults);
    if (!needle || needle.length > MAX_SEARCH_PATTERN || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_SEARCH_RESULTS) {
      throw new Error("vibe_agent_attachment_search_invalid");
    }
    const query = caseSensitive ? needle : needle.toLocaleLowerCase();
    const matches = [];
    let truncated = false;
    let bytes = 0;
    await streamLines(filePath, async (line, lineNumber) => {
      if (matches.length >= limit) { truncated = true; return false; }
      const haystack = caseSensitive ? line : line.toLocaleLowerCase();
      if (haystack.includes(query)) {
        const lineBytes = Buffer.byteLength(line, "utf8") + 1;
        if (bytes + lineBytes > MAX_READ_BYTES) { truncated = true; return false; }
        matches.push({ line: lineNumber, text: line });
        bytes += lineBytes;
      }
    });
    return { schema: ATTACHMENT_SCHEMA, attachment_id: item.attachment_id, name: item.name, pattern: needle, matches, truncated, bytes_read: bytes };
  }

  async write({ workspaceId, attachmentId, content, expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const { item, filePath, manifest } = await this.attachment(workspaceId, attachmentId, { expectedAccountId, expectedRunId, expectedSessionId });
    if (content !== undefined && content !== null
      && typeof content !== "string"
      && !Buffer.isBuffer(content)
      && !(content instanceof Uint8Array)) {
      throw new Error("vibe_agent_attachment_write_content_invalid");
    }
    const text = typeof content === "string"
      ? content
      : Buffer.isBuffer(content)
        ? content.toString("utf8")
        : content instanceof Uint8Array
          ? Buffer.from(content).toString("utf8")
          : "";
    const bytes = Buffer.byteLength(text, "utf8");
    if (bytes > MAX_WRITE_BYTES) throw new Error("vibe_agent_attachment_write_too_large");
    const existingWorkspaceBytes = manifest.attachments.reduce(
      (total, entry) => total + Number(entry?.size || 0), 0,
    );
    if (existingWorkspaceBytes - Number(item.size || 0) + bytes > MAX_WORKSPACE_BYTES) {
      throw new Error("vibe_agent_attachment_workspace_too_large");
    }
    await atomicWrite(filePath, text);
    const digest = await sha256File(filePath);
    item.size = digest.size;
    item.sha256 = digest.sha256;
    manifest.updated_at = new Date().toISOString();
    await atomicWrite(manifestPath(this.workspacePath(workspaceId)), JSON.stringify(manifest, null, 2));
    return { ...item };
  }

  async edit({ workspaceId, attachmentId, replacements = [], expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const { item, filePath, manifest } = await this.attachment(workspaceId, attachmentId, { expectedAccountId, expectedRunId, expectedSessionId });
    if (!Array.isArray(replacements) || !replacements.length || replacements.length > 128) throw new Error("vibe_agent_attachment_replacements_invalid");
    const normalized = replacements.map((entry) => {
      if (!entry || typeof entry !== "object" || Array.isArray(entry)
        || (entry.find !== undefined && typeof entry.find !== "string")
        || (entry.replace !== undefined && typeof entry.replace !== "string")
        || (entry.all !== undefined && typeof entry.all !== "boolean")) {
        throw new Error("vibe_agent_attachment_replacement_invalid");
      }
      const find = entry.find ?? "";
      const replace = entry.replace ?? "";
      if (!find || Buffer.byteLength(find, "utf8") > 256 * 1024 || Buffer.byteLength(replace, "utf8") > MAX_WRITE_BYTES) throw new Error("vibe_agent_attachment_replacement_invalid");
      return { find, replace, all: entry?.all !== false, used: false, matched: false };
    });
    const temporary = `${filePath}.${process.pid}.${randomUUID()}.edit.tmp`;
    const input = fs.createReadStream(filePath, { encoding: "utf8", highWaterMark: 256 * 1024 });
    const output = fs.createWriteStream(temporary, { encoding: "utf8", mode: 0o600 });
    let outputError;
    let outputBytes = 0;
    output.once("error", (error) => { outputError = error; });
    let carry = "";
    const keep = Math.max(...normalized.map((entry) => entry.find.length)) - 1;
    try {
      for await (const chunk of input) {
        const combined = carry + chunk;
        const splitAt = Math.max(0, combined.length - keep);
        const body = combined.slice(0, splitAt);
        carry = combined.slice(splitAt);
        let transformed = body;
        for (const entry of normalized) {
          if (entry.all) {
            const parts = transformed.split(entry.find);
            if (parts.length > 1) entry.matched = true;
            transformed = parts.join(entry.replace);
          }
          else if (!entry.used) {
            transformed = transformed.replace(entry.find, () => { entry.used = true; return entry.replace; });
          }
        }
        outputBytes += Buffer.byteLength(transformed, "utf8");
        if (outputBytes > MAX_WORKSPACE_BYTES) throw new Error("vibe_agent_attachment_workspace_too_large");
        if (!output.write(transformed, "utf8")) await new Promise((resolve, reject) => { output.once("drain", resolve); output.once("error", reject); });
      }
      let transformed = carry;
      for (const entry of normalized) {
        if (entry.all) {
          const parts = transformed.split(entry.find);
          if (parts.length > 1) entry.matched = true;
          transformed = parts.join(entry.replace);
        }
        else if (!entry.used) transformed = transformed.replace(entry.find, () => { entry.used = true; return entry.replace; });
      }
      if (normalized.some((entry) => entry.all ? !entry.matched : !entry.used)) {
        throw new Error("vibe_agent_attachment_edit_anchor_not_found");
      }
      outputBytes += Buffer.byteLength(transformed, "utf8");
      if (outputBytes > MAX_WORKSPACE_BYTES) throw new Error("vibe_agent_attachment_workspace_too_large");
      output.end(transformed, "utf8");
      await new Promise((resolve, reject) => {
        output.once("close", () => (outputError ? reject(outputError) : resolve()));
        output.once("error", reject);
      });
      if (outputError) throw outputError;
      await fsp.rename(temporary, filePath);
    } catch (error) {
      input.destroy();
      output.destroy();
      await fsp.rm(temporary, { force: true }).catch(() => {});
      throw error;
    }
    const digest = await sha256File(filePath);
    item.size = digest.size;
    item.sha256 = digest.sha256;
    manifest.updated_at = new Date().toISOString();
    await atomicWrite(manifestPath(this.workspacePath(workspaceId)), JSON.stringify(manifest, null, 2));
    return { ...item };
  }

  async remove(workspaceId, { expectedAccountId = "", expectedRunId = "", expectedSessionId = "" } = {}) {
    const workspacePath = this.workspacePath(workspaceId);
    const manifest = await this.manifest(workspaceId);
    assertManifestBinding(manifest, expectedRunId, expectedSessionId, expectedAccountId);
    await fsp.rm(workspacePath, { recursive: true, force: true });
    return { workspace_id: safeId(workspaceId, "workspace_id"), removed: true };
  }
}

export const attachmentWorkspaceConstants = {
  WORKSPACE_SCHEMA,
  ATTACHMENT_SCHEMA,
  ADMISSION_SCHEMA,
  ADMISSION_TTL_MS,
  MAX_ADMITTED_FILES,
  MAX_READ_BYTES,
  MAX_AUTHORED_MARKDOWN_CHARS,
  MAX_WRITE_BYTES,
  MAX_WORKSPACE_BYTES,
};
