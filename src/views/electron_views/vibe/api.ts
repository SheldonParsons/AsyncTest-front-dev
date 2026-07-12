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
  test_run_id?: string
  llm_provider_id?: string
  status: string
  created_at?: string
  updated_at?: string
  last_event_at?: string
}

export interface VibeAttachment {
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
  api_key: string
  proxy_url: string
  timeout_config: Record<string, any>
  max_retries: number
  model_config: Record<string, string>
  enabled: boolean
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
  user_id: number
  source: string
  session_id?: string
  provider: Record<string, any> | null
  models: Record<string, string>
  scene_strengths?: Record<string, 'mini' | 'strong'>
  scene_catalog?: VibeLLMSceneConfig[]
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
  trace_id: string
  audit_marker?: string
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
}

export interface VibeDialogueTraceEvent {
  id: number
  trace_id: string
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
  q?: string
} = {}): Promise<{
  items: VibeDialogueTraceRun[]
  next_cursor: string
  filters?: {
    projects?: Array<{ project_id: string; project_name: string; count: number }>
    users?: Array<{ user_id?: number; account?: string; username?: string; user_display_name?: string; label: string; count: number }>
  }
}> {
  const query = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && String(value).trim()) query.set(key, String(value))
  })
  const qs = query.toString()
  return request('GET', `/vibe/foundation/dialogue-trace/runs${qs ? `?${qs}` : ''}`)
}

export function getVibeDialogueTraceDetail(traceId: string): Promise<VibeDialogueTraceDetail> {
  return request('GET', `/vibe/foundation/dialogue-trace/runs/${traceId}`)
}

export function getVibeProjectByAsyncProject(projectId: number): Promise<VibeProject> {
  return request('GET', `/vibe/projects/by-async-project/${projectId}`)
}

export function getVibeProjectsByAsyncProjects(projectIds: number[]): Promise<{ items: VibeProject[] }> {
  const ids = Array.from(new Set(projectIds.map((id) => Number(id)).filter((id) => Number.isFinite(id)))).join(',')
  return request('GET', `/vibe/projects/by-async-projects${ids ? `?ids=${encodeURIComponent(ids)}` : ''}`)
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

// ===== 第四代主对话管线 =====

/** 主入口：后端先做意图分析（提问/录入/混合），再自动路由 ingest/recall */
export function streamFoundationTurn(
  // seed_messages：回答上一轮反问时回传的"挂起草稿"，让后端【续跑同一思考】（不另起新轮）。
  // continuation_parent_id：把续跑轮的事件挂到上一轮反问那条 assistant 之下，前端渲染成同一条思考。
  // mode='document' + attachments：文件原文与输入框意图一起交给第四代整体变更规划。
  // apply_edit：确认时只回传服务端 confirmation_id；客户端预览内容不参与写入。
  payload: { project: string; text: string; session_id?: string; llm_provider_id?: string; budget_chars?: number; seed_messages?: any[]; continuation_parent_id?: string; mode?: string; document?: string; filename?: string; attachments?: VibeAttachment[]; apply_edit?: any; clarification_cancel?: boolean; clarification_response?: { type: 'option' | 'input'; option_id?: string; text?: string } },
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse('/vibe/foundation/turn/stream', payload, handlers)
}

export interface FoundationRunningTurn {
  turn_id: string
  session_id: string
  project: string
  done: boolean
  failed?: string
  started_at?: number
  updated_at?: number
  events: any[]
}

export function listFoundationRunningTurns(params: { project?: string; session_id?: string } = {}): Promise<{ items: FoundationRunningTurn[] }> {
  const query = new URLSearchParams()
  if (params.project) query.set('project', params.project)
  if (params.session_id) query.set('session_id', params.session_id)
  const qs = query.toString()
  return request('GET', `/vibe/foundation/turn/running${qs ? `?${qs}` : ''}`)
}

/** T26 停止本轮：置位后端取消令牌。流会自己发 cancelled+已停止回执+done 正常收尾，无需 abort。 */
export function cancelFoundationTurn(turnId: string): Promise<{ ok: boolean; cancelled: boolean }> {
  return request('POST', '/vibe/foundation/turn/cancel', { turn_id: turnId })
}

export function getFoundationKnowledgeStatsMany(
  projects: string[],
): Promise<{ ok: boolean; items: Record<string, { sections: number; modules: number }> }> {
  return request('GET', `/vibe/foundation/knowledge/stats?projects=${encodeURIComponent(projects.join(','))}`)
}

// ===== 第四代现行知识浏览 =====

function kbBrowserQuery(params: Record<string, any>) {
  const usp = new URLSearchParams()
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return
    usp.set(key, String(value))
  })
  const qs = usp.toString()
  return qs ? `?${qs}` : ''
}

