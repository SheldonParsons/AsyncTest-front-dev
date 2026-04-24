<template>
  <div class="canvas-editor" ref="containerRef">
    <!-- Toolbar -->
    <div class="ce-toolbar">
      <div class="ce-toolbar-left">
        <span v-if="isDirty" class="ce-dirty-dot" title="有未保存的修改" />
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
        <button class="ce-tool-btn" @click="onRefresh" :disabled="saving" title="刷新">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <polyline points="23 4 23 10 17 10"/>
            <polyline points="1 20 1 14 7 14"/>
            <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
          </svg>
        </button>
        <button v-if="displayMode === 'full'" class="ce-tool-btn" @click="addBlock" title="添加块">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </button>
        <button v-if="displayMode === 'full'" class="ce-tool-btn ce-tool-btn--save" @click="save" :disabled="saving" :title="saving ? saveStatusText : '保存'">
          {{ saving ? (saveStatusText || '…') : '保存' }}
        </button>
      </div>
    </div>

    <!-- Canvas (full mode only) -->
    <div
      v-if="displayMode === 'full'"
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
            { 'ce-block--transitioning': transitioningBlockId === block.id },
            { 'ce-block--incomplete': !(block.content || '').trim() || !(block.summary || '').trim() },
          ]"
          :style="{
            left: block.layout.x + 'px',
            top: block.layout.y + 'px',
            width: block.layout.w + 'px',
            height: block.layout.h + 'px',
            '--block-accent': blockTypeAccents[block.type] || '#1d1d1f',
          }"
          @pointerdown.capture="selectBlock(block.id)"
        >
          <!-- Block header — drag handle area -->
          <div class="ce-block-header" @pointerdown.stop="onHeaderPointerDown($event, block)" @dblclick.stop="onHeaderDblClick(block)">
            <span class="ce-block-name">
              {{ block.name || '未命名' }}
              <span v-if="staleBlockIds.has(block.id)" class="ce-stale-dot" title="内容已修改，块摘要陈旧" />
              <span
                v-else-if="!(block.content || '').trim() || !(block.summary || '').trim()"
                class="ce-block-incomplete-tag"
                :title="!(block.content || '').trim() ? '尚未填写知识描述' : '尚未生成摘要（保存时自动生成）'"
              >{{ !(block.content || '').trim() ? '缺内容' : '缺摘要' }}</span>
            </span>
            <div class="ce-block-actions">
              <button
                v-show="!isDragging || isResizing"
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
            <div v-else class="ce-block-body ce-block-body--preview" @pointerdown.stop @click.stop="openMdDialog(block.id)">
              <p v-if="block.content" class="ce-block-content-text">{{ block.content }}</p>
              <p v-else class="ce-block-placeholder">点击查看内容…</p>
            </div>
          </template>

          <!-- Block body: Compact mode -->
          <template v-else>
            <div class="ce-block-body ce-block-body--compact" @pointerdown.stop @click.stop="openMdDialog(block.id)">
              <p class="ce-block-summary">{{ block.summary || block.content?.slice(0, 60) || '—' }}</p>
            </div>
          </template>

          <!-- Resize handles -->
          <div class="ce-resize ce-resize--top" @pointerdown.stop="onResizePointerDown($event, block, 'top')" />
          <div class="ce-resize ce-resize--left" @pointerdown.stop="onResizePointerDown($event, block, 'left')" />
          <div class="ce-resize ce-resize--bottom" @pointerdown.stop="onResizePointerDown($event, block, 'bottom')" />
          <div class="ce-resize ce-resize--br" @pointerdown.stop="onResizePointerDown($event, block, 'br')" />
          <div class="ce-resize ce-resize--right" @pointerdown.stop="onResizePointerDown($event, block, 'right')" />
        </div>
      </div>
    </div>

    <!-- Summary document (compact mode) -->
    <div v-else class="ce-summary-doc-wrap">
      <article class="ce-summary-doc">
        <header class="ce-summary-doc-header">
          <h1 class="ce-summary-doc-title">{{ node.name }}</h1>
          <span class="ce-summary-doc-type">{{ typeLabels[node.type] || node.type }}</span>
        </header>

        <section class="ce-summary-doc-section">
          <h2 class="ce-summary-doc-h2">节点摘要</h2>
          <div v-if="hasNodeSummary" class="ce-md-content" v-html="nodeSummaryDocHtml"></div>
          <div v-else class="ce-summary-doc-warn">
            <div class="ce-summary-doc-warn-text">
              <span class="ce-summary-doc-warn-icon">!</span>
              <span>节点尚未生成摘要，建议先生成节点摘要以获得完整概览</span>
            </div>
            <button class="ce-summary-doc-warn-btn" @click="openNodeSummaryDialog">生成节点摘要</button>
          </div>
        </section>

        <section v-if="summaryDocBlocks.length" class="ce-summary-doc-section">
          <h2 class="ce-summary-doc-h2">块内容（{{ summaryDocBlocks.length }}）</h2>
          <article
            v-for="block in summaryDocBlocks"
            :key="block.id"
            class="ce-summary-block"
          >
            <header class="ce-summary-block-header">
              <span class="ce-summary-block-accent" :style="{ background: blockTypeAccents[block.type] || '#1d1d1f' }"></span>
              <h3 class="ce-summary-block-name">{{ block.name || '未命名' }}</h3>
              <span class="ce-summary-block-type" :style="{ color: blockTypeAccents[block.type] || '#1d1d1f' }">
                {{ blockTypeLabels[block.type] || block.type }}
              </span>
            </header>
            <div v-if="block.summary && block.summary.trim()" class="ce-summary-block-summary">
              <div class="ce-summary-block-label">摘要</div>
              <div class="ce-md-content" v-html="renderMd(block.summary)"></div>
            </div>
            <div v-else class="ce-summary-block-summary ce-summary-block-summary--empty">
              <div class="ce-summary-block-label">摘要</div>
              <p class="ce-summary-doc-empty">尚未生成块摘要</p>
            </div>
            <div v-if="block.content && block.content.trim()" class="ce-summary-block-content">
              <div class="ce-summary-block-label">内容</div>
              <div class="ce-md-content" v-html="renderMd(block.content)"></div>
            </div>
            <div v-else class="ce-summary-block-content ce-summary-block-content--empty">
              <div class="ce-summary-block-label">内容</div>
              <p class="ce-summary-doc-empty">无内容</p>
            </div>
          </article>
        </section>
        <p v-else class="ce-summary-doc-empty ce-summary-doc-empty--center">该节点暂无块</p>
      </article>
    </div>

    <!-- Edit Dialog (centered modal) -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div v-if="panelBlockId && panelBlock" class="ce-edit-overlay" @click.self="panelBlockId = null">
          <div class="ce-edit-dialog" role="dialog" aria-modal="true">
            <!-- Dialog header -->
            <div class="ce-edit-dialog-header">
              <div class="ce-edit-dialog-title-row">
                <span class="ce-edit-dialog-accent" :style="{ background: blockTypeAccents[panelDraft.type] || '#1d1d1f' }"></span>
                <h2 class="ce-edit-dialog-title">编辑 {{ panelDraft.name || '未命名' }}</h2>
              </div>
              <button class="ce-edit-dialog-close" @click="panelBlockId = null" aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <!-- Dialog body -->
            <div class="ce-edit-dialog-body">
              <!-- Name + Type row -->
              <div class="ce-edit-row">
                <div class="ce-edit-field ce-edit-field--grow">
                  <label class="ce-edit-label">名称</label>
                  <input class="ce-edit-input" v-model="panelDraft.name" placeholder="未命名" />
                </div>
                <div class="ce-edit-field ce-edit-field--type">
                  <label class="ce-edit-label">类型</label>
                  <CustomSelect
                    v-model="panelDraft.type"
                    :options="blockTypes.map(bt => ({ value: bt.value, label: bt.label, color: blockTypeAccents[bt.value] }))"
                  />
                </div>
              </div>

              <!-- Block summary section -->
              <div class="ce-edit-field">
                <div class="ce-edit-summary-wrap">
                  <div class="ce-edit-split-label-row">
                    <span>摘要</span>
                    <div class="ce-ai-toolbar">
                      <button
                        class="ce-ai-btn ce-ai-btn--text"
                        @click="summaryViewMode = summaryViewMode === 'edit' ? 'preview' : 'edit'"
                        :title="summaryViewMode === 'edit' ? '切换到预览' : '切换到编辑'"
                      >{{ summaryViewMode === 'edit' ? '预览' : '编辑' }}</button>
                    </div>
                  </div>
                  <div class="ce-edit-summary-area">
                    <div v-show="summaryViewMode === 'edit'" ref="summaryMonacoContainer" class="ce-edit-summary-monaco"></div>
                    <div v-show="summaryViewMode === 'preview'" class="ce-edit-summary-preview">
                      <div v-if="summaryMdHtml" class="ce-md-content" v-html="summaryMdHtml"></div>
                      <div v-else class="ce-edit-preview-empty">暂无摘要…</div>
                    </div>
                  </div>
                  <p v-if="!panelDraft.summary?.trim()" class="ce-edit-summary-hint">
                    摘要为空时，保存后将自动生成摘要
                  </p>
                </div>
              </div>

              <!-- Knowledge description: split Monaco editor / preview -->
              <div class="ce-edit-field ce-edit-field--expand">
                <label class="ce-edit-label">知识描述</label>
                <div class="ce-edit-split">
                  <div class="ce-edit-split-pane ce-edit-split-pane--editor">
                    <div class="ce-edit-split-label-row">
                      <span>编辑 · Markdown</span>
                      <div class="ce-ai-toolbar">
                        <button
                          v-if="polishOriginal !== null && polishState !== 'streaming'"
                          class="ce-ai-btn ce-ai-btn--text"
                          @click="showCompareDialog = true"
                          title="对比原文与 AI 优化版本"
                        >对比</button>
                        <button
                          v-if="polishOriginal !== null && polishState !== 'streaming'"
                          class="ce-ai-btn ce-ai-btn--text"
                          @click="restoreOriginal"
                          title="还原为原始内容"
                        >还原</button>
                        <button
                          class="ce-ai-btn ce-ai-btn--icon"
                          :class="{ 'is-streaming': polishState === 'streaming' }"
                          @click="polishWithAI"
                          title="AI 优化 Markdown"
                        >
                          <img src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/ai_full_light.svg" class="ce-ai-icon" alt="AI" />
                        </button>
                      </div>
                    </div>
                    <div ref="mdMonacoContainer" class="ce-edit-monaco"></div>
                  </div>
                  <div class="ce-edit-split-divider"></div>
                  <div class="ce-edit-split-pane ce-edit-split-pane--preview">
                    <div class="ce-edit-split-label">预览</div>
                    <div class="ce-edit-md-preview" @click="onMdLinkClick">
                      <div v-if="panelMdHtml" class="ce-md-content" v-html="panelMdHtml"></div>
                      <div v-else class="ce-edit-preview-empty">在左侧输入内容…</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- References removed — use block content to describe relationships -->

              <!-- Images -->
              <div class="ce-edit-section">
                <div class="ce-edit-section-header">
                  <span class="ce-edit-label">参考图片</span>
                  <button class="ce-edit-add-btn" @click="addDraftImage">+ 添加</button>
                </div>
                <div v-if="panelDraft.images.length === 0" class="ce-edit-empty">暂无图片</div>
                <div v-for="(img, i) in panelDraft.images" :key="img.id" class="ce-edit-img-card">
                  <img v-if="img.url" :src="img.url" class="ce-edit-img-thumb" />
                  <div class="ce-edit-img-info">
                    <span class="ce-edit-img-name">{{ img.name || '未命名' }}</span>
                    <button class="ce-edit-ref-delete" @click="removeDraftImage(i)">×</button>
                  </div>
                </div>
              </div>
            </div>
            <!-- Dialog footer -->
            <div class="ce-edit-dialog-footer">
              <button class="ce-edit-footer-close" @click="panelBlockId = null">关闭</button>
              <button class="ce-edit-footer-save" @click="savePanelDraft">保存</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- Markdown preview dialog -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div v-if="mdDialogBlock" class="ce-md-overlay" @click.self="closeMdDialog" @keydown.esc="closeMdDialog">
          <div class="ce-md-dialog" role="dialog" aria-modal="true">
            <div class="ce-md-dialog-header">
              <div class="ce-md-dialog-title-row">
                <span class="ce-md-dialog-accent" :style="{ background: blockTypeAccents[mdDialogBlock.type] || '#1d1d1f' }"></span>
                <h2 class="ce-md-dialog-title">{{ mdDialogBlock.name || '未命名' }}</h2>
                <span class="ce-md-dialog-type">{{ blockTypeLabels[mdDialogBlock.type] || mdDialogBlock.type }}</span>
              </div>
              <button class="ce-md-dialog-close" @click="closeMdDialog" aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="ce-md-dialog-body" @click="onMdLinkClick">
              <template v-if="mdDialogBlock?.summary">
                <div class="ce-md-summary-block">
                  <span class="ce-md-summary-label">摘要</span>
                  <div class="ce-md-content" v-html="mdDialogSummaryHtml"></div>
                </div>
                <div class="ce-md-divider"></div>
              </template>
              <div v-if="mdDialogHtml" class="ce-md-content" v-html="mdDialogHtml"></div>
              <div v-else class="ce-md-empty">暂无内容</div>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- AI Compare dialog -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div v-if="showCompareDialog" class="ce-compare-overlay" @click.self="showCompareDialog = false" @keydown.esc="showCompareDialog = false">
          <div class="ce-compare-dialog" role="dialog" aria-modal="true">
            <div class="ce-compare-header">
              <h2 class="ce-compare-title">对比：原始内容 vs AI 优化</h2>
              <button class="ce-md-dialog-close" @click="showCompareDialog = false" aria-label="关闭">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                </svg>
              </button>
            </div>
            <div class="ce-compare-body">
              <div class="ce-compare-pane">
                <div class="ce-compare-pane-label">原始内容</div>
                <div class="ce-compare-pane-content ce-md-content" v-html="compareOriginalHtml"></div>
              </div>
              <div class="ce-compare-divider"></div>
              <div class="ce-compare-pane">
                <div class="ce-compare-pane-label">AI 优化</div>
                <div class="ce-compare-pane-content ce-md-content" v-html="compareAiHtml"></div>
              </div>
            </div>
            <div class="ce-compare-footer">
              <button class="ce-edit-footer-close" @click="showCompareDialog = false">关闭</button>
              <button class="ce-edit-footer-close" @click="restoreOriginal(); showCompareDialog = false">还原原始内容</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
    <!-- Node summary dialog -->
    <Teleport to="body">
      <Transition name="ce-dialog-fade">
        <div
          v-if="showNodeSummaryDialog"
          class="ce-md-dialog-overlay"
          @click.self="showNodeSummaryDialog = false"
          @keydown.esc="showNodeSummaryDialog = false"
        >
          <div class="ce-md-dialog" role="dialog" aria-modal="true" style="max-width:760px;">
            <div class="ce-md-dialog-header">
              <h2 class="ce-md-dialog-title">
                节点摘要 · {{ node.name }}
                <span v-if="hasNodeSummary && nodeStale" class="ce-stale-badge">陈旧</span>
                <span v-else-if="!hasNodeSummary" class="ce-stale-badge ce-stale-badge--empty">未生成</span>
              </h2>
              <div style="display:flex;gap:6px;align-items:center;">
                <button class="ce-mode-btn" :class="{ 'ce-mode-btn--active': nodeSummaryViewMode === 'edit' }" @click="nodeSummaryViewMode = 'edit'">编辑</button>
                <button class="ce-mode-btn" :class="{ 'ce-mode-btn--active': nodeSummaryViewMode === 'preview' }" @click="nodeSummaryViewMode = 'preview'">预览</button>
                <button class="ce-md-dialog-close" @click="showNodeSummaryDialog = false" aria-label="关闭">
                  <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                    <path d="M1 1l12 12M13 1L1 13" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/>
                  </svg>
                </button>
              </div>
            </div>
            <div class="ce-md-dialog-body" style="padding:0;">
              <textarea
                v-if="nodeSummaryViewMode === 'edit'"
                class="ce-block-textarea"
                style="width:100%; min-height:320px; padding:16px; border:none; outline:none; resize:vertical; font-family:inherit; font-size:13px; line-height:1.6;"
                v-model="nodeSummaryDraft"
                :readonly="nodeSummaryState === 'streaming'"
                placeholder="点击下方“生成摘要”由 AI 自动生成；或手工输入。"
              />
              <div v-else class="ce-md-content" style="padding:16px;" v-html="nodeSummaryHtml"></div>
            </div>
            <div class="ce-compare-footer">
              <button
                class="ce-edit-footer-close"
                @click="generateNodeSummary"
                :disabled="nodeSummaryState === 'streaming'"
              >
                {{ nodeSummaryState === 'streaming' ? '生成中…' : (hasNodeSummary ? '重新生成' : '生成摘要') }}
              </button>
              <button class="ce-edit-footer-close" @click="showNodeSummaryDialog = false">关闭</button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script lang="ts" setup>
