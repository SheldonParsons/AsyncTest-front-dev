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

export function updateVibeSession(sessionId: string, payload: {
  title?: string
  focus?: string
  status?: string
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

export function getVibeLLMRuntimeConfig(): Promise<VibeLLMRuntimeConfig> {
  return request('GET', '/vibe/llm/runtime-config')
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

// ===== foundation 新管线（前端唯一管线；后端 views_foundation.py）=====

export interface FoundationStatement {
  fact_id: number
  quote: string
  coarse: string
  anchors: number[]
  anchor_names: string[]
  tiers: string[]
  conflict: boolean
}

export interface FoundationMaterial {
  fact_id: number
  quote: string
  source_id: number
  project: string
  coarse: string
  fine: string | null
  confidence: number
  score: number
  flags: string[]
}

export interface FoundationProposal {
  task_id: number
  kind: string
  trigger: string
  created_at: string
  payload: Record<string, any>
}

/** 主入口：后端先做意图分析（提问/录入/混合），再自动路由 ingest/recall */
export function streamFoundationTurn(
  // seed_messages：回答上一轮反问时回传的"挂起草稿"，让后端【续跑同一思考】（不另起新轮）。
  // continuation_parent_id：把续跑轮的事件挂到上一轮反问那条 assistant 之下，前端渲染成同一条思考。
  // mode='document' + document：文件整篇录入——document 放整篇原文(切段进 passage 库)，text 只作"导入《X》"干净消息。
  // apply_edit：改原文确认后回传的 diff 提案（passage_id+new_body…），后端确定性落库。
  payload: { project: string; text: string; session_id?: string; budget_chars?: number; seed_messages?: any[]; continuation_parent_id?: string; mode?: string; document?: string; apply_edit?: any },
  handlers: Parameters<typeof streamHarnessSse>[2] = {},
) {
  return streamHarnessSse('/vibe/foundation/turn/stream', payload, handlers)
}

export function listFoundationProposals(): Promise<{ items: FoundationProposal[] }> {
  return request('GET', '/vibe/foundation/proposals')
}

/** 左栏只读"知识库概览"：原文段数 + 覆盖模块数（按 project 隔离）。 */
export function getFoundationPassageStats(project: string): Promise<{ passages: number; modules: number }> {
  return request('GET', `/vibe/foundation/passage-stats?project=${encodeURIComponent(project)}`)
}

/** 批量版：一次取多个项目的段/模块（下拉里逐项目显示读数）。返回 { [projectId]: {passages, modules} }。 */
export function getFoundationPassageStatsMany(
  projects: string[],
): Promise<Record<string, { passages: number; modules: number }>> {
  return request('GET', `/vibe/foundation/passage-stats?projects=${encodeURIComponent(projects.join(','))}`)
}

export function actFoundationProposal(taskId: number, action: 'approve' | 'reject'): Promise<{ message: string; pending: number }> {
  return request('POST', `/vibe/foundation/proposals/${taskId}/${action}`)
}
