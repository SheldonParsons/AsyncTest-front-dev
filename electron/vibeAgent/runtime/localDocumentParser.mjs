import path from "node:path";
import { rm } from "node:fs/promises";

const PDF_MAGIC = "%PDF-";
const OLE_MAGIC = "d0cf11e0a1b11ae1";
const MAX_PARSER_BYTES = 128 * 1024 * 1024;
const MAX_PDF_PAGES = 1000;
const MAX_MARKDOWN_CHARACTERS = 4_000_000;
const MAX_ARCHIVE_UNCOMPRESSED_BYTES = 256 * 1024 * 1024;
const MAX_SLIDE_XML_BYTES = 8 * 1024 * 1024;
const MAX_ARCHIVE_ENTRIES = 20_000;

function extension(file) {
  return path.extname(String(file || "")).toLowerCase();
}

export function detectLocalDocumentKind(file, bytes) {
  const ext = extension(file);
  const head = Buffer.from(bytes).subarray(0, 8);
  if (head.subarray(0, 5).toString("ascii") === PDF_MAGIC) return "pdf";
  if (head.toString("hex") === OLE_MAGIC && ext === ".xls") return "spreadsheet";
  if (head[0] === 0x50 && head[1] === 0x4b) {
    if (ext === ".xlsx") return "spreadsheet";
    if (ext === ".pptx") return "presentation";
  }
  if ([".pdf", ".xls", ".xlsx", ".ppt", ".pptx"].includes(ext)) return "invalid-document";
  return "ordinary";
}

function markdownCell(value) {
  return String(value ?? "").replaceAll("|", "\\|").replace(/\r?\n/g, "<br>");
}

function zipUncompressedSize(bytes) {
  // Read ZIP central-directory metadata before handing a workbook/presentation
  // to a parser. This catches a small zip-bomb container without inflating it.
  const value = Buffer.from(bytes);
  if (value.length < 22) throw new Error("ZIP 文档目录无效");
  const start = Math.max(0, value.length - 65_557);
  let eocd = -1;
  for (let index = Math.max(0, value.length - 22); index >= start; index -= 1) {
    if (value.readUInt32LE(index) === 0x06054b50) {
      eocd = index;
      break;
    }
  }
  if (eocd < 0) throw new Error("ZIP 文档目录无效");
  const entries = value.readUInt16LE(eocd + 10);
  const directorySize = value.readUInt32LE(eocd + 12);
  const directoryOffset = value.readUInt32LE(eocd + 16);
  if (entries > MAX_ARCHIVE_ENTRIES || directorySize > value.length
    || directoryOffset > value.length - directorySize) {
    throw new Error("压缩文档目录超过本机解析上限");
  }
  let offset = directoryOffset;
  const directoryEnd = directoryOffset + directorySize;
  let total = 0;
  for (let index = 0; index < entries; index += 1) {
    if (offset + 46 > directoryEnd || offset + 46 > value.length
      || value.readUInt32LE(offset) !== 0x02014b50) {
      throw new Error("ZIP 文档目录无效");
    }
    const compressed = value.readUInt32LE(offset + 20);
    const uncompressed = value.readUInt32LE(offset + 24);
    const nameLength = value.readUInt16LE(offset + 28);
    const extraLength = value.readUInt16LE(offset + 30);
    const commentLength = value.readUInt16LE(offset + 32);
    if (compressed === 0xffffffff || uncompressed === 0xffffffff) {
      throw new Error("ZIP64 文档暂不支持");
    }
    total += uncompressed;
    if (total > MAX_ARCHIVE_UNCOMPRESSED_BYTES) {
      throw new Error("压缩文档解压后大小超过本机解析上限");
    }
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > directoryEnd || next > value.length) throw new Error("ZIP 文档目录无效");
    offset = next;
  }
  if (offset !== directoryEnd) throw new Error("ZIP 文档目录无效");
  return total;
}

function spreadsheetMarkdown(file, bytes, XLSX) {
  zipUncompressedSize(bytes);
  const workbook = XLSX.read(bytes, { type: "array", cellDates: false, cellText: true });
  const sections = [`# ${path.basename(file)}`];
  let cellCount = 0;
  for (const name of workbook.SheetNames) {
    const rows = XLSX.utils.sheet_to_json(workbook.Sheets[name], { header: 1, raw: false, defval: "" });
    sections.push(`## ${name}`);
    if (!rows.length) {
      sections.push("（空工作表）");
      continue;
    }
    const width = Math.max(1, ...rows.map((row) => Array.isArray(row) ? row.length : 0));
    cellCount += rows.length * width;
    if (cellCount > 2_000_000) throw new Error("Excel 文档单元格数量超过本机解析上限");
    const normalized = rows.map((row) => Array.from({ length: width }, (_, index) => markdownCell(row?.[index])));
    sections.push(`| ${normalized[0].join(" | ")} |`);
    sections.push(`| ${Array.from({ length: width }, () => "---").join(" | ")} |`);
    for (const row of normalized.slice(1)) sections.push(`| ${row.join(" | ")} |`);
  }
  return sections.join("\n\n");
}

