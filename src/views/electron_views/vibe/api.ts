import { harnessRequest, streamHarnessSse } from '@/api/harness'

const request = harnessRequest

export interface VibeProject {
  id: string
  project_id: number
  name: string
  description: string
  baseline: Record<string, any>
  status: string
  created_at?: string
  updated_at?: string
}

export interface VibeSession {
  id: string
  vibe_project_id: string
  user_id: number
  title: string
  focus: string
  status: string
  created_at?: string
  updated_at?: string
  last_event_at?: string
}

export interface VibeEvent {
  id: string
  session_id: string
  vibe_project_id: string
  user_id: number
  role: string
  input_type: string
  content: string
  attachments: any[]
  event_order: number
  meta: Record<string, any>
  created_at?: string
}

export interface VibePatch {
  id: string
  vibe_project_id: string
  session_id?: string
  event_id?: string
  patch_type: string
  target_fact_id?: string
  target_relation_id?: string
  title: string
  reason: string
  old_value: Record<string, any>
  new_value: Record<string, any>
  impact: Record<string, any>
  test_suggestions: any[]
  questions: any[]
  status: string
  created_at?: string
  updated_at?: string
}

export interface VibeFact {
  id: string
  vibe_project_id: string
  fact_type: string
  name: string
  summary: string
  content: string
  structured_content: Record<string, any>
  status: string
  source_patch_id?: string
  created_at?: string
  updated_at?: string
}

export interface VibeRelation {
  id: string
  vibe_project_id: string
  source_fact_id: string
  target_fact_id: string
  relation_type: string
  description: string
  strength: string
  status: string
  source_patch_id?: string
  created_at?: string
  updated_at?: string
}

export interface VibeImpactRecord {
  id: string
  vibe_project_id: string
  patch_id: string
  impact_type: string
  affected_fact_ids: string[]
  affected_relation_ids: string[]
  affected_interface_bindings: string[]
  test_focus: any[]
  risk: string
  created_at?: string
}