export interface KnowledgeVersionSummary {
  id: string
  project_id: string
  document_id: string
  version: number
  base_version: number
  base_hash: string
  content_hash: string
  title: string
  operation: string
  reason: string
  actor_user_id?: number | null
  actor_name?: string
  session_id?: string
  trace_id?: string
  batch_id?: string
  source_ids: string[]
  change_plan: Record<string, any>
  verification: Record<string, any>
  action: 'insert' | 'update' | 'delete' | 'structure' | string
  action_kinds: string[]
  action_counts: Record<'insert' | 'update' | 'delete' | 'structure', number>
  created_at: string
}

export interface KnowledgeCurrentVersion extends KnowledgeVersionSummary {
  markdown: string
  section_ids: string[]
}

export interface KnowledgeOutlineItem {
  section_id: string
  ordinal: number
  level: number
  title: string
  path: string[]
  parent_id?: string | null
  children_ids: string[]
  source_range: [number, number]
}

export interface KnowledgeStatus {
  ok: boolean
  project: { project_id: string; title: string; current_version: number; current_hash: string } | null
  current: KnowledgeCurrentVersion | null
  versions: KnowledgeVersionSummary[]
  sources: Array<{ id: string; filename: string; mime_type: string; content_hash: string; metadata?: Record<string, any>; created_at: string }>
  outline: KnowledgeOutlineItem[]
  summary: {
    section_count: number
    module_count: number
    version_count: number
    source_count: number
    top_modules: Array<{ module: string; section_id: string; active_count: number }>
    recent_changes: KnowledgeVersionSummary[]
  }
  index_generation?: Record<string, any> | null
}

export interface KnowledgeSection {
  id: string
  section_id: string
  ordinal: number
  breadcrumb: string
  path: string[]
  title: string
  level: number
  body: string
  source_range: [number, number]
  status: 'active'
}

export function getKnowledgeStatus(project: string, params: { limit?: number; before?: number } = {}): Promise<KnowledgeStatus> {
  return request('GET', `/vibe/foundation/knowledge/status${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeVersions(project: string, params: { action?: string; limit?: number; before?: number } = {}): Promise<{
  ok: boolean
  project_id: string
  items: KnowledgeVersionSummary[]
  next_cursor?: number | null
}> {
  return request('GET', `/vibe/foundation/knowledge/versions${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeSections(project: string, params: { q?: string; limit?: number; cursor?: number } = {}): Promise<{
  ok: boolean
  project_id: string
  query: string
  total: number
  items: KnowledgeSection[]
  next_cursor?: number | null
}> {
  return request('GET', `/vibe/foundation/knowledge/sections${kbBrowserQuery({ project, ...params })}`)
}

export function getKnowledgeDiff(project: string, from: number, to: number): Promise<{
  ok: boolean
  project_id: string
  from: number
  to: number
  from_hash: string
  to_hash: string
  before_markdown: string
  after_markdown: string
  diff: string
}> {
  return request('GET', `/vibe/foundation/knowledge/diff${kbBrowserQuery({ project, from, to })}`)
}

export function getKnowledgeSource(project: string, sourceId: string): Promise<{
  ok: boolean
  source: { id: string; filename: string; mime_type: string; content: string; content_hash: string; metadata?: Record<string, any>; created_at: string }
}> {
  return request('GET', `/vibe/foundation/knowledge/sources/${encodeURIComponent(sourceId)}${kbBrowserQuery({ project })}`)
}
