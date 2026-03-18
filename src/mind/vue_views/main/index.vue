<template>
  <div class="main-layout">
    <div class="main-container" ref="viewportRef">
      <canvas ref="canvasRef" class="mind-canvas" :width="canvasPixelW" :height="canvasPixelH" :style="canvasStyle"
        @dblclick="onCanvasDoubleClick" @pointerdown="onCanvasPointerDown" @pointermove="onCanvasPointerMove"
        @pointerleave="onCanvasPointerLeave" @pointerup="onCanvasPointerUp" @pointercancel="onCanvasPointerCancel"
        @lostpointercapture="onCanvasLostPointerCapture" />
      <LexicalNodeEditorOverlay v-if="editingSession" :visible="!!editingSession"
        :overlay-root-style="editingOverlayRootStyle" :text-box-rect="editingScreenTextBoxRect"
        :editor-shell-style="editingEditorShellStyle" :calibration-style="editingCalibrationStyle"
        :inner-translate-ypx="editingOverlayInnerTranslateYPx" :node-id="editingSession.nodeId"
        :initial-state="editingDisplayLexicalState" :mode="editingSession.mode"
        :caret-placement="editingSession.caretPlacement" @change="onLexicalEditorChange" @commit="commitEditingSession"
        @cancel="cancelEditingSession" />

      <div v-if="horizontalScrollbar.visible" class="mind-scrollbar mind-scrollbar-x">
        <div class="mind-scrollbar-track">
          <div class="mind-scrollbar-thumb" :class="{ 'is-active': isScrollbarDragging }" :style="{
            width: `${horizontalScrollbar.thumbSize}px`,
            transform: `translateX(${horizontalScrollbar.thumbOffset}px)`,
          }" @mousedown.stop.prevent="onScrollbarMouseDown('x', $event)" />
        </div>
      </div>

      <div v-if="verticalScrollbar.visible" class="mind-scrollbar mind-scrollbar-y">
        <div class="mind-scrollbar-track">
          <div class="mind-scrollbar-thumb" :class="{ 'is-active': isScrollbarDragging }" :style="{
            height: `${verticalScrollbar.thumbSize}px`,
            transform: `translateY(${verticalScrollbar.thumbOffset}px)`,
          }" @mousedown.stop.prevent="onScrollbarMouseDown('y', $event)" />
        </div>
      </div>
    </div>

    <div v-if="showFormatPanel" class="format-panel-shell" @pointerdown.stop @mousedown.stop @click.stop>
      <aside class="format-panel">
        <div class="format-panel-header">
          <button class="format-panel-tab" :class="{ 'is-active': formatPanelTab === 'style' }" type="button"
            @click="formatPanelTab = 'style'">
            样式
          </button>
          <button class="format-panel-tab" :class="{ 'is-active': formatPanelTab === 'mark' }" type="button"
            @click="formatPanelTab = 'mark'">
            标记
          </button>
        </div>
        <div
          class="format-panel-body"
          :class="{ 'is-disabled': !hasSelectedNodes }"
        >
          <div
            v-if="formatPanelTab === 'style'"
            class="style-panel"
          >
            <section class="style-section">
              <div class="style-section-header">
                <h3 class="style-section-title">形状</h3>
              </div>

              <div class="style-control-block">
                <div class="style-control-labels">
                  <span class="style-control-title">填充</span>
                </div>
                <div class="style-preview-grid style-preview-grid--fill">
                  <button
                    v-for="option in styleFillOptions"
                    :key="option.key"
                    class="style-preview-card"
                    :class="{ 'is-selected': selectedFillPresetKey === option.key }"
                    type="button"
                    :title="option.label"
                    @click="onFillPresetSelect(option.key)"
                  >
                    <span class="style-preview-card-art" v-html="option.previewSvg" />
                    <span class="style-preview-card-copy">
                      <span class="style-preview-card-title">{{ option.label }}</span>
                      <span class="style-preview-card-subtitle">{{ option.caption }}</span>
                    </span>
                  </button>
                </div>
                <div class="style-inline-field">
                  <span class="style-inline-field-label">填充颜色</span>
                  <ColorSwatchPickerRoot
                    :model-value="selectedFillColor"
                    as-child
                    orientation="horizontal"
                    :highlight-on-hover="true"
                    @update:model-value="onFillColorSelect"
                  >
                    <div class="style-color-picker">
                      <ColorSwatchPickerItem
                        v-for="color in styleFillColorSwatches"
                        :key="`fill-${color}`"
                        :value="color"
                        as-child
                      >
                        <button class="style-color-item" type="button">
                          <span class="style-color-swatch" :style="{ backgroundColor: color }" />
                          <ColorSwatchPickerItemIndicator as-child>
                            <span class="style-color-indicator">✓</span>
                          </ColorSwatchPickerItemIndicator>
                        </button>
                      </ColorSwatchPickerItem>
                    </div>
                  </ColorSwatchPickerRoot>
                </div>
              </div>

              <div class="style-control-block">
                <div class="style-control-labels">
                  <span class="style-control-title">边框</span>
                </div>
                <div class="style-preview-grid style-preview-grid--border">
                  <button
                    v-for="option in styleBorderOptions"
                    :key="option.key"
                    class="style-preview-card"
                    :class="{ 'is-selected': selectedBorderPresetKey === option.key }"
                    type="button"
                    :title="option.label"
                    @click="onBorderPresetSelect(option.key)"
                  >
                    <span class="style-preview-card-art" v-html="option.previewSvg" />
                    <span class="style-preview-card-copy">
                      <span class="style-preview-card-title">{{ option.label }}</span>
                      <span class="style-preview-card-subtitle">{{ option.caption }}</span>
                    </span>
                  </button>
                </div>
                <div class="style-inline-field">
                  <span class="style-inline-field-label">边框颜色</span>
                  <ColorSwatchPickerRoot
                    :model-value="selectedBorderColor"
                    as-child
                    orientation="horizontal"
                    :highlight-on-hover="true"
                    @update:model-value="onBorderColorSelect"
                  >
                    <div class="style-color-picker">
                      <ColorSwatchPickerItem
                        v-for="color in styleOutlineColorSwatches"
                        :key="`border-${color}`"
                        :value="color"
                        as-child
                      >
                        <button class="style-color-item" type="button">
                          <span class="style-color-swatch" :style="{ backgroundColor: color }" />
                          <ColorSwatchPickerItemIndicator as-child>
                            <span class="style-color-indicator">✓</span>
                          </ColorSwatchPickerItemIndicator>
                        </button>
                      </ColorSwatchPickerItem>
                    </div>
                  </ColorSwatchPickerRoot>
                </div>
                <div class="style-inline-field">
                  <span class="style-inline-field-label">线条粗细</span>
                  <div class="style-weight-grid">
                    <button
                      v-for="option in styleStrokeWidthOptions"
                      :key="option.key"
                      class="style-weight-card"
                      :class="{ 'is-selected': selectedBorderWidthKey === option.key }"
                      type="button"
                      :title="option.label"
                      @click="onBorderWidthSelect(option.key)"
                    >
                      <span class="style-weight-line" :style="{ height: `${option.previewPx}px` }" />
                      <span class="style-weight-label">{{ option.label }}</span>
                    </button>
                  </div>
                </div>
              </div>
            </section>

            <section class="style-section">
              <div class="style-section-header">
                <h3 class="style-section-title">文本</h3>
              </div>

              <div class="style-control-block">
                <div class="style-control-labels">
                  <span class="style-control-title">字体</span>
                </div>
                <div class="style-font-grid">
                  <button
                    v-for="option in styleFontOptions"
                    :key="option.key"
                    class="style-font-card"
                    :class="{ 'is-selected': selectedFontKey === option.key }"
                    type="button"
                    @click="onFontFamilySelect(option.key)"
                  >
                    <span class="style-font-sample" :style="{ fontFamily: option.fontFamily }">Aa</span>
                    <span class="style-font-copy">
                      <span class="style-font-title">{{ option.label }}</span>
                      <span class="style-font-stack">{{ option.sample }}</span>
                    </span>
                  </button>
                </div>
              </div>

              <div class="style-control-block">
                <div class="style-inline-field">
                  <span class="style-inline-field-label">字号</span>
                  <div class="style-size-grid">
                    <button
                      v-for="size in styleFontSizes"
                      :key="size"
                      class="style-size-chip"
                      :class="{ 'is-selected': selectedFontSize === size }"
                      type="button"
                      @click="onFontSizeSelect(size)"
                    >
                      {{ size }}
                    </button>
                  </div>
                </div>

                <div class="style-inline-field">
                  <span class="style-inline-field-label">字体颜色</span>
                  <ColorSwatchPickerRoot
                    :model-value="selectedTextColor"
                    as-child
                    orientation="horizontal"
                    :highlight-on-hover="true"
                    @update:model-value="onTextColorSelect"
                  >
                    <div class="style-color-picker">
                      <ColorSwatchPickerItem
                        v-for="color in styleOutlineColorSwatches"
                        :key="`text-${color}`"
                        :value="color"
                        as-child
                      >
                        <button class="style-color-item" type="button">
                          <span class="style-color-swatch" :style="{ backgroundColor: color }" />
                          <ColorSwatchPickerItemIndicator as-child>
                            <span class="style-color-indicator">✓</span>
                          </ColorSwatchPickerItemIndicator>
                        </button>
                      </ColorSwatchPickerItem>
                    </div>
                  </ColorSwatchPickerRoot>
                </div>

                <div class="style-inline-field">
                  <span class="style-inline-field-label">字形</span>
                  <div class="style-toggle-grid">
                    <button
                      v-for="option in styleTextToggleOptions"
                      :key="option.key"
                      class="style-toggle-button"
                      :class="[
                        option.previewClass,
                        { 'is-selected': textToggleState[option.key] },
                      ]"
                      type="button"
                      :title="option.label"
                      @click="onTextToggleClick(option.key)"
                    >
                      {{ option.glyph }}
                    </button>
                  </div>
                </div>

                <div class="style-inline-field">
                  <span class="style-inline-field-label">对齐</span>
                  <div class="style-align-grid">
                    <button
                      v-for="option in styleTextAlignOptions"
                      :key="option.key"
                      class="style-align-button"
                      :class="{ 'is-selected': selectedTextAlign === option.key }"
                      type="button"
                      :title="option.label"
                      @click="onTextAlignSelect(option.key)"
                    >
                      <span class="style-align-preview" :class="`is-${option.key}`">
                        <span />
                        <span />
                        <span />
                      </span>
                    </button>
                  </div>
                </div>
              </div>
            </section>
          </div>
          <div
            v-if="formatPanelTab === 'mark'"
            class="marker-panel"
            :class="{ 'is-disabled': !hasSelectedNodes }"
          >
            <section v-for="group in markerPanelGroups" :key="group.key" class="marker-group">
              <h3 class="marker-group-title">{{ group.label }}</h3>
              <div class="marker-grid">
                <button
                  v-for="marker in group.items"
                  :key="marker.key"
                  class="marker-tile"
                  type="button"
                  :title="marker.name"
                  @click="onMarkerTileClick(marker.key)"
                >
                  <img class="marker-tile-icon" :src="marker.src" :alt="marker.name" />
                </button>
              </div>
            </section>

            <div class="marker-mode-panel">
              <div class="marker-mode-row">
                <span class="marker-mode-label">{{ isMarkerDeleteMode ? '删除模式' : '添加模式' }}</span>
                <button
                  class="marker-mode-switch"
                  :class="{ 'is-on': isMarkerDeleteMode }"
                  type="button"
                  role="switch"
                  :aria-checked="isMarkerDeleteMode ? 'true' : 'false'"
                  @click="isMarkerDeleteMode = !isMarkerDeleteMode"
                >
                  <span class="marker-mode-switch-thumb" />
                </button>
              </div>

              <button
                v-if="isMarkerDeleteMode"
                class="marker-clear-button"
                type="button"
                @click="clearSelectedNodeMarkers"
              >
                清除所有
              </button>
            </div>
          </div>
          <div
            v-if="formatPanelTab === 'mark' && !hasSelectedNodes"
            class="format-panel-body-mask"
            aria-hidden="true"
          />
          <div
            v-if="formatPanelTab === 'style' && !hasSelectedNodes"
            class="format-panel-body-mask"
            aria-hidden="true"
          />
        </div>
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import {
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerRoot,
} from 'reka-ui';
import rough from 'roughjs';
import type { Options } from 'roughjs/bin/core';
import { $patchStyleText } from '@lexical/selection';
import { $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND } from 'lexical';
import { getInternalClipboard, internalClipboardState, setInternalClipboard, type InternalClipboardState } from '@/mind/core/clipboard';
import { createBatchAddChildCommand, type SelectionSnapshot } from '@/mind/core/commands/BatchAddChildCommand';
import { createBatchAddSiblingCommand } from '@/mind/core/commands/BatchAddSiblingCommand';
import { createBatchCutSubtreesCommand } from '@/mind/core/commands/BatchCutSubtreesCommand';
import { createBatchDeleteSubtreesCommand } from '@/mind/core/commands/BatchDeleteSubtreesCommand';
import { createBatchPasteSubtreesCommand } from '@/mind/core/commands/BatchPasteSubtreesCommand';
import { createCutSubtreeCommand } from '@/mind/core/commands/CutSubtreeCommand';
import { createDeleteSubtreeCommand } from '@/mind/core/commands/DeleteSubtreeCommand';
import { createMoveSubtreesCommand } from '@/mind/core/commands/MoveSubtreesCommand';
import { createPasteSubtreeCommand } from '@/mind/core/commands/PasteSubtreeCommand';
import { createSetNodeImageCommand } from '@/mind/core/commands/SetNodeImageCommand';
import { createSetNodeImageSizeCommand } from '@/mind/core/commands/SetNodeImageSizeCommand';
import { createUpdateNodeLexicalStateCommand, isLexicalStateEqual } from '@/mind/core/commands/UpdateNodeLexicalStateCommand';
import { collectSubtreeNodeIds, createSubtreeSnapshot } from '@/mind/core/commands/subtreeSnapshot';
import { cloneNodeImage, getNodeImage, getNodeLexicalState, getNodePlainText, getNodeRichText, setNodeRichText, type MindNodeImage } from '@/mind/core/nodeContent';
import { layoutOverlayTextLines } from '@/mind/core/dragDrop/overlayTextLayout';
import type { DragDropState, DragDropTarget } from '@/mind/core/drag/types';
import { createHistory, type Command, type HistorySnapshot } from '@/mind/core/history';
import { lexicalEditorManager } from '@/mind/core/lexicalEditorManager';
import {
  cloneLexicalState,
  lexicalStateFromPlainText,
  richTextFromLexicalState,
  scaleLexicalStateFontSizes,
  type SerializedLexicalEditorState,
} from '@/mind/core/lexicalState';
import { compareSelectionTargetInfo, getSelectionTargetInfo, normalizeSelectionTargets } from '@/mind/core/selection/normalizeSelection';
import { ensureMindRoots, toPlainDoc } from './actions/useDocUtils';
import { useLayout } from './actions/useLayout';
import { MAX_CAMERA_SCALE, getAxisConstraint, useCamera } from './actions/useCamera';
import { useDraw } from './actions/useDraw';
import { useEdges } from './actions/useEdges';
import { useInteraction } from './actions/useInteraction';
import { useMarquee } from './actions/useMarquee';
import { usePersistence } from './actions/usePersistence';
import { DEBUG_CANVAS_OVERLAY, SPATIAL_GRID_CELL_SIZE } from './constants';
import { buildCollapseTagScreenMap, hitTestCollapseTag } from './collapseTags';
import { logCameraReset, logRendererDebugInstructions } from './diagnostics';
import { getWorldViewportRect, pointInRect, rectContains, screenToWorld, worldToScreen } from './geom/rect';
import { buildWorldBoxes, type WorldBoxes } from './geom/worldBoxes';
import { UniformGridSpatialIndex } from './grid/spatialIndex';
import {
  clearNodeMarkers,
  getNodeBodyWorldRect,
  measureNodeMarkerRow,
  nodeMarkerGroups,
  removeNodeMarker,
  upsertNodeMarker,
} from './nodeMarkers';
import {
  clampImageSize,
  computeImagePreviewSize,
  getResizeCursor,
  inflateImageWorldRect,
  IMAGE_OUTLINE_GAP_PX,
  getNodeImageWorldRect,
  hitTestImageHandle,
  pointInImageWorldRect,
  type ImageInteractionState,
  type ImageResizeHandle,
  type ImageSize,
} from './imageInteraction';
import {
  cloneRichText,
  type RichTextAlign,
  type RichTextDocument,
  type RichTextInline,
  type RichTextMarks,
} from '@/mind/core/richText';
import {
  computeNodeTextGeometry,
  getNodeTextStyle,
  measureTextVerticalMetrics,
  NODE_CONTENT_MAX_W,
  NODE_MIN_W,
  NODE_LINE_HEIGHT,
  NODE_PADDING_X,
  NODE_TEXT_INSET_X,
  NODE_TEXT_INSET_Y,
  measureNodeTextLayout,
} from './textLayout';
import { getDomTextTopOffset } from '@/mind/core/text/domTextCalibration';
import { NODE_H_HARD_MAX, NODE_TEXT_MAX_WIDTH_PX, NODE_W_HARD_MAX } from '@/mind/core/text/measureNodeText';
import LexicalNodeEditorOverlay from './components/LexicalNodeEditorOverlay.vue';
import type { MindNodeBorderPreset, MindNodeFillPreset } from './nodeStyles';
import { getMindNodeDefaultVisualStyle } from './nodeStyles';
import { getCurrentRoughTheme } from '@/mind/rendering/roughTheme';

const props = defineProps<{ doc?: any; filePath?: any; docId?: string; windowKey?: any; showFormatPanel?: boolean }>();
const emit = defineEmits<{
  (event: 'filePathChange', value: string | null): void;
  (event: 'saveStateChange', value: { isDirty: boolean; isSaving: boolean; displayName: string }): void;
  (event: 'nodeCountChange', value: { totalNodes: number; selectedNodes: number }): void;
  (event: 'toggleFormatPanel'): void;
}>();

const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const formatPanelTab = ref<'style' | 'mark'>('style');
const isMarkerDeleteMode = ref(false);
const markerPanelGroups = nodeMarkerGroups;
const hasSelectedNodes = computed(() => selectedIds.value.size > 0);
const styleColorSwatches = [
  '#ffffff',
  '#EEEEEE',
  '#111111',
  '#eab308',
  '#f97316',
  '#ef4444',
  '#D02F48',
  '#8b5cf6',
  '#3b82f6',
  '#14b8a6',
  '#22c55e',
  '#D0D0D0',
] as const;
const styleFillColorSwatches = styleColorSwatches;
const styleOutlineColorSwatches = styleColorSwatches;
const styleFillOptions = [
  {
    key: 'rough-hachure',
    label: '手绘斜线',
    caption: 'Hachure',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'hachure',
      fillColor: '#f4b740',
      strokeColor: '#0f172a',
      roughness: 0.92,
      hachureGap: 2.2,
      fillWeight: 3.8,
    }),
  },
  {
    key: 'rough-cross',
    label: '交叉排线',
    caption: 'Cross-hatch',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'cross-hatch',
      fillColor: '#e879f9',
      strokeColor: '#0f172a',
      roughness: 1.1,
      hachureGap: 5,
      fillWeight: 1.7,
    }),
  },
  {
    key: 'rough-dots',
    label: '点状填充',
    caption: 'Dots',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'dots',
      fillColor: '#38bdf8',
      strokeColor: '#0f172a',
      roughness: 0.95,
      hachureGap: 7,
      fillWeight: 1.4,
    }),
  },
  {
    key: 'solid',
    label: '纯色填充',
    caption: 'Solid',
    previewSvg: buildFillPreviewSvg({
      fillStyle: 'solid',
      fillColor: '#111827',
      strokeColor: '#0f172a',
      roughness: 0.2,
      fillWeight: 0.8,
    }),
  },
  {
    key: 'none',
    label: '无填充',
    caption: 'None',
    previewSvg: buildNoneFillPreviewSvg(),
  },
] as const;
const styleBorderOptions = [
  {
    key: 'clean',
    label: '无风格线条',
    caption: 'Clean',
    previewSvg: buildCleanBorderPreviewSvg(),
  },
  {
    key: 'rough-solid',
    label: '手绘实线',
    caption: 'Rough solid',
    previewSvg: buildRoughBorderPreviewSvg({
      strokeColor: '#111827',
      strokeWidth: 1.8,
      roughness: 1.05,
      bowing: 1,
    }),
  },
  {
    key: 'rough-dashed',
    label: '手绘虚线',
    caption: 'Rough dashed',
    previewSvg: buildRoughDashedBorderPreviewSvg({
      strokeColor: '#111827',
      strokeWidth: 1.8,
      roughness: 1.1,
      bowing: 1.1,
    }),
  },
  {
    key: 'none',
    label: '无边框',
    caption: 'None',
    previewSvg: buildNoBorderPreviewSvg(),
  },
] as const;
const styleStrokeWidthOptions = [
  { key: 'hairline', label: '极细', previewPx: 1 },
  { key: 'thin', label: '细', previewPx: 2 },
  { key: 'medium', label: '中等', previewPx: 3 },
  { key: 'thick', label: '粗', previewPx: 4 },
  { key: 'heavy', label: '极粗', previewPx: 6 },
] as const;
const styleFontOptions = [
  {
    key: 'modern-sans',
    label: 'Microsoft YaHei',
    sample: 'YaHei',
    fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
  },
  {
    key: 'humanist',
    label: 'Humanist',
    sample: 'Trebuchet',
    fontFamily: '"Trebuchet MS", Verdana, sans-serif',
  },
  {
    key: 'classic-serif',
    label: 'Classic Serif',
    sample: 'Georgia',
    fontFamily: 'Georgia, "Times New Roman", serif',
  },
  {
    key: 'mono',
    label: 'Mono',
    sample: 'SF Mono',
    fontFamily: '"SFMono-Regular", Consolas, "Liberation Mono", monospace',
  },
] as const;
const styleFontSizes = [12, 14, 16, 18, 20, 24, 28, 32, 36, 48] as const;
const styleTextToggleOptions = [
  { key: 'bold', label: '粗体', glyph: 'B', previewClass: 'is-bold' },
  { key: 'italic', label: '斜体', glyph: 'I', previewClass: 'is-italic' },
  { key: 'underline', label: '下划线', glyph: 'U', previewClass: 'is-underline' },
  { key: 'strike', label: '删除线', glyph: 'S', previewClass: 'is-strike' },
] as const;
const styleTextAlignOptions = [
  { key: 'left', label: '左对齐' },
  { key: 'center', label: '居中对齐' },
  { key: 'right', label: '右对齐' },
] as const;
type StyleFillPresetKey = (typeof styleFillOptions)[number]['key'];
type StyleBorderPresetKey = (typeof styleBorderOptions)[number]['key'];
type StyleBorderWidthKey = (typeof styleStrokeWidthOptions)[number]['key'];
type StyleFontKey = (typeof styleFontOptions)[number]['key'];
type StyleTextToggleKey = (typeof styleTextToggleOptions)[number]['key'];
type StyleTextAlignKey = (typeof styleTextAlignOptions)[number]['key'];
const selectedFillPresetKey = ref<(typeof styleFillOptions)[number]['key']>('rough-hachure');
const selectedFillColor = ref<string>('#ffffff');
const selectedBorderPresetKey = ref<(typeof styleBorderOptions)[number]['key']>('rough-solid');
const selectedBorderColor = ref<string>('#111111');
const selectedBorderWidthKey = ref<(typeof styleStrokeWidthOptions)[number]['key']>('medium');
const selectedFontKey = ref<(typeof styleFontOptions)[number]['key']>('modern-sans');
const selectedFontSize = ref<(typeof styleFontSizes)[number]>(18);
const selectedTextColor = ref<string>('#111111');
const selectedTextAlign = ref<(typeof styleTextAlignOptions)[number]['key']>('left');
const textToggleState = ref<Record<(typeof styleTextToggleOptions)[number]['key'], boolean>>({
  bold: false,
  italic: false,
  underline: false,
  strike: false,
});

