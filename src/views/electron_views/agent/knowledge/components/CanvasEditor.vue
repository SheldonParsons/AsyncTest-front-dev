<template>
  <div class="canvas-editor" ref="containerRef">
    <!-- Toolbar -->
    <div class="ce-toolbar">
      <div class="ce-toolbar-left">
        <span class="ce-node-name">{{ node.name }}</span>
        <span class="ce-node-type">{{ typeLabels[node.type] || node.type }}</span>
      </div>
      <div class="ce-toolbar-center">
        <button
          :class="['ce-mode-btn', { 'ce-mode-btn--active': displayMode === 'full' }]"
          @click="displayMode = 'full'"
          title="完整内容"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="18" height="18" rx="2"/><line x1="3" y1="9" x2="21" y2="9"/>
          </svg>
        </button>
        <button
          :class="['ce-mode-btn', { 'ce-mode-btn--active': displayMode === 'compact' }]"
          @click="displayMode = 'compact'"
          title="摘要模式"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/>
          </svg>
        </button>
      </div>
      <div class="ce-toolbar-right">
        <button class="ce-tool-btn" @click="addBlock" title="添加块">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button class="ce-tool-btn ce-tool-btn--save" @click="save" :disabled="saving" title="保存">
          {{ saving ? '…' : '保存' }}
        </button>
      </div>
    </div>

    <!-- Canvas -->
    <div
      class="ce-canvas-wrap"
      ref="canvasWrapRef"
      @pointerdown="onCanvasPointerDown"
    >
      <div
        class="ce-canvas"
        :style="{ height: canvasHeight + 'px' }"
      >
        <!-- Snap guide lines -->
        <div v-if="snapGuideX !== null" class="ce-snap-guide ce-snap-guide--v" :style="{ left: snapGuideX + 'px' }" />
        <div v-if="snapGuideY !== null" class="ce-snap-guide ce-snap-guide--h" :style="{ top: snapGuideY + 'px' }" />

        <!-- Blocks -->
        <div
          v-for="block in content.blocks"
          :key="block.id"
          :class="[
            'ce-block',
            `ce-block--${block.type}`,
            { 'ce-block--selected': selectedBlockId === block.id },
            { 'ce-block--editing': editingBlockId === block.id },
          ]"
          :style="{
            left: block.layout.x + 'px',
            top: block.layout.y + 'px',
            width: block.layout.w + 'px',
            height: block.layout.h + 'px',
          }"
        >
          <!-- Block header — drag handle area -->
          <div class="ce-block-header" @pointerdown.stop="onHeaderPointerDown($event, block)">
            <span :class="['ce-block-type-dot', `ce-block-type-dot--${block.type}`]" />
            <span class="ce-block-name">{{ block.name || '未命名' }}</span>
            <div class="ce-block-actions">
              <select
                class="ce-block-type-select"
                :value="block.type"
                @change="onBlockTypeChange(block, ($event.target as HTMLSelectElement).value)"
                @pointerdown.stop
              >
                <option v-for="bt in blockTypes" :key="bt.value" :value="bt.value">{{ bt.label }}</option>
              </select>
              <button
                v-show="!isDragging"
                class="ce-block-edit-btn"
                @click.stop="openPanel(block.id)"
                @pointerdown.stop
                title="编辑详情"
              >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                  <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                  <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                </svg>
              </button>
              <button class="ce-block-delete" @click.stop="deleteBlock(block.id)" title="删除">×</button>
            </div>
          </div>

          <!-- Block body: Full mode -->
          <template v-if="displayMode === 'full'">
            <div v-if="editingBlockId === block.id && editField === 'content'" class="ce-block-body">
              <textarea
                class="ce-block-textarea"
                v-model="block.content"
                placeholder="输入需求描述…"
                @blur="stopEditingField"
                @pointerdown.stop
                ref="contentTextareaRef"
                autofocus
              />
            </div>
            <div v-else class="ce-block-body ce-block-body--preview" @pointerdown.stop @click.stop="startEditingContent(block.id)">
              <p v-if="block.content" class="ce-block-content-text">{{ block.content }}</p>
              <p v-else class="ce-block-placeholder">点击编辑内容…</p>
            </div>
          </template>

          <!-- Block body: Compact mode -->
          <template v-else>
            <div class="ce-block-body ce-block-body--compact" @pointerdown.stop @click.stop="startEditingContent(block.id)">
              <p class="ce-block-summary">{{ block.summary || block.content?.slice(0, 60) || '—' }}</p>
            </div>
          </template>

          <!-- Block footer: refs & images count -->
          <div class="ce-block-footer">
            <span v-if="block.refs.length" class="ce-block-badge" title="引用">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
              {{ block.refs.length }}
            </span>
            <span v-if="block.images.length" class="ce-block-badge" title="图片">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              {{ block.images.length }}
            </span>
          </div>

          <!-- Resize handles: left, bottom, bottom-right -->
          <div class="ce-resize ce-resize--left" @pointerdown.stop="onResizePointerDown($event, block, 'left')" />
          <div class="ce-resize ce-resize--bottom" @pointerdown.stop="onResizePointerDown($event, block, 'bottom')" />
          <div class="ce-resize ce-resize--br" @pointerdown.stop="onResizePointerDown($event, block, 'br')" />
          <div class="ce-resize ce-resize--right" @pointerdown.stop="onResizePointerDown($event, block, 'right')" />
        </div>
      </div>
    </div>

    <!-- Detail Panel (slide-in from right) -->
    <Transition name="ce-panel-slide">
      <div v-if="panelBlockId && panelBlock" class="ce-panel">
        <div class="ce-panel-header">
          <h3 class="ce-panel-title">{{ panelBlock.name || '未命名' }}</h3>
          <button class="ce-panel-close" @click="panelBlockId = null">×</button>
        </div>
        <div class="ce-panel-body">
          <div class="ce-panel-field">
            <label class="ce-panel-label">名称</label>
            <input class="ce-panel-input" v-model="panelBlock.name" @input="debouncedSave" />
          </div>
          <div class="ce-panel-field">
            <label class="ce-panel-label">类型</label>
            <select class="ce-panel-select" v-model="panelBlock.type" @change="debouncedSave">
              <option v-for="bt in blockTypes" :key="bt.value" :value="bt.value">{{ bt.label }}</option>
            </select>
          </div>
          <div class="ce-panel-field">
            <label class="ce-panel-label">需求描述</label>
            <textarea class="ce-panel-textarea" v-model="panelBlock.content" rows="6" placeholder="输入需求内容…" @input="debouncedSave" />
          </div>
          <div class="ce-panel-field">
            <label class="ce-panel-label">摘要 <span class="ce-panel-hint">（画布缩略显示用）</span></label>
            <input class="ce-panel-input" v-model="panelBlock.summary" placeholder="可选" @input="debouncedSave" />
          </div>

          <!-- References -->
          <div class="ce-panel-section">
            <div class="ce-panel-section-header">
              <span class="ce-panel-label">引用节点</span>
              <button class="ce-panel-add-btn" @click="addRef(panelBlock)">+ 添加</button>
            </div>
            <div v-if="panelBlock.refs.length === 0" class="ce-panel-empty">暂无引用</div>
            <div v-for="(r, i) in panelBlock.refs" :key="r.id" class="ce-panel-ref-card">
              <input class="ce-panel-input ce-panel-input--sm" v-model="r.targetNodeId" placeholder="目标节点 ID" @input="debouncedSave" />
              <input class="ce-panel-input ce-panel-input--sm" v-model="r.trigger" placeholder="触发方式 (click)" @input="debouncedSave" />
              <input class="ce-panel-input ce-panel-input--sm" v-model="r.condition" placeholder="条件 (可选)" @input="debouncedSave" />
              <input class="ce-panel-input ce-panel-input--sm" v-model="r.description" placeholder="说明 (可选)" @input="debouncedSave" />
              <button class="ce-panel-ref-delete" @click="removeRef(panelBlock, i)">×</button>
            </div>
          </div>

          <!-- Images -->
          <div class="ce-panel-section">
            <div class="ce-panel-section-header">
              <span class="ce-panel-label">参考图片</span>
              <button class="ce-panel-add-btn" @click="addImage(panelBlock)">+ 添加</button>
            </div>
            <div v-if="panelBlock.images.length === 0" class="ce-panel-empty">暂无图片</div>
            <div v-for="(img, i) in panelBlock.images" :key="img.id" class="ce-panel-img-card">
              <img v-if="img.url" :src="img.url" class="ce-panel-img-thumb" />
              <div class="ce-panel-img-info">
                <span class="ce-panel-img-name">{{ img.name || '未命名' }}</span>
                <button class="ce-panel-ref-delete" @click="removeImage(panelBlock, i)">×</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import type { KBNode } from '@/types/knowledge'