function decodeXml(value) {
  return String(value)
    .replace(/&#(\d+);/g, (_match, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_match, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replaceAll("&lt;", "<").replaceAll("&gt;", ">").replaceAll("&quot;", '"')
    .replaceAll("&apos;", "'").replaceAll("&amp;", "&");
}

async function presentationMarkdown(file, bytes, JSZip) {
  zipUncompressedSize(bytes);
  const archive = await JSZip.loadAsync(bytes);
  let archiveBytes = 0;
  for (const entry of Object.values(archive.files)) {
    archiveBytes += Number(entry?._data?.uncompressedSize || 0);
    if (archiveBytes > MAX_ARCHIVE_UNCOMPRESSED_BYTES) throw new Error("PPTX 解压后大小超过本机解析上限");
  }
  const slides = Object.keys(archive.files)
    .map((name) => ({ name, match: /^ppt\/slides\/slide(\d+)\.xml$/.exec(name) }))
    .filter((item) => item.match)
    .sort((left, right) => Number(left.match[1]) - Number(right.match[1]));
  if (!slides.length) throw new Error("PPTX package has no slides");
  const sections = [`# ${path.basename(file)}`];
  for (const [index, slide] of slides.entries()) {
    const xml = await archive.file(slide.name).async("string");
    if (Buffer.byteLength(xml, "utf8") > MAX_SLIDE_XML_BYTES) throw new Error("PPTX 单页文字数据超过本机解析上限");
    const paragraphs = [...xml.matchAll(/<a:p\b[\s\S]*?<\/a:p>/g)].map((match) => (
      [...match[0].matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map((text) => decodeXml(text[1])).join("")
    )).filter((text) => text.trim());
    sections.push(`## 第 ${index + 1} 页`);
    sections.push(paragraphs.length ? paragraphs.join("\n\n") : "（没有可提取文字）");
  }
  const result = sections.join("\n\n");
  if (result.length > MAX_MARKDOWN_CHARACTERS) throw new Error("PPTX Markdown 结果超过本机解析上限");
  return result;
}

async function pdfMarkdown(file, bytes, pdfjs) {
  const loading = pdfjs.getDocument({
    data: new Uint8Array(bytes),
    disableWorker: true,
    isEvalSupported: false,
    useSystemFonts: true,
  });
  try {
    const document = await loading.promise;
    if (document.numPages > MAX_PDF_PAGES) throw new Error("PDF 页数超过本机解析上限");
    const sections = [`# ${path.basename(file)}`];
    for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber += 1) {
      const page = await document.getPage(pageNumber);
      const content = await page.getTextContent();
      let text = "";
      for (const item of content.items) {
        if (typeof item?.str !== "string") continue;
        text += `${text && !text.endsWith("\n") ? " " : ""}${item.str}`;
        if (item.hasEOL) text += "\n";
      }
      sections.push(`## 第 ${pageNumber} 页`);
      sections.push(text.trim() || "（没有可提取文字；可能是扫描图片 PDF）");
    }
    const result = sections.join("\n\n");
    if (result.length > MAX_MARKDOWN_CHARACTERS) throw new Error("PDF Markdown 结果超过本机解析上限");
    return result;
  } finally {
    await loading.destroy();
  }
}

function selectedLines(markdown, offset, limit) {
  const lines = markdown.split("\n");
  const start = offset ? Math.max(0, Number(offset) - 1) : 0;
  if (start >= lines.length) throw new Error(`Offset ${offset} is beyond end of file (${lines.length} lines total)`);
  const end = limit === undefined ? lines.length : Math.min(lines.length, start + Math.max(0, Number(limit)));
  return { text: lines.slice(start, end).join("\n"), start, end, total: lines.length };
}

export function createDocumentReadTool({ core, env, officialRead, parsers } = {}) {
  // createTempFile creates a private directory for each generated Markdown
  // file. Keep those directories scoped to this run so teardown can remove
  // parser output without ever touching the user-selected source.
  const tempDirectories = new Set();
  const cleanup = async () => {
    const directories = [...tempDirectories];
    tempDirectories.clear();
    await Promise.allSettled(directories.map((directory) => (
      rm(directory, { recursive: true, force: true })
    )));
  };
  const tool = {
    ...officialRead,
    description: `${officialRead.description} PDF、Excel 和 PPTX 会先在本机转换为可审计 Markdown；旧版 PPT 不做转换，图片仍使用 Pi 原生图像读取。`,
    async execute(toolCallId, args, signal, onUpdate) {
      const absolute = core.getOrThrow(await env.absolutePath(args.path, signal));
      const extensionName = extension(absolute);
      const parserExtensions = new Set([".pdf", ".xls", ".xlsx", ".ppt", ".pptx"]);
      // Ordinary text and image files stay on Pi's official read path; avoid
      // loading an arbitrary large file twice just to inspect its signature.
      if (!parserExtensions.has(extensionName)) {
        return officialRead.execute(toolCallId, args, signal, onUpdate, { env });
      }
      // Check the file size before materializing parser input.  Node's
      // readBinaryFile is intentionally whole-file, so rejecting an oversized
      // document after that call would already have incurred the OOM risk.
      if (typeof env.fileInfo === "function") {
        const info = core.getOrThrow(await env.fileInfo(absolute));
        if (!Number.isSafeInteger(Number(info?.size)) || Number(info.size) > MAX_PARSER_BYTES) {
          throw new Error("文档文件大小超过本机解析上限（128 MiB）");
        }
      }
      const bytes = core.getOrThrow(await env.readBinaryFile(absolute, signal));
      if (bytes.byteLength > MAX_PARSER_BYTES) throw new Error("文档文件大小超过本机解析上限（128 MiB）");
      const kind = detectLocalDocumentKind(absolute, bytes);
      if (kind === "ordinary") return officialRead.execute(toolCallId, args, signal, onUpdate, { env });
      if (kind === "invalid-document") throw new Error("文件扩展名与受支持的 PDF/Excel/PPTX 格式签名不一致");
      signal?.throwIfAborted?.();
      let markdown;
      let parser;
      if (kind === "pdf") {
        markdown = await pdfMarkdown(absolute, bytes, parsers.pdfjs);
        parser = { name: "pdfjs-dist", version: String(parsers.pdfjs.version || ""), license: "Apache-2.0" };
      } else if (kind === "spreadsheet") {
        markdown = spreadsheetMarkdown(absolute, bytes, parsers.XLSX);
        parser = { name: "xlsx", version: String(parsers.XLSX.version || "0.18.5"), license: "Apache-2.0" };
      } else {
        markdown = await presentationMarkdown(absolute, bytes, parsers.JSZip);
        parser = { name: "jszip", version: String(parsers.JSZip.version || "3.10.1"), license: "MIT OR GPL-3.0-or-later" };
      }
      signal?.throwIfAborted?.();
      const full = core.truncateHead(markdown);
      const selected = selectedLines(markdown, args.offset, args.limit);
      let text = selected.text;
      let fullOutputPath;
      if (full.truncated || selected.end < selected.total) {
        fullOutputPath = core.getOrThrow(await env.createTempFile({ prefix: "vibe-document-", suffix: ".md" }));
        tempDirectories.add(path.dirname(fullOutputPath));
        core.getOrThrow(await env.writeFile(fullOutputPath, markdown, signal));
        const visible = core.truncateHead(text);
        text = `${visible.content}\n\n[完整 Markdown 已写入 ${fullOutputPath}；请用 read 分页读取。]`;
      }
      return {
        content: [{ type: "text", text }],
        details: {
          schema: "local_document_parse.v1",
          kind,
          source_path: absolute,
          output_format: "text/markdown",
          parser,
          markdown_characters: markdown.length,
          ...(fullOutputPath ? { fullOutputPath } : {}),
        },
      };
    },
  };
  // Keep the hook out of Pi's serialized tool shape; localFileTools exposes it
  // separately to the runner's terminal cleanup path.
  Object.defineProperty(tool, "cleanup", { value: cleanup, enumerable: false });
  return tool;
}

export const localDocumentParserConstants = Object.freeze({
  MAX_PARSER_BYTES,
  MAX_PDF_PAGES,
  MAX_MARKDOWN_CHARACTERS,
  MAX_ARCHIVE_UNCOMPRESSED_BYTES,
  MAX_ARCHIVE_ENTRIES,
  MAX_SLIDE_XML_BYTES,
});