import { ref, reactive, computed, watch, onBeforeUnmount, nextTick } from 'vue'
import { marked } from 'marked'
import type { KBNode } from '@/types/knowledge'
import { generateBlockSummaryHttp } from '../api'
import {
  type KBBlock,
  type KBBlockType,
  type KBBlockImage,
  type KBNodeContentV1,
  SCHEMA_VERSION,
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
  (e: 'dirty-changed', dirty: boolean): void
  (e: 'summary-updated'): void
  (e: 'refresh'): void
}>()

// ─── Constants ───

const SNAP_THRESHOLD = 8
const SNAP_GAP = 4
const GRID_SIZE = 20
const MIN_W = 120
const MIN_H = 80
const CANVAS_PADDING = 200
const CANVAS_INSET = GRID_SIZE  // one grid cell margin on left/top/right

function snapToGrid(v: number): number {
  return Math.round(v / GRID_SIZE) * GRID_SIZE
}

const typeLabels: Record<string, string> = {
  directory: '知识', page: '页面', component: '组件', standalone: '独立', module: '模块', shared: '共享资产',
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

const blockTypeLabels: Record<string, string> = {
  region: '区域', button: '按钮', field: '字段', form: '表单',
  list: '列表', text: '文本', custom: '自定义',
}

const blockTypeAccents: Record<string, string> = {
  region:  '#0071e3',
  button:  '#bf5af2',
  field:   '#34c759',
  form:    '#ff9f0a',
  list:    '#5ac8fa',
  text:    '#8e8e93',
  custom:  '#ff453a',
}

// ─── State ───

const containerRef = ref<HTMLElement | null>(null)
const canvasWrapRef = ref<HTMLElement | null>(null)
const contentTextareaRef = ref<HTMLTextAreaElement | null>(null)
const mdMonacoContainer = ref<HTMLElement | null>(null)

let mdMonacoInstance: any = null
let mdMonacoModel: any = null
let mdMonacoSyncing = false

const content = reactive<KBNodeContentV1>(createEmptyContent())
const displayMode = ref<'full' | 'compact'>('full')

const selectedBlockId = ref<string | null>(null)
const editingBlockId = ref<string | null>(null)
const editField = ref<'name' | 'content' | null>(null)
const panelBlockId = ref<string | null>(null)
const mdDialogBlockId = ref<string | null>(null)

// Draft state for the edit dialog (decoupled from the actual block)
const panelDraft = reactive<{
  name: string; type: KBBlockType; content: string
  images: KBBlockImage[]; summary: string
}>({ name: '', type: 'region', content: '', images: [], summary: '' })

// AI polish state
const polishState = ref<'idle' | 'streaming' | 'done'>('idle')
const polishOriginal = ref<string | null>(null)
const showCompareDialog = ref(false)

// Summary section state
const summaryViewMode = ref<'edit' | 'preview'>('edit')
const summaryState = ref<'idle' | 'streaming'>('idle')
const summaryMonacoContainer = ref<HTMLElement | null>(null)
let summaryMonacoInstance: any = null
let summaryMonacoModel: any = null
let summaryMonacoSyncing = false

// ─── Node summary state ───
const showNodeSummaryDialog = ref(false)
const nodeSummaryDraft = ref('')
const nodeSummaryState = ref<'idle' | 'streaming'>('idle')
const nodeSummaryViewMode = ref<'edit' | 'preview'>('edit')

const nodeSummaryHtml = computed(() => marked.parse(nodeSummaryDraft.value || '') as string)

// ─── Staleness detection ───
// Block stale = sha256(block.content) !== block.summary_content_hash (when summary exists)
const staleBlockIds = ref<Set<string>>(new Set())

async function sha256Hex(text: string): Promise<string> {
  const buf = new TextEncoder().encode(text || '')
  const hash = await crypto.subtle.digest('SHA-256', buf)
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('')
}

let staleRecomputeToken = 0
async function recomputeBlockStale() {
  const token = ++staleRecomputeToken
  const next = new Set<string>()
  for (const b of content.blocks) {
    if (!b.summary || !b.summary_content_hash) continue
    const h = await sha256Hex(b.content || '')
    if (h !== b.summary_content_hash) next.add(b.id)
  }
  if (token === staleRecomputeToken) staleBlockIds.value = next
}

watch(
  () => content.blocks.map(b => `${b.id}:${(b.content || '').length}:${b.summary_content_hash || ''}:${b.summary || ''}`).join('|'),
  () => recomputeBlockStale(),
  { immediate: true },
)

// Node stale = max(child blocks.summary_updated_at) > node.summary_updated_at
const nodeStale = computed(() => {
  const updates = content.blocks
    .map(b => b.summary_updated_at)
    .filter(Boolean) as string[]
  if (!updates.length) return false
  const maxBlock = updates.sort().slice(-1)[0]
  const nodeAt = props.node?.summary_updated_at
  if (!nodeAt) return true
  return maxBlock > nodeAt
})

const hasNodeSummary = computed(() => !!(props.node?.summary && props.node.summary.trim()))

const summaryMdHtml = computed(() => marked.parse(panelDraft.summary || '') as string)

const nodeSummaryDocHtml = computed(() => marked.parse(props.node?.summary || '') as string)

const summaryDocBlocks = computed(() => {
  return [...content.blocks].sort((a, b) => {
    const ay = a.layout?.y ?? 0
    const by = b.layout?.y ?? 0
    if (ay !== by) return ay - by
    const ax = a.layout?.x ?? 0
    const bx = b.layout?.x ?? 0
    return ax - bx
  })
})

function renderMd(src: string): string {
  return marked.parse(src || '') as string
}

const compareOriginalHtml = computed(() =>
  polishOriginal.value ? marked.parse(polishOriginal.value) as string : ''
)
const compareAiHtml = computed(() =>
  polishState.value !== 'idle' ? marked.parse(panelDraft.content || '') as string : ''
)

const isDragging = ref(false)
const isResizing = ref(false)
const saving = ref(false)
const saveStatusText = ref('')
const isDirty = ref(false)
const transitioningBlockId = ref<string | null>(null)
const preExpandLayouts = new Map<string, { x: number; w: number }>()

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

const panelMdHtml = computed(() => {
  return marked.parse(panelDraft.content || '') as string
})

const mdDialogBlock = computed(() => {
  if (!mdDialogBlockId.value) return null
  return content.blocks.find(b => b.id === mdDialogBlockId.value) || null
})

const mdDialogHtml = computed(() => {
  const c = mdDialogBlock.value?.content
  if (!c) return ''
  return marked.parse(c) as string
})

const mdDialogSummaryHtml = computed(() => {
  const s = mdDialogBlock.value?.summary
  if (!s) return ''
  return marked.parse(s) as string
})

function onMdLinkClick(e: MouseEvent) {
  const target = e.target as HTMLElement
  const anchor = target.closest('a') as HTMLAnchorElement | null
  if (!anchor) return
  const href = anchor.getAttribute('href')
  if (!href) return
  e.preventDefault()
  e.stopPropagation()
  window.electronAPI.openExternal(href)
}

// ─── Sync from prop ───

watch(() => props.node, (n) => {
  const parsed = n?.content ? migrateLegacyContent(n.content) : createEmptyContent()
  content.schema_version = parsed.schema_version ?? SCHEMA_VERSION
  content.blocks = Array.isArray(parsed.blocks) ? parsed.blocks : []
  content.canvas = parsed.canvas || { zoom: 1, panX: 0, panY: 0 }
  selectedBlockId.value = null
  editingBlockId.value = null
  panelBlockId.value = null
  isDirty.value = false
  nodeSummaryDraft.value = n?.summary || ''
  nodeSummaryState.value = 'idle'
  showNodeSummaryDialog.value = false
}, { immediate: true })

// ─── Save ───

function markDirty() {
  if (!isDirty.value) {
    isDirty.value = true
    emit('dirty-changed', true)
  }
}

async function save() {
  saving.value = true
  content.canvas = { zoom: 1, panX: 0, panY: 0 }

  // 1) Identify blocks that need summary auto-generation:
  //    content non-empty AND (summary empty OR content hash ≠ stored hash)
  const needSummary: { id: string; contentHash: string }[] = []
  for (const b of content.blocks) {
    const c = (b.content || '').trim()
    if (!c) continue
    const h = await sha256Hex(b.content || '')
    const hasSummary = !!(b.summary && b.summary.trim())
    if (!hasSummary || h !== (b.summary_content_hash || '')) {
      needSummary.push({ id: b.id, contentHash: h })
    }
  }

  // 2) Persist canvas content first (so new blocks exist server-side with their IDs).
  saveStatusText.value = '保存中…'
  emit('save', JSON.parse(JSON.stringify(content)))
  await new Promise(r => setTimeout(r, 200))

  // 3) For each block needing summary, call HTTP endpoint serially.
  if (needSummary.length && props.node?.id && props.kbId) {
    for (let i = 0; i < needSummary.length; i++) {
      const { id, contentHash } = needSummary[i]
      saveStatusText.value = `生成摘要 ${i + 1}/${needSummary.length}`
      try {
        const res = await generateBlockSummaryHttp(props.kbId, props.node.id, id)
        const block = content.blocks.find(b => b.id === id)
        if (block) {
          block.summary = res.summary
          block.summary_content_hash = contentHash
          block.summary_updated_at = new Date().toISOString()
        }
      } catch (e: any) {
        console.error('[block summary auto-gen failed]', id, e)
      }
    }
    // Refresh tree so parents see fresh block summaries.
    emit('refresh')
  }

  saveStatusText.value = ''
  saving.value = false
  isDirty.value = false
  emit('dirty-changed', false)
  window.$toast({ title: '保存成功', type: 'success' })
}

function onRefresh() {
  if (isDirty.value) {
    const ok = confirm('当前有未保存的修改，刷新将丢失这些修改。是否继续？')
    if (!ok) return
  }
  emit('refresh')
}

defineExpose({ save })

// ─── Markdown dialog ───

function openMdDialog(id: string) {
  mdDialogBlockId.value = id
}

function closeMdDialog() {
  mdDialogBlockId.value = null
}

// ─── AI Markdown Polish ───

async function polishWithAI() {
  if (polishState.value === 'streaming') {
    window.$toast({ title: 'AI 正在生成中，请稍候', type: 'info' })
    return
  }
  const textContent = panelDraft.content.trim()
  if (!textContent) {
    window.$toast({ title: '请先编写内容', type: 'info' })
    return
  }
  // Save original before overwriting
  polishOriginal.value = panelDraft.content
  polishState.value = 'streaming'
  // Disable Monaco during streaming
  if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: true })
  // Clear current content
  panelDraft.content = ''

  let unsubscribe: (() => void) | null = null
  try {
    unsubscribe = (window as any).electronAPI.harness.onPolishStream((data: any) => {
      if (data.type === 'chunk') {
        panelDraft.content += data.content
      } else if (data.type === 'done') {
        polishState.value = 'done'
        if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: false })
        unsubscribe && unsubscribe()
      } else if (data.type === 'error') {
        window.$toast({ title: data.error || 'AI 优化失败', type: 'error' })
        panelDraft.content = polishOriginal.value || ''
        polishOriginal.value = null
        polishState.value = 'idle'
        if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: false })
        unsubscribe && unsubscribe()
      }
    })
    await (window as any).electronAPI.harness.polishMarkdown({ content: textContent })
  } catch (e: any) {
    window.$toast({ title: 'AI 优化失败', type: 'error' })
    panelDraft.content = polishOriginal.value || ''
    polishOriginal.value = null
    polishState.value = 'idle'
    if (mdMonacoInstance) mdMonacoInstance.updateOptions({ readOnly: false })
    unsubscribe && unsubscribe()
  }
}