import {
  type KBBlock,
  type KBBlockType,
  type KBNodeContentV1,
  createEmptyContent,
  createBlock,
  migrateLegacyContent,
} from '../schema'

const props = defineProps<{
  node: KBNode
  kbId: number
}>()

const emit = defineEmits<{
  (e: 'save', content: KBNodeContentV1): void
}>()

// ─── Constants ───

const SNAP_THRESHOLD = 8
const SNAP_GAP = 4
const MIN_W = 120
const MIN_H = 60
const CANVAS_PADDING = 200
const CANVAS_INSET = 8

const typeLabels: Record<string, string> = {
  directory: '目录', page: '页面', component: '组件', standalone: '独立',
}

const blockTypes: { value: KBBlockType; label: string }[] = [
  { value: 'region', label: '区域' },
  { value: 'button', label: '按钮' },
  { value: 'field', label: '字段' },
  { value: 'form', label: '表单' },
  { value: 'list', label: '列表' },
  { value: 'text', label: '文本' },
  { value: 'custom', label: '自定义' },
]

// ─── State ───

const containerRef = ref<HTMLElement | null>(null)
const canvasWrapRef = ref<HTMLElement | null>(null)
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null)

const content = reactive<KBNodeContentV1>(createEmptyContent())
const displayMode = ref<'full' | 'compact'>('full')

