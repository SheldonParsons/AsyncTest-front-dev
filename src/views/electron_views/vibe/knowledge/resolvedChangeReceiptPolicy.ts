export const KNOWLEDGE_CHANGE_RECEIPT_SCHEMA = 'knowledge_change_receipt.v1' as const

export type KnowledgeChangeReceiptStatus = 'applied' | 'cancelled' | 'stale' | 'failed'
export type KnowledgeChangeReceiptOperation = 'insert' | 'update' | 'delete' | 'move' | 'unknown'

export interface KnowledgeChangeReceipt {
  schema: typeof KNOWLEDGE_CHANGE_RECEIPT_SCHEMA
  receiptId: string
  confirmationId: string
  status: KnowledgeChangeReceiptStatus
  operation: KnowledgeChangeReceiptOperation
  summary: string
  resolvedAt: string
  commitSeq: number | null
  commitId: string
  idempotentReplay: boolean
}

const RECEIPT_FIELDS = new Set([
  'schema',
  'receipt_id',
  'confirmation_id',
  'status',
  'operation',
  'summary',
  'resolved_at',
  'commit_seq',
  'commit_id',
  'idempotent_replay',
])
const RECEIPT_STATUSES = new Set<KnowledgeChangeReceiptStatus>([
  'applied', 'cancelled', 'stale', 'failed',
])
const RECEIPT_OPERATIONS = new Set<KnowledgeChangeReceiptOperation>([
  'insert', 'update', 'delete', 'move', 'unknown',
])
const SAFE_ID = /^[A-Za-z0-9._:-]{1,160}$/
const RECEIPT_ID = /^kcr_[0-9a-f]{24}$/

function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function optionalSafeId(value: unknown): string | null {
  if (value == null || value === '') return ''
  const text = String(value)
  return SAFE_ID.test(text) ? text : null
}

/**
 * Fail closed at the browser boundary. A resolved receipt is a deliberately
 * small read model, not a vehicle for replaying diffs, source text or actions.
 */
export function readKnowledgeChangeReceipt(value: unknown): KnowledgeChangeReceipt | null {
  if (!isRecord(value)) return null
  if (Object.keys(value).some(key => !RECEIPT_FIELDS.has(key))) return null
  if (value.schema !== KNOWLEDGE_CHANGE_RECEIPT_SCHEMA) return null

  const receiptId = String(value.receipt_id || '')
  const confirmationId = String(value.confirmation_id || '')
  const status = String(value.status || '') as KnowledgeChangeReceiptStatus
  const operation = String(value.operation || '') as KnowledgeChangeReceiptOperation
  const summary = String(value.summary || '').trim()
  const resolvedAt = String(value.resolved_at || '')
  const commitId = optionalSafeId(value.commit_id)
  const commitSeq = value.commit_seq == null ? null : Number(value.commit_seq)

  if (!RECEIPT_ID.test(receiptId)) return null
  if (!confirmationId || confirmationId.length > 96 || !SAFE_ID.test(confirmationId)) return null
  if (!RECEIPT_STATUSES.has(status) || !RECEIPT_OPERATIONS.has(operation)) return null
  if (!summary || summary.length > 240 || /[\r\n]/.test(summary)) return null
  if (resolvedAt.length > 64 || /[\r\n]/.test(resolvedAt)) return null
  if (commitId == null) return null
  if (commitSeq != null && (!Number.isSafeInteger(commitSeq) || commitSeq < 1)) return null
  if (value.idempotent_replay != null && typeof value.idempotent_replay !== 'boolean') return null
  if (status !== 'applied' && (
    commitSeq != null || commitId || value.idempotent_replay != null
  )) return null

  return {
    schema: KNOWLEDGE_CHANGE_RECEIPT_SCHEMA,
    receiptId,
    confirmationId,
    status,
    operation,
    summary,
    resolvedAt,
    commitSeq,
    commitId,
    idempotentReplay: value.idempotent_replay === true,
  }
}

export function eventKnowledgeChangeReceipts(event: any): KnowledgeChangeReceipt[] {
  const rows = event?.meta?.knowledge_change_receipts
  if (!Array.isArray(rows)) return []
  return rows
    .map(readKnowledgeChangeReceipt)
    .filter((item): item is KnowledgeChangeReceipt => item !== null)
}

export function collectKnowledgeChangeReceipts(events: any[]): KnowledgeChangeReceipt[] {
  const receipts: KnowledgeChangeReceipt[] = []
  const seen = new Set<string>()
  for (const event of events) {
    for (const receipt of eventKnowledgeChangeReceipts(event)) {
      if (seen.has(receipt.receiptId)) continue
      seen.add(receipt.receiptId)
      receipts.push(receipt)
    }
  }
  return receipts
}

export function knowledgeChangeReceiptTitle(receipt: KnowledgeChangeReceipt): string {
  if (receipt.status === 'cancelled') return '已取消变更'
  if (receipt.status === 'stale') return '变更未应用'
  if (receipt.status === 'failed') return '变更未完成'
  if (receipt.operation === 'insert') return '已完成录入'
  if (receipt.operation === 'delete') return '已完成删除'
  if (receipt.operation === 'move') return '已完成移动'
  return '已完成修改'
}

export function knowledgeChangeReceiptStatusLabel(receipt: KnowledgeChangeReceipt): string {
  if (receipt.status === 'applied') return '提交成功'
  if (receipt.status === 'cancelled') return '未产生写入'
  if (receipt.status === 'stale') return '原预览已失效'
  return '提交失败'
}
