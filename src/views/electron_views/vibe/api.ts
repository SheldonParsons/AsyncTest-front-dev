import { harnessBlobRequest, harnessMultipartRequest, harnessRequest, streamHarnessSse } from '@/api/harness'
import {
  canonicalAttachmentUploadMime,
  normalizeAttachmentResourceRef,
} from './attachmentResourceContract'
import type { VibeAttachmentResourceRef } from './attachmentResourceContract'

export type { VibeAttachmentResourceRef } from './attachmentResourceContract'

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
  title: string
  llm_provider_id?: string
  provider_id?: string
  vibe_project_id?: string
  user_id?: number
  focus?: string
  test_run_id?: string
  status?: string
  created_at?: string
  updated_at?: string
  last_event_at?: string
}

export interface VibeSessionPage {
  sessions: VibeSession[]
  page: {
    limit: number
    has_more: boolean
    next_cursor: string | null
  }
}

export interface VibeAttachment {
  schema?: 'attachment_resource_ref.v1'
  resource_id?: string
  id?: string
  name?: string
  filename?: string
  mime?: string
  size?: number
  content?: string
  text?: string
  download_url?: string
  kind?: string
  chars?: number
  content_sha256?: string
}

export interface VibeEvent {
  id: string
  session_id: string
  vibe_project_id: string
  user_id: number
  role: string
  input_type: string
  content: string
  attachments: VibeAttachment[]
  event_order: number
  mode?: string
  test_run_id?: string
  meta: Record<string, any>
  created_at?: string
}

export interface VibeLabCase {
  id: string
  title: string
  description: string
  input_text: string
  expected: Record<string, any>
  sort_order: number
  enabled: boolean
}

export interface VibeLabAssertion {
  id: string
  run_id: string
  name: string
  title: string
  passed: boolean
  severity: string
  detail: string
  expected: Record<string, any>
  actual: Record<string, any>
  created_at?: string
}

export interface VibeLabRun {
  id: string
  test_run_id: string
  case_id?: string
  vibe_project_id?: string
  package_id?: string
  input_text: string
  status: string
  trace: Record<string, any>
  db_diff: Record<string, any>
  assertions: VibeLabAssertion[]
  created_at?: string
  updated_at?: string
}

export interface VibeLLMProviderConfig {
  id: string
  user_id: number
  name: string
  provider_type: string
  base_url: string
  has_api_key?: boolean
  proxy_url: string
  timeout_config: Record<string, any>
  max_retries: number
  model_config: Record<string, string>
  enabled: boolean
  available_to_all: boolean
  is_active?: boolean
  is_system_default?: boolean
  source?: string
  editable?: boolean
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
  available_to_all?: boolean
}

export interface VibeLLMSceneConfig {
  key: string
  label: string
  description?: string
  default_strength: 'mini' | 'strong'
  strength: 'mini' | 'strong'
  is_overridden?: boolean
}

export interface VibeLLMRuntimeConfig {
  schema: 'llm_runtime_selection.v1'
  session_id: string
  selected_provider_id: string
  selection_source: 'session' | 'user' | 'system_default' | 'none'
  error?: string
}

export interface VibeLLMModelPickerProvider {
  id: string
  name: string
  enabled: boolean
  source: 'mine' | 'system_default'
  is_system_default: boolean
}

export interface VibeLLMModelPicker {
  schema: 'llm_model_picker.v1'
  session_id: string
  selected_provider_id: string
  selection_source: 'session' | 'user' | 'system_default' | 'none'
  providers: VibeLLMModelPickerProvider[]
}

export interface VibeCapabilityUser {
  id?: number | null
  username: string
  nick_name: string
  display_name: string
  email?: string
  mobile?: string
  sex?: number | null
  avatar_url?: string
}

export interface VibeFeatureConfig {
  account: string
  feature_key: string
  enabled: boolean
  config: Record<string, any>
  source: string
  updated_at?: string | null
}

export interface VibeConversationControl {
  disabled: boolean
  message: string
  attachment_oss_base_url: string
  source?: string
  updated_at?: string | null
}

export interface VibeCapabilities {
  user_id: number
  account: string
  user: VibeCapabilityUser
  capabilities: Record<string, boolean>
  feature_configs?: Record<string, VibeFeatureConfig>
}

export function getVibeCapabilities(): Promise<VibeCapabilities> {
  return request('GET', '/vibe/capabilities')
}

export function getVibeConversationControl(): Promise<{ item: VibeConversationControl }> {
  return request('GET', '/vibe/admin/conversation-control')
}

export function updateVibeConversationControl(payload: {
  disabled: boolean
  message: string
  attachment_oss_base_url: string
}): Promise<{ ok: boolean; item: VibeConversationControl }> {
  return request('PATCH', '/vibe/admin/conversation-control', payload)
}

export type VibeKnowledgeApiModelRole = 'rerank' | 'embedding'

export interface VibeKnowledgeApiModelConfig {
  role: VibeKnowledgeApiModelRole
  provider_type: 'dashscope'
  enabled: boolean
  endpoint: string
  model: string
  timeout_seconds: number
  api_key_configured: boolean
  dimension?: number | null
  batch_size?: number | null
  query_instruct?: string
  updated_at?: string | null
}