const selectedBlockId = ref<string | null>(null)
const editingBlockId = ref<string | null>(null)
const editField = ref<'name' | 'content' | null>(null)
const panelBlockId = ref<string | null>(null)

const isDragging = ref(false)
const saving = ref(false)

// Snap guide lines (visible during drag)
const snapGuideX = ref<number | null>(null)
const snapGuideY = ref<number | null>(null)

const canvasHeight = computed(() => {
  if (!content.blocks.length) return 600
  return content.blocks.reduce((m, b) => Math.max(m, b.layout.y + b.layout.h), 0) + CANVAS_PADDING
})

const panelBlock = computed(() => {
  if (!panelBlockId.value) return null
  return content.blocks.find(b => b.id === panelBlockId.value) || null
})

// ─── Sync from prop ───

watch(() => props.node, (n) => {
  const parsed = n.content ? migrateLegacyContent(n.content) : createEmptyContent()
  content.schema_version = parsed.schema_version
  content.blocks = parsed.blocks
  content.canvas = parsed.canvas || { zoom: 1, panX: 0, panY: 0 }
  selectedBlockId.value = null
  editingBlockId.value = null
  panelBlockId.value = null
}, { immediate: true })

// ─── Save ───

let saveTimer: ReturnType<typeof setTimeout> | null = null

function debouncedSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => save(), 800)
}

async function save() {
  if (saveTimer) clearTimeout(saveTimer)
  saving.value = true
  content.canvas = { zoom: 1, panX: 0, panY: 0 }
  emit('save', JSON.parse(JSON.stringify(content)))
  await new Promise(r => setTimeout(r, 200))
  saving.value = false
}

// ─── Block CRUD ───

function addBlock() {
  const wrap = canvasWrapRef.value
  const scrollX = wrap ? wrap.scrollLeft : 0
  const scrollY = wrap ? wrap.scrollTop : 0
  const maxY = content.blocks.reduce((max, b) => Math.max(max, b.layout.y + b.layout.h), 0)
  const block = createBlock('新块', 'region', Math.round(scrollX + CANVAS_INSET), Math.round(Math.max(maxY + SNAP_GAP + CANVAS_INSET, scrollY + CANVAS_INSET)))
  // Prevent overlap on creation
  while (content.blocks.some(b => blocksOverlap(block.layout, b.layout))) {
    block.layout.y += 10
  }
  content.blocks.push(block)
  selectedBlockId.value = block.id
  debouncedSave()
}

function deleteBlock(id: string) {
  const idx = content.blocks.findIndex(b => b.id === id)
  if (idx >= 0) {
    content.blocks.splice(idx, 1)
    if (selectedBlockId.value === id) selectedBlockId.value = null
    if (editingBlockId.value === id) editingBlockId.value = null
    if (panelBlockId.value === id) panelBlockId.value = null
    debouncedSave()
  }
}

function onBlockTypeChange(block: KBBlock, value: string) {
  block.type = value as KBBlockType
  debouncedSave()
}

function openPanel(blockId: string) {
  panelBlockId.value = panelBlockId.value === blockId ? null : blockId
}

// ─── Inline editing ───

function startEditingContent(blockId: string) {
  editingBlockId.value = blockId
  editField.value = 'content'
  nextTick(() => {
    const ta = contentTextareaRef.value
    if (Array.isArray(ta)) (ta as any)[0]?.focus()
    else ta?.focus()
  })
}

