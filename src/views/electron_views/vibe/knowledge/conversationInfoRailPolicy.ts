export interface SessionAttachmentLike {
  id?: unknown
  resource_id?: unknown
  source_ref_id?: unknown
  citation_span_id?: unknown
  citation_start_offset?: unknown
  citation_end_offset?: unknown
  source_label?: unknown
  source_location?: unknown
  content_hash?: unknown
  attachment_source_ref?: unknown
  name?: unknown
  filename?: unknown
  mime?: unknown
  size?: unknown
  chars?: unknown
  kind?: unknown
  status?: unknown
  download_url?: unknown
  content?: unknown
  text?: unknown
  body_omitted?: unknown
}

export interface SessionEventLike {
  id?: unknown
  session_id?: unknown
  event_order?: unknown
  created_at?: unknown
  attachments?: unknown
}

export interface RecentSessionFile extends SessionAttachmentLike {
  identity: string
  filename: string
  event_id: string
  attachment_index: number
  last_event_order: number
  last_seen_at: string
}

export interface KnowledgeActivityLike {
  schema?: unknown
  type?: unknown
  project_id?: unknown
  commit_seq?: unknown
}

function nonEmpty(value: unknown): string {
  return String(value ?? '').trim()
}

/** 只接受 typed attachment/resource 身份；文件名与大小不能冒充稳定 identity。 */
export function attachmentIdentity(file: SessionAttachmentLike): string {
  const attachmentId = nonEmpty(file?.id)
  if (attachmentId) return `attachment:${attachmentId}`
  const resourceId = nonEmpty(file?.resource_id)
  if (resourceId) return `resource:${resourceId}`
  const sourceRefId = nonEmpty(file?.source_ref_id)
  if (sourceRefId) return `source-ref:${sourceRefId}`
  const sourceRef = file?.attachment_source_ref
  if (sourceRef && typeof sourceRef === 'object') {
    const refId = nonEmpty((sourceRef as Record<string, unknown>).ref_id)
      || nonEmpty((sourceRef as Record<string, unknown>).source_ref_id)
      || nonEmpty((sourceRef as Record<string, unknown>).resource_id)
    if (refId) return `attachment-ref:${refId}`
  } else {
    const refId = nonEmpty(sourceRef)
    if (refId) return `attachment-ref:${refId}`
  }
  const contentHash = nonEmpty(file?.content_hash)
  return contentHash ? `content-hash:${contentHash}` : ''
}

export function recentSessionFiles(
  events: SessionEventLike[],
  sessionId: unknown,
  limit = 5,
): RecentSessionFile[] {
  const owner = nonEmpty(sessionId)
  if (!owner) return []
  const latest = new Map<string, RecentSessionFile>()
  for (const event of events || []) {
    if (nonEmpty(event?.session_id) !== owner || !Array.isArray(event?.attachments)) continue
    const eventId = nonEmpty(event?.id)
    const eventOrder = Number(event?.event_order || 0)
    const seenAt = nonEmpty(event?.created_at)
    event.attachments.forEach((raw, attachmentIndex) => {
      if (!raw || typeof raw !== 'object') return
      const file = raw as SessionAttachmentLike
      const identity = attachmentIdentity(file)
      if (!identity) return
      const filename = nonEmpty(file.filename) || nonEmpty(file.name) || '未命名文件'
      const previous = latest.get(identity)
      if (
        previous
        && (
          previous.last_event_order > eventOrder
          || (
            previous.last_event_order === eventOrder
            && previous.attachment_index > attachmentIndex
          )
        )
      ) return
      latest.set(identity, {
        ...previous,
        ...file,
        identity,
        filename,
        event_id: eventId,
        attachment_index: attachmentIndex,
        last_event_order: eventOrder,
        last_seen_at: seenAt,
      })
    })
  }
  return Array.from(latest.values())
    .sort((a, b) => (
      b.last_event_order - a.last_event_order
      || b.attachment_index - a.attachment_index
      || b.last_seen_at.localeCompare(a.last_seen_at)
    ))
    .slice(0, Math.max(0, Number(limit) || 0))
}

export function advanceKnowledgeChangeCursor(
  cursor: number,
  projectId: string,
  event: KnowledgeActivityLike,
): { cursor: number; changed: boolean } {
  const current = Math.max(0, Number(cursor) || 0)
  const sequence = Number(event?.commit_seq || 0)
  const changed = (
    event?.schema === 'knowledge_activity.v1'
    && event?.type === 'knowledge_change'
    && String(event?.project_id || '') === projectId
    && Number.isSafeInteger(sequence)
    && sequence > current
  )
  return { cursor: changed ? sequence : current, changed }
}
