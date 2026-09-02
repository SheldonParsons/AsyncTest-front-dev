import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

const SHA256 = /^[0-9a-f]{64}$/;

function validateDescriptor(value) {
  if (!value || typeof value !== "object" || Array.isArray(value)
    || value.schema !== "vibe_agent_skill.v1"
    || value.name !== "vibe-knowledge"
    || typeof value.description !== "string" || !value.description.trim()
    || typeof value.version !== "string" || !value.version.trim()
    || typeof value.content !== "string" || !value.content
    || value.content.length > 200_000
    || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value.content)) {
    throw new Error("vibe_agent_skill_descriptor_invalid");
  }
  const digest = createHash("sha256").update(value.content, "utf8").digest("hex");
  if (!SHA256.test(String(value.sha256 || "")) || digest !== value.sha256) {
    throw new Error("vibe_agent_skill_hash_mismatch");
  }
  return { ...structuredClone(value), sha256: digest };
}

export class VibeSkillCache {
  constructor({ rootPath } = {}) {
    if (!path.isAbsolute(String(rootPath || ""))) throw new Error("vibe_agent_skill_cache_root_invalid");
    this.rootPath = path.resolve(rootPath);
  }

  async put(raw) {
    const descriptor = validateDescriptor(raw);
    const directory = path.join(this.rootPath, descriptor.sha256, descriptor.name);
    const filePath = path.join(directory, "SKILL.md");
    const existingDescriptor = async () => {
      const existing = await fs.readFile(filePath, "utf8");
      if (createHash("sha256").update(existing, "utf8").digest("hex") !== descriptor.sha256) {
        throw new Error("vibe_agent_skill_cache_corrupt");
      }
      return { ...descriptor, file_path: filePath };
    };
    try {
      return await existingDescriptor();
    } catch (error) {
      if (error?.code !== "ENOENT") throw error;
    }
    await fs.mkdir(directory, { recursive: true, mode: 0o700 });
    const temporary = `${filePath}.${process.pid}.${randomUUID()}.tmp`;
    try {
      await fs.writeFile(temporary, descriptor.content, { encoding: "utf8", mode: 0o600, flag: "wx" });
      await fs.rename(temporary, filePath);
    } catch (error) {
      await fs.unlink(temporary).catch(() => undefined);
      // Another Main task may have populated the immutable path between the
      // read and rename.  Validate and reuse it rather than reporting a
      // spurious startup failure; a different digest is still corruption.
      if (error?.code === "EEXIST" || error?.code === "EPERM") {
        try { return await existingDescriptor(); } catch (existingError) {
          if (existingError?.code !== "ENOENT") throw existingError;
        }
      }
      throw error;
    }
    return { ...descriptor, file_path: filePath };
  }
}

export const skillCacheConstants = { validateDescriptor };
