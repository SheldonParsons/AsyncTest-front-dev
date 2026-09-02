import { createHash } from "node:crypto";

// Transport-only mirror of the server knowledge_markdown_chunk.v1 contract.
// Offsets count Unicode code points (not UTF-16 code units), matching Python's
// ``len(str)`` on the server even when Markdown contains emoji or other
// non-BMP characters.
export const MARKDOWN_CHUNK_SCHEMA = "knowledge_markdown_chunk.v1";
export const DEFAULT_MARKDOWN_CHUNK_CHARS = 120_000;
export const MAX_MARKDOWN_CHUNK_CHARS = 1_000_000;
// Keep this aligned with the current Knowledge Tool envelope. Raising it is a
// separate server ingest-capacity change, not a client-side workaround.
export const MAX_AUTHORED_MARKDOWN_CHARS = 4_000_000;

function sha256(value) {
  return createHash("sha256").update(String(value), "utf8").digest("hex");
}

function normalizeChunkSize(value) {
  const candidate = value === undefined ? DEFAULT_MARKDOWN_CHUNK_CHARS : Number(value);
  if (!Number.isSafeInteger(candidate) || candidate < 1) {
    throw new Error("vibe_agent_attachment_chunk_size_invalid");
  }
  return Math.min(candidate, MAX_MARKDOWN_CHUNK_CHARS);
}

export function codePointLength(value) {
  if (value !== undefined && value !== null && typeof value !== "string") {
    throw new Error("vibe_agent_attachment_markdown_text_invalid");
  }
  let count = 0;
  for (const _character of String(value ?? "")) count += 1;
  return count;
}

function codePointEndIndex(value, count) {
  const text = String(value ?? "");
  if (count <= 0) return 0;
  let offset = 0;
  let seen = 0;
  while (offset < text.length && seen < count) {
    const code = text.codePointAt(offset);
    offset += code !== undefined && code > 0xffff ? 2 : 1;
    seen += 1;
  }
  return offset;
}

export function chunkMarkdown(content, maxChars = DEFAULT_MARKDOWN_CHUNK_CHARS) {
  if (content !== undefined && content !== null && typeof content !== "string") {
    throw new Error("vibe_agent_attachment_markdown_text_invalid");
  }
  const text = String(content ?? "");
  const size = normalizeChunkSize(maxChars);
  if (!text) return [];
  const chunks = [];
  let start = 0;
  let startOffset = 0;
  while (start < text.length) {
    // Convert the code-point budget to a UTF-16 boundary so a surrogate pair
    // can never be split while offsets remain Python-compatible.
    const relativeEnd = codePointEndIndex(text.slice(start), size);
    let end = relativeEnd >= text.length - start ? text.length : start + relativeEnd;
    if (end < text.length) {
      // Python's ``str.rfind(sub, start, limit)`` uses an exclusive stop;
      // ``lastIndexOf`` takes an inclusive position, so stop at end - 2.
      const boundary = text.lastIndexOf("\n\n", end - 2);
      if (boundary > start) end = boundary + 2;
    }
    const part = text.slice(start, end);
    const endOffset = startOffset + codePointLength(part);
    chunks.push({
      schema: MARKDOWN_CHUNK_SCHEMA,
      index: chunks.length,
      start_offset: startOffset,
      end_offset: endOffset,
      text: part,
      content_hash: sha256(part),
    });
    start = end;
    startOffset = endOffset;
  }
  return chunks;
}

export function authoredMarkdownChunks(content, { maxChars = DEFAULT_MARKDOWN_CHUNK_CHARS } = {}) {
  if (typeof content !== "string") throw new Error("vibe_agent_attachment_markdown_text_invalid");
  const text = String(content ?? "");
  if (!text.trim()) throw new Error("vibe_agent_attachment_authored_body_empty");
  const charCount = codePointLength(text);
  if (charCount > MAX_AUTHORED_MARKDOWN_CHARS) throw new Error("vibe_agent_attachment_authored_body_too_large");
  return {
    chunks: chunkMarkdown(text, maxChars),
    content_hash: sha256(text),
    char_count: charCount,
  };
}