function stopEditingField() {
  editingBlockId.value = null
  editField.value = null
  debouncedSave()
}

// ─── Overlap detection ───

interface Rect { x: number; y: number; w: number; h: number }

function blocksOverlap(a: Rect, b: Rect): boolean {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y
}

function wouldOverlap(rect: Rect, excludeId: string): boolean {
  return content.blocks.some(b => b.id !== excludeId && blocksOverlap(rect, b.layout))
}

// ─── Snap logic ───

interface SnapResult { value: number; guide: number }

function findSnap(
  edges: number[],
  targets: number[],
  threshold: number,
  disabled: boolean,
): SnapResult | null {
  if (disabled) return null
  let best: SnapResult | null = null
  let bestDist = threshold + 1
  for (const edge of edges) {
    for (const target of targets) {
      const d = Math.abs(edge - target)
      if (d < bestDist) {
        bestDist = d
        best = { value: target - edge + edges[0], guide: target }
        // For the first edge in the array, snap shifts are relative
        // Recalculate: shift = target - edge, then newPos = origPos + shift
        best = { value: edges[0] + (target - edge), guide: target }
      }
    }
  }
  return best
}

function collectSnapTargetsX(excludeId: string): number[] {
  const targets = [CANVAS_INSET] // left wall with inset
  for (const b of content.blocks) {
    if (b.id === excludeId) continue
    targets.push(b.layout.x - SNAP_GAP, b.layout.x + b.layout.w + SNAP_GAP)
  }
  return targets
}

function collectSnapTargetsY(excludeId: string): number[] {
  const targets = [CANVAS_INSET] // top wall with inset
  for (const b of content.blocks) {
    if (b.id === excludeId) continue
    targets.push(b.layout.y - SNAP_GAP, b.layout.y + b.layout.h + SNAP_GAP)
  }
  return targets
}

// ─── Drag state ───

type ResizeEdge = 'left' | 'right' | 'bottom' | 'br'

let dragState: {
  type: 'move' | 'resize'
  edge?: ResizeEdge
  blockId: string
  startX: number
  startY: number
  origX: number
  origY: number
  origW: number
  origH: number
  startScrollX: number
  startScrollY: number
  suppressSnapX: boolean
  suppressSnapY: boolean
} | null = null

// Auto-scroll during drag near edges
let autoScrollRAF: number | null = null
let lastPointerX = 0
let lastPointerY = 0
const AUTO_SCROLL_ZONE = 40
const AUTO_SCROLL_SPEED = 12

function onCanvasPointerDown(e: PointerEvent) {
  if (e.button === 0 && (e.target as HTMLElement).closest('.ce-canvas-wrap') === e.currentTarget) {
    selectedBlockId.value = null
    editingBlockId.value = null
  }
}

function isSnappedX(block: KBBlock): boolean {
  const targets = collectSnapTargetsX(block.id)
  const edges = [block.layout.x, block.layout.x + block.layout.w]
  return edges.some(e => targets.some(t => Math.abs(e - t) < 1))
}

function isSnappedY(block: KBBlock): boolean {
  const targets = collectSnapTargetsY(block.id)
  const edges = [block.layout.y, block.layout.y + block.layout.h]
  return edges.some(e => targets.some(t => Math.abs(e - t) < 1))
}