function restoreOriginal() {
  if (polishOriginal.value === null) return
  panelDraft.content = polishOriginal.value
  polishOriginal.value = null
  polishState.value = 'idle'
  showCompareDialog.value = false
}

// ─── Block CRUD ───

function addBlock() {
  const wrap = canvasWrapRef.value
  const scrollX = wrap ? wrap.scrollLeft : 0
  const scrollY = wrap ? wrap.scrollTop : 0
  const maxY = content.blocks.reduce((max, b) => Math.max(max, b.layout.y + b.layout.h), 0)
  const block = createBlock('新块', 'region', snapToGrid(scrollX + CANVAS_INSET), snapToGrid(Math.max(maxY + CANVAS_INSET, scrollY + CANVAS_INSET)))
  // Prevent overlap on creation
  while (content.blocks.some(b => rectsOverlap(block.layout, b.layout, 0))) {
    block.layout.y += GRID_SIZE
  }
  content.blocks.push(block)
  selectedBlockId.value = block.id
  markDirty()
}

function deleteBlock(id: string) {
  const idx = content.blocks.findIndex(b => b.id === id)
  if (idx >= 0) {
    content.blocks.splice(idx, 1)
    if (selectedBlockId.value === id) selectedBlockId.value = null
    if (editingBlockId.value === id) editingBlockId.value = null
    if (panelBlockId.value === id) panelBlockId.value = null
    markDirty()
  }
}

