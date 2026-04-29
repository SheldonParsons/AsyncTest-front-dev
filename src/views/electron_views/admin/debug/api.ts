import { harnessRequest as request } from '@/api/harness'

export interface DebugTraceEvent {
  id: string
  trace_id: string
  kb_id?: number | null
  node_id?: string | null
  block_id?: string | null
  category: string
  action: string
  step: string
  level: string
  message: string
  payload: Record<string, any>
  created_at?: string | null
}

export function listDebugEvents(params: {
  kb_id?: number | null
  category?: string
  action?: string
  trace_id?: string
  limit?: number
} = {}): Promise<DebugTraceEvent[]> {
  const qs = new URLSearchParams()
  if (params.kb_id != null) qs.set('kb_id', String(params.kb_id))
  if (params.category) qs.set('category', params.category)
  if (params.action) qs.set('action', params.action)
  if (params.trace_id) qs.set('trace_id', params.trace_id)
  if (params.limit) qs.set('limit', String(params.limit))
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request('GET', `/debug/events${suffix}`)
}

export function clearDebugEvents(kbId?: number | null): Promise<{ ok: boolean; deleted: number }> {
  const qs = kbId != null ? `?kb_id=${kbId}` : ''
  return request('DELETE', `/debug/events${qs}`)
}

export function clearDebugIndex(kbId: number, target: 'term' | 'ref' | 'outline' | 'all'): Promise<{
  ok: boolean
  trace_id: string
  deleted: Record<string, number>
}> {
  return request('DELETE', `/debug/kb/${kbId}/index/${target}`)
}

export function listDebugRefs(kbId: number): Promise<any[]> {
  return request('GET', `/debug/kb/${kbId}/refs`)
}

export function listDebugTermIndex(kbId: number): Promise<any[]> {
  return request('GET', `/debug/kb/${kbId}/term-index`)
}

export function listDebugTermDict(kbId: number): Promise<any[]> {
  return request('GET', `/debug/kb/${kbId}/term-dict`)
}

export function listDebugOutlineCache(kbId: number): Promise<any[]> {
  return request('GET', `/debug/kb/${kbId}/outline-cache`)
}
