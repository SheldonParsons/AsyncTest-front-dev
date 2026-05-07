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
export type KBNodeType = 'page' | 'module' | 'nav' | 'rule' | 'shared' | 'concept' | 'directory'

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

export interface KBConceptData {
  aliases?: string[]
  definition?: string
  summary?: string
  scope?: string
  notes?: string
  status?: 'active' | 'formal' | 'new' | 'pending' | 'supplement' | 'duplicate' | 'conflict' | 'replacement' | 'false_positive' | string
  match_status?: string
  source_block_id?: string | null
  source_node_id?: string | null
  source_status?: 'active' | 'missing' | 'manual' | string
  source_missing_reason?: string
  source_missing_at?: string | null
  target_concept_id?: string | null
  target_variant_id?: string | null
  evidence?: string
  match_reason?: string
}

export interface KBConceptVariant extends KBConceptData {
  id: string | null
  concept_id?: string
  kb_id?: number
  name: string
  updated?: boolean
  reason?: string
  created_at?: string | null
  updated_at?: string | null
}

export type KBConceptPendingItem = KBConceptVariant

export interface KBConceptVariantSource {
  id: string
  concept_id: string
  variant_id: string
  source_block_id?: string | null
  source_node_id?: string | null
  contribution_text?: string
  source_content_hash?: string | null
  source_status?: 'active' | 'stale' | 'deleted' | 'ignored' | string
  created_at?: string | null
  updated_at?: string | null
}

export interface KBConceptImpactEvent {
  id: string
  kb_id: number
  concept_id: string
  variant_id: string
  source_id: string
  source_block_id?: string | null
  event_type: 'block_updated' | 'block_deleted' | string
  status: 'pending' | 'resolved' | 'ignored' | string
  payload?: Record<string, any>
  proposal?: {
    source_action?: 'keep' | 'update' | 'remove' | string
    contribution_text?: string
    formal_patch?: Record<string, any>
    reason?: string
    _llm_elapsed_ms?: number
  }
  created_at?: string | null
  updated_at?: string | null
}

export type KBConceptDecisionType =
  | 'create_concept'
  | 'update_concept'
  | 'replace_concept'
  | 'deprecate_concept'
  | 'no_concept_change'
  | 'ignore'
  | string

export interface KBConceptDecision {
  id: string
  kb_id: number
  block_id: string
  node_id: string
  decision_type: KBConceptDecisionType
  target_concept_id?: string | null
  target_concept_name?: string
  target_concept?: KBConcept | null
  suggested_concept_name?: string
  suggested_definition?: string
  suggested_summary?: string
  suggested_scope?: string
  suggested_notes?: string
  evidence?: string
  reason?: string
  risk?: string
  status: 'pending' | 'applied' | 'ignored' | 'expired' | string
  source_content_hash?: string | null
  created_at?: string | null
  updated_at?: string | null
}

export interface KBConceptBlockRelation {
  id: string
  kb_id: number
  block_id: string
  node_id: string
  concept_id?: string | null
  concept_name: string
  relation_type: 'defines' | 'uses' | 'mentions' | 'references_source' | 'affected_by_replacement' | string
  evidence?: string
  usage_summary?: string
  source_content_hash?: string | null
  status: 'pending' | 'active' | 'stale' | 'removed' | 'expired' | string
  created_at?: string | null
  updated_at?: string | null
}

export interface KBBlockRewriteSuggestion {
  id: string
  kb_id: number
  block_id: string
  node_id: string
  original_content: string
  suggested_content: string
  diff?: string
  extracted_concept_refs?: Array<Record<string, any>>
  preserved_facts_checklist?: Array<Record<string, any>>
  risk?: string
  source_content_hash?: string | null
  status: 'pending' | 'applied' | 'ignored' | 'expired' | string
  created_at?: string | null
  updated_at?: string | null
}

export interface KBConceptImpactAnalysisResult {
  decisions: KBConceptDecision[]
  relations: KBConceptBlockRelation[]
  rewrite_suggestion?: KBBlockRewriteSuggestion | null
  decision_count: number
  relation_count: number
  trace_id?: string
  mention_inventory?: Array<Record<string, any>>
  concept_candidates?: Array<Record<string, any>>
  candidate_coverage?: Record<string, any>
  chunk_scoring_summary?: Record<string, any>
  chunk_scores?: Array<Record<string, any>>
  global_rerank?: Record<string, any>
  quality_check?: Record<string, any>
  semantic_layers?: Array<Record<string, any>>
}

export interface KBConcept {
  id: string
  kb_id: number
  name: string
  aliases: string[]
  official_variant_id?: string | null
  official_variant?: KBConceptVariant | null
  variants: KBConceptVariant[]
  formal_sources?: KBConceptVariantSource[]
  pending_count?: number
  has_conflict?: boolean
  source_status?: 'active' | 'missing' | string
  created_at?: string | null
  updated_at?: string | null
  _meta?: {
    llm_elapsed_ms?: number
  }
}

export interface KBConceptExtractResult {
  created: KBConceptVariant[]
  count: number
  new_count?: number
  duplicate_count?: number
  supplement_count?: number
  conflict_count?: number
  replacement_count?: number
  false_positive_count?: number
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

export interface KBChatSource {
  type: 'block' | 'node' | 'concept' | string
  id: string
  name: string
  node_id?: string
  path?: string
  reason?: string
}

export interface KBChatRetrieval {
  needs_clarification?: boolean
  clarification_question?: string
  confidence?: number
  matched_concepts?: Array<Record<string, unknown>>
  selected_nodes?: Array<Record<string, unknown>>
  selected_blocks?: Array<Record<string, unknown>>
  missing_knowledge?: string
  plan?: string
}

export interface KBChatSession {
  id: string
  kb_id: number
  user_id: number
  title: string
  status: string
  created_at?: string | null
  updated_at?: string | null
  last_message_at?: string | null
}

export interface KBChatMessageRecord {
  id: string
  session_id: string
  kb_id: number
  user_id: number
  role: 'user' | 'assistant' | 'system' | string
  content: string
  sources?: KBChatSource[]
  retrieval?: KBChatRetrieval
  debug_events?: Array<{ text?: string; stage?: string; message?: string; type?: string; model?: string }>
  created_at?: string | null
}

export type KBEditorViewMode = 'raw' | 'chat' | 'template'
