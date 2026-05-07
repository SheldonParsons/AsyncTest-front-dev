/**
 * Knowledge Base API — calls Django same-origin HarnessEngineering endpoints.
 */
import { harnessRequest, streamHarnessSse } from '@/api/harness'
import type {
  KnowledgeBase,
  KBChatRetrieval,
  KBChatMessageRecord,
  KBChatSession,
  KBChatSource,
  KBNodeMetadataPayload,
  KBOutlineCache,
  KBRefCandidate,
  KBNode,
  KBNodeContent,
  KBTemplate,
  KBPromptFormSource,
  KBPromptTemplateRenderResult,
  KBTermDictItem,
  KBTermIndexItem,
  KBConceptPendingItem,
  KBConceptExtractResult,
  KBConcept,
  KBConceptImpactEvent,
  KBBlockRewriteSuggestion,
  KBConceptBlockRelation,
  KBConceptDecision,
} from '@/types/knowledge'

const request = harnessRequest

// ─── Knowledge Base — 1:1 per project ────────────

export function getKBByProject(projectId: number, projectName?: string): Promise<KnowledgeBase> {
  const qs = projectName ? `?project_name=${encodeURIComponent(projectName)}` : ''
  return request('GET', `/kb/project/${projectId}${qs}`)
}

export function listKB(projectId?: number): Promise<KnowledgeBase[]> {
  const qs = projectId != null ? `?project_id=${projectId}` : ''
  return request('GET', `/kb/${qs}`)
}

export function createKB(data: { name: string; description?: string; project_id?: number }): Promise<KnowledgeBase> {
  return request('POST', '/kb/', data)
}

export function getKB(id: number): Promise<KnowledgeBase> {
  return request('GET', `/kb/${id}`)
}

export function updateKB(id: number, data: { name?: string; description?: string }): Promise<KnowledgeBase> {
  return request('PUT', `/kb/${id}`, data)
}

export function deleteKB(id: number): Promise<void> {
  return request('DELETE', `/kb/${id}`)
}

// ─── Node Operations ─────────────────────────────

export function getTree(kbId: number): Promise<KBNode[]> {
  return request('GET', `/kb/${kbId}/tree`)
}

export function createNode(kbId: number, data: {
  id?: string;
  parent_id?: string | null;
  name: string;
  type?: string;
  subtype?: string | null;
  tree?: 'business' | 'asset';
  expected_inbound?: boolean;
  description?: string;
  sort_order?: number;
  content?: KBNodeContent;
}): Promise<KBNode> {
  return request('POST', `/kb/${kbId}/node`, data)
}

export function updateNode(kbId: number, nodeId: string, data: {
  name?: string;
  type?: string;
  subtype?: string | null;
  tree?: 'business' | 'asset';
  expected_inbound?: boolean;
  description?: string;
  sort_order?: number;
  content?: KBNodeContent;
}): Promise<KBNode> {
  return request('PUT', `/kb/${kbId}/node/${nodeId}`, data)
}

export function deleteNode(kbId: number, nodeId: string): Promise<void> {
  return request('DELETE', `/kb/${kbId}/node/${nodeId}`)
}

export function moveNode(kbId: number, nodeId: string, data: {
  parent_id?: string | null;
  sort_order?: number;
}): Promise<KBNode> {
  return request('PUT', `/kb/${kbId}/node/${nodeId}/move`, data)
}

export function updateNodeMetadata(
  kbId: number,
  nodeId: string,
  data: KBNodeMetadataPayload,
): Promise<KBNode> {
  return request('PUT', `/kb/${kbId}/node/${nodeId}/metadata`, data)
}

// ─── Phase 5 Retrieval Skeleton ────────────────────

export function rebuildIndex(kbId: number): Promise<{
  ok: boolean;
  status: string;
  message?: string;
}> {
  return request('POST', `/kb/${kbId}/index/rebuild`)
}

export function getNodeReferencedBy(
  kbId: number,
  nodeId: string,
  status?: string,
): Promise<KBRefCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return request('GET', `/kb/${kbId}/node/${nodeId}/referenced-by${qs}`)
}

export function getBlockReferences(
  kbId: number,
  blockId: string,
  status?: string,
): Promise<KBRefCandidate[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : ''
  return request('GET', `/kb/${kbId}/block/${blockId}/references${qs}`)
}

export function updateRefCandidate(
  kbId: number,
  refId: string,
  data: {
    status?: string;
    confidence?: number;
    evidence?: Record<string, unknown>;
  },
): Promise<KBRefCandidate> {
  return request('PUT', `/kb/${kbId}/ref/${refId}`, data)
}

