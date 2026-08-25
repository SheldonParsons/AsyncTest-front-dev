export interface ConversationSourceCitation {
  sourceId: string
  spanId: string
  label: string
  location: string
  preview: string
  sourceKind: string
  mimeType: string
  startOffset: number | null
  endOffset: number | null
  canOpen: boolean
}

type SourceCitationInput = Record<string, unknown>

function text(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function firstText(...values: unknown[]): string {
  for (const value of values) {
    const candidate = text(value)
    if (candidate) return candidate
  }
  return ''
}

function bounded(value: unknown, limit: number): string {
  const candidate = text(value)
  if (!candidate || candidate.length <= limit) return candidate
  return `${candidate.slice(0, Math.max(0, limit - 1)).trimEnd()}…`
}

function titlePath(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.map(text).filter(Boolean).join(' / ')
}

function offset(value: unknown): number | null {
  const candidate = typeof value === 'number'
    ? value
    : (/^\d+$/.test(text(value)) ? Number(value) : Number.NaN)
  return Number.isSafeInteger(candidate) && candidate >= 0 ? candidate : null
}

function locationTail(value: string): string {
  return value
    .split(/\s*(?:>|›|\/|\\)\s*/)
    .map(part => part.trim())
    .filter(Boolean)
    .pop() || ''
}

/**
 * 会话事件只承载可展示的轻量引用描述；正文由 Viewer 在用户点击后按需读取。
 * 明确不读取 text/content，避免旧事件意外把整篇原文重新带回消息列表。
 */
export function normalizeConversationSourceCitation(
  value: unknown,
  index: number,
): ConversationSourceCitation {
  const source = value && typeof value === 'object'
    ? value as SourceCitationInput
    : {}
  // 裸 id / ref_id 可能是 span 或临时 evidence，Viewer 只接受正式 source_id。
  const sourceId = firstText(source.source_id)
  const spanId = firstText(source.span_id, source.passage_id)
  const locator = source.locator && typeof source.locator === 'object'
    ? source.locator as SourceCitationInput
    : {}
  const offsetUnit = firstText(locator.offset_unit, source.offset_unit)
  const offsetUnitSupported = !offsetUnit || offsetUnit === 'unicode_code_point'
  const startOffset = offsetUnitSupported
    ? offset(locator.start_offset ?? source.start_offset)
    : null
  const endOffset = offsetUnitSupported
    ? offset(locator.end_offset ?? source.end_offset)
    : null
  const location = bounded(firstText(
    source.source_location,
    titlePath(source.title_path),
    source.path,
    source.location,
  ), 240)
  const label = bounded(firstText(
    source.display_name,
    source.source_label,
    source.filename,
    source.title,
    locationTail(location),
  ), 160) || `来源 ${Math.max(0, index) + 1}`
  const preview = bounded(firstText(
    source.source_preview,
    source.citation_preview,
    source.excerpt,
    source.snippet,
  ), 240)

  return {
    sourceId,
    spanId,
    label,
    location,
    preview,
    sourceKind: bounded(firstText(source.source_type, source.source_kind, source.display_kind, source.kind), 80),
    mimeType: bounded(firstText(source.mime_type, source.mime), 120),
    startOffset,
    endOffset,
    // source_id 足以通过会话级整源接口读取；合法 locator 只决定是否优先读取精确片段。
    canOpen: Boolean(sourceId),
  }
}

export function sourceCitationHasReadableRange(source: ConversationSourceCitation): boolean {
  return source.startOffset !== null
    && source.endOffset !== null
    && source.endOffset > source.startOffset
    && source.endOffset - source.startOffset <= 16_384
}

export function sourceCitationViewerIdentity(source: ConversationSourceCitation): string {
  if (!source.canOpen) return ''
  const sourcePart = encodeURIComponent(source.sourceId)
  return sourceCitationHasReadableRange(source)
    ? `source:${sourcePart}:range:${source.startOffset}:${source.endOffset}`
    : `source:${sourcePart}:whole`
}
