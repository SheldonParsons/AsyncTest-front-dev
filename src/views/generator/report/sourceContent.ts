import { ApiDownloadProjectFile } from "@/api/project/index";
import type { ReportExcelSourceFile } from "./types";

export const MAX_LOCAL_FILE_BYTES = 50 * 1024 * 1024;
export const MAX_LOCAL_TOTAL_BYTES = 100 * 1024 * 1024;

// 浏览器预览的兼容读取；桌面通过 ReportService 将输入字节持久化，不写入 localStorage。
export async function readLocalReportFile(
  file: File,
  extension: "amind" | "xlsx",
) {
  if (!file.name.toLowerCase().endsWith(`.${extension}`))
    throw new Error(`请选择 .${extension} 文件`);
  if (!file.size) throw new Error(`${file.name} 是空文件，请重新选择`);
  if (file.size > MAX_LOCAL_FILE_BYTES)
    throw new Error(`${file.name} 超过 50 MB，请缩小文件后重试`);
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () =>
      reject(new Error(`无法读取 ${file.name}，请重新选择`));
    reader.onabort = () => reject(new Error("文件读取已取消"));
    reader.onload = () => resolve(String(reader.result).split(",", 2)[1]);
    reader.readAsDataURL(file);
  });
}

export async function readReportSourceBuffer(
  source: ReportExcelSourceFile,
): Promise<ArrayBuffer> {
  if (source.source === "local") {
    if (!source.localContentBase64)
      throw new Error("本地文件已失效，请重新选择");
    const bytes = Uint8Array.from(atob(source.localContentBase64), (value) =>
      value.charCodeAt(0),
    );
    return bytes.buffer;
  }
  if (source.backendFileId) {
    const response = await ApiDownloadProjectFile({ id: source.backendFileId });
    return (response.data as Blob).arrayBuffer();
  }
  const response = await fetch(source.downloadUrl);
  if (!response.ok) throw new Error(`读取文件失败：${response.status}`);
  return response.arrayBuffer();
}