export function listTerms(kbId: number, params: {
  q?: string;
  status?: string;
  type?: string;
} = {}): Promise<KBTermDictItem[]> {
  const qs = new URLSearchParams()
  if (params.q) qs.set('q', params.q)
  if (params.status) qs.set('status', params.status)
  if (params.type) qs.set('type', params.type)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request('GET', `/kb/${kbId}/terms${suffix}`)
}

export function getTermLocations(
  kbId: number,
  term: string,
  context?: string,
): Promise<KBTermIndexItem[]> {
  const qs = context ? `?context=${encodeURIComponent(context)}` : ''
  return request('GET', `/kb/${kbId}/terms/${encodeURIComponent(term)}/locations${qs}`)
}

export function updateTerm(kbId: number, term: string, data: {
  canonical?: string;
  synonyms?: string[];
  type?: string;
  status?: string;
  description?: string;
}): Promise<KBTermDictItem> {
  return request('PUT', `/kb/${kbId}/terms/${encodeURIComponent(term)}`, data)
}

export function mergeTerms(kbId: number, data: {
  source_terms: string[];
  target: string;
}): Promise<{ target: KBTermDictItem; merged: string[] }> {
  return request('POST', `/kb/${kbId}/terms/merge`, data)
}

export function compileOutline(kbId: number, data: {
  level?: string;
  scope_type?: string;
  scope_id?: string;
} = {}): Promise<KBOutlineCache> {
  return request('POST', `/kb/${kbId}/outline/compile`, data)
}

export function getOutline(kbId: number, params: {
  level?: string;
  scope_type?: string;
  scope_id?: string;
} = {}): Promise<KBOutlineCache> {
  const qs = new URLSearchParams()
  if (params.level) qs.set('level', params.level)
  if (params.scope_type) qs.set('scope_type', params.scope_type)
  if (params.scope_id) qs.set('scope_id', params.scope_id)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request('GET', `/kb/${kbId}/outline${suffix}`)
}

export function getNodeSubtreeSummary(kbId: number, nodeId: string): Promise<KBOutlineCache> {
  return request('GET', `/kb/${kbId}/node/${nodeId}/subtree-summary`)
}

export function getKBSummary(kbId: number): Promise<KBOutlineCache> {
  return request('GET', `/kb/${kbId}/summary`)
}

export function saveKBSummary(kbId: number, content: string): Promise<KBOutlineCache> {
  return request('PUT', `/kb/${kbId}/summary`, { content })
}

export function getSystemSummary(): Promise<KBOutlineCache> {
  return request('GET', '/kb/system-summary')
}

// ─── Block summary (non-streaming, persists server-side) ───

export function generateBlockSummaryHttp(kbId: number, nodeId: string, blockId: string): Promise<{ summary: string }> {
  return request('POST', `/kb/${kbId}/node/${nodeId}/block/${blockId}/summary`)
}

export function extractBlockConcepts(kbId: number, nodeId: string, blockId: string, content?: string): Promise<KBConceptExtractResult> {
  return request('POST', `/kb/${kbId}/node/${nodeId}/block/${blockId}/concepts/extract`, { content })
}

export function startBlockConceptExtractTask(kbId: number, nodeId: string, blockId: string, content?: string): Promise<{
  trace_id: string;
  status: string;
  events: any[];
}> {
  return request('POST', `/kb/${kbId}/node/${nodeId}/block/${blockId}/concepts/extract/task`, { content })
}

export function getTaskTrace(traceId: string): Promise<{
  trace_id: string;
  status: 'running' | 'done' | 'error' | string;
  events: any[];
}> {
  return request('GET', `/debug/task-traces?trace_id=${encodeURIComponent(traceId)}`)
}

export function listPendingConcepts(kbId: number): Promise<KBConceptPendingItem[]> {
  return request('GET', `/kb/${kbId}/concepts/pending`)
}

export function listConcepts(kbId: number): Promise<KBConcept[]> {
  return request('GET', `/kb/${kbId}/concepts`)
}

export function createConcept(kbId: number, data: {
  name: string;
  aliases?: string[];
  definition?: string;
  summary?: string;
  scope?: string;
  notes?: string;
}): Promise<KBConcept> {
  return request('POST', `/kb/${kbId}/concepts`, data)
}

