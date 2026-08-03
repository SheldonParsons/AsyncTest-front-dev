export interface KnowledgeChangeLike {
  seq?: number
  kind?: string
  reason?: string
  request_text?: string
  created_at?: string
}

const KIND_LABELS: Record<string, string> = {
  ingest: '录入',
  modify: '修改',
  delete: '删除',
  structure: '结构',
  rebuild: '重建',
}

export function knowledgeChangeTitle(item: KnowledgeChangeLike): string {
  return String(item.reason || item.request_text || `提交 #${Number(item.seq || 0)}`)
}

export function knowledgeChangeKindLabel(value: string): string {
  return KIND_LABELS[value] || value
}

const SHANGHAI_TIME_ZONE = 'Asia/Shanghai'

export function formatKnowledgeChangeTime(value: string, full = false): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SHANGHAI_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date).reduce<Record<string, string>>((result, part) => {
    if (part.type !== 'literal') result[part.type] = part.value
    return result
  }, {})
  const dateTime = `${parts.month}/${parts.day} ${parts.hour}:${parts.minute}`
  return full ? `${parts.year}/${dateTime}:${parts.second}` : dateTime
}
