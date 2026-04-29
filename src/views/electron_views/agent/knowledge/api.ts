/**
 * Knowledge Base API — calls Django same-origin HarnessEngineering endpoints.
 */
import { harnessRequest } from '@/api/harness'
import type {
  KnowledgeBase,
  KBNodeMetadataPayload,
  KBOutlineCache,
  KBRefCandidate,
  KBNode,
  KBNodeContent,
  WikiDirectoryItem,
  WikiPage,
  KBTemplate,
  KBPromptFormSource,
  KBPromptTemplateRenderResult,
  KBTermDictItem,
  KBTermIndexItem,
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

// ─── Block summary (non-streaming, persists server-side) ───

export function generateBlockSummaryHttp(kbId: number, nodeId: string, blockId: string): Promise<{ summary: string }> {
  return request('POST', `/kb/${kbId}/node/${nodeId}/block/${blockId}/summary`)
}

// ─── Wiki ────────────────────────────────────────

export function compileWiki(kbId: number): Promise<{ compiled: number }> {
  return request('POST', `/kb/${kbId}/compile`)
}

export function getWikiDirectory(kbId: number): Promise<WikiDirectoryItem[]> {
  return request('GET', `/kb/${kbId}/wiki`)
}

export function getWikiPage(kbId: number, path: string): Promise<WikiPage> {
  return request('GET', `/kb/${kbId}/wiki/${encodeURIComponent(path)}`)
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