export function updateConcept(kbId: number, conceptId: string, data: {
  name?: string;
  aliases?: string[];
  variant_id?: string;
  definition?: string;
  summary?: string;
  scope?: string;
  notes?: string;
}): Promise<KBConcept> {
  return request('PUT', `/kb/${kbId}/concept/${conceptId}`, data)
}

export function polishConceptVariant(kbId: number, conceptId: string, variantId: string, data: {
  name?: string;
  definition: string;
}): Promise<{ definition: string }> {
  return request('POST', `/kb/${kbId}/concept/${conceptId}/variant/${variantId}/polish`, data)
}

export function deleteConcept(kbId: number, conceptId: string): Promise<void> {
  return request('DELETE', `/kb/${kbId}/concept/${conceptId}`)
}

export function resolveConceptVariant(kbId: number, conceptId: string, variantId: string, data: {
  action: 'ignore' | 'mark_false_positive' | 'promote_to_formal' | 'merge_to_formal';
}): Promise<KBConcept> {
  return request('POST', `/kb/${kbId}/concept/${conceptId}/variant/${variantId}/resolve`, data)
}

export function listConceptImpactEvents(kbId: number, params: {
  status?: string;
  concept_id?: string;
} = {}): Promise<KBConceptImpactEvent[]> {
  const qs = new URLSearchParams()
  if (params.status) qs.set('status', params.status)
  if (params.concept_id) qs.set('concept_id', params.concept_id)
  const suffix = qs.toString() ? `?${qs.toString()}` : ''
  return request('GET', `/kb/${kbId}/concept-impact-events${suffix}`)
}

export function reviewConceptImpactEvent(kbId: number, eventId: string): Promise<KBConceptImpactEvent> {
  return request('POST', `/kb/${kbId}/concept-impact-events/${eventId}/review`, {})
}

export function resolveConceptImpactEvent(kbId: number, eventId: string, data: {
  action: 'apply' | 'ignore';
  proposal?: Record<string, any>;
}): Promise<KBConceptImpactEvent> {
  return request('POST', `/kb/${kbId}/concept-impact-events/${eventId}/resolve`, data)
}

export function listBlockConceptDecisions(kbId: number, blockId: string, status = 'pending'): Promise<KBConceptDecision[]> {
  return request('GET', `/kb/${kbId}/block/${blockId}/concept-decisions?status=${encodeURIComponent(status)}`)
}

export function applyConceptDecision(kbId: number, decisionId: string, data: Record<string, any> = {}): Promise<KBConceptDecision> {
  return request('POST', `/kb/${kbId}/concept-decisions/${decisionId}/apply`, data)
}

export function ignoreConceptDecision(kbId: number, decisionId: string): Promise<KBConceptDecision> {
  return request('POST', `/kb/${kbId}/concept-decisions/${decisionId}/ignore`, {})
}

export function listBlockConceptRelations(kbId: number, blockId: string, status = 'pending'): Promise<KBConceptBlockRelation[]> {
  return request('GET', `/kb/${kbId}/block/${blockId}/concept-relations?status=${encodeURIComponent(status)}`)
}

export function applyBlockConceptRelations(kbId: number, blockId: string, relationIds?: string[]): Promise<KBConceptBlockRelation[]> {
  return request('POST', `/kb/${kbId}/block/${blockId}/concept-relations/apply`, relationIds ? { relation_ids: relationIds } : {})
}

export function listBlockRewriteSuggestions(kbId: number, blockId: string, status = 'pending'): Promise<KBBlockRewriteSuggestion[]> {
  return request('GET', `/kb/${kbId}/block/${blockId}/rewrite-suggestions?status=${encodeURIComponent(status)}`)
}

export function applyRewriteSuggestion(kbId: number, suggestionId: string): Promise<KBBlockRewriteSuggestion> {
  return request('POST', `/kb/${kbId}/rewrite-suggestions/${suggestionId}/apply`, {})
}

export function ignoreRewriteSuggestion(kbId: number, suggestionId: string): Promise<KBBlockRewriteSuggestion> {
  return request('POST', `/kb/${kbId}/rewrite-suggestions/${suggestionId}/ignore`, {})
}

export function resolveConcept(kbId: number, conceptId: string, data: {
  action: 'accept' | 'ignore' | 'merge';
  name?: string;
  aliases?: string[];
  definition?: string;
  concept_summary?: string;
  scope?: string;
  notes?: string;
}): Promise<KBConceptPendingItem | { ok: boolean; deleted?: boolean }> {
  return request('POST', `/kb/${kbId}/concept/${conceptId}/resolve`, data)
}

// ─── Knowledge chat ───────────────────────────────