export interface VibeLLMProviderConfig {
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

export interface VibeLLMProviderPayload {
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

export interface VibeLLMRuntimeConfig {
  user_id: number
  source: string
  provider: Record<string, any> | null
  models: Record<string, string>
}

export function getVibeProjectByAsyncProject(projectId: number): Promise<VibeProject> {
  return request('GET', `/vibe/projects/by-async-project/${projectId}`)
}

export function initVibeProject(projectId: number, payload: {
  name?: string
  description?: string
  baseline?: Record<string, any>
}): Promise<VibeProject> {
  return request('POST', `/vibe/projects/by-async-project/${projectId}/init`, payload)
}

export function listVibeSessions(vibeProjectId: string): Promise<VibeSession[]> {
  return request('GET', `/vibe/projects/${vibeProjectId}/sessions`)
}

export function createVibeSession(vibeProjectId: string, payload: {
  title?: string
  focus?: string
} = {}): Promise<VibeSession> {
  return request('POST', `/vibe/projects/${vibeProjectId}/sessions`, payload)
}

export function deleteVibeSession(sessionId: string): Promise<void> {
  return request('DELETE', `/vibe/sessions/${sessionId}`)
}

export function updateVibeProject(vibeProjectId: string, payload: {
  name?: string
  description?: string
  status?: string
  baseline?: Record<string, any>
}): Promise<VibeProject> {
  return request('PATCH', `/vibe/projects/${vibeProjectId}`, payload)
}

export function streamVibeBaseline(
  vibeProjectId: string,
  payload: { content: string },
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse(`/vibe/projects/${vibeProjectId}/baseline/analyze/stream`, payload, handlers)
}

export function listVibeEvents(sessionId: string): Promise<VibeEvent[]> {
  return request('GET', `/vibe/sessions/${sessionId}/events`)
}

export function streamVibeEvent(
  sessionId: string,
  payload: {
    content: string
    input_type?: string
    interaction_mode?: 'chat' | 'entry' | string
    attachments?: any[]
    meta?: Record<string, any>
  },
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse(`/vibe/sessions/${sessionId}/events/stream`, {
    input_type: 'text',
    attachments: [],
    ...payload,
  }, handlers)
}

export function listVibePatches(vibeProjectId: string, status?: string): Promise<VibePatch[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return request('GET', `/vibe/projects/${vibeProjectId}/patches${qs}`)
}

export function confirmVibePatch(patchId: string, payload?: Record<string, any>): Promise<{
  patch: VibePatch
  fact_id?: string
  impact?: VibeImpactRecord
}> {
  return request('POST', `/vibe/patches/${patchId}/confirm`, payload || {})
}

export async function listVibeLLMProviders(): Promise<{
  providers: VibeLLMProviderConfig[]
  default_model_config: Record<string, string>
  model_config_keys: string[]
}> {
  return request('GET', '/vibe/llm/providers')
}

export function createVibeLLMProvider(payload: VibeLLMProviderPayload): Promise<VibeLLMProviderConfig> {
  return request('POST', '/vibe/llm/providers', payload)
}

export function updateVibeLLMProvider(providerId: string, payload: VibeLLMProviderPayload): Promise<VibeLLMProviderConfig> {
  return request('PUT', `/vibe/llm/providers/${providerId}`, payload)
}

export function deleteVibeLLMProvider(providerId: string): Promise<{ ok: boolean }> {
  return request('DELETE', `/vibe/llm/providers/${providerId}`)
}

export function activateVibeLLMProvider(providerId: string): Promise<{ ok: boolean; active_provider_id: string }> {
  return request('POST', `/vibe/llm/providers/${providerId}/activate`)
}

export function testVibeLLMProvider(providerId: string, payload: { model?: string } = {}): Promise<{
  ok: boolean
  model: string
  elapsed_ms: number
  response?: string
  error?: string
}> {
  return request('POST', `/vibe/llm/providers/${providerId}/test`, payload)
}

export function getVibeLLMRuntimeConfig(): Promise<VibeLLMRuntimeConfig> {
  return request('GET', '/vibe/llm/runtime-config')
}

export function ignoreVibePatch(patchId: string): Promise<VibePatch> {
  return request('POST', `/vibe/patches/${patchId}/ignore`, {})
}

export function listVibeFacts(vibeProjectId: string, params: {
  fact_type?: string
  status?: string
} = {}): Promise<VibeFact[]> {
  const qs = new URLSearchParams()
  if (params.fact_type) qs.set('fact_type', params.fact_type)
  if (params.status) qs.set('status', params.status)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request('GET', `/vibe/projects/${vibeProjectId}/facts${suffix}`)
}

export function getVibeFact(vibeProjectId: string, factId: string): Promise<VibeFact> {
  return request('GET', `/vibe/projects/${vibeProjectId}/facts/${factId}`)
}

export function updateVibeFact(vibeProjectId: string, factId: string, payload: Partial<VibeFact>): Promise<VibeFact> {
  return request('PATCH', `/vibe/projects/${vibeProjectId}/facts/${factId}`, payload)
}

export function forceDeleteVibeFact(vibeProjectId: string, factId: string): Promise<{ ok: boolean; deleted_fact_id: string }> {
  return request('DELETE', `/vibe/projects/${vibeProjectId}/facts/${factId}`)
}

export function listVibeRelations(vibeProjectId: string, factId?: string): Promise<VibeRelation[]> {
  const qs = factId ? `?fact_id=${encodeURIComponent(factId)}` : ''
  return request('GET', `/vibe/projects/${vibeProjectId}/relations${qs}`)
}

export function forceDeleteVibeRelation(vibeProjectId: string, relationId: string): Promise<{ ok: boolean; deleted_relation_id: string }> {
  return request('DELETE', `/vibe/projects/${vibeProjectId}/relations/${relationId}`)
}

export function listVibeImpactRecords(vibeProjectId: string, patchId?: string): Promise<VibeImpactRecord[]> {
  const qs = patchId ? `?patch_id=${encodeURIComponent(patchId)}` : ''
  return request('GET', `/vibe/projects/${vibeProjectId}/impact-records${qs}`)
}

export function forceDeleteVibeImpactRecord(vibeProjectId: string, impactId: string): Promise<{ ok: boolean; deleted_impact_id: string }> {
  return request('DELETE', `/vibe/projects/${vibeProjectId}/impact-records/${impactId}`)
}

export function streamVibeRetrieval(
  payload: {
    query: string
    vibe_project_id?: string
  },
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse('/vibe/retrieval/query/stream', payload, handlers)
}