export interface VibeKnowledgeApiModelPayload {
  provider_type: 'dashscope'
  enabled: boolean
  endpoint: string
  model: string
  timeout_seconds: number
  api_key?: string
  dimension?: number
  batch_size?: number
  query_instruct?: string
}

export function getVibeKnowledgeApiModelConfig(
  role: VibeKnowledgeApiModelRole,
): Promise<{ item: VibeKnowledgeApiModelConfig }> {
  return request('GET', `/vibe/admin/knowledge-model-configs/${role}`)
}

export function updateVibeKnowledgeApiModelConfig(
  role: VibeKnowledgeApiModelRole,
  payload: VibeKnowledgeApiModelPayload,
): Promise<{ ok: boolean; item: VibeKnowledgeApiModelConfig }> {
  return request('PATCH', `/vibe/admin/knowledge-model-configs/${role}`, payload)
}

export interface VibeUsageSummary {
  total_tokens: number
  peak_tokens: number
  max_elapsed_ms: number
  dialogue_turns: number
  latest_sent_at?: string | null
  scope?: string
  rule?: Record<string, number>
}

export function getVibeUsageSummary(): Promise<VibeUsageSummary> {
  return request('GET', '/vibe/usage/summary')
}

export function getVibeAdminFeatureConfigs(): Promise<{ items: Record<string, VibeFeatureConfig> }> {
  return request('GET', '/vibe/admin/feature-configs')
}

export function updateVibeTraceAuditConfig(enabled: boolean): Promise<{ ok: boolean; item: VibeFeatureConfig }> {
  return request('PATCH', '/vibe/admin/feature-configs/trace_audit', { enabled })
}


export interface VibeSystemKnowledgeItem {
  id: number
  slug?: string
  category: string
  title: string
  content_markdown: string
  status: 'enabled' | 'disabled' | 'deleted' | string
  priority: number
  tags: string[]
  source_note?: string
  created_by?: number | null
  updated_by?: number | null
  created_at?: string
  updated_at?: string
}

export interface VibeSystemKnowledgePayload {
  slug?: string
  category: string
  title: string
  content_markdown: string
  status?: 'enabled' | 'disabled' | 'deleted' | string
  priority?: number
  tags?: string[] | string
  source_note?: string
}

export function listVibeSystemKnowledge(params: {
  q?: string
  category?: string
  status?: string
  limit?: number
  cursor?: string | number
} = {}): Promise<{
  items: VibeSystemKnowledgeItem[]
  next_cursor: string
  categories?: Array<{ category: string; count: number }>
}> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value))
  })
  const qs = query.toString()
  return request('GET', `/vibe/admin/system-knowledge${qs ? `?${qs}` : ''}`)
}

export function createVibeSystemKnowledge(payload: VibeSystemKnowledgePayload): Promise<{ ok: boolean; item: VibeSystemKnowledgeItem }> {
  return request('POST', '/vibe/admin/system-knowledge', payload)
}

export function updateVibeSystemKnowledge(itemId: number, payload: VibeSystemKnowledgePayload): Promise<{ ok: boolean; item: VibeSystemKnowledgeItem }> {
  return request('PUT', `/vibe/admin/system-knowledge/${itemId}`, payload)
}

export function deleteVibeSystemKnowledge(itemId: number): Promise<{ ok: boolean; item: VibeSystemKnowledgeItem }> {
  return request('DELETE', `/vibe/admin/system-knowledge/${itemId}`)
}

export interface VibeSystemKnowledgeTransferItem {
  slug: string
  category: string
  title: string
  content_markdown: string
  status: 'enabled' | 'disabled'
  priority: number
  tags: string[]
  source_note?: string
  content_sha256: string
}

export interface VibeSystemKnowledgeBundle {
  schema: string
  version: number
  revision?: string
  exported_at?: string
  package_fingerprint: string
  items: VibeSystemKnowledgeTransferItem[]
}

export interface VibeSystemKnowledgeImportPlan {
  ok?: boolean
  dry_run?: boolean
  mode: 'replace' | 'merge'
  created: string[]
  updated: string[]
  unchanged: string[]
  retired: string[]
  counts: {
    created: number
    updated: number
    unchanged: number
    retired: number
    incoming: number
  }
  package_fingerprint: string
  revision?: string
}

export function exportVibeSystemKnowledge(): Promise<VibeSystemKnowledgeBundle> {
  return request('GET', '/vibe/admin/system-knowledge-transfer')
}

export function previewVibeSystemKnowledgeImport(
  config: VibeSystemKnowledgeBundle,
  mode: 'replace' | 'merge' = 'replace',
): Promise<VibeSystemKnowledgeImportPlan> {
  return request('POST', '/vibe/admin/system-knowledge-transfer', { config, mode, dry_run: true })
}

export function importVibeSystemKnowledge(
  config: VibeSystemKnowledgeBundle,
  mode: 'replace' | 'merge' = 'replace',
): Promise<VibeSystemKnowledgeImportPlan> {
  return request('POST', '/vibe/admin/system-knowledge-transfer', { config, mode, dry_run: false })
}

export interface VibeAdminConfigTransferPayload {
  schema: string
  version: number
  exported_at?: string
  sections?: string[]
  llm_system_default_models?: {
    providers: VibeLLMProviderConfig[]
    system_default_provider_ids: string[]
  }
  llm_model_scenes?: {
    scenes: VibeLLMSceneConfig[]
    strengths?: Record<string, 'mini' | 'strong'>
  }
}

