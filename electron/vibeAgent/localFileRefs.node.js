import { randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const MAX_FILES = 10;
const MAX_PREVIEW_BYTES = 512 * 1024;

function mimeType(file) {
  const extension = path.extname(file).toLowerCase();
  if ([".md", ".markdown"].includes(extension)) return "text/markdown";
  if ([".txt", ".csv", ".json", ".yaml", ".yml", ".xml", ".html", ".htm"].includes(extension)) return "text/plain";
  if (extension === ".pdf") return "application/pdf";
  if ([".xlsx", ".xls"].includes(extension)) return extension === ".xls"
    ? "application/vnd.ms-excel"
    : "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";
  if ([".pptx", ".ppt"].includes(extension)) return extension === ".ppt"
    ? "application/vnd.ms-powerpoint"
    : "application/vnd.openxmlformats-officedocument.presentationml.presentation";
  if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp"].includes(extension)) return `image/${extension.slice(1).replace("jpg", "jpeg")}`;
  return "application/octet-stream";
}

function ownerId(value) {
  const owner = String(value || "").trim();
  if (!owner || owner.length > 160 || !/^[A-Za-z0-9._:-]+$/.test(owner)) {
    throw new Error("vibe_agent_local_file_owner_invalid");
  }
  return owner;
}

export class LocalFileRefs {
  constructor() {
    this.records = new Map();
  }

  async admit(filePaths, rawOwnerId) {
    const owner = ownerId(rawOwnerId);
    if (!Array.isArray(filePaths) || !filePaths.length || filePaths.length > MAX_FILES) {
      throw new Error("vibe_agent_local_file_count_invalid");
    }
    const files = [];
    for (const rawPath of filePaths) {
      const absolutePath = path.resolve(String(rawPath || ""));
      const stat = await fs.stat(absolutePath);
      if (!stat.isFile()) throw new Error("vibe_agent_local_file_invalid");
      if (/[\u0000-\u001f\u007f]/u.test(path.basename(absolutePath))) {
        throw new Error("vibe_agent_local_file_name_invalid");
      }
      const refId = `lfr_${randomUUID().replaceAll("-", "")}`;
      const record = {
        schema: "local_file_ref.v1",
        ref_id: refId,
        name: path.basename(absolutePath),
        absolute_path: absolutePath,
        mime: mimeType(absolutePath),
        size: stat.size,
        last_modified: Math.trunc(stat.mtimeMs),
        owner_id: owner,
        dev: Number(stat.dev),
        ino: Number(stat.ino),
      };
      this.records.set(refId, record);
      files.push(this.publicRef(record));
    }
    return { schema: "vibe_agent_local_file_selection.v1", canceled: false, files };
  }

  publicRef(record) {
    return {
      schema: record.schema,
      ref_id: record.ref_id,
      name: record.name,
      mime: record.mime,
      size: record.size,
      last_modified: record.last_modified,
    };
  }

  require(refId, rawOwnerId) {
    const record = this.records.get(String(refId || ""));
    if (!record || record.owner_id !== String(rawOwnerId || "").trim()) {
      throw new Error("vibe_agent_local_file_ref_invalid");
    }
    return record;
  }

  async resolve(refs, rawOwnerId) {
    const owner = ownerId(rawOwnerId);
    if (!Array.isArray(refs) || refs.length > MAX_FILES) throw new Error("vibe_agent_local_file_refs_invalid");
    const ids = refs.map((item) => String(item?.ref_id || ""));
    if (ids.some((id) => !id) || new Set(ids).size !== ids.length) throw new Error("vibe_agent_local_file_refs_invalid");
    const resolved = [];
    for (const refId of ids) {
      const record = this.require(refId, owner);
      const stat = await fs.stat(record.absolute_path);
      if (!stat.isFile() || Number(stat.dev) !== record.dev || Number(stat.ino) !== record.ino
        || Number(stat.size) !== record.size || Math.trunc(stat.mtimeMs) !== record.last_modified) {
        throw new Error("vibe_agent_local_file_changed");
      }
      resolved.push({
        schema: record.schema,
        ref_id: record.ref_id,
        name: path.basename(record.absolute_path),
        absolute_path: record.absolute_path,
        mime: mimeType(record.absolute_path),
        size: stat.size,
        last_modified: Math.trunc(stat.mtimeMs),
        // These identities never cross the Renderer boundary.  They are
        // carried in Main's frozen start payload so a cold resume can prove
        // that the original file is still the same inode, not merely a path
        // with the same size and timestamp.
        dev: Number(stat.dev),
        ino: Number(stat.ino),
      });
    }
    return resolved;
  }

  async preview(refId, rawOwnerId) {
    const record = this.require(refId, ownerId(rawOwnerId));
    const current = await fs.stat(record.absolute_path);
    if (!current.isFile() || Number(current.dev) !== record.dev || Number(current.ino) !== record.ino
      || Number(current.size) !== record.size || Math.trunc(current.mtimeMs) !== record.last_modified) {
      throw new Error("vibe_agent_local_file_changed");
    }
    const file = await fs.open(record.absolute_path, "r");
    try {
      const stat = await file.stat();
      const length = Math.min(MAX_PREVIEW_BYTES, stat.size);
      const buffer = Buffer.alloc(length);
      const { bytesRead } = await file.read(buffer, 0, length, 0);
      const after = await file.stat();
      if (Number(after.dev) !== record.dev || Number(after.ino) !== record.ino
        || Number(after.size) !== record.size || Math.trunc(after.mtimeMs) !== record.last_modified) {
        throw new Error("vibe_agent_local_file_changed");
      }
      return {
        schema: "local_file_preview.v1",
        ref_id: record.ref_id,
        name: record.name,
        mime: record.mime,
        size: stat.size,
        text: buffer.subarray(0, bytesRead).toString("utf8"),
        truncated: bytesRead < stat.size,
      };
    } finally {
      await file.close();
    }
  }
}