function onBlockTypeChange(block: KBBlock, value: string) {
  block.type = value as KBBlockType
  markDirty()
}

function openPanel(blockId: string) {
  panelBlockId.value = panelBlockId.value === blockId ? null : blockId
}

async function savePanelDraft() {
  const block = content.blocks.find(b => b.id === panelBlockId.value)
  if (!block) return
  block.name = panelDraft.name
  block.type = panelDraft.type
  block.content = panelDraft.content
  block.summary = panelDraft.summary
  block.images = JSON.parse(JSON.stringify(panelDraft.images))
  panelBlockId.value = null
  isDirty.value = true
  emit('dirty-changed', true)
  recomputeBlockStale()
}

function addDraftImage() {
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = () => {
    const file = input.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      panelDraft.images.push({ id: crypto.randomUUID(), url: reader.result as string, name: file.name })
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
function removeDraftImage(index: number) { panelDraft.images.splice(index, 1) }

function selectBlock(id: string) {
  selectedBlockId.value = id
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
  markDirty()
}

// ─── Monaco editor for panel ───

async function initPanelMonaco() {
  if (!mdMonacoContainer.value) return
  const m = await import('monaco-editor/esm/vs/editor/editor.main')
  await import('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution')

  // Define a clean light theme once
  m.editor.defineTheme('ce-light', {
    base: 'vs',
    inherit: true,
    rules: [
      { token: 'keyword.md', foreground: '0071e3' },
      { token: 'string.link.md', foreground: '0071e3' },
      { token: 'comment.md', foreground: '8e8e93' },
      { token: 'strong.md', foreground: '1d1d1f', fontStyle: 'bold' },
      { token: 'emphasis.md', foreground: '1d1d1f', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1d1d1f',
      'editor.lineHighlightBackground': '#f5f5f700',
      'editor.selectionBackground': '#0071e330',
      'editorLineNumber.foreground': '#c7c7cc',
      'editorLineNumber.activeForeground': '#8e8e93',
      'editorCursor.foreground': '#1d1d1f',
      'editor.inactiveSelectionBackground': '#0071e318',
      'editorIndentGuide.background': '#f2f2f7',
      'editorGutter.background': '#f8f8f8',
      'scrollbarSlider.background': '#00000012',
      'scrollbarSlider.hoverBackground': '#00000020',
    },
  })

  mdMonacoModel = m.editor.createModel(panelDraft.content || '', 'markdown')
  mdMonacoInstance = m.editor.create(mdMonacoContainer.value, {
    model: mdMonacoModel,
    theme: 'ce-light',
    automaticLayout: true,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
    fontLigatures: false,
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 0,
    renderLineHighlight: 'none',
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    padding: { top: 12, bottom: 12 },
    suggest: { showWords: false },
    quickSuggestions: false,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'none',
    renderValidationDecorations: 'off',
    bracketPairColorization: { enabled: false },
  })

  mdMonacoInstance.onDidChangeModelContent(() => {
    if (mdMonacoSyncing) return
    const val = mdMonacoInstance.getValue()
    if (panelDraft.content !== val) {
      panelDraft.content = val
      // Draft changes don't mark canvas dirty
    }
  })
}

function disposePanelMonaco() {
  if (mdMonacoInstance) { mdMonacoInstance.dispose(); mdMonacoInstance = null }
  if (mdMonacoModel) { mdMonacoModel.dispose(); mdMonacoModel = null }
}

// ─── Monaco editor for summary ───

async function initSummaryMonaco() {
  if (!summaryMonacoContainer.value) return
  const m = await import('monaco-editor/esm/vs/editor/editor.main')
  await import('monaco-editor/esm/vs/basic-languages/markdown/markdown.contribution')

  // Re-use the same ce-light theme (defineTheme is idempotent)
  m.editor.defineTheme('ce-light', {
    base: 'vs', inherit: true,
    rules: [
      { token: 'keyword.md', foreground: '0071e3' },
      { token: 'string.link.md', foreground: '0071e3' },
      { token: 'comment.md', foreground: '8e8e93' },
      { token: 'strong.md', foreground: '1d1d1f', fontStyle: 'bold' },
      { token: 'emphasis.md', foreground: '1d1d1f', fontStyle: 'italic' },
    ],
    colors: {
      'editor.background': '#ffffff',
      'editor.foreground': '#1d1d1f',
      'editor.lineHighlightBackground': '#f5f5f700',
      'editor.selectionBackground': '#0071e330',
      'editorLineNumber.foreground': '#c7c7cc',
      'editorLineNumber.activeForeground': '#8e8e93',
      'editorCursor.foreground': '#1d1d1f',
      'editor.inactiveSelectionBackground': '#0071e318',
      'editorIndentGuide.background': '#f2f2f7',
      'editorGutter.background': '#f8f8f8',
      'scrollbarSlider.background': '#00000012',
      'scrollbarSlider.hoverBackground': '#00000020',
    },
  })

  summaryMonacoModel = m.editor.createModel(panelDraft.summary || '', 'markdown')
  summaryMonacoInstance = m.editor.create(summaryMonacoContainer.value, {
    model: summaryMonacoModel,
    theme: 'ce-light',
    automaticLayout: true,
    fontSize: 13,
    lineHeight: 21,
    fontFamily: "'SF Mono', 'JetBrains Mono', Menlo, Consolas, monospace",
    fontLigatures: false,
    wordWrap: 'on',
    minimap: { enabled: false },
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    lineNumbers: 'on',
    glyphMargin: false,
    folding: false,
    lineDecorationsWidth: 4,
    renderLineHighlight: 'none',
    overviewRulerBorder: false,
    overviewRulerLanes: 0,
    hideCursorInOverviewRuler: true,
    scrollbar: { verticalScrollbarSize: 6, horizontalScrollbarSize: 6 },
    padding: { top: 10, bottom: 10 },
    suggest: { showWords: false },
    quickSuggestions: false,
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    renderWhitespace: 'none',
    renderValidationDecorations: 'off',
    bracketPairColorization: { enabled: false },
  })

  summaryMonacoInstance.onDidChangeModelContent(() => {
    if (summaryMonacoSyncing) return
    const val = summaryMonacoInstance.getValue()
    if (panelDraft.summary !== val) panelDraft.summary = val
  })
}

function disposeSummaryMonaco() {
  if (summaryMonacoInstance) { summaryMonacoInstance.dispose(); summaryMonacoInstance = null }
  if (summaryMonacoModel) { summaryMonacoModel.dispose(); summaryMonacoModel = null }
}

// ─── Generate block summary ───

async function generateBlockSummary() {
  if (summaryState.value === 'streaming') {
    window.$toast({ title: 'AI 正在生成摘要，请稍候', type: 'info' })
    return
  }
  const block = content.blocks.find(b => b.id === panelBlockId.value)
  if (!block || !props.node) {
    window.$toast({ title: '无法确定块信息', type: 'error' })
    return
  }
  const kbId = props.node.kb_id
  if (!kbId) {
    window.$toast({ title: '未找到知识库 ID', type: 'error' })
    return
  }

  summaryState.value = 'streaming'
  if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: true })
  panelDraft.summary = ''

  let unsubscribe: (() => void) | null = null
  try {
    unsubscribe = (window as any).electronAPI.harness.onBlockSummaryStream((data: any) => {
      if (data.type === 'chunk') {
        panelDraft.summary += data.content
      } else if (data.type === 'done') {
        summaryState.value = 'idle'
        if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: false })
        unsubscribe?.()
      } else if (data.type === 'error') {
        window.$toast({ title: data.error || '摘要生成失败', type: 'error' })
        summaryState.value = 'idle'
        if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: false })
        unsubscribe?.()
      }
    })
    await (window as any).electronAPI.harness.generateBlockSummary({
      kbId,
      nodeId: props.node.id,
      blockId: block.id,
      content: panelDraft.content,
    })
  } catch (e: any) {
    window.$toast({ title: '摘要生成失败', type: 'error' })
    summaryState.value = 'idle'
    if (summaryMonacoInstance) summaryMonacoInstance.updateOptions({ readOnly: false })
    unsubscribe?.()
  }
}

