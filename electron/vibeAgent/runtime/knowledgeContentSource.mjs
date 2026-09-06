/** 本机正文传输：与原生文件工具同属子进程，不把文件路径作为知识正文提交。 */
import { constants } from "node:fs";
import { open } from "node:fs/promises";
import { isAbsolute } from "node:path";

export async function materializeKnowledgeContent(call) {
  if (!["add_knowledge", "edit_knowledge"].includes(call.name)) return call;
  const args = structuredClone(call.arguments);
  const rows = call.name === "add_knowledge" ? args?.items : args?.replacement ? [args.replacement] : [];
  if (!Array.isArray(rows)) return call;
  let totalBytes = 0;
  for (const row of rows) {
    if (!row || !Object.hasOwn(row, "content_file")) continue;
    if (Object.hasOwn(row, "content") || typeof row.content_file !== "string" || !isAbsolute(row.content_file)) {
      throw new Error("knowledge_content_file_requires_absolute_path_and_no_content");
    }
    // 非阻塞打开避免特殊文件挂住；普通 UTF-8 文件读取不改变 OS 权限边界。
    const handle = await open(row.content_file, constants.O_RDONLY | constants.O_NONBLOCK);
    try {
      const before = await handle.stat();
      if (!before.isFile() || before.size > 4_000_000) throw new Error("knowledge_content_file_invalid_or_too_large");
      // 有界读取，文件被并发追加时也不无界占用内存。
      const bytes = Buffer.alloc(before.size + 1);
      let count = 0;
      while (count < bytes.length) {
        const result = await handle.read(bytes, count, bytes.length - count, null);
        if (!result.bytesRead) break;
        count += result.bytesRead;
      }
      const after = await handle.stat();
      if (count !== before.size || after.size !== before.size || after.mtimeMs !== before.mtimeMs
        || after.ctimeMs !== before.ctimeMs) throw new Error("knowledge_content_file_changed");
      const content = new TextDecoder("utf-8", { fatal: true, ignoreBOM: true }).decode(bytes.subarray(0, count));
      if (!content.trim() || content.includes("\0")) throw new Error("knowledge_content_file_not_text");
      totalBytes += count;
      if (totalBytes > 4_000_000) throw new Error("knowledge_content_files_batch_too_large");
      row.content = content;
      delete row.content_file;
    } finally {
      await handle.close();
    }
  }
  return { ...call, arguments: args };
}
