/**
 * Knowledge Base API — calls HarnessEngineering backend via Electron IPC proxy.
 */
import type {
  KnowledgeBase,
  KBNode,
  KBNodeContent,
  WikiDirectoryItem,
  WikiPage,
  KBTemplate,
} from '@/types/knowledge'

async function request<T = any>(method: string, path: string, body?: any): Promise<T> {
  // Strip Vue reactive proxies — IPC requires plain objects (structured clone)
  const plainBody = body != null ? JSON.parse(JSON.stringify(body)) : undefined
  const res = await window.electronAPI.harness.request(method, path, plainBody)
  if (res.error) throw new Error(res.error)
  if (res.status >= 400) {
    const msg = typeof res.data === 'string' ? res.data : res.data?.detail || `HTTP ${res.status}`
    throw new Error(msg)
  }
  return res.data as T
}

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
  content?: string;
}): Promise<KBTemplate> {
  return request('POST', `/kb/${kbId}/template`, data)
}

export function updateTemplate(kbId: number, templateId: number, data: {
  name?: string;
  type?: string;
  content?: string;
}): Promise<KBTemplate> {
  return request('PUT', `/kb/${kbId}/template/${templateId}`, data)
}

export function deleteTemplate(kbId: number, templateId: number): Promise<void> {
  return request('DELETE', `/kb/${kbId}/template/${templateId}`)
}