export function exportVibeAdminConfig(): Promise<VibeAdminConfigTransferPayload> {
  return request('GET', '/vibe/admin/config-transfer')
}

export function importVibeAdminConfig(config: Record<string, any>): Promise<{
  ok: boolean
  imported: { providers: number; scenes: number }
  provider_id_map: Record<string, string>
  config: VibeAdminConfigTransferPayload
}> {
  return request('POST', '/vibe/admin/config-transfer', { config })
}


export interface VibeDialogueTraceRun {
  trace_id?: string
  audit_marker: string
  turn_id?: string
  session_id?: string
  session_title?: string
  project_id?: string
  project_name?: string
  user_id?: number
  account?: string
  username?: string
  user_display_name?: string
  input_text?: string
  route_action?: string
  final_status?: string
  summary?: string
  started_at?: string
  ended_at?: string | null
  elapsed_ms?: number | null
  trace_source?: 'server' | 'electron' | string
  trace_local?: boolean
}

export interface VibeDialogueTraceEvent {
  id?: number
  trace_id?: string
  seq: number
  stage: string
  event_type: string
  title?: string
  reason?: string
  severity?: string
  elapsed_ms?: number | null
  created_at?: string
  payload?: Record<string, any>
}

export interface VibeDialogueTraceDetail extends VibeDialogueTraceRun {
  detail_view?: 'public' | 'private'
  request_id?: string
  attachment_summary?: Record<string, any>
  side_effects?: Record<string, any>
  events: VibeDialogueTraceEvent[]
}

export function listVibeDialogueTraceRuns(params: {
  limit?: number
  cursor?: string
  project?: string
  user?: string
  status?: string
  marker?: string
  q?: string
} = {}): Promise<{
  items: VibeDialogueTraceRun[]
  next_cursor: string
  filters?: {
    projects?: Array<{ project_name: string; count: number }>
    users?: Array<{ label: string; count: number }>
  }
}> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value))
  })
  const qs = query.toString()
  return request('GET', `/vibe/foundation/dialogue-trace/runs${qs ? `?${qs}` : ''}`)
}

export function getVibeDialogueTraceDetail(traceId: string, view: 'public' | 'private' = 'public'): Promise<VibeDialogueTraceDetail> {
  const query = `?view=${view}`
  return request('GET', `/vibe/foundation/dialogue-trace/runs/${encodeURIComponent(traceId)}${query}`)
}

export function downloadVibeDialogueTraceAttachment(
  traceId: string,
  index: number,
  downloadUrl = '',
) {
  const path = downloadUrl || `/vibe/foundation/dialogue-trace/runs/${encodeURIComponent(traceId)}/attachments/${index}`
  return harnessBlobRequest(path)
}

// 会话事件附件正文按需取：events 列表不再内联正文，只给 download_url。
export function downloadVibeSessionEventAttachment(
  sessionId: string,
  eventId: string,
  index: number,
  downloadUrl = '',
) {
  const path = downloadUrl || `/vibe/sessions/${encodeURIComponent(sessionId)}`
    + `/events/${encodeURIComponent(eventId)}/attachments/${index}`
  return harnessBlobRequest(path)
}

interface VibeAttachmentUploadResponse {
  ok: true
  resource: unknown
  state: 'pending'
  expires_at: string | null
  idempotent_replay: boolean
}

export async function uploadVibeAttachmentResource(
  sessionId: string,
  file: File,
  idempotencyKey: string,
): Promise<VibeAttachmentResourceRef> {
  // Electron's native local picker returns a metadata object carrying an
  // admission token, not a browser Blob. Keep this guard at the uploader
  // boundary so a future caller cannot accidentally send a local attachment
  // through the legacy server resource endpoint.
  if (String((file as any)?.admission_token || (file as any)?.admissionToken || '').trim()) {
    throw new Error('本地附件不得上传到服务器')
  }
  if (!sessionId.trim()) throw new Error('上传附件前必须先创建会话')
  if (!/^[\x20-\x7e]{1,128}$/.test(idempotencyKey)) throw new Error('附件上传幂等键无效')
  const canonicalMime = canonicalAttachmentUploadMime(file.name, file.type)
  const uploadBody = file.type === canonicalMime ? file : file.slice(0, file.size, canonicalMime)
  const formData = new FormData()
  formData.append('file', uploadBody, file.name)
  const response = await harnessMultipartRequest<VibeAttachmentUploadResponse>(
    'POST',
    `/vibe/sessions/${encodeURIComponent(sessionId)}/attachments`,
    formData,
    { 'Idempotency-Key': idempotencyKey },
  )
  if (response.ok !== true || response.state !== 'pending'
    || (response.expires_at !== null
      && (typeof response.expires_at !== 'string' || !response.expires_at))
    || typeof response.idempotent_replay !== 'boolean') {
    throw new Error('附件上传响应 envelope 无效')
  }
  const resource = normalizeAttachmentResourceRef(response.resource)
  const expectedDownloadUrl = `/vibe/sessions/${encodeURIComponent(sessionId)}`
    + `/attachments/${encodeURIComponent(resource.resource_id)}`
  if (resource.download_url !== expectedDownloadUrl) throw new Error('附件下载地址与资源身份不一致')
  return resource
}