function setTextToggleLocally(key: StyleTextToggleKey, enabled: boolean) {
  textToggleState.value[key] = enabled;
}

function normalizeColorToken(value: string | null | undefined) {
  return (value ?? '').trim().toLowerCase();
}

function getPanelSourceSelectedNodeId() {
  return selectedIds.value.values().next().value ?? getPrimarySelectedId();
}

function resolveFillPresetKey(visualStyle: ReturnType<typeof getMindNodeDefaultVisualStyle>) {
  return mapNodeFillPresetToPanelKey(visualStyle.fillPreset);
}

function resolveBorderPresetKey(visualStyle: ReturnType<typeof getMindNodeDefaultVisualStyle>) {
  return mapNodeBorderPresetToPanelKey(visualStyle.borderPreset);
}

function resolveStrokeWidthKey(strokeWidthPx: number) {
  return styleStrokeWidthOptions.reduce((closest, option) => {
    const closestDistance = Math.abs(closest.previewPx - strokeWidthPx);
    const nextDistance = Math.abs(option.previewPx - strokeWidthPx);
    return nextDistance < closestDistance ? option : closest;
  }).key;
}

function mapFillPresetKeyToNodePreset(key: StyleFillPresetKey): MindNodeFillPreset {
  if (key === 'rough-cross') return 'rough-cross';
  if (key === 'rough-dots') return 'rough-dots';
  if (key === 'solid') return 'solid';
  if (key === 'none') return 'none';
  return 'rough-hachure';
}

function mapNodeFillPresetToPanelKey(preset: MindNodeFillPreset): StyleFillPresetKey {
  return preset;
}

function mapBorderPresetKeyToNodePreset(key: StyleBorderPresetKey): MindNodeBorderPreset {
  if (key === 'clean') return 'clean';
  if (key === 'rough-dashed') return 'rough-dashed';
  if (key === 'none') return 'none';
  return 'rough-solid';
}

function mapNodeBorderPresetToPanelKey(preset: MindNodeBorderPreset): StyleBorderPresetKey {
  return preset;
}

function mapBorderWidthKeyToStrokeWidth(key: StyleBorderWidthKey) {
  return styleStrokeWidthOptions.find((option) => option.key === key)?.previewPx ?? 3;
}

function resolveFontOptionKey(fontFamily: string) {
  const normalizedFontFamily = normalizeColorToken(fontFamily);
  const matched = styleFontOptions.find((option) => {
    const candidates = [
      option.fontFamily,
      option.label,
      option.sample,
      option.key === 'modern-sans' ? 'pingfang sc' : '',
      option.key === 'modern-sans' ? 'helvetica neue' : '',
      option.key === 'modern-sans' ? 'microsoft yahei' : '',
      option.key === 'humanist' ? 'trebuchet ms' : '',
      option.key === 'humanist' ? 'verdana' : '',
      option.key === 'classic-serif' ? 'times new roman' : '',
      option.key === 'classic-serif' ? 'georgia' : '',
      option.key === 'mono' ? 'sfmono' : '',
      option.key === 'mono' ? 'consolas' : '',
    ].map((value) => normalizeColorToken(value));
    return candidates.some((candidate) => candidate && normalizedFontFamily.includes(candidate));
  });
  return matched?.key ?? 'modern-sans';
}

function resolveFontSizeValue(fontSizePx: number) {
  return styleFontSizes.reduce((closest, option) => {
    const closestDistance = Math.abs(closest - fontSizePx);
    const nextDistance = Math.abs(option - fontSizePx);
    return nextDistance < closestDistance ? option : closest;
  });
}

function syncStylePanelFromSelection() {
  const nodeId = getPanelSourceSelectedNodeId();
  const node = getNodeById(nodeId);
  if (!node || !nodeId) return;

  const visualStyle = getMindNodeDefaultVisualStyle(props.doc, nodeId);
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId });
  const richText = getNodeRichText(node);
  const firstBlock = richText.blocks[0];
  const firstInline = firstBlock?.inlines.find((inline) => inline.text.length || inline.marks) ?? firstBlock?.inlines[0];
  const marks = firstInline?.marks;
  const roughTheme = getCurrentRoughTheme();
  const shapeStyle = node.style?.shape ?? null;

  selectedFillPresetKey.value = resolveFillPresetKey(visualStyle);
  selectedFillColor.value = visualStyle.fill;
  selectedBorderPresetKey.value = resolveBorderPresetKey(visualStyle);
  selectedBorderColor.value = visualStyle.stroke;
  selectedBorderWidthKey.value = resolveStrokeWidthKey(shapeStyle?.strokeWidthPx ?? roughTheme.strokeWidthPx);
  selectedFontKey.value = resolveFontOptionKey(textStyle.fontFamily);
  selectedFontSize.value = resolveFontSizeValue(textStyle.fontSizePx);
  selectedTextColor.value = textStyle.color;
  selectedTextAlign.value = textStyle.textAlign;
  textToggleState.value = {
    bold: textStyle.fontWeight >= 700,
    italic: textStyle.fontStyle === 'italic',
    underline: !!marks?.underline,
    strike: !!marks?.strike,
  };
}

function buildPreviewSvgFrame(inner: string) {
  return [
    '<svg viewBox="0 0 84 56" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">',
    '<rect x="0.75" y="0.75" width="82.5" height="54.5" rx="14" fill="#ffffff" stroke="rgba(148, 163, 184, 0.24)" />',
    inner,
    '</svg>',
  ].join('');
}

function createPreviewRoundedRectPathData(x: number, y: number, width: number, height: number, radius: number) {
  const r = Math.max(0, Math.min(radius, width / 2, height / 2));
  if (r <= 0) {
    return `M ${x} ${y} L ${x + width} ${y} L ${x + width} ${y + height} L ${x} ${y + height} Z`;
  }
  return [
    `M ${x + r} ${y}`,
    `L ${x + width - r} ${y}`,
    `Q ${x + width} ${y} ${x + width} ${y + r}`,
    `L ${x + width} ${y + height - r}`,
    `Q ${x + width} ${y + height} ${x + width - r} ${y + height}`,
    `L ${x + r} ${y + height}`,
    `Q ${x} ${y + height} ${x} ${y + height - r}`,
    `L ${x} ${y + r}`,
    `Q ${x} ${y} ${x + r} ${y}`,
    'Z',
  ].join(' ');
}

function renderRoughPathToSvg(pathData: string, options: Options) {
  const generator = rough.generator();
  const drawable = generator.path(pathData, {
    seed: 19,
    preserveVertices: false,
    ...options,
  });

  return generator.toPaths(drawable).map((path) => [
    `<path d="${path.d}"`,
    `fill="${path.fill ?? 'none'}"`,
    `stroke="${path.stroke ?? 'none'}"`,
    `stroke-width="${path.strokeWidth ?? 1}"`,
    options.strokeLineDash?.length ? `stroke-dasharray="${options.strokeLineDash.join(' ')}"` : '',
    'stroke-linecap="round"',
    'stroke-linejoin="round"',
    '/>',
  ].filter(Boolean).join(' ')).join('');
}

function buildFillPreviewSvg(options: {
  fillStyle: NonNullable<Options['fillStyle']>;
  fillColor: string;
  strokeColor: string;
  roughness: number;
  hachureGap?: number;
  fillWeight: number;
}) {
  const roundedPath = createPreviewRoundedRectPathData(18, 12, 48, 30, 10);
  return buildPreviewSvgFrame(renderRoughPathToSvg(roundedPath, {
    fill: options.fillColor,
    fillStyle: options.fillStyle,
    fillWeight: options.fillWeight,
    hachureGap: options.hachureGap,
    hachureAngle: 58,
    stroke: options.strokeColor,
    strokeWidth: 1.35,
    roughness: options.roughness,
    bowing: 0.92,
    disableMultiStrokeFill: options.fillStyle === 'solid',
  }));
}

function buildNoneFillPreviewSvg() {
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="rgba(255,255,255,0.01)" stroke="rgba(148, 163, 184, 0.95)" stroke-dasharray="4 4" stroke-width="1.2" />',
    '<path d="M24 36 L60 18" stroke="rgba(148, 163, 184, 0.9)" stroke-width="2" stroke-linecap="round" />',
  ].join(''));
}

function buildCleanBorderPreviewSvg() {
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="#f8fafc" stroke="#111827" stroke-width="1.6" />',
  ].join(''));
}

function buildRoughBorderPreviewSvg(options: {
  strokeColor: string;
  strokeWidth: number;
  roughness: number;
  bowing: number;
  strokeLineDash?: number[];
}) {
  const roundedPath = createPreviewRoundedRectPathData(18, 12, 48, 30, 10);
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="#f8fafc" stroke="none" />',
    renderRoughPathToSvg(roundedPath, {
      fill: 'transparent',
      stroke: options.strokeColor,
      strokeWidth: options.strokeWidth,
      roughness: options.roughness,
      bowing: options.bowing,
      strokeLineDash: options.strokeLineDash,
      fillStyle: 'solid',
      disableMultiStrokeFill: true,
    }),
  ].join(''));
}

function buildRoughDashedBorderPreviewSvg(options: {
  strokeColor: string;
  strokeWidth: number;
  roughness: number;
  bowing: number;
}) {
  return buildRoughBorderPreviewSvg({
    ...options,
    strokeLineDash: [6, 5],
  });
}

function buildNoBorderPreviewSvg() {
  return buildPreviewSvgFrame([
    '<rect x="18" y="12" width="48" height="30" rx="10" fill="#e2e8f0" stroke="none" />',
    '<path d="M24 36 L60 18" stroke="rgba(100, 116, 139, 0.78)" stroke-width="2" stroke-linecap="round" />',
  ].join(''));
}

const viewportW = ref(1200);
const viewportH = ref(800);
const canvasDpr = ref(1);
const canvasPixelW = ref(1200);
const canvasPixelH = ref(800);
const worldBoxes = ref<WorldBoxes>(new Map());
const hoverNodeId = ref<string | null>(null);
const collapseTagHoverNodeId = ref<string | null>(null);
const collapseTagStickyNodeId = ref<string | null>(null);
const editingNodeId = ref<string | null>(null);
const editingSession = ref<null | {
  nodeId: string;
  initialLexicalState: SerializedLexicalEditorState;
  mode: 'append' | 'replace';
  caretPlacement: 'start' | 'end' | 'none';
}>(null);
const editingDraftLexicalState = ref<SerializedLexicalEditorState>(getNodeLexicalState(null));
const editingDisplayLexicalState = computed(() => {
  const scale = Math.max(camera.value.scale, 0.0001);
  return scaleLexicalStateFontSizes(editingDraftLexicalState.value, scale);
});
const editingPreview = ref<null | {
  nodeId: string;
  liveLexicalState: SerializedLexicalEditorState;
  measuredTextW: number;
  measuredTextH: number;
  computedNodeW: number;
  computedNodeH: number;
}>(null);
const isComposing = ref(false);
const primarySelectedNodeId = ref<string | null>(null);
const selectionAnchorNodeId = ref<string | null>(null);
const selectionAnchorByGroup = ref<Record<string, string>>({});
const historySnapshot = ref<HistorySnapshot>({
  canUndo: false,
  canRedo: false,
  undoDepth: 0,
  redoDepth: 0,
  lastCommandName: null,
});
const isSaving = ref(false);
const saveError = ref<string | null>(null);
const contentRevision = ref(0);
const lastSavedContentRevision = ref(0);
const editorDebugState = ref({
  lastDeletedNodeId: null as string | null,
  lastPastedRootId: null as string | null,
  filteredOutDescendantsCount: 0,
  rebuildCountInLastCommand: 0,
});
const imageInteraction = ref<ImageInteractionState | null>(null);
const dragState = ref<DragDropState>({
  isDragging: false,
  dragRoots: [],
  dragRootTexts: [],
  dragRootTextLayouts: [],
  primaryDragRootId: null,
  rootId: null,
  draggedSubtreeNodeIds: new Set(),
  cursorScreenX: 0,
  cursorScreenY: 0,
  dropTarget: null,
  lastValidDropTarget: null,
  invalidReason: null,
  filteredOutDescendantsCount: 0,
  autoPanActive: false,
  autoPanVelocityX: 0,
  autoPanVelocityY: 0,
});
const spatialIndex = new UniformGridSpatialIndex(SPATIAL_GRID_CELL_SIZE);

function resizeToViewport() {
  const el = viewportRef.value;
  if (!el) return;
  viewportW.value = Math.max(1, el.clientWidth);
  viewportH.value = Math.max(1, el.clientHeight);
  canvasDpr.value = typeof window === 'undefined' ? 1 : Math.max(1, window.devicePixelRatio || 1);
  canvasPixelW.value = Math.max(1, Math.round(viewportW.value * canvasDpr.value));
  canvasPixelH.value = Math.max(1, Math.round(viewportH.value * canvasDpr.value));
}

const canvasStyle = computed<CSSProperties>(() => ({
  width: `${viewportW.value}px`,
  height: `${viewportH.value}px`,
}));

// camera（唯一真相）
const { layoutLocal, layoutBounds, rebuildLayout } = useLayout(props, canvasRef, (nodeId) => {
  const preview = editingPreview.value;
  if (!preview || preview.nodeId !== nodeId) return null;
  return { w: preview.computedNodeW, h: preview.computedNodeH };
});
const {
  camera,
  clampScale,
  zoomAtViewportPoint,
  panByPixels,
  setCamera,
  centerCamera,
  constrainToBounds,
  fitScaleToViewport,
  getPaddedLayoutBounds,
  getMinCameraScale,
} = useCamera(viewportRef, layoutBounds);

const {
  isMarquee,
  rectScreen: marqueeRectScreen,
  worldRect: marqueeWorldRect,
  selectedIds,
  startSelection: startMarqueeSelection,
  updateSelection: updateMarqueeSelection,
  finishSelection: finishMarqueeSelection,
  cancelSelection: cancelMarqueeSelection,
  cleanup: cleanupMarquee,
} = useMarquee(camera, spatialIndex, worldBoxes, requestRender);
const collapseTagScreenMap = computed(() =>
  buildCollapseTagScreenMap(
    props.doc,
    worldBoxes.value,
    camera.value,
    hoverNodeId.value,
    collapseTagHoverNodeId.value,
    selectedIds.value,
    collapseTagStickyNodeId.value
  )
);

const history = createHistory((nextSnapshot) => {
  historySnapshot.value = nextSnapshot;
});

// layout + draw
const { parentEdgeGeoms, edgeStats, rebuildEdgeCache } = useEdges();
const { draw } = useDraw(
  props,
  canvasRef,
  camera,
  worldBoxes,
  collapseTagScreenMap,
  parentEdgeGeoms,
  edgeStats,
  spatialIndex,
  hoverNodeId,
  selectedIds,
  marqueeRectScreen,
  marqueeWorldRect,
  dragState,
  editingNodeId,
  imageInteraction,
  primarySelectedNodeId,
  historySnapshot,
  internalClipboardState,
  editorDebugState
);

// persistence（只存 camera）
const { schedulePersistViewport, restoreViewportFromDoc, clearPersistTimer, writeViewportToDoc } =
  usePersistence(props, camera);

let drawRafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let autoPanRafId: number | null = null;
let autoPanLastAt = 0;
const SCROLLBAR_TRACK_PADDING = 6;
const SCROLLBAR_THUMB_MIN = 28;
const isScrollbarDragging = ref(false);
const SCROLLBAR_FIT_PADDING = 140;
const THUMB_RATIO_AT_MIN_SCALE = 0.25;
const THUMB_RATIO_AT_INITIAL_SCALE = 0.4;
const THUMB_RATIO_AT_MAX_SCALE = 0.5;
const DRAG_START_THRESHOLD_PX = 5;
const FAR_THRESHOLD_PX = 80;
const DROP_CHILD_ZONE_RATIO = 0.44;
const DROP_SIBLING_ZONE_PX = 18;
const AUTO_PAN_EDGE_ZONE_PX = 36;
const AUTO_PAN_BASE_SPEED_PX_PER_SEC = 320;
const DRAG_OVERLAY_MAX_WIDTH_PX = 500;
const DRAG_OVERLAY_LINE_HEIGHT_PX = 18;
const DRAG_OVERLAY_ROOT_GAP_PX = 12;
const DRAG_OVERLAY_OFFSET_X_PX = 12;
const DRAG_OVERLAY_OFFSET_Y_PX = 12;
const DRAG_OVERLAY_FONT = '14px system-ui, -apple-system, Segoe UI, sans-serif';
const overlayTextLayoutCache = new Map<string, { nodeId: string; text: string; lines: string[]; lineHeightPx: number }>();

