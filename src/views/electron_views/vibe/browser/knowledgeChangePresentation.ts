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

export function formatKnowledgeChangeTime(value: string, full = false): string {
  if (!value) return ''
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return ''
  return full
    ? date.toLocaleString('zh-CN', { hour12: false })
    : date.toLocaleDateString('zh-CN', { month: '2-digit', day: '2-digit' })
}