export function deleteVibeAttachmentResource(
  sessionId: string,
  resourceId: string,
): Promise<{ ok: boolean }> {
  if (!sessionId.trim() || !resourceId.trim()) return Promise.reject(new Error('附件资源身份无效'))
  return request(
    'DELETE',
    `/vibe/sessions/${encodeURIComponent(sessionId)}/attachments/${encodeURIComponent(resourceId)}`,
  )
}

export function getVibeProjectByAsyncProject(projectId: number): Promise<VibeProject> {
  return request('GET', `/vibe/projects/by-async-project/${projectId}`)
}

export function getVibeProjectsByAsyncProjects(projectIds: number[]): Promise<{ items: VibeProject[] }> {
  const ids = Array.from(new Set(projectIds.map((id) => Number(id)).filter((id) => Number.isFinite(id))))
  return request('POST', '/vibe/projects/by-async-projects', { project_ids: ids })
}

export function initVibeProject(projectId: number, payload: {
  name?: string
  description?: string
  baseline?: Record<string, any>
}): Promise<VibeProject> {
  return request('POST', `/vibe/projects/by-async-project/${projectId}/init`, payload)
}

export function listVibeSessions(
  vibeProjectId: string,
  options: { cursor?: string; limit?: number } = {},
): Promise<VibeSessionPage> {
  const query = new URLSearchParams({ limit: String(options.limit ?? 100) })
  if (options.cursor) query.set('cursor', options.cursor)
  return request('GET', `/vibe/projects/${vibeProjectId}/sessions?${query.toString()}`)
}

export function createVibeSession(vibeProjectId: string, payload: {
  title?: string
  focus?: string
  llm_provider_id?: string
} = {}): Promise<VibeSession> {
  return request('POST', `/vibe/projects/${vibeProjectId}/sessions`, payload)
}

export function deleteVibeSession(sessionId: string): Promise<void> {
  return request('DELETE', `/vibe/sessions/${sessionId}`)
}

export function updateVibeSession(sessionId: string, payload: {
  title?: string
  focus?: string
  status?: string
  llm_provider_id?: string
}): Promise<VibeSession> {
  return request('PATCH', `/vibe/sessions/${sessionId}`, payload)
}

export function autoTitleVibeSession(sessionId: string, content: string): Promise<VibeSession> {
  return request('POST', `/vibe/sessions/${sessionId}/auto-title`, { content })
}

export function cleanupVibeSessionTestData(sessionId: string, payload: {
  reset_baseline?: boolean
} = {}): Promise<{ ok: boolean; session_id: string; project_id: string; deleted: Record<string, number> }> {
  return request('POST', `/vibe/sessions/${sessionId}/test-cleanup`, {
    reset_baseline: true,
    ...payload,
  })
}

export function updateVibeProject(vibeProjectId: string, payload: {
  name?: string
  description?: string
  status?: string
  baseline?: Record<string, any>
}): Promise<VibeProject> {
  return request('PATCH', `/vibe/projects/${vibeProjectId}`, payload)
}

export function listVibeEvents(sessionId: string): Promise<VibeEvent[]> {
  return request('GET', `/vibe/sessions/${sessionId}/events`)
}

export interface VibeSessionSourceLocator {
  offset_unit: 'unicode_code_point'
  start_offset: number
  end_offset: number
}

export interface VibeSessionSourceDetail {
  schema: 'source_content.v1'
  source_id: string
  display_name: string
  source_kind: string
  mime_type: string
  content_hash: string
  text: string
  chars: number
  range_sha256: string
  locator?: VibeSessionSourceLocator
}

export interface VibeSessionSourceFragment extends Omit<VibeSessionSourceDetail, 'schema' | 'locator'> {
  schema: 'source_fragment.v1'
  locator: VibeSessionSourceLocator
}

export interface VibeSessionSourceDetailResponse {
  ok: true
  source: VibeSessionSourceDetail
}

export interface VibeSessionSourceFragmentResponse {
  ok: true
  source: VibeSessionSourceFragment
}

/** 会话引用正文按需读取；events 只承载 public_source_ref.v1 轻量定位符。 */
export function getVibeSessionSourceFragment(
  sessionId: string,
  sourceId: string,
  locator: { startOffset: number; endOffset: number },
): Promise<VibeSessionSourceFragmentResponse> {
  const query = new URLSearchParams({
    start_offset: String(locator.startOffset),
    end_offset: String(locator.endOffset),
  })
  return request(
    'GET',
    `/vibe/sessions/${encodeURIComponent(sessionId)}`
      + `/sources/${encodeURIComponent(sourceId)}/fragment?${query.toString()}`,
  )
}

/** 缺少引用区间时按需读取会话授权范围内的完整来源；不回退项目级旧接口。 */
export function getVibeSessionSource(
  sessionId: string,
  sourceId: string,
): Promise<VibeSessionSourceDetailResponse> {
  return request(
    'GET',
    `/vibe/sessions/${encodeURIComponent(sessionId)}`
      + `/sources/${encodeURIComponent(sourceId)}`,
  )
}

export async function listVibeLLMProviders(): Promise<{
  schema: 'llm_provider_settings.v1'
  providers: VibeLLMProviderConfig[]
}> {
  return request('GET', '/vibe/llm/providers')
}