// ─── Generate node summary ───

function openNodeSummaryDialog() {
  nodeSummaryDraft.value = props.node?.summary || ''
  showNodeSummaryDialog.value = true
}

async function generateNodeSummary() {
  if (nodeSummaryState.value === 'streaming') {
    window.$toast({ title: 'AI 正在生成节点摘要，请稍候', type: 'info' })
    return
  }
  if (!props.node || !props.kbId) return

  nodeSummaryState.value = 'streaming'
  nodeSummaryDraft.value = ''

  let unsubscribe: (() => void) | null = null
  try {
    unsubscribe = (window as any).electronAPI.harness.onNodeSummaryStream((data: any) => {
      if (data.type === 'chunk') {
        nodeSummaryDraft.value += data.content
      } else if (data.type === 'done') {
        nodeSummaryState.value = 'idle'
        unsubscribe?.()
        // Refresh parent so node.summary / summary_updated_at propagate.
        emit('summary-updated')
      } else if (data.type === 'error') {
        window.$toast({ title: data.error || '节点摘要生成失败', type: 'error' })
        nodeSummaryState.value = 'idle'
        unsubscribe?.()
      }
    })
    await (window as any).electronAPI.harness.generateNodeSummary({
      kbId: props.kbId,
      nodeId: props.node.id,
    })
  } catch (e: any) {
    window.$toast({ title: '节点摘要生成失败', type: 'error' })
    nodeSummaryState.value = 'idle'
    unsubscribe?.()
  }
}

// Watch panelBlockId to open/close Monaco and populate draft
watch(panelBlockId, async (newId, oldId) => {
  if (oldId && !newId) {
    disposePanelMonaco()
    disposeSummaryMonaco()
    // Reset AI polish state when dialog closes
    polishOriginal.value = null
    polishState.value = 'idle'
    showCompareDialog.value = false
    summaryViewMode.value = 'edit'
    summaryState.value = 'idle'
    return
  }
  if (newId) {
    const block = content.blocks.find(b => b.id === newId)
    if (!block) return
    // Populate draft from block
    panelDraft.name = block.name
    panelDraft.type = block.type
    panelDraft.content = block.content || ''
    panelDraft.summary = block.summary || ''
    panelDraft.images = JSON.parse(JSON.stringify(block.images || []))
    disposePanelMonaco()
    disposeSummaryMonaco()
    await nextTick()
    await nextTick()
    await initPanelMonaco()
    await initSummaryMonaco()
  }
}, { flush: 'post' })

// Keep Monaco in sync when panelDraft.content changes externally
watch(() => panelDraft.content, (val) => {
  if (!mdMonacoInstance || val === undefined) return
  if (mdMonacoInstance.getValue() !== val) {
    mdMonacoSyncing = true
    mdMonacoInstance.setValue(val)
    mdMonacoSyncing = false
  }
})

// Keep summary Monaco in sync when panelDraft.summary changes externally (e.g. streaming)
watch(() => panelDraft.summary, (val) => {
  if (!summaryMonacoInstance || val === undefined) return
  if (summaryMonacoInstance.getValue() !== val) {
    summaryMonacoSyncing = true
    summaryMonacoInstance.setValue(val)
    summaryMonacoSyncing = false
  }
})

// ─── Overlap detection (enforces SNAP_GAP minimum distance) ───

interface Rect { x: number; y: number; w: number; h: number }

function rectsOverlap(a: Rect, b: Rect, gap: number): boolean {
  return a.x < b.x + b.w + gap && a.x + a.w + gap > b.x && a.y < b.y + b.h + gap && a.y + a.h + gap > b.y
}

function wouldOverlap(rect: Rect, excludeId: string): boolean {
  return content.blocks.some(b => b.id !== excludeId && rectsOverlap(rect, b.layout, 0))
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
        best = { value: edges[0] + (target - edge), guide: target }
      }
    }
  }
  return best
}

// Move snap: targets are gap-offset positions (my edge → maintain SNAP_GAP from neighbor)
function collectSnapTargetsX(excludeId: string): number[] {
  const targets = [CANVAS_INSET]
  for (const b of content.blocks) {
    if (b.id === excludeId) continue
    targets.push(b.layout.x - SNAP_GAP, b.layout.x + b.layout.w + SNAP_GAP)
  }
  return targets
}

function collectSnapTargetsY(excludeId: string): number[] {
  const targets = [CANVAS_INSET]
  for (const b of content.blocks) {
    if (b.id === excludeId) continue
    targets.push(b.layout.y - SNAP_GAP, b.layout.y + b.layout.h + SNAP_GAP)
  }
  return targets
}

// ─── Drag state ───

type ResizeEdge = 'left' | 'right' | 'bottom' | 'top' | 'br'

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

