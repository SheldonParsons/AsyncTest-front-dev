import { isDeepStrictEqual } from "node:util";

const SOURCE_FIELDS = new Set(["label", "path", "snippet", "source_ref", "knowledge_ref"]);
const record = (value) => value !== null && typeof value === "object" && !Array.isArray(value);

// 只精简发给模型的重复表示；HTTP/Trace 仍保留原结果。
// 不缩减条目、不改正文/引用，也不推断额外字段是否有用。
export function projectKnowledgeSearchResult(value) {
  if (!record(value) || !["ready", "degraded_ready"].includes(value.knowledge_status)
    || !Array.isArray(value.items) || !value.items.length) return value;
  const items = value.items;
  if (!items.every((item) => record(item) && typeof item.label === "string"
    && typeof item.excerpt === "string" && item.excerpt.length > 0
    && Array.isArray(item.path) && item.path.every((part) => typeof part === "string"))) return value;

  const projected = { ...value };
  // 汇总可能是完整条目串联后的前缀；完整片段仍全部在 items 内。
  const combined = items.map((item) => {
    const label = item.path.join(" > ") || item.label;
    return (label ? `【${label}】\n` : "") + item.excerpt;
  }).join("\n\n");
  if (typeof value.text === "string" && value.text.length > 0
    && combined.startsWith(value.text)) delete projected.text;

  if (Array.isArray(value.sources) && value.sources.length === items.length
    && value.sources.every((source, index) => {
      const item = items[index];
      return record(source) && Object.keys(source).every((key) => SOURCE_FIELDS.has(key))
        && source.label === item.label && source.path === item.path.join(" > ")
        && typeof source.snippet === "string" && item.excerpt.startsWith(source.snippet)
        && isDeepStrictEqual(source.source_ref, item.source_ref)
        && isDeepStrictEqual(source.knowledge_ref, item.knowledge_ref);
    })) delete projected.sources;
  return projected;
}