export function getVibeLLMModelPicker(sessionId?: string): Promise<VibeLLMModelPicker> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  return request('GET', `/vibe/llm/model-picker${query}`)
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

export function getVibeLLMRuntimeConfig(sessionId?: string): Promise<VibeLLMRuntimeConfig> {
  const query = sessionId ? `?session_id=${encodeURIComponent(sessionId)}` : ''
  return request('GET', `/vibe/llm/runtime-config${query}`)
}

export interface VibeLLMAdminUserDefault {
  id: number
  username: string
  nick_name?: string
  display_name?: string
  active_provider_id?: string
}

export function getVibeLLMAdminModelDefaults(): Promise<{
  users: VibeLLMAdminUserDefault[]
  providers: VibeLLMProviderConfig[]
  system_default_provider_ids: string[]
  admin_user_id: number
}> {
  return request('GET', '/vibe/llm/admin/model-defaults')
}

export function setVibeLLMAdminSystemDefaults(providerIds: string[]): Promise<{
  users: VibeLLMAdminUserDefault[]
  providers: VibeLLMProviderConfig[]
  system_default_provider_ids: string[]
  admin_user_id: number
}> {
  return request('PATCH', '/vibe/llm/admin/model-defaults', { provider_ids: providerIds })
}

export function getVibeLLMAdminModelScenes(): Promise<{
  scenes: VibeLLMSceneConfig[]
  strengths: Record<string, 'mini' | 'strong'>
}> {
  return request('GET', '/vibe/llm/admin/model-scenes')
}

export function updateVibeLLMAdminModelScenes(scenes: Array<{ key: string; strength: 'mini' | 'strong' }>): Promise<{
  scenes: VibeLLMSceneConfig[]
  strengths: Record<string, 'mini' | 'strong'>
}> {
  return request('PATCH', '/vibe/llm/admin/model-scenes', { scenes })
}

export interface ConvergeConfig {
  auto_enabled: boolean
  full_run_time: string
  dedup_threshold_n: number
  inline_converge: boolean
  staleness_alarm_hours: number
  updated_at?: string | null
  is_admin?: boolean
}

export function getConvergeConfig(): Promise<ConvergeConfig> {
  return request('GET', '/vibe/foundation/converge/config')
}

export function updateConvergeConfig(payload: Partial<ConvergeConfig>): Promise<ConvergeConfig> {
  return request('PUT', '/vibe/foundation/converge/config', payload)
}

export function listVibeLabCases(): Promise<VibeLabCase[]> {
  return request('GET', '/vibe/lab/cases')
}

export function runVibeLab(payload: {
  input_text: string
  vibe_project_id?: string
  expected?: Record<string, any>
}): Promise<VibeLabRun> {
  return request('POST', '/vibe/lab/runs', payload)
}

export function streamVibeLab(
  payload: {
    input_text: string
    vibe_project_id?: string
    expected?: Record<string, any>
  },
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse('/vibe/lab/runs/stream', payload, handlers)
}

export function runVibeLabCase(caseId: string, payload: Record<string, any> = {}): Promise<VibeLabRun> {
  return request('POST', `/vibe/lab/cases/${caseId}/run`, payload)
}

export function streamVibeLabCase(
  caseId: string,
  payload: Record<string, any> = {},
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse(`/vibe/lab/cases/${caseId}/run/stream`, payload, handlers)
}

export function getVibeLabRun(runId: string): Promise<VibeLabRun> {
  return request('GET', `/vibe/lab/runs/${runId}`)
}

export function confirmVibeLabRun(runId: string): Promise<VibeLabRun> {
  return request('POST', `/vibe/lab/runs/${runId}/confirm`, {})
}

export function cleanupVibeLabRun(runId: string): Promise<VibeLabRun> {
  return request('POST', `/vibe/lab/runs/${runId}/cleanup`, {})
}

// =====================================================================
// Lab v2 — sessions / messages stream / overview / cleanup-all
// =====================================================================

export type VibeLabCardType =
  | 'answer'
  | 'sources'
  | 'clarify'
  | 'package'
  | 'tool_plan'
  | 'tool_result'
  | 'test_draft'
  | 'trace'

export interface VibeLabCard {
  id: string
  type: VibeLabCardType
  title?: string
  [key: string]: any
}

export interface VibeLabTask {
  id: string
  status: string
  mode?: string
  intent?: string | null
  user_event_id?: string | null
  assistant_event_id?: string | null
  created_at?: string
  updated_at?: string
  cards?: VibeLabCard[]
  run_ids?: string[]
}

export interface VibeLabSessionSummary {
  id: string
  title: string
  focus: string
  status: string
  user_id: number
  created_at?: string
  updated_at?: string
  last_event_at?: string | null
  stats: {
    user_msgs: number
    assistant_msgs: number
    runs?: { total: number; by_status: Record<string, number> }
  }
}

export interface VibeLabSessionDetail extends VibeLabSessionSummary {
  events: VibeEvent[]
  tasks: VibeLabTask[]
  runs: VibeLabRun[]
}

export interface VibeLabOverviewSummary {
  project_id: string
  project_name: string
  baseline: Record<string, any>
  totals: {
    facts: number
    relations: number
    context_notes: number
    candidate_assets: number
    impact_records: number
    pending_questions: number
    silent_facts: number
  }
  facts_by_type: Record<string, number>
}