function onHeaderPointerDown(e: PointerEvent, block: KBBlock) {
  if (e.button !== 0) return
  const tag = (e.target as HTMLElement).tagName
  if (tag === 'INPUT' || tag === 'SELECT' || tag === 'BUTTON') return
  selectedBlockId.value = block.id
  const wrap = canvasWrapRef.value
  dragState = {
    type: 'move',
    blockId: block.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: block.layout.x,
    origY: block.layout.y,
    origW: block.layout.w,
    origH: block.layout.h,
    startScrollX: wrap ? wrap.scrollLeft : 0,
    startScrollY: wrap ? wrap.scrollTop : 0,
    suppressSnapX: isSnappedX(block),
    suppressSnapY: isSnappedY(block),
  }
  isDragging.value = false
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function onResizePointerDown(e: PointerEvent, block: KBBlock, edge: ResizeEdge) {
  if (e.button !== 0) return
  selectedBlockId.value = block.id
  const wrap = canvasWrapRef.value
  dragState = {
    type: 'resize',
    edge,
    blockId: block.id,
    startX: e.clientX,
    startY: e.clientY,
    origX: block.layout.x,
    origY: block.layout.y,
    origW: block.layout.w,
    origH: block.layout.h,
    startScrollX: wrap ? wrap.scrollLeft : 0,
    startScrollY: wrap ? wrap.scrollTop : 0,
    suppressSnapX: false,
    suppressSnapY: false,
  }
  isDragging.value = true
  lastPointerX = e.clientX
  lastPointerY = e.clientY
  window.addEventListener('pointermove', onPointerMove)
  window.addEventListener('pointerup', onPointerUp)
}

function applyDragUpdate() {
  if (!dragState) return
  const wrap = canvasWrapRef.value
  const block = content.blocks.find(b => b.id === dragState!.blockId)
  if (!block || !wrap) return

  const maxRight = wrap.clientWidth - CANVAS_INSET
  const scrollDX = wrap.scrollLeft - dragState.startScrollX
  const scrollDY = wrap.scrollTop - dragState.startScrollY
  const dx = (lastPointerX - dragState.startX) + scrollDX
  const dy = (lastPointerY - dragState.startY) + scrollDY

  if (dragState.type === 'move') {
    let newX = Math.max(CANVAS_INSET, Math.round(dragState.origX + dx))
    let newY = Math.max(CANVAS_INSET, Math.round(dragState.origY + dy))

    // Clamp right edge
    if (newX + block.layout.w > maxRight) newX = maxRight - block.layout.w

    const targetsX = collectSnapTargetsX(block.id)
    const targetsY = collectSnapTargetsY(block.id)
    let gx: number | null = null
    let gy: number | null = null

    const snapX = findSnap([newX, newX + block.layout.w], targetsX, SNAP_THRESHOLD, dragState.suppressSnapX)
    if (snapX) { newX = snapX.value; gx = snapX.guide }

    const snapY = findSnap([newY, newY + block.layout.h], targetsY, SNAP_THRESHOLD, dragState.suppressSnapY)
    if (snapY) { newY = snapY.value; gy = snapY.guide }

    newX = Math.max(CANVAS_INSET, newX)
    newY = Math.max(CANVAS_INSET, newY)
    if (newX + block.layout.w > maxRight) newX = maxRight - block.layout.w

    const candidate: Rect = { x: newX, y: newY, w: block.layout.w, h: block.layout.h }
    if (!wouldOverlap(candidate, block.id)) {
      block.layout.x = newX
      block.layout.y = newY
      snapGuideX.value = gx
      snapGuideY.value = gy
    }

  } else if (dragState.type === 'resize') {
    const edge = dragState.edge!
    let newX = dragState.origX
    let newY = dragState.origY
    let newW = dragState.origW
    let newH = dragState.origH

    if (edge === 'left') {
      const rawX = Math.max(CANVAS_INSET, Math.round(dragState.origX + dx))
      newW = dragState.origW + (dragState.origX - rawX)
      if (newW >= MIN_W) { newX = rawX } else { newW = MIN_W; newX = dragState.origX + dragState.origW - MIN_W }
    } else if (edge === 'right') {
      newW = Math.max(MIN_W, Math.round(dragState.origW + dx))
      if (newX + newW > maxRight) newW = maxRight - newX
    } else if (edge === 'bottom') {
      newH = Math.max(MIN_H, Math.round(dragState.origH + dy))
    } else { // br
      newW = Math.max(MIN_W, Math.round(dragState.origW + dx))
      newH = Math.max(MIN_H, Math.round(dragState.origH + dy))
      if (newX + newW > maxRight) newW = maxRight - newX
    }

    const candidate: Rect = { x: newX, y: newY, w: newW, h: newH }
    if (!wouldOverlap(candidate, block.id)) {
      block.layout.x = newX
      block.layout.y = newY
      block.layout.w = newW
      block.layout.h = newH
    }
  }
}

function onPointerMove(e: PointerEvent) {
  if (!dragState) return
  lastPointerX = e.clientX
  lastPointerY = e.clientY

  const dx = e.clientX - dragState.startX
  const dy = e.clientY - dragState.startY
  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) isDragging.value = true

  applyDragUpdate()
  startAutoScroll()
}

function onPointerUp() {
  stopAutoScroll()
  if (dragState && isDragging.value) debouncedSave()
  dragState = null
  snapGuideX.value = null
  snapGuideY.value = null
  setTimeout(() => { isDragging.value = false }, 50)
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
}

// ─── Auto-scroll near container edges during drag ───

function startAutoScroll() {
  if (autoScrollRAF !== null) return
  autoScrollTick()
}