function onHeaderDblClick(block: KBBlock) {
  const wrap = canvasWrapRef.value
  if (!wrap) return
  const maxRight = wrap.clientWidth - CANVAS_INSET

  // Find the usable horizontal band for this block considering neighbors on the same row
  let bandLeft = CANVAS_INSET
  let bandRight = maxRight
  for (const b of content.blocks) {
    if (b.id === block.id) continue
    // Check vertical overlap (same row)
    if (b.layout.y < block.layout.y + block.layout.h && b.layout.y + b.layout.h > block.layout.y) {
      const bRight = b.layout.x + b.layout.w
      if (bRight <= block.layout.x) {
        // Block is to the left (touching or gap) — use its right edge as our left boundary
        bandLeft = Math.max(bandLeft, bRight)
      } else if (b.layout.x >= block.layout.x + block.layout.w) {
        // Block is to the right — use its left edge as our right boundary
        bandRight = Math.min(bandRight, b.layout.x)
      }
    }
  }

  // All block edges are grid-aligned; CANVAS_INSET is also GRID_SIZE.
  // No extra snapping needed — bandLeft is already a grid multiple, bandRight = maxRight exactly.

  const isAtMax = block.layout.x === bandLeft && block.layout.w === bandRight - bandLeft

  if (isAtMax && preExpandLayouts.has(block.id)) {
    const saved = preExpandLayouts.get(block.id)!
    preExpandLayouts.delete(block.id)
    transitioningBlockId.value = block.id
    block.layout.x = saved.x
    block.layout.w = saved.w
    markDirty()
    setTimeout(() => { transitioningBlockId.value = null }, 300)
  } else {
    const newW = bandRight - bandLeft
    if (newW >= MIN_W) {
      preExpandLayouts.set(block.id, { x: block.layout.x, w: block.layout.w })
      transitioningBlockId.value = block.id
      block.layout.x = bandLeft
      block.layout.w = newW
      markDirty()
      setTimeout(() => { transitioningBlockId.value = null }, 300)
    }
  }
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
  isResizing.value = true
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
    let newX = snapToGrid(Math.max(CANVAS_INSET, dragState.origX + dx))
    let newY = snapToGrid(Math.max(CANVAS_INSET, dragState.origY + dy))

    // Clamp right edge
    if (newX + block.layout.w > maxRight) newX = maxRight - block.layout.w
    newX = Math.max(CANVAS_INSET, newX)
    newY = Math.max(CANVAS_INSET, newY)

    // Free movement during drag — no overlap check here
    block.layout.x = newX
    block.layout.y = newY
    snapGuideX.value = null
    snapGuideY.value = null

  } else if (dragState.type === 'resize') {
    const edge = dragState.edge!
    let newX = dragState.origX
    let newY = dragState.origY
    let newW = dragState.origW
    let newH = dragState.origH
    const origRight = dragState.origX + dragState.origW
    const origBottom = dragState.origY + dragState.origH

    if (edge === 'left') {
      newX = snapToGrid(Math.max(CANVAS_INSET, dragState.origX + dx))
      newW = origRight - newX
      if (newW < MIN_W) { newW = MIN_W; newX = origRight - newW }
    } else if (edge === 'right') {
      const rawRight = snapToGrid(origRight + dx)
      newW = Math.max(MIN_W, rawRight - newX)
      if (newX + newW > maxRight) newW = maxRight - newX
    } else if (edge === 'top') {
      newY = snapToGrid(Math.max(CANVAS_INSET, dragState.origY + dy))
      newH = origBottom - newY
      if (newH < MIN_H) { newH = MIN_H; newY = origBottom - newH }
    } else if (edge === 'bottom') {
      const rawBottom = snapToGrid(origBottom + dy)
      newH = Math.max(MIN_H, rawBottom - newY)
    } else { // br
      const rawRight = snapToGrid(origRight + dx)
      const rawBottom = snapToGrid(origBottom + dy)
      newW = Math.max(MIN_W, rawRight - newX)
      newH = Math.max(MIN_H, rawBottom - newY)
      if (newX + newW > maxRight) newW = maxRight - newX
    }

    const candidate: Rect = { x: newX, y: newY, w: newW, h: newH }
    if (!wouldOverlap(candidate, block.id)) {
      block.layout.x = newX
      block.layout.y = newY
      block.layout.w = newW
      block.layout.h = newH
    }
    snapGuideX.value = null
    snapGuideY.value = null
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

  if (dragState && isDragging.value && dragState.type === 'move') {
    const block = content.blocks.find(b => b.id === dragState!.blockId)
    if (block) {
      const candidate: Rect = { x: block.layout.x, y: block.layout.y, w: block.layout.w, h: block.layout.h }
      if (wouldOverlap(candidate, block.id)) {
        // Bounce back to original position with transition
        transitioningBlockId.value = block.id
        block.layout.x = dragState.origX
        block.layout.y = dragState.origY
        setTimeout(() => { transitioningBlockId.value = null }, 320)
      } else {
        markDirty()
      }
    }
  } else if (dragState && isDragging.value) {
    markDirty()
  }

  dragState = null
  snapGuideX.value = null
  snapGuideY.value = null
  setTimeout(() => { isDragging.value = false; isResizing.value = false }, 50)
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

// ─── Images ───

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
      markDirty()
    }
    reader.readAsDataURL(file)
  }
  input.click()
}
function removeImage(block: KBBlock, index: number) { block.images.splice(index, 1); markDirty() }

// ─── Cleanup ───

function onKeyDown(e: KeyboardEvent) {
  if (e.key === 'Escape') {
    closeMdDialog()
    panelBlockId.value = null
  }
  if (e.key === 's' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault()
    save()
  }
}

onBeforeUnmount(() => {
  window.removeEventListener('pointermove', onPointerMove)
  window.removeEventListener('pointerup', onPointerUp)
  window.removeEventListener('keydown', onKeyDown)
  disposePanelMonaco()
  disposeSummaryMonaco()
  stopAutoScroll()
})

window.addEventListener('keydown', onKeyDown)
</script>

<style lang="scss" scoped>
$bg-page: #ffffff;
$bg-sidebar: #f5f5f7;
$bg-hover: #eaeaec;
$bg-block: #ffffff;
$bg-block-header: rgba(0, 0, 0, 0.025);
$text-primary: #1d1d1f;
$text-secondary: rgba(0, 0, 0, 0.52);
$text-tertiary: rgba(0, 0, 0, 0.32);
$border-color: rgba(0, 0, 0, 0.11);
$accent: #1d1d1f;
$block-shadow: none;
$block-shadow-selected: none;

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

.ce-dirty-dot {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #f5a623;
  flex-shrink: 0;
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.25);
}

.ce-stale-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: #f5a623;
  vertical-align: middle;
  box-shadow: 0 0 0 2px rgba(245, 166, 35, 0.2);
}

.ce-block-incomplete-tag {
  display: inline-block;
  margin-left: 6px;
  padding: 1px 6px;
  border-radius: 999px;
  background: rgba(255, 159, 10, 0.12);
  color: #b96a00;
  border: 1px solid rgba(255, 159, 10, 0.35);
  font-size: 10px;
  font-weight: 500;
  line-height: 1.3;
  vertical-align: middle;
}

.ce-edit-summary-hint {
  margin: 6px 0 0;
  font-size: 12px;
  color: #8a4a00;
  background: rgba(255, 159, 10, 0.08);
  border: 1px solid rgba(255, 159, 10, 0.22);
  border-radius: 6px;
  padding: 6px 10px;
  line-height: 1.4;
}

.ce-empty-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  margin-left: 6px;
  border-radius: 50%;
  background: #c7c7cc;
  vertical-align: middle;
}

.ce-stale-badge {
  display: inline-block;
  margin-left: 8px;
  padding: 1px 6px;
  font-size: 10px;
  line-height: 14px;
  font-weight: 500;
  color: #fff;
  background: #f5a623;
  border-radius: 4px;
  vertical-align: middle;

  &--empty {
    background: #c7c7cc;
  }
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
    border: 1px solid $border-color;
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
  background-color: #ffffff;
  background-image:
    linear-gradient(rgba(0, 0, 0, 0.05) 1px, transparent 1px),
    linear-gradient(90deg, rgba(0, 0, 0, 0.05) 1px, transparent 1px);
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
  box-sizing: border-box;
  background: $bg-block;
  border: 1px solid $border-color;
  border-top: 3px solid var(--block-accent, rgba(0, 0, 0, 0.15));
  border-radius: 0 0 8px 8px;
  cursor: default;
  display: flex;
  flex-direction: column;
  transition: border-color 0.12s;
  user-select: none;
  overflow: visible;

  &:hover:not(.ce-block--selected) {
    border-color: rgba(0, 0, 0, 0.22);
    border-top-color: var(--block-accent, rgba(0, 0, 0, 0.22));
  }

  &--selected {
    border-color: rgba(0, 0, 0, 0.38);
    border-top: 3px solid var(--block-accent, #1d1d1f);
  }

  &--editing {
    cursor: text;
  }

  &--transitioning {
    transition: left 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), top 0.3s cubic-bezier(0.34, 1.56, 0.64, 1), width 0.25s cubic-bezier(0.4, 0, 0.2, 1);
  }
}