export interface VibePagedResult<T> {
  items: T[]
  total: number
  page: number
  page_size: number
}

export interface VibeLabGraphNode {
  id: string
  kind: 'fact'
  fact_type: string
  label: string
  summary: string
  content?: string
  status: string
  meta?: Record<string, any>
}

export interface VibeLabGraphEdge {
  id: string
  source: string
  target: string
  relation_type: string
  label: string
  status: string
  strength?: string
  description?: string
  meta?: Record<string, any>
}

export interface VibeLabGraph {
  nodes: VibeLabGraphNode[]
  edges: VibeLabGraphEdge[]
  stats: {
    facts: number
    relations: number
    isolated: number
    mode: 'focus' | 'all'
    depth: number
    include_isolated: boolean
    total_facts: number
    total_relations: number
    broken_relations: number
  }
  warnings?: Array<Record<string, any>>
}

export function listVibeLabSessions(params: { keyword?: string; limit?: number } = {}): Promise<VibeLabSessionSummary[]> {
  const usp = new URLSearchParams()
  if (params.keyword) usp.set('keyword', params.keyword)
  if (params.limit) usp.set('limit', String(params.limit))
  const qs = usp.toString()
  return request('GET', `/vibe/lab/sessions${qs ? `?${qs}` : ''}`)
}

export function createVibeLabSession(title?: string): Promise<VibeLabSessionSummary> {
  return request('POST', '/vibe/lab/sessions', { title: title || '' })
}

export function getVibeLabSession(sessionId: string): Promise<VibeLabSessionDetail> {
  return request('GET', `/vibe/lab/sessions/${sessionId}`)
}

export function renameVibeLabSession(sessionId: string, title: string): Promise<VibeLabSessionDetail> {
  return request('PATCH', `/vibe/lab/sessions/${sessionId}`, { title })
}

export function deleteVibeLabSession(sessionId: string): Promise<{ ok: boolean }> {
  return request('DELETE', `/vibe/lab/sessions/${sessionId}`)
}

export function streamVibeLabMessage(
  sessionId: string,
  payload: { text: string; mode: 'chat' | 'ingest'; task_id?: string },
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse(`/vibe/lab/sessions/${sessionId}/messages/stream`, payload, handlers)
}

export function getVibeLabOverview(): Promise<VibeLabOverviewSummary> {
  return request('GET', '/vibe/lab/overview')
}

export function getVibeLabOverviewFacts(params: { fact_type?: string; keyword?: string; page?: number; page_size?: number } = {}): Promise<VibePagedResult<any>> {
  const usp = new URLSearchParams()
  if (params.fact_type) usp.set('fact_type', params.fact_type)
  if (params.keyword) usp.set('keyword', params.keyword)
  if (params.page) usp.set('page', String(params.page))
  if (params.page_size) usp.set('page_size', String(params.page_size))
  const qs = usp.toString()
  return request('GET', `/vibe/lab/overview/facts${qs ? `?${qs}` : ''}`)
}

export function getVibeLabOverviewRelations(page = 1, pageSize = 50): Promise<VibePagedResult<any>> {
  return request('GET', `/vibe/lab/overview/relations?page=${page}&page_size=${pageSize}`)
}

export function getVibeLabGraph(params: { mode?: 'focus' | 'all'; fact_id?: string; depth?: 1 | 2; include_isolated?: boolean } = {}): Promise<VibeLabGraph> {
  const usp = new URLSearchParams()
  if (params.mode) usp.set('mode', params.mode)
  if (params.fact_id) usp.set('fact_id', params.fact_id)
  if (params.depth) usp.set('depth', String(params.depth))
  if (params.include_isolated != null) usp.set('include_isolated', params.include_isolated ? 'true' : 'false')
  const qs = usp.toString()
  return request('GET', `/vibe/lab/graph${qs ? `?${qs}` : ''}`)
}

export function getVibeLabOverviewNotes(page = 1, pageSize = 50): Promise<VibePagedResult<any>> {
  return request('GET', `/vibe/lab/overview/context-notes?page=${page}&page_size=${pageSize}`)
}

export function getVibeLabOverviewCandidates(params: { asset_type?: string; keyword?: string; page?: number; page_size?: number } = {}): Promise<VibePagedResult<any>> {
  const usp = new URLSearchParams()
  if (params.asset_type) usp.set('asset_type', params.asset_type)
  if (params.keyword) usp.set('keyword', params.keyword)
  if (params.page) usp.set('page', String(params.page))
  if (params.page_size) usp.set('page_size', String(params.page_size))
  const qs = usp.toString()
  return request('GET', `/vibe/lab/overview/candidate-assets${qs ? `?${qs}` : ''}`)
}

export function getVibeLabOverviewImpacts(page = 1, pageSize = 50): Promise<VibePagedResult<any>> {
  return request('GET', `/vibe/lab/overview/impacts?page=${page}&page_size=${pageSize}`)
}

export function getVibeLabOverviewQuestions(status = 'pending', page = 1, pageSize = 50): Promise<VibePagedResult<any>> {
  return request('GET', `/vibe/lab/overview/questions?status=${encodeURIComponent(status)}&page=${page}&page_size=${pageSize}`)
}