function stopAutoScroll() {
  if (autoScrollRAF !== null) {
    cancelAnimationFrame(autoScrollRAF)
    autoScrollRAF = null
  }
}

function autoScrollTick() {
  autoScrollRAF = null
  if (!dragState) return
  const wrap = canvasWrapRef.value
  if (!wrap) return

  const rect = wrap.getBoundingClientRect()
  let scrollDy = 0

  const bottomDist = rect.bottom - lastPointerY
  const topDist = lastPointerY - rect.top

  if (bottomDist >= 0 && bottomDist < AUTO_SCROLL_ZONE) {
    scrollDy = AUTO_SCROLL_SPEED * (1 - bottomDist / AUTO_SCROLL_ZONE)
  } else if (topDist >= 0 && topDist < AUTO_SCROLL_ZONE) {
    scrollDy = -AUTO_SCROLL_SPEED * (1 - topDist / AUTO_SCROLL_ZONE)
  }

  if (scrollDy !== 0) {
    wrap.scrollTop += Math.round(scrollDy)
    applyDragUpdate()
  }

  autoScrollRAF = requestAnimationFrame(autoScrollTick)
}

// ─── Refs & Images ───

function addRef(block: KBBlock) {
  block.refs.push({ id: crypto.randomUUID(), targetNodeId: '', trigger: 'click', condition: '', description: '' })
  debouncedSave()
}
function removeRef(block: KBBlock, index: number) { block.refs.splice(index, 1); debouncedSave() }

function addImage(block: KBBlock) {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      block.images.push({ id: crypto.randomUUID(), url: reader.result as string, name: file.name })
      debouncedSave()
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
function removeImage(block: KBBlock, index: number) { block.images.splice(index, 1); debouncedSave() }

// ─── Cleanup ───

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  stopAutoScroll()
})
</script>

<style lang="scss" scoped>
$bg-page: #ffffff;
$bg-sidebar: #f5f5f7;
$bg-hover: #eaeaec;
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.55);
$text-tertiary: rgba(0, 0, 0, 0.35);
$border-color: rgba(0, 0, 0, 0.08);
$accent: #1d1d1f;
$block-shadow: 0 1px 4px rgba(0, 0, 0, 0.08);
$block-shadow-selected: 0 2px 12px rgba(0, 0, 0, 0.14);

.canvas-editor {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background: $bg-page;
  overflow: hidden;
  font-family: -apple-system, BlinkMacSystemFont, 'SF Pro Text', 'SF Pro Display', 'Helvetica Neue', Helvetica, Arial, sans-serif;
}

// ─── Toolbar ───

.ce-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 44px;
  min-height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid $border-color;
  background: $bg-page;
  z-index: 10;
}

.ce-toolbar-left {
  display: flex;
  align-items: center;
  gap: 8px;
  flex: 1;
  min-width: 0;
}

.ce-node-name {
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.224px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ce-node-type {
  font-size: 11px;
  font-weight: 500;
  color: $text-tertiary;
  padding: 2px 7px;
  border-radius: 4px;
  background: $bg-sidebar;
  letter-spacing: -0.08px;
  white-space: nowrap;
}

.ce-toolbar-center {
  display: flex;
  align-items: center;
  gap: 2px;
  background: $bg-sidebar;
  border-radius: 6px;
  padding: 2px;
}

.ce-mode-btn {
  width: 28px;
  height: 24px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.15s;

  &--active {
    background: $bg-page;
    color: $text-primary;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.06);
  }

  &:hover:not(&--active) {
    color: $text-secondary;
  }
}

.ce-toolbar-right {
  display: flex;
  align-items: center;
  gap: 6px;
  flex: 1;
  justify-content: flex-end;
}