export interface KBChatStreamHandlers {
  onSession?: (session: KBChatSession, event: Record<string, any>) => void
  onStage?: (event: Record<string, any>) => void
  onRetrieval?: (retrieval: KBChatRetrieval, event: Record<string, any>) => void
  onSources?: (sources: KBChatSource[], event: Record<string, any>) => void
  onClarification?: (message: string, event: Record<string, any>) => void
  onChunk?: (content: string) => void
  onFinal?: (event: Record<string, any>) => void
  onError?: (message: string) => void
}

export async function streamKnowledgeChat(
  kbId: number,
  message: string,
  handlers: KBChatStreamHandlers = {},
  sessionId?: string,
): Promise<void> {
  const url = sessionId ? `/kb/${kbId}/chat/sessions/${sessionId}/stream` : `/kb/${kbId}/chat/stream`
  await streamHarnessSse(
    url,
    { message, session_id: sessionId },
    {
      onEvent: (event) => {
        if (event?.type === 'session') handlers.onSession?.(event.session || {}, event)
        if (event?.type === 'stage') handlers.onStage?.(event)
        if (event?.type === 'retrieval') handlers.onRetrieval?.(event.retrieval || {}, event)
        if (event?.type === 'sources') handlers.onSources?.(event.sources || [], event)
        if (event?.type === 'clarification') handlers.onClarification?.(String(event.message || ''), event)
        if (event?.type === 'final') handlers.onFinal?.(event)
      },
      onChunk: handlers.onChunk,
      onError: handlers.onError,
    },
  )
}

export function listChatSessions(kbId: number): Promise<KBChatSession[]> {
  return request('GET', `/kb/${kbId}/chat/sessions`)
}

export function createChatSession(kbId: number, data: { title?: string } = {}): Promise<KBChatSession> {
  return request('POST', `/kb/${kbId}/chat/sessions`, data)
}

export function listChatMessages(kbId: number, sessionId: string): Promise<KBChatMessageRecord[]> {
  return request('GET', `/kb/${kbId}/chat/sessions/${sessionId}`)
}

export function deleteChatSession(kbId: number, sessionId: string): Promise<{ ok: boolean }> {
  return request('DELETE', `/kb/${kbId}/chat/sessions/${sessionId}`)
}

// ─── Templates ───────────────────────────────────

export function listTemplates(kbId: number): Promise<KBTemplate[]> {
  return request('GET', `/kb/${kbId}/template`)
}

export function createTemplate(kbId: number, data: {
  name: string;
  type?: string;
  kind?: 'text' | 'form';
  target?: string;
  schema?: Record<string, unknown>;
  status?: string;
  content?: string;
}): Promise<KBTemplate> {
  return request('POST', `/kb/${kbId}/template`, data)
}

export function updateTemplate(kbId: number, templateId: number, data: {
  name?: string;
  type?: string;
  kind?: 'text' | 'form';
  target?: string;
  schema?: Record<string, unknown>;
  status?: string;
  content?: string;
}): Promise<KBTemplate> {
  return request('PUT', `/kb/${kbId}/template/${templateId}`, data)
}

export function deleteTemplate(kbId: number, templateId: number): Promise<void> {
  return request('DELETE', `/kb/${kbId}/template/${templateId}`)
}

export function renderTemplate(kbId: number, data: {
  template_id?: number | null;
  target?: string;
  mode?: 'text' | 'form';
  data?: Record<string, unknown>;
}): Promise<KBPromptTemplateRenderResult> {
  return request('POST', `/kb/${kbId}/template/render`, data)
}

export function getBlockFormSource(kbId: number, blockId: string, kind?: string): Promise<KBPromptFormSource | null> {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  return request('GET', `/kb/${kbId}/block/${blockId}/form-source${qs}`).catch((error) => {
    const message = String(error?.message || '')
    if (message.includes('Form source not found') || message.includes('HTTP 404')) return null
    throw error
  })
}

export function saveBlockFormSource(kbId: number, blockId: string, data: {
  template_id?: number | null;
  template_version?: number;
  kind?: string;
  data?: Record<string, unknown>;
  generated_content?: string;
}): Promise<KBPromptFormSource> {
  return request('PUT', `/kb/${kbId}/block/${blockId}/form-source`, data)
}

export function deleteBlockFormSource(kbId: number, blockId: string, kind?: string): Promise<void> {
  const qs = kind ? `?kind=${encodeURIComponent(kind)}` : ''
  return request('DELETE', `/kb/${kbId}/block/${blockId}/form-source${qs}`)
}