export function cleanupAllVibeLab(confirmToken: string): Promise<{ ok: boolean; project_id: string; deleted: Record<string, number> }> {
  return request('POST', '/vibe/lab/cleanup-all', { confirm_token: confirmToken })
}

// Electron 本机 Run 元数据；对话执行与生命周期控制均通过 IPC，不再暴露服务端 Turn API。
export interface FoundationAgentRun {
  schema: 'electron_agent_run.v1'
  execution_host: 'electron'
  run_id: string
  turn_id: string
  request_id: string
  session_id: string
  project: string
  project_id?: string
  protocol_version: number
  journal_delta?: Record<string, any>
  state?: string
  execution_mode?: 'local'
  provider_mode?: 'proxy' | 'direct'
  trace_id?: string
  goal_id?: string
  start_payload?: Record<string, any>
}

export interface RemoteAgentTraceSummary {
  upload_id: string
  trace_id: string
  audit_marker?: string
  user_id?: number
  session_id: string
  session_title?: string
  goal_id: string
  turn_id?: string
  project_id?: string
  project_name?: string
  input_text?: string
  status: string
  storage_backend?: string
  total_chunks: number
  total_bytes: number
  bundle_sha256: string
  created_at: string
  updated_at: string
  completed_at?: string | null
}

export function listRemoteAgentTraces(params: { limit?: number; cursor?: string } = {}): Promise<{ items: RemoteAgentTraceSummary[]; next_cursor: string }> {
  const query = new URLSearchParams()
  if (params.limit) query.set('limit', String(params.limit))
  if (params.cursor) query.set('cursor', params.cursor)
  const suffix = query.toString() ? `?${query.toString()}` : ''
  return request('GET', `/vibe/foundation/agent-traces${suffix}`)
}

export function getRemoteAgentTrace(traceId: string, view: 'detail' | 'raw' = 'detail'): Promise<Record<string, any> | Blob> {
  if (view === 'raw') return harnessBlobRequest(`/vibe/foundation/agent-traces/${encodeURIComponent(traceId)}?view=raw`).then(({ blob }) => blob)
  return request('GET', `/vibe/foundation/agent-traces/${encodeURIComponent(traceId)}`)
}

export function getRemoteAgentTracePayload(traceId: string, payloadId: string): Promise<Blob> {
  return harnessBlobRequest(
    `/vibe/foundation/agent-traces/${encodeURIComponent(traceId)}/payload/${encodeURIComponent(payloadId)}`,
  ).then(({ blob }) => blob)
}

export function getFoundationKnowledgeStatsMany(
  projects: string[],
): Promise<{ ok: boolean; items: Record<string, { commits: number; sources: number; documents: number; spans: number; sections: number; modules: number }> }> {
  return request('POST', '/vibe/foundation/knowledge/stats', { projects })
}

// ===== 源优先时序知识浏览 =====

function kbBrowserQuery(params: Record<string, any>) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    usp.set(key, String(value))
  })
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

export interface KnowledgeCommitSummary {
  id: string
  project_id: string
  seq: number
  kind: 'ingest' | 'modify' | 'delete' | 'structure' | 'rebuild'
  base_commit_seq: number
  reason: string
  actor_user_id?: number | null
  actor_name: string
  session_id: string
  trace_id: string
  confirmation_id: string
  request_text?: string
  metadata: Record<string, any>
  action: string
  action_counts: { sources: number; tombstones: number; structures: number }
  created_at: string
}

export interface KnowledgeSourceSummary {
  id: string
  project_id: string
  commit_id: string
  commit_seq: number
  source_kind: 'text' | 'file' | 'synthetic'
  filename: string
  display_name: string
  display_kind: string
  mime_type: string
  content_hash: string
  metadata: Record<string, any>
  created_at: string
  chars: number
  span_count: number
}

export interface KnowledgeSourceSpan {
  id: string
  project_id: string
  source_id: string
  commit_seq: number
  ordinal: number
  start_offset: number
  end_offset: number
  content_hash: string
  title_path: string[]
  heading_level: number
  metadata: Record<string, any>
  text: string
}

export interface KnowledgeSourceDetail extends Omit<KnowledgeSourceSummary, 'chars' | 'span_count'> {
  content: string
  spans: KnowledgeSourceSpan[]
}

export interface KnowledgeDocumentSummary {
  id: string
  document_id: string
  project_id: string
  title: string
  mime_type: string
  current_generation_id: string
  generation_id: string
  generation_no: number
  materialized_source_id: string
  source_id: string
  source_kind: 'text' | 'file' | 'synthetic'
  filename: string
  display_name: string
  display_kind: '现行文档'
  content_hash: string
  metadata: Record<string, any>
  generation_metadata: Record<string, any>
  source_metadata: Record<string, any>
  commit_seq: number
  created_at: string
  updated_at: string
  bytes: number
}

export interface KnowledgeDocumentDetail extends KnowledgeDocumentSummary {
  content: string
  spans: Array<KnowledgeSourceSpan & { document_id: string; generation_id: string }>
  chars: number
  span_count: number
  outline_status: 'ready' | 'unavailable'
}

