/**
 * 知识库系统类型定义
 * 基于目录的渐进式披露知识库，服务于 harness engineering
 */

// ─── 知识库 ─────────────────────────────────────────

export interface KnowledgeBase {
  id: number
  name: string
  description: string
  project_id: number
  node_count: number
  version: number
  wiki_compiled_at: string | null
  created_at: string
  updated_at: string
}

export interface KnowledgeBaseCreatePayload {
  name: string
  description?: string
  project_id: number
}

export interface KnowledgeBaseUpdatePayload {
  name?: string
  description?: string
}

// ─── 节点 ───────────────────────────────────────────

// Phase 4.7 — Five canonical node types. `directory` retained as legacy alias
// for any cached payloads that haven't been migrated through the backend yet.
export type KBNodeType = 'page' | 'module' | 'nav' | 'rule' | 'shared' | 'directory'

export type KBNavSubtype = 'menu' | 'tab' | 'card' | 'drawer' | 'section' | 'custom' | 'category'

export type KBTreeKind = 'business' | 'asset'

export type KBRefCandidateStatus = 'confirmed' | 'probable' | 'weak' | 'rejected'
export type KBRefCandidateSource = 'auto' | 'manual' | 'imported'
export type KBTermContext =
  | 'display'
  | 'input'
  | 'filter'
  | 'sort'
  | 'validate'
  | 'permission'
  | 'compute'
  | 'persist'
  | 'import'
  | 'export'
  | 'notify'
  | 'mention'

export interface KBNodeEntityTag {
  name: string
  role?: 'primary' | 'related' | 'external' | string
  type?: string
}

export interface KBNodeTransitionTag {
  trigger?: string
  action?: string
  target_node_id?: string
  target_text?: string
  relation_type?: string
}

export interface KBPermissionTag {
  name: string
  effect?: string
  target?: string
}

export interface KBNode {
  id: string
  kb_id: number
  parent_id: string | null
  name: string
  type: KBNodeType
  subtype?: KBNavSubtype | null
  tree?: KBTreeKind
  expected_inbound?: boolean
  description: string
  sort_order: number
  content: KBNodeContent
  aliases?: string[]
  keywords?: string[]
  operations?: string[]
  entities?: KBNodeEntityTag[]
  transitions?: KBNodeTransitionTag[]
  ui_states?: string[]
  page_patterns?: string[]
  permissions?: KBPermissionTag[]
  summary?: string | null
  summary_updated_at?: string | null
  children?: KBNode[]
  created_at: string
  updated_at: string
}

export interface KBNodeCreatePayload {
  id?: string
  parent_id: string | null
  name: string
  type?: KBNodeType
  subtype?: KBNavSubtype | null
  tree?: KBTreeKind
  expected_inbound?: boolean
  description?: string
  sort_order?: number
  content?: KBNodeContent
  aliases?: string[]
  keywords?: string[]
  operations?: string[]
  entities?: KBNodeEntityTag[]
  transitions?: KBNodeTransitionTag[]
  ui_states?: string[]
  page_patterns?: string[]
  permissions?: KBPermissionTag[]
}

export interface KBNodeUpdatePayload {
  name?: string
  type?: KBNodeType
  subtype?: KBNavSubtype | null
  tree?: KBTreeKind
  expected_inbound?: boolean
  description?: string
  sort_order?: number
  content?: KBNodeContent
  aliases?: string[]
  keywords?: string[]
  operations?: string[]
  entities?: KBNodeEntityTag[]
  transitions?: KBNodeTransitionTag[]
  ui_states?: string[]
  page_patterns?: string[]
  permissions?: KBPermissionTag[]
}

export interface KBNodeMetadataPayload {
  aliases?: string[]
  keywords?: string[]
  operations?: string[]
  entities?: KBNodeEntityTag[]
  transitions?: KBNodeTransitionTag[]
  ui_states?: string[]
  page_patterns?: string[]
  permissions?: KBPermissionTag[]
}

export interface KBNodeMovePayload {
  parent_id: string | null
  sort_order: number
}

// ─── 节点内容 ───────────────────────────────────────

export interface KBNodeContent {
  notes?: string
  [key: string]: unknown
}

// ─── Wiki ───────────────────────────────────────────

export interface WikiPage {
  id: number
  kb_id: number
  path: string
  title: string
  content: string
  source_node_id: string | null
  compiled_at: string
}

export interface WikiDirectory {
  name: string
  path: string
  type: 'directory' | 'file'
  title?: string
  children?: WikiDirectory[]
}

export type WikiDirectoryItem = WikiDirectory

// ─── Phase 5 Retrieval ──────────────────────────────

export interface KBRefCandidate {
  id: string
  kb_id: number
  source_node_id: string
  source_block_id: string
  target_node_id?: string | null
  matched_term?: string | null
  source: KBRefCandidateSource
  status: KBRefCandidateStatus
  confidence?: number | null
  evidence?: {
    snippet?: string
    reason?: string
    model?: string
    prompt_version?: string
    [key: string]: unknown
  }
  created_at?: string | null
  updated_at?: string | null
}

export interface KBTermIndexItem {
  term: string
  raw_text?: string | null
  kb_id: number
  node_id: string
  block_id: string
  context: KBTermContext | string
  sub_context?: string
  snippet?: string | null
  confidence?: number | null
  extractor?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface KBTermDictItem {
  id: string
  kb_id: number
  canonical: string
  synonyms: string[]
  type?: 'field' | 'entity' | 'concept' | string | null
  status: 'pending' | 'confirmed' | 'rejected' | string
  description?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface KBOutlineCache {
  id?: string
  kb_id: number
  level: string
  scope_type: string
  scope_id: string
  content: string
  meta?: Record<string, unknown>
  content_hash?: string | null
  compiled_at?: string | null
  created_at?: string | null
  updated_at?: string | null
}

// ─── Prompt 模板 ───────────────────────────────────

export type KBTemplateType = 'prompt' | 'rule' | 'format'
export type KBPromptTemplateKind = 'text' | 'form'
export type KBPromptTemplateTarget = 'navigation_description' | 'block_knowledge_description' | 'node_description' | string

export interface KBTemplate {
  id: number
  kb_id: number
  name: string
  type: KBTemplateType
  kind: KBPromptTemplateKind
  target: KBPromptTemplateTarget
  schema: Record<string, unknown>
  status: 'enabled' | 'disabled' | string
  content: string
  created_at: string
  updated_at: string
}

export interface KBTemplateCreatePayload {
  name: string
  type?: KBTemplateType
  kind?: KBPromptTemplateKind
  target?: KBPromptTemplateTarget
  schema?: Record<string, unknown>
  status?: 'enabled' | 'disabled' | string
  content?: string
}

export interface KBTemplateUpdatePayload {
  name?: string
  type?: KBTemplateType
  kind?: KBPromptTemplateKind
  target?: KBPromptTemplateTarget
  schema?: Record<string, unknown>
  status?: 'enabled' | 'disabled' | string
  content?: string
}

export interface KBPromptTemplateRenderResult {
  content: string
  warnings: string[]
  template_id?: number | null
  target?: string
  mode?: string
}

export interface KBPromptFormSource {
  id: string
  kb_id: number
  target_type: string
  target_id: string
  node_id?: string | null
  block_id?: string | null
  template_id?: number | null
  template_version: number
  kind: string
  data: Record<string, unknown>
  generated_content: string
  created_at?: string | null
  updated_at?: string | null
}

// ─── 编辑器视图模式 ─────────────────────────────────

export type KBEditorViewMode = 'raw' | 'wiki' | 'template'