function lerp(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

function getInitialFitScale() {
  const bounds = layoutBounds.value;
  if (!bounds) return 1;
  return fitScaleToViewport(bounds);
}

function getTargetThumbRatio() {
  const scale = camera.value.scale;
  const initialScale = getInitialFitScale();
  const minScale = getMinCameraScale();

  if (scale <= initialScale) {
    const range = Math.max(initialScale - minScale, 0.0001);
    const ratio = (scale - minScale) / range;
    return lerp(THUMB_RATIO_AT_MIN_SCALE, THUMB_RATIO_AT_INITIAL_SCALE, Math.min(1, Math.max(0, ratio)));
  }

  const range = Math.max(MAX_CAMERA_SCALE - initialScale, 0.0001);
  const ratio = (scale - initialScale) / range;
  return lerp(THUMB_RATIO_AT_INITIAL_SCALE, THUMB_RATIO_AT_MAX_SCALE, Math.min(1, Math.max(0, ratio)));
}

function buildScrollbarState(
  viewportSize: number,
  trackSize: number,
  minWorld: number,
  maxWorld: number,
  offset: number
) {
  if (trackSize <= 0) {
    return { visible: false, scrollable: false, thumbSize: 0, thumbOffset: 0, trackSize: 0, minOffset: 0, maxOffset: 0 };
  }

  const constraint = getAxisConstraint(minWorld, maxWorld, viewportSize, camera.value.scale);
  const scrollRange = constraint.maxOffset - constraint.minOffset;
  const targetThumbRatio = getTargetThumbRatio();
  const thumbSize = Math.max(
    SCROLLBAR_THUMB_MIN,
    Math.min(trackSize, trackSize * targetThumbRatio)
  );
  const travel = Math.max(0, trackSize - thumbSize);
  const ratio = scrollRange > 0 ? (constraint.maxOffset - offset) / scrollRange : 0.5;
  return {
    visible: true,
    scrollable: scrollRange > 0,
    thumbSize,
    thumbOffset: travel * Math.min(1, Math.max(0, ratio)),
    trackSize,
    minOffset: constraint.minOffset,
    maxOffset: constraint.maxOffset,
  };
}

const horizontalScrollbar = computed(() => {
  const bounds = getPaddedLayoutBounds(layoutBounds.value, camera.value.scale);
  if (!bounds) return { visible: false, scrollable: false, thumbSize: 0, thumbOffset: 0, trackSize: 0, minOffset: 0, maxOffset: 0 };

  const trackSize = Math.max(0, viewportW.value - SCROLLBAR_TRACK_PADDING * 2);
  return buildScrollbarState(viewportW.value, trackSize, bounds.minX, bounds.maxX, camera.value.tx);
});

const verticalScrollbar = computed(() => {
  const bounds = getPaddedLayoutBounds(layoutBounds.value, camera.value.scale);
  if (!bounds) return { visible: false, scrollable: false, thumbSize: 0, thumbOffset: 0, trackSize: 0, minOffset: 0, maxOffset: 0 };

  const trackSize = Math.max(0, viewportH.value - SCROLLBAR_TRACK_PADDING * 2);
  return buildScrollbarState(viewportH.value, trackSize, bounds.minY, bounds.maxY, camera.value.ty);
});

let scrollbarAxis: 'x' | 'y' | null = null;
let scrollbarStartClient = 0;
let scrollbarStartOffset = 0;
const hasSavedViewport = ref(false);
const hasAppliedInitialFit = ref(false);
const NEW_NODE_TEXT = '新增主题';
const NODE_CLIPBOARD_MIME = 'application/x-mindnodes+json';
const NODE_CLIPBOARD_TEXT_PREFIX = '__MINDNODES__:';
const MARQUEE_START_THRESHOLD_PX = 5;
let mutationFlushRafId: number | null = null;
let pendingMutationReason = 'mutation';
let pendingMutationEnsureVisibleNodeIds = new Set<string>();
let pendingMutationResolvers: Array<() => void> = [];
let pendingMutationShouldMarkDirty = false;
let localDocWatchSuppressionHolds = 0;
let globalDragListenersActive = false;
let isFinalizingInteraction = false;
let removeBeforeCloseListener: null | (() => void) = null;
let collapseTagHideTimer: number | null = null;

const isDirty = computed(() => contentRevision.value !== lastSavedContentRevision.value);

function getFileDisplayName(filePath: string | null | undefined = props.filePath ?? null) {
  if (!filePath) return '思维导图';
  return String(filePath).split(/[\\/]/).filter(Boolean).pop() ?? '思维导图';
}

function emitSaveState(filePath: string | null | undefined = props.filePath ?? null) {
  emit('saveStateChange', {
    isDirty: isDirty.value,
    isSaving: isSaving.value,
    displayName: getFileDisplayName(filePath),
  });
}

function emitNodeCountState() {
  emit('nodeCountChange', {
    totalNodes: Object.keys(getMindNodes() ?? {}).length,
    selectedNodes: getVisibleSelectedNodeCount(),
  });
}

function markContentDirty() {
  contentRevision.value += 1;
}

type InteractionMode =
  | 'idle'
  | 'pointerDownBlank'
  | 'pointerDownOnNode'
  | 'marqueeSelecting'
  | 'draggingNodes';

type DragCandidate = {
  dragRoots: string[];
  primaryDragRootId: string | null;
  rootId: string | null;
  filteredOutDescendantsCount: number;
};

type InteractionState = {
  mode: InteractionMode;
  pointerId: number | null;
  downScreenX: number;
  downScreenY: number;
  downWorldX: number;
  downWorldY: number;
  lastScreenX: number;
  lastScreenY: number;
  lastWorldX: number;
  lastWorldY: number;
  hitNodeId: string | null;
  additiveSelection: boolean;
  baseSelectionIds: string[];
  shouldClearSelectionOnClick: boolean;
  dragCandidate: DragCandidate | null;
};

function createIdleInteractionState(): InteractionState {
  return {
    mode: 'idle',
    pointerId: null,
    downScreenX: 0,
    downScreenY: 0,
    downWorldX: 0,
    downWorldY: 0,
    lastScreenX: 0,
    lastScreenY: 0,
    lastWorldX: 0,
    lastWorldY: 0,
    hitNodeId: null,
    additiveSelection: false,
    baseSelectionIds: [],
    shouldClearSelectionOnClick: false,
    dragCandidate: null,
  };
}

const interactionState = ref<InteractionState>(createIdleInteractionState());

function getMindNodes() {
  if (!props.doc) return null;
  ensureMindRoots(props.doc);
  return props.doc.mind.nodes as Record<string, any>;
}

function createNodeId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `node-${crypto.randomUUID()}`
    : `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRootNodeId() {
  return props.doc?.mind?.roots?.[0]?.rootId ?? props.doc?.mind?.rootId ?? null;
}

function getNodeById(nodeId: string | null | undefined) {
  if (!nodeId) return null;
  const nodes = getMindNodes();
  return nodes?.[nodeId] ?? null;
}

function getVisibleSelectedNodeCount() {
  const nodes = getMindNodes();
  if (!nodes) return 0;

  let count = 0;
  for (const nodeId of selectedIds.value) {
    if (!nodes[nodeId]) continue;

    let currentId = nodeId;
    let hiddenByCollapsedAncestor = false;
    while (true) {
      const parentInfo = findParentAndIndex(currentId);
      if (!parentInfo) break;
      const parentNode = nodes[parentInfo.parentId];
      if (parentNode?.collapsed) {
        hiddenByCollapsedAncestor = true;
        break;
      }
      currentId = parentInfo.parentId;
    }

    if (!hiddenByCollapsedAncestor) count += 1;
  }

  return count;
}

function getPrimarySelectedId() {
  if (primarySelectedNodeId.value && selectedIds.value.has(primarySelectedNodeId.value)) {
    return primarySelectedNodeId.value;
  }
  return selectedIds.value.values().next().value ?? null;
}

function setSingleSelected(nodeId: string | null) {
  setSelection(nodeId ? [nodeId] : [], nodeId);
}

function getSelectedNodeIds() {
  return Array.from(selectedIds.value);
}

const ROOT_SELECTION_GROUP_KEY = '__sheet-root__';

function getRootSelectionIds() {
  return Array.isArray(props.doc?.mind?.roots)
    ? props.doc.mind.roots.map((root: any) => root?.rootId).filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
    : [];
}

function getSelectionGroupKey(nodeId: string | null | undefined) {
  if (!nodeId) return null;
  const parentInfo = findParentAndIndex(nodeId);
  return parentInfo?.parentId ?? ROOT_SELECTION_GROUP_KEY;
}

function getGroupNodeIds(groupKey: string | null) {
  if (!groupKey) return [];
  if (groupKey === ROOT_SELECTION_GROUP_KEY) return getRootSelectionIds();
  const parentNode = getNodeById(groupKey);
  return Array.isArray(parentNode?.children) ? parentNode.children : [];
}

function pruneSelectionAnchors(nextIdsSet: Set<string>) {
  const nextGroupAnchors: Record<string, string> = {};
  for (const [groupKey, anchorId] of Object.entries(selectionAnchorByGroup.value)) {
    if (nextIdsSet.has(anchorId)) nextGroupAnchors[groupKey] = anchorId;
  }
  selectionAnchorByGroup.value = nextGroupAnchors;
  if (selectionAnchorNodeId.value && !nextIdsSet.has(selectionAnchorNodeId.value)) {
    selectionAnchorNodeId.value = null;
  }
}

function setGroupAnchor(nodeId: string | null | undefined) {
  if (!nodeId) return;
  const groupKey = getSelectionGroupKey(nodeId);
  if (!groupKey) return;
  selectionAnchorByGroup.value = {
    ...selectionAnchorByGroup.value,
    [groupKey]: nodeId,
  };
}

function setSelection(
  nodeIds: Iterable<string>,
  primaryId?: string | null,
  options?: { anchorId?: string | null; preserveAnchor?: boolean }
) {
  const nextIds = Array.from(new Set(nodeIds));
  const prevSelection = selectedIds.value;
  const nextIdsSet = new Set(nextIds);
  const nextPrimaryId =
    primaryId && nextIds.includes(primaryId) ? primaryId : nextIds[nextIds.length - 1] ?? null;
  const selectionChanged =
    prevSelection.size !== nextIdsSet.size || nextIds.some((nodeId) => !prevSelection.has(nodeId));
  const primaryChanged = primarySelectedNodeId.value !== nextPrimaryId;

  selectedIds.value = nextIdsSet;
  primarySelectedNodeId.value = nextPrimaryId;
  pruneSelectionAnchors(nextIdsSet);
  if (!nextIds.length) {
    selectionAnchorNodeId.value = null;
    selectionAnchorByGroup.value = {};
    if (selectionChanged || primaryChanged) requestRender();
    return;
  }
  const preservedAnchorId =
    options?.preserveAnchor && selectionAnchorNodeId.value && nextIdsSet.has(selectionAnchorNodeId.value)
      ? selectionAnchorNodeId.value
      : null;
  const explicitAnchorId =
    options && 'anchorId' in options && options.anchorId && nextIdsSet.has(options.anchorId)
      ? options.anchorId
      : null;
  selectionAnchorNodeId.value = preservedAnchorId ?? explicitAnchorId ?? nextPrimaryId;
  if (selectionAnchorNodeId.value) setGroupAnchor(selectionAnchorNodeId.value);
  if (nextPrimaryId) {
    const primaryGroupKey = getSelectionGroupKey(nextPrimaryId);
    if (primaryGroupKey && !selectionAnchorByGroup.value[primaryGroupKey]) {
      setGroupAnchor(nextPrimaryId);
    }
  }
  if (selectionChanged || primaryChanged) requestRender();
}

function getSelectionAnchorId(targetNodeId?: string) {
  const targetGroupKey = getSelectionGroupKey(targetNodeId ?? null);
  if (targetGroupKey) {
    const groupAnchorId = selectionAnchorByGroup.value[targetGroupKey];
    if (groupAnchorId && selectedIds.value.has(groupAnchorId)) return groupAnchorId;
  }
  if (selectionAnchorNodeId.value && selectedIds.value.has(selectionAnchorNodeId.value)) {
    return selectionAnchorNodeId.value;
  }
  return getPrimarySelectedId();
}

function toggleNodeSelection(nodeId: string) {
  const nextSelection = new Set(selectedIds.value);
  if (nextSelection.has(nodeId)) {
    nextSelection.delete(nodeId);
    const nextIds = Array.from(nextSelection);
    const currentPrimary = getPrimarySelectedId();
    const nextPrimaryId =
      currentPrimary && nextSelection.has(currentPrimary) ? currentPrimary : nextIds[nextIds.length - 1] ?? null;
    const nextAnchorId =
      selectionAnchorNodeId.value && nextSelection.has(selectionAnchorNodeId.value)
        ? selectionAnchorNodeId.value
        : nextPrimaryId;
    setSelection(nextSelection, nextPrimaryId, { anchorId: nextAnchorId });
    return;
  }
  nextSelection.add(nodeId);
  setSelection(nextSelection, nodeId, { anchorId: nodeId });
}

function extendSelectionFromAnchor(targetNodeId: string) {
  const anchorId = getSelectionAnchorId(targetNodeId);
  if (!anchorId) {
    setSelection([targetNodeId], targetNodeId, { anchorId: targetNodeId });
    return;
  }
  const nextSelection = new Set(selectedIds.value);
  nextSelection.add(targetNodeId);
  const anchorGroupKey = getSelectionGroupKey(anchorId);
  const targetGroupKey = getSelectionGroupKey(targetNodeId);
  if (anchorGroupKey && targetGroupKey && anchorGroupKey === targetGroupKey) {
    const siblings = getGroupNodeIds(anchorGroupKey);
    const anchorIndex = siblings.indexOf(anchorId);
    const targetIndex = siblings.indexOf(targetNodeId);
    const startIndex = Math.min(anchorIndex, targetIndex);
    const endIndex = Math.max(anchorIndex, targetIndex);
    siblings.slice(startIndex, endIndex + 1).forEach((nodeId: any) => nextSelection.add(nodeId));
  }
  setSelection(nextSelection, targetNodeId, { anchorId, preserveAnchor: true });
  if (targetGroupKey && targetGroupKey !== anchorGroupKey) {
    setGroupAnchor(targetNodeId);
  }
}

function selectAllNodesInCurrentSheet() {
  const nodes = getMindNodes();
  const rootId = getRootNodeId();
  if (!nodes || !rootId || !nodes[rootId]) return;
  const allNodeIds = collectSubtreeNodeIds(nodes, rootId);
  if (!allNodeIds.length) return;
  const currentPrimary = getPrimarySelectedId();
  const nextPrimaryId = currentPrimary && allNodeIds.includes(currentPrimary) ? currentPrimary : allNodeIds[allNodeIds.length - 1];
  setSelection(allNodeIds, nextPrimaryId, { anchorId: nextPrimaryId });
  const nextGroupAnchors: Record<string, string> = {};
  allNodeIds.forEach((nodeId) => {
    const groupKey = getSelectionGroupKey(nodeId);
    if (groupKey && !nextGroupAnchors[groupKey]) nextGroupAnchors[groupKey] = nodeId;
  });
  selectionAnchorByGroup.value = nextGroupAnchors;
}

function getNodeImageDisplaySize(nodeId: string): ImageSize | null {
  const preview = imageInteraction.value;
  if (preview?.nodeId === nodeId && preview.previewSize) return preview.previewSize;
  const image = getNodeImage(getNodeById(nodeId));
  if (!image) return null;
  return { w: image.width, h: image.height };
}

function getNodeImageRect(nodeId: string) {
  const nodeRect = worldBoxes.value.get(nodeId);
  const imageSize = getNodeImageDisplaySize(nodeId);
  if (!nodeRect || !imageSize) return null;
  return getNodeImageWorldRect(getNodeBodyWorldRect(getNodeById(nodeId), nodeRect), imageSize);
}

function collectMarkerTargetNodeIds() {
  const nodes = props.doc?.mind?.nodes;
  const targetIds = new Set<string>();
  if (!nodes) return targetIds;

  for (const nodeId of selectedIds.value) {
    const node = nodes[nodeId];
    if (!node) continue;
    targetIds.add(nodeId);
    if (node.collapsed) {
      for (const descendantId of collectSubtreeNodeIds(nodes, nodeId)) {
        targetIds.add(descendantId);
      }
    }
  }

  return targetIds;
}

function ensureNodeStyleContainers(node: any) {
  if (!node.style) node.style = {};
  if (!node.style.shape) node.style.shape = {};
  if (!node.style.text) node.style.text = {};
  return node.style as NonNullable<typeof node.style>;
}

function normalizeInlineMarks(marks: RichTextMarks | undefined) {
  if (!marks) return undefined;
  const nextMarks = { ...marks };
  for (const key of Object.keys(nextMarks) as Array<keyof RichTextMarks>) {
    if (nextMarks[key] == null || nextMarks[key] === false) delete nextMarks[key];
  }
  return Object.keys(nextMarks).length ? nextMarks : undefined;
}

function applyMarksToAllInlines(doc: RichTextDocument, updater: (marks: RichTextMarks) => void) {
  for (const block of doc.blocks) {
    for (const inline of block.inlines) {
      const marks = { ...(inline.marks ?? {}) };
      updater(marks);
      inline.marks = normalizeInlineMarks(marks);
    }
  }
}

function applyBooleanMarkToAllInlines(doc: RichTextDocument, key: 'bold' | 'italic' | 'underline' | 'strike', enabled: boolean) {
  applyMarksToAllInlines(doc, (marks) => {
    if (enabled) marks[key] = true;
    else delete marks[key];
  });
}

function applyValueMarkToAllInlines<K extends 'fontFamily' | 'fontSize' | 'color'>(
  doc: RichTextDocument,
  key: K,
  value: NonNullable<RichTextMarks[K]>
) {
  applyMarksToAllInlines(doc, (marks) => {
    marks[key] = value;
  });
}

async function applyShapeStyleToSelectedNodes(
  reason: string,
  updater: (shape: Record<string, any>, nodeId: string) => void
) {
  if (editingSession.value || !hasSelectedNodes.value) return;
  const nodes = props.doc?.mind?.nodes;
  if (!nodes) return;

  const targetIds = collectMarkerTargetNodeIds();
  for (const nodeId of targetIds) {
    const node = nodes[nodeId];
    if (!node) continue;
    const style = ensureNodeStyleContainers(node);
    const shape = { ...(style.shape ?? {}) };
    updater(shape, nodeId);
    style.shape = shape;
  }

  await applyDocumentMutation(reason, {
    ensureVisibleNodeIds: Array.from(selectedIds.value),
  });
}

function withActiveLexicalRangeSelection(mutator: (selection: ReturnType<typeof $getSelection>) => void) {
  if (!editingSession.value) return false;
  let applied = false;
  lexicalEditorManager.getActiveEditor().update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection) || selection.isCollapsed()) return;
    applied = true;
    mutator(selection);
  });
  return applied;
}

async function applyTextStyleToSelectedNodes(
  reason: string,
  nonEditingUpdater: (doc: RichTextDocument, node: any) => void,
  editingUpdater?: (selection: NonNullable<ReturnType<typeof $getSelection>>) => void
) {
  if (editingSession.value) {
    if (!editingUpdater) return;
    withActiveLexicalRangeSelection(editingUpdater);
    return;
  }
  if (!hasSelectedNodes.value) return;
  const nodes = props.doc?.mind?.nodes;
  if (!nodes) return;

  const targetIds = collectMarkerTargetNodeIds();
  for (const nodeId of targetIds) {
    const node = nodes[nodeId];
    if (!node) continue;
    const style = ensureNodeStyleContainers(node);
    const richText = cloneRichText(getNodeRichText(node));
    const textStyle = { ...(style.text ?? {}) };
    nonEditingUpdater(richText, textStyle);
    setNodeRichText(node, richText);
    style.text = textStyle;
  }

  await applyDocumentMutation(reason, {
    ensureVisibleNodeIds: Array.from(selectedIds.value),
  });
}

async function onFillPresetSelect(key: StyleFillPresetKey) {
  await applyShapeStyleToSelectedNodes('node-style-fill-preset', (shape) => {
    shape.fillPreset = mapFillPresetKeyToNodePreset(key);
  });
}

async function onFillColorSelect(value: string | string[]) {
  const color = Array.isArray(value) ? value[0] : value;
  if (!color) return;
  await applyShapeStyleToSelectedNodes('node-style-fill-color', (shape) => {
    shape.fill = color;
  });
}

async function onBorderPresetSelect(key: StyleBorderPresetKey) {
  await applyShapeStyleToSelectedNodes('node-style-border-preset', (shape) => {
    shape.borderPreset = mapBorderPresetKeyToNodePreset(key);
  });
}

async function onBorderColorSelect(value: string | string[]) {
  const color = Array.isArray(value) ? value[0] : value;
  if (!color) return;
  await applyShapeStyleToSelectedNodes('node-style-border-color', (shape) => {
    shape.stroke = color;
  });
}

async function onBorderWidthSelect(key: StyleBorderWidthKey) {
  await applyShapeStyleToSelectedNodes('node-style-border-width', (shape) => {
    shape.strokeWidthPx = mapBorderWidthKeyToStrokeWidth(key);
  });
}

async function onFontFamilySelect(key: StyleFontKey) {
  const option = styleFontOptions.find((item) => item.key === key);
  if (!option) return;
  await applyTextStyleToSelectedNodes(
    'node-style-font-family',
    (doc, textStyle) => {
      textStyle.fontFamily = option.fontFamily;
      applyValueMarkToAllInlines(doc, 'fontFamily', option.fontFamily);
    },
    (selection) => {
      $patchStyleText(selection, { 'font-family': option.fontFamily });
      selectedFontKey.value = key;
    }
  );
}

async function onFontSizeSelect(size: number) {
  await applyTextStyleToSelectedNodes(
    'node-style-font-size',
    (doc, textStyle) => {
      textStyle.fontSizePx = size;
      applyValueMarkToAllInlines(doc, 'fontSize', size);
    },
    (selection) => {
      const displaySize = Math.max(1, Number((size * Math.max(camera.value.scale, 0.0001)).toFixed(3)));
      $patchStyleText(selection, { 'font-size': `${displaySize}px` });
      selectedFontSize.value = resolveFontSizeValue(size);
    }
  );
}

async function onTextColorSelect(value: string | string[]) {
  const color = Array.isArray(value) ? value[0] : value;
  if (!color) return;
  await applyTextStyleToSelectedNodes(
    'node-style-text-color',
    (doc, textStyle) => {
      textStyle.color = color;
      applyValueMarkToAllInlines(doc, 'color', color);
    },
    (selection) => {
      $patchStyleText(selection, { color });
      selectedTextColor.value = color;
    }
  );
}

async function onTextToggleClick(key: StyleTextToggleKey) {
  const nextValue = !textToggleState.value[key];
  await applyTextStyleToSelectedNodes(
    `node-style-text-${key}`,
    (doc, textStyle) => {
      if (key === 'bold') textStyle.fontWeight = nextValue ? 700 : 400;
      if (key === 'italic') textStyle.fontStyle = nextValue ? 'italic' : 'normal';
      applyBooleanMarkToAllInlines(doc, key, nextValue);
    },
    (selection) => {
      selection.formatText(key === 'strike' ? 'strikethrough' : key);
      setTextToggleLocally(key, nextValue);
    }
  );
}

async function onTextAlignSelect(key: StyleTextAlignKey) {
  await applyTextStyleToSelectedNodes(
    'node-style-text-align',
    (doc, textStyle) => {
      textStyle.textAlign = key;
      for (const block of doc.blocks) {
        block.align = key;
      }
    },
    () => {
      lexicalEditorManager.getActiveEditor().dispatchCommand(FORMAT_ELEMENT_COMMAND, key);
      selectedTextAlign.value = key;
    }
  );
}

async function applyMarkerToSelectedNodes(markerKey: string) {
  if (!hasSelectedNodes.value) return;
  const nodes = props.doc?.mind?.nodes;
  if (!nodes) return;

  const targetIds = collectMarkerTargetNodeIds();
  for (const nodeId of targetIds) {
    upsertNodeMarker(nodes[nodeId], markerKey);
  }

  await applyDocumentMutation('node-apply-marker', {
    ensureVisibleNodeIds: Array.from(selectedIds.value),
  });
}

async function onMarkerTileClick(markerKey: string) {
  if (!hasSelectedNodes.value) return;
  const nodes = props.doc?.mind?.nodes;
  if (!nodes) return;
  const targetIds = collectMarkerTargetNodeIds();

  for (const nodeId of targetIds) {
    if (isMarkerDeleteMode.value) removeNodeMarker(nodes[nodeId], markerKey);
    else upsertNodeMarker(nodes[nodeId], markerKey);
  }

  await applyDocumentMutation(isMarkerDeleteMode.value ? 'node-remove-marker' : 'node-apply-marker', {
    ensureVisibleNodeIds: Array.from(selectedIds.value),
  });
}

async function clearSelectedNodeMarkers() {
  if (!hasSelectedNodes.value) return;
  const nodes = props.doc?.mind?.nodes;
  if (!nodes) return;

  const targetIds = collectMarkerTargetNodeIds();
  for (const nodeId of targetIds) {
    clearNodeMarkers(nodes[nodeId]);
  }

  await applyDocumentMutation('node-clear-markers', {
    ensureVisibleNodeIds: Array.from(selectedIds.value),
  });
}

function setCanvasCursor(cursor: string) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.style.cursor = cursor;
}

function clearCollapseTagHideTimer() {
  if (collapseTagHideTimer != null) window.clearTimeout(collapseTagHideTimer);
  collapseTagHideTimer = null;
}

function keepCollapseTagVisible(nodeId: string | null) {
  clearCollapseTagHideTimer();
  collapseTagStickyNodeId.value = nodeId;
}

function scheduleCollapseTagHide() {
  clearCollapseTagHideTimer();
  if (!collapseTagStickyNodeId.value) return;
  collapseTagHideTimer = window.setTimeout(() => {
    collapseTagHideTimer = null;
    collapseTagStickyNodeId.value = null;
    requestRender();
  }, 140);
}

function updateImageCursor(screenX: number, screenY: number) {
  const current = imageInteraction.value;
  if (current?.resizing && current.handle) {
    setCanvasCursor(getResizeCursor(current.handle));
    return;
  }
  const target = getPrimarySelectedImageTarget(screenX, screenY);
  if (!target) {
    setCanvasCursor('');
    return;
  }
  if (target.handle && current?.nodeId === target.nodeId && current.selected) {
    setCanvasCursor(getResizeCursor(target.handle));
    return;
  }
  setCanvasCursor('pointer');
}

function clearImageInteraction(reason: string) {
  const current = imageInteraction.value;
  if (!current) return;
  if (current.pointerId != null) releasePointer(current.pointerId, reason);
  imageInteraction.value = null;
  setCanvasCursor('');
}

function upsertImageInteraction(patch: Partial<ImageInteractionState> & Pick<ImageInteractionState, 'nodeId'>) {
  const current = imageInteraction.value;
  const base = current?.nodeId === patch.nodeId
    ? current
    : {
      nodeId: patch.nodeId,
      hovered: false,
      selected: false,
      resizing: false,
      handle: null,
      pointerId: null,
      startPointer: { xScreen: 0, yScreen: 0 },
      startSize: { w: 0, h: 0 },
      previewSize: null,
    } satisfies ImageInteractionState;
  imageInteraction.value = { ...base, ...patch };
}

function getPrimarySelectedImageTarget(screenX: number, screenY: number) {
  if (editingSession.value) return null;
  const nodeId = getPrimarySelectedId();
  if (!nodeId || !selectedIds.value.has(nodeId)) return null;
  const baseImageRect = getNodeImageRect(nodeId);
  if (!baseImageRect) return null;
  const gapWorld = IMAGE_OUTLINE_GAP_PX / Math.max(camera.value.scale, 0.0001);
  const imageRect =
    imageInteraction.value?.nodeId === nodeId && imageInteraction.value.selected
      ? inflateImageWorldRect(baseImageRect, gapWorld)
      : baseImageRect;
  if (!imageRect) return null;
  const worldPoint = screenToWorld(camera.value, screenX, screenY);
  const handle =
    imageInteraction.value?.nodeId === nodeId && imageInteraction.value.selected
      ? hitTestImageHandle(worldPoint.x, worldPoint.y, imageRect, camera.value.scale)
      : null;
  if (handle) return { nodeId, imageRect, handle };
  if (!pointInImageWorldRect(worldPoint.x, worldPoint.y, imageRect)) return null;
  return { nodeId, imageRect, handle: null as ImageResizeHandle | null };
}

function updateImageHover(screenX: number, screenY: number) {
  if (collapseTagHoverNodeId.value) {
    setCanvasCursor('pointer');
    const current = imageInteraction.value;
    if (current?.hovered && !current.resizing) {
      imageInteraction.value = { ...current, hovered: false };
      requestRender();
    }
    return;
  }
  if (editingSession.value) {
    setCanvasCursor('');
    return;
  }
  if (imageInteraction.value?.resizing) return;
  const target = getPrimarySelectedImageTarget(screenX, screenY);
  const current = imageInteraction.value;
  if (!target) {
    updateImageCursor(screenX, screenY);
    if (!current) return;
    if (current.selected) {
      if (!current.hovered) return;
      imageInteraction.value = { ...current, hovered: false };
      requestRender();
      return;
    }
    imageInteraction.value = null;
    requestRender();
    return;
  }
  updateImageCursor(screenX, screenY);
  upsertImageInteraction({
    nodeId: target.nodeId,
    hovered: true,
    selected: current?.nodeId === target.nodeId ? current.selected : false,
    resizing: false,
    handle: null,
    pointerId: null,
    previewSize: current?.nodeId === target.nodeId ? current.previewSize : null,
    startPointer: current?.nodeId === target.nodeId ? current.startPointer : { xScreen: 0, yScreen: 0 },
    startSize: current?.nodeId === target.nodeId ? current.startSize : { w: 0, h: 0 },
  });
  requestRender();
}

function startImageResize(nodeId: string, handle: ImageResizeHandle, pointerId: number, screenX: number, screenY: number) {
  const startSize = getNodeImageDisplaySize(nodeId);
  if (!startSize) return;
  capturePointer(pointerId, 'image-resize');
  setCanvasCursor(getResizeCursor(handle));
  upsertImageInteraction({
    nodeId,
    hovered: true,
    selected: true,
    resizing: true,
    handle,
    pointerId,
    startPointer: { xScreen: screenX, yScreen: screenY },
    startSize,
    previewSize: { ...startSize },
  });
  requestRender();
}

function updateImageResizePreview(screenX: number, screenY: number) {
  const current = imageInteraction.value;
  if (!current?.resizing || !current.handle) return;
  imageInteraction.value = {
    ...current,
    hovered: true,
    previewSize: computeImagePreviewSize({
      handle: current.handle,
      startSize: current.startSize,
      deltaScreenX: screenX - current.startPointer.xScreen,
      deltaScreenY: screenY - current.startPointer.yScreen,
      cameraScale: camera.value.scale,
    }),
  };
  requestRender();
}

function finishImageResize(commit: boolean, reason: string) {
  const current = imageInteraction.value;
  if (!current) return;
  const nodeId = current.nodeId;
  const previewSize = current.previewSize;
  clearImageInteraction(reason);
  if (!commit || !previewSize) {
    requestRender();
    return;
  }
  const node = getNodeById(nodeId);
  const image = getNodeImage(node);
  if (!node || !image) {
    requestRender();
    return;
  }
  const clampedSize = clampImageSize(previewSize);
  const nextWidth = Math.round(clampedSize.w);
  const nextHeight = Math.round(clampedSize.h);
  if (image.width === nextWidth && image.height === nextHeight) {
    upsertImageInteraction({
      nodeId,
      hovered: false,
      selected: true,
      resizing: false,
      handle: null,
      pointerId: null,
      startPointer: { xScreen: 0, yScreen: 0 },
      startSize: { w: nextWidth, h: nextHeight },
      previewSize: null,
    });
    requestRender();
    return;
  }
  executeCommand(
    createSetNodeImageSizeCommand(
      {
        getNodes: getMindNodes,
        setSelection,
        applyMutation: applyDocumentMutation,
      },
      {
        nodeId,
        beforeSize: { width: image.width, height: image.height },
        afterSize: { width: nextWidth, height: nextHeight },
        previousSelection: snapshotSelection(),
        nextSelection: { ids: [nodeId], primaryId: nodeId },
      }
    )
  );
  upsertImageInteraction({
    nodeId,
    hovered: false,
    selected: true,
    resizing: false,
    handle: null,
    pointerId: null,
    startPointer: { xScreen: 0, yScreen: 0 },
    startSize: { w: nextWidth, h: nextHeight },
    previewSize: null,
  });
}

function snapshotSelection(): SelectionSnapshot {
  return {
    ids: getSelectedNodeIds(),
    primaryId: getPrimarySelectedId(),
  };
}

function resolveFallbackSelection(preferredId: string | null, parentId?: string | null) {
  const nodes = getMindNodes();
  if (!nodes) return null;
  if (preferredId && nodes[preferredId]) return preferredId;
  if (parentId && nodes[parentId]) return parentId;
  const rootId = props.doc?.mind?.roots?.[0]?.rootId ?? props.doc?.mind?.rootId ?? null;
  return rootId && nodes[rootId] ? rootId : null;
}

const editingOverlayRootStyle = computed<CSSProperties>(() => {
  if (!editingSession.value) return { display: 'none' };
  return {};
});

const editingCanvasTopLeadingPx = computed(() => {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  const canvas = canvasRef.value;
  if (!session || !node || !canvas) return 0;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId: session.nodeId });
  return measureTextVerticalMetrics(ctx, {
    font: textStyle.canvasFontString,
    fontSizePx: textStyle.fontSizePx,
    lineHeightPx: textStyle.lineHeightPx,
  }).topLeadingPx;
});

function getEditingTextBoxRectForNode(
  nodeId: string | null | undefined,
  lexicalState: SerializedLexicalEditorState,
  preview = editingPreview.value
) {
  const node = getNodeById(nodeId);
  const worldRect = nodeId ? worldBoxes.value.get(nodeId) : null;
  const canvas = canvasRef.value;
  if (!nodeId || !node || !worldRect || !canvas) return null;
  const rect = getNodeBodyWorldRect(node, worldRect);
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId });
  const previewRichText = richTextFromLexicalState(lexicalState);
  const textLayout = measureNodeTextLayout(ctx, previewRichText, new Map(), {
    maxWidth: preview?.nodeId === nodeId
      ? Math.max(1, preview.computedNodeW - NODE_PADDING_X)
      : NODE_CONTENT_MAX_W,
    baseStyle: textStyle,
  });
  const image = getNodeImage(node);
  const activePreview = preview?.nodeId === nodeId ? preview : null;
  const textGeometry = computeNodeTextGeometry(ctx, textLayout, textStyle, image);
  return {
    x: rect.x1 + NODE_TEXT_INSET_X,
    y: rect.y1 + textGeometry.textLineBoxTop,
    width: Math.max(1, (activePreview?.computedNodeW ?? rect.x2 - rect.x1) - NODE_TEXT_INSET_X * 2),
    height: textGeometry.textLineBoxHeight,
  };
}

function ensureWorldBoxVisible(box: { x: number; y: number; width: number; height: number }, paddingPx = 32) {
  const topLeft = worldToScreen(camera.value, box.x, box.y);
  const bottomRight = worldToScreen(camera.value, box.x + box.width, box.y + box.height);
  const viewportRight = viewportW.value - paddingPx;
  const viewportBottom = viewportH.value - paddingPx;
  const boxWidth = bottomRight.x - topLeft.x;
  const boxHeight = bottomRight.y - topLeft.y;

  let dx = 0;
  if (boxWidth <= viewportW.value - paddingPx * 2) {
    if (topLeft.x < paddingPx) dx = paddingPx - topLeft.x;
    else if (bottomRight.x > viewportRight) dx = viewportRight - bottomRight.x;
  } else if (topLeft.x !== paddingPx) {
    dx = paddingPx - topLeft.x;
  }

  let dy = 0;
  if (boxHeight <= viewportH.value - paddingPx * 2) {
    if (topLeft.y < paddingPx) dy = paddingPx - topLeft.y;
    else if (bottomRight.y > viewportBottom) dy = viewportBottom - bottomRight.y;
  } else if (topLeft.y !== paddingPx) {
    dy = paddingPx - topLeft.y;
  }

  if (dx === 0 && dy === 0) return;
  panByPixels(dx, dy);
  constrainToBounds();
  requestRender();
}

const editingTextBoxRect = computed(() => {
  const session = editingSession.value;
  return getEditingTextBoxRectForNode(session?.nodeId, editingDraftLexicalState.value);
});

const editingScreenTextBoxRect = computed(() => {
  const textBoxRect = editingTextBoxRect.value;
  if (!textBoxRect) return null;
  return {
    x: textBoxRect.x * camera.value.scale + camera.value.tx,
    y: textBoxRect.y * camera.value.scale + camera.value.ty,
    width: Math.max(1, textBoxRect.width * camera.value.scale),
    height: Math.max(1, textBoxRect.height * camera.value.scale),
  };
});

const editingEditorShellStyle = computed<CSSProperties>(() => {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  const textBoxRect = editingScreenTextBoxRect.value;
  if (!session || !node || !textBoxRect) {
    return { display: 'none' };
  }
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId: session?.nodeId ?? null });
  const scale = camera.value.scale;

  return {
    position: 'absolute',
    left: `${textBoxRect.x}px`,
    top: `${textBoxRect.y}px`,
    width: `${textBoxRect.width}px`,
    height: `${textBoxRect.height}px`,
    fontFamily: textStyle.fontFamily,
    fontSize: `${textStyle.fontSizePx * scale}px`,
    fontWeight: `${textStyle.fontWeight}`,
    fontStyle: textStyle.fontStyle,
    lineHeight: `${textStyle.lineHeightPx * scale}px`,
    letterSpacing: `${textStyle.letterSpacingPx * scale}px`,
    padding: '0',
    margin: '0',
    border: '0',
    outline: 'none',
    overflow: 'hidden',
    background: 'transparent',
    color: textStyle.color,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    textAlign: textStyle.textAlign,
    zIndex: '6',
    boxShadow: 'none',
    borderRadius: '0',
    boxSizing: 'content-box',
  };
});


const editingCalibrationStyle = computed(() => {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  if (!session || !node) return null;
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId: session?.nodeId ?? null });
  const scale = camera.value.scale;
  return {
    fontFamily: textStyle.fontFamily,
    fontSizePx: textStyle.fontSizePx * scale,
    fontWeight: textStyle.fontWeight,
    fontStyle: textStyle.fontStyle,
    lineHeightPx: textStyle.lineHeightPx * scale,
    letterSpacingPx: textStyle.letterSpacingPx * scale,
  };
});

const editingOverlayInnerTranslateYPx = computed(() => {
  const style = editingCalibrationStyle.value;
  if (!style) return 0;
  return Math.max(0, editingCanvasTopLeadingPx.value * camera.value.scale - getDomTextTopOffset(style));
});

let editingRelayoutRafId: number | null = null;
let editingRelayoutCount = 0;

function clampNodeDimension(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function relayoutEditingPreviewNow() {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  const canvas = canvasRef.value;
  if (!session || !node || !canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const image = getNodeImage(node);
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId: session?.nodeId ?? null });
  const liveRichText = richTextFromLexicalState(editingDraftLexicalState.value);
  const measuredLayout = measureNodeTextLayout(ctx, liveRichText, new Map(), {
    maxWidth: NODE_TEXT_MAX_WIDTH_PX,
    baseStyle: textStyle,
  });
  const textGeometry = computeNodeTextGeometry(ctx, measuredLayout, textStyle, image);
  const markerRow = measureNodeMarkerRow(node);
  let computedNodeW = clampNodeDimension(
    Math.max(Math.max(measuredLayout.contentWidth, image?.width ?? 0) + NODE_PADDING_X, markerRow.width),
    Math.max(NODE_MIN_W, markerRow.width),
    NODE_W_HARD_MAX
  );
  let computedNodeH = textGeometry.contentBoxTop + textGeometry.contentBoxHeight + markerRow.bandHeight;
  if (computedNodeW > NODE_W_HARD_MAX || computedNodeH > NODE_H_HARD_MAX) {
    console.warn('node size clamped', { nodeId: session.nodeId, computedNodeW, computedNodeH });
    computedNodeW = Math.min(computedNodeW, NODE_W_HARD_MAX);
    computedNodeH = Math.min(computedNodeH, NODE_H_HARD_MAX);
  }

  editingPreview.value = {
    nodeId: session.nodeId,
    liveLexicalState: cloneLexicalState(editingDraftLexicalState.value),
    measuredTextW: measuredLayout.contentWidth,
    measuredTextH: measuredLayout.contentHeight,
    computedNodeW,
    computedNodeH,
  };
  rebuildLayout();
  rebuildSpatialCaches();
  editingRelayoutCount += 1;
  requestRender();
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-edit-input]', {
      nodeId: session.nodeId,
      textLen: getNodePlainText({ textLexical: editingDraftLexicalState.value }).length,
      measuredTextW: measuredLayout.contentWidth,
      measuredTextH: measuredLayout.contentHeight,
      computedNodeW,
      computedNodeH,
      relayoutCount: editingRelayoutCount,
    });
  }
}

function scheduleEditingPreviewRelayout() {
  if (editingRelayoutRafId != null) return;
  editingRelayoutRafId = requestAnimationFrame(() => {
    editingRelayoutRafId = null;
    relayoutEditingPreviewNow();
  });
}

function clearEditingPreviewLayout() {
  if (editingRelayoutRafId != null) cancelAnimationFrame(editingRelayoutRafId);
  editingRelayoutRafId = null;
  if (!editingPreview.value) return;
  editingPreview.value = null;
  rebuildLayout();
  rebuildSpatialCaches();
  requestRender();
}

function startEditing(
  nodeId: string,
  options?: { mode?: 'append' | 'replace'; insertedText?: string; caretPlacement?: 'start' | 'end' | 'none' }
) {
  clearImageInteraction('start-text-editing');
  const node = getNodeById(nodeId);
  if (!node) return;
  const initialLexicalState = getNodeLexicalState(node);
  const mode = options?.mode ?? 'append';
  const insertedText = options?.insertedText ?? '';
  const caretPlacement = options?.caretPlacement ?? 'end';
  const nextLexicalState =
    mode === 'replace' ? lexicalStateFromPlainText(insertedText) : cloneLexicalState(initialLexicalState);
  const initialTextBoxRect = getEditingTextBoxRectForNode(nodeId, nextLexicalState, null);
  if (initialTextBoxRect) ensureWorldBoxVisible(initialTextBoxRect);
  editingSession.value = {
    nodeId,
    initialLexicalState: cloneLexicalState(initialLexicalState),
    mode,
    caretPlacement,
  };
  editingDraftLexicalState.value = nextLexicalState;
  editingNodeId.value = nodeId;
  const currentRect = worldBoxes.value.get(nodeId);
  editingPreview.value = currentRect
    ? {
      nodeId,
      liveLexicalState: cloneLexicalState(nextLexicalState),
      measuredTextW: Math.max(1, currentRect.x2 - currentRect.x1 - NODE_PADDING_X),
      measuredTextH: Math.max(NODE_LINE_HEIGHT, currentRect.y2 - currentRect.y1 - NODE_TEXT_INSET_Y * 2),
      computedNodeW: Math.ceil(currentRect.x2 - currentRect.x1),
      computedNodeH: Math.ceil(currentRect.y2 - currentRect.y1),
    }
    : null;
  if (DEBUG_CANVAS_OVERLAY) console.debug('[mind-start-editing]', { nodeId, mode });
  void nextTick().then(() => {
    if (DEBUG_CANVAS_OVERLAY) {
      const overlayRoot = document.querySelector('.lexical-editor-root');
      const overlayStyle = overlayRoot instanceof HTMLElement ? window.getComputedStyle(overlayRoot) : null;
      console.debug('[mind-enter-editing]', {
        nodeId,
        mode,
        initialTextLen: getNodePlainText(node).length,
        appliedFont: getNodeTextStyle(node, { doc: props.doc, nodeId }),
        canvasFontString: getNodeTextStyle(node, { doc: props.doc, nodeId }).canvasFontString,
        overlayComputedStyle: overlayStyle
          ? {
            fontSize: overlayStyle.fontSize,
            fontWeight: overlayStyle.fontWeight,
            fontFamily: overlayStyle.fontFamily,
            lineHeight: overlayStyle.lineHeight,
          }
          : null,
      });
    }
  });
}

function stopEditingSession() {
  clearImageInteraction('stop-text-editing');
  editingSession.value = null;
  editingDraftLexicalState.value = getNodeLexicalState(null);
  editingNodeId.value = null;
  lexicalEditorManager.stopSession();
  clearEditingPreviewLayout();
}

function commitEditingSession() {
  const session = editingSession.value;
  if (!session) return;
  const afterLexicalState = cloneLexicalState(editingDraftLexicalState.value);
  const node = getNodeById(session.nodeId);
  if (!node) {
    stopEditingSession();
    return;
  }
  if (isLexicalStateEqual(afterLexicalState, session.initialLexicalState)) {
    stopEditingSession();
    setSingleSelected(session.nodeId);
    requestRender();
    return;
  }
  executeCommand(
    createUpdateNodeLexicalStateCommand(
      {
        getNodes: getMindNodes,
        setSelection,
        applyMutation: applyDocumentMutation,
      },
      {
        nodeId: session.nodeId,
        beforeLexicalStateJSON: session.initialLexicalState,
        afterLexicalStateJSON: afterLexicalState,
        previousSelection: snapshotSelection(),
        nextSelection: { ids: [session.nodeId], primaryId: session.nodeId },
      }
    )
  );
  stopEditingSession();
}

function cancelEditingSession() {
  const session = editingSession.value;
  if (!session) return;
  stopEditingSession();
  setSingleSelected(session.nodeId);
  requestRender();
}

function onLexicalEditorChange(state: SerializedLexicalEditorState) {
  const scale = Math.max(camera.value.scale, 0.0001);
  editingDraftLexicalState.value = scaleLexicalStateFontSizes(state, 1 / scale);
  scheduleEditingPreviewRelayout();
}

function setLastDeletedNodeId(nodeId: string | null) {
  editorDebugState.value.lastDeletedNodeId = nodeId;
}

function setLastPastedRootId(nodeId: string | null) {
  editorDebugState.value.lastPastedRootId = nodeId;
}

function setFilteredOutDescendantsCount(count: number) {
  editorDebugState.value.filteredOutDescendantsCount = count;
}

function resetCommandDebugState() {
  editorDebugState.value.rebuildCountInLastCommand = 0;
}

function queueEnsureVisibleNodeIds(nodeIds?: string[] | null) {
  if (!nodeIds?.length) return;
  for (const nodeId of nodeIds) {
    if (nodeId) pendingMutationEnsureVisibleNodeIds.add(nodeId);
  }
}

function holdLocalDocWatchSuppression() {
  localDocWatchSuppressionHolds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    requestAnimationFrame(() => {
      localDocWatchSuppressionHolds = Math.max(0, localDocWatchSuppressionHolds - 1);
    });
  };
}

function isLocalDocWatchSuppressed() {
  return localDocWatchSuppressionHolds > 0 || mutationFlushRafId != null || pendingMutationResolvers.length > 0;
}

async function flushScheduledDocumentMutation() {
  mutationFlushRafId = null;
  const ensureVisibleNodeIds = [...pendingMutationEnsureVisibleNodeIds];
  const reason = pendingMutationReason;
  const resolvers = pendingMutationResolvers;
  const shouldMarkDirty = pendingMutationShouldMarkDirty;
  pendingMutationEnsureVisibleNodeIds = new Set();
  pendingMutationResolvers = [];
  pendingMutationReason = 'mutation';
  pendingMutationShouldMarkDirty = false;

  editorDebugState.value.rebuildCountInLastCommand += 1;
  const metrics = await redrawAllInternal(reason, { restoreViewport: false });
  if (ensureVisibleNodeIds.length) ensureNodesVisible(ensureVisibleNodeIds);
  if (shouldMarkDirty) markContentDirty();

  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-rebuild-flush]', {
      reason,
      layoutRebuildMs: Number(metrics.layoutRebuildMs.toFixed(2)),
      edgesRebuildMs: Number(metrics.edgesRebuildMs.toFixed(2)),
      roughDrawableRegenCount: null,
      totalMs: Number(metrics.totalMs.toFixed(2)),
      ensureVisibleNodeIds,
    });
  }

  resolvers.forEach((resolve) => resolve());
}

async function applyDocumentMutation(
  reason: string,
  options?: { ensureVisibleNodeId?: string | null; ensureVisibleNodeIds?: string[]; markDirty?: boolean }
) {
  const releaseDocWatchSuppression = holdLocalDocWatchSuppression();
  pendingMutationReason = reason;
  pendingMutationShouldMarkDirty = pendingMutationShouldMarkDirty || options?.markDirty !== false;
  queueEnsureVisibleNodeIds(options?.ensureVisibleNodeIds);
  queueEnsureVisibleNodeIds(options?.ensureVisibleNodeId ? [options.ensureVisibleNodeId] : []);

  return await new Promise<void>((resolve) => {
    pendingMutationResolvers.push(() => {
      releaseDocWatchSuppression();
      resolve();
    });
    if (mutationFlushRafId != null) return;
    mutationFlushRafId = requestAnimationFrame(() => {
      void flushScheduledDocumentMutation();
    });
  });
}

async function flushPendingDocumentMutation() {
  if (mutationFlushRafId == null && pendingMutationResolvers.length === 0) return;
  if (mutationFlushRafId != null) {
    cancelAnimationFrame(mutationFlushRafId);
  }
  await flushScheduledDocumentMutation();
}

function createNodeRecord(nodeId: string, initialText = NEW_NODE_TEXT) {
  const lexicalState = lexicalStateFromPlainText(initialText);
  return {
    id: nodeId,
    text: { plain: initialText },
    richText: richTextFromLexicalState(lexicalState),
    textLexical: lexicalState,
    style: null,
    children: [],
    images: [],
    image: null,
  };
}

function getDocumentTitleForSave() {
  const rootId = getRootNodeId();
  const rootNode = getNodeById(rootId);
  const rootTitle = getNodePlainText(rootNode).trim();
  return rootTitle || props.doc?.manifest?.title || '中心主题';
}

function getSaveAsBaseName() {
  const normalizedRootText = getDocumentTitleForSave()
    .replace(/\s+/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim();
  return normalizedRootText || '思维导图';
}

async function syncDocumentToMainProcess() {
  if (!props.doc || !props.docId) return null;
  ensureMindRoots(props.doc);
  props.doc.manifest = props.doc.manifest || {};
  props.doc.manifest.title = getDocumentTitleForSave();
  writeViewportToDoc();
  const plain = toPlainDoc(props.doc);
  await window.electronAPI.amind.docUpdate({ docId: props.docId, doc: plain });
  return plain;
}

async function flushForSave() {
  if (!props.doc || !props.docId) return null;
  clearPersistTimer();
  if (editingSession.value) commitEditingSession();
  await flushPendingDocumentMutation();
  return await syncDocumentToMainProcess();
}

function applySaveResult(result: { filePath?: string | null; savedAt?: string | null; title?: string | null } | null | undefined) {
  if (!result) return props.filePath ?? null;
  if (props.doc?.manifest) {
    if (typeof result.savedAt === 'string' && result.savedAt) {
      props.doc.manifest.updatedAt = result.savedAt;
    }
    if (typeof result.title === 'string' && result.title) {
      props.doc.manifest.title = result.title;
    }
  }
  lastSavedContentRevision.value = contentRevision.value;
  saveError.value = null;
  if (typeof result.filePath === 'string') {
    emit('filePathChange', result.filePath);
    return result.filePath;
  }
  return props.filePath ?? null;
}

function notifySaveFailure(error: unknown) {
  const message = error instanceof Error ? error.message : '保存失败';
  saveError.value = message;
  console.error('[mind-save]', error);
  window.alert(message);
}

function waitForMinimumDuration(startedAt: number, minimumMs: number) {
  const elapsed = Date.now() - startedAt;
  if (elapsed >= minimumMs) return Promise.resolve();
  return new Promise<void>((resolve) => {
    window.setTimeout(resolve, minimumMs - elapsed);
  });
}

async function saveDocumentAs(options?: { skipPrepare?: boolean }) {
  if (!props.docId || isSaving.value) return false;
  let nextFilePath = props.filePath ?? null;
  const startedAt = Date.now();
  isSaving.value = true;
  emitSaveState(nextFilePath);
  try {
    if (!options?.skipPrepare) {
      const prepared = await flushForSave();
      if (!prepared) return false;
    }
    const defaultPath = props.filePath ?? `${getSaveAsBaseName()}.amind`;
    const result = await window.electronAPI.amind.saveAsDialog({
      docId: props.docId,
      defaultPath,
    });
    if (!result) return false;
    nextFilePath = applySaveResult(result);
    return true;
  } catch (error) {
    notifySaveFailure(error);
    return false;
  } finally {
    await waitForMinimumDuration(startedAt, 1000);
    isSaving.value = false;
    emitSaveState(nextFilePath);
  }
}

async function saveDocument() {
  if (!props.docId || isSaving.value) return false;
  if (!props.filePath) {
    return await saveDocumentAs();
  }
  let nextFilePath = props.filePath ?? null;
  const startedAt = Date.now();
  isSaving.value = true;
  emitSaveState(nextFilePath);
  try {
    const prepared = await flushForSave();
    if (!prepared) return false;
    const result = await window.electronAPI.amind.save({ docId: props.docId });
    if (result?.needSaveAs) {
      return await saveDocumentAs({ skipPrepare: true });
    }
    nextFilePath = applySaveResult(result);
    return true;
  } catch (error) {
    notifySaveFailure(error);
    return false;
  } finally {
    await waitForMinimumDuration(startedAt, 1000);
    isSaving.value = false;
    emitSaveState(nextFilePath);
  }
}

defineExpose({
  saveDocument,
  saveDocumentAs,
});

function findParentAndIndex(nodeId: string) {
  const nodes = getMindNodes();
  if (!nodes) return null;
  for (const [parentId, parentNode] of Object.entries(nodes)) {
    const children = Array.isArray(parentNode?.children) ? parentNode.children : [];
    const index = children.indexOf(nodeId);
    if (index >= 0) return { parentId, index };
  }
  return null;
}

function getNodeRootId(nodeId: string) {
  const nodes = getMindNodes();
  if (!nodes?.[nodeId]) return null;
  let currentId = nodeId;
  while (true) {
    const parentInfo = findParentAndIndex(currentId);
    if (!parentInfo) return currentId;
    currentId = parentInfo.parentId;
  }
}

function getNodeLabel(nodeId: string) {
  return getNodePlainText(getNodeById(nodeId)) || '新增主题';
}

function getDragOverlayTextLayout(nodeId: string, text: string) {
  const cacheKey = `${nodeId}:${text}:${DRAG_OVERLAY_FONT}:${DRAG_OVERLAY_MAX_WIDTH_PX}`;
  const cached = overlayTextLayoutCache.get(cacheKey);
  if (cached) return cached;

  const canvas = canvasRef.value;
  const ctx = canvas?.getContext('2d');
  if (!ctx) {
    const fallback = {
      nodeId,
      text,
      lines: text.split('\n'),
      lineHeightPx: DRAG_OVERLAY_LINE_HEIGHT_PX,
    };
    overlayTextLayoutCache.set(cacheKey, fallback);
    return fallback;
  }

  ctx.save();
  ctx.font = DRAG_OVERLAY_FONT;
  const layout = layoutOverlayTextLines(text, ctx, DRAG_OVERLAY_MAX_WIDTH_PX, DRAG_OVERLAY_LINE_HEIGHT_PX);
  ctx.restore();

  const cachedLayout = {
    nodeId,
    text,
    lines: layout.lines,
    lineHeightPx: layout.lineHeightPx,
  };
  overlayTextLayoutCache.set(cacheKey, cachedLayout);
  return cachedLayout;
}

function normalizeDragRootsFromIds(nodeIds: string[]) {
  const nodes = getMindNodes();
  if (!nodes) {
    return { finalTargets: [], rootId: null, invalidReason: 'missingNodes', filteredOutDescendantsCount: 0 };
  }
  const normalized = normalizeSelectionTargets(nodes, nodeIds, {
    rootNodeId: getRootNodeId(),
    allowRoot: false,
  });
  const rootIds = Array.from(new Set(normalized.finalTargets.map((target) => getNodeRootId(target.nodeId)).filter(Boolean)));
  if (!normalized.finalTargets.length) {
    return { finalTargets: [], rootId: null, invalidReason: 'rootNotDraggable', filteredOutDescendantsCount: normalized.filteredOutDescendantsCount };
  }
  if (rootIds.length !== 1) {
    return { finalTargets: [], rootId: null, invalidReason: 'crossRoot', filteredOutDescendantsCount: normalized.filteredOutDescendantsCount };
  }
  return {
    finalTargets: normalized.finalTargets,
    rootId: rootIds[0] ?? null,
    invalidReason: null,
    filteredOutDescendantsCount: normalized.filteredOutDescendantsCount,
  };
}

function collectDraggedSubtreeIds(rootIds: string[]) {
  const nodes = getMindNodes();
  const collected = new Set<string>();
  if (!nodes) return collected;
  for (const rootId of rootIds) {
    for (const nodeId of collectSubtreeNodeIds(nodes, rootId)) {
      collected.add(nodeId);
    }
  }
  return collected;
}

function setDragState(next: Partial<DragDropState>) {
  dragState.value = {
    ...dragState.value,
    ...next,
  };
}

function cloneDropTarget(target: DragDropTarget | null) {
  return target ? { ...target } : null;
}

function hashChildrenMap(childrenByParent: Record<string, string[]>) {
  return Object.entries(childrenByParent)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([parentId, children]) => `${parentId}:${children.join(',')}`)
    .join('|');
}

function logInteractionTransition(reason: string, nextMode: InteractionMode, details?: Record<string, unknown>) {
  if (!DEBUG_CANVAS_OVERLAY) return;
  console.debug('[mind-interaction]', {
    reason,
    from: interactionState.value.mode,
    to: nextMode,
    pointerId: interactionState.value.pointerId,
    ...details,
  });
}

function setInteractionState(next: Partial<InteractionState>) {
  interactionState.value = {
    ...interactionState.value,
    ...next,
  };
}

function transitionInteraction(reason: string, nextMode: InteractionMode, next: Partial<InteractionState> = {}) {
  logInteractionTransition(reason, nextMode, next);
  interactionState.value = {
    ...interactionState.value,
    ...next,
    mode: nextMode,
  };
}

function resetDragState() {
  dragState.value = {
    isDragging: false,
    dragRoots: [],
    dragRootTexts: [],
    dragRootTextLayouts: [],
    primaryDragRootId: null,
    rootId: null,
    draggedSubtreeNodeIds: new Set(),
    cursorScreenX: 0,
    cursorScreenY: 0,
    dropTarget: null,
    lastValidDropTarget: null,
    invalidReason: null,
    filteredOutDescendantsCount: 0,
    autoPanActive: false,
    autoPanVelocityX: 0,
    autoPanVelocityY: 0,
  };
}

function distanceScreenToRect(sx: number, sy: number, rect: { x1: number; y1: number; x2: number; y2: number }) {
  const dx = sx < rect.x1 ? rect.x1 - sx : sx > rect.x2 ? sx - rect.x2 : 0;
  const dy = sy < rect.y1 ? rect.y1 - sy : sy > rect.y2 ? sy - rect.y2 : 0;
  return Math.hypot(dx, dy);
}

function resolveDropTarget(screenX: number, screenY: number): { target: DragDropTarget | null; invalidReason: string | null } {
  const currentDrag = dragState.value;
  const nodes = getMindNodes();
  if (!currentDrag.isDragging || !nodes) return { target: null, invalidReason: null };

  const worldRadius = FAR_THRESHOLD_PX / Math.max(camera.value.scale, 0.0001);
  const worldPoint = screenToWorld(camera.value, screenX, screenY);
  const candidates = spatialIndex.queryRect({
    x1: worldPoint.x - worldRadius,
    y1: worldPoint.y - worldRadius,
    x2: worldPoint.x + worldRadius,
    y2: worldPoint.y + worldRadius,
  });

  let bestTarget: DragDropTarget | null = null;
  let bestDistance = Number.POSITIVE_INFINITY;
  let invalidReason: string | null = 'tooFar';

  for (const nodeId of candidates) {
    if (currentDrag.draggedSubtreeNodeIds.has(nodeId)) {
      invalidReason = 'intoDescendant';
      continue;
    }
    if (getNodeRootId(nodeId) !== currentDrag.rootId) {
      invalidReason = 'crossRoot';
      continue;
    }
    const rect = worldBoxes.value.get(nodeId);
    if (!rect) continue;
    const topLeft = worldToScreen(camera.value, rect.x1, rect.y1);
    const bottomRight = worldToScreen(camera.value, rect.x2, rect.y2);
    const screenRect = { x1: topLeft.x, y1: topLeft.y, x2: bottomRight.x, y2: bottomRight.y };
    const distance = distanceScreenToRect(screenX, screenY, screenRect);
    if (distance > FAR_THRESHOLD_PX || distance > bestDistance) continue;

    const screenHeight = screenRect.y2 - screenRect.y1;
    const siblingZone = Math.min(DROP_SIBLING_ZONE_PX, screenHeight * 0.28);
    const topBoundary = screenRect.y1 + siblingZone;
    const bottomBoundary = screenRect.y2 - siblingZone;
    const parentInfo = findParentAndIndex(nodeId);

    let candidate: DragDropTarget | null = null;
    if (screenY < topBoundary) {
      if (!parentInfo) {
        invalidReason = 'rootSiblingUnsupported';
        continue;
      }
      if (currentDrag.draggedSubtreeNodeIds.has(parentInfo.parentId)) {
        invalidReason = 'intoDescendant';
        continue;
      }
      candidate = {
        type: 'sibling-before',
        targetNodeId: nodeId,
        toParentId: parentInfo.parentId,
        toIndex: parentInfo.index,
      };
    } else if (screenY > bottomBoundary) {
      if (!parentInfo) {
        invalidReason = 'rootSiblingUnsupported';
        continue;
      }
      if (currentDrag.draggedSubtreeNodeIds.has(parentInfo.parentId)) {
        invalidReason = 'intoDescendant';
        continue;
      }
      candidate = {
        type: 'sibling-after',
        targetNodeId: nodeId,
        toParentId: parentInfo.parentId,
        toIndex: parentInfo.index + 1,
      };
    } else {
      candidate = {
        type: 'child',
        targetNodeId: nodeId,
        toParentId: nodeId,
        toIndex: Array.isArray(nodes[nodeId]?.children) ? nodes[nodeId].children.length : 0,
      };
    }

    bestTarget = candidate;
    bestDistance = distance;
    invalidReason = null;
  }

  return { target: bestTarget, invalidReason };
}

function updateDragDropTarget(screenX: number, screenY: number) {
  const { target, invalidReason } = resolveDropTarget(screenX, screenY);
  setDragState({
    cursorScreenX: screenX,
    cursorScreenY: screenY,
    dropTarget: target,
    lastValidDropTarget:
      target && !invalidReason ? cloneDropTarget(target) : dragState.value.lastValidDropTarget,
    invalidReason,
  });
  requestRender();
}

function computeAutoPanVelocity(screenCoord: number, viewportSize: number) {
  if (screenCoord < AUTO_PAN_EDGE_ZONE_PX) {
    const ratio = 1 - screenCoord / AUTO_PAN_EDGE_ZONE_PX;
    return AUTO_PAN_BASE_SPEED_PX_PER_SEC * Math.pow(ratio, 1.4);
  }
  if (screenCoord > viewportSize - AUTO_PAN_EDGE_ZONE_PX) {
    const ratio = 1 - (viewportSize - screenCoord) / AUTO_PAN_EDGE_ZONE_PX;
    return -AUTO_PAN_BASE_SPEED_PX_PER_SEC * Math.pow(ratio, 1.4);
  }
  return 0;
}

function stopAutoPanLoop() {
  if (autoPanRafId != null) cancelAnimationFrame(autoPanRafId);
  autoPanRafId = null;
  autoPanLastAt = 0;
}

function tickAutoPan(now: number) {
  autoPanRafId = null;
  if (!dragState.value.isDragging) return;

  if (!autoPanLastAt) autoPanLastAt = now;
  const dt = Math.min(0.05, (now - autoPanLastAt) / 1000);
  autoPanLastAt = now;

  const vx = computeAutoPanVelocity(dragState.value.cursorScreenX, viewportW.value);
  const vy = computeAutoPanVelocity(dragState.value.cursorScreenY, viewportH.value);
  const active = Math.abs(vx) > 0 || Math.abs(vy) > 0;
  setDragState({
    autoPanActive: active,
    autoPanVelocityX: vx,
    autoPanVelocityY: vy,
  });

  if (active) {
    panByPixels(vx * dt, vy * dt);
    updateDragDropTarget(dragState.value.cursorScreenX, dragState.value.cursorScreenY);
  }

  autoPanRafId = requestAnimationFrame(tickAutoPan);
}

function startAutoPanLoop() {
  stopAutoPanLoop();
  autoPanRafId = requestAnimationFrame(tickAutoPan);
}

function buildMoveCommand(dropTarget: DragDropTarget): {
  command: Command | null;
  reason: string | null;
  changed: boolean;
  beforeHash: string | null;
  afterHash: string | null;
} {
  const nodes = getMindNodes();
  if (!nodes) return { command: null, reason: 'missingNodes', changed: false, beforeHash: null, afterHash: null };
  const movingRootIds = dragState.value.dragRoots;
  if (!movingRootIds.length) return { command: null, reason: 'pointerStateLost', changed: false, beforeHash: null, afterHash: null };

  const sourceInfos = movingRootIds
    .map((nodeId) => {
      const parentInfo = findParentAndIndex(nodeId);
      if (!parentInfo) return null;
      return { nodeId, fromParentId: parentInfo.parentId, fromIndex: parentInfo.index };
    })
    .filter((value): value is NonNullable<typeof value> => !!value)
    .sort((a, b) => {
      if (a.fromParentId !== b.fromParentId) {
        const aInfo = getSelectionTargetInfo(nodes, a.nodeId);
        const bInfo = getSelectionTargetInfo(nodes, b.nodeId);
        return compareSelectionTargetInfo(aInfo!, bInfo!);
      }
      return b.fromIndex - a.fromIndex;
    });
  if (!sourceInfos.length) return { command: null, reason: 'pointerStateLost', changed: false, beforeHash: null, afterHash: null };

  const affectedParentIds = Array.from(new Set([...sourceInfos.map((info) => info.fromParentId), dropTarget.toParentId]));
  const beforeChildrenByParent = Object.fromEntries(
    affectedParentIds.map((parentId) => [parentId, [...(Array.isArray(nodes[parentId]?.children) ? nodes[parentId].children : [])]])
  );
  const afterChildrenByParent = Object.fromEntries(
    affectedParentIds.map((parentId) => [parentId, [...beforeChildrenByParent[parentId]]])
  ) as Record<string, string[]>;

  for (const info of sourceInfos) {
    const siblings = afterChildrenByParent[info.fromParentId];
    const actualIndex = siblings.indexOf(info.nodeId);
    if (actualIndex >= 0) siblings.splice(actualIndex, 1);
  }

  let adjustedToIndex = dropTarget.toIndex;
  if (dropTarget.toParentId in afterChildrenByParent) {
    const removedBefore = sourceInfos.filter(
      (info) => info.fromParentId === dropTarget.toParentId && info.fromIndex < dropTarget.toIndex
    ).length;
    adjustedToIndex -= removedBefore;
  }
  adjustedToIndex = Math.max(0, Math.min(adjustedToIndex, afterChildrenByParent[dropTarget.toParentId].length));
  afterChildrenByParent[dropTarget.toParentId].splice(adjustedToIndex, 0, ...movingRootIds);

  const changed = affectedParentIds.some((parentId) => {
    const before = beforeChildrenByParent[parentId];
    const after = afterChildrenByParent[parentId];
    return before.length !== after.length || before.some((value, index) => after[index] !== value);
  });
  const beforeHash = hashChildrenMap(beforeChildrenByParent);
  const afterHash = hashChildrenMap(afterChildrenByParent);
  if (!changed) {
    return {
      command: null,
      reason:
        sourceInfos.every((info) => info.fromParentId === dropTarget.toParentId)
          ? 'noopSameIndex'
          : 'noopInsideBlock',
      changed: false,
      beforeHash,
      afterHash,
    };
  }

  return {
    command: createMoveSubtreesCommand(
      {
        getNodes: getMindNodes,
        setSelection,
        applyMutation: applyDocumentMutation,
      },
      {
        movingRootIds,
        beforeChildrenByParent,
        afterChildrenByParent,
        previousSelection: snapshotSelection(),
        nextSelection: {
          ids: movingRootIds,
          primaryId: dragState.value.primaryDragRootId ?? movingRootIds[movingRootIds.length - 1] ?? null,
        },
      }
    ),
    reason: null,
    changed: true,
    beforeHash,
    afterHash,
  };
}

function getPointerScreenPoint(event: PointerEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function capturePointer(pointerId: number, reason: string) {
  const canvas = canvasRef.value;
  if (!canvas?.setPointerCapture) return false;
  try {
    canvas.setPointerCapture(pointerId);
    return true;
  } catch (error) {
    if (DEBUG_CANVAS_OVERLAY) {
      console.debug('[mind-pointer-capture-failed]', { reason, pointerId, error });
    }
    return false;
  }
}

function releasePointer(pointerId: number | null, reason: string) {
  const canvas = canvasRef.value;
  if (!canvas || pointerId == null || !canvas.releasePointerCapture) return;
  try {
    if (canvas.hasPointerCapture?.(pointerId)) {
      canvas.releasePointerCapture(pointerId);
    }
  } catch (error) {
    if (DEBUG_CANVAS_OVERLAY) {
      console.debug('[mind-pointer-release-failed]', { reason, pointerId, error });
    }
  }
}

function clearDragTransient(reason?: string) {
  stopAutoPanLoop();
  const ghostCleared = dragState.value.draggedSubtreeNodeIds.size > 0;
  resetDragState();
  if (DEBUG_CANVAS_OVERLAY && reason) {
    console.debug('[mind-drag-clear]', { reason, ghostCleared });
  }
  requestRender();
}

function clearMarqueeTransient(reason?: string) {
  cancelMarqueeSelection(reason);
}

function resetInteractionToIdle(reason: string, options?: { releaseCapture?: boolean }) {
  logInteractionTransition(reason, 'idle');
  const pointerId = interactionState.value.pointerId;
  interactionState.value = createIdleInteractionState();
  if (options?.releaseCapture !== false) releasePointer(pointerId, reason);
}

function addGlobalDragListeners() {
  if (globalDragListenersActive) return;
  window.addEventListener('pointerup', onGlobalPointerUp, true);
  window.addEventListener('mouseup', onGlobalMouseUp, true);
  window.addEventListener('pointercancel', onGlobalPointerCancel, true);
  window.addEventListener('blur', onWindowBlur, true);
  document.addEventListener('visibilitychange', onVisibilityChange);
  globalDragListenersActive = true;
}

function removeGlobalDragListeners() {
  if (!globalDragListenersActive) return;
  window.removeEventListener('pointerup', onGlobalPointerUp, true);
  window.removeEventListener('mouseup', onGlobalMouseUp, true);
  window.removeEventListener('pointercancel', onGlobalPointerCancel, true);
  window.removeEventListener('blur', onWindowBlur, true);
  document.removeEventListener('visibilitychange', onVisibilityChange);
  globalDragListenersActive = false;
}

function cancelInteraction(reason: string) {
  if (interactionState.value.mode === 'marqueeSelecting') {
    clearMarqueeTransient(reason);
  }
  if (interactionState.value.mode === 'draggingNodes') {
    clearDragTransient(reason);
  }
  removeGlobalDragListeners();
  resetInteractionToIdle(reason);
  requestRender();
}

function beginDragging(screenX: number, screenY: number) {
  const candidate = interactionState.value.dragCandidate;
  if (!candidate) return;
  const pointerId = interactionState.value.pointerId;
  const captureSuccess = pointerId != null ? capturePointer(pointerId, 'begin-dragging') : false;
  const draggedSubtreeNodeIds = collectDraggedSubtreeIds(candidate.dragRoots);
  const dragRootTextLayouts = candidate.dragRoots.map((nodeId) => getDragOverlayTextLayout(nodeId, getNodeLabel(nodeId)));
  setDragState({
    isDragging: true,
    dragRoots: candidate.dragRoots,
    dragRootTexts: candidate.dragRoots.map(getNodeLabel),
    dragRootTextLayouts,
    primaryDragRootId: candidate.primaryDragRootId ?? candidate.dragRoots[candidate.dragRoots.length - 1] ?? null,
    rootId: candidate.rootId,
    draggedSubtreeNodeIds,
    cursorScreenX: screenX,
    cursorScreenY: screenY,
    dropTarget: null,
    lastValidDropTarget: null,
    invalidReason: null,
    filteredOutDescendantsCount: candidate.filteredOutDescendantsCount,
    autoPanActive: false,
    autoPanVelocityX: 0,
    autoPanVelocityY: 0,
  });
  transitionInteraction('begin-dragging', 'draggingNodes', {
    lastScreenX: screenX,
    lastScreenY: screenY,
  });
  addGlobalDragListeners();
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-drag-start]', {
      pointerId,
      captureSuccess,
      globalListenersActive: globalDragListenersActive,
      dragRoots: candidate.dragRoots,
    });
  }
  updateDragDropTarget(screenX, screenY);
  startAutoPanLoop();
}

function startMarqueeFromInteraction(screenX: number, screenY: number) {
  startMarqueeSelection(
    { x: interactionState.value.downScreenX, y: interactionState.value.downScreenY },
    { x: screenX, y: screenY },
    {
      additiveSelection: interactionState.value.additiveSelection,
      baseSelectionIds: interactionState.value.baseSelectionIds,
    }
  );
  transitionInteraction('begin-marquee', 'marqueeSelecting', {
    lastScreenX: screenX,
    lastScreenY: screenY,
  });
}

function finalizeDrop(reason = 'pointerup') {
  const startedAt = performance.now();
  const canUseLastValidTarget =
    !dragState.value.dropTarget &&
    !!dragState.value.lastValidDropTarget &&
    (!dragState.value.invalidReason || dragState.value.invalidReason === 'tooFar' || dragState.value.invalidReason === 'pointerStateLost');
  const stableTarget = dragState.value.dropTarget ?? (canUseLastValidTarget ? dragState.value.lastValidDropTarget : null);
  const effectiveInvalidReason = stableTarget ? null : dragState.value.invalidReason ?? 'tooFar';
  const result =
    stableTarget && !effectiveInvalidReason
      ? buildMoveCommand(stableTarget)
      : {
        command: null,
        reason: effectiveInvalidReason,
        changed: false,
        beforeHash: null,
        afterHash: null,
      };
  const isNoOp = !result.command;
  const rebuildScheduled = !isNoOp;

  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-drag-pointerup]', {
      reason,
      hasPreview:
        !!dragState.value.dropTarget ||
        (!!dragState.value.lastValidDropTarget &&
          (!dragState.value.invalidReason || dragState.value.invalidReason === 'tooFar')),
      currentDropTargetType: dragState.value.dropTarget?.type ?? null,
      lastValidDropTargetType: dragState.value.lastValidDropTarget?.type ?? null,
      chosenDropTargetType: stableTarget?.type ?? null,
      movingRootIds: dragState.value.dragRoots,
      toParentId: stableTarget?.toParentId ?? null,
      toIndex: stableTarget?.toIndex ?? null,
      invalidReason: result.reason,
      isNoOp,
      noOpReason: isNoOp ? result.reason : null,
      executeCalled: !isNoOp,
      rebuildScheduled,
      computedBeforeAfterChanged: result.changed,
      beforeHash: result.beforeHash,
      afterHash: result.afterHash,
      durationMs: Number((performance.now() - startedAt).toFixed(2)),
    });
  }

  clearDragTransient(reason);
  if (isNoOp) return;
  executeCommand(result.command);
}

function finalizeInteraction(
  reason: string,
  options: { commitDrag?: boolean; eventSource?: 'canvas' | 'global' | 'system' } = {}
) {
  if (isFinalizingInteraction) return;
  const mode = interactionState.value.mode;
  if (mode === 'idle') return;

  isFinalizingInteraction = true;
  try {
    if (DEBUG_CANVAS_OVERLAY) {
      console.debug('[mind-finalize-interaction]', {
        reason,
        mode,
        eventSource: options.eventSource ?? 'system',
        pointerId: interactionState.value.pointerId,
        globalListenersActive: globalDragListenersActive,
      });
    }

    if (mode === 'pointerDownBlank') {
      if (interactionState.value.shouldClearSelectionOnClick) {
        setSelection([], null);
      }
    } else if (mode === 'marqueeSelecting') {
      finishMarqueeSelection();
    } else if (mode === 'draggingNodes') {
      if (options.commitDrag === false) {
        clearDragTransient(reason);
      } else {
        finalizeDrop(reason);
      }
    } else if (mode === 'pointerDownOnNode') {
      requestRender();
    }

    removeGlobalDragListeners();
    resetInteractionToIdle(reason);
    requestRender();
  } finally {
    isFinalizingInteraction = false;
  }
}

function computeSelectionAfterDelete(parentId: string, siblingIds: string[], indexInParent: number) {
  const nextSiblingId = siblingIds[indexInParent + 1] ?? null;
  if (nextSiblingId) return nextSiblingId;
  const previousSiblingId = siblingIds[indexInParent - 1] ?? null;
  if (previousSiblingId) return previousSiblingId;
  return parentId;
}

function isRootNode(nodeId: string) {
  return nodeId === getRootNodeId();
}

function createClipboardStateFromSnapshots(
  snapshots: ReturnType<typeof createSubtreeSnapshot>[],
  sourceNodeIds: string[]
): InternalClipboardState {
  const items = snapshots.filter((value): value is NonNullable<typeof value> => !!value);
  if (!items.length) {
    return {
      type: 'empty',
      itemCount: 0,
      totalNodeCount: 0,
      items: [],
    };
  }
  return {
    type: items.length === 1 ? 'single-subtree' : 'multi-subtree',
    itemCount: items.length,
    totalNodeCount: items.reduce((sum, item) => sum + item.nodeCount, 0),
    items,
    createdAt: Date.now(),
    sourceNodeIds,
  };
}

function serializeNodeClipboardPayload(clipboardState: InternalClipboardState) {
  return JSON.stringify({
    kind: 'mindnodes-clipboard',
    version: 1,
    clipboardState,
  });
}

function deserializeNodeClipboardPayload(raw: string | null | undefined): InternalClipboardState | null {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (parsed?.kind !== 'mindnodes-clipboard' || parsed?.version !== 1) return null;
    const clipboardState = parsed.clipboardState as InternalClipboardState | undefined;
    if (!clipboardState || clipboardState.type === 'empty' || !Array.isArray(clipboardState.items)) return null;
    return clipboardState;
  } catch {
    return null;
  }
}

function getNodeClipboardFallbackText(clipboardState: InternalClipboardState) {
  return `${NODE_CLIPBOARD_TEXT_PREFIX}${serializeNodeClipboardPayload(clipboardState)}`;
}

function parseClipboardNodePayload(clipboardData: DataTransfer | null | undefined) {
  if (!clipboardData) return null;
  const mimePayload = deserializeNodeClipboardPayload(clipboardData.getData(NODE_CLIPBOARD_MIME));
  if (mimePayload) return mimePayload;
  const plainText = clipboardData.getData('text/plain');
  if (!plainText.startsWith(NODE_CLIPBOARD_TEXT_PREFIX)) return null;
  return deserializeNodeClipboardPayload(plainText.slice(NODE_CLIPBOARD_TEXT_PREFIX.length));
}

function normalizeSelectedTargets(options?: { allowRoot?: boolean; collapseToRootIfSelected?: boolean }) {
  const nodes = getMindNodes();
  if (!nodes) return { finalTargets: [], filteredOutDescendantsCount: 0 };
  const result = normalizeSelectionTargets(nodes, getSelectedNodeIds(), {
    rootNodeId: getRootNodeId(),
    allowRoot: options?.allowRoot,
    collapseToRootIfSelected: options?.collapseToRootIfSelected,
  });
  setFilteredOutDescendantsCount(result.filteredOutDescendantsCount);
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-normalize-selection]', {
      before: getSelectedNodeIds(),
      after: result.finalTargets.map((target) => ({
        nodeId: target.nodeId,
        parentId: target.parentId,
        indexInParent: target.indexInParent,
      })),
      filteredOutDescendantsCount: result.filteredOutDescendantsCount,
    });
  }
  return result;
}

function performCopy(nodeIds?: string[]) {
  const nodes = getMindNodes();
  if (!nodes) return;
  const targetIds = nodeIds ?? [getPrimarySelectedId()].filter((value): value is string => !!value);
  const snapshots = targetIds.map((nodeId) => createSubtreeSnapshot(nodes, nodeId));
  const clipboardState = createClipboardStateFromSnapshots(snapshots, targetIds);
  setInternalClipboard(clipboardState);
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-copy-subtree]', {
      nodeIds: targetIds,
      itemCount: clipboardState.itemCount,
      totalNodeCount: clipboardState.totalNodeCount,
    });
  }
  requestRender();
}

function onWindowCopy(event: ClipboardEvent) {
  if (isTextEditingActive(event.target)) return;
  const normalized = normalizeSelectedTargets({
    allowRoot: true,
    collapseToRootIfSelected: true,
  });
  if (!normalized.finalTargets.length) return;
  setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
  const targetIds = normalized.finalTargets.map((target) => target.nodeId);
  performCopy(targetIds);
  const clipboardState = getInternalClipboard();
  if (clipboardState.type === 'empty') return;
  event.preventDefault();
  event.stopPropagation();
  event.clipboardData?.setData(NODE_CLIPBOARD_MIME, serializeNodeClipboardPayload(clipboardState));
  event.clipboardData?.setData('text/plain', getNodeClipboardFallbackText(clipboardState));
}

function createDeleteCommand(targetNodeId: string): Command | null {
  if (isRootNode(targetNodeId)) return null;
  const nodes = getMindNodes();
  const parentInfo = findParentAndIndex(targetNodeId);
  if (!nodes || !parentInfo) return null;

  const { parentId, index } = parentInfo;
  const parentNode = nodes[parentId];
  if (!parentNode) return null;

  const deletedSnapshot = createSubtreeSnapshot(nodes, targetNodeId);
  if (!deletedSnapshot) return null;

  const siblingIds = Array.isArray(parentNode.children) ? [...parentNode.children] : [];
  const previousSelectionId = getPrimarySelectedId();
  const nextSelectionId = computeSelectionAfterDelete(parentId, siblingIds, index);

  return createDeleteSubtreeCommand(
    {
      getNodes: getMindNodes,
      setSingleSelected,
      applyMutation: applyDocumentMutation,
      setLastDeletedNodeId,
      debugEnabled: DEBUG_CANVAS_OVERLAY,
    },
    {
      targetNodeId,
      parentId,
      indexInParent: index,
      deletedSnapshot,
      previousSelectionId,
      nextSelectionId,
    }
  );
}

function createBatchAddChildSelectionCommand(targetNodeIds: string[]): Command | null {
  if (!targetNodeIds.length) return null;
  const newNodeIds = targetNodeIds.map(() => createNodeId());
  return createBatchAddChildCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      startEditing: () => undefined,
      applyMutation: applyDocumentMutation,
      createNodeRecord,
    },
    {
      parentIds: targetNodeIds,
      newNodeIds,
      previousSelection: snapshotSelection(),
    }
  );
}

function createBatchAddSiblingSelectionCommand(targetNodeIds: string[]): Command | null {
  const nodes = getMindNodes();
  if (!nodes || !targetNodeIds.length) return null;

  const targetInfos = targetNodeIds
    .map((nodeId) => findParentAndIndex(nodeId))
    .map((parentInfo, index) =>
      parentInfo ? { nodeId: targetNodeIds[index], parentId: parentInfo.parentId, indexInParent: parentInfo.index } : null
    )
    .filter((value): value is { nodeId: string; parentId: string; indexInParent: number } => !!value)
    .sort((a, b) => {
      if (a.parentId !== b.parentId) {
        const aInfo = getSelectionTargetInfo(nodes, a.nodeId);
        const bInfo = getSelectionTargetInfo(nodes, b.nodeId);
        return compareSelectionTargetInfo(aInfo!, bInfo!);
      }
      return b.indexInParent - a.indexInParent;
    });

  if (!targetInfos.length) return null;
  const newNodeIdsByTargetId = Object.fromEntries(targetInfos.map((target) => [target.nodeId, createNodeId()]));
  const selectionOrder = targetNodeIds.map((nodeId) => newNodeIdsByTargetId[nodeId]).filter(Boolean);

  if (DEBUG_CANVAS_OVERLAY) {
    console.debug(
      '[mind-batch-add-sibling-order]',
      targetInfos.map((target) => ({
        nodeId: target.nodeId,
        parentId: target.parentId,
        indexInParent: target.indexInParent,
      }))
    );
  }

  return createBatchAddSiblingCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      startEditing: () => undefined,
      applyMutation: applyDocumentMutation,
      createNodeRecord,
    },
    {
      targetsForMutation: targetInfos,
      newNodeIdsByTargetId,
      addedNodeIdsInSelectionOrder: selectionOrder,
      previousSelection: snapshotSelection(),
    }
  );
}

function createPasteTextLinesCommand(targetParentId: string, lines: string[]): Command | null {
  if (!lines.length) return null;
  const newNodeIds = lines.map(() => createNodeId());
  const lineByNodeId = Object.fromEntries(newNodeIds.map((nodeId, index) => [nodeId, lines[index]]));
  return createBatchAddChildCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      startEditing: () => undefined,
      applyMutation: applyDocumentMutation,
      createNodeRecord: (nodeId: string) => createNodeRecord(nodeId, lineByNodeId[nodeId] ?? NEW_NODE_TEXT),
    },
    {
      parentIds: Array.from({ length: lines.length }, () => targetParentId),
      newNodeIds,
      previousSelection: snapshotSelection(),
    }
  );
}

function createBatchDeleteSelectionCommand(targetNodeIds: string[]): Command | null {
  const nodes = getMindNodes();
  if (!nodes || !targetNodeIds.length) return null;

  const selectionOrderInfos = targetNodeIds
    .map((nodeId) => getSelectionTargetInfo(nodes, nodeId))
    .filter((value): value is NonNullable<typeof value> => !!value)
    .sort(compareSelectionTargetInfo);
  const primaryDeleteTarget = selectionOrderInfos[selectionOrderInfos.length - 1] ?? null;

  const targetsForMutation = selectionOrderInfos
    .map((info) => {
      if (!info.parentId) return null;
      const deletedSnapshot = createSubtreeSnapshot(nodes, info.nodeId);
      if (!deletedSnapshot) return null;
      return {
        nodeId: info.nodeId,
        parentId: info.parentId,
        indexInParent: info.indexInParent,
        deletedSnapshot,
      };
    })
    .filter((value): value is NonNullable<typeof value> => !!value)
    .sort((a, b) => {
      if (a.parentId !== b.parentId) {
        const aInfo = getSelectionTargetInfo(nodes, a.nodeId);
        const bInfo = getSelectionTargetInfo(nodes, b.nodeId);
        return compareSelectionTargetInfo(aInfo!, bInfo!);
      }
      return b.indexInParent - a.indexInParent;
    });

  if (!targetsForMutation.length) return null;

  const primaryParent = primaryDeleteTarget?.parentId ? nodes[primaryDeleteTarget.parentId] : null;
  const siblingIds = primaryParent && Array.isArray(primaryParent.children) ? [...primaryParent.children] : [];
  const nextSelectionId =
    primaryDeleteTarget?.parentId != null
      ? computeSelectionAfterDelete(primaryDeleteTarget.parentId, siblingIds, primaryDeleteTarget.indexInParent)
      : resolveFallbackSelection(getPrimarySelectedId());

  if (DEBUG_CANVAS_OVERLAY) {
    console.debug(
      '[mind-batch-delete-order]',
      targetsForMutation.map((target) => ({
        nodeId: target.nodeId,
        parentId: target.parentId,
        indexInParent: target.indexInParent,
      }))
    );
  }

  return createBatchDeleteSubtreesCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      applyMutation: applyDocumentMutation,
      setLastDeletedNodeId,
    },
    {
      targetsForMutation,
      previousSelection: snapshotSelection(),
      nextSelectionId,
      lastDeletedNodeId: primaryDeleteTarget?.nodeId ?? null,
    }
  );
}

function createBatchCutSelectionCommand(targetNodeIds: string[]): Command | null {
  const nodes = getMindNodes();
  if (!nodes || !targetNodeIds.length) return null;
  const snapshots = targetNodeIds.map((nodeId) => createSubtreeSnapshot(nodes, nodeId));
  const clipboardState = createClipboardStateFromSnapshots(snapshots, targetNodeIds);
  const deleteCommand = createBatchDeleteSelectionCommand(targetNodeIds);
  if (!deleteCommand || clipboardState.type === 'empty') return null;
  return createBatchCutSubtreesCommand(
    {
      setClipboard: setInternalClipboard,
    },
    {
      clipboardState,
      deleteCommand,
    }
  );
}

function createBatchPasteCommand(targetParentId: string, clipboardState: InternalClipboardState): Command | null {
  if (clipboardState.type === 'empty' || !clipboardState.items.length) return null;
  const nodes = getMindNodes();
  const parentNode = nodes?.[targetParentId];
  if (!nodes || !parentNode) return null;
  const insertIndex = Array.isArray(parentNode.children) ? parentNode.children.length : 0;
  return createBatchPasteSubtreesCommand(
    {
      getNodes: getMindNodes,
      createNodeId,
      setSelection,
      applyMutation: applyDocumentMutation,
      setLastPastedRootId,
    },
    {
      targetParentId,
      insertIndex,
      clipboardItems: clipboardState.items,
      previousSelection: snapshotSelection(),
    }
  );
}

function createCutCommand(targetNodeId: string): Command | null {
  if (isRootNode(targetNodeId)) return null;
  const nodes = getMindNodes();
  if (!nodes) return null;

  const snapshot = createSubtreeSnapshot(nodes, targetNodeId);
  if (!snapshot) return null;

  const deleteCommand = createDeleteCommand(targetNodeId);
  if (!deleteCommand) return null;

  return createCutSubtreeCommand(
    {
      setClipboard: setInternalClipboard,
      debugEnabled: DEBUG_CANVAS_OVERLAY,
    },
    {
      targetNodeId,
      subtreeSize: snapshot.nodeCount,
      clipboardPayload: {
        type: 'single-subtree',
        itemCount: 1,
        totalNodeCount: snapshot.nodeCount,
        items: [snapshot],
        sourceNodeIds: [targetNodeId],
        createdAt: Date.now(),
      },
      deleteCommand,
    }
  );
}

function createPasteCommand(targetParentId: string): Command | null {
  const clipboardPayload = getInternalClipboard();
  if (clipboardPayload.type === 'empty' || !clipboardPayload.items.length) return null;

  const nodes = getMindNodes();
  const parentNode = nodes?.[targetParentId];
  if (!nodes || !parentNode) return null;

  const insertIndex = Array.isArray(parentNode.children) ? parentNode.children.length : 0;
  const previousSelectionId = getPrimarySelectedId();

  return createPasteSubtreeCommand(
    {
      getNodes: getMindNodes,
      createNodeId,
      setSingleSelected,
      resolveFallbackSelection,
      applyMutation: applyDocumentMutation,
      setLastPastedRootId,
      debugEnabled: DEBUG_CANVAS_OVERLAY,
    },
    {
      targetParentId,
      insertIndex,
      clipboardSnapshotSource: clipboardPayload.items[0],
      previousSelectionId,
    }
  );
}

function createAddChildCommand(parentId: string): Command | null {
  const nodes = getMindNodes();
  const parentNode = nodes?.[parentId];
  if (!nodes || !parentNode) return null;

  const previousSelectionId = getPrimarySelectedId();
  const newNodeId = createNodeId();
  const insertIndex = Array.isArray(parentNode.children) ? parentNode.children.length : 0;

  return {
    name: 'AddChildCommand',
    do: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId);
      currentParent.children.splice(insertIndex, 0, newNodeId);
      setSingleSelected(newNodeId);
      void applyDocumentMutation('history:add-child', { ensureVisibleNodeId: newNodeId });
    },
    undo: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      const nextIndex = currentParent.children.indexOf(newNodeId);
      if (nextIndex >= 0) currentParent.children.splice(nextIndex, 1);
      delete currentNodes[newNodeId];
      const restoredSelectionId = resolveFallbackSelection(previousSelectionId, parentId);
      setSingleSelected(restoredSelectionId);
      editingNodeId.value = null;
      void applyDocumentMutation('history:undo-add-child', { ensureVisibleNodeId: restoredSelectionId });
    },
    redo: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId);
      const nextIndex = Math.min(insertIndex, currentParent.children.length);
      if (!currentParent.children.includes(newNodeId)) currentParent.children.splice(nextIndex, 0, newNodeId);
      setSingleSelected(newNodeId);
      void applyDocumentMutation('history:redo-add-child', { ensureVisibleNodeId: newNodeId });
    },
  };
}

function createAddSiblingCommand(nodeId: string): Command | null {
  const parentInfo = findParentAndIndex(nodeId);
  if (!parentInfo) return null;

  const { parentId, index } = parentInfo;
  const nodes = getMindNodes();
  const parentNode = nodes?.[parentId];
  if (!nodes || !parentNode) return null;

  const previousSelectionId = getPrimarySelectedId();
  const newNodeId = createNodeId();
  const insertIndex = index + 1;

  return {
    name: 'AddSiblingCommand',
    do: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId);
      currentParent.children.splice(Math.min(insertIndex, currentParent.children.length), 0, newNodeId);
      setSingleSelected(newNodeId);
      void applyDocumentMutation('history:add-sibling', { ensureVisibleNodeId: newNodeId });
    },
    undo: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      const nextIndex = currentParent.children.indexOf(newNodeId);
      if (nextIndex >= 0) currentParent.children.splice(nextIndex, 1);
      delete currentNodes[newNodeId];
      const restoredSelectionId = resolveFallbackSelection(previousSelectionId, parentId);
      setSingleSelected(restoredSelectionId);
      editingNodeId.value = null;
      void applyDocumentMutation('history:undo-add-sibling', { ensureVisibleNodeId: restoredSelectionId });
    },
    redo: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId);
      const nextIndex = Math.min(insertIndex, currentParent.children.length);
      if (!currentParent.children.includes(newNodeId)) currentParent.children.splice(nextIndex, 0, newNodeId);
      setSingleSelected(newNodeId);
      void applyDocumentMutation('history:redo-add-sibling', { ensureVisibleNodeId: newNodeId });
    },
  };
}

function executeCommand(command: Command | null) {
  if (!command) return;
  resetCommandDebugState();
  history.execute(command);
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  const tag = element.tagName;
  return (
    tag === 'INPUT' ||
    tag === 'TEXTAREA' ||
    tag === 'SELECT' ||
    element.isContentEditable
  );
}

function isTextEditingActive(target: EventTarget | null) {
  if (isComposing.value) return true;
  if (isEditableTarget(target)) return true;
  if (typeof document !== 'undefined' && isEditableTarget(document.activeElement)) return true;
  return false;
}

function withCameraResetLog(reason: string, mutate: () => void) {
  const before = { ...camera.value };
  mutate();
  logCameraReset(reason, before, camera.value);
}

function requestRender() {
  if (drawRafId != null) return;
  drawRafId = requestAnimationFrame(() => {
    drawRafId = null;
    draw();
  });
}

function rebuildSpatialCaches() {
  worldBoxes.value = buildWorldBoxes(props.doc, layoutLocal);
  spatialIndex.rebuild(worldBoxes.value);
  rebuildEdgeCache(props.doc, worldBoxes.value);
}

// interaction（wheel only: zoom + platform-specific pan）
const { onWheel, cleanup } = useInteraction(
  viewportRef,
  camera,
  clampScale,
  zoomAtViewportPoint,
  panByPixels,
  () => getMinCameraScale(),
  () => MAX_CAMERA_SCALE,
  requestRender,
  () => schedulePersistViewport()
);

async function redrawAll(reason = 'redrawAll') {
  await redrawAllInternal(reason, { restoreViewport: true });
}

function ensureNodeVisible(nodeId: string) {
  const rect = worldBoxes.value.get(nodeId);
  const canvas = canvasRef.value;
  if (!rect || !canvas) return;

  const viewportRect = getWorldViewportRect(camera.value, viewportW.value, viewportH.value);
  if (rectContains(viewportRect, rect)) return;

  const topLeft = worldToScreen(camera.value, rect.x1, rect.y1);
  const bottomRight = worldToScreen(camera.value, rect.x2, rect.y2);

  let dx = 0;
  if (topLeft.x < 0) dx = -topLeft.x;
  else if (bottomRight.x > viewportW.value) dx = viewportW.value - bottomRight.x;

  let dy = 0;
  if (topLeft.y < 0) dy = -topLeft.y;
  else if (bottomRight.y > viewportH.value) dy = viewportH.value - bottomRight.y;

  if (dx === 0 && dy === 0) return;

  setCamera({
    ...camera.value,
    tx: camera.value.tx + dx,
    ty: camera.value.ty + dy,
  });
  requestRender();
}

function ensureNodesVisible(nodeIds: string[]) {
  for (const nodeId of nodeIds) {
    ensureNodeVisible(nodeId);
  }
}

async function redrawAllInternal(
  reason = 'redrawAll',
  options: { restoreViewport: boolean } = { restoreViewport: true }
) {
  const startedAt = performance.now();
  await nextTick();
  resizeToViewport();

  if (props.doc) ensureMindRoots(props.doc);

  const layoutStartedAt = performance.now();
  rebuildLayout();
  const layoutRebuildMs = performance.now() - layoutStartedAt;
  const edgesStartedAt = performance.now();
  rebuildSpatialCaches();
  const edgesRebuildMs = performance.now() - edgesStartedAt;

  if (options.restoreViewport) {
    hasSavedViewport.value = restoreViewportFromDoc();

    if (!hasSavedViewport.value) {
      hasAppliedInitialFit.value = false;
      maybeApplyInitialFit(`${reason}:initial-fit`);
    } else {
      withCameraResetLog(`${reason}:constrain-after-restore`, () => constrainToBounds());
    }
  }

  draw();
  return {
    layoutRebuildMs,
    edgesRebuildMs,
    totalMs: performance.now() - startedAt,
  };
}

function hitTest(screenX: number, screenY: number): string | null {
  const worldPoint = screenToWorld(camera.value, screenX, screenY);
  const candidates = spatialIndex.queryPoint(worldPoint);
  let hitId: string | null = null;
  let hitArea = Number.POSITIVE_INFINITY;

  for (const nodeId of candidates) {
    const rect = worldBoxes.value.get(nodeId);
    if (!rect || !pointInRect(worldPoint, rect)) continue;

    const area = (rect.x2 - rect.x1) * (rect.y2 - rect.y1);
    if (area < hitArea) {
      hitId = nodeId;
      hitArea = area;
    }
  }

  return hitId;
}

async function toggleNodeCollapsed(nodeId: string) {
  const nodes = props.doc?.mind?.nodes;
  const node = nodes?.[nodeId];
  const children = Array.isArray(node?.children) ? node.children : [];
  if (!node || !children.length) return;

  if (editingSession.value) {
    const editingSubtreeIds = new Set(collectSubtreeNodeIds(nodes, nodeId));
    if (editingSubtreeIds.has(editingSession.value.nodeId)) {
      commitEditingSession();
    }
  }

  const nextCollapsed = !node.collapsed;
  node.collapsed = nextCollapsed;

  if (nextCollapsed) {
    const subtreeIds = collectSubtreeNodeIds(nodes, nodeId);
    const hidesSelection = subtreeIds.some((id) => id !== nodeId && selectedIds.value.has(id));
    if (hidesSelection) setSingleSelected(nodeId);
  }

  collapseTagHoverNodeId.value = nodeId;
  hoverNodeId.value = nodeId;
  keepCollapseTagVisible(nodeId);
  await applyDocumentMutation('node-toggle-collapsed', { ensureVisibleNodeId: nodeId });
}

function updateHoverFromScreenPoint(screenX: number, screenY: number) {
  if (isMarquee.value || interactionState.value.mode === 'draggingNodes') return;
  const nextCollapseTagHoverId = hitTestCollapseTag(collapseTagScreenMap.value, screenX, screenY);
  const nextHoverId = nextCollapseTagHoverId ?? hitTest(screenX, screenY);
  if (nextHoverId === hoverNodeId.value && nextCollapseTagHoverId === collapseTagHoverNodeId.value) return;
  hoverNodeId.value = nextHoverId;
  collapseTagHoverNodeId.value = nextCollapseTagHoverId;
  const nextActiveTagNodeId = nextCollapseTagHoverId ?? nextHoverId;
  if (nextActiveTagNodeId) keepCollapseTagVisible(nextActiveTagNodeId);
  else scheduleCollapseTagHide();
  if (nextHoverId && DEBUG_CANVAS_OVERLAY) console.debug('[mind-hit-test]', { hoverId: nextHoverId });
  requestRender();
}

function onCanvasPointerDown(event: PointerEvent) {
  if (event.button !== 0) return;
  if (editingSession.value) {
    commitEditingSession();
  }
  if (interactionState.value.mode !== 'idle') {
    cancelInteraction('pointerdown-reentry');
  }
  const screenPoint = getPointerScreenPoint(event);
  if (!screenPoint) return;
  const downWorld = screenToWorld(camera.value, screenPoint.x, screenPoint.y);
  const collapseTagNodeId = hitTestCollapseTag(collapseTagScreenMap.value, screenPoint.x, screenPoint.y);
  const hitId = hitTest(screenPoint.x, screenPoint.y);
  const imageTarget = getPrimarySelectedImageTarget(screenPoint.x, screenPoint.y);

  if (imageTarget) {
    event.preventDefault();
    event.stopPropagation();
    editingNodeId.value = null;
    if (imageTarget.handle && imageInteraction.value?.nodeId === imageTarget.nodeId && imageInteraction.value.selected) {
      startImageResize(imageTarget.nodeId, imageTarget.handle, event.pointerId, screenPoint.x, screenPoint.y);
    } else {
      const currentSize = getNodeImageDisplaySize(imageTarget.nodeId);
      if (currentSize) {
        updateImageCursor(screenPoint.x, screenPoint.y);
        upsertImageInteraction({
          nodeId: imageTarget.nodeId,
          hovered: true,
          selected: true,
          resizing: false,
          handle: null,
          pointerId: null,
          startPointer: { xScreen: 0, yScreen: 0 },
          startSize: currentSize,
          previewSize: null,
        });
        requestRender();
      }
    }
    return;
  }

  if (imageInteraction.value) {
    clearImageInteraction('pointerdown-outside-image');
  }

  if (collapseTagNodeId) {
    event.preventDefault();
    event.stopPropagation();
    editingNodeId.value = null;
    void toggleNodeCollapsed(collapseTagNodeId);
    return;
  }

  capturePointer(event.pointerId, 'pointerdown');

  if (hitId) {
    event.preventDefault();
    editingNodeId.value = null;
    if (event.ctrlKey || event.metaKey) {
      toggleNodeSelection(hitId);
      resetInteractionToIdle('toggle-node-selection');
    } else if (event.shiftKey) {
      extendSelectionFromAnchor(hitId);
      resetInteractionToIdle('range-node-selection');
    } else {
      const isAlreadySelected = selectedIds.value.has(hitId);
      const selectionIds = isAlreadySelected ? getSelectedNodeIds() : [hitId];
      if (isAlreadySelected) setSelection(selectionIds, hitId);
      else setSingleSelected(hitId);
      const normalized = normalizeDragRootsFromIds(selectionIds);
      setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
      if (!normalized.invalidReason && normalized.finalTargets.length) {
        interactionState.value = {
          mode: 'pointerDownOnNode',
          pointerId: event.pointerId,
          downScreenX: screenPoint.x,
          downScreenY: screenPoint.y,
          downWorldX: downWorld.x,
          downWorldY: downWorld.y,
          lastScreenX: screenPoint.x,
          lastScreenY: screenPoint.y,
          lastWorldX: downWorld.x,
          lastWorldY: downWorld.y,
          hitNodeId: hitId,
          additiveSelection: false,
          baseSelectionIds: [],
          shouldClearSelectionOnClick: false,
          dragCandidate: {
            dragRoots: normalized.finalTargets.map((target) => target.nodeId),
            primaryDragRootId: hitId,
            rootId: normalized.rootId,
            filteredOutDescendantsCount: normalized.filteredOutDescendantsCount,
          },
        };
        logInteractionTransition('pointerdown-node', 'pointerDownOnNode', {
          hitNodeId: hitId,
          dragRoots: normalized.finalTargets.map((target) => target.nodeId),
        });
      } else {
        resetInteractionToIdle(normalized.invalidReason ?? 'node-not-draggable');
      }
    }
    requestRender();
    return;
  }

  interactionState.value = {
    mode: 'pointerDownBlank',
    pointerId: event.pointerId,
    downScreenX: screenPoint.x,
    downScreenY: screenPoint.y,
    downWorldX: downWorld.x,
    downWorldY: downWorld.y,
    lastScreenX: screenPoint.x,
    lastScreenY: screenPoint.y,
    lastWorldX: downWorld.x,
    lastWorldY: downWorld.y,
    hitNodeId: null,
    additiveSelection: event.ctrlKey || event.metaKey || event.shiftKey,
    baseSelectionIds: getSelectedNodeIds(),
    shouldClearSelectionOnClick: !(event.ctrlKey || event.metaKey || event.shiftKey),
    dragCandidate: null,
  };
  logInteractionTransition('pointerdown-blank', 'pointerDownBlank', {
    shouldClearSelectionOnClick: !(event.ctrlKey || event.metaKey || event.shiftKey),
  });
}

function onCanvasDoubleClick(event: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const collapseTagNodeId = hitTestCollapseTag(
    collapseTagScreenMap.value,
    event.clientX - rect.left,
    event.clientY - rect.top
  );
  if (collapseTagNodeId) return;
  const hitId = hitTest(event.clientX - rect.left, event.clientY - rect.top);
  if (!hitId) return;
  event.preventDefault();
  event.stopPropagation();
  setSingleSelected(hitId);
  requestAnimationFrame(() => {
    startEditing(hitId, { mode: 'append', caretPlacement: 'end' });
  });
}

function onCanvasPointerMove(event: PointerEvent) {
  const screenPoint = getPointerScreenPoint(event);
  if (!screenPoint) return;

  if (imageInteraction.value?.resizing && imageInteraction.value.pointerId === event.pointerId) {
    updateImageCursor(screenPoint.x, screenPoint.y);
    updateImageResizePreview(screenPoint.x, screenPoint.y);
    return;
  }

  if (interactionState.value.pointerId == null || event.pointerId !== interactionState.value.pointerId) {
    updateHoverFromScreenPoint(screenPoint.x, screenPoint.y);
    if (collapseTagHoverNodeId.value) setCanvasCursor('pointer');
    else updateImageHover(screenPoint.x, screenPoint.y);
    return;
  }

  if ((event.buttons & 1) !== 1 && interactionState.value.mode !== 'idle') {
    finalizeInteraction('buttonsReleasedFallback', {
      commitDrag: interactionState.value.mode === 'draggingNodes',
      eventSource: 'canvas',
    });
    return;
  }

  const worldPoint = screenToWorld(camera.value, screenPoint.x, screenPoint.y);
  setInteractionState({
    lastScreenX: screenPoint.x,
    lastScreenY: screenPoint.y,
    lastWorldX: worldPoint.x,
    lastWorldY: worldPoint.y,
  });

  const dx = screenPoint.x - interactionState.value.downScreenX;
  const dy = screenPoint.y - interactionState.value.downScreenY;
  const distance = Math.hypot(dx, dy);

  if (interactionState.value.mode === 'pointerDownBlank') {
    if (distance >= MARQUEE_START_THRESHOLD_PX) {
      startMarqueeFromInteraction(screenPoint.x, screenPoint.y);
      updateMarqueeSelection({ x: screenPoint.x, y: screenPoint.y });
    }
    return;
  }

  if (interactionState.value.mode === 'pointerDownOnNode') {
    if (distance >= DRAG_START_THRESHOLD_PX) {
      beginDragging(screenPoint.x, screenPoint.y);
    }
    return;
  }

  if (interactionState.value.mode === 'marqueeSelecting') {
    updateMarqueeSelection({ x: screenPoint.x, y: screenPoint.y });
    return;
  }

  if (interactionState.value.mode === 'draggingNodes') {
    updateDragDropTarget(screenPoint.x, screenPoint.y);
    return;
  }

  updateHoverFromScreenPoint(screenPoint.x, screenPoint.y);
  if (collapseTagHoverNodeId.value) setCanvasCursor('pointer');
  else updateImageHover(screenPoint.x, screenPoint.y);
}

function onCanvasPointerLeave() {
  let imageHoverChanged = false;
  scheduleCollapseTagHide();
  setCanvasCursor('');
  if (imageInteraction.value?.hovered && !imageInteraction.value.resizing) {
    imageInteraction.value = { ...imageInteraction.value, hovered: false };
    imageHoverChanged = true;
  }
  if (interactionState.value.mode !== 'idle' && interactionState.value.pointerId != null) {
    const canvas = canvasRef.value;
    const hasCapture = canvas?.hasPointerCapture?.(interactionState.value.pointerId) ?? false;
    if (!hasCapture) {
      cancelInteraction('pointerleave-without-capture');
      return;
    }
  }
  if (hoverNodeId.value) {
    hoverNodeId.value = null;
    collapseTagHoverNodeId.value = null;
    requestRender();
    return;
  }
  if (collapseTagHoverNodeId.value) {
    collapseTagHoverNodeId.value = null;
    requestRender();
    return;
  }
  if (imageHoverChanged) requestRender();
}

function onCanvasPointerUp(event: PointerEvent) {
  if (imageInteraction.value?.resizing && imageInteraction.value.pointerId === event.pointerId) {
    finishImageResize(true, 'image-pointerup');
    return;
  }
  if (interactionState.value.pointerId == null || event.pointerId !== interactionState.value.pointerId) return;
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-pointerup-canvas]', {
      pointerId: event.pointerId,
      mode: interactionState.value.mode,
    });
  }
  finalizeInteraction('pointerup', { commitDrag: true, eventSource: 'canvas' });
}

function onCanvasPointerCancel(event: PointerEvent) {
  if (imageInteraction.value?.resizing && imageInteraction.value.pointerId === event.pointerId) {
    finishImageResize(false, 'image-pointercancel');
    return;
  }
  if (interactionState.value.pointerId != null && event.pointerId === interactionState.value.pointerId) {
    finalizeInteraction('pointercancel', { commitDrag: false, eventSource: 'canvas' });
  }
}

function onCanvasLostPointerCapture(event: PointerEvent) {
  if (imageInteraction.value?.resizing && imageInteraction.value.pointerId === event.pointerId) {
    finishImageResize(false, 'image-lostpointercapture');
    return;
  }
  if (interactionState.value.pointerId != null && event.pointerId === interactionState.value.pointerId && interactionState.value.mode !== 'idle') {
    finalizeInteraction('lostpointercapture', { commitDrag: false, eventSource: 'canvas' });
  }
}

function onGlobalPointerUp(event: PointerEvent) {
  if (imageInteraction.value?.resizing && imageInteraction.value.pointerId === event.pointerId) {
    finishImageResize(true, 'image-global-pointerup');
    return;
  }
  if (interactionState.value.pointerId == null || event.pointerId !== interactionState.value.pointerId) return;
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-pointerup-global]', {
      pointerId: event.pointerId,
      mode: interactionState.value.mode,
    });
  }
  finalizeInteraction('global-pointerup', { commitDrag: true, eventSource: 'global' });
}

function onGlobalPointerCancel(event: PointerEvent) {
  if (imageInteraction.value?.resizing && imageInteraction.value.pointerId === event.pointerId) {
    finishImageResize(false, 'image-global-pointercancel');
    return;
  }
  if (interactionState.value.pointerId == null || event.pointerId !== interactionState.value.pointerId) return;
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-pointercancel-global]', {
      pointerId: event.pointerId,
      mode: interactionState.value.mode,
    });
  }
  finalizeInteraction('global-pointercancel', { commitDrag: false, eventSource: 'global' });
}

function onGlobalMouseUp(event: MouseEvent) {
  if (imageInteraction.value?.resizing) {
    finishImageResize(true, 'image-global-mouseup');
    return;
  }
  if (interactionState.value.mode !== 'draggingNodes') return;
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-mouseup-global-fallback]', {
      button: event.button,
      mode: interactionState.value.mode,
      pointerId: interactionState.value.pointerId,
    });
  }
  finalizeInteraction('global-mouseup-fallback', { commitDrag: true, eventSource: 'global' });
}

function onWindowBlur() {
  if (imageInteraction.value?.resizing) {
    finishImageResize(false, 'image-window-blur');
  }
  if (interactionState.value.mode === 'idle') return;
  finalizeInteraction('window-blur', { commitDrag: false, eventSource: 'system' });
}

function onVisibilityChange() {
  if (document.visibilityState !== 'hidden') return;
  if (imageInteraction.value?.resizing) {
    finishImageResize(false, 'image-visibilitychange-hidden');
  }
  if (interactionState.value.mode === 'idle') return;
  finalizeInteraction('visibilitychange-hidden', { commitDrag: false, eventSource: 'system' });
}

function readFileAsDataUrl(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.readAsDataURL(file);
  });
}

function loadImageMetadata(src: string) {
  return new Promise<{ naturalWidth: number; naturalHeight: number }>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve({ naturalWidth: image.naturalWidth, naturalHeight: image.naturalHeight });
    image.onerror = reject;
    image.src = src;
  });
}

async function createPastedNodeImage(file: File): Promise<MindNodeImage> {
  const src = await readFileAsDataUrl(file);
  const { naturalWidth, naturalHeight } = await loadImageMetadata(src);
  const initialWidth = Math.min(naturalWidth, 320);
  const size = clampImageSize({
    w: initialWidth,
    h: naturalWidth > 0 ? Math.round(naturalHeight * (initialWidth / naturalWidth)) : 0,
  });
  return {
    src,
    mime: file.type,
    width: size.w,
    height: size.h,
    naturalWidth,
    naturalHeight,
  };
}

async function onWindowPaste(event: ClipboardEvent) {
  const selectedNodeId = getPrimarySelectedId();
  const clipboardData = event.clipboardData;
  const items = Array.from(clipboardData?.items ?? []);
  const nodeClipboardState = parseClipboardNodePayload(clipboardData);
  const editingTextActive = isTextEditingActive(event.target);
  if (nodeClipboardState && selectedNodeId) {
    event.preventDefault();
    event.stopPropagation();
    setInternalClipboard(nodeClipboardState);
    executeCommand(
      nodeClipboardState.type === 'multi-subtree'
        ? createBatchPasteCommand(selectedNodeId, nodeClipboardState)
        : createPasteCommand(selectedNodeId)
    );
    return;
  }
  const imageItem = items.find((item) => item.type.startsWith('image/'));
  if (imageItem && selectedNodeId) {
    event.preventDefault();
    event.stopPropagation();
    const file = imageItem.getAsFile();
    if (!file) return;
    const node = getNodeById(selectedNodeId);
    if (!node) return;
    const afterImage = await createPastedNodeImage(file);
    executeCommand(
      createSetNodeImageCommand(
        {
          getNodes: getMindNodes,
          setSelection,
          applyMutation: applyDocumentMutation,
        },
        {
          nodeId: selectedNodeId,
          beforeImage: cloneNodeImage(getNodeImage(node)),
          afterImage,
          previousSelection: snapshotSelection(),
          nextSelection: { ids: [selectedNodeId], primaryId: selectedNodeId },
        }
      )
    );
    return;
  }

  if (editingTextActive) return;
  if (!selectedNodeId) return;
  const plainText = clipboardData?.getData('text/plain') ?? '';
  const lines = plainText
    .split(/\r\n|\n|\r/)
    .map((line) => line.trim())
    .filter(Boolean);
  if (!lines.length) return;
  event.preventDefault();
  event.stopPropagation();
  executeCommand(createPasteTextLinesCommand(selectedNodeId, lines));
}

async function handleBeforeCloseRequest(key: string) {
  if (isSaving.value) {
    await window.electronAPI.wm.closeResponse({ key, allow: false });
    return;
  }
  if (!isDirty.value) {
    await window.electronAPI.wm.closeResponse({ key, allow: true });
    return;
  }

  const shouldSave = window.confirm('窗口有未保存内容，是否先保存？');
  if (shouldSave) {
    const saved = await saveDocument();
    await window.electronAPI.wm.closeResponse({ key, allow: saved });
    return;
  }

  const shouldDiscard = window.confirm('确定不保存并关闭窗口吗？');
  await window.electronAPI.wm.closeResponse({ key, allow: shouldDiscard });
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (imageInteraction.value?.resizing && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    finishImageResize(false, 'image-escape');
    return;
  }
  if (interactionState.value.mode === 'draggingNodes' && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    cancelInteraction('escape');
    return;
  }
  const lowerKey = event.key.toLowerCase();
  const isModifierPressed = event.metaKey || event.ctrlKey;
  const isSaveShortcut = isModifierPressed && !event.altKey && !event.shiftKey && lowerKey === 's';
  const isSaveAsShortcut = isModifierPressed && !event.altKey && event.shiftKey && lowerKey === 's';
  const isToggleFormatPanelShortcut = isModifierPressed && !event.altKey && !event.shiftKey && lowerKey === 'w';
  if (isSaveShortcut) {
    event.preventDefault();
    event.stopPropagation();
    void saveDocument();
    return;
  }
  if (isSaveAsShortcut) {
    event.preventDefault();
    event.stopPropagation();
    void saveDocumentAs();
    return;
  }
  if (isToggleFormatPanelShortcut) {
    event.preventDefault();
    event.stopPropagation();
    emit('toggleFormatPanel');
    return;
  }
  if (editingSession.value && !isTextEditingActive(event.target)) return;
  if (event.isComposing || isTextEditingActive(event.target)) return;

  const isUndoShortcut = isModifierPressed && !event.altKey && lowerKey === 'z' && !event.shiftKey;
  const isRedoShortcut =
    isModifierPressed && !event.altKey && (lowerKey === 'y' || (lowerKey === 'z' && event.shiftKey));
  const isSelectAllShortcut = isModifierPressed && !event.altKey && lowerKey === 'a';
  const isCopyShortcut = isModifierPressed && !event.altKey && lowerKey === 'c';
  const isCutShortcut = isModifierPressed && !event.altKey && lowerKey === 'x';
  const isLevelMarkerShortcut =
    isModifierPressed &&
    !event.altKey &&
    !event.shiftKey &&
    ['1', '2', '3', '4', '5', '6', '7'].includes(event.key);
  const isErrorMarkerShortcut = isModifierPressed && !event.altKey && !event.shiftKey && lowerKey === 'e';
  const isTaskDoneMarkerShortcut = isModifierPressed && !event.altKey && !event.shiftKey && lowerKey === 'r';
  const isDeleteShortcut = event.key === 'Backspace' || event.key === 'Delete';
  const isEnterShortcut = event.key === 'Enter';
  const isTabShortcut = event.key === 'Tab';
  const isSpaceShortcut = event.key === ' ' && !isModifierPressed && !event.altKey;
  const isPrintableCharacter =
    event.key.length === 1 &&
    !isModifierPressed &&
    !event.altKey &&
    event.key !== ' ' &&
    !event.ctrlKey &&
    !event.metaKey;
  const shouldPreventDefault =
    isTabShortcut ||
    isEnterShortcut ||
    isDeleteShortcut ||
    isSelectAllShortcut ||
    isCutShortcut ||
    isLevelMarkerShortcut ||
    isErrorMarkerShortcut ||
    isTaskDoneMarkerShortcut ||
    isUndoShortcut ||
    isRedoShortcut ||
    isSpaceShortcut ||
    isPrintableCharacter;

  if (shouldPreventDefault) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (isUndoShortcut) {
    stopEditingSession();
    resetCommandDebugState();
    history.undo();
    return;
  }

  if (isRedoShortcut) {
    stopEditingSession();
    resetCommandDebugState();
    history.redo();
    return;
  }

  if (isSelectAllShortcut) {
    selectAllNodesInCurrentSheet();
    return;
  }

  const primarySelectedId = getPrimarySelectedId();
  const selectedNodeIds = getSelectedNodeIds();
  const selectedCount = selectedNodeIds.length;

  if (primarySelectedId && isSpaceShortcut) {
    startEditing(primarySelectedId, { mode: 'append', caretPlacement: 'end' });
    return;
  }

  if (primarySelectedId && isPrintableCharacter && !isComposing.value) {
    startEditing(primarySelectedId, { mode: 'replace', insertedText: event.key, caretPlacement: 'end' });
    return;
  }

  if (isCopyShortcut) {
    return;
  }

  if (isLevelMarkerShortcut) {
    void applyMarkerToSelectedNodes(`level:level${event.key}`);
    return;
  }

  if (isErrorMarkerShortcut) {
    void applyMarkerToSelectedNodes('other:error');
    return;
  }

  if (isTaskDoneMarkerShortcut) {
    void applyMarkerToSelectedNodes('task:100');
    return;
  }

  if (isCutShortcut) {
    const normalized = normalizeSelectedTargets({
      allowRoot: false,
    });
    setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
    if (!normalized.finalTargets.length) return;
    stopEditingSession();
    executeCommand(
      normalized.finalTargets.length === 1
        ? createCutCommand(normalized.finalTargets[0].nodeId)
        : createBatchCutSelectionCommand(normalized.finalTargets.map((target) => target.nodeId))
    );
    return;
  }

  if (!primarySelectedId) return;

  if (isDeleteShortcut) {
    const normalized = normalizeSelectedTargets({
      allowRoot: false,
    });
    setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
    if (!normalized.finalTargets.length) return;
    stopEditingSession();
    executeCommand(
      normalized.finalTargets.length === 1
        ? createDeleteCommand(normalized.finalTargets[0].nodeId)
        : createBatchDeleteSelectionCommand(normalized.finalTargets.map((target) => target.nodeId))
    );
    return;
  }

  if (isTabShortcut) {
    if (selectedCount >= 2) {
      const uniqueTargets = Array.from(new Set(selectedNodeIds));
      executeCommand(createBatchAddChildSelectionCommand(uniqueTargets));
      return;
    }
    executeCommand(createAddChildCommand(primarySelectedId));
    return;
  }

  if (isEnterShortcut) {
    if (selectedCount >= 2) {
      const nodes = getMindNodes() ?? {};
      const targetInfos = selectedNodeIds
        .map((nodeId) => getSelectionTargetInfo(nodes, nodeId))
        .filter((value): value is NonNullable<typeof value> => !!value)
        .sort(compareSelectionTargetInfo);
      const siblingTargetIds = targetInfos
        .filter((info) => info.parentId != null)
        .map((info) => info.nodeId);
      if (!siblingTargetIds.length) {
        executeCommand(createBatchAddChildSelectionCommand(selectedNodeIds));
        return;
      }
      executeCommand(createBatchAddSiblingSelectionCommand(siblingTargetIds));
      return;
    }
    const parentInfo = findParentAndIndex(primarySelectedId);
    if (!parentInfo) {
      executeCommand(createAddChildCommand(primarySelectedId));
      return;
    }
    executeCommand(createAddSiblingCommand(primarySelectedId));
  }
}

function maybeApplyInitialFit(reason = 'initial-fit') {
  if (hasSavedViewport.value || hasAppliedInitialFit.value) return;
  const el = viewportRef.value;
  if (!el || !layoutBounds.value) return;
  if (el.clientWidth < 100 || el.clientHeight < 100) return;

  withCameraResetLog(reason, () => {
    centerCamera(1, layoutBounds.value);
    constrainToBounds();
  });
  hasAppliedInitialFit.value = true;
  draw();
}

function onScrollbarMouseDown(axis: 'x' | 'y', event: MouseEvent) {
  const state = axis === 'x' ? horizontalScrollbar.value : verticalScrollbar.value;
  if (!state.visible || !state.scrollable) return;

  scrollbarAxis = axis;
  scrollbarStartClient = axis === 'x' ? event.clientX : event.clientY;
  scrollbarStartOffset = state.thumbOffset;
  isScrollbarDragging.value = true;

  window.addEventListener('mousemove', onScrollbarMouseMove);
  window.addEventListener('mouseup', onScrollbarMouseUp);
}

function onScrollbarMouseMove(event: MouseEvent) {
  if (!scrollbarAxis) return;

  const state = scrollbarAxis === 'x' ? horizontalScrollbar.value : verticalScrollbar.value;
  const currentClient = scrollbarAxis === 'x' ? event.clientX : event.clientY;
  const travel = Math.max(1, state.trackSize - state.thumbSize);
  const nextThumbOffset = Math.min(travel, Math.max(0, scrollbarStartOffset + currentClient - scrollbarStartClient));
  const ratio = nextThumbOffset / travel;
  const nextOffset = state.maxOffset - ratio * (state.maxOffset - state.minOffset);

  setCamera({
    ...camera.value,
    tx: scrollbarAxis === 'x' ? nextOffset : camera.value.tx,
    ty: scrollbarAxis === 'y' ? nextOffset : camera.value.ty,
  });
  requestRender();
  schedulePersistViewport();
}

function onScrollbarMouseUp() {
  scrollbarAxis = null;
  isScrollbarDragging.value = false;
  window.removeEventListener('mousemove', onScrollbarMouseMove);
  window.removeEventListener('mouseup', onScrollbarMouseUp);
}

function handleResize() {
  resizeToViewport();
  nextTick().then(() => {
    if (!hasSavedViewport.value && !hasAppliedInitialFit.value) {
      maybeApplyInitialFit('resize:initial-fit');
      return;
    }
    withCameraResetLog('resize:constrain-to-bounds', () => constrainToBounds());
    draw();
  });
}

function onCompositionStart() {
  isComposing.value = true;
}

function onCompositionEnd() {
  isComposing.value = false;
}

onMounted(() => {
  logRendererDebugInstructions();
  removeBeforeCloseListener = window.electronAPI.on('wm:before-close', async (_event: any, { key }: any) => {
    await handleBeforeCloseRequest(key);
  });
  // 监听 wheel 在 viewport 上（必须 passive:false 才能 preventDefault）
  if (viewportRef.value) viewportRef.value.addEventListener('wheel', onWheel as any, { passive: false });
  if (viewportRef.value) {
    resizeObserver = new ResizeObserver(() => {
      handleResize();
    });
    resizeObserver.observe(viewportRef.value);
  }

  redrawAll('mounted');

  window.addEventListener('resize', handleResize);
  window.addEventListener('keydown', onWindowKeyDown);
  window.addEventListener('copy', onWindowCopy, true);
  window.addEventListener('paste', onWindowPaste, true);
  window.addEventListener('compositionstart', onCompositionStart, true);
  window.addEventListener('compositionend', onCompositionEnd, true);
});

watch(
  () => props.doc,
  () => {
    if (!props.doc) return;
    ensureMindRoots(props.doc);
    if (isLocalDocWatchSuppressed()) return;
    redrawAll('watch:doc');
  },
  { deep: true }
);

watch(
  [isDirty, isSaving, () => props.filePath],
  () => {
    emitSaveState();
  },
  { immediate: true }
);

watch(
  [selectedIds, () => props.doc],
  () => {
    emitNodeCountState();
  },
  { immediate: true, deep: true }
);

watch(
  [selectedIds, contentRevision, () => props.doc],
  () => {
    syncStylePanelFromSelection();
  },
  { immediate: true, deep: false }
);

watch(
  selectedIds,
  (nextSelection) => {
    if (!nextSelection.size) {
      primarySelectedNodeId.value = null;
      selectionAnchorNodeId.value = null;
      selectionAnchorByGroup.value = {};
      return;
    }
    if (!primarySelectedNodeId.value || !nextSelection.has(primarySelectedNodeId.value)) {
      primarySelectedNodeId.value = Array.from(nextSelection).at(-1) ?? null;
    }
    const nextGroupAnchors = { ...selectionAnchorByGroup.value };
    for (const [groupKey, anchorId] of Object.entries(nextGroupAnchors)) {
      if (!nextSelection.has(anchorId)) delete nextGroupAnchors[groupKey];
    }
    selectionAnchorByGroup.value = nextGroupAnchors;
    if (!selectionAnchorNodeId.value || !nextSelection.has(selectionAnchorNodeId.value)) {
      selectionAnchorNodeId.value = primarySelectedNodeId.value;
    }
    if (selectionAnchorNodeId.value) {
      const groupKey = getSelectionGroupKey(selectionAnchorNodeId.value);
      if (groupKey && !selectionAnchorByGroup.value[groupKey]) {
        selectionAnchorByGroup.value = {
          ...selectionAnchorByGroup.value,
          [groupKey]: selectionAnchorNodeId.value,
        };
      }
    }
  },
  { deep: false }
);

watch(
  () => ({
    editingNodeId: editingSession.value?.nodeId ?? null,
    primaryId: getPrimarySelectedId(),
    selectionKey: Array.from(selectedIds.value).sort().join('|'),
  }),
  () => {
    const current = imageInteraction.value;
    if (!current) return;
    if (editingSession.value || !selectedIds.value.has(current.nodeId) || getPrimarySelectedId() !== current.nodeId) {
      clearImageInteraction('selection-or-editing-changed');
      requestRender();
    }
  }
);

onBeforeUnmount(() => {
  clearCollapseTagHideTimer();
  removeBeforeCloseListener?.();
  removeBeforeCloseListener = null;
  clearImageInteraction('beforeUnmount');
  clearPersistTimer();
  cleanup();
  cleanupMarquee();
  cancelInteraction('beforeUnmount');
  removeGlobalDragListeners();
  if (mutationFlushRafId != null) cancelAnimationFrame(mutationFlushRafId);
  mutationFlushRafId = null;
  pendingMutationResolvers.forEach((resolve) => resolve());
  pendingMutationResolvers = [];
  onScrollbarMouseUp();
  hoverNodeId.value = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (drawRafId != null) cancelAnimationFrame(drawRafId);
  if (viewportRef.value) viewportRef.value.removeEventListener('wheel', onWheel as any);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', onWindowKeyDown);
  window.removeEventListener('copy', onWindowCopy, true);
  window.removeEventListener('paste', onWindowPaste, true);
  window.removeEventListener('compositionstart', onCompositionStart, true);
  window.removeEventListener('compositionend', onCompositionEnd, true);
});
</script>

<style scoped lang="scss">
.main-layout {
  height: 100%;
  display: flex;
  gap: 10px;
  min-width: 0;
}

.main-container {
  flex: 1 1 auto;
  height: 100%;
  min-width: 0;
  box-sizing: border-box;
  overflow: hidden;
  position: relative;
  background: #ffffff;
  border-radius: 10px;
  /* 类似 XMind：禁止浏览器触控默认行为（可选） */
  touch-action: none;
  cursor: default;
}

.format-panel-shell {
  flex: 0 0 15%;
  width: 15%;
  min-width: 270px;
  max-width: 15%;
  height: 100%;
  display: flex;
  justify-content: flex-start;
  // padding-right: 10px;
}

.format-panel {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(245, 247, 250, 0.92)),
    #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow:
    0 12px 24px rgba(15, 23, 42, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.format-panel-header {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.78);
}

.format-panel-tab {
  min-width: 66px;
  height: 30px;
  padding: 0 14px;
  border: none;
  border-radius: 999px;
  background: transparent;
  color: #64748b;
  font-size: 13px;
  font-weight: 600;
  cursor: pointer;
  transition:
    background-color 0.18s ease,
    color 0.18s ease,
    box-shadow 0.18s ease;
}

.format-panel-tab:hover {
  background: rgba(148, 163, 184, 0.14);
  color: #0f172a;
}

.format-panel-tab.is-active {
  background: #0f172a;
  color: #f8fafc;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
}

.format-panel-body {
  position: relative;
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 14px 12px 18px;
}

.style-panel {
  display: flex;
  flex-direction: column;
  gap: 22px;
}

.style-section {
  display: flex;
  flex-direction: column;
  gap: 14px;
  padding: 14px;
  border: 1px solid rgba(226, 232, 240, 0.96);
  border-radius: 16px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.98) 100%);
  box-shadow: 0 8px 22px rgba(15, 23, 42, 0.04);
}

.style-section + .style-section {
  margin-top: 2px;
}

.style-section-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 2px;
}

.style-section-title {
  margin: 0;
  color: #0f172a;
  font-size: 13px;
  font-weight: 800;
  letter-spacing: 0.04em;
}

.style-control-block {
  display: flex;
  flex-direction: column;
  gap: 12px;
  padding-top: 2px;
}

.style-control-labels {
  display: flex;
  align-items: center;
}

.style-control-title,
.style-inline-field-label {
  color: #334155;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.04em;
}

.style-preview-grid {
  display: grid;
  gap: 8px;
}

.style-preview-grid--fill {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.style-preview-grid--border {
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.style-preview-card {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 8px;
  border: 1px solid rgba(203, 213, 225, 0.86);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%);
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.05);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.style-preview-card:hover,
.style-font-card:hover,
.style-weight-card:hover,
.style-size-chip:hover,
.style-toggle-button:hover,
.style-align-button:hover {
  transform: translateY(-1px);
}

.style-preview-card:hover,
.style-font-card:hover,
.style-weight-card:hover {
  border-color: rgba(15, 23, 42, 0.26);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.style-preview-card.is-selected,
.style-font-card.is-selected,
.style-weight-card.is-selected,
.style-size-chip.is-selected,
.style-toggle-button.is-selected,
.style-align-button.is-selected {
  border-color: rgba(15, 23, 42, 0.82);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
}

.style-preview-card-art {
  display: block;
  width: 100%;
  border-radius: 12px;
  overflow: hidden;
}

.style-preview-card-art :deep(svg) {
  display: block;
  width: 100%;
  height: auto;
}

.style-preview-card-copy {
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.style-preview-card-title,
.style-font-title {
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
}

.style-preview-card-subtitle,
.style-font-stack {
  color: #64748b;
  font-size: 11px;
  line-height: 1.35;
}

.style-inline-field {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.style-color-picker {
  display: grid;
  grid-template-columns: repeat(6, minmax(0, 1fr));
  gap: 8px;
}

.style-color-item {
  position: relative;
  width: 100%;
  aspect-ratio: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid rgba(203, 213, 225, 0.92);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.98);
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.style-color-item:hover {
  border-color: rgba(15, 23, 42, 0.3);
  box-shadow: 0 6px 14px rgba(15, 23, 42, 0.08);
  transform: translateY(-1px);
}

.style-color-item[data-state='checked'] {
  border-color: rgba(15, 23, 42, 0.82);
  box-shadow: 0 0 0 3px rgba(15, 23, 42, 0.12);
}

.style-color-swatch {
  width: 18px;
  height: 18px;
  display: inline-block;
  border-radius: 999px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.18);
}

.style-color-indicator {
  position: absolute;
  inset: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  color: #0f172a;
  font-size: 11px;
  font-weight: 800;
  text-shadow: 0 0 8px rgba(255, 255, 255, 0.9);
  pointer-events: none;
}

.style-weight-grid,
.style-size-grid,
.style-toggle-grid,
.style-align-grid {
  display: grid;
  gap: 8px;
}

.style-weight-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.style-size-grid {
  grid-template-columns: repeat(5, minmax(0, 1fr));
}

.style-toggle-grid {
  grid-template-columns: repeat(4, minmax(0, 1fr));
}

.style-align-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.style-weight-card,
.style-size-chip,
.style-toggle-button,
.style-align-button {
  min-width: 0;
  border: 1px solid rgba(203, 213, 225, 0.9);
  background: rgba(255, 255, 255, 0.98);
  color: #0f172a;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    box-shadow 0.16s ease,
    transform 0.16s ease;
}

.style-weight-card {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 10px 6px 8px;
  border-radius: 12px;
}

.style-weight-line {
  width: 100%;
  max-width: 30px;
  border-radius: 999px;
  background: #0f172a;
}

.style-weight-label {
  color: #475569;
  font-size: 11px;
  font-weight: 600;
}

.style-font-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr);
  gap: 8px;
}

.style-font-card {
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  border-radius: 14px;
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98) 0%, rgba(248, 250, 252, 0.96) 100%);
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease;
}

.style-font-sample {
  flex: 0 0 auto;
  width: 30px;
  min-width: 30px;
  color: #0f172a;
  font-size: 20px;
  line-height: 1;
}

.style-font-copy {
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 2px;
  text-align: left;
}

.style-font-title,
.style-font-stack {
  white-space: normal;
  word-break: break-word;
}

.style-size-chip,
.style-toggle-button,
.style-align-button {
  height: 34px;
  border-radius: 10px;
  font-size: 12px;
  font-weight: 700;
}

.style-size-chip {
  padding: 0;
}

.style-toggle-button.is-bold {
  font-weight: 800;
}

.style-toggle-button.is-italic {
  font-style: italic;
}

.style-toggle-button.is-underline {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.style-toggle-button.is-strike {
  text-decoration: line-through;
}

.style-align-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.style-align-preview {
  width: 18px;
  display: inline-flex;
  flex-direction: column;
  gap: 3px;
}

.style-align-preview span {
  height: 2px;
  border-radius: 999px;
  background: currentColor;
}

.style-align-preview.is-left span:nth-child(1) {
  width: 100%;
}

.style-align-preview.is-left span:nth-child(2) {
  width: 70%;
}

.style-align-preview.is-left span:nth-child(3) {
  width: 86%;
}

.style-align-preview.is-center {
  align-items: center;
}

.style-align-preview.is-center span:nth-child(1) {
  width: 100%;
}

.style-align-preview.is-center span:nth-child(2) {
  width: 74%;
}

.style-align-preview.is-center span:nth-child(3) {
  width: 88%;
}

.style-align-preview.is-right {
  align-items: flex-end;
}

.style-align-preview.is-right span:nth-child(1) {
  width: 100%;
}

.style-align-preview.is-right span:nth-child(2) {
  width: 70%;
}

.style-align-preview.is-right span:nth-child(3) {
  width: 86%;
}

.marker-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.marker-panel.is-disabled {
  user-select: none;
}

.marker-group {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.marker-group-title {
  margin: 0;
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.marker-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 6px;
}

.marker-tile {
  aspect-ratio: 1;
  width: 100%;
  min-width: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0;
  border: 1px solid transparent;
  border-radius: 10px;
  background: transparent;
  cursor: default;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.marker-panel.is-disabled .marker-tile {
  pointer-events: none;
}

.marker-tile:hover {
  background: rgba(15, 23, 42, 0.07);
  border-color: rgba(148, 163, 184, 0.28);
  cursor: pointer;
  transform: translateY(-1px);
}

.marker-tile-icon {
  width: 22px;
  height: 22px;
  object-fit: contain;
  pointer-events: none;
}

.marker-mode-panel {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(226, 232, 240, 0.92);
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.marker-mode-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.marker-mode-label {
  color: #334155;
  font-size: 12px;
  font-weight: 600;
}

.marker-mode-switch {
  position: relative;
  width: 38px;
  height: 22px;
  border: none;
  border-radius: 999px;
  background: rgba(148, 163, 184, 0.38);
  cursor: pointer;
  transition: background-color 0.18s ease;
}

.marker-mode-switch.is-on {
  background: rgba(208, 47, 72, 0.9);
}

.marker-mode-switch-thumb {
  position: absolute;
  left: 3px;
  top: 3px;
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: #ffffff;
  box-shadow: 0 1px 3px rgba(15, 23, 42, 0.2);
  transition: transform 0.18s ease;
}

.marker-mode-switch.is-on .marker-mode-switch-thumb {
  transform: translateX(16px);
}

.marker-clear-button {
  height: 32px;
  border: 1px solid rgba(208, 47, 72, 0.2);
  border-radius: 10px;
  background: rgba(208, 47, 72, 0.08);
  color: #9f1239;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    background-color 0.16s ease,
    border-color 0.16s ease,
    transform 0.16s ease;
}

.marker-clear-button:hover {
  background: rgba(208, 47, 72, 0.14);
  border-color: rgba(208, 47, 72, 0.3);
  transform: translateY(-1px);
}

.marker-panel.is-disabled .marker-mode-switch,
.marker-panel.is-disabled .marker-clear-button {
  pointer-events: none;
}

.format-panel-body-mask {
  position: absolute;
  inset: 0;
  border-radius: 0 0 10px 10px;
  background: rgba(241, 245, 249, 0.56);
  backdrop-filter: saturate(0.85);
  pointer-events: auto;
}

.mind-canvas {
  width: 100%;
  height: 100%;
  display: block;
  border-radius: inherit;
}

.mind-scrollbar {
  position: absolute;
  pointer-events: auto;
  z-index: 2;
}

.mind-scrollbar-track {
  position: relative;
  width: 100%;
  height: 100%;
  border-radius: 999px;
  background: transparent;
}

.mind-scrollbar-x {
  left: 6px;
  right: 6px;
  bottom: 4px;
  height: 6px;
}

.mind-scrollbar-y {
  top: 6px;
  right: 4px;
  bottom: 6px;
  width: 6px;
}

.mind-scrollbar-thumb {
  position: absolute;
  left: 0;
  top: 0;
  min-width: 28px;
  min-height: 28px;
  border-radius: 999px;
  background: rgba(60, 60, 67, 0.26);
  backdrop-filter: blur(6px);
  pointer-events: auto;
  transition: background-color 120ms ease, opacity 120ms ease;
}

.mind-scrollbar-x .mind-scrollbar-thumb {
  height: 100%;
  min-height: 6px;
}

.mind-scrollbar-y .mind-scrollbar-thumb {
  width: 100%;
  min-width: 6px;
}

.main-container:hover .mind-scrollbar-thumb,
.mind-scrollbar-thumb.is-active {
  background: rgba(60, 60, 67, 0.42);
}
</style>