// Edit button — inline in header, next to type select
.ce-block-edit-btn {
  width: 22px;
  height: 22px;
  border: 1px solid rgba(0, 0, 0, 0.06);
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
  padding: 6px 10px 5px;
  min-height: 22px;
  cursor: grab;
  background: $bg-block-header;
  border-bottom: 1px solid rgba(0, 0, 0, 0.06);

  &:active {
    cursor: grabbing;
  }
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
    cursor: pointer;
  }

  &--compact {
    padding: 0 10px 8px;
    cursor: pointer;
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

  &--top {
    left: 8px;
    right: 8px;
    top: 0;
    height: 5px;
    cursor: ns-resize;
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

// ─── Edit Dialog ───

.ce-edit-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.36);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.ce-edit-dialog {
  background: #fff;
  border-radius: 16px;
  width: calc(100vw - 80px);
  height: calc(100vh - 80px);
  display: flex;
  flex-direction: column;
  box-shadow: 0 32px 80px rgba(0, 0, 0, 0.2), 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.ce-edit-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid $border-color;
  flex-shrink: 0;
  gap: 12px;
}

.ce-edit-dialog-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
}

.ce-edit-dialog-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ce-edit-dialog-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.3px;
}

.ce-edit-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  &:hover { background: $bg-hover; color: $text-primary; }
}

.ce-edit-dialog-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 20px 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.ce-edit-row {
  display: flex;
  gap: 12px;
  align-items: flex-start;
}

.ce-edit-field {
  display: flex;
  flex-direction: column;
  gap: 5px;

  &--grow { flex: 1; min-width: 0; }
  &--type { flex-shrink: 0; width: 110px; }
  &--expand {
    height: 320px;
    display: flex;
    flex-direction: column;
    flex-shrink: 0;
  }
}

.ce-edit-label {
  font-size: 11px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.2px;
  text-transform: uppercase;
}

.ce-edit-input {
  width: 100%;
  padding: 8px 10px;
  border: 1px solid $border-color;
  border-radius: 8px;
  font-size: 13px;
  color: $text-primary;
  background: $bg-sidebar;
  outline: none;
  font-family: inherit;
  letter-spacing: -0.12px;
  box-sizing: border-box;
  transition: border-color 0.15s, background 0.15s;

  &:focus { border-color: rgba(0,0,0,0.3); background: #fff; }
  &--sm { padding: 6px 8px; font-size: 12px; }
}

// ─── Split editor / preview ───

.ce-edit-split {
  display: flex;
  gap: 0;
  flex: 1;
  min-height: 0;
  border: 1px solid $border-color;
  border-radius: 10px;
  overflow: hidden;
}

.ce-edit-split-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;

  &--editor { border-right: 1px solid $border-color; }
}

.ce-edit-split-label {
  font-size: 10px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 0 12px;
  border-bottom: 1px solid $border-color;
  background: $bg-sidebar;
  flex-shrink: 0;
  height: 30px;
  display: flex;
  align-items: center;
}

.ce-edit-split-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 6px 0 12px;
  border-bottom: 1px solid $border-color;
  background: $bg-sidebar;
  flex-shrink: 0;
  font-size: 10px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  height: 30px;
}

.ce-ai-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
}

.ce-ai-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: none;
  cursor: pointer;
  transition: all 0.15s;
  border-radius: 5px;
  background: transparent;

  &:disabled {
    opacity: 0.45;
    cursor: not-allowed;
  }

  &--text {
    font-size: 11px;
    font-weight: 500;
    color: $text-secondary;
    padding: 3px 8px;
    text-transform: none;
    letter-spacing: 0;
    height: 22px;
    background: transparent;

    &:hover:not(:disabled) {
      background: rgba(0,0,0,0.06);
      color: $text-primary;
    }
  }

  &--icon {
    width: 26px;
    height: 26px;
    padding: 3px;
    background: #000;
    border-radius: 6px;

    &:hover:not(:disabled) {
      background: #222;
      transform: scale(1.05);
    }

    &.is-streaming {
      animation: ce-ai-pulse 1.2s ease-in-out infinite;
    }
  }
}

.ce-ai-icon {
  width: 18px;
  height: 18px;
  display: block;
}

@keyframes ce-ai-pulse {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.5; }
}

/* ─── Compare Dialog ─── */

.ce-compare-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
}

.ce-compare-dialog {
  background: #fff;
  border-radius: 14px;
  box-shadow: 0 32px 80px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.1);
  width: calc(100vw - 80px);
  max-width: 1200px;
  height: calc(100vh - 120px);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ce-compare-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 18px 20px 14px;
  border-bottom: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.ce-compare-title {
  font-size: 15px;
  font-weight: 600;
  color: #1d1d1f;
  margin: 0;
}

.ce-compare-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

.ce-compare-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.ce-compare-pane-label {
  font-size: 10px;
  font-weight: 600;
  color: $text-tertiary;
  letter-spacing: 0.4px;
  text-transform: uppercase;
  padding: 8px 16px;
  border-bottom: 1px solid rgba(0,0,0,0.06);
  background: $bg-sidebar;
  flex-shrink: 0;
}

.ce-compare-pane-content {
  flex: 1;
  overflow-y: auto;
  padding: 16px;
}

.ce-compare-divider {
  width: 1px;
  background: rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.ce-compare-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 12px 20px;
  border-top: 1px solid rgba(0,0,0,0.08);
  flex-shrink: 0;
}

.ce-edit-monaco {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

// ─── Summary section ───

.ce-edit-summary-wrap {
  border: 1px solid $border-color;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  height: 100px;
  flex-shrink: 0;
}

.ce-edit-summary-area {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background: #fff;
}

.ce-edit-summary-monaco {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ce-edit-summary-preview {
  flex: 1;
  overflow-y: auto;
  padding: 8px 12px;
  background: #fff;
}

.ce-edit-md-preview {
  flex: 1;
  overflow-y: auto;
  padding: 12px 16px;
  background: #fff;
}

.ce-edit-preview-empty {
  font-size: 13px;
  color: $text-tertiary;
  font-style: italic;
}

// ─── Refs / Images sections ───

.ce-edit-section { display: flex; flex-direction: column; gap: 6px; }

.ce-edit-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ce-edit-add-btn {
  border: none;
  background: transparent;
  font-size: 12px;
  color: $text-secondary;
  cursor: pointer;
  padding: 0;
  letter-spacing: -0.12px;

  &:hover { color: $text-primary; }
}

.ce-edit-empty {
  font-size: 12px;
  color: $text-tertiary;
  padding: 4px 0;
}

.ce-edit-ref-delete {
  width: 22px;
  height: 22px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: $text-tertiary;
  font-size: 14px;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  margin-top: 1px;

  &:hover { background: rgba(255, 59, 48, 0.08); color: #ff3b30; }
}

.ce-edit-img-card {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border-radius: 8px;
  background: $bg-sidebar;
  border: 1px solid $border-color;
}

.ce-edit-img-thumb {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  object-fit: cover;
  flex-shrink: 0;
}

.ce-edit-img-info {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.ce-edit-img-name {
  font-size: 12px;
  color: $text-secondary;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

// ─── Edit Dialog Footer ───

.ce-edit-dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding: 14px 24px;
  border-top: 1px solid $border-color;
  flex-shrink: 0;
}

.ce-edit-footer-close {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: $bg-sidebar;
  color: $text-primary;
  font-size: 13px;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: $bg-hover; }
}

.ce-edit-footer-save {
  padding: 8px 16px;
  border: none;
  border-radius: 8px;
  background: #1d1d1f;
  color: #fff;
  font-size: 13px;
  font-weight: 500;
  font-family: inherit;
  cursor: pointer;
  transition: background 0.12s;
  &:hover { background: #333; }
  &:disabled { opacity: 0.5; cursor: not-allowed; }
}

// ─── Markdown Preview Dialog ───

.ce-md-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.36);
  z-index: 2000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px;
  backdrop-filter: blur(2px);
  -webkit-backdrop-filter: blur(2px);
}

.ce-md-dialog {
  background: #fff;
  border-radius: 14px;
  width: 100%;
  max-width: 960px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.18), 0 4px 16px rgba(0, 0, 0, 0.08);
  overflow: hidden;
}

.ce-md-dialog-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 16px 20px;
  border-bottom: 1px solid rgba(0, 0, 0, 0.08);
  flex-shrink: 0;
  gap: 12px;
}

