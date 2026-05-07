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

export interface LLMProviderConfig {
  id: string
  user_id: number
  name: string
  provider_type: string
  base_url: string
  api_key: string
  proxy_url: string
  timeout_config: Record<string, any>
  max_retries: number
  model_config: Record<string, string>
  enabled: boolean
  is_active?: boolean
  created_at?: string | null
  updated_at?: string | null
}

export interface LLMProviderPayload {
  name: string
  provider_type: string
  base_url?: string
  api_key?: string
  proxy_url?: string
  timeout_config?: Record<string, any>
  max_retries?: number
  model_config?: Record<string, string>
  enabled?: boolean
}

export interface LLMRuntimeConfig {
  user_id: number
  source: string
  provider: Record<string, any> | null
  models: Record<string, string>
}

export async function listLLMProviders(): Promise<LLMProviderConfig[]> {
  const response = await request('GET', '/llm/providers') as any
  return Array.isArray(response) ? response : (response.providers || [])
}

export function createLLMProvider(payload: LLMProviderPayload): Promise<LLMProviderConfig> {
  return request('POST', '/llm/providers', payload)
}

export function updateLLMProvider(providerId: string, payload: LLMProviderPayload): Promise<LLMProviderConfig> {
  return request('PUT', `/llm/providers/${providerId}`, payload)
}

export function deleteLLMProvider(providerId: string): Promise<{ ok: boolean }> {
  return request('DELETE', `/llm/providers/${providerId}`)
}

export function activateLLMProvider(providerId: string): Promise<{ ok: boolean; active_provider_id: string }> {
  return request('POST', `/llm/providers/${providerId}/activate`)
}

export function testLLMProvider(providerId: string, payload: { model?: string } = {}): Promise<{
  ok: boolean
  model: string
  elapsed_ms: number
  response?: string
  error?: string
}> {
  return request('POST', `/llm/providers/${providerId}/test`, payload)
}

export function getLLMRuntimeConfig(): Promise<LLMRuntimeConfig> {
  return request('GET', '/llm/runtime-config')
}
