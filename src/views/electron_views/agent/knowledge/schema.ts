/**
 * KB Node Content Schema — Block-based canvas model.
 *
 * This file is the single source of truth for the node content JSON structure.
 * It will evolve frequently during the exploration phase; keep all
 * content-related types here so changes propagate easily.
 */

export const SCHEMA_VERSION = 1

// ─── Block Types ──────────────────────────────────

export type KBBlockType =
  | 'region'    // 页面区域（搜索区、列表区等）
  | 'button'    // 按钮
  | 'field'     // 字段
  | 'form'      // 表单
  | 'list'      // 列表/表格
  | 'text'      // 纯文本描述
  | 'custom'    // 自定义

export interface KBBlockRef {
  id: string
  targetNodeId: string        // 引用的 KB 节点 ID
  trigger: string             // 触发方式：click / condition / load / ...
  condition?: string          // 可选条件描述，如 "role=admin"
  description?: string        // 简要说明
}

export interface KBBlockImage {
  id: string
  url: string                 // 文件路径或 base64
  name: string
  description?: string
}

export interface KBBlock {
  id: string
  name: string                // 块标题
  type: KBBlockType
  content: string             // 主文本内容（需求描述）
  summary?: string            // 短摘要（用于模式 B 画布缩略显示）
  layout: {
    x: number
    y: number
    w: number
    h: number
  }
  refs: KBBlockRef[]
  images: KBBlockImage[]
}

// ─── Node Content (顶层) ──────────────────────────

export interface KBNodeContentV1 {
  schema_version: typeof SCHEMA_VERSION
  blocks: KBBlock[]
  canvas?: {
    zoom: number
    panX: number
    panY: number
  }
}

// ─── Helpers ──────────────────────────────────────

export function createEmptyContent(): KBNodeContentV1 {
  return {
    schema_version: SCHEMA_VERSION,
    blocks: [],
    canvas: { zoom: 1, panX: 0, panY: 0 },
  }
}

export function createBlock(
  name: string,
  type: KBBlockType = 'region',
  x = 40,
  y = 40,
): KBBlock {
  return {
    id: crypto.randomUUID(),
    name,
    type,
    content: '',
    summary: '',
    layout: { x, y, w: 280, h: 120 },
    refs: [],
    images: [],
  }
}

/**
 * Migrate legacy KBNodeContent (zones/interactions/business_rules/notes)
 * to the new block schema. Returns a new KBNodeContentV1 object.
 */
export function migrateLegacyContent(legacy: any): KBNodeContentV1 {
  if (legacy?.schema_version === SCHEMA_VERSION) {
    return legacy as KBNodeContentV1
  }

  const blocks: KBBlock[] = []
  let y = 40

  // Convert zones → region blocks
  if (Array.isArray(legacy?.zones)) {
    for (const zone of legacy.zones) {
      blocks.push({
        id: zone.id || crypto.randomUUID(),
        name: zone.name || '区域',
        type: 'region',
        content: zone.description || '',
        summary: zone.position || '',
        layout: { x: 40, y, w: 280, h: 120 },
        refs: [],
        images: [],
      })
      y += 140
    }
  }

  // Convert interactions → button blocks
  if (Array.isArray(legacy?.interactions)) {
    for (const ix of legacy.interactions) {
      const refs: KBBlockRef[] = []
      if (ix.result?.ref_node_id) {
        refs.push({
          id: crypto.randomUUID(),
          targetNodeId: ix.result.ref_node_id,
          trigger: ix.trigger || 'click',
          description: ix.result.description || '',
        })
      }
      blocks.push({
        id: ix.id || crypto.randomUUID(),
        name: ix.element || '交互',
        type: 'button',
        content: ix.description || '',
        summary: `${ix.trigger || 'click'}`,
        layout: { x: 360, y: blocks.length * 140 + 40, w: 200, h: 100 },
        refs,
        images: [],
      })
    }
  }

  // Convert business_rules → text block
  if (legacy?.business_rules) {
    blocks.push({
      id: crypto.randomUUID(),
      name: '业务规则',
      type: 'text',
      content: legacy.business_rules,
      layout: { x: 40, y, w: 520, h: 160 },
      refs: [],
      images: [],
    })
    y += 180
  }

  // Convert notes → text block
  if (legacy?.notes) {
    blocks.push({
      id: crypto.randomUUID(),
      name: '补充说明',
      type: 'text',
      content: legacy.notes,
      layout: { x: 40, y, w: 520, h: 120 },
      refs: [],
      images: [],
    })
  }

  return {
    schema_version: SCHEMA_VERSION,
    blocks,
    canvas: { zoom: 1, panX: 0, panY: 0 },
  }
}
