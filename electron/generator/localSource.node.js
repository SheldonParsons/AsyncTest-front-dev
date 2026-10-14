import { promises as fs } from "node:fs";

// 仅接受文件内容，禁止把任意本地路径作为可读取的报告数据源。
export async function persistLocalReportSource(file, targetPath) {
  const content = file?.localContentBase64;
  if (
    typeof content !== "string" ||
    !content ||
    content.length > Math.ceil((50 * 1024 * 1024) / 3) * 4 ||
    !/^[A-Za-z0-9+/]+={0,2}$/.test(content) ||
    content.length % 4 !== 0
  ) {
    throw new Error("本地文件内容无效或超过 50 MB，请重新选择");
  }
  if (!/\.(amind|xlsx)$/i.test(file.name || ""))
    throw new Error("只支持 amind 和 xlsx 文件");
  const buffer = Buffer.from(content, "base64");
  if (
    !buffer.length ||
    buffer.toString("base64") !== content ||
    buffer.length > 50 * 1024 * 1024
  )
    throw new Error("本地文件内容不完整，请重新选择");
  if (buffer[0] !== 0x50 || buffer[1] !== 0x4b)
    throw new Error("文件格式不正确，请使用有效的 amind 或 xlsx 文件");
  await fs.writeFile(targetPath, buffer, { mode: 0o600 });
  return { path: targetPath, size: buffer.length };
}

export function withoutLocalFileContent(file) {
  const { localContentBase64: _content, ...metadata } = file;
  return metadata;
}
