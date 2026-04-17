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

export type KBNodeType = 'directory' | 'page' | 'component' | 'standalone'

export interface KBNode {
  id: string
  kb_id: number
  parent_id: string | null
  name: string
  type: KBNodeType
  description: string
  sort_order: number
  content: KBNodeContent
  children?: KBNode[]
  created_at: string
  updated_at: string
}

export interface KBNodeCreatePayload {
  id?: string
  parent_id: string | null
  name: string
  type: KBNodeType
  description?: string
  sort_order?: number
  content?: KBNodeContent
}

export interface KBNodeUpdatePayload {
  name?: string
  type?: KBNodeType
  description?: string
  sort_order?: number
  content?: KBNodeContent
}

export interface KBNodeMovePayload {
  parent_id: string | null
  sort_order: number
}

// ─── 节点内容 ───────────────────────────────────────

export interface KBNodeContent {
  zones?: KBZone[]
  interactions?: KBInteraction[]
  business_rules?: string
  notes?: string
}

export interface KBZone {
  id: string
  name: string
  type: 'tab' | 'section' | 'area' | 'toolbar' | 'form' | 'table' | 'custom'
  description: string
  position?: string
  fields?: KBZoneField[]
}

export interface KBZoneField {
  id: string
  name: string
  description?: string
}

export interface KBInteraction {
  id: string
  element: string
  trigger: 'click' | 'doubleClick' | 'hover' | 'contextMenu' | 'custom'
  description: string
  result: KBInteractionResult
}

export interface KBInteractionResult {
  type: 'navigate' | 'dialog' | 'drawer' | 'expand' | 'popup' | 'action' | 'custom'
  description?: string
  ref_node_id?: string
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
  children?: WikiDirectory[]
}

// ─── 模板 ───────────────────────────────────────────

export type KBTemplateType = 'prompt' | 'rule' | 'format'

export interface KBTemplate {
  id: number
  kb_id: number
  name: string
  type: KBTemplateType
  content: string
  created_at: string
  updated_at: string
}

export interface KBTemplateCreatePayload {
  name: string
  type: KBTemplateType
  content?: string
}

export interface KBTemplateUpdatePayload {
  name?: string
  type?: KBTemplateType
  content?: string
}

// ─── 编辑器视图模式 ─────────────────────────────────

export type KBEditorViewMode = 'raw' | 'wiki' | 'template'