.ce-md-dialog-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.ce-md-dialog-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ce-md-dialog-title {
  margin: 0;
  font-size: 15px;
  font-weight: 600;
  color: $text-primary;
  letter-spacing: -0.3px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.ce-md-dialog-type {
  font-size: 11px;
  font-weight: 500;
  color: $text-tertiary;
  background: $bg-sidebar;
  padding: 2px 7px;
  border-radius: 4px;
  white-space: nowrap;
  flex-shrink: 0;
}

.ce-md-dialog-close {
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 8px;
  background: transparent;
  color: $text-tertiary;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  transition: background 0.12s, color 0.12s;

  &:hover { background: $bg-hover; color: $text-primary; }
}

.ce-md-dialog-body {
  flex: 1;
  overflow-y: auto;
  padding: 24px 28px;
}

.ce-md-empty {
  font-size: 14px;
  color: $text-tertiary;
  text-align: center;
  padding: 40px 0;
}

.ce-md-summary-block {
  background: #f8f8f8;
  border-radius: 8px;
  padding: 14px 16px 12px;
  margin-bottom: 8px;

  .ce-md-summary-label {
    display: block;
    font-size: 11px;
    font-weight: 600;
    letter-spacing: 0.04em;
    text-transform: uppercase;
    color: #888;
    margin-bottom: 8px;
  }

  .ce-md-content {
    font-size: 13px;
    color: $text-secondary;
  }
}

.ce-md-divider {
  height: 1px;
  background: $border-color;
  margin: 16px 0;
}

.ce-md-content {
  font-size: 14px;
  line-height: 1.75;
  color: $text-primary;
  letter-spacing: -0.14px;

  :deep(h1), :deep(h2), :deep(h3), :deep(h4) {
    margin: 1.2em 0 0.4em;
    font-weight: 600;
    letter-spacing: -0.3px;
    line-height: 1.3;
    color: $text-primary;
    &:first-child { margin-top: 0; }
  }
  :deep(h1) { font-size: 22px; }
  :deep(h2) { font-size: 18px; }
  :deep(h3) { font-size: 15px; }
  :deep(h4) { font-size: 13px; }

  :deep(p) { margin: 0 0 0.9em; &:last-child { margin-bottom: 0; } }

  :deep(code) {
    font-family: 'SF Mono', 'JetBrains Mono', Menlo, monospace;
    font-size: 12.5px;
    background: $bg-sidebar;
    border: 1px solid $border-color;
    border-radius: 4px;
    padding: 1px 5px;
  }

  :deep(pre) {
    background: #f5f5f7;
    border: 1px solid $border-color;
    border-radius: 8px;
    padding: 14px 16px;
    overflow-x: auto;
    margin: 0.8em 0;
    code {
      background: none;
      border: none;
      padding: 0;
      font-size: 13px;
    }
  }

  :deep(ul), :deep(ol) {
    margin: 0 0 0.9em;
    padding-left: 1.5em;
    li { margin-bottom: 0.3em; }
  }

  :deep(blockquote) {
    margin: 0.8em 0;
    padding: 10px 16px;
    border-left: 3px solid rgba(0, 0, 0, 0.12);
    background: $bg-sidebar;
    border-radius: 0 6px 6px 0;
    color: $text-secondary;
  }

  :deep(a) { color: #0071e3; text-decoration: none; &:hover { text-decoration: underline; } }

  :deep(hr) {
    border: none;
    border-top: 1px solid $border-color;
    margin: 1.2em 0;
  }

  :deep(table) {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin: 0.8em 0;
    th, td {
      border: 1px solid $border-color;
      padding: 7px 12px;
      text-align: left;
    }
    th { background: $bg-sidebar; font-weight: 600; }
    tr:hover td { background: rgba(0,0,0,0.015); }
  }
}

.ce-dialog-fade-enter-active { transition: opacity 0.18s ease; }
.ce-dialog-fade-leave-active { transition: opacity 0.14s ease; }
.ce-dialog-fade-enter-from,
.ce-dialog-fade-leave-to { opacity: 0; }
.ce-dialog-fade-enter-active .ce-md-dialog,
.ce-dialog-fade-enter-active .ce-edit-dialog { transition: transform 0.18s ease; }
.ce-dialog-fade-enter-from .ce-md-dialog,
.ce-dialog-fade-enter-from .ce-edit-dialog { transform: scale(0.96) translateY(8px); }

// ─── Summary document (compact mode) ───
.ce-summary-doc-wrap {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  background: linear-gradient(180deg, #fbfbfd 0%, #f5f5f7 100%);
  padding: 32px 24px 64px;
}

.ce-summary-doc {
  max-width: 760px;
  margin: 0 auto;
  background: #ffffff;
  border: 1px solid $border-color;
  border-radius: 14px;
  padding: 36px 40px 44px;
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.03), 0 8px 24px rgba(0, 0, 0, 0.04);
}

.ce-summary-doc-header {
  display: flex;
  align-items: baseline;
  gap: 12px;
  padding-bottom: 16px;
  border-bottom: 1px solid $border-color;
  margin-bottom: 24px;
}

.ce-summary-doc-title {
  font-size: 26px;
  font-weight: 700;
  letter-spacing: -0.5px;
  color: $text-primary;
  margin: 0;
  flex: 1;
  min-width: 0;
  word-break: break-word;
}

.ce-summary-doc-type {
  font-size: 12px;
  font-weight: 500;
  color: $text-secondary;
  background: $bg-sidebar;
  border: 1px solid $border-color;
  padding: 2px 10px;
  border-radius: 999px;
  white-space: nowrap;
}

.ce-summary-doc-section {
  margin-bottom: 32px;
  &:last-child { margin-bottom: 0; }
}

.ce-summary-doc-h2 {
  font-size: 13px;
  font-weight: 600;
  color: $text-secondary;
  text-transform: uppercase;
  letter-spacing: 0.6px;
  margin: 0 0 14px;
}

.ce-summary-doc-empty {
  margin: 0;
  font-size: 13px;
  color: #9b9b9f;
  font-style: italic;
}

.ce-summary-doc-empty--center {
  text-align: center;
  padding: 24px 0;
}

.ce-summary-doc-warn {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 14px 18px;
  background: rgba(255, 159, 10, 0.08);
  border: 1px solid rgba(255, 159, 10, 0.28);
  border-radius: 10px;
}

.ce-summary-doc-warn-text {
  display: flex;
  align-items: center;
  gap: 10px;
  font-size: 13px;
  color: #8a4a00;
  flex: 1;
  min-width: 0;
}

.ce-summary-doc-warn-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #ff9f0a;
  color: #fff;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}

.ce-summary-doc-warn-btn {
  flex-shrink: 0;
  padding: 6px 14px;
  background: #1d1d1f;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  transition: background 0.12s, transform 0.08s;

  &:hover { background: #000; }
  &:active { transform: scale(0.97); }
}

.ce-summary-block {
  position: relative;
  margin-bottom: 18px;
  padding: 18px 20px;
  background: #fcfcfd;
  border: 1px solid $border-color;
  border-radius: 10px;
  &:last-child { margin-bottom: 0; }
}

.ce-summary-block-header {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
  padding-bottom: 10px;
  border-bottom: 1px dashed rgba(0, 0, 0, 0.08);
}

.ce-summary-block-accent {
  width: 4px;
  height: 18px;
  border-radius: 2px;
  flex-shrink: 0;
}

.ce-summary-block-name {
  flex: 1;
  min-width: 0;
  margin: 0;
  font-size: 16px;
  font-weight: 600;
  letter-spacing: -0.2px;
  color: $text-primary;
  word-break: break-word;
}

.ce-summary-block-type {
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.3px;
  padding: 2px 8px;
  border-radius: 4px;
  background: rgba(0, 0, 0, 0.04);
  white-space: nowrap;
}

.ce-summary-block-summary,
.ce-summary-block-content {
  margin-top: 12px;
  &:first-of-type { margin-top: 0; }
}

.ce-summary-block-summary {
  padding: 10px 14px;
  background: rgba(0, 113, 227, 0.04);
  border-left: 3px solid rgba(0, 113, 227, 0.4);
  border-radius: 0 6px 6px 0;
}

.ce-summary-block-summary--empty,
.ce-summary-block-content--empty {
  background: transparent;
  border-left: none;
  padding: 0;
}

.ce-summary-block-label {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: $text-secondary;
  margin-bottom: 6px;
}
</style>