export interface KnowledgeSearchHit extends KnowledgeSourceSpan {
  document_id: string
  generation_id: string
  title: string
  source_kind: 'text' | 'file' | 'synthetic'
  filename: string
  display_name: string
  display_kind: string
  mime_type: string
  breadcrumb: string
  matched_field?: 'content' | 'title' | 'filename'
  match_range?: [] | [number, number]
  rank: number
}

export interface KnowledgeModuleSummary {
  id: string
  title: string
  path: string[]
  summary: string
  span_count: number
}

export interface KnowledgeStatus {
  ok: boolean
  schema: { initialized: boolean; current_version: number; expected_version: number; pending_versions: number[] }
  project: { project_id: string; title: string; current_commit_seq: number; current_index_generation_id: string; created_at: string; updated_at: string } | null
  index_generation: (Record<string, any> & { status: 'ready' | 'stale' }) | null
  summary: {
    commit_count: number
    source_count: number
    document_count: number
    span_count: number
    module_count: number
    tombstone_count: number
    structure_count: number
    top_modules: KnowledgeModuleSummary[]
    recent_commits: KnowledgeCommitSummary[]
  }
}

export interface KnowledgeDiffLine {
  kind: 'context' | 'add' | 'delete'
  old_line: number | null
  new_line: number | null
  text: string
}

export interface KnowledgeDiffHunk {
  header: string
  old_start: number
  old_lines: number
  new_start: number
  new_lines: number
  lines: KnowledgeDiffLine[]
}

export interface KnowledgeDocumentChange {
  id: string
  document_id: string
  change_type: 'added' | 'modified' | 'deleted'
  old_path: string
  new_path: string
  old_generation_id: string | null
  new_generation_id: string | null
  old_content_hash: string | null
  new_content_hash: string | null
  additions: number
  deletions: number
  hunks: KnowledgeDiffHunk[]
}

export interface KnowledgeCommitDetail extends KnowledgeCommitSummary {
  sources: KnowledgeSourceSummary[]
  tombstones: Array<Record<string, any>>
  structure_directives: Array<Record<string, any> & { target_path: string[] }>
  document_changes: KnowledgeDocumentChange[]
  confirmation?: Record<string, any> | null
}

export interface KnowledgeReceipt extends KnowledgeCommitSummary {
  receipt_id: string
  status: 'applied'
}

export function getKnowledgeStatus(project: string, params: { limit?: number; before?: number } = {}): Promise<KnowledgeStatus> {
  return request('GET', `/vibe/foundation/knowledge/status${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeSources(project: string, params: { q?: string; limit?: number; cursor?: number } = {}): Promise<{
  ok: boolean
  items: KnowledgeSourceSummary[]
  next_cursor?: number | null
}> {
  return request('GET', `/vibe/foundation/knowledge/sources${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeSource(project: string, sourceId: string): Promise<{ ok: boolean; source: KnowledgeSourceDetail }> {
  return request('GET', `/vibe/foundation/knowledge/sources/${encodeURIComponent(sourceId)}${kbBrowserQuery({ project })}`)
}

export function getKnowledgeDocuments(project: string, params: { q?: string; limit?: number; cursor?: number } = {}): Promise<{
  ok: boolean
  items: KnowledgeDocumentSummary[]
  next_cursor?: number | null
}> {
  return request('GET', `/vibe/foundation/knowledge/documents${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeDocument(project: string, documentId: string): Promise<{ ok: boolean; document: KnowledgeDocumentDetail }> {
  return request('GET', `/vibe/foundation/knowledge/documents/${encodeURIComponent(documentId)}${kbBrowserQuery({ project })}`)
}

export function searchKnowledge(project: string, params: { q?: string; limit?: number; cursor?: number } = {}): Promise<{
  ok: boolean
  query: string
  items: KnowledgeSearchHit[]
  next_cursor?: number | null
}> {
  return request('GET', `/vibe/foundation/knowledge/search${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeCommits(project: string, params: { kind?: string; limit?: number; before?: number } = {}): Promise<{
  ok: boolean
  items: KnowledgeCommitSummary[]
  next_cursor?: number | null
}> {
  return request('GET', `/vibe/foundation/knowledge/commits${kbBrowserQuery({ project, ...params })}`)
}

export interface KnowledgeActivityEvent {
  schema: 'knowledge_activity.v1'
  type: 'knowledge_change'
  project_id: string
  commit_seq: number
}

export function streamKnowledgeActivity(
  project: string,
  after: number,
  signal: AbortSignal,
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse(
    '/vibe/foundation/knowledge/activity',
    { project_id: project, after },
    handlers,
    signal,
  )
}

export function getKnowledgeCommit(project: string, seq: number): Promise<{ ok: boolean; commit: KnowledgeCommitDetail }> {
  return request('GET', `/vibe/foundation/knowledge/commits/${seq}${kbBrowserQuery({ project })}`)
}

export function getKnowledgeReceipts(project: string, params: { limit?: number; before?: number } = {}): Promise<{
  ok: boolean
  items: KnowledgeReceipt[]
  next_cursor?: number | null
}> {
  return request('GET', `/vibe/foundation/knowledge/receipts${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeReceipt(project: string, seq: number): Promise<{
  ok: boolean
  receipt: KnowledgeCommitDetail & { receipt_id: string }
}> {
  return request('GET', `/vibe/foundation/knowledge/receipts/${seq}${kbBrowserQuery({ project })}`)
}
