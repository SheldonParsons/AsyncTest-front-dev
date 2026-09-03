import { harnessBlobRequest, harnessRequest, streamHarnessSse } from '@/api/harness'

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

export interface VibeLLMModelPickerProvider {
  id: string
  name: string
  enabled: boolean
  source: 'mine' | 'system_default'
  is_system_default: boolean
}

interface VibeLLMModelPicker {
  schema: 'llm_model_picker.v1'
  selected_provider_id: string
  selection_source: 'user' | 'system_default' | 'none'
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

interface VibeConversationControl {
  disabled: boolean
  message: string
  source?: string
  updated_at?: string | null
}

interface VibeCapabilities {
  user_id: number
  account: string
  user: VibeCapabilityUser
  capabilities: Record<string, boolean>
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
}): Promise<{ ok: boolean; item: VibeConversationControl }> {
  return request('PATCH', '/vibe/admin/conversation-control', payload)
}

export type VibeKnowledgeApiModelRole = 'rerank' | 'embedding'
export type VibeKnowledgeApiProviderType = 'dashscope' | 'openai-compatible'

export interface VibeKnowledgeApiModelConfig {
  role: VibeKnowledgeApiModelRole
  provider_type: VibeKnowledgeApiProviderType
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
  provider_type: VibeKnowledgeApiProviderType
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

interface VibeSystemKnowledgeTransferItem {
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

interface VibeAdminConfigTransferPayload {
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
  event_id?: string
  trace_id?: string
  seq: number
  recorded_sequence?: number
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

export function updateVibeProject(vibeProjectId: string, payload: {
  name?: string
  description?: string
  status?: string
  baseline?: Record<string, any>
}): Promise<VibeProject> {
  return request('PATCH', `/vibe/projects/${vibeProjectId}`, payload)
}

export async function listVibeLLMProviders(): Promise<{
  schema: 'llm_provider_settings.v1'
  providers: VibeLLMProviderConfig[]
}> {
  return request('GET', '/vibe/llm/providers')
}

export function getVibeLLMModelPicker(): Promise<VibeLLMModelPicker> {
  return request('GET', '/vibe/llm/model-picker')
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

export function testVibeLLMProvider(providerId: string, payload: { model?: string } = {}): Promise<{
  ok: boolean
  model: string
  elapsed_ms: number
  response?: string
  error?: string
}> {
  return request('POST', `/vibe/llm/providers/${providerId}/test`, payload)
}

interface VibeLLMAdminUserDefault {
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
  provider_mode?: 'direct'
  trace_id?: string
  goal_id?: string
  start_payload?: Record<string, any>
}

interface RemoteAgentTraceSummary {
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

interface KnowledgeModuleSummary {
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

interface KnowledgeDiffLine {
  kind: 'context' | 'add' | 'delete'
  old_line: number | null
  new_line: number | null
  text: string
}

interface KnowledgeDiffHunk {
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
