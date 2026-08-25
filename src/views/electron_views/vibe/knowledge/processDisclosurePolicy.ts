export interface VisibleProcessActionStat {
  key: 'source_count' | 'read_unit_count' | 'evidence_ref_count'
  label: string
  value: number
}

export interface ProcessActionMetaInput {
  status?: string
  stats?: Record<string, unknown>
  durationMs?: number
}

const PROCESS_ACTION_STAT_ALLOWLIST: ReadonlyArray<{
  key: VisibleProcessActionStat['key']
  label: string
}> = [
  { key: 'source_count', label: '来源' },
  { key: 'read_unit_count', label: '原文片段' },
  { key: 'evidence_ref_count', label: '可引用证据' },
]

/** 默认拒绝：只返回已经与后端约定的数值 stats，未知字段一律不可见。 */
export function visibleProcessActionStats(stats: unknown): VisibleProcessActionStat[] {
  if (!stats || typeof stats !== 'object' || Array.isArray(stats)) return []
  const record = stats as Record<string, unknown>
  return PROCESS_ACTION_STAT_ALLOWLIST.flatMap(({ key, label }) => {
    const value = record[key]
    return typeof value === 'number' && Number.isFinite(value) && value >= 0
      ? [{ key, label, value }]
      : []
  })
}

export function formatCompactProcessDuration(durationMs: unknown): string {
  if (typeof durationMs !== 'number' || !Number.isFinite(durationMs) || durationMs <= 0) return ''
  const seconds = durationMs / 1000
  if (seconds < 10) return `${Number(seconds.toFixed(1))}s`
  if (seconds < 60) return `${Math.round(seconds)}s`
  const minutes = Math.floor(seconds / 60)
  const remainder = Math.round(seconds % 60)
  return remainder ? `${minutes}m${remainder}s` : `${minutes}m`
}

/** 成功动作只展示正式 stats 与耗时，不读取 details 或推断任何业务结论。 */
export function compactProcessActionMeta(input: ProcessActionMetaInput): string {
  if (input.status !== 'success') return ''
  const parts = visibleProcessActionStats(input.stats)
    .map(item => `${item.label} ${item.value}`)
  const duration = formatCompactProcessDuration(input.durationMs)
  if (duration) parts.push(duration)
  return parts.join(' · ')
}