.ce-tool-btn {
  height: 28px;
  min-width: 28px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-secondary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
  font-weight: 500;
  padding: 0 6px;
  transition: background 0.12s, color 0.12s;

  &:hover {
    background: $bg-hover;
    color: $text-primary;
  }

  &--save {
    background: $accent;
    color: #fff;
    padding: 0 14px;
    font-size: 12px;
    letter-spacing: -0.12px;

    &:hover { opacity: 0.88; background: $accent; color: #fff; }
    &:disabled { opacity: 0.4; cursor: not-allowed; }
  }
}

// ─── Canvas ───

.ce-canvas-wrap {
  flex: 1;
  overflow-x: hidden;
  overflow-y: auto;
  position: relative;
  background:
    radial-gradient(circle, rgba(0,0,0,0.04) 1px, transparent 1px);
  background-size: 20px 20px;
}

.ce-canvas {
  position: relative;
  min-width: 100%;
  min-height: 100%;
}

// ─── Snap guides ───

.ce-snap-guide {
  position: absolute;
  z-index: 50;
  pointer-events: none;

  &--v {
    top: 0;
    bottom: 0;
    width: 1px;
    background: rgba(29, 29, 31, 0.2);
  }

  &--h {
    left: 0;
    right: 0;
    height: 1px;
    background: rgba(29, 29, 31, 0.2);
  }
}

// ─── Blocks ───

.ce-block {
  position: absolute;
  background: $bg-page;
  border: 1px solid $border-color;
  border-radius: 8px;
  box-shadow: $block-shadow;
  cursor: default;
  display: flex;
  flex-direction: column;
  transition: box-shadow 0.15s, border-color 0.15s;
  user-select: none;
  overflow: visible;

  &:hover {
    border-color: rgba(0, 0, 0, 0.15);
  }

  &--selected {
    border-color: $accent;
    box-shadow: $block-shadow-selected;
  }

  &--editing {
    cursor: text;
  }
}

// Edit button — inline in header, next to type select
.ce-block-edit-btn {
  width: 22px;
  height: 22px;
  border: 1px solid $border-color;
  border-radius: 5px;
  background: $bg-page;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  opacity: 0;
  transition: opacity 0.12s, color 0.1s, background 0.1s;

  .ce-block:hover & {
    opacity: 1;
  }

  &:hover {
    color: $text-primary;
    background: $bg-sidebar;
  }
}

.ce-block-header {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 8px 10px 6px;
  min-height: 30px;
  cursor: grab;

  &:active {
    cursor: grabbing;
  }
}

.ce-block-type-dot {
  width: 8px;
  height: 8px;
  border-radius: 50%;
  flex-shrink: 0;
  background: $text-tertiary;

  &--region { background: #1d1d1f; }
  &--button { background: #6e6e73; }
  &--field { background: #86868b; }
  &--form { background: #515154; }
  &--list { background: #3a3a3c; }
  &--text { background: #aeaeb2; }
  &--custom { background: #48484a; }
}

.ce-block-name {
  flex: 1;
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  min-width: 0;
  cursor: text;
}

.ce-block-name-input {
  flex: 1;
  border: none;
  border-bottom: 1px solid $accent;
  font-size: 13px;
  font-weight: 600;
  color: $text-primary;
  background: transparent;
  outline: none;
  padding: 0 0 1px;
  letter-spacing: -0.12px;
  font-family: inherit;
  min-width: 0;
}

.ce-block-actions {
  display: flex;
  align-items: center;
  gap: 4px;
  opacity: 0;
  transition: opacity 0.12s;

  .ce-block:hover &,
  .ce-block--selected & {
    opacity: 1;
  }
}

.ce-block-type-select {
  padding: 2px 4px;
  border: 1px solid $border-color;
  border-radius: 4px;
  font-size: 10px;
  color: $text-secondary;
  background: $bg-sidebar;
  outline: none;
  font-family: inherit;
  cursor: pointer;
}

.ce-block-delete {
  width: 20px;
  height: 20px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-tertiary;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: background 0.1s, color 0.1s;

  &:hover {
    background: rgba(255, 59, 48, 0.08);
    color: #ff3b30;
  }
}

// Block body
.ce-block-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 0 10px 6px;
  display: flex;
  flex-direction: column;

  &--preview {
    cursor: text;
  }

  &--compact {
    padding: 0 10px 8px;
    cursor: text;
  }
}

.ce-block-content-text {
  margin: 0;
  font-size: 12px;
  color: $text-secondary;
  line-height: 1.5;
  letter-spacing: -0.12px;
  white-space: pre-wrap;
  word-break: break-word;
  overflow: hidden;
}

.ce-block-placeholder {
  margin: 0;
  font-size: 12px;
  color: $text-tertiary;
  font-style: italic;
}

.ce-block-summary {
  margin: 0;
  font-size: 12px;
  color: $text-secondary;
  letter-spacing: -0.12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ce-block-textarea {
  width: 100%;
  flex: 1;
  border: none;
  font-size: 12px;
  color: $text-primary;
  background: transparent;
  outline: none;
  resize: none;
  font-family: inherit;
  line-height: 1.5;
  letter-spacing: -0.12px;
  min-height: 0;
  overflow: auto;
}

.ce-block-footer {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 0 10px 6px;
  min-height: 0;
}

.ce-block-badge {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 10px;
  color: $text-tertiary;
  letter-spacing: -0.08px;

  svg { opacity: 0.6; }
}

// ─── Resize handles ───

.ce-resize {
  position: absolute;
  opacity: 0;
  transition: opacity 0.12s;
  z-index: 2;

  .ce-block:hover &,
  .ce-block--selected & {
    opacity: 1;
  }

  &--left {
    top: 8px;
    bottom: 8px;
    left: 0;
    width: 5px;
    cursor: ew-resize;
  }

  &--right {
    top: 8px;
    bottom: 8px;
    right: 0;
    width: 5px;
    cursor: ew-resize;
  }

  &--bottom {
    left: 8px;
    right: 8px;
    bottom: 0;
    height: 5px;
    cursor: ns-resize;
  }

  &--br {
    right: 0;
    bottom: 0;
    width: 14px;
    height: 14px;
    cursor: nwse-resize;

    &::after {
      content: '';
      position: absolute;
      right: 3px;
      bottom: 3px;
      width: 8px;
      height: 8px;
      border-right: 2px solid rgba(0, 0, 0, 0.15);
      border-bottom: 2px solid rgba(0, 0, 0, 0.15);
      border-radius: 0 0 2px 0;
    }
  }
}

// ─── Detail Panel ───

.ce-panel {
  position: absolute;
  top: 44px;
  right: 0;
  bottom: 0;
  width: 320px;
  background: $bg-page;
  border-left: 1px solid $border-color;
  z-index: 20;
  display: flex;
  flex-direction: column;
  box-shadow: -4px 0 20px rgba(0, 0, 0, 0.04);
}

.ce-panel-slide-enter-active,
.ce-panel-slide-leave-active {
  transition: transform 0.2s ease;
}

.ce-panel-slide-enter-from,
.ce-panel-slide-leave-to {
  transform: translateX(100%);
}

.ce-panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 14px 16px;
  border-bottom: 1px solid $border-color;
}

.ce-panel-title {
  margin: 0;
  font-size: 14px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.224px;
}

.ce-panel-close {
  width: 24px;
  height: 24px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-tertiary;
  font-size: 16px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: $bg-hover; color: $text-primary; }
}

.ce-panel-body {
  flex: 1;
  overflow-y: auto;
  padding: 14px 16px;
}

.ce-panel-field { margin-bottom: 14px; }

.ce-panel-label {
  display: block;
  font-size: 11px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.2px;
  text-transform: uppercase;
  margin-bottom: 5px;
}

.ce-panel-hint {
  font-weight: 400;
  text-transform: none;
  letter-spacing: -0.08px;
}

.ce-panel-input {
  width: 100%;
  padding: 7px 10px;
  border: 1px solid $border-color;
  border-radius: 6px;
  font-size: 13px;
  color: $text-primary;
  background: $bg-sidebar;
  outline: none;
  font-family: inherit;
  letter-spacing: -0.12px;
  box-sizing: border-box;
  transition: border-color 0.15s;

  &:focus { border-color: $accent; background: $bg-page; }
  &--sm { padding: 5px 8px; font-size: 12px; margin-bottom: 4px; }
}

.ce-panel-select {
  @extend .ce-panel-input;
  cursor: pointer;
  -webkit-appearance: none;
  appearance: none;
}

.ce-panel-textarea {
  @extend .ce-panel-input;
  resize: vertical;
  line-height: 1.5;
  min-height: 80px;
}

.ce-panel-section { margin-bottom: 16px; }

.ce-panel-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 6px;
}

.ce-panel-add-btn {
  border: none;
  background: transparent;
  font-size: 12px;
  color: $accent;
  cursor: pointer;
  padding: 0;
  letter-spacing: -0.12px;

  &:hover { opacity: 0.7; }
}

.ce-panel-empty {
  font-size: 12px;
  color: $text-tertiary;
  padding: 8px 0;
}

.ce-panel-ref-card {
  padding: 8px;
  border-radius: 6px;
  background: $bg-sidebar;
  margin-bottom: 6px;
  position: relative;
}

.ce-panel-ref-delete {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: $text-tertiary;
  font-size: 13px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;

  &:hover { background: rgba(255, 59, 48, 0.08); color: #ff3b30; }
}

.ce-panel-img-card {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 6px;
  border-radius: 6px;
  background: $bg-sidebar;
  margin-bottom: 6px;
}

.ce-panel-img-thumb {
  width: 40px;
  height: 40px;
  border-radius: 4px;
  object-fit: cover;
}

.ce-panel-img-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ce-panel-img-name {
  font-size: 12px;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>
