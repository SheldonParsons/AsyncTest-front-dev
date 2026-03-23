<template>
  <div class="main-layout">
    <div v-if="showSearchPanel" class="search-panel-shell" @pointerdown.stop @mousedown.stop @click.stop>
      <aside class="search-panel">
        <div class="search-panel-header">
          <button class="search-panel-tab" :class="{ 'is-active': searchPanelTab === 'text' }" type="button"
            @click="searchPanelTab = 'text'">
            文本
          </button>
          <button class="search-panel-tab" :class="{ 'is-active': searchPanelTab === 'mark' }" type="button"
            @click="searchPanelTab = 'mark'">
            标记
          </button>
        </div>
        <div class="search-panel-body">
          <div v-if="searchPanelTab === 'text'" class="search-pane">
            <section class="search-query-card">
              <input id="mind-search-text-input" v-model="searchTextQuery" class="search-query-input" type="text"
                placeholder="查找内容" autocomplete="off" spellcheck="false" @keydown.stop />
              <input v-model="searchReplaceText" class="search-query-input" type="text" placeholder="替换为"
                autocomplete="off" spellcheck="false" @keydown.stop />
              <div class="search-action-row">
                <button class="search-action-button" type="button" :disabled="!canReplaceSelectedSearchResult"
                  @click="replaceSelectedSearchResult">
                  替换
                </button>
                <button class="search-action-button" type="button" :disabled="!canReplaceAllSearchResults"
                  @click="replaceAllSearchResults">
                  全部替换
                </button>
              </div>
            </section>

            <div class="search-results-meta">
              <span class="search-results-count">{{ searchTextResultCountLabel }}</span>
            </div>

            <div v-if="searchTextResults.length" class="search-result-shell">
              <div ref="searchResultScrollRef" class="search-result-list-shell" @scroll.passive="updateSearchResultScrollMetrics">
                <div class="search-result-list">
                  <button v-for="(result, index) in searchTextResults" :key="result.nodeId" class="search-result-item"
                    :class="{ 'is-active': selectedSearchResultNodeId === result.nodeId }" type="button"
                    @click="onSearchTextResultClick(result.nodeId)">
                    <span class="search-result-order">{{ index + 1 }}</span>
                    <span class="search-result-text" :data-empty="result.singleLineText ? 'false' : 'true'">{{
                      result.singleLineText }}</span>
                  </button>
                </div>
              </div>
              <div ref="searchResultHorizontalScrollbarRef" v-show="searchResultScrollMetrics.showHorizontal"
                class="search-panel-scrollbar search-panel-scrollbar-x"
                @mousedown.prevent="onSearchResultScrollbarTrackMouseDown('horizontal', $event)">
                <div class="search-panel-scrollbar-thumb"
                  :class="{ 'is-dragging': searchResultScrollbarDrag?.axis === 'horizontal', 'is-disabled': !searchResultScrollMetrics.horizontalScrollable }"
                  :style="{
                    width: `${searchResultScrollMetrics.horizontalThumbSize}px`,
                    transform: `translateX(${searchResultScrollMetrics.horizontalThumbOffset}px)`,
                  }" @mousedown.stop.prevent="startSearchResultScrollbarDrag('horizontal', $event)" />
              </div>
              <div ref="searchResultVerticalScrollbarRef" v-show="searchResultScrollMetrics.showVertical"
                class="search-panel-scrollbar search-panel-scrollbar-y"
                @mousedown.prevent="onSearchResultScrollbarTrackMouseDown('vertical', $event)">
                <div class="search-panel-scrollbar-thumb"
                  :class="{ 'is-dragging': searchResultScrollbarDrag?.axis === 'vertical', 'is-disabled': !searchResultScrollMetrics.verticalScrollable }"
                  :style="{
                    height: `${searchResultScrollMetrics.verticalThumbSize}px`,
                    transform: `translateY(${searchResultScrollMetrics.verticalThumbOffset}px)`,
                  }" @mousedown.stop.prevent="startSearchResultScrollbarDrag('vertical', $event)" />
              </div>
            </div>

            <div v-else class="search-empty-state">
              {{ searchTextEmptyState }}
            </div>
          </div>

          <div v-else class="search-pane">
            <div class="search-marker-groups">
              <section v-for="group in markerPanelGroups" :key="group.key" class="marker-group">
                <h3 class="marker-group-title">{{ group.label }}</h3>
                <div class="marker-grid">
                  <button v-for="marker in group.items" :key="marker.key" class="marker-tile search-marker-tile"
                    :class="{ 'is-selected': searchMarkerKeys.includes(marker.key) }" type="button" :title="marker.name"
                    @click="onSearchMarkerTileClick(marker.key)">
                    <img class="marker-tile-icon" :src="marker.src" :alt="marker.name" />
                  </button>
                </div>
              </section>
            </div>

            <div class="search-results-meta">
              <span class="search-results-count">{{ searchMarkerResultCountLabel }}</span>
              <span v-if="selectedSearchMarkerSummary" class="search-results-chip">{{ selectedSearchMarkerSummary }}</span>
            </div>

            <div v-if="searchMarkerResults.length" class="search-result-shell">
              <div ref="searchResultScrollRef" class="search-result-list-shell" @scroll.passive="updateSearchResultScrollMetrics">
                <div class="search-result-list">
                  <button v-for="(result, index) in searchMarkerResults" :key="result.nodeId" class="search-result-item"
                    :class="{ 'is-active': primarySelectedNodeId === result.nodeId }" type="button"
                    @click="focusSearchResultNode(result.nodeId)">
                    <span class="search-result-order">{{ index + 1 }}</span>
                    <span class="search-result-text" :data-empty="result.singleLineText ? 'false' : 'true'">{{
                      result.singleLineText }}</span>
                  </button>
                </div>
              </div>
              <div ref="searchResultHorizontalScrollbarRef" v-show="searchResultScrollMetrics.showHorizontal"
                class="search-panel-scrollbar search-panel-scrollbar-x"
                @mousedown.prevent="onSearchResultScrollbarTrackMouseDown('horizontal', $event)">
                <div class="search-panel-scrollbar-thumb"
                  :class="{ 'is-dragging': searchResultScrollbarDrag?.axis === 'horizontal', 'is-disabled': !searchResultScrollMetrics.horizontalScrollable }"
                  :style="{
                    width: `${searchResultScrollMetrics.horizontalThumbSize}px`,
                    transform: `translateX(${searchResultScrollMetrics.horizontalThumbOffset}px)`,
                  }" @mousedown.stop.prevent="startSearchResultScrollbarDrag('horizontal', $event)" />
              </div>
              <div ref="searchResultVerticalScrollbarRef" v-show="searchResultScrollMetrics.showVertical"
                class="search-panel-scrollbar search-panel-scrollbar-y"
                @mousedown.prevent="onSearchResultScrollbarTrackMouseDown('vertical', $event)">
                <div class="search-panel-scrollbar-thumb"
                  :class="{ 'is-dragging': searchResultScrollbarDrag?.axis === 'vertical', 'is-disabled': !searchResultScrollMetrics.verticalScrollable }"
                  :style="{
                    height: `${searchResultScrollMetrics.verticalThumbSize}px`,
                    transform: `translateY(${searchResultScrollMetrics.verticalThumbOffset}px)`,
                  }" @mousedown.stop.prevent="startSearchResultScrollbarDrag('vertical', $event)" />
              </div>
            </div>

            <div v-else class="search-empty-state">
              {{ searchMarkerEmptyState }}
            </div>
          </div>
        </div>
      </aside>
    </div>

    <div class="main-container" ref="viewportRef" tabindex="0">
      <canvas ref="canvasRef" class="mind-canvas" :width="canvasPixelW" :height="canvasPixelH" :style="canvasStyle"
        @dblclick="onCanvasDoubleClick" @pointerdown="onCanvasPointerDown" @pointermove="onCanvasPointerMove"
        @pointerleave="onCanvasPointerLeave" @pointerup="onCanvasPointerUp" @pointercancel="onCanvasPointerCancel"
        @contextmenu="onCanvasContextMenu" @lostpointercapture="onCanvasLostPointerCapture" />
      <LexicalNodeEditorOverlay :visible="!!editingSession"
        :overlay-root-style="editingOverlayRootStyle" :text-box-rect="editingScreenTextBoxRect"
        :editor-shell-style="editingEditorShellStyle" :calibration-style="editingCalibrationStyle"
        :inner-translate-ypx="editingOverlayInnerTranslateYPx"
        :expected-glyph-top-px="editingCanvasTopLeadingPx * camera.scale"
        :expected-glyph-center-px="editingCanvasGlyphCenterYPx"
        :node-id="editingSession?.nodeId ?? ''"
        :initial-state="editingDisplayLexicalState" :mode="editingSession?.mode ?? 'append'"
        :caret-placement="editingSession?.caretPlacement ?? 'end'" @change="onLexicalEditorChange" @commit="commitEditingSession"
        @cancel="cancelEditingSession"></LexicalNodeEditorOverlay>
      <textarea ref="pendingDirectTypeInputRef" class="mind-ime-capture" tabindex="-1" autocomplete="off"
        autocapitalize="off" autocorrect="off" spellcheck="false" @input="onPendingDirectTypeInput"
        @compositionstart.stop="onPendingDirectTypeCaptureCompositionStart"
        @compositionupdate.stop="onPendingDirectTypeCaptureCompositionUpdate"
        @compositionend.stop="onPendingDirectTypeCaptureCompositionEnd" @blur="onPendingDirectTypeCaptureBlur" />

      <div v-if="horizontalScrollbar.visible" class="mind-scrollbar mind-scrollbar-x">
        <div class="mind-scrollbar-track">
          <div class="mind-scrollbar-thumb" :class="{ 'is-active': isScrollbarDragging }" :style="{
            width: `${horizontalScrollbar.thumbSize}px`,
            transform: `translateX(${horizontalScrollbar.thumbOffset}px)`,
          }" @mousedown.stop.prevent="onScrollbarMouseDown('x', $event)"></div>
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
        <div class="format-panel-body" :class="{ 'is-disabled': !hasSelectedNodes }">
          <div v-if="formatPanelTab === 'style'" class="style-panel" @pointerdown.prevent @mousedown.prevent>
            <section class="style-section">
              <div class="style-section-header">
                <h3 class="style-section-title">形状</h3>
              </div>

              <div class="style-control-block">
                <div class="style-control-labels">
                  <span class="style-control-title">填充</span>
                </div>
                <div class="style-preview-grid style-preview-grid--fill">
                  <button v-for="option in styleFillOptions" :key="option.key" class="style-preview-card"
                    :class="{ 'is-selected': selectedFillPresetKey === option.key }" type="button" :title="option.label"
                    @click="onFillPresetSelect(option.key)">
                    <span class="style-preview-card-art" v-html="option.previewSvg" />
                    <span class="style-preview-card-copy">
                      <span class="style-preview-card-title">{{ option.label }}</span>
                      <span class="style-preview-card-subtitle">{{ option.caption }}</span>
                    </span>
                  </button>
                </div>
                <div class="style-inline-field">
                  <span class="style-inline-field-label">填充颜色</span>
                  <ColorSwatchPickerRoot :model-value="selectedFillColor" as-child orientation="horizontal"
                    :highlight-on-hover="true" @update:model-value="onFillColorSelect">
                    <div class="style-color-picker">
                      <ColorSwatchPickerItem v-for="color in styleFillColorSwatches" :key="`fill-${color}`"
                        :value="color" as-child>
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
                  <button v-for="option in styleBorderOptions" :key="option.key" class="style-preview-card"
                    :class="{ 'is-selected': selectedBorderPresetKey === option.key }" type="button"
                    :title="option.label" @click="onBorderPresetSelect(option.key)">
                    <span class="style-preview-card-art" v-html="option.previewSvg" />
                    <span class="style-preview-card-copy">
                      <span class="style-preview-card-title">{{ option.label }}</span>
                      <span class="style-preview-card-subtitle">{{ option.caption }}</span>
                    </span>
                  </button>
                </div>
                <div class="style-inline-field">
                  <span class="style-inline-field-label">边框颜色</span>
                  <ColorSwatchPickerRoot :model-value="selectedBorderColor" as-child orientation="horizontal"
                    :highlight-on-hover="true" @update:model-value="onBorderColorSelect">
                    <div class="style-color-picker">
                      <ColorSwatchPickerItem v-for="color in styleOutlineColorSwatches" :key="`border-${color}`"
                        :value="color" as-child>
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
                    <button v-for="option in styleStrokeWidthOptions" :key="option.key" class="style-weight-card"
                      :class="{ 'is-selected': selectedBorderWidthKey === option.key }" type="button"
                      :title="option.label" @click="onBorderWidthSelect(option.key)">
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
                <div class="style-control-mask-shell">
                  <div class="style-font-grid" :class="{ 'is-editing-locked': !!editingSession }">
                    <button v-for="option in styleFontOptions" :key="option.key" class="style-font-card"
                      :class="{ 'is-selected': selectedFontKey === option.key }" type="button"
                      @click="onFontFamilySelect(option.key)">
                      <span class="style-font-sample" :style="{ fontFamily: option.fontFamily }">Aa</span>
                      <span class="style-font-copy">
                        <span class="style-font-title">{{ option.label }}</span>
                        <span class="style-font-stack">{{ option.sample }}</span>
                      </span>
                    </button>
                  </div>
                  <div v-if="editingSession" class="style-control-mask" aria-hidden="true" />
                </div>
              </div>

              <div class="style-control-block">
                <div class="style-inline-field">
                  <span class="style-inline-field-label">字号</span>
                  <div class="style-control-mask-shell">
                    <div class="style-size-grid" :class="{ 'is-editing-locked': !!editingSession }">
                      <button v-for="size in styleFontSizes" :key="size" class="style-size-chip"
                        :class="{ 'is-selected': selectedFontSize === size }" type="button"
                        @click="onFontSizeSelect(size)">
                        {{ size }}
                      </button>
                    </div>
                    <div v-if="editingSession" class="style-control-mask" aria-hidden="true" />
                  </div>
                </div>

                <div class="style-inline-field">
                  <span class="style-inline-field-label">字体颜色</span>
                  <ColorSwatchPickerRoot :model-value="selectedTextColor" as-child orientation="horizontal"
                    :highlight-on-hover="true" @update:model-value="onTextColorSelect">
                    <div class="style-color-picker">
                      <ColorSwatchPickerItem v-for="color in styleOutlineColorSwatches" :key="`text-${color}`"
                        :value="color" as-child>
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
                    <button v-for="option in styleTextToggleOptions" :key="option.key" class="style-toggle-button"
                      :class="[
                        option.previewClass,
                        { 'is-selected': textToggleState[option.key] },
                      ]" type="button" :title="option.label" @click="onTextToggleClick(option.key)">
                      {{ option.glyph }}
                    </button>
                  </div>
                </div>

                <div class="style-inline-field">
                  <span class="style-inline-field-label">对齐</span>
                  <div class="style-align-grid">
                    <button v-for="option in styleTextAlignOptions" :key="option.key" class="style-align-button"
                      :class="{ 'is-selected': selectedTextAlign === option.key }" type="button" :title="option.label"
                      @click="onTextAlignSelect(option.key)">
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
          <div v-if="formatPanelTab === 'mark'" class="marker-panel" :class="{ 'is-disabled': !hasSelectedNodes }">
            <section v-for="group in markerPanelGroups" :key="group.key" class="marker-group">
              <h3 class="marker-group-title">{{ group.label }}</h3>
              <div class="marker-grid">
                <button v-for="marker in group.items" :key="marker.key" class="marker-tile" type="button"
                  :title="marker.name" @click="onMarkerTileClick(marker.key)">
                  <img class="marker-tile-icon" :src="marker.src" :alt="marker.name" />
                </button>
              </div>
            </section>

            <div class="marker-mode-panel">
              <div class="marker-mode-row">
                <span class="marker-mode-label">{{ isMarkerDeleteMode ? '删除模式' : '添加模式' }}</span>
                <button class="marker-mode-switch" :class="{ 'is-on': isMarkerDeleteMode }" type="button" role="switch"
                  :aria-checked="isMarkerDeleteMode ? 'true' : 'false'"
                  @click="isMarkerDeleteMode = !isMarkerDeleteMode">
                  <span class="marker-mode-switch-thumb" />
                </button>
              </div>

              <button v-if="isMarkerDeleteMode" class="marker-clear-button" type="button"
                @click="clearSelectedNodeMarkers">
                清除所有
              </button>
            </div>
          </div>
          <div v-if="formatPanelTab === 'mark' && !hasSelectedNodes" class="format-panel-body-mask"
            aria-hidden="true" />
          <div v-if="formatPanelTab === 'style' && !hasSelectedNodes" class="format-panel-body-mask"
            aria-hidden="true" />
        </div>
      </aside>
    </div>

    <Teleport to="body">
      <transition name="mind-close-dialog-fade">
        <div
          v-if="closeDialogState.visible"
          class="mind-close-dialog-overlay"
          @click="onCloseDialogCancel"
        >
          <div class="mind-close-dialog" @click.stop>
            <div class="mind-close-dialog-ornament" aria-hidden="true"></div>
            <div class="mind-close-dialog-brand">
              <div class="mind-close-dialog-logo-shell">
                <img class="mind-close-dialog-logo" :src="mindLogo" alt="" />
              </div>
              <div class="mind-close-dialog-copy">
                <p class="mind-close-dialog-title">你需要保存当前修改吗？</p>
                <p class="mind-close-dialog-subtitle">如果不保存，你当前所有做的修改将会丢失</p>
              </div>
            </div>
            <div class="mind-close-dialog-actions">
              <button
                class="mind-close-dialog-button mind-close-dialog-button--save"
                type="button"
                :disabled="closeDialogState.submitting || isSaving"
                @click="onCloseDialogSave"
              >
                {{ closeDialogState.submitting || isSaving ? '保存中...' : '保存' }}
              </button>
              <button
                class="mind-close-dialog-button mind-close-dialog-button--ghost"
                type="button"
                :disabled="closeDialogState.submitting || isSaving"
                @click="onCloseDialogDiscard"
              >
                不保存
              </button>
              <button
                class="mind-close-dialog-button mind-close-dialog-button--neutral"
                type="button"
                :disabled="closeDialogState.submitting || isSaving"
                @click="onCloseDialogCancel"
              >
                取消
              </button>
            </div>
          </div>
        </div>
      </transition>
    </Teleport>

    <Teleport to="body">
      <transition name="mind-image-preview-fade">
        <div
          v-if="imagePreviewState.visible"
          class="mind-image-preview-overlay"
          @click="closeImagePreview"
        >
          <div class="mind-image-preview-shell" @click.stop>
            <button
              class="mind-image-preview-close"
              type="button"
              aria-label="关闭图片预览"
              @click="closeImagePreview"
            >
              ×
            </button>
            <img
              class="mind-image-preview-image"
              :src="imagePreviewState.src"
              :alt="imagePreviewState.title || '图片预览'"
            />
            <div v-if="imagePreviewState.title" class="mind-image-preview-caption">
              {{ imagePreviewState.title }}
            </div>
          </div>
        </div>
      </transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import {
  type AcceptableValue,
  ColorSwatchPickerItem,
  ColorSwatchPickerItemIndicator,
  ColorSwatchPickerRoot,
} from 'reka-ui';
import { $forEachSelectedTextNode, $patchStyleText } from '@lexical/selection';
import { $getSelection, $isRangeSelection, FORMAT_ELEMENT_COMMAND, FORMAT_TEXT_COMMAND } from 'lexical';
import { getInternalClipboard, internalClipboardState, setInternalClipboard, type InternalClipboardState } from '@/mind/core/clipboard';
import { createBatchAddChildCommand, type SelectionSnapshot } from '@/mind/core/commands/BatchAddChildCommand';
import { createBatchAddParentCommand } from '@/mind/core/commands/BatchAddParentCommand';
import { createBatchAddSiblingCommand } from '@/mind/core/commands/BatchAddSiblingCommand';
import {
  createBatchUpdateNodePresentationCommand,
  type NodePresentationSnapshot,
} from '@/mind/core/commands/BatchUpdateNodePresentationCommand';
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
import { collectSubtreeNodeIds, createSubtreeSnapshot, type MindSubtreeSnapshot } from '@/mind/core/commands/subtreeSnapshot';
import tools from '@/utils/tools';
import { cloneNodeImage, getNodeImage, getNodeLexicalState, getNodePlainText, getNodeRichText, setNodeLexicalState, type MindNodeImage } from '@/mind/core/nodeContent';
import { layoutOverlayTextLines } from '@/mind/core/dragDrop/overlayTextLayout';
import type { DragDropState, DragDropTarget } from '@/mind/core/drag/types';
import { createHistory, type Command, type HistorySnapshot } from '@/mind/core/history';
import { lexicalEditorManager } from '@/mind/core/lexicalEditorManager';
import {
  cloneLexicalState,
  convertLexicalStateFontSizesToRelativeEm,
  convertLexicalStateRelativeEmToPx,
  lexicalStateFromRichText,
  lexicalStateFromPlainText,
  richTextFromLexicalState,
  updateLexicalStateBlockAlign,
  updateLexicalStateTextMarks,
  type SerializedLexicalEditorState,
} from '@/mind/core/lexicalState';
import { compareSelectionTargetInfo, getSelectionTargetInfo, type SelectionTargetInfo } from '@/mind/core/selection/normalizeSelection';
import { ensureMindRoots, ensureMultiMindDoc, getActiveMind, setActiveMindId, toPlainDoc } from './actions/useDocUtils';
import { useLayout } from './actions/useLayout';
import { MAX_CAMERA_SCALE, getAxisConstraint, useCamera } from './actions/useCamera';
import { useDraw } from './actions/useDraw';
import { useEdges } from './actions/useEdges';
import { useInteraction } from './actions/useInteraction';
import { useMarquee } from './actions/useMarquee';
import { usePersistence } from './actions/usePersistence';
import {
  DEBUG_CANVAS_OVERLAY,
  DEBUG_MIND_PERF_CAMERA_FPS_SUMMARY,
  DEBUG_MIND_PERF_OPERATION_SUMMARY,
  DEBUG_MIND_PERF_PROBE,
  SPATIAL_GRID_CELL_SIZE,
} from './constants';
import { buildCollapseTagScreenMap, buildDescendantCountMap, hitTestCollapseTag } from './collapseTags';
import { logCameraReset, logRendererDebugInstructions } from './diagnostics';
import { getWorldViewportRect, pointInRect, rectContains, rectIntersects, screenToWorld, worldToScreen } from './geom/rect';
import { buildWorldBoxes, type WorldBoxes } from './geom/worldBoxes';
import { UniformGridSpatialIndex } from './grid/spatialIndex';
import {
  clearNodeMarkers,
  getNodeMarkerItem,
  getNodeMarkerKeys,
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
  normalizeRichText,
  type RichTextAlign,
  type RichTextDocument,
  type RichTextInline,
  type RichTextMarks,
} from '@/mind/core/richText';
import {
  getNodeMinimumContentWidth,
  computeNodeTextGeometry,
  getNodeMinimumWidth,
  getNodeTextStyle,
  measureTextVerticalMetrics,
  NODE_CONTENT_MAX_W,
  NODE_LINE_HEIGHT,
  NODE_PADDING_X,
  NODE_TEXT_INSET_X,
  NODE_TEXT_INSET_Y,
  measureNodeTextLayout,
} from './textLayout';
import { getDomTextTopOffset } from '@/mind/core/text/domTextCalibration';
import { NODE_H_HARD_MAX, NODE_TEXT_MAX_WIDTH_PX, NODE_W_HARD_MAX } from '@/mind/core/text/measureNodeText';
import LexicalNodeEditorOverlay from './components/LexicalNodeEditorOverlay.vue';
import {
  createEditingLexicalStateForNode,
  createPersistedRichTextForNode,
  isRichTextEqual,
} from './indexChild/nodeRichTextEditing';
import {
  mapBorderPresetKeyToNodePreset,
  mapBorderWidthKeyToStrokeWidth,
  mapFillPresetKeyToNodePreset,
  mapNodeBorderPresetToPanelKey,
  mapNodeFillPresetToPanelKey,
  resolveFontOptionKey,
  resolveFontSizeValue,
  resolveStrokeWidthKey,
  styleBorderOptions,
  styleFillColorSwatches,
  styleFillOptions,
  styleFontOptions,
  styleFontSizes,
  styleOutlineColorSwatches,
  styleStrokeWidthOptions,
  styleTextAlignOptions,
  styleTextToggleOptions,
  type StyleBorderPresetKey,
  type StyleBorderWidthKey,
  type StyleFillPresetKey,
  type StyleFontKey,
  type StyleTextAlignKey,
  type StyleTextToggleKey,
} from './indexChild/stylePanelConfig';
import { useSaveFlow } from './indexChild/useSaveFlow';
import { exportMindPreviewPng } from './exportPreview';
import mindLogo from '@/mind/core/action_icon/mind.svg';
import type { MindNodeRole } from './nodeStyles';
import { createInitialNodeStyleForRole, getMindNodeDefaultVisualStyle, getMindNodeRole } from './nodeStyles';
import { getCurrentRoughTheme } from '@/mind/rendering/roughTheme';

type SearchPanelNodeEntry = {
  nodeId: string;
  singleLineText: string;
  normalizedLineTexts: string[];
  markerKeys: string[];
};

const props = defineProps<{
  doc?: any;
  filePath?: any;
  docId?: string;
  windowKey?: any;
  showSearchPanel?: boolean;
  showFormatPanel?: boolean;
}>();
const emit = defineEmits<{
  (event: 'filePathChange', value: string | null): void;
  (event: 'saveStateChange', value: { isDirty: boolean; isSaving: boolean; displayName: string }): void;
  (event: 'nodeCountChange', value: { totalNodes: number; selectedNodes: number }): void;
  (event: 'toggleSearchPanel'): void;
  (event: 'toggleFormatPanel'): void;
}>();

const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);
const SEARCH_TEXT_QUERY_DEBOUNCE_MS = 300;
const searchPanelTab = ref<'text' | 'mark'>('text');
const searchTextQuery = ref('');
const searchResolvedTextQuery = ref('');
const searchReplaceText = ref('');
const searchMarkerKeys = ref<string[]>([]);
const searchResultScrollRef = ref<HTMLDivElement | null>(null);
const searchResultHorizontalScrollbarRef = ref<HTMLDivElement | null>(null);
const searchResultVerticalScrollbarRef = ref<HTMLDivElement | null>(null);
const searchNodeEntries = ref<SearchPanelNodeEntry[]>([]);
const searchNodeEntriesRevisionKey = ref('');
const selectedSearchResultNodeId = ref<string | null>(null);
const SEARCH_RESULT_SCROLLBAR_MIN_THUMB = 32;
const searchResultScrollMetrics = ref({
  showHorizontal: false,
  showVertical: false,
  horizontalScrollable: false,
  verticalScrollable: false,
  horizontalThumbSize: SEARCH_RESULT_SCROLLBAR_MIN_THUMB,
  horizontalThumbOffset: 0,
  verticalThumbSize: SEARCH_RESULT_SCROLLBAR_MIN_THUMB,
  verticalThumbOffset: 0,
});
const searchResultScrollbarDrag = ref<null | {
  axis: 'horizontal' | 'vertical';
  startClient: number;
  startOffset: number;
}>(null);
const selectedSearchMarkerSummary = computed(() => {
  if (!searchMarkerKeys.value.length) return '';
  if (searchMarkerKeys.value.length === 1) {
    return getNodeMarkerItem(searchMarkerKeys.value[0])?.name ?? '已选 1 个标记';
  }
  return `已选 ${searchMarkerKeys.value.length} 个标记`;
});
const searchTextResults = computed(() => {
  if (!props.showSearchPanel) return [] as SearchPanelNodeEntry[];
  const query = searchResolvedTextQuery.value;
  if (!query) return [] as SearchPanelNodeEntry[];
  return searchNodeEntries.value.filter((entry) => entry.normalizedLineTexts.some((lineText) => lineText.includes(query)));
});
const searchMarkerResults = computed(() => {
  if (!props.showSearchPanel || !searchMarkerKeys.value.length) return [] as SearchPanelNodeEntry[];
  return searchNodeEntries.value.filter((entry) =>
    searchMarkerKeys.value.every((markerKey) => entry.markerKeys.includes(markerKey))
  );
});
const canReplaceSelectedSearchResult = computed(() => {
  if (!searchResolvedTextQuery.value || !selectedSearchResultNodeId.value) return false;
  return searchTextResults.value.some((entry) => entry.nodeId === selectedSearchResultNodeId.value);
});
const canReplaceAllSearchResults = computed(() => !!searchResolvedTextQuery.value && searchTextResults.value.length > 0);
const searchTextResultCountLabel = computed(() =>
  searchResolvedTextQuery.value ? `找到 ${searchTextResults.value.length} 个节点` : '输入关键词开始搜索'
);
const searchMarkerResultCountLabel = computed(() => {
  if (!searchMarkerKeys.value.length) return '点击一个或多个标记开始筛选';
  return `找到 ${searchMarkerResults.value.length} 个节点`;
});
const searchTextEmptyState = computed(() =>
  searchResolvedTextQuery.value ? '未找到匹配节点' : '输入关键词开始搜索'
);
const searchMarkerEmptyState = computed(() =>
  searchMarkerKeys.value.length ? '当前组合标记下没有节点' : '点击上方标记开始筛选'
);
let searchTextQueryDebounceTimerId: number | null = null;
let searchResultResizeObserver: ResizeObserver | null = null;
const formatPanelTab = ref<'style' | 'mark'>('style');
const isMarkerDeleteMode = ref(false);
const markerPanelGroups = nodeMarkerGroups;
const hasSelectedNodes = computed(() => selectedIds.value.size > 0);
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

function resetTextToggleState() {
  textToggleState.value = {
    bold: false,
    italic: false,
    underline: false,
    strike: false,
  };
}

function focusViewportWithoutScroll() {
  if (!editingSession.value && primarySelectedNodeId.value && focusPendingDirectTypeInput(primarySelectedNodeId.value)) {
    return;
  }
  const element = viewportRef.value;
  if (!element) return;
  if (typeof document !== 'undefined' && document.activeElement === element) return;
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
}

function movePendingDirectTypeInputOffscreen() {
  const element = pendingDirectTypeInputRef.value;
  if (!element) return;
  Object.assign(element.style, {
    left: '-10000px',
    top: '-10000px',
    width: '1px',
    height: '1px',
    color: 'transparent',
    caretColor: 'transparent',
    opacity: '0',
    overflow: 'hidden',
  });
}

function clearPendingDirectTypeFlushTimeout() {
  if (pendingDirectTypeFlushTimeoutId != null) window.clearTimeout(pendingDirectTypeFlushTimeoutId);
  pendingDirectTypeFlushTimeoutId = null;
}

function clearPendingDirectTypeSeed() {
  const element = pendingDirectTypeInputRef.value;
  clearPendingDirectTypeFlushTimeout();
  pendingDirectTypeSeed.value = null;
  pendingDirectTypeCaptureComposing.value = false;
  if (element) {
    element.value = '';
    movePendingDirectTypeInputOffscreen();
    if (typeof document !== 'undefined' && document.activeElement === element) {
      element.blur();
    }
  }
}

function startLexicalEditingSession(
  nodeId: string,
  initialState: SerializedLexicalEditorState,
  mode: 'append' | 'replace',
  caretPlacement: 'start' | 'end' | 'none',
  shouldFocus = true
) {
  lexicalEditorManager.startSession({
    nodeId,
    initialState,
    mode,
    caretPlacement,
    shouldFocus,
    onChange: (state) => onLexicalEditorChange(state),
    onCommit: () => commitEditingSession(),
    onCancel: () => cancelEditingSession(),
  });
}

function layoutPendingDirectTypeInput(nodeId: string, options?: { showPreview?: boolean }) {
  const element = pendingDirectTypeInputRef.value;
  const node = getNodeById(nodeId);
  if (!element || !node) return false;
  const showPreview = options?.showPreview ?? false;
  const textBoxRect = getEditingTextBoxRectForNode(nodeId);
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId });
  const screenRect = textBoxRect
    ? {
      x: textBoxRect.x * camera.value.scale + camera.value.tx,
      y: textBoxRect.y * camera.value.scale + camera.value.ty,
      width: Math.max(1, textBoxRect.width * camera.value.scale),
      height: Math.max(1, textBoxRect.height * camera.value.scale),
    }
    : {
      x: -10000,
      y: -10000,
      width: 1,
      height: 1,
    };
  Object.assign(element.style, {
    left: `${screenRect.x}px`,
    top: `${screenRect.y}px`,
    width: `${screenRect.width}px`,
    height: `${screenRect.height}px`,
    fontFamily: textStyle.fontFamily,
    fontSize: `${textStyle.fontSizePx * camera.value.scale}px`,
    fontWeight: String(textStyle.fontWeight),
      fontStyle: textStyle.fontStyle,
      lineHeight: `${textStyle.lineHeightPx * camera.value.scale}px`,
      letterSpacing: `${textStyle.letterSpacingPx * camera.value.scale}px`,
      textAlign: textStyle.textAlign,
      color: showPreview ? textStyle.color : 'transparent',
      caretColor: showPreview ? textStyle.color : 'transparent',
      opacity: showPreview ? '1' : '0',
      overflow: showPreview ? 'visible' : 'hidden',
    });
  return true;
}

function focusPendingDirectTypeInput(nodeId: string, options?: { showPreview?: boolean }) {
  const element = pendingDirectTypeInputRef.value;
  if (!element || !layoutPendingDirectTypeInput(nodeId, options)) return false;
  pendingDirectTypeCaptureComposing.value = false;
  element.value = '';
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
  element.setSelectionRange(0, 0);
  return true;
}

function flushPendingDirectTypeToEditor(text: string) {
  const pending = pendingDirectTypeSeed.value;
  if (!pending) return;
  clearPendingDirectTypeFlushTimeout();
  const nextText = text;
  clearPendingDirectTypeSeed();
  if (!nextText) {
    focusViewportWithoutScroll();
    return;
  }
  applyCapturedDirectTypeText(pending.nodeId, nextText);
}

function onPendingDirectTypeInput() {
  const pending = pendingDirectTypeSeed.value;
  const element = pendingDirectTypeInputRef.value;
  if (!pending || !element) return;
  if (pendingDirectTypeCaptureComposing.value) {
    syncPendingDirectTypePreviewText(pending.nodeId, element.value);
    return;
  }
  flushPendingDirectTypeToEditor(element.value);
}

function schedulePendingDirectTypeFlushFromCapture() {
  clearPendingDirectTypeFlushTimeout();
  pendingDirectTypeFlushTimeoutId = window.setTimeout(() => {
    pendingDirectTypeFlushTimeoutId = null;
    if (!pendingDirectTypeSeed.value || pendingDirectTypeCaptureComposing.value) return;
    flushPendingDirectTypeToEditor(pendingDirectTypeInputRef.value?.value ?? '');
  }, 0);
}

function onPendingDirectTypeCaptureCompositionStart() {
  clearPendingDirectTypeFlushTimeout();
  pendingDirectTypeCaptureComposing.value = true;
  isComposing.value = true;
  const targetNodeId = pendingDirectTypeSeed.value?.nodeId ?? getPrimarySelectedId();
  if (!targetNodeId) return;
  if (!pendingDirectTypeSeed.value) {
    pendingDirectTypeSeed.value = {
      nodeId: targetNodeId,
      key: '',
    };
  }
  if (!editingSession.value || editingSession.value.nodeId !== targetNodeId || editingSession.value.mode !== 'replace') {
    startEditing(targetNodeId, {
      mode: 'replace',
      insertedText: '',
      caretPlacement: 'end',
      shouldFocusEditor: false,
    });
  }
  layoutPendingDirectTypeInput(targetNodeId);
}

function onPendingDirectTypeCaptureCompositionUpdate(event: CompositionEvent) {
  const targetNodeId = pendingDirectTypeSeed.value?.nodeId ?? getPrimarySelectedId();
  if (!targetNodeId) return;
  const nextText =
    typeof event.data === 'string' && event.data.length > 0
      ? event.data
      : pendingDirectTypeInputRef.value?.value ?? '';
  syncPendingDirectTypePreviewText(targetNodeId, nextText);
}

function onPendingDirectTypeCaptureCompositionEnd(event: CompositionEvent) {
  pendingDirectTypeCaptureComposing.value = false;
  isComposing.value = false;
  const committedText =
    typeof event.data === 'string' && event.data.length > 0
      ? event.data
      : pendingDirectTypeInputRef.value?.value ?? '';
  if (committedText) {
    flushPendingDirectTypeToEditor(committedText);
    return;
  }
  schedulePendingDirectTypeFlushFromCapture();
}

function onPendingDirectTypeCaptureBlur() {
  if (!pendingDirectTypeSeed.value || pendingDirectTypeCaptureComposing.value) return;
  schedulePendingDirectTypeFlushFromCapture();
}

function isPendingDirectTypeInputTarget(target: EventTarget | null) {
  return !!pendingDirectTypeInputRef.value && target === pendingDirectTypeInputRef.value;
}

function applyCapturedDirectTypeText(nodeId: string, text: string) {
  const node = getNodeById(nodeId);
  const session = editingSession.value;
  if (!node) return;
  if (!session || session.nodeId !== nodeId || session.mode !== 'replace') {
    startEditing(nodeId, { mode: 'replace', insertedText: text, caretPlacement: 'end' });
    return;
  }
  const nextLexicalState = lexicalStateFromPlainText(text);
  const nextRichText = cloneRichText(
    createPersistedRichTextForNode(
      props.doc,
      node,
      nodeId,
      richTextFromLexicalState(nextLexicalState)
    )
  );
  const displayLexicalState = convertLexicalStateFontSizesToRelativeEm(
    nextLexicalState,
    Math.max(1, getNodeTextStyle(node, { doc: props.doc, nodeId }).fontSizePx)
  );
  editingDraftLexicalState.value = nextLexicalState;
  editingDraftRichText.value = nextRichText;
  editingDisplayLexicalState.value = displayLexicalState;
  startLexicalEditingSession(nodeId, displayLexicalState, 'replace', session.caretPlacement, true);
  scheduleEditingPreviewRelayout();
}

function syncPendingDirectTypePreviewText(nodeId: string, text: string) {
  const node = getNodeById(nodeId);
  const session = editingSession.value;
  if (!node || !session || session.nodeId !== nodeId || session.mode !== 'replace') return;
  const nextLexicalState = lexicalStateFromPlainText(text);
  if (isLexicalStateEqual(nextLexicalState, editingDraftLexicalState.value)) return;
  const nextRichText = cloneRichText(
    createPersistedRichTextForNode(
      props.doc,
      node,
      nodeId,
      richTextFromLexicalState(nextLexicalState)
    )
  );
  const displayLexicalState = convertLexicalStateFontSizesToRelativeEm(
    nextLexicalState,
    Math.max(1, getNodeTextStyle(node, { doc: props.doc, nodeId }).fontSizePx)
  );
  editingDraftLexicalState.value = nextLexicalState;
  editingDraftRichText.value = nextRichText;
  editingDisplayLexicalState.value = displayLexicalState;
  startLexicalEditingSession(nodeId, displayLexicalState, 'replace', session.caretPlacement, false);
  scheduleEditingPreviewRelayout();
}

function getPanelSourceSelectedNodeId() {
  return getPrimarySelectedId() ?? selectedIds.value.values().next().value ?? null;
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

  selectedFillPresetKey.value = mapNodeFillPresetToPanelKey(visualStyle.fillPreset);
  selectedFillColor.value = visualStyle.fill;
  selectedBorderPresetKey.value = mapNodeBorderPresetToPanelKey(visualStyle.borderPreset);
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

function clearSearchTextQueryDebounceTimer() {
  if (searchTextQueryDebounceTimerId != null) window.clearTimeout(searchTextQueryDebounceTimerId);
  searchTextQueryDebounceTimerId = null;
}

function resetSearchResultScrollMetrics() {
  searchResultScrollMetrics.value = {
    showHorizontal: false,
    showVertical: false,
    horizontalScrollable: false,
    verticalScrollable: false,
    horizontalThumbSize: SEARCH_RESULT_SCROLLBAR_MIN_THUMB,
    horizontalThumbOffset: 0,
    verticalThumbSize: SEARCH_RESULT_SCROLLBAR_MIN_THUMB,
    verticalThumbOffset: 0,
  };
}

function stopSearchResultScrollbarDrag() {
  searchResultScrollbarDrag.value = null;
  window.removeEventListener('mousemove', handleSearchResultScrollbarDrag);
  window.removeEventListener('mouseup', stopSearchResultScrollbarDrag);
}

function teardownSearchResultResizeObserver() {
  searchResultResizeObserver?.disconnect();
  searchResultResizeObserver = null;
}

function bindSearchResultResizeObserver() {
  teardownSearchResultResizeObserver();
  const container = searchResultScrollRef.value;
  if (!container) return;
  searchResultResizeObserver = new ResizeObserver(() => {
    updateSearchResultScrollMetrics();
  });
  searchResultResizeObserver.observe(container);
  const content = container.firstElementChild;
  if (content instanceof HTMLElement) {
    searchResultResizeObserver.observe(content);
  }
}

function updateSearchResultScrollMetrics() {
  const container = searchResultScrollRef.value;
  const hasResults = searchPanelTab.value === 'text' ? searchTextResults.value.length > 0 : searchMarkerResults.value.length > 0;
  if (!container || !props.showSearchPanel || !hasResults) {
    resetSearchResultScrollMetrics();
    return;
  }

  const horizontalOverflow = Math.max(container.scrollWidth - container.clientWidth, 0);
  const verticalOverflow = Math.max(container.scrollHeight - container.clientHeight, 0);
  const horizontalScrollable = horizontalOverflow > 1;
  const verticalScrollable = verticalOverflow > 1;
  const horizontalTrackSize =
    searchResultHorizontalScrollbarRef.value?.clientWidth ?? Math.max(container.clientWidth - 14, 0);
  const verticalTrackSize =
    searchResultVerticalScrollbarRef.value?.clientHeight ?? Math.max(container.clientHeight - 14, 0);
  const horizontalThumbSize = horizontalScrollable
    ? Math.max((container.clientWidth / container.scrollWidth) * horizontalTrackSize, SEARCH_RESULT_SCROLLBAR_MIN_THUMB)
    : horizontalTrackSize;
  const verticalThumbSize = verticalScrollable
    ? Math.max((container.clientHeight / container.scrollHeight) * verticalTrackSize, SEARCH_RESULT_SCROLLBAR_MIN_THUMB)
    : verticalTrackSize;
  const horizontalTravel = Math.max(horizontalTrackSize - horizontalThumbSize, 0);
  const verticalTravel = Math.max(verticalTrackSize - verticalThumbSize, 0);

  searchResultScrollMetrics.value = {
    showHorizontal: true,
    showVertical: true,
    horizontalScrollable,
    verticalScrollable,
    horizontalThumbSize,
    horizontalThumbOffset:
      horizontalScrollable && horizontalOverflow > 0 ? (container.scrollLeft / horizontalOverflow) * horizontalTravel : 0,
    verticalThumbSize,
    verticalThumbOffset:
      verticalScrollable && verticalOverflow > 0 ? (container.scrollTop / verticalOverflow) * verticalTravel : 0,
  };
}

function onSearchResultScrollbarTrackMouseDown(axis: 'horizontal' | 'vertical', event: MouseEvent) {
  const container = searchResultScrollRef.value;
  if (!container) return;
  const track = event.currentTarget as HTMLDivElement | null;
  if (!track) return;
  const isScrollable =
    axis === 'horizontal' ? searchResultScrollMetrics.value.horizontalScrollable : searchResultScrollMetrics.value.verticalScrollable;
  if (!isScrollable) return;

  const rect = track.getBoundingClientRect();
  if (axis === 'horizontal') {
    const maxThumbOffset = Math.max(rect.width - searchResultScrollMetrics.value.horizontalThumbSize, 1);
    const pointer = Math.min(
      maxThumbOffset,
      Math.max(0, event.clientX - rect.left - searchResultScrollMetrics.value.horizontalThumbSize / 2)
    );
    container.scrollLeft = (pointer / maxThumbOffset) * Math.max(container.scrollWidth - container.clientWidth, 0);
  } else {
    const maxThumbOffset = Math.max(rect.height - searchResultScrollMetrics.value.verticalThumbSize, 1);
    const pointer = Math.min(
      maxThumbOffset,
      Math.max(0, event.clientY - rect.top - searchResultScrollMetrics.value.verticalThumbSize / 2)
    );
    container.scrollTop = (pointer / maxThumbOffset) * Math.max(container.scrollHeight - container.clientHeight, 0);
  }

  updateSearchResultScrollMetrics();
}

function startSearchResultScrollbarDrag(axis: 'horizontal' | 'vertical', event: MouseEvent) {
  const isScrollable =
    axis === 'horizontal' ? searchResultScrollMetrics.value.horizontalScrollable : searchResultScrollMetrics.value.verticalScrollable;
  if (!isScrollable) return;

  searchResultScrollbarDrag.value = {
    axis,
    startClient: axis === 'horizontal' ? event.clientX : event.clientY,
    startOffset:
      axis === 'horizontal'
        ? searchResultScrollMetrics.value.horizontalThumbOffset
        : searchResultScrollMetrics.value.verticalThumbOffset,
  };
  window.addEventListener('mousemove', handleSearchResultScrollbarDrag);
  window.addEventListener('mouseup', stopSearchResultScrollbarDrag);
}

function handleSearchResultScrollbarDrag(event: MouseEvent) {
  const drag = searchResultScrollbarDrag.value;
  const container = searchResultScrollRef.value;
  if (!drag || !container) return;

  if (drag.axis === 'horizontal') {
    const trackSize = searchResultHorizontalScrollbarRef.value?.clientWidth ?? container.clientWidth;
    const maxThumbOffset = Math.max(trackSize - searchResultScrollMetrics.value.horizontalThumbSize, 1);
    const nextOffset = Math.min(maxThumbOffset, Math.max(0, drag.startOffset + (event.clientX - drag.startClient)));
    container.scrollLeft = (nextOffset / maxThumbOffset) * Math.max(container.scrollWidth - container.clientWidth, 0);
  } else {
    const trackSize = searchResultVerticalScrollbarRef.value?.clientHeight ?? container.clientHeight;
    const maxThumbOffset = Math.max(trackSize - searchResultScrollMetrics.value.verticalThumbSize, 1);
    const nextOffset = Math.min(maxThumbOffset, Math.max(0, drag.startOffset + (event.clientY - drag.startClient)));
    container.scrollTop = (nextOffset / maxThumbOffset) * Math.max(container.scrollHeight - container.clientHeight, 0);
  }

  updateSearchResultScrollMetrics();
}

function normalizeSearchDisplayText(text: string) {
  return text.replace(/[\r\n]+/g, ' ').replace(/\s+/g, ' ').trim();
}

function normalizeSearchQuery(text: string) {
  return normalizeSearchDisplayText(text).toLocaleLowerCase();
}

function buildSearchNodeOrder(nodes: Record<string, any>) {
  const orderedNodeIds: string[] = [];
  const visited = new Set<string>();
  const activeMind = getActiveMind(props.doc);

  function visit(nodeId: string | null | undefined) {
    if (typeof nodeId !== 'string' || !nodeId || visited.has(nodeId) || !nodes[nodeId]) return;
    visited.add(nodeId);
    orderedNodeIds.push(nodeId);
    const children = Array.isArray(nodes[nodeId]?.children) ? nodes[nodeId].children : [];
    children.forEach((childId: string) => visit(childId));
  }

  const roots = Array.isArray(activeMind?.roots) ? activeMind.roots : [];
  roots.forEach((root: any) => visit(root?.rootId));
  Object.keys(nodes).forEach((nodeId) => visit(nodeId));

  return orderedNodeIds;
}

function buildSearchNodeEntries() {
  const nodes = getMindNodes();
  if (!nodes) return [] as SearchPanelNodeEntry[];

  return buildSearchNodeOrder(nodes).map((nodeId) => {
    const plainText = getNodePlainText(nodes[nodeId]);
    const singleLineText = normalizeSearchDisplayText(plainText);
    return {
      nodeId,
      singleLineText,
      normalizedLineTexts: plainText.split('\n').map((lineText) => normalizeSearchQuery(lineText)),
      markerKeys: getNodeMarkerKeys(nodes[nodeId]),
    } satisfies SearchPanelNodeEntry;
  });
}

function buildSearchNodeEntriesRevisionKey() {
  return `${getActiveMind(props.doc)?.id ?? 'none'}:${contentRevision.value}`;
}

function rebuildSearchNodeEntries(force = false) {
  const nextRevisionKey = buildSearchNodeEntriesRevisionKey();
  if (!force && searchNodeEntriesRevisionKey.value === nextRevisionKey) return;
  searchNodeEntries.value = buildSearchNodeEntries();
  searchNodeEntriesRevisionKey.value = nextRevisionKey;
}

function getCurrentSelectionSnapshot(): SelectionSnapshot {
  return {
    ids: Array.from(selectedIds.value),
    primaryId: getPrimarySelectedId(),
  };
}

function escapeSearchReplacePattern(text: string) {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function createLineReplacePattern(query: string) {
  const compactQuery = query.trim().replace(/\s+/g, ' ');
  if (!compactQuery) return null;
  const pattern = compactQuery
    .split(' ')
    .map((part) => escapeSearchReplacePattern(part))
    .join('[\\t ]+');
  return new RegExp(pattern, 'giu');
}

function downgradeRichTextToPlainBlocks(richText: RichTextDocument) {
  const normalized = normalizeRichText(richText);
  return normalized.blocks.map((block) => ({
    align: block.align,
    text: block.inlines.map((inline) => inline.text).join(''),
  }));
}

function buildPlainRichTextFromBlocks(blocks: Array<{ align: RichTextAlign; text: string }>): RichTextDocument {
  return {
    blocks: blocks.length
      ? blocks.map((block) => ({
        align: block.align,
        inlines: [{ text: block.text }],
      }))
      : [{ align: 'left', inlines: [{ text: '' }] }],
  };
}

function buildSearchReplaceRichText(
  richText: RichTextDocument,
  searchQuery: string,
  replacementText: string
): RichTextDocument | null {
  const pattern = createLineReplacePattern(searchQuery);
  if (!pattern) return null;

  let changed = false;
  const nextBlocks = downgradeRichTextToPlainBlocks(richText).map((block) => {
    const nextText = block.text.replace(pattern, () => replacementText);
    if (nextText !== block.text) changed = true;
    return {
      align: block.align,
      text: nextText,
    };
  });

  if (!changed) return null;
  return buildPlainRichTextFromBlocks(nextBlocks);
}

function createSearchReplaceCommand(targetNodeIds: string[], replacementText: string, preferredSelectionNodeId: string | null) {
  const nodes = getMindNodes();
  if (!nodes || !searchResolvedTextQuery.value) return null;

  const beforeSnapshots: NodePresentationSnapshot[] = [];
  const afterSnapshots: NodePresentationSnapshot[] = [];

  targetNodeIds.forEach((nodeId) => {
    const node = nodes[nodeId];
    if (!node) return;
    const beforeRichText = getNodeRichText(node);
    const afterRichText = buildSearchReplaceRichText(beforeRichText, searchResolvedTextQuery.value, replacementText);
    if (!afterRichText || isRichTextEqual(beforeRichText, afterRichText)) return;
    beforeSnapshots.push({
      nodeId,
      lexicalState: getNodeLexicalState(node),
      richText: beforeRichText,
    });
    afterSnapshots.push({
      nodeId,
      lexicalState: lexicalStateFromRichText(afterRichText),
      richText: afterRichText,
    });
  });

  if (!afterSnapshots.length) return null;

  const previousSelection = getCurrentSelectionSnapshot();
  const preferredNodeId =
    preferredSelectionNodeId && afterSnapshots.some((snapshot) => snapshot.nodeId === preferredSelectionNodeId)
      ? preferredSelectionNodeId
      : afterSnapshots[0]?.nodeId ?? null;
  const nextSelection: SelectionSnapshot = preferredNodeId
    ? { ids: [preferredNodeId], primaryId: preferredNodeId }
    : previousSelection;

  return createBatchUpdateNodePresentationCommand(
    {
      getNodes: getMindNodes,
      setSelection: (nodeIds, primaryId) => setSelection(nodeIds, primaryId ?? null),
      applyMutation: (reason, options) =>
        applyDocumentMutation(reason, {
          ensureVisibleNodeIds: options?.ensureVisibleNodeIds,
          markDirty: true,
        }),
    },
    {
      name: 'SearchReplaceTextCommand',
      mutationReason: 'search-replace-text',
      beforeSnapshots,
      afterSnapshots,
      previousSelection,
      nextSelection,
      ensureVisibleNodeIds: afterSnapshots.map((snapshot) => snapshot.nodeId),
    }
  );
}

const viewportW = ref(1200);
const viewportH = ref(800);
const canvasDpr = ref(1);
const canvasPixelW = ref(1200);
const canvasPixelH = ref(800);
const worldBoxes = ref<WorldBoxes>(new Map());
const descendantCounts = ref<Map<string, number>>(new Map());
const parentIndexByNodeId = ref<Map<string, { parentId: string; index: number }>>(new Map());
const hoverNodeId = ref<string | null>(null);
const collapseTagHoverNodeId = ref<string | null>(null);
const collapseTagStickyNodeId = ref<string | null>(null);
const editingNodeId = ref<string | null>(null);
const editingSession = ref<null | {
  nodeId: string;
  initialLexicalState: SerializedLexicalEditorState;
  initialRichText: RichTextDocument;
  mode: 'append' | 'replace';
  caretPlacement: 'start' | 'end' | 'none';
}>(null);
const editingDraftLexicalState = ref<SerializedLexicalEditorState>(getNodeLexicalState(null));
const editingDraftRichText = ref<RichTextDocument>(getNodeRichText(null));
const editingDisplayLexicalState = ref<SerializedLexicalEditorState>(getNodeLexicalState(null));
const ENABLE_TEXT_ALIGNMENT_DIAGNOSTICS = false;
const editingBaseFontSizePx = computed(() => {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  if (!session || !node) return 14;
  return Math.max(1, getNodeTextStyle(node, { doc: props.doc, nodeId: session.nodeId }).fontSizePx);
});
const editingPreview = ref<null | {
  nodeId: string;
  measuredTextW: number;
  measuredTextH: number;
  computedNodeW: number;
  computedNodeH: number;
  lineCount: number;
  textLineBoxTop: number;
  textLineBoxHeight: number;
}>(null);
const editingWidthPreview = ref<null | {
  nodeId: string;
  baseNodeWidth: number;
  deltaX: number;
  subtreeNodeIds: Set<string>;
  affectedParentIds: Set<string>;
}>(null);
const isComposing = ref(false);
const pendingDirectTypeInputRef = ref<HTMLTextAreaElement | null>(null);
const pendingDirectTypeSeed = ref<null | {
  nodeId: string;
  key: string;
}>(null);
const pendingDirectTypeCaptureComposing = ref(false);
let pendingDirectTypeFlushTimeoutId: number | null = null;
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
const cameraInteractionPreview = ref<{ kind: 'zoom' } | null>(null);
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
const {
  layoutLocal,
  layoutBounds,
  rebuildLayout,
  invalidateSubtreeHeightCache,
  getLastLayoutPerfMetrics,
  getLastLayoutTranslationOps,
  getLastLayoutChangedNodeIds,
} = useLayout(props, canvasRef, (nodeId) => {
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
  previewSelectedIds: marqueePreviewSelectedIds,
  startSelection: startMarqueeSelection,
  updateSelection: updateMarqueeSelection,
  finishSelection: finishMarqueeSelection,
  cancelSelection: cancelMarqueeSelection,
  cleanup: cleanupMarquee,
} = useMarquee(camera, spatialIndex, worldBoxes, requestRender);
const displaySelectedIds = computed(() => (isMarquee.value ? marqueePreviewSelectedIds.value : selectedIds.value));
const collapseTagVisibleNodeIds = computed(() => {
  if (!worldBoxes.value.size || viewportW.value <= 0 || viewportH.value <= 0) return [] as string[];
  const viewportRect = getWorldViewportRect(camera.value, viewportW.value, viewportH.value);
  const candidateIds = spatialIndex.queryRect(viewportRect);
  return candidateIds.filter((id) => {
    const rect = worldBoxes.value.get(id);
    return !!rect && rectIntersects(viewportRect, rect);
  });
});
const collapseTagActiveNodeIds = computed(() => {
  const active = new Set<string>();
  if (hoverNodeId.value) active.add(hoverNodeId.value);
  if (collapseTagHoverNodeId.value) active.add(collapseTagHoverNodeId.value);
  if (collapseTagStickyNodeId.value) active.add(collapseTagStickyNodeId.value);
  for (const nodeId of displaySelectedIds.value) active.add(nodeId);
  return active;
});
const collapseTagScreenMap = computed(() =>
  buildCollapseTagScreenMap(
    props.doc,
    worldBoxes.value,
    camera.value,
    collapseTagVisibleNodeIds.value,
    descendantCounts.value
  )
);

const history = createHistory((nextSnapshot) => {
  historySnapshot.value = nextSnapshot;
});

// layout + draw
const { edgeStats, rebuildEdgeCache, queryVisibleParentEdgeGeoms } = useEdges();
const { draw } = useDraw(
  props,
  canvasRef,
  camera,
  worldBoxes,
  collapseTagScreenMap,
  collapseTagActiveNodeIds,
  collapseTagHoverNodeId,
  queryVisibleParentEdgeGeoms,
  edgeStats,
  spatialIndex,
  hoverNodeId,
  displaySelectedIds,
  marqueeRectScreen,
  marqueeWorldRect,
  dragState,
  editingNodeId,
  imageInteraction,
  primarySelectedNodeId,
  editingWidthPreview,
  (nodeId, rect) => {
    const preview = editingPreview.value;
    if (preview?.nodeId === nodeId) {
      return {
        x1: rect.x1,
        y1: rect.y1,
        x2: rect.x1 + preview.computedNodeW,
        y2: rect.y1 + preview.computedNodeH,
      };
    }
    const widthPreview = editingWidthPreview.value;
    if (!widthPreview || !widthPreview.deltaX || !widthPreview.subtreeNodeIds.has(nodeId)) return null;
    return {
      x1: rect.x1 + widthPreview.deltaX,
      y1: rect.y1,
      x2: rect.x2 + widthPreview.deltaX,
      y2: rect.y2,
    };
  },
  historySnapshot,
  internalClipboardState,
  editorDebugState,
  cameraInteractionPreview
);

// persistence（只存 camera）
const { schedulePersistViewport, restoreViewportFromDoc, clearPersistTimer, writeViewportToDoc } =
  usePersistence(props, camera);

let drawRafId: number | null = null;
let resizeObserver: ResizeObserver | null = null;
let autoPanRafId: number | null = null;
let autoPanLastAt = 0;
type MindPerfProbeAnchor = {
  name: string;
  sinceStartMs: number;
  data?: Record<string, unknown>;
};

type MindPerfProbe = {
  id: number;
  op: 'add-node-enter' | 'add-parent-shortcut' | 'drag-node';
  commandKind: string | null;
  commandName: string | null;
  targetNodeId: string | null;
  selectedCount: number;
  startedAt: number;
  nodeCountBefore: number;
  nodeCountAfter: number | null;
  mutationReason: string | null;
  mutationQueuedAt: number | null;
  flushStartedAt: number | null;
  preFlushRequestRenderCount: number;
  preFlushDrawCount: number;
  preFlushDrawMs: number;
  historyExecuteMs: number | null;
  commandDoMs: number | null;
  mutationQueueDelayMs: number | null;
  flushTotalMs: number | null;
  totalMs: number | null;
  redrawTotalMs: number | null;
  layoutRebuildMs: number | null;
  layoutMeasureMs: number | null;
  layoutMeasureCalls: number | null;
  layoutMeasureCacheHits: number | null;
  layoutSubtreeMs: number | null;
  layoutSubtreeCalls: number | null;
  layoutSubtreeCacheHits: number | null;
  layoutPlaceMs: number | null;
  layoutPlaceCalls: number | null;
  worldBoxesBuildMs: number | null;
  parentIndexBuildMs: number | null;
  changedNodeScanMs: number | null;
  changedNodeCount: number | null;
  descendantCountsMs: number | null;
  spatialIndexMs: number | null;
  edgeCacheMs: number | null;
  edgeAffectedParentCount: number | null;
  edgeTranslatedParentCount: number | null;
  edgesRebuildMs: number | null;
  drawMs: number | null;
  ensureVisibleMs: number | null;
  dragRootCount: number | null;
  pointerDownLeadMs: number | null;
  normalizeDragRootsMs: number | null;
  dragStartSetupMs: number | null;
  bootstrapRafDelayMs: number | null;
  bootstrapTextLayoutMs: number | null;
  dragStartToFollowVisibleMs: number | null;
  subtreeWarmupDelayMs: number | null;
  subtreeWarmupMs: number | null;
  dropResolveCount: number;
  dropResolveTotalMs: number;
  dropResolveMaxMs: number | null;
  buildMoveCommandMs: number | null;
  buildMoveSourceInfosMs: number | null;
  buildMoveParentSnapshotMs: number | null;
  buildMoveApplyMs: number | null;
  buildMoveChangedCheckMs: number | null;
  buildMoveHashMs: number | null;
  buildMoveCreateCommandMs: number | null;
  buildMoveAffectedParentCount: number | null;
  buildMoveAffectedChildrenTotal: number | null;
  buildMoveMaxChildrenCount: number | null;
  finalizeDropMs: number | null;
  releaseStartedAt: number | null;
  releaseToDropRenderedMs: number | null;
  finalDropTargetType: string | null;
  finalDropToParentId: string | null;
  finalDropToIndex: number | null;
  finishedReason: string | null;
  committed: boolean;
  anchors: MindPerfProbeAnchor[];
};

type MindPerfOperationKey =
  | 'click-select'
  | 'double-click-edit'
  | 'space-edit'
  | 'type-to-edit'
  | 'toggle-collapse'
  | 'undo'
  | 'redo'
  | 'delete-node'
  | 'add-child-tab'
  | 'add-parent-shortcut'
  | 'add-child-enter'
  | 'add-sibling-enter'
  | 'drag-node';

type MindPerfOperationProbe = {
  id: number;
  op: MindPerfOperationKey;
  label: string;
  trigger: string;
  finishMode: 'flush' | 'draw' | 'edit-ready';
  startedAt: number;
  targetNodeId: string | null;
  selectedCount: number;
  nodeCountBefore: number;
  nodeCountAfter: number | null;
  commandName: string | null;
  mutationReason: string | null;
};

type MindPerfCameraFpsSession = {
  id: number;
  kind: 'pan' | 'zoom';
  trigger: 'wheel';
  startedAt: number;
  lastActivityAt: number;
  drawCount: number;
  firstDrawAt: number | null;
  lastDrawAt: number | null;
  totalDrawMs: number;
  maxDrawMs: number;
  minFps: number | null;
  maxFps: number | null;
  maxFrameGapMs: number | null;
  startScale: number;
  endScale: number;
  startTx: number;
  startTy: number;
  endTx: number;
  endTy: number;
  finishTimerId: number | null;
};

let mindPerfProbeSeq = 0;
let activeMindPerfProbe: MindPerfProbe | null = null;
let mindPerfOperationSeq = 0;
let activeMindPerfOperationProbe: MindPerfOperationProbe | null = null;
let mindPerfCameraFpsSeq = 0;
let activeMindPerfCameraFpsSession: MindPerfCameraFpsSession | null = null;
let pendingDragPerfStartContext: {
  startedAt: number;
  targetNodeId: string;
  selectedCount: number;
  pointerId: number | null;
} | null = null;
const MIND_PERF_CAMERA_FPS_IDLE_MS = 160;

function roundPerfMs(value: number | null | undefined) {
  return value == null || !Number.isFinite(value) ? null : Number(value.toFixed(2));
}

function roundPerfNumber(value: number | null | undefined, digits = 2) {
  return value == null || !Number.isFinite(value) ? null : Number(value.toFixed(digits));
}

function compactPerfData(data: Record<string, unknown>) {
  return Object.fromEntries(Object.entries(data).filter(([, value]) => value !== undefined));
}

function getMindPerfNodeCount() {
  return worldBoxes.value.size || Object.keys(getMindNodes() ?? {}).length;
}

function getActiveMindPerfProbe() {
  return DEBUG_MIND_PERF_PROBE ? activeMindPerfProbe : null;
}

function getActiveMindPerfOperationProbe() {
  return DEBUG_MIND_PERF_OPERATION_SUMMARY ? activeMindPerfOperationProbe : null;
}

function scheduleMindPerfCameraFpsFinish(probe: MindPerfCameraFpsSession) {
  if (probe.finishTimerId != null) window.clearTimeout(probe.finishTimerId);
  probe.finishTimerId = window.setTimeout(() => {
    if (!activeMindPerfCameraFpsSession || activeMindPerfCameraFpsSession.id !== probe.id) return;
    finishMindPerfCameraFpsSession(probe, 'idle');
  }, MIND_PERF_CAMERA_FPS_IDLE_MS);
}

function finishMindPerfCameraFpsSession(
  probe: MindPerfCameraFpsSession,
  completedBy: 'idle' | 'switch' | 'unmount'
) {
  if (probe.finishTimerId != null) {
    window.clearTimeout(probe.finishTimerId);
    probe.finishTimerId = null;
  }
  probe.endScale = camera.value.scale;
  probe.endTx = camera.value.tx;
  probe.endTy = camera.value.ty;
  if (probe.kind === 'zoom' && cameraInteractionPreview.value?.kind === 'zoom') {
    cameraInteractionPreview.value = null;
    if (completedBy !== 'unmount') requestRender();
  }
  if (activeMindPerfCameraFpsSession?.id === probe.id) activeMindPerfCameraFpsSession = null;
  const sampledFrameCount = Math.max(0, probe.drawCount - 1);
  const activeDrawDurationMs = probe.firstDrawAt != null && probe.lastDrawAt != null
    ? probe.lastDrawAt - probe.firstDrawAt
    : null;
  const avgFps = sampledFrameCount > 0 && activeDrawDurationMs != null && activeDrawDurationMs > 0
    ? (sampledFrameCount * 1000) / activeDrawDurationMs
    : null;
  console.debug('[mind-perf][camera-fps]', compactPerfData({
    probeId: probe.id,
    op: probe.kind === 'pan' ? 'pan-fps' : 'zoom-fps',
    label: probe.kind === 'pan' ? '滑动 FPS' : '缩放 FPS',
    trigger: probe.trigger,
    totalMs: roundPerfMs(performance.now() - probe.startedAt),
    activeDrawDurationMs: roundPerfMs(activeDrawDurationMs),
    drawCount: probe.drawCount,
    sampledFrameCount,
    avgFps: roundPerfNumber(avgFps),
    minFps: roundPerfNumber(probe.minFps),
    maxFps: roundPerfNumber(probe.maxFps),
    avgDrawMs: roundPerfMs(probe.drawCount ? probe.totalDrawMs / probe.drawCount : null),
    maxDrawMs: roundPerfMs(probe.maxDrawMs),
    maxFrameGapMs: roundPerfMs(probe.maxFrameGapMs),
    scaleFrom: roundPerfNumber(probe.startScale, 3),
    scaleTo: roundPerfNumber(probe.endScale, 3),
    txDelta: roundPerfNumber(probe.endTx - probe.startTx),
    tyDelta: roundPerfNumber(probe.endTy - probe.startTy),
    completedBy,
  }));
}

function noteMindPerfCameraInteractionFrame(kind: 'pan' | 'zoom') {
  if (!DEBUG_MIND_PERF_CAMERA_FPS_SUMMARY) return;
  const now = performance.now();
  if (kind === 'zoom') {
    if (!cameraInteractionPreview.value) cameraInteractionPreview.value = { kind: 'zoom' };
  } else if (cameraInteractionPreview.value) {
    cameraInteractionPreview.value = null;
  }
  let probe = activeMindPerfCameraFpsSession;
  if (probe && probe.kind !== kind) {
    finishMindPerfCameraFpsSession(probe, 'switch');
    probe = null;
  }
  if (!probe) {
    probe = {
      id: ++mindPerfCameraFpsSeq,
      kind,
      trigger: 'wheel',
      startedAt: now,
      lastActivityAt: now,
      drawCount: 0,
      firstDrawAt: null,
      lastDrawAt: null,
      totalDrawMs: 0,
      maxDrawMs: 0,
      minFps: null,
      maxFps: null,
      maxFrameGapMs: null,
      startScale: camera.value.scale,
      endScale: camera.value.scale,
      startTx: camera.value.tx,
      startTy: camera.value.ty,
      endTx: camera.value.tx,
      endTy: camera.value.ty,
      finishTimerId: null,
    };
    activeMindPerfCameraFpsSession = probe;
  }
  probe.lastActivityAt = now;
  probe.endScale = camera.value.scale;
  probe.endTx = camera.value.tx;
  probe.endTy = camera.value.ty;
  scheduleMindPerfCameraFpsFinish(probe);
}

function noteMindPerfCameraDraw(drawMs: number) {
  if (!DEBUG_MIND_PERF_CAMERA_FPS_SUMMARY) return;
  const probe = activeMindPerfCameraFpsSession;
  if (!probe) return;
  const now = performance.now();
  probe.drawCount += 1;
  probe.totalDrawMs += drawMs;
  probe.maxDrawMs = Math.max(probe.maxDrawMs, drawMs);
  probe.endScale = camera.value.scale;
  probe.endTx = camera.value.tx;
  probe.endTy = camera.value.ty;
  if (probe.lastDrawAt != null) {
    const frameGapMs = now - probe.lastDrawAt;
    probe.maxFrameGapMs = probe.maxFrameGapMs == null ? frameGapMs : Math.max(probe.maxFrameGapMs, frameGapMs);
    if (frameGapMs > 0) {
      const fps = 1000 / frameGapMs;
      probe.minFps = probe.minFps == null ? fps : Math.min(probe.minFps, fps);
      probe.maxFps = probe.maxFps == null ? fps : Math.max(probe.maxFps, fps);
    }
  } else {
    probe.firstDrawAt = now;
  }
  probe.lastDrawAt = now;
}

function finishMindPerfOperationProbe(
  probe: MindPerfOperationProbe,
  completedBy: 'flush' | 'draw' | 'edit-ready' | 'fallback',
  extra?: Record<string, unknown>
) {
  probe.nodeCountAfter = getMindPerfNodeCount();
  if (activeMindPerfOperationProbe?.id === probe.id) activeMindPerfOperationProbe = null;
  console.debug('[mind-perf][op-total]', compactPerfData({
    probeId: probe.id,
    op: probe.op,
    label: probe.label,
    trigger: probe.trigger,
    totalMs: roundPerfMs(performance.now() - probe.startedAt),
    targetNodeId: probe.targetNodeId,
    selectedCount: probe.selectedCount,
    nodeCountBefore: probe.nodeCountBefore,
    nodeCountAfter: probe.nodeCountAfter,
    commandName: probe.commandName,
    mutationReason: probe.mutationReason,
    completedBy,
    ...extra,
  }));
}

function scheduleMindPerfOperationFlushFallback(probe: MindPerfOperationProbe) {
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      const activeProbe = getActiveMindPerfOperationProbe();
      if (!activeProbe || activeProbe.id !== probe.id || activeProbe.finishMode !== 'flush' || activeProbe.mutationReason) return;
      finishMindPerfOperationProbe(activeProbe, 'fallback', { fallbackReason: 'no-mutation-flush' });
    });
  });
}

function beginMindPerfOperationProbe(options: {
  op: MindPerfOperationKey;
  label: string;
  trigger: string;
  finishMode: 'flush' | 'draw' | 'edit-ready';
  targetNodeId?: string | null;
  selectedCount?: number;
  commandName?: string | null;
  startedAt?: number;
}) {
  if (!DEBUG_MIND_PERF_OPERATION_SUMMARY) return null;
  activeMindPerfOperationProbe = {
    id: ++mindPerfOperationSeq,
    op: options.op,
    label: options.label,
    trigger: options.trigger,
    finishMode: options.finishMode,
    startedAt: options.startedAt ?? performance.now(),
    targetNodeId: options.targetNodeId ?? null,
    selectedCount: options.selectedCount ?? 0,
    nodeCountBefore: getMindPerfNodeCount(),
    nodeCountAfter: null,
    commandName: options.commandName ?? null,
    mutationReason: null,
  };
  if (options.finishMode === 'flush') scheduleMindPerfOperationFlushFallback(activeMindPerfOperationProbe);
  return activeMindPerfOperationProbe;
}

function cancelMindPerfOperationProbe() {
  activeMindPerfOperationProbe = null;
}

function setMindPerfOperationCommandName(commandName: string | null | undefined) {
  const probe = getActiveMindPerfOperationProbe();
  if (!probe) return;
  probe.commandName = commandName ?? null;
}

function noteMindPerfOperationMutationQueued(reason: string) {
  const probe = getActiveMindPerfOperationProbe();
  if (!probe || probe.finishMode !== 'flush') return;
  probe.mutationReason = reason;
}

function pushMindPerfAnchor(probe: MindPerfProbe, name: string, data?: Record<string, unknown>) {
  const compacted = data ? compactPerfData(data) : undefined;
  probe.anchors.push({
    name,
    sinceStartMs: roundPerfMs(performance.now() - probe.startedAt) ?? 0,
    ...(compacted && Object.keys(compacted).length ? { data: compacted } : {}),
  });
}

function beginAddNodePerfProbe(commandKind: string, targetNodeId: string | null, selectedCount: number) {
  if (!DEBUG_MIND_PERF_PROBE) return;
  const probe: MindPerfProbe = {
    id: ++mindPerfProbeSeq,
    op: 'add-node-enter',
    commandKind,
    commandName: null,
    targetNodeId,
    selectedCount,
    startedAt: performance.now(),
    nodeCountBefore: getMindPerfNodeCount(),
    nodeCountAfter: null,
    mutationReason: null,
    mutationQueuedAt: null,
    flushStartedAt: null,
    preFlushRequestRenderCount: 0,
    preFlushDrawCount: 0,
    preFlushDrawMs: 0,
    historyExecuteMs: null,
    commandDoMs: null,
    mutationQueueDelayMs: null,
    flushTotalMs: null,
    totalMs: null,
    redrawTotalMs: null,
    layoutRebuildMs: null,
    layoutMeasureMs: null,
    layoutMeasureCalls: null,
    layoutMeasureCacheHits: null,
    layoutSubtreeMs: null,
    layoutSubtreeCalls: null,
    layoutSubtreeCacheHits: null,
    layoutPlaceMs: null,
    layoutPlaceCalls: null,
    worldBoxesBuildMs: null,
    parentIndexBuildMs: null,
    changedNodeScanMs: null,
    changedNodeCount: null,
    descendantCountsMs: null,
    spatialIndexMs: null,
    edgeCacheMs: null,
    edgeAffectedParentCount: null,
    edgeTranslatedParentCount: null,
    edgesRebuildMs: null,
    drawMs: null,
    ensureVisibleMs: null,
    dragRootCount: null,
    pointerDownLeadMs: null,
    normalizeDragRootsMs: null,
    dragStartSetupMs: null,
    bootstrapRafDelayMs: null,
    bootstrapTextLayoutMs: null,
    dragStartToFollowVisibleMs: null,
    subtreeWarmupDelayMs: null,
    subtreeWarmupMs: null,
    dropResolveCount: 0,
    dropResolveTotalMs: 0,
    dropResolveMaxMs: null,
    buildMoveCommandMs: null,
    buildMoveSourceInfosMs: null,
    buildMoveParentSnapshotMs: null,
    buildMoveApplyMs: null,
    buildMoveChangedCheckMs: null,
    buildMoveHashMs: null,
    buildMoveCreateCommandMs: null,
    buildMoveAffectedParentCount: null,
    buildMoveAffectedChildrenTotal: null,
    buildMoveMaxChildrenCount: null,
    finalizeDropMs: null,
    releaseStartedAt: null,
    releaseToDropRenderedMs: null,
    finalDropTargetType: null,
    finalDropToParentId: null,
    finalDropToIndex: null,
    finishedReason: null,
    committed: false,
    anchors: [],
  };
  activeMindPerfProbe = probe;
  pushMindPerfAnchor(probe, 'keydown-enter', {
    commandKind,
    targetNodeId,
    selectedCount,
    nodeCountBefore: probe.nodeCountBefore,
  });
  console.debug('[mind-perf][add-node][start]', {
    probeId: probe.id,
    commandKind,
    targetNodeId,
    selectedCount,
    nodeCountBefore: probe.nodeCountBefore,
  });
}

function beginAddParentPerfProbe(commandKind: string, targetNodeId: string | null, selectedCount: number) {
  if (!DEBUG_MIND_PERF_PROBE) return;
  const probe: MindPerfProbe = {
    id: ++mindPerfProbeSeq,
    op: 'add-parent-shortcut',
    commandKind,
    commandName: null,
    targetNodeId,
    selectedCount,
    startedAt: performance.now(),
    nodeCountBefore: getMindPerfNodeCount(),
    nodeCountAfter: null,
    mutationReason: null,
    mutationQueuedAt: null,
    flushStartedAt: null,
    preFlushRequestRenderCount: 0,
    preFlushDrawCount: 0,
    preFlushDrawMs: 0,
    historyExecuteMs: null,
    commandDoMs: null,
    mutationQueueDelayMs: null,
    flushTotalMs: null,
    totalMs: null,
    redrawTotalMs: null,
    layoutRebuildMs: null,
    layoutMeasureMs: null,
    layoutMeasureCalls: null,
    layoutMeasureCacheHits: null,
    layoutSubtreeMs: null,
    layoutSubtreeCalls: null,
    layoutSubtreeCacheHits: null,
    layoutPlaceMs: null,
    layoutPlaceCalls: null,
    worldBoxesBuildMs: null,
    parentIndexBuildMs: null,
    changedNodeScanMs: null,
    changedNodeCount: null,
    descendantCountsMs: null,
    spatialIndexMs: null,
    edgeCacheMs: null,
    edgeAffectedParentCount: null,
    edgeTranslatedParentCount: null,
    edgesRebuildMs: null,
    drawMs: null,
    ensureVisibleMs: null,
    dragRootCount: null,
    pointerDownLeadMs: null,
    normalizeDragRootsMs: null,
    dragStartSetupMs: null,
    bootstrapRafDelayMs: null,
    bootstrapTextLayoutMs: null,
    dragStartToFollowVisibleMs: null,
    subtreeWarmupDelayMs: null,
    subtreeWarmupMs: null,
    dropResolveCount: 0,
    dropResolveTotalMs: 0,
    dropResolveMaxMs: null,
    buildMoveCommandMs: null,
    buildMoveSourceInfosMs: null,
    buildMoveParentSnapshotMs: null,
    buildMoveApplyMs: null,
    buildMoveChangedCheckMs: null,
    buildMoveHashMs: null,
    buildMoveCreateCommandMs: null,
    buildMoveAffectedParentCount: null,
    buildMoveAffectedChildrenTotal: null,
    buildMoveMaxChildrenCount: null,
    finalizeDropMs: null,
    releaseStartedAt: null,
    releaseToDropRenderedMs: null,
    finalDropTargetType: null,
    finalDropToParentId: null,
    finalDropToIndex: null,
    finishedReason: null,
    committed: false,
    anchors: [],
  };
  activeMindPerfProbe = probe;
  pushMindPerfAnchor(probe, 'keydown-add-parent', {
    commandKind,
    targetNodeId,
    selectedCount,
    nodeCountBefore: probe.nodeCountBefore,
  });
  console.debug('[mind-perf][add-parent][start]', {
    probeId: probe.id,
    commandKind,
    targetNodeId,
    selectedCount,
    nodeCountBefore: probe.nodeCountBefore,
  });
}

function cancelMindPerfProbe(reason: string) {
  const probe = getActiveMindPerfProbe();
  if (!probe) return;
  pushMindPerfAnchor(probe, 'probe-cancelled', { reason });
  if (activeMindPerfProbe?.id === probe.id) activeMindPerfProbe = null;
}

function noteMindPerfMutationQueued(
  reason: string,
  options?: { ensureVisibleCount?: number; invalidateCount?: number; addedNodeCount?: number }
) {
  const probe = getActiveMindPerfProbe();
  if (!probe) return;
  if (
    probe.op === 'add-node-enter' &&
    !['history:add-child', 'history:add-sibling', 'history:batch-add-child', 'history:batch-add-sibling'].includes(reason)
  ) {
    return;
  }
  if (
    probe.op === 'add-parent-shortcut' &&
    !['history:batch-add-parent', 'history:undo-batch-add-parent', 'history:redo-batch-add-parent'].includes(reason)
  ) {
    return;
  }
  if (
    probe.op === 'drag-node' &&
    !['history:move-subtrees', 'history:undo-move-subtrees', 'history:redo-move-subtrees'].includes(reason)
  ) {
    return;
  }
  probe.mutationReason = reason;
  probe.mutationQueuedAt = performance.now();
  pushMindPerfAnchor(probe, 'mutation-queued', {
    reason,
    ensureVisibleCount: options?.ensureVisibleCount,
    invalidateCount: options?.invalidateCount,
    addedNodeCount: options?.addedNodeCount,
  });
}

function noteMindPerfStep(name: string, data?: Record<string, unknown>) {
  const probe = getActiveMindPerfProbe();
  if (!probe) return;
  pushMindPerfAnchor(probe, name, data);
}

function beginDragPerfProbe(options: {
  targetNodeId: string | null;
  selectedCount: number;
  dragRootCount: number;
  pointerDownLeadMs: number | null;
}) {
  if (!DEBUG_MIND_PERF_PROBE) return null;
  const probe: MindPerfProbe = {
    id: ++mindPerfProbeSeq,
    op: 'drag-node',
    commandKind: null,
    commandName: null,
    targetNodeId: options.targetNodeId,
    selectedCount: options.selectedCount,
    startedAt: performance.now(),
    nodeCountBefore: getMindPerfNodeCount(),
    nodeCountAfter: null,
    mutationReason: null,
    mutationQueuedAt: null,
    flushStartedAt: null,
    preFlushRequestRenderCount: 0,
    preFlushDrawCount: 0,
    preFlushDrawMs: 0,
    historyExecuteMs: null,
    commandDoMs: null,
    mutationQueueDelayMs: null,
    flushTotalMs: null,
    totalMs: null,
    redrawTotalMs: null,
    layoutRebuildMs: null,
    layoutMeasureMs: null,
    layoutMeasureCalls: null,
    layoutMeasureCacheHits: null,
    layoutSubtreeMs: null,
    layoutSubtreeCalls: null,
    layoutSubtreeCacheHits: null,
    layoutPlaceMs: null,
    layoutPlaceCalls: null,
    worldBoxesBuildMs: null,
    parentIndexBuildMs: null,
    changedNodeScanMs: null,
    changedNodeCount: null,
    descendantCountsMs: null,
    spatialIndexMs: null,
    edgeCacheMs: null,
    edgeAffectedParentCount: null,
    edgeTranslatedParentCount: null,
    edgesRebuildMs: null,
    drawMs: null,
    ensureVisibleMs: null,
    dragRootCount: options.dragRootCount,
    pointerDownLeadMs: options.pointerDownLeadMs,
    normalizeDragRootsMs: null,
    dragStartSetupMs: null,
    bootstrapRafDelayMs: null,
    bootstrapTextLayoutMs: null,
    dragStartToFollowVisibleMs: null,
    subtreeWarmupDelayMs: null,
    subtreeWarmupMs: null,
    dropResolveCount: 0,
    dropResolveTotalMs: 0,
    dropResolveMaxMs: null,
    buildMoveCommandMs: null,
    buildMoveSourceInfosMs: null,
    buildMoveParentSnapshotMs: null,
    buildMoveApplyMs: null,
    buildMoveChangedCheckMs: null,
    buildMoveHashMs: null,
    buildMoveCreateCommandMs: null,
    buildMoveAffectedParentCount: null,
    buildMoveAffectedChildrenTotal: null,
    buildMoveMaxChildrenCount: null,
    finalizeDropMs: null,
    releaseStartedAt: null,
    releaseToDropRenderedMs: null,
    finalDropTargetType: null,
    finalDropToParentId: null,
    finalDropToIndex: null,
    finishedReason: null,
    committed: false,
    anchors: [],
  };
  activeMindPerfProbe = probe;
  pushMindPerfAnchor(probe, 'begin-dragging', {
    targetNodeId: options.targetNodeId,
    selectedCount: options.selectedCount,
    dragRootCount: options.dragRootCount,
    pointerDownLeadMs: roundPerfMs(options.pointerDownLeadMs),
    nodeCountBefore: probe.nodeCountBefore,
  });
  console.debug('[mind-perf][drag][start]', {
    probeId: probe.id,
    targetNodeId: options.targetNodeId,
    selectedCount: options.selectedCount,
    dragRootCount: options.dragRootCount,
    pointerDownLeadMs: roundPerfMs(options.pointerDownLeadMs),
    nodeCountBefore: probe.nodeCountBefore,
  });
  return probe;
}

function noteDragPerfStep(name: string, data?: Record<string, unknown>) {
  const probe = getActiveMindPerfProbe();
  if (!probe || probe.op !== 'drag-node') return;
  pushMindPerfAnchor(probe, name, data);
}

function noteDragDropResolve(resolveMs: number, data?: Record<string, unknown>) {
  const probe = getActiveMindPerfProbe();
  if (!probe || probe.op !== 'drag-node') return;
  probe.dropResolveCount += 1;
  probe.dropResolveTotalMs += resolveMs;
  probe.dropResolveMaxMs = probe.dropResolveMaxMs == null ? resolveMs : Math.max(probe.dropResolveMaxMs, resolveMs);
  if (probe.dropResolveCount === 1) {
    pushMindPerfAnchor(probe, 'drop-target-first-resolve', {
      resolveMs: roundPerfMs(resolveMs),
      ...data,
    });
  }
}

function finishPendingDragPerfProbe(reason: string, data?: Record<string, unknown>) {
  const probe = getActiveMindPerfProbe();
  if (!probe || probe.op !== 'drag-node') return;
  if (probe.mutationReason || probe.committed) return;
  probe.nodeCountAfter = getMindPerfNodeCount();
  probe.totalMs = performance.now() - probe.startedAt;
  probe.finishedReason = reason;
  pushMindPerfAnchor(probe, 'drag-finished', {
    reason,
    totalMs: roundPerfMs(probe.totalMs),
    ...data,
  });
  finishMindPerfProbe(probe);
}

function finishMindPerfProbe(probe: MindPerfProbe) {
  if (probe.op === 'drag-node') {
    console.debug('[mind-perf][drag][summary]', {
      probeId: probe.id,
      op: probe.op,
      commandName: probe.commandName,
      mutationReason: probe.mutationReason,
      targetNodeId: probe.targetNodeId,
      selectedCount: probe.selectedCount,
      dragRootCount: probe.dragRootCount,
      nodeCountBefore: probe.nodeCountBefore,
      nodeCountAfter: probe.nodeCountAfter,
      pointerDownLeadMs: roundPerfMs(probe.pointerDownLeadMs),
      normalizeDragRootsMs: roundPerfMs(probe.normalizeDragRootsMs),
      dragStartSetupMs: roundPerfMs(probe.dragStartSetupMs),
      bootstrapRafDelayMs: roundPerfMs(probe.bootstrapRafDelayMs),
      bootstrapTextLayoutMs: roundPerfMs(probe.bootstrapTextLayoutMs),
      dragStartToFollowVisibleMs: roundPerfMs(probe.dragStartToFollowVisibleMs),
      subtreeWarmupDelayMs: roundPerfMs(probe.subtreeWarmupDelayMs),
      subtreeWarmupMs: roundPerfMs(probe.subtreeWarmupMs),
      dropResolveCount: probe.dropResolveCount,
      dropResolveAvgMs: roundPerfMs(
        probe.dropResolveCount ? probe.dropResolveTotalMs / probe.dropResolveCount : null
      ),
      dropResolveMaxMs: roundPerfMs(probe.dropResolveMaxMs),
      buildMoveCommandMs: roundPerfMs(probe.buildMoveCommandMs),
      buildMoveSourceInfosMs: roundPerfMs(probe.buildMoveSourceInfosMs),
      buildMoveParentSnapshotMs: roundPerfMs(probe.buildMoveParentSnapshotMs),
      buildMoveApplyMs: roundPerfMs(probe.buildMoveApplyMs),
      buildMoveChangedCheckMs: roundPerfMs(probe.buildMoveChangedCheckMs),
      buildMoveHashMs: roundPerfMs(probe.buildMoveHashMs),
      buildMoveCreateCommandMs: roundPerfMs(probe.buildMoveCreateCommandMs),
      buildMoveAffectedParentCount: probe.buildMoveAffectedParentCount,
      buildMoveAffectedChildrenTotal: probe.buildMoveAffectedChildrenTotal,
      buildMoveMaxChildrenCount: probe.buildMoveMaxChildrenCount,
      finalizeDropMs: roundPerfMs(probe.finalizeDropMs),
      releaseToDropRenderedMs: roundPerfMs(probe.releaseToDropRenderedMs),
      dragCriticalPathMs: roundPerfMs(
        (probe.dragStartToFollowVisibleMs ?? 0) + (probe.releaseToDropRenderedMs ?? 0)
      ),
      finalDropTargetType: probe.finalDropTargetType,
      finalDropToParentId: probe.finalDropToParentId,
      finalDropToIndex: probe.finalDropToIndex,
      committed: probe.committed,
      finishedReason: probe.finishedReason,
      historyExecuteMs: roundPerfMs(probe.historyExecuteMs),
      commandDoMs: roundPerfMs(probe.commandDoMs),
      mutationQueueDelayMs: roundPerfMs(probe.mutationQueueDelayMs),
      preFlushRequestRenderCount: probe.preFlushRequestRenderCount,
      preFlushDrawCount: probe.preFlushDrawCount,
      preFlushDrawMs: roundPerfMs(probe.preFlushDrawMs),
      flushTotalMs: roundPerfMs(probe.flushTotalMs),
      totalMs: roundPerfMs(probe.totalMs),
      redrawTotalMs: roundPerfMs(probe.redrawTotalMs),
      layoutRebuildMs: roundPerfMs(probe.layoutRebuildMs),
      layoutMeasureMs: roundPerfMs(probe.layoutMeasureMs),
      layoutMeasureCalls: probe.layoutMeasureCalls,
      layoutMeasureCacheHits: probe.layoutMeasureCacheHits,
      layoutSubtreeMs: roundPerfMs(probe.layoutSubtreeMs),
      layoutSubtreeCalls: probe.layoutSubtreeCalls,
      layoutSubtreeCacheHits: probe.layoutSubtreeCacheHits,
      layoutPlaceMs: roundPerfMs(probe.layoutPlaceMs),
      layoutPlaceCalls: probe.layoutPlaceCalls,
      worldBoxesBuildMs: roundPerfMs(probe.worldBoxesBuildMs),
      parentIndexBuildMs: roundPerfMs(probe.parentIndexBuildMs),
      changedNodeScanMs: roundPerfMs(probe.changedNodeScanMs),
      changedNodeCount: probe.changedNodeCount,
      descendantCountsMs: roundPerfMs(probe.descendantCountsMs),
      spatialIndexMs: roundPerfMs(probe.spatialIndexMs),
      edgeCacheMs: roundPerfMs(probe.edgeCacheMs),
      edgeAffectedParentCount: probe.edgeAffectedParentCount,
      edgeTranslatedParentCount: probe.edgeTranslatedParentCount,
      edgesRebuildMs: roundPerfMs(probe.edgesRebuildMs),
      drawMs: roundPerfMs(probe.drawMs),
      ensureVisibleMs: roundPerfMs(probe.ensureVisibleMs),
      anchors: probe.anchors,
    });
  } else {
    const summaryLabel =
      probe.op === 'add-parent-shortcut' ? '[mind-perf][add-parent][summary]' : '[mind-perf][add-node][summary]';
    console.debug(summaryLabel, {
      probeId: probe.id,
      op: probe.op,
      commandKind: probe.commandKind,
      commandName: probe.commandName,
      mutationReason: probe.mutationReason,
      targetNodeId: probe.targetNodeId,
      selectedCount: probe.selectedCount,
      nodeCountBefore: probe.nodeCountBefore,
      nodeCountAfter: probe.nodeCountAfter,
      historyExecuteMs: roundPerfMs(probe.historyExecuteMs),
      commandDoMs: roundPerfMs(probe.commandDoMs),
      mutationQueueDelayMs: roundPerfMs(probe.mutationQueueDelayMs),
      preFlushRequestRenderCount: probe.preFlushRequestRenderCount,
      preFlushDrawCount: probe.preFlushDrawCount,
      preFlushDrawMs: roundPerfMs(probe.preFlushDrawMs),
      flushTotalMs: roundPerfMs(probe.flushTotalMs),
      totalMs: roundPerfMs(probe.totalMs),
      redrawTotalMs: roundPerfMs(probe.redrawTotalMs),
      layoutRebuildMs: roundPerfMs(probe.layoutRebuildMs),
      layoutMeasureMs: roundPerfMs(probe.layoutMeasureMs),
      layoutMeasureCalls: probe.layoutMeasureCalls,
      layoutMeasureCacheHits: probe.layoutMeasureCacheHits,
      layoutSubtreeMs: roundPerfMs(probe.layoutSubtreeMs),
      layoutSubtreeCalls: probe.layoutSubtreeCalls,
      layoutSubtreeCacheHits: probe.layoutSubtreeCacheHits,
      layoutPlaceMs: roundPerfMs(probe.layoutPlaceMs),
      layoutPlaceCalls: probe.layoutPlaceCalls,
      worldBoxesBuildMs: roundPerfMs(probe.worldBoxesBuildMs),
      parentIndexBuildMs: roundPerfMs(probe.parentIndexBuildMs),
      changedNodeScanMs: roundPerfMs(probe.changedNodeScanMs),
      changedNodeCount: probe.changedNodeCount,
      descendantCountsMs: roundPerfMs(probe.descendantCountsMs),
      spatialIndexMs: roundPerfMs(probe.spatialIndexMs),
      edgeCacheMs: roundPerfMs(probe.edgeCacheMs),
      edgeAffectedParentCount: probe.edgeAffectedParentCount,
      edgeTranslatedParentCount: probe.edgeTranslatedParentCount,
      edgesRebuildMs: roundPerfMs(probe.edgesRebuildMs),
      drawMs: roundPerfMs(probe.drawMs),
      ensureVisibleMs: roundPerfMs(probe.ensureVisibleMs),
      anchors: probe.anchors,
    });
  }
  if (activeMindPerfProbe?.id === probe.id) activeMindPerfProbe = null;
}

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
let dragOverlayBootstrapRafId: number | null = null;
let dragSubtreeWarmupTimer: number | null = null;

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
let suppressCanvasContextMenuUntil = 0;
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
const closeDialogState = ref({
  visible: false,
  key: null as string | null,
  submitting: false,
});
const imagePreviewState = ref({
  visible: false,
  src: '',
  title: '',
});

const isDirty = computed(() => contentRevision.value !== lastSavedContentRevision.value);
const shouldConfirmClose = computed(() => isDirty.value || !props.filePath);

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
    totalNodes: getMindPerfNodeCount(),
    selectedNodes: getVisibleSelectedNodeCount(),
  });
}

let emitNodeCountRafId: number | null = null;
function scheduleNodeCountStateEmit() {
  if (emitNodeCountRafId != null) return;
  emitNodeCountRafId = requestAnimationFrame(() => {
    emitNodeCountRafId = null;
    emitNodeCountState();
  });
}

let syncStylePanelRafId: number | null = null;
function scheduleStylePanelSync() {
  if (syncStylePanelRafId != null) return;
  syncStylePanelRafId = requestAnimationFrame(() => {
    syncStylePanelRafId = null;
    syncStylePanelFromSelection();
  });
}

function pauseSelectionUiSyncForDrag() {
  let paused = false;
  if (emitNodeCountRafId != null) {
    cancelAnimationFrame(emitNodeCountRafId);
    emitNodeCountRafId = null;
    paused = true;
  }
  if (syncStylePanelRafId != null) {
    cancelAnimationFrame(syncStylePanelRafId);
    syncStylePanelRafId = null;
    paused = true;
  }
  if (paused) deferredSelectionUiSyncAfterDrag = true;
}

function resumeSelectionUiSyncAfterDrag() {
  if (!deferredSelectionUiSyncAfterDrag) return;
  deferredSelectionUiSyncAfterDrag = false;
  scheduleNodeCountStateEmit();
  scheduleStylePanelSync();
}

let selectionWatchSuppressionHolds = 0;
function holdSelectionWatchSuppression() {
  selectionWatchSuppressionHolds += 1;
  let released = false;
  return () => {
    if (released) return;
    released = true;
    void nextTick().then(() => {
      selectionWatchSuppressionHolds = Math.max(0, selectionWatchSuppressionHolds - 1);
    });
  };
}

function isSelectionWatchSuppressed() {
  return selectionWatchSuppressionHolds > 0;
}

let pendingLayoutInvalidationNodeIds = new Set<string>();
let pendingAddedNodeInfos: Array<{ nodeId: string; parentId: string | null }> = [];
let pendingRemovedNodeIds = new Set<string>();
let pendingHiddenNodeIds = new Set<string>();
let pendingTouchedParentIds = new Set<string>();
let pendingReuseDescendantCounts = false;
let pendingReuseParentIndex = false;
let pendingForceFullEdgeRebuild = false;
let pendingTrustExistingNodeMeasureCache = false;
let pendingUseLayoutChangedNodeIds = false;
let deferredSelectionUiSyncAfterDrag = false;

function markContentDirty() {
  contentRevision.value += 1;
}

type InteractionMode =
  | 'idle'
  | 'pointerDownBlank'
  | 'pointerDownOnNode'
  | 'pointerDownSecondary'
  | 'marqueeSelecting'
  | 'panningCanvas'
  | 'draggingNodes';

type DragCandidate = {
  selectionIds: string[];
  primaryDragRootId: string | null;
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
  return getActiveMind(props.doc)?.nodes as Record<string, any> | null;
}

function createNodeId() {
  return typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
    ? `node-${crypto.randomUUID()}`
    : `node-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

function getRootNodeId() {
  return getActiveMind(props.doc)?.roots?.[0]?.rootId ?? null;
}

function getNodeById(nodeId: string | null | undefined) {
  if (!nodeId) return null;
  const nodes = getMindNodes();
  return nodes?.[nodeId] ?? null;
}

function buildParentIndex(nodes: Record<string, any> | null | undefined) {
  const parentIndex = new Map<string, { parentId: string; index: number }>();
  if (!nodes) return parentIndex;
  for (const [parentId, parentNode] of Object.entries(nodes)) {
    const children = Array.isArray(parentNode?.children) ? parentNode.children : [];
    children.forEach((childId, index) => {
      if (typeof childId === 'string' && childId) {
        parentIndex.set(childId, { parentId, index });
      }
    });
  }
  return parentIndex;
}

function updateParentIndexForAddedNodes(
  nodes: Record<string, any> | null | undefined,
  previousIndex: Map<string, { parentId: string; index: number }>,
  addedNodeInfos: Array<{ nodeId: string; parentId: string | null }>
) {
  const nextIndex = new Map(previousIndex);
  const touchedParentIds = new Set<string>();
  addedNodeInfos.forEach(({ parentId }) => {
    if (parentId) touchedParentIds.add(parentId);
  });
  touchedParentIds.forEach((parentId) => {
    const children = Array.isArray(nodes?.[parentId]?.children) ? nodes?.[parentId]?.children : [];
    children.forEach((childId: string, index: number) => {
      if (typeof childId === 'string' && childId) nextIndex.set(childId, { parentId, index });
    });
  });
  return nextIndex;
}

function updateParentIndexForRemovedNodes(
  nodes: Record<string, any> | null | undefined,
  previousIndex: Map<string, { parentId: string; index: number }>,
  touchedParentIds: Iterable<string>,
  removedNodeIds: Iterable<string>
) {
  const nextIndex = new Map(previousIndex);
  for (const nodeId of removedNodeIds) {
    if (nodeId) nextIndex.delete(nodeId);
  }
  const uniqueParentIds = new Set<string>();
  for (const parentId of touchedParentIds) {
    if (parentId) uniqueParentIds.add(parentId);
  }
  uniqueParentIds.forEach((parentId) => {
    const children = Array.isArray(nodes?.[parentId]?.children) ? nodes?.[parentId]?.children : [];
    children.forEach((childId: string, index: number) => {
      if (typeof childId === 'string' && childId) nextIndex.set(childId, { parentId, index });
    });
  });
  return nextIndex;
}

function updateParentIndexForTouchedParents(
  nodes: Record<string, any> | null | undefined,
  previousIndex: Map<string, { parentId: string; index: number }>,
  touchedParentIds: Iterable<string>
) {
  const nextIndex = new Map(previousIndex);
  const uniqueParentIds = new Set<string>();
  for (const parentId of touchedParentIds) {
    if (parentId) uniqueParentIds.add(parentId);
  }
  uniqueParentIds.forEach((parentId) => {
    const children = Array.isArray(nodes?.[parentId]?.children) ? nodes?.[parentId]?.children : [];
    children.forEach((childId: string, index: number) => {
      if (typeof childId === 'string' && childId) nextIndex.set(childId, { parentId, index });
    });
  });
  return nextIndex;
}

function collectAncestorNodeIds(startNodeId: string | null | undefined) {
  const ids: string[] = [];
  let currentId = startNodeId ?? null;
  while (currentId) {
    ids.push(currentId);
    const parentInfo = parentIndexByNodeId.value.get(currentId);
    currentId = parentInfo?.parentId ?? null;
  }
  return ids;
}

function resolveRootNodeId(
  startNodeId: string | null | undefined,
  nextParentIndex: Map<string, { parentId: string; index: number }> = parentIndexByNodeId.value
) {
  let currentId = startNodeId ?? null;
  while (currentId) {
    const parentInfo = nextParentIndex.get(currentId);
    if (!parentInfo) return currentId;
    currentId = parentInfo.parentId;
  }
  return null;
}

function isSameWorldRect(a: { x1: number; y1: number; x2: number; y2: number } | undefined, b: { x1: number; y1: number; x2: number; y2: number } | undefined) {
  return !!a &&
    !!b &&
    a.x1 === b.x1 &&
    a.y1 === b.y1 &&
    a.x2 === b.x2 &&
    a.y2 === b.y2;
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

function setSingleSelected(
  nodeId: string | null,
  options?: { anchorId?: string | null; preserveAnchor?: boolean; suppressRender?: boolean; suppressFocus?: boolean }
) {
  setSelection(nodeId ? [nodeId] : [], nodeId, options);
}

function getSelectedNodeIds() {
  return Array.from(selectedIds.value);
}

function buildSelectionPathFromParentIndex(
  nodeId: string,
  nextParentIndex: Map<string, { parentId: string; index: number }> = parentIndexByNodeId.value
) {
  const path: number[] = [];
  let currentId: string | null = nodeId;
  while (currentId) {
    const parentInfo = nextParentIndex.get(currentId);
    if (!parentInfo) break;
    path.unshift(parentInfo.index);
    currentId = parentInfo.parentId;
  }
  return path;
}

function getCachedSelectionTargetInfo(
  nodeId: string,
  nextParentIndex: Map<string, { parentId: string; index: number }> = parentIndexByNodeId.value
) {
  const nodes = getMindNodes();
  if (!nodes?.[nodeId]) return null;
  const parentInfo = nextParentIndex.get(nodeId);
  return {
    nodeId,
    parentId: parentInfo?.parentId ?? null,
    indexInParent: parentInfo?.index ?? -1,
    path: buildSelectionPathFromParentIndex(nodeId, nextParentIndex),
  };
}

function normalizeSelectionTargetsFromParentIndex(
  selectedNodeIds: Iterable<string>,
  options?: { allowRoot?: boolean; collapseToRootIfSelected?: boolean }
) {
  const nodes = getMindNodes();
  if (!nodes) return { finalTargets: [], filteredOutDescendantsCount: 0 };
  const nextParentIndex = parentIndexByNodeId.value;
  const rootNodeId = getRootNodeId();
  const allowRoot = options?.allowRoot ?? true;
  const collapseToRootIfSelected = options?.collapseToRootIfSelected ?? false;

  const uniqueIds = Array.from(new Set(selectedNodeIds)).filter((nodeId) => !!nodes[nodeId]);
  let candidateIds = uniqueIds;
  if (!allowRoot && rootNodeId) candidateIds = candidateIds.filter((nodeId) => nodeId !== rootNodeId);
  if (collapseToRootIfSelected && rootNodeId && candidateIds.includes(rootNodeId)) {
    candidateIds = [rootNodeId];
  }

  const candidateSet = new Set(candidateIds);
  const filteredIds: string[] = [];
  let filteredOutDescendantsCount = 0;

  for (const nodeId of candidateIds) {
    let currentId = nextParentIndex.get(nodeId)?.parentId ?? null;
    let shouldFilterOut = false;
    while (currentId) {
      if (candidateSet.has(currentId)) {
        shouldFilterOut = true;
        break;
      }
      currentId = nextParentIndex.get(currentId)?.parentId ?? null;
    }
    if (shouldFilterOut) {
      filteredOutDescendantsCount += 1;
      continue;
    }
    filteredIds.push(nodeId);
  }

  const finalTargets = filteredIds
    .map((nodeId) => getCachedSelectionTargetInfo(nodeId, nextParentIndex))
    .filter((value): value is SelectionTargetInfo => !!value)
    .sort(compareSelectionTargetInfo);

  return { finalTargets, filteredOutDescendantsCount };
}

const ROOT_SELECTION_GROUP_KEY = '__sheet-root__';

function getRootSelectionIds() {
  const roots = getActiveMind(props.doc)?.roots;
  return Array.isArray(roots)
    ? roots.map((root: any) => root?.rootId).filter((value: unknown): value is string => typeof value === 'string' && value.length > 0)
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
  options?: { anchorId?: string | null; preserveAnchor?: boolean; suppressRender?: boolean; suppressFocus?: boolean }
) {
  const releaseSelectionWatchSuppression = holdSelectionWatchSuppression();
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
  if (!options?.suppressFocus) focusViewportWithoutScroll();
  pruneSelectionAnchors(nextIdsSet);
  if (!nextIds.length) {
    selectionAnchorNodeId.value = null;
    selectionAnchorByGroup.value = {};
    releaseSelectionWatchSuppression();
    if ((selectionChanged || primaryChanged) && !options?.suppressRender) requestRender();
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
  releaseSelectionWatchSuppression();
  if ((selectionChanged || primaryChanged) && !options?.suppressRender) requestRender();
  if (nextIds.length === 1 && nextPrimaryId) {
    dumpCanvasTextDiagnostics(nextPrimaryId, 'set-selection');
  }
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

function getKeyboardNavigationBaseNodeId() {
  const nodes = getMindNodes();
  const selectedNodeIds = getSelectedNodeIds();
  if (!selectedNodeIds.length) return null;
  if (!nodes) return selectedNodeIds[0] ?? null;
  const sortedInfos = selectedNodeIds
    .map((nodeId) => getSelectionTargetInfo(nodes, nodeId))
    .filter((value): value is NonNullable<typeof value> => !!value)
    .sort(compareSelectionTargetInfo);
  return sortedInfos[0]?.nodeId ?? selectedNodeIds[0] ?? null;
}

function resolveKeyboardSiblingTarget(nodeId: string, delta: -1 | 1) {
  const groupKey = getSelectionGroupKey(nodeId);
  const siblingIds = getGroupNodeIds(groupKey);
  const currentIndex = siblingIds.indexOf(nodeId);
  if (currentIndex < 0) return null;
  const targetId = siblingIds[currentIndex + delta];
  return typeof targetId === 'string' && targetId.length > 0 ? targetId : null;
}

function resolveKeyboardParentTarget(nodeId: string) {
  return findParentAndIndex(nodeId)?.parentId ?? null;
}

function resolveKeyboardFirstChildTarget(nodeId: string) {
  const node = getNodeById(nodeId);
  if (node?.collapsed) return null;
  const childIds = Array.isArray(node?.children) ? node.children : [];
  const targetId = childIds.find((childId: unknown): childId is string => typeof childId === 'string' && childId.length > 0);
  return targetId ?? null;
}

function moveSelectionWithKeyboard(direction: 'up' | 'down' | 'left' | 'right') {
  const baseNodeId = getKeyboardNavigationBaseNodeId();
  if (!baseNodeId) return false;

  const nextNodeId =
    direction === 'up'
      ? resolveKeyboardSiblingTarget(baseNodeId, -1)
      : direction === 'down'
        ? resolveKeyboardSiblingTarget(baseNodeId, 1)
        : direction === 'left'
          ? resolveKeyboardParentTarget(baseNodeId)
          : resolveKeyboardFirstChildTarget(baseNodeId);

  if (!nextNodeId || nextNodeId === baseNodeId) return false;
  clearCollapseTagHideTimer();
  hoverNodeId.value = null;
  collapseTagHoverNodeId.value = null;
  collapseTagStickyNodeId.value = null;
  setSelection([], null);
  setSingleSelected(nextNodeId);
  ensureNodeVisible(nextNodeId);
  return true;
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

function getImageTargetAtScreenPoint(screenX: number, screenY: number) {
  const worldPoint = screenToWorld(camera.value, screenX, screenY);
  const candidates = spatialIndex.queryPoint(worldPoint);
  let bestTarget: { nodeId: string; area: number } | null = null;
  for (const nodeId of candidates) {
    const imageRect = getNodeImageRect(nodeId);
    if (!pointInImageWorldRect(worldPoint.x, worldPoint.y, imageRect)) continue;
    const area = imageRect.width * imageRect.height;
    if (!bestTarget || area < bestTarget.area) {
      bestTarget = { nodeId, area };
    }
  }
  return bestTarget?.nodeId ?? null;
}

function openImagePreview(nodeId: string) {
  const image = getNodeImage(getNodeById(nodeId));
  if (!image?.src) return;
  imagePreviewState.value = {
    visible: true,
    src: image.src,
    title: getNodePlainText(getNodeById(nodeId)).trim(),
  };
}

function closeImagePreview() {
  imagePreviewState.value = {
    visible: false,
    src: '',
    title: '',
  };
}

function onSearchMarkerTileClick(markerKey: string) {
  if (searchMarkerKeys.value.includes(markerKey)) {
    searchMarkerKeys.value = searchMarkerKeys.value.filter((key) => key !== markerKey);
    return;
  }
  searchMarkerKeys.value = [...searchMarkerKeys.value, markerKey];
}

async function revealSearchTargetNode(nodeId: string) {
  const nodes = getMindNodes();
  if (!nodes?.[nodeId]) return;

  const collapsedAncestorIds = collectAncestorNodeIds(nodeId)
    .slice(1)
    .filter((ancestorId) => {
      const ancestorNode = nodes[ancestorId];
      const children = Array.isArray(ancestorNode?.children) ? ancestorNode.children : [];
      return !!ancestorNode?.collapsed && children.length > 0;
    });

  if (!collapsedAncestorIds.length) return;

  collapsedAncestorIds.forEach((ancestorId) => {
    nodes[ancestorId].collapsed = false;
  });

  await applyDocumentMutation('search-reveal-node', {
    ensureVisibleNodeId: nodeId,
    markDirty: false,
    invalidateSubtreeHeightNodeIds: Array.from(
      new Set(collapsedAncestorIds.flatMap((ancestorId) => collectAncestorNodeIds(ancestorId)))
    ),
    reuseDescendantCounts: true,
    reuseParentIndex: true,
    forceFullEdgeRebuild: true,
    trustExistingNodeMeasureCache: true,
    useLayoutChangedNodeIds: true,
  });
}

function resolveSearchFocusNodeId(nodeId: string) {
  return collectAncestorNodeIds(nodeId).find((candidateId) => worldBoxes.value.has(candidateId)) ?? null;
}

function centerNodeInViewport(nodeId: string) {
  const focusNodeId = resolveSearchFocusNodeId(nodeId) ?? nodeId;
  const rect = worldBoxes.value.get(focusNodeId);
  if (!rect) {
    ensureNodeVisible(focusNodeId);
    return;
  }

  const centerX = (rect.x1 + rect.x2) / 2;
  const centerY = (rect.y1 + rect.y2) / 2;

  setCamera({
    ...camera.value,
    tx: viewportW.value / 2 - centerX * camera.value.scale,
    ty: viewportH.value / 2 - centerY * camera.value.scale,
  });
  requestRender();
}

async function focusSearchResultNode(nodeId: string) {
  if (!getNodeById(nodeId)) return;
  if (editingSession.value && editingSession.value.nodeId !== nodeId) {
    commitEditingSession();
  }

  await revealSearchTargetNode(nodeId);
  clearCollapseTagHideTimer();
  hoverNodeId.value = null;
  collapseTagHoverNodeId.value = null;
  collapseTagStickyNodeId.value = null;
  setSingleSelected(nodeId, { suppressRender: true, suppressFocus: true });
  centerNodeInViewport(nodeId);
  focusViewportWithoutScroll();
}

async function onSearchTextResultClick(nodeId: string) {
  selectedSearchResultNodeId.value = nodeId;
  await focusSearchResultNode(nodeId);
}

function replaceSelectedSearchResult() {
  if (!canReplaceSelectedSearchResult.value || !selectedSearchResultNodeId.value) return;
  if (editingSession.value) commitEditingSession();
  const command = createSearchReplaceCommand([selectedSearchResultNodeId.value], searchReplaceText.value, selectedSearchResultNodeId.value);
  if (!command) {
    window.$toast?.({ title: '当前节点没有可替换的文本' });
    return;
  }
  executeCommand(command);
}

function replaceAllSearchResults() {
  if (!canReplaceAllSearchResults.value) return;
  if (editingSession.value) commitEditingSession();
  const targetNodeIds = searchTextResults.value.map((entry) => entry.nodeId);
  const command = createSearchReplaceCommand(targetNodeIds, searchReplaceText.value, selectedSearchResultNodeId.value);
  if (!command) {
    window.$toast?.({ title: '当前结果里没有可替换的文本' });
    return;
  }
  executeCommand(command);
}

function collectMarkerTargetNodeIds() {
  const nodes = getMindNodes();
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

function resolveContextMenuTargetNodeIds(clickedNodeId: string) {
  if (!selectedIds.value.has(clickedNodeId)) return [clickedNodeId];
  const normalized = normalizeSelectedTargets({
    allowRoot: true,
    collapseToRootIfSelected: true,
  });
  return normalized.finalTargets.map((target) => target.nodeId);
}

async function setCollapsedStateForSubtrees(targetNodeIds: string[], collapsed: boolean) {
  if (!targetNodeIds.length) return;
  const nodes = getMindNodes();
  if (!nodes) return;
  const invalidateSubtreeHeightNodeIds = Array.from(
    new Set(targetNodeIds.flatMap((targetNodeId) => collectAncestorNodeIds(targetNodeId)).filter(Boolean))
  );
  const hiddenNodeIds = collapsed
    ? Array.from(
        new Set(
          targetNodeIds.flatMap((targetNodeId) => collectSubtreeNodeIds(nodes, targetNodeId).filter((nodeId) => nodeId !== targetNodeId))
        )
      )
    : [];

  if (editingSession.value) {
    const editingNodeId = editingSession.value.nodeId;
    const editingInsideTargets = targetNodeIds.some((targetNodeId) => collectSubtreeNodeIds(nodes, targetNodeId).includes(editingNodeId));
    if (editingInsideTargets) commitEditingSession();
  }

  let changed = false;
  for (const targetNodeId of targetNodeIds) {
    for (const nodeId of collectSubtreeNodeIds(nodes, targetNodeId)) {
      const node = nodes[nodeId];
      const children = Array.isArray(node?.children) ? node.children : [];
      if (!node || !children.length) continue;
      if (!!node.collapsed === collapsed) continue;
      node.collapsed = collapsed;
      changed = true;
    }
  }

  if (!changed) return;
  await applyDocumentMutation(collapsed ? 'node-collapse-subtrees' : 'node-expand-subtrees', {
    ensureVisibleNodeIds: targetNodeIds,
    invalidateSubtreeHeightNodeIds,
    hiddenNodeIds,
    reuseDescendantCounts: true,
    reuseParentIndex: true,
    forceFullEdgeRebuild: true,
    trustExistingNodeMeasureCache: true,
    useLayoutChangedNodeIds: true,
  });
}

function ensureNodeStyleContainers(node: any) {
  if (!node.style) node.style = {};
  if (!node.style.shape) node.style.shape = {};
  if (!node.style.text) node.style.text = {};
  return node.style as NonNullable<typeof node.style>;
}

function cloneNodeStyleSnapshot(style: any) {
  return style == null ? style : JSON.parse(JSON.stringify(style));
}

function cloneNodeMarkersSnapshot(node: any) {
  if (!Object.prototype.hasOwnProperty.call(node ?? {}, 'markers')) return undefined;
  return Array.isArray(node?.markers) ? [...node.markers] : [];
}

function createNodePresentationSnapshot(
  nodeId: string,
  node: any,
  options: { includeStyle?: boolean; includeMarkers?: boolean; includeLexical?: boolean }
) {
  const snapshot: NodePresentationSnapshot = { nodeId };
  if (options.includeStyle) snapshot.style = cloneNodeStyleSnapshot(node?.style);
  if (options.includeMarkers) snapshot.markers = cloneNodeMarkersSnapshot(node);
  if (options.includeLexical) {
    snapshot.lexicalState = getNodeLexicalState(node);
    snapshot.richText = cloneRichText(getNodeRichText(node));
  }
  return snapshot;
}

function createNodePresentationDraft(
  node: any,
  options: { includeStyle?: boolean; includeMarkers?: boolean; includeLexical?: boolean }
) {
  return {
    ...node,
    style: options.includeStyle ? cloneNodeStyleSnapshot(node?.style) : node?.style,
    markers: options.includeMarkers ? cloneNodeMarkersSnapshot(node) : node?.markers,
    text: node?.text ? JSON.parse(JSON.stringify(node.text)) : node?.text,
    richText: options.includeLexical ? cloneRichText(getNodeRichText(node)) : node?.richText,
    textLexical: options.includeLexical ? getNodeLexicalState(node) : node?.textLexical,
  };
}

function isNodePresentationSnapshotEqual(a: NodePresentationSnapshot, b: NodePresentationSnapshot) {
  if (Object.prototype.hasOwnProperty.call(a, 'style') || Object.prototype.hasOwnProperty.call(b, 'style')) {
    if (JSON.stringify(a.style ?? null) !== JSON.stringify(b.style ?? null)) return false;
  }
  if (Object.prototype.hasOwnProperty.call(a, 'markers') || Object.prototype.hasOwnProperty.call(b, 'markers')) {
    if (JSON.stringify(a.markers ?? null) !== JSON.stringify(b.markers ?? null)) return false;
  }
  if (Object.prototype.hasOwnProperty.call(a, 'lexicalState') || Object.prototype.hasOwnProperty.call(b, 'lexicalState')) {
    if (!a.lexicalState || !b.lexicalState) return false;
    if (!isLexicalStateEqual(a.lexicalState, b.lexicalState)) return false;
  }
  if (Object.prototype.hasOwnProperty.call(a, 'richText') || Object.prototype.hasOwnProperty.call(b, 'richText')) {
    if (!a.richText || !b.richText) return false;
    if (!isRichTextEqual(a.richText, b.richText)) return false;
  }
  return true;
}

function createBatchNodePresentationCommand(
  targetIds: Iterable<string>,
  options: {
    name: string;
    mutationReason: string;
    includeStyle?: boolean;
    includeMarkers?: boolean;
    includeLexical?: boolean;
    updateDraftNode: (draftNode: any, nodeId: string) => void;
  }
): Command | null {
  const nodes = getMindNodes();
  if (!nodes) return null;
  const uniqueTargetIds = Array.from(new Set(targetIds)).filter((nodeId) => !!nodes[nodeId]);
  if (!uniqueTargetIds.length) return null;

  const beforeSnapshots = uniqueTargetIds.map((nodeId) =>
    createNodePresentationSnapshot(nodeId, nodes[nodeId], options)
  );
  const afterSnapshots = uniqueTargetIds.map((nodeId) => {
    const draftNode = createNodePresentationDraft(nodes[nodeId], options);
    options.updateDraftNode(draftNode, nodeId);
    return createNodePresentationSnapshot(nodeId, draftNode, options);
  });

  const changedIndexes = beforeSnapshots.reduce<number[]>((indexes, snapshot, index) => {
    if (!isNodePresentationSnapshotEqual(snapshot, afterSnapshots[index])) indexes.push(index);
    return indexes;
  }, []);
  if (!changedIndexes.length) return null;

  const filteredBeforeSnapshots = changedIndexes.map((index) => beforeSnapshots[index]);
  const filteredAfterSnapshots = changedIndexes.map((index) => afterSnapshots[index]);
  const changedNodeIds = changedIndexes.map((index) => uniqueTargetIds[index]);
  const selection = snapshotSelection();

  return createBatchUpdateNodePresentationCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      applyMutation: applyDocumentMutation,
    },
    {
      name: options.name,
      mutationReason: options.mutationReason,
      beforeSnapshots: filteredBeforeSnapshots,
      afterSnapshots: filteredAfterSnapshots,
      previousSelection: selection,
      nextSelection: selection,
      ensureVisibleNodeIds: changedNodeIds,
    }
  );
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
  executeCommand(
    createBatchNodePresentationCommand(collectMarkerTargetNodeIds(), {
      name: 'BatchUpdateNodeShapeStyleCommand',
      mutationReason: reason,
      includeStyle: true,
      updateDraftNode: (draftNode, nodeId) => {
        const style = ensureNodeStyleContainers(draftNode);
        const shape = { ...(style.shape ?? {}) };
        updater(shape, nodeId);
        style.shape = shape;
      },
    })
  );
}

function withActiveLexicalRangeSelection(
  mutator: (selection: NonNullable<ReturnType<typeof $getSelection>>) => void,
  options?: { allowCollapsed?: boolean }
) {
  if (!editingSession.value) return false;
  let applied = false;
  lexicalEditorManager.getActiveEditor().update(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    if (!options?.allowCollapsed && selection.isCollapsed()) return;
    applied = true;
    mutator(selection);
  });
  return applied;
}

function normalizePickerColorValue(value: AcceptableValue | undefined) {
  return typeof value === 'string' ? value : null;
}

function getActiveLexicalToggleState(key: StyleTextToggleKey) {
  if (!editingSession.value) return textToggleState.value[key];
  let enabled = textToggleState.value[key];
  lexicalEditorManager.getActiveEditor().getEditorState().read(() => {
    const selection = $getSelection();
    if (!$isRangeSelection(selection)) return;
    enabled = selection.hasFormat(key === 'strike' ? 'strikethrough' : key);
  });
  return enabled;
}

async function applyTextStyleToSelectedNodes(
  reason: string,
  nonEditingUpdater: (lexicalState: SerializedLexicalEditorState, node: any) => SerializedLexicalEditorState,
  editingUpdater?: (selection: NonNullable<ReturnType<typeof $getSelection>>) => void,
  editingOptions?: { allowCollapsed?: boolean }
) {
  if (editingSession.value) {
    if (!editingUpdater) return;
    withActiveLexicalRangeSelection(editingUpdater, editingOptions);
    return;
  }
  if (!hasSelectedNodes.value) return;
  executeCommand(
    createBatchNodePresentationCommand(collectMarkerTargetNodeIds(), {
      name: 'BatchUpdateNodeTextStyleCommand',
      mutationReason: reason,
      includeStyle: true,
      includeLexical: true,
      updateDraftNode: (draftNode) => {
        const style = ensureNodeStyleContainers(draftNode);
        const lexicalState = getNodeLexicalState(draftNode);
        const textStyle = { ...(style.text ?? {}) };
        const nextLexicalState = nonEditingUpdater(lexicalState, textStyle);
        setNodeLexicalState(draftNode, nextLexicalState);
        style.text = textStyle;
      },
    })
  );
}

async function onFillPresetSelect(key: StyleFillPresetKey) {
  await applyShapeStyleToSelectedNodes('node-style-fill-preset', (shape) => {
    shape.fillPreset = mapFillPresetKeyToNodePreset(key);
  });
}

async function onFillColorSelect(value: AcceptableValue) {
  const color = normalizePickerColorValue(value);
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

async function onBorderColorSelect(value: AcceptableValue) {
  const color = normalizePickerColorValue(value);
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
  if (editingSession.value) return;
  const option = styleFontOptions.find((item) => item.key === key);
  if (!option) return;
  await applyTextStyleToSelectedNodes(
    'node-style-font-family',
    (lexicalState, textStyle) => {
      textStyle.fontFamily = option.fontFamily;
      return updateLexicalStateTextMarks(lexicalState, (marks) => {
        marks.fontFamily = option.fontFamily;
      });
    },
    (selection) => {
      $patchStyleText(selection, { 'font-family': option.fontFamily });
      selectedFontKey.value = key;
    }
  );
}

async function onFontSizeSelect(size: number) {
  if (editingSession.value) return;
  await applyTextStyleToSelectedNodes(
    'node-style-font-size',
    (lexicalState, textStyle) => {
      textStyle.fontSizePx = size;
      return updateLexicalStateTextMarks(lexicalState, (marks) => {
        marks.fontSize = size;
      });
    },
    (selection) => {
      const displaySize = Math.max(0.0001, Number((size / editingBaseFontSizePx.value).toFixed(4)));
      $patchStyleText(selection, { 'font-size': `${displaySize}em` });
      selectedFontSize.value = resolveFontSizeValue(size);
    }
  );
}

async function onTextColorSelect(value: AcceptableValue) {
  const color = normalizePickerColorValue(value);
  if (!color) return;
  await applyTextStyleToSelectedNodes(
    'node-style-text-color',
    (lexicalState, textStyle) => {
      textStyle.color = color;
      return updateLexicalStateTextMarks(lexicalState, (marks) => {
        marks.color = color;
      });
    },
    (selection) => {
      $patchStyleText(selection, { color });
      selectedTextColor.value = color;
    }
  );
}

async function onTextToggleClick(key: StyleTextToggleKey) {
  const currentValue = textToggleState.value[key];
  const nextValue = !currentValue;
  if (editingSession.value) {
    if (key === 'bold' || key === 'italic') {
      lexicalEditorManager.getActiveEditor().update(() => {
        const selection = $getSelection();
        if (!$isRangeSelection(selection)) return;
        if (selection.isCollapsed()) {
          const hasFormat = selection.hasFormat(key);
          if (hasFormat !== nextValue) selection.formatText(key);
          return;
        }
        $forEachSelectedTextNode((node) => {
          const hasFormat = node.hasFormat(key);
          if (nextValue && !hasFormat) node.toggleFormat(key);
          if (!nextValue && hasFormat) node.toggleFormat(key);
        });
      });
    } else {
      lexicalEditorManager
        .getActiveEditor()
        .dispatchCommand(FORMAT_TEXT_COMMAND, key === 'strike' ? 'strikethrough' : key);
    }
    setTextToggleLocally(key, nextValue);
    return;
  }
  await applyTextStyleToSelectedNodes(
    `node-style-text-${key}`,
    (lexicalState, textStyle) => {
      if (key === 'bold') textStyle.fontWeight = nextValue ? 700 : 400;
      if (key === 'italic') textStyle.fontStyle = nextValue ? 'italic' : 'normal';
      return updateLexicalStateTextMarks(lexicalState, (marks) => {
        if (nextValue) marks[key] = true;
        else delete marks[key];
      });
    }
  );
}

async function onTextAlignSelect(key: StyleTextAlignKey) {
  await applyTextStyleToSelectedNodes(
    'node-style-text-align',
    (lexicalState, textStyle) => {
      textStyle.textAlign = key;
      return updateLexicalStateBlockAlign(lexicalState, key);
    },
    () => {
      lexicalEditorManager.getActiveEditor().dispatchCommand(FORMAT_ELEMENT_COMMAND, key);
      selectedTextAlign.value = key;
    }
  );
}

async function applyMarkerToSelectedNodes(markerKey: string) {
  if (!hasSelectedNodes.value) return;
  executeCommand(
    createBatchNodePresentationCommand(collectMarkerTargetNodeIds(), {
      name: 'BatchApplyNodeMarkerCommand',
      mutationReason: 'node-apply-marker',
      includeMarkers: true,
      updateDraftNode: (draftNode) => {
        upsertNodeMarker(draftNode, markerKey);
      },
    })
  );
}

async function onMarkerTileClick(markerKey: string) {
  if (!hasSelectedNodes.value) return;
  executeCommand(
    createBatchNodePresentationCommand(collectMarkerTargetNodeIds(), {
      name: isMarkerDeleteMode.value ? 'BatchRemoveNodeMarkerCommand' : 'BatchApplyNodeMarkerCommand',
      mutationReason: isMarkerDeleteMode.value ? 'node-remove-marker' : 'node-apply-marker',
      includeMarkers: true,
      updateDraftNode: (draftNode) => {
        if (isMarkerDeleteMode.value) removeNodeMarker(draftNode, markerKey);
        else upsertNodeMarker(draftNode, markerKey);
      },
    })
  );
}

async function clearSelectedNodeMarkers() {
  if (!hasSelectedNodes.value) return;
  executeCommand(
    createBatchNodePresentationCommand(collectMarkerTargetNodeIds(), {
      name: 'BatchClearNodeMarkersCommand',
      mutationReason: 'node-clear-markers',
      includeMarkers: true,
      updateDraftNode: (draftNode) => {
        clearNodeMarkers(draftNode);
      },
    })
  );
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

function updateImageCursor(
  screenX: number,
  screenY: number,
  target: ReturnType<typeof getPrimarySelectedImageTarget> = getPrimarySelectedImageTarget(screenX, screenY)
) {
  const current = imageInteraction.value;
  if (current?.resizing && current.handle) {
    setCanvasCursor(getResizeCursor(current.handle));
    return;
  }
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
    updateImageCursor(screenX, screenY, null);
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
  updateImageCursor(screenX, screenY, target);
  const nextSelected = current?.nodeId === target.nodeId ? current.selected : false;
  const nextPreviewSize = current?.nodeId === target.nodeId ? current.previewSize : null;
  const nextStartPointer =
    current?.nodeId === target.nodeId ? current.startPointer : { xScreen: 0, yScreen: 0 };
  const nextStartSize =
    current?.nodeId === target.nodeId ? current.startSize : { w: 0, h: 0 };
  if (
    current?.nodeId === target.nodeId &&
    current.hovered &&
    current.selected === nextSelected &&
    !current.resizing &&
    current.handle == null &&
    current.pointerId == null &&
    current.previewSize === nextPreviewSize &&
    current.startPointer === nextStartPointer &&
    current.startSize === nextStartSize
  ) {
    return;
  }
  upsertImageInteraction({
    nodeId: target.nodeId,
    hovered: true,
    selected: nextSelected,
    resizing: false,
    handle: null,
    pointerId: null,
    previewSize: nextPreviewSize,
    startPointer: nextStartPointer,
    startSize: nextStartSize,
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
  const rootId = getRootNodeId();
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

const editingCanvasGlyphCenterYPx = computed(() => {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  const canvas = canvasRef.value;
  if (!session || !node || !canvas) return 0;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId: session.nodeId });
  const verticalMetrics = measureTextVerticalMetrics(ctx, {
    font: textStyle.canvasFontString,
    fontSizePx: textStyle.fontSizePx,
    lineHeightPx: textStyle.lineHeightPx,
  });
  return (verticalMetrics.topLeadingPx + verticalMetrics.contentHeightPx / 2) * camera.value.scale;
});

function getEditingTextBoxRectForNode(
  nodeId: string | null | undefined,
  preview = editingPreview.value
) {
  const node = getNodeById(nodeId);
  const worldRect = nodeId ? worldBoxes.value.get(nodeId) : null;
  if (!nodeId || !node || !worldRect) return null;
  const rect = getNodeBodyWorldRect(node, worldRect);
  const image = getNodeImage(node);
  const activePreview = preview?.nodeId === nodeId ? preview : null;
  if (activePreview) {
    const markerBandHeight = measureNodeMarkerRow(node).bandHeight;
    const previewBodyHeight = Math.max(1, activePreview.computedNodeH - markerBandHeight);
    const previewBodyRect = {
      x1: rect.x1,
      y1: rect.y1,
      x2: rect.x1 + activePreview.computedNodeW,
      y2: rect.y1 + previewBodyHeight,
    };
    return {
      x: previewBodyRect.x1 + NODE_TEXT_INSET_X,
      y: previewBodyRect.y1 + activePreview.textLineBoxTop,
      width: Math.max(1, activePreview.computedNodeW - NODE_TEXT_INSET_X * 2),
      height: activePreview.textLineBoxHeight,
    };
  }
  const canvas = canvasRef.value;
  if (!canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId });
  const textLayout = measureNodeTextLayout(ctx, getNodeRichText(node), editingTextLayoutCache, {
    maxWidth: NODE_CONTENT_MAX_W,
    baseStyle: textStyle,
  });
  const textGeometry = computeNodeTextGeometry(ctx, textLayout, textStyle, image);
  return {
    x: rect.x1 + NODE_TEXT_INSET_X,
    y: rect.y1 + textGeometry.textLineBoxTop,
    width: Math.max(1, rect.x2 - rect.x1 - NODE_TEXT_INSET_X * 2),
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
  } else if (bottomRight.y > viewportBottom) {
    dy = viewportBottom - bottomRight.y;
  } else if (topLeft.y < paddingPx) {
    dy = paddingPx - topLeft.y;
  }

  if (dx === 0 && dy === 0) return;
  panByPixels(dx, dy);
  constrainToBounds();
  requestRender();
}

function ensureWorldBoxEndVisible(box: { x: number; y: number; width: number; height: number }, paddingPx = 32) {
  const topLeft = worldToScreen(camera.value, box.x, box.y);
  const bottomRight = worldToScreen(camera.value, box.x + box.width, box.y + box.height);
  const viewportRight = viewportW.value - paddingPx;
  const viewportBottom = viewportH.value - paddingPx;
  const boxWidth = bottomRight.x - topLeft.x;

  let dx = 0;
  if (boxWidth <= viewportW.value - paddingPx * 2) {
    if (topLeft.x < paddingPx) dx = paddingPx - topLeft.x;
    else if (bottomRight.x > viewportRight) dx = viewportRight - bottomRight.x;
  } else if (topLeft.x !== paddingPx) {
    dx = paddingPx - topLeft.x;
  }

  let dy = 0;
  if (bottomRight.y > viewportBottom) {
    dy = viewportBottom - bottomRight.y;
  }

  if (dx === 0 && dy === 0) return;
  panByPixels(dx, dy);
  constrainToBounds();
  requestRender();
}

function getEditingCaretViewportRect() {
  const viewportEl = viewportRef.value;
  if (!viewportEl || !editingSession.value) return null;
  const selection = window.getSelection();
  if (!selection || selection.rangeCount === 0) return null;
  const range = selection.getRangeAt(0);
  const editorRoot = document.querySelector('.lexical-editor-root');
  const commonAncestor = range.commonAncestorContainer;
  const anchorNode = commonAncestor instanceof Element ? commonAncestor : commonAncestor.parentElement;
  if (!(editorRoot instanceof HTMLElement) || !anchorNode || !editorRoot.contains(anchorNode)) return null;

  let rect = range.getBoundingClientRect();
  if ((rect.width === 0 && rect.height === 0) || !Number.isFinite(rect.top)) {
    const fallbackRect = range.getClientRects()[0];
    if (fallbackRect) {
      rect = fallbackRect;
    } else {
      const selectionAnchor = selection.anchorNode instanceof Element
        ? selection.anchorNode
        : selection.anchorNode?.parentElement ?? null;
      const anchorRect = selectionAnchor instanceof HTMLElement
        ? selectionAnchor.getBoundingClientRect()
        : null;
      if (!anchorRect || !Number.isFinite(anchorRect.top)) return null;
      rect = anchorRect;
    }
  }

  const viewportRect = viewportEl.getBoundingClientRect();
  return {
    localLeft: rect.left - viewportRect.left,
    localRight: rect.right - viewportRect.left,
    localTop: rect.top - viewportRect.top,
    localBottom: rect.bottom - viewportRect.top,
  };
}

function isEditingCaretOutsideViewport(paddingPx = 32) {
  const rect = getEditingCaretViewportRect();
  if (!rect) return false;
  const viewportRight = viewportW.value - paddingPx;
  const viewportBottom = viewportH.value - paddingPx;
  return (
    rect.localLeft < paddingPx ||
    rect.localRight > viewportRight ||
    rect.localTop < paddingPx ||
    rect.localBottom > viewportBottom
  );
}

function ensureEditingCaretVisible(paddingPx = 32) {
  const rect = getEditingCaretViewportRect();
  if (!rect) return false;
  const viewportRight = viewportW.value - paddingPx;
  const viewportBottom = viewportH.value - paddingPx;

  let dx = 0;
  if (rect.localLeft < paddingPx) dx = paddingPx - rect.localLeft;
  else if (rect.localRight > viewportRight) dx = viewportRight - rect.localRight;

  let dy = 0;
  if (rect.localTop < paddingPx) dy = paddingPx - rect.localTop;
  else if (rect.localBottom > viewportBottom) dy = viewportBottom - rect.localBottom;

  if (dx === 0 && dy === 0) return false;
  panByPixels(dx, dy);
  constrainToBounds();
  requestRender();
  return true;
}

const editingTextBoxRect = computed(() => {
  const session = editingSession.value;
  return getEditingTextBoxRectForNode(session?.nodeId);
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
    fontWeight: String(textStyle.fontWeight),
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
  return Math.max(0, editingCanvasTopLeadingPx.value * camera.value.scale - getDomTextTopOffset(style) - 1);
});

const TEXT_DIAGNOSTIC_STYLE_KEYS = [
  'font',
  'font-family',
  'font-size',
  'font-weight',
  'font-style',
  'line-height',
  'letter-spacing',
  'color',
  'opacity',
  'text-align',
  'text-rendering',
  'font-kerning',
  'font-synthesis',
  'font-smooth',
  '-webkit-font-smoothing',
  '-moz-osx-font-smoothing',
  'white-space',
  'word-break',
  'overflow-wrap',
  'line-break',
  'text-size-adjust',
  '-webkit-text-size-adjust',
  'transform',
  'zoom',
  'filter',
] as const;

function cloneDiagnosticValue<T>(value: T): T | null {
  if (value == null) return value;
  try {
    return JSON.parse(JSON.stringify(value)) as T;
  } catch {
    return null;
  }
}

function toPlainRect(
  rect:
    | DOMRect
    | { x?: number; y?: number; left?: number; top?: number; width: number; height: number }
    | null
    | undefined
) {
  if (!rect) return null;
  const x = typeof rect.x === 'number' ? rect.x : typeof rect.left === 'number' ? rect.left : 0;
  const y = typeof rect.y === 'number' ? rect.y : typeof rect.top === 'number' ? rect.top : 0;
  return {
    x,
    y,
    width: rect.width,
    height: rect.height,
  };
}

function serializeComputedStyle(style: CSSStyleDeclaration | null | undefined) {
  if (!style) return null;
  const textRelevant: Record<string, string> = {};
  TEXT_DIAGNOSTIC_STYLE_KEYS.forEach((key) => {
    textRelevant[key] = style.getPropertyValue(key);
  });
  return textRelevant;
}

function captureElementTextDiagnostics(element: Element | null | undefined) {
  if (!(element instanceof HTMLElement)) return null;
  return {
    tagName: element.tagName.toLowerCase(),
    className: element.className,
    rect: toPlainRect(element.getBoundingClientRect()),
    computedTextStyle: serializeComputedStyle(window.getComputedStyle(element)),
  };
}

function findFirstTextNode(element: Node | null | undefined): Text | null {
  if (!element) return null;
  if (element instanceof Text) return element;
  const childNodes = Array.from(element.childNodes ?? []);
  for (const child of childNodes) {
    const found = findFirstTextNode(child);
    if (found && found.textContent && found.textContent.length > 0) return found;
  }
  return null;
}

function captureTextRangeDiagnostics(root: Element | null | undefined, reference: HTMLElement | null | undefined) {
  if (!(root instanceof HTMLElement)) return null;
  const textNode = findFirstTextNode(root);
  if (!textNode) return null;
  const range = document.createRange();
  range.selectNodeContents(textNode);
  const rangeRect = range.getBoundingClientRect();
  const referenceRect = reference?.getBoundingClientRect() ?? null;
  const rootRect = root.getBoundingClientRect();
  return {
    text: textNode.textContent ?? '',
    rect: toPlainRect(rangeRect),
    offsetFromReferenceTop: referenceRect ? rangeRect.top - referenceRect.top : null,
    offsetFromRootTop: rangeRect.top - rootRect.top,
  };
}

function parseFontFamilyStack(fontFamily: string | null | undefined) {
  return String(fontFamily ?? '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
}

function captureFontAvailability(fontFamily: string | null | undefined, fontSizePx: number | null | undefined) {
  if (typeof document === 'undefined' || !document.fonts || !fontFamily || !fontSizePx) return null;
  const stack = parseFontFamilyStack(fontFamily);
  const normalizedSize = Math.max(1, fontSizePx);
  return {
    stack,
    stackCheck: document.fonts.check(`${normalizedSize}px ${fontFamily}`),
    perFamily: stack.map((family) => ({
      family,
      available: document.fonts.check(`${normalizedSize}px ${family}`),
    })),
  };
}

function summarizeRichTextDiagnostics(doc: RichTextDocument) {
  return {
    blockCount: doc.blocks.length,
    blocks: doc.blocks.map((block, blockIndex) => ({
      blockIndex,
      align: block.align,
      inlineCount: block.inlines.length,
      text: block.inlines.map((inline) => inline.text).join(''),
      inlines: block.inlines.map((inline, inlineIndex) => ({
        inlineIndex,
        text: inline.text,
        marks: cloneDiagnosticValue(inline.marks ?? null),
      })),
    })),
  };
}

function summarizeLexicalStateDiagnostics(state: SerializedLexicalEditorState) {
  return {
    rootType: state.root?.type ?? null,
    childCount: Array.isArray(state.root?.children) ? state.root.children.length : 0,
    children: (state.root?.children ?? []).map((child, childIndex) => ({
      childIndex,
      type: child.type,
      format: child.format ?? null,
      textStyle: child.textStyle ?? null,
      childCount: Array.isArray(child.children) ? child.children.length : 0,
      textChildren: (child.children ?? [])
        .filter((grandChild) => grandChild.type === 'text')
        .map((grandChild, grandChildIndex) => ({
          grandChildIndex,
          text: grandChild.text ?? '',
          format: grandChild.format ?? null,
          style: grandChild.style ?? '',
        })),
    })),
  };
}

function buildCanvasTextDiagnostics(nodeId: string) {
  const node = getNodeById(nodeId);
  const canvas = canvasRef.value;
  const worldRect = worldBoxes.value.get(nodeId);
  if (!node || !canvas || !worldRect) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const role = getMindNodeRole(props.doc, nodeId);
  const defaultVisualStyle = getMindNodeDefaultVisualStyle(props.doc, nodeId);
  const textStyle = getNodeTextStyle(node, { doc: props.doc, nodeId });
  const richText = cloneRichText(getNodeRichText(node));
  const lexicalState = getNodeLexicalState(node);
  const textLayout = measureNodeTextLayout(ctx, richText, undefined, {
    maxWidth: NODE_CONTENT_MAX_W,
    baseStyle: textStyle,
  });
  const image = getNodeImage(node);
  const textGeometry = computeNodeTextGeometry(ctx, textLayout, textStyle, image);
  const bodyRect = getNodeBodyWorldRect(node, worldRect);
  const textBoxRect = getEditingTextBoxRectForNode(nodeId);
  const verticalMetrics = measureTextVerticalMetrics(ctx, {
    font: textStyle.canvasFontString,
    fontSizePx: textStyle.fontSizePx,
    lineHeightPx: textStyle.lineHeightPx,
  });

  return {
    nodeId,
    role,
    zoom: camera.value.scale,
    canvasDpr: canvasDpr.value,
    windowDevicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : null,
    nodeTextState: {
      plainText: getNodePlainText(node),
      nodeStyleText: cloneDiagnosticValue(node.style?.text ?? null),
      richText,
      lexicalState,
    },
    defaultVisualStyle: cloneDiagnosticValue(defaultVisualStyle),
    effectiveBaseTextStyle: cloneDiagnosticValue(textStyle),
    worldRect: {
      x1: worldRect.x1,
      y1: worldRect.y1,
      x2: worldRect.x2,
      y2: worldRect.y2,
      width: worldRect.x2 - worldRect.x1,
      height: worldRect.y2 - worldRect.y1,
    },
    bodyRect: {
      x1: bodyRect.x1,
      y1: bodyRect.y1,
      x2: bodyRect.x2,
      y2: bodyRect.y2,
      width: bodyRect.x2 - bodyRect.x1,
      height: bodyRect.y2 - bodyRect.y1,
    },
    textBoxRect,
    textLayout: {
      lineCount: textLayout.lineCount,
      contentWidth: textLayout.contentWidth,
      contentHeight: textLayout.contentHeight,
      lineHeight: textLayout.lineHeight,
      lines: [...textLayout.lines],
      richLines: textLayout.richLines.map((line, lineIndex) => ({
        lineIndex,
        align: line.align,
        width: line.width,
        height: line.height,
        text: line.segments.map((segment) => segment.text).join(''),
        segments: line.segments.map((segment, segmentIndex) => ({
          segmentIndex,
          text: segment.text,
          width: segment.width,
          font: segment.font,
          fontSize: segment.fontSize,
          color: segment.color,
          marks: cloneDiagnosticValue(segment.marks ?? null),
        })),
      })),
    },
    textGeometry: cloneDiagnosticValue(textGeometry),
    verticalMetrics: cloneDiagnosticValue(verticalMetrics),
  };
}

function buildEditorTextDiagnostics(nodeId: string) {
  const shellEl = document.querySelector('.lexical-editor-shell');
  const rootEl = document.querySelector('.lexical-editor-root');
  const paragraphEl = rootEl instanceof HTMLElement ? rootEl.querySelector('p') : null;
  const spanEl = rootEl instanceof HTMLElement ? rootEl.querySelector('span') : null;
  const scaledCanvasTopLeadingPx = editingCanvasTopLeadingPx.value * camera.value.scale;
  const domTextTopOffsetPx = editingCalibrationStyle.value ? getDomTextTopOffset(editingCalibrationStyle.value) : null;
  const shellStyle = shellEl instanceof HTMLElement ? window.getComputedStyle(shellEl) : null;
  const shellFontSizePx = shellStyle ? Number.parseFloat(shellStyle.fontSize) : Number.NaN;
  const viewportRect = viewportRef.value?.getBoundingClientRect() ?? null;
  const canvasTextBoxPageTop =
    viewportRect && editingScreenTextBoxRect.value
      ? viewportRect.top + editingScreenTextBoxRect.value.y
      : null;
  const canvasGlyphPageTop =
    canvasTextBoxPageTop == null ? null : canvasTextBoxPageTop + scaledCanvasTopLeadingPx;
  const shellRangeProbe = captureTextRangeDiagnostics(shellEl, shellEl instanceof HTMLElement ? shellEl : null);
  return {
    nodeId,
    zoom: camera.value.scale,
    canvasDpr: canvasDpr.value,
    windowDevicePixelRatio: typeof window !== 'undefined' ? window.devicePixelRatio : null,
    editingSession: cloneDiagnosticValue(editingSession.value),
    editingOverlayRootStyle: cloneDiagnosticValue(editingOverlayRootStyle.value),
    editingEditorShellStyle: cloneDiagnosticValue(editingEditorShellStyle.value),
    editingCalibrationStyle: cloneDiagnosticValue(editingCalibrationStyle.value),
    editingOverlayInnerTranslateYPx: editingOverlayInnerTranslateYPx.value,
    editingCanvasTopLeadingPx: editingCanvasTopLeadingPx.value,
    editingScreenTextBoxRect: cloneDiagnosticValue(editingScreenTextBoxRect.value),
    alignmentProbe: {
      scaledCanvasTopLeadingPx,
      domTextTopOffsetPx,
      topLeadingDeltaPx:
        domTextTopOffsetPx == null ? null : scaledCanvasTopLeadingPx - domTextTopOffsetPx,
      overlayInnerTranslateYPx: editingOverlayInnerTranslateYPx.value,
      canMoveUpWithCurrentLogic:
        domTextTopOffsetPx == null ? null : scaledCanvasTopLeadingPx - domTextTopOffsetPx - 1 >= 0,
      actualDomGlyphOffsetFromShellTop: shellRangeProbe?.offsetFromReferenceTop ?? null,
      estimatedVsActualDomOffsetDeltaPx:
        domTextTopOffsetPx == null || shellRangeProbe?.offsetFromReferenceTop == null
          ? null
          : domTextTopOffsetPx - shellRangeProbe.offsetFromReferenceTop,
      canvasTextBoxPageTop,
      canvasGlyphPageTop,
    },
    fontAvailability: captureFontAvailability(
      shellStyle?.fontFamily ?? null,
      Number.isFinite(shellFontSizePx) ? shellFontSizePx : null
    ),
    editingStateSummary: {
      displayPlainText: getNodePlainText({ textLexical: editingDisplayLexicalState.value }),
      draftPlainText: getNodePlainText({ textLexical: editingDraftLexicalState.value }),
      displayLexical: summarizeLexicalStateDiagnostics(editingDisplayLexicalState.value),
      draftLexical: summarizeLexicalStateDiagnostics(editingDraftLexicalState.value),
      draftRichText: summarizeRichTextDiagnostics(editingDraftRichText.value),
    },
    styleProbes: {
      shell: captureElementTextDiagnostics(shellEl),
      root: captureElementTextDiagnostics(rootEl),
      firstParagraph: captureElementTextDiagnostics(paragraphEl),
      firstSpan: captureElementTextDiagnostics(spanEl),
    },
    textRangeProbe: {
      shell: shellRangeProbe,
      root: captureTextRangeDiagnostics(rootEl, shellEl instanceof HTMLElement ? shellEl : null),
      firstParagraph: captureTextRangeDiagnostics(paragraphEl, shellEl instanceof HTMLElement ? shellEl : null),
      firstSpan: captureTextRangeDiagnostics(spanEl, shellEl instanceof HTMLElement ? shellEl : null),
    },
  };
}

function logTextDiagnostics(label: string, snapshot: unknown) {
  console.groupCollapsed(label);
  console.log('snapshot', snapshot);
  console.log('json', JSON.stringify(snapshot, null, 2));
  console.groupEnd();
}

function dumpCanvasTextDiagnostics(nodeId: string, reason: string) {
  if (!ENABLE_TEXT_ALIGNMENT_DIAGNOSTICS) return;
  const snapshot = buildCanvasTextDiagnostics(nodeId);
  if (!snapshot) return;
  logTextDiagnostics(`[mind-text-diagnostics][canvas][${reason}] ${nodeId}`, snapshot);
}

function dumpEditorTextDiagnostics(nodeId: string, reason: string) {
  if (!ENABLE_TEXT_ALIGNMENT_DIAGNOSTICS || typeof document === 'undefined') return;
  logTextDiagnostics(`[mind-text-diagnostics][editor][${reason}] ${nodeId}`, buildEditorTextDiagnostics(nodeId));
}

let editingRelayoutRafId: number | null = null;
let editingCaretFollowRafId: number | null = null;
let editingLayoutSyncRafId: number | null = null;
let editingRelayoutCount = 0;
let editingTextLayoutCache = new Map<string, ReturnType<typeof measureNodeTextLayout>>();

function clearEditingCaretFollow() {
  if (editingCaretFollowRafId != null) cancelAnimationFrame(editingCaretFollowRafId);
  editingCaretFollowRafId = null;
}

function scheduleEditingCaretFollow(paddingPx = 40, remainingAttempts = 3) {
  clearEditingCaretFollow();
  const run = () => {
    editingCaretFollowRafId = requestAnimationFrame(() => {
      editingCaretFollowRafId = null;
      void nextTick().then(() => {
        if (!editingSession.value) return;
        ensureEditingCaretVisible(paddingPx);
        if (remainingAttempts <= 1 || !isEditingCaretOutsideViewport(paddingPx)) return;
        remainingAttempts -= 1;
        run();
      });
    });
  };
  run();
}

function scheduleEditingLayoutSync() {
  if (editingLayoutSyncRafId != null) return;
  editingLayoutSyncRafId = requestAnimationFrame(() => {
    editingLayoutSyncRafId = null;
    const nodeId = editingSession.value?.nodeId;
    if (!nodeId) return;
    const previousWorldBoxes = worldBoxes.value;
    invalidateSubtreeHeightCache([nodeId, ...collectAncestorNodeIds(nodeId)]);
    rebuildLayout({ preserveSubtreeHeightCache: true });
    const nextWorldBoxes = buildWorldBoxes(props.doc, layoutLocal);
    worldBoxes.value = nextWorldBoxes;
    const changedNodeIds: string[] = [];
    for (const [changedNodeId, nextRect] of nextWorldBoxes.entries()) {
      if (!isSameWorldRect(previousWorldBoxes.get(changedNodeId), nextRect)) changedNodeIds.push(changedNodeId);
    }
    if (changedNodeIds.length) {
      spatialIndex.updateMany(nextWorldBoxes, changedNodeIds);
      const nodes = getMindNodes();
      const affectedParents = new Map<string, string>();
      changedNodeIds.forEach((changedNodeId) => {
        if (nodes?.[changedNodeId]?.children?.length) {
          const rootId = resolveRootNodeId(changedNodeId);
          if (rootId) affectedParents.set(changedNodeId, rootId);
        }
        const parentInfo = parentIndexByNodeId.value.get(changedNodeId);
        if (!parentInfo?.parentId) return;
        const rootId = resolveRootNodeId(parentInfo.parentId);
        if (rootId) affectedParents.set(parentInfo.parentId, rootId);
      });
      rebuildEdgeCache(props.doc, nextWorldBoxes, {
        previousWorldBoxes,
        affectedParents: Array.from(affectedParents.entries()).map(([parentId, rootId]) => ({ parentId, rootId })),
      });
    }
    const nextNodeRect = nextWorldBoxes.get(nodeId);
    if (editingWidthPreview.value?.nodeId === nodeId && nextNodeRect) {
      editingWidthPreview.value = {
        ...editingWidthPreview.value,
        baseNodeWidth: nextNodeRect.x2 - nextNodeRect.x1,
        deltaX: 0,
      };
    }
    requestRender();
  });
}

function syncEditingPreviewWidthOnly(nodeId: string, previousWidth: number, nextWidth: number) {
  void previousWidth;
  const preview = editingWidthPreview.value;
  if (!preview || preview.nodeId !== nodeId) return;
  const nextDeltaX = nextWidth - preview.baseNodeWidth;
  if (preview.deltaX === nextDeltaX) return;
  editingWidthPreview.value = {
    ...preview,
    deltaX: nextDeltaX,
  };
}

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
  const liveRichText = editingDraftRichText.value;
  const measuredLayout = measureNodeTextLayout(ctx, liveRichText, editingTextLayoutCache, {
    maxWidth: NODE_TEXT_MAX_WIDTH_PX,
    baseStyle: textStyle,
    minContentWidth: getNodeMinimumContentWidth(node, liveRichText, image),
  });
  const textGeometry = computeNodeTextGeometry(ctx, measuredLayout, textStyle, image);
  const markerRow = measureNodeMarkerRow(node);
  const minNodeWidth = getNodeMinimumWidth(node, liveRichText, image);
  const previousPreview = editingPreview.value?.nodeId === session.nodeId ? editingPreview.value : null;
  let computedNodeW = clampNodeDimension(
    Math.max(Math.max(measuredLayout.contentWidth, image?.width ?? 0) + NODE_PADDING_X, markerRow.width),
    Math.max(minNodeWidth, markerRow.width),
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
    measuredTextW: measuredLayout.contentWidth,
    measuredTextH: measuredLayout.contentHeight,
    computedNodeW,
    computedNodeH,
    lineCount: measuredLayout.lineCount,
    textLineBoxTop: textGeometry.textLineBoxTop,
    textLineBoxHeight: textGeometry.textLineBoxHeight,
  };
  editingRelayoutCount += 1;
  const lineCountChanged = !!previousPreview && previousPreview.lineCount !== measuredLayout.lineCount;
  const widthChanged = !previousPreview || previousPreview.computedNodeW !== computedNodeW;
  const heightChanged = !previousPreview || previousPreview.computedNodeH !== computedNodeH;
  const canUseWidthOnlyPreview = !Array.isArray(node.children) || node.children.length === 0;
  if (widthChanged && !heightChanged && previousPreview && canUseWidthOnlyPreview) {
    syncEditingPreviewWidthOnly(session.nodeId, previousPreview.computedNodeW, computedNodeW);
  } else if (widthChanged || heightChanged) {
    scheduleEditingLayoutSync();
  }
  requestRender();
  if (lineCountChanged || widthChanged) {
    scheduleEditingCaretFollow(40);
  }
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
  if (editingLayoutSyncRafId != null) cancelAnimationFrame(editingLayoutSyncRafId);
  editingLayoutSyncRafId = null;
  clearEditingCaretFollow();
  editingTextLayoutCache = new Map();
  if (!editingPreview.value) return;
  editingPreview.value = null;
  requestRender();
}

function startEditing(
  nodeId: string,
  options?: {
    mode?: 'append' | 'replace';
    insertedText?: string;
    caretPlacement?: 'start' | 'end' | 'none';
    shouldFocusEditor?: boolean;
  }
) {
  clearImageInteraction('start-text-editing');
  const node = getNodeById(nodeId);
  if (!node) return;
  const mode = options?.mode ?? 'append';
  const insertedText = options?.insertedText ?? '';
  const caretPlacement = options?.caretPlacement ?? 'end';
  const shouldFocusEditor = options?.shouldFocusEditor ?? true;
  const beforeRichText = cloneRichText(getNodeRichText(node));
  const beforeLexicalState = cloneLexicalState(getNodeLexicalState(node));
  editingTextLayoutCache = new Map();
  const nextLexicalState =
    mode === 'replace'
      ? lexicalStateFromPlainText(insertedText)
      : createEditingLexicalStateForNode(props.doc, node, nodeId, beforeRichText);
  const nextRichText = cloneRichText(
    createPersistedRichTextForNode(
      props.doc,
      node,
      nodeId,
      richTextFromLexicalState(nextLexicalState)
    )
  );
  const displayLexicalState = convertLexicalStateFontSizesToRelativeEm(
    nextLexicalState,
    Math.max(1, getNodeTextStyle(node, { doc: props.doc, nodeId }).fontSizePx)
  );
  const currentRect = worldBoxes.value.get(nodeId);
  const initialTextBoxRect = currentRect
    ? (() => {
      const bodyRect = getNodeBodyWorldRect(node, currentRect);
      return {
        x: bodyRect.x1 + NODE_TEXT_INSET_X,
        y: bodyRect.y1 + NODE_TEXT_INSET_Y,
        width: Math.max(1, bodyRect.x2 - bodyRect.x1 - NODE_TEXT_INSET_X * 2),
        height: Math.max(1, bodyRect.y2 - bodyRect.y1 - NODE_TEXT_INSET_Y * 2),
      };
    })()
    : null;
  if (currentRect) ensureNodeVisible(nodeId);
  dumpCanvasTextDiagnostics(nodeId, 'start-editing-before-dom');
  editingSession.value = {
    nodeId,
    initialLexicalState: beforeLexicalState,
    initialRichText: beforeRichText,
    mode,
    caretPlacement,
  };
  editingDraftLexicalState.value = nextLexicalState;
  editingDraftRichText.value = nextRichText;
  editingDisplayLexicalState.value = displayLexicalState;
  editingNodeId.value = nodeId;
  startLexicalEditingSession(nodeId, displayLexicalState, mode, caretPlacement, shouldFocusEditor);
  const nodes = getMindNodes();
  const editingSubtreeNodeIds = nodes ? collectSubtreeNodeIds(nodes, nodeId) : [];
  editingPreview.value = currentRect
    ? {
      nodeId,
      measuredTextW: Math.max(1, currentRect.x2 - currentRect.x1 - NODE_PADDING_X),
      measuredTextH: Math.max(NODE_LINE_HEIGHT, currentRect.y2 - currentRect.y1 - NODE_TEXT_INSET_Y * 2),
      computedNodeW: Math.ceil(currentRect.x2 - currentRect.x1),
      computedNodeH: Math.ceil(currentRect.y2 - currentRect.y1),
      lineCount: 1,
      textLineBoxTop: initialTextBoxRect
        ? Math.max(0, initialTextBoxRect.y - getNodeBodyWorldRect(node, currentRect).y1)
        : NODE_TEXT_INSET_Y,
      textLineBoxHeight: initialTextBoxRect?.height ?? Math.max(NODE_LINE_HEIGHT, currentRect.y2 - currentRect.y1 - NODE_TEXT_INSET_Y * 2),
    }
    : null;
  editingWidthPreview.value = currentRect && nodes
    ? {
      nodeId,
      baseNodeWidth: Math.ceil(currentRect.x2 - currentRect.x1),
      deltaX: 0,
      subtreeNodeIds: new Set(editingSubtreeNodeIds),
      affectedParentIds: new Set(
        editingSubtreeNodeIds.filter((subtreeNodeId) =>
          Array.isArray(nodes[subtreeNodeId]?.children) && nodes[subtreeNodeId].children.length > 0
        )
      ),
    }
    : null;
  requestRender();
  if (DEBUG_CANVAS_OVERLAY) console.debug('[mind-start-editing]', { nodeId, mode });
  void nextTick().then(() => {
    if (caretPlacement !== 'none') scheduleEditingCaretFollow(40, 5);
    requestAnimationFrame(() => {
      const operationProbe = getActiveMindPerfOperationProbe();
      if (operationProbe && operationProbe.finishMode === 'edit-ready' && operationProbe.targetNodeId === nodeId) {
        finishMindPerfOperationProbe(operationProbe, 'edit-ready', {
          mode,
        });
      }
      if (editingSession.value?.nodeId !== nodeId) return;
      dumpEditorTextDiagnostics(nodeId, `start-editing-${mode}`);
    });
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
  isComposing.value = false;
  clearPendingDirectTypeSeed();
  editingSession.value = null;
  editingDraftLexicalState.value = getNodeLexicalState(null);
  editingDraftRichText.value = getNodeRichText(null);
  editingDisplayLexicalState.value = getNodeLexicalState(null);
  editingWidthPreview.value = null;
  editingNodeId.value = null;
  lexicalEditorManager.stopSession();
  clearEditingPreviewLayout();
  if (hasSelectedNodes.value) syncStylePanelFromSelection();
  else resetTextToggleState();
  focusViewportWithoutScroll();
  void nextTick().then(() => focusViewportWithoutScroll());
}

function commitEditingSession() {
  const session = editingSession.value;
  if (!session) return;
  const node = getNodeById(session.nodeId);
  if (!node) {
    stopEditingSession();
    return;
  }
  const freshestLexicalState = lexicalEditorManager.latestState.value ?? editingDraftLexicalState.value;
  const afterLexicalState = convertLexicalStateRelativeEmToPx(freshestLexicalState, editingBaseFontSizePx.value);
  const afterRichText = createPersistedRichTextForNode(
    props.doc,
    node,
    session.nodeId,
    richTextFromLexicalState(afterLexicalState)
  );
  if (isRichTextEqual(afterRichText, session.initialRichText)) {
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
        beforeRichText: getNodeRichText(node),
        afterRichText,
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
  const nextState = convertLexicalStateRelativeEmToPx(state, editingBaseFontSizePx.value);
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  editingDraftRichText.value = cloneRichText(
    createPersistedRichTextForNode(
      props.doc,
      node,
      session?.nodeId ?? null,
      richTextFromLexicalState(nextState)
    )
  );
  textToggleState.value = {
    bold: getActiveLexicalToggleState('bold'),
    italic: getActiveLexicalToggleState('italic'),
    underline: getActiveLexicalToggleState('underline'),
    strike: getActiveLexicalToggleState('strike'),
  };
  if (isLexicalStateEqual(nextState, editingDraftLexicalState.value)) return;
  editingDraftLexicalState.value = nextState;
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
  const layoutInvalidationNodeIds = [...pendingLayoutInvalidationNodeIds];
  const addedNodeInfos = [...pendingAddedNodeInfos];
  const removedNodeIds = [...pendingRemovedNodeIds];
  const hiddenNodeIds = [...pendingHiddenNodeIds];
  const touchedParentIds = [...pendingTouchedParentIds];
  const reuseDescendantCounts = pendingReuseDescendantCounts;
  const reuseParentIndex = pendingReuseParentIndex;
  const forceFullEdgeRebuild = pendingForceFullEdgeRebuild;
  const trustExistingNodeMeasureCache = pendingTrustExistingNodeMeasureCache;
  const useLayoutChangedNodeIds = pendingUseLayoutChangedNodeIds;
  pendingMutationEnsureVisibleNodeIds = new Set();
  pendingMutationResolvers = [];
  pendingMutationReason = 'mutation';
  pendingMutationShouldMarkDirty = false;
  pendingLayoutInvalidationNodeIds = new Set();
  pendingAddedNodeInfos = [];
  pendingRemovedNodeIds = new Set();
  pendingHiddenNodeIds = new Set();
  pendingTouchedParentIds = new Set();
  pendingReuseDescendantCounts = false;
  pendingReuseParentIndex = false;
  pendingForceFullEdgeRebuild = false;
  pendingTrustExistingNodeMeasureCache = false;
  pendingUseLayoutChangedNodeIds = false;

  const perfProbe = getActiveMindPerfProbe();
  const shouldProfileProbeFlush = !!perfProbe && perfProbe.mutationReason === reason;
  const flushStartedAt = shouldProfileProbeFlush ? performance.now() : 0;
  if (perfProbe && shouldProfileProbeFlush) {
    perfProbe.flushStartedAt = flushStartedAt;
    perfProbe.mutationQueueDelayMs = flushStartedAt - (perfProbe.mutationQueuedAt ?? perfProbe.startedAt);
    pushMindPerfAnchor(perfProbe, 'mutation-flush-start', {
      reason,
      queueDelayMs: roundPerfMs(perfProbe.mutationQueueDelayMs),
      ensureVisibleCount: ensureVisibleNodeIds.length,
      invalidateCount: layoutInvalidationNodeIds.length,
      addedNodeCount: addedNodeInfos.length,
    });
  }

  editorDebugState.value.rebuildCountInLastCommand += 1;
  const metrics = await redrawAllInternal(reason, {
    restoreViewport: false,
    preserveSubtreeHeightCache: layoutInvalidationNodeIds.length > 0,
    invalidateSubtreeHeightNodeIds: layoutInvalidationNodeIds,
    addedNodeInfos,
    removedNodeIds,
    hiddenNodeIds,
    touchedParentIds,
    reuseDescendantCounts,
    reuseParentIndex,
    forceFullEdgeRebuild,
    trustExistingNodeMeasureCache,
    useLayoutChangedNodeIds,
  });
  const ensureVisibleStartedAt = performance.now();
  if (ensureVisibleNodeIds.length) ensureNodesVisible(ensureVisibleNodeIds);
  const ensureVisibleMs = performance.now() - ensureVisibleStartedAt;
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

  if (perfProbe && shouldProfileProbeFlush) {
    perfProbe.nodeCountAfter = getMindPerfNodeCount();
    perfProbe.flushTotalMs = performance.now() - flushStartedAt;
    perfProbe.totalMs = performance.now() - perfProbe.startedAt;
    if (perfProbe.op === 'drag-node' && perfProbe.releaseStartedAt != null) {
      perfProbe.releaseToDropRenderedMs = performance.now() - perfProbe.releaseStartedAt;
    }
    perfProbe.redrawTotalMs = metrics.totalMs;
    perfProbe.layoutRebuildMs = metrics.layoutRebuildMs;
    perfProbe.layoutMeasureMs = metrics.layoutMeasureMs;
    perfProbe.layoutMeasureCalls = metrics.layoutMeasureCalls;
    perfProbe.layoutMeasureCacheHits = metrics.layoutMeasureCacheHits;
    perfProbe.layoutSubtreeMs = metrics.layoutSubtreeMs;
    perfProbe.layoutSubtreeCalls = metrics.layoutSubtreeCalls;
    perfProbe.layoutSubtreeCacheHits = metrics.layoutSubtreeCacheHits;
    perfProbe.layoutPlaceMs = metrics.layoutPlaceMs;
    perfProbe.layoutPlaceCalls = metrics.layoutPlaceCalls;
    perfProbe.worldBoxesBuildMs = metrics.worldBoxesBuildMs;
    perfProbe.parentIndexBuildMs = metrics.parentIndexBuildMs;
    perfProbe.changedNodeScanMs = metrics.changedNodeScanMs;
    perfProbe.changedNodeCount = metrics.changedNodeCount;
    perfProbe.descendantCountsMs = metrics.descendantCountsMs;
    perfProbe.spatialIndexMs = metrics.spatialIndexMs;
    perfProbe.edgeCacheMs = metrics.edgeCacheMs;
    perfProbe.edgeAffectedParentCount = metrics.edgeAffectedParentCount;
    perfProbe.edgeTranslatedParentCount = metrics.edgeTranslatedParentCount;
    perfProbe.edgesRebuildMs = metrics.edgesRebuildMs;
    perfProbe.drawMs = metrics.drawMs;
    perfProbe.ensureVisibleMs = ensureVisibleMs;
    perfProbe.finishedReason = reason;
    pushMindPerfAnchor(perfProbe, 'mutation-flush-end', {
      flushTotalMs: roundPerfMs(perfProbe.flushTotalMs),
      totalMs: roundPerfMs(perfProbe.totalMs),
      redrawTotalMs: roundPerfMs(perfProbe.redrawTotalMs),
      nodeCountAfter: perfProbe.nodeCountAfter,
    });
  }

  const operationProbe = getActiveMindPerfOperationProbe();
  if (
    operationProbe &&
    operationProbe.finishMode === 'flush' &&
    (!operationProbe.mutationReason || operationProbe.mutationReason === reason)
  ) {
    finishMindPerfOperationProbe(operationProbe, 'flush');
  }

  resolvers.forEach((resolve) => resolve());
  if (perfProbe && shouldProfileProbeFlush) finishMindPerfProbe(perfProbe);
}

async function applyDocumentMutation(
  reason: string,
    options?: {
      ensureVisibleNodeId?: string | null;
      ensureVisibleNodeIds?: string[];
      markDirty?: boolean;
      invalidateSubtreeHeightNodeIds?: string[];
      addedNodeInfo?: { nodeId: string; parentId: string | null };
      removedNodeIds?: string[];
      hiddenNodeIds?: string[];
      touchedParentIds?: string[];
      reuseDescendantCounts?: boolean;
      reuseParentIndex?: boolean;
      forceFullEdgeRebuild?: boolean;
      trustExistingNodeMeasureCache?: boolean;
      useLayoutChangedNodeIds?: boolean;
  }
) {
  const releaseDocWatchSuppression = holdLocalDocWatchSuppression();
  pendingMutationReason = reason;
  pendingMutationShouldMarkDirty = pendingMutationShouldMarkDirty || options?.markDirty !== false;
  queueEnsureVisibleNodeIds(options?.ensureVisibleNodeIds);
  queueEnsureVisibleNodeIds(options?.ensureVisibleNodeId ? [options.ensureVisibleNodeId] : []);
  if (options?.invalidateSubtreeHeightNodeIds?.length) {
    options.invalidateSubtreeHeightNodeIds.forEach((nodeId) => {
      if (nodeId) pendingLayoutInvalidationNodeIds.add(nodeId);
    });
  }
  if (options?.addedNodeInfo?.nodeId) {
    pendingAddedNodeInfos.push(options.addedNodeInfo);
  }
  if (options?.removedNodeIds?.length) {
    options.removedNodeIds.forEach((nodeId) => {
      if (nodeId) pendingRemovedNodeIds.add(nodeId);
    });
  }
  if (options?.hiddenNodeIds?.length) {
    options.hiddenNodeIds.forEach((nodeId) => {
      if (nodeId) pendingHiddenNodeIds.add(nodeId);
    });
  }
  if (options?.touchedParentIds?.length) {
    options.touchedParentIds.forEach((parentId) => {
      if (parentId) pendingTouchedParentIds.add(parentId);
    });
  }
  pendingReuseDescendantCounts = pendingReuseDescendantCounts || !!options?.reuseDescendantCounts;
  pendingReuseParentIndex = pendingReuseParentIndex || !!options?.reuseParentIndex;
  pendingForceFullEdgeRebuild = pendingForceFullEdgeRebuild || !!options?.forceFullEdgeRebuild;
  pendingTrustExistingNodeMeasureCache = pendingTrustExistingNodeMeasureCache || !!options?.trustExistingNodeMeasureCache;
  pendingUseLayoutChangedNodeIds = pendingUseLayoutChangedNodeIds || !!options?.useLayoutChangedNodeIds;
  noteMindPerfMutationQueued(reason, {
    ensureVisibleCount: options?.ensureVisibleNodeId ? 1 : options?.ensureVisibleNodeIds?.length ?? 0,
    invalidateCount: options?.invalidateSubtreeHeightNodeIds?.length ?? 0,
    addedNodeCount: options?.addedNodeInfo?.nodeId ? 1 : 0,
  });
  noteMindPerfOperationMutationQueued(reason);

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

function resolveNewChildRole(parentId: string | null | undefined): MindNodeRole {
  if (!parentId) return 'default';
  return getMindNodeRole(props.doc, parentId) === 'root' ? 'secondary' : 'default';
}

function createNodeRecord(nodeId: string, initialText = NEW_NODE_TEXT, role: MindNodeRole = 'default') {
  const lexicalState = lexicalStateFromPlainText(initialText);
  return {
    id: nodeId,
    text: { plain: initialText },
    richText: richTextFromLexicalState(lexicalState),
    textLexical: lexicalState,
    style: createInitialNodeStyleForRole(role),
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

const { saveDocument, saveDocumentAs } = useSaveFlow({
  getDoc: () => props.doc,
  getDocId: () => props.docId,
  getFilePath: () => props.filePath ?? null,
  getDocumentTitleForSave,
  clearPersistTimer,
  hasEditingSession: () => !!editingSession.value,
  commitEditingSession,
  flushPendingDocumentMutation,
  writeViewportToDoc,
  emitFilePathChange: (value) => emit('filePathChange', value),
  emitSaveState,
  isSaving,
  saveError,
  contentRevision,
  lastSavedContentRevision,
});

function getDocumentTitleForExport() {
  const manifestTitle = typeof props.doc?.manifest?.title === 'string' ? props.doc.manifest.title.trim() : '';
  return manifestTitle || getDocumentTitleForSave() || '思维导图';
}

function getExportXmindBaseName() {
  return getDocumentTitleForExport()
    .replace(/\s+/g, '')
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, '')
    .trim() || '思维导图';
}

async function exportXmind() {
  if (!props.doc || !props.docId || isSaving.value) return false;
  try {
    clearPersistTimer();
    if (editingSession.value) commitEditingSession();
    await flushPendingDocumentMutation();
    ensureMultiMindDoc(props.doc);
    writeViewportToDoc();
    const plain = toPlainDoc(props.doc);
    await window.electronAPI.amind.docUpdate({ docId: props.docId, doc: plain });
    const defaultPath = `${getExportXmindBaseName()}.xmind`;
    const thumbnailBytes = await exportMindPreviewPng(plain).catch(() => null);
    const result = await window.electronAPI.amind.exportXmindDialog({
      docId: props.docId,
      defaultPath,
      thumbnailBytes: thumbnailBytes ?? undefined,
    });
    return !!result?.filePath;
  } catch (error) {
    console.error('[mind-export-xmind]', error);
    const title = error instanceof Error ? error.message : '导出 XMind 失败';
    window.$toast({ title, type: 'error' });
    return false;
  }
}

async function switchMindBoard(boardId: string) {
  if (!props.doc) return false;
  const activeBoardId = getActiveMind(props.doc)?.id ?? null;
  if (!boardId || boardId === activeBoardId) return true;

  if (editingSession.value) commitEditingSession();
  clearPersistTimer();
  writeViewportToDoc();
  clearImageInteraction('switch-mind-board');
  clearDragTransient('switch-mind-board');
  clearMarqueeTransient('switch-mind-board');
  resetInteractionToIdle('switch-mind-board');
  hoverNodeId.value = null;
  collapseTagHoverNodeId.value = null;
  collapseTagStickyNodeId.value = null;
  setSelection([], null);

  const releaseDocWatchSuppression = holdLocalDocWatchSuppression();
  const switched = setActiveMindId(props.doc, boardId);
  if (!switched) {
    releaseDocWatchSuppression();
    return false;
  }

  markContentDirty();
  emitSaveState();
  try {
    await redrawAllInternal('switch-mind-board', { restoreViewport: true });
  } finally {
    releaseDocWatchSuppression();
  }
  emitNodeCountState();
  syncStylePanelFromSelection();
  requestRender();
  return true;
}

async function renameMindBoard(boardId: string, title: string) {
  if (!props.doc) return false;
  ensureMultiMindDoc(props.doc);
  const board = props.doc?.mind?.minds?.[boardId];
  const normalizedTitle = title.trim();
  if (!board || !normalizedTitle) return false;
  if (board.title === normalizedTitle) return true;
  board.title = normalizedTitle;
  await applyDocumentMutation('mind-board-rename');
  return await saveDocument();
}

defineExpose({
  saveDocument,
  saveDocumentAs,
  exportXmind,
  switchMindBoard,
  renameMindBoard,
});

function findParentAndIndex(nodeId: string) {
  return parentIndexByNodeId.value.get(nodeId) ?? null;
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
  const nextParentIndex = parentIndexByNodeId.value;
  const rootNodeId = getRootNodeId();
  const uniqueIds = Array.from(new Set(nodeIds)).filter((nodeId) => !!nodes[nodeId] && nodeId !== rootNodeId);
  if (!uniqueIds.length) {
    return { finalTargets: [], rootId: null, invalidReason: 'rootNotDraggable', filteredOutDescendantsCount: 0 };
  }
  if (uniqueIds.length === 1) {
    const onlyTarget = getCachedSelectionTargetInfo(uniqueIds[0], nextParentIndex);
    const onlyRootId = resolveRootNodeId(uniqueIds[0], nextParentIndex);
    if (!onlyTarget || !onlyRootId) {
      return { finalTargets: [], rootId: null, invalidReason: 'rootNotDraggable', filteredOutDescendantsCount: 0 };
    }
    return {
      finalTargets: [onlyTarget],
      rootId: onlyRootId,
      invalidReason: null,
      filteredOutDescendantsCount: 0,
    };
  }

  const candidateSet = new Set(uniqueIds);
  const filteredIds: string[] = [];
  let filteredOutDescendantsCount = 0;
  for (const nodeId of uniqueIds) {
    let currentId = nextParentIndex.get(nodeId)?.parentId ?? null;
    let shouldFilterOut = false;
    while (currentId) {
      if (candidateSet.has(currentId)) {
        shouldFilterOut = true;
        break;
      }
      currentId = nextParentIndex.get(currentId)?.parentId ?? null;
    }
    if (shouldFilterOut) {
      filteredOutDescendantsCount += 1;
      continue;
    }
    filteredIds.push(nodeId);
  }

  const finalTargets = filteredIds
    .map((nodeId) => getCachedSelectionTargetInfo(nodeId, nextParentIndex))
    .filter((value): value is NonNullable<ReturnType<typeof getCachedSelectionTargetInfo>> => !!value)
    .sort(compareSelectionTargetInfo);

  const rootIds = Array.from(new Set(finalTargets.map((target) => resolveRootNodeId(target.nodeId, nextParentIndex)).filter(Boolean)));
  if (!finalTargets.length) {
    return { finalTargets: [], rootId: null, invalidReason: 'rootNotDraggable', filteredOutDescendantsCount };
  }
  if (rootIds.length !== 1) {
    return { finalTargets: [], rootId: null, invalidReason: 'crossRoot', filteredOutDescendantsCount };
  }
  return {
    finalTargets,
    rootId: rootIds[0] ?? null,
    invalidReason: null,
    filteredOutDescendantsCount,
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

function cancelPendingDragBootstrap() {
  if (dragOverlayBootstrapRafId != null) cancelAnimationFrame(dragOverlayBootstrapRafId);
  dragOverlayBootstrapRafId = null;
  if (dragSubtreeWarmupTimer != null) clearTimeout(dragSubtreeWarmupTimer);
  dragSubtreeWarmupTimer = null;
}

function isSameOrderedNodeIds(a: string[], b: string[]) {
  return a.length === b.length && a.every((nodeId, index) => nodeId === b[index]);
}

function isNodeInsideDraggedTree(nodeId: string, currentDrag: DragDropState, dragRootIdSet: Set<string>) {
  if (currentDrag.draggedSubtreeNodeIds.has(nodeId) || dragRootIdSet.has(nodeId)) return true;
  let currentId: string | null = nodeId;
  while (currentId) {
    const parentInfo = findParentAndIndex(currentId);
    if (!parentInfo) return false;
    if (dragRootIdSet.has(parentInfo.parentId)) return true;
    if (currentDrag.draggedSubtreeNodeIds.has(parentInfo.parentId)) return true;
    currentId = parentInfo.parentId;
  }
  return false;
}

function scheduleDragBootstrap(dragRoots: string[]) {
  const scheduledProbe = getActiveMindPerfProbe();
  const scheduledDragProbeId = scheduledProbe?.op === 'drag-node' ? scheduledProbe.id : null;
  const bootstrapQueuedAt = scheduledDragProbeId != null ? performance.now() : 0;
  cancelPendingDragBootstrap();
  dragOverlayBootstrapRafId = requestAnimationFrame(() => {
    dragOverlayBootstrapRafId = null;
    if (!dragState.value.isDragging || !isSameOrderedNodeIds(dragState.value.dragRoots, dragRoots)) return;

    const activeProbe = getActiveMindPerfProbe();
    const bootstrapProbe =
      activeProbe && activeProbe.id === scheduledDragProbeId && activeProbe.op === 'drag-node' ? activeProbe : null;
    if (bootstrapProbe) {
      bootstrapProbe.bootstrapRafDelayMs = performance.now() - bootstrapQueuedAt;
    }

    const textLayoutStartedAt = performance.now();
    const dragRootTextLayouts = dragRoots.map((nodeId) => getDragOverlayTextLayout(nodeId, getNodeLabel(nodeId)));
    const bootstrapTextLayoutMs = performance.now() - textLayoutStartedAt;
    setDragState({
      dragRootTextLayouts,
    });
    if (bootstrapProbe) {
      bootstrapProbe.bootstrapTextLayoutMs = bootstrapTextLayoutMs;
      pushMindPerfAnchor(bootstrapProbe, 'drag-bootstrap-ready', {
        bootstrapRafDelayMs: roundPerfMs(bootstrapProbe.bootstrapRafDelayMs),
        bootstrapTextLayoutMs: roundPerfMs(bootstrapTextLayoutMs),
        dragRootCount: dragRoots.length,
      });
    }

    updateDragDropTarget(dragState.value.cursorScreenX, dragState.value.cursorScreenY);

    const subtreeWarmupQueuedAt = performance.now();
    dragSubtreeWarmupTimer = window.setTimeout(() => {
      dragSubtreeWarmupTimer = null;
      if (!dragState.value.isDragging || !isSameOrderedNodeIds(dragState.value.dragRoots, dragRoots)) return;
      const subtreeWarmupStartedAt = performance.now();
      const draggedSubtreeNodeIds = collectDraggedSubtreeIds(dragRoots);
      const subtreeWarmupMs = performance.now() - subtreeWarmupStartedAt;
      setDragState({
        draggedSubtreeNodeIds,
      });
      const warmupProbe = getActiveMindPerfProbe();
      if (warmupProbe && warmupProbe.id === scheduledDragProbeId && warmupProbe.op === 'drag-node') {
        warmupProbe.subtreeWarmupDelayMs = subtreeWarmupStartedAt - subtreeWarmupQueuedAt;
        warmupProbe.subtreeWarmupMs = subtreeWarmupMs;
        pushMindPerfAnchor(warmupProbe, 'drag-subtree-warmup', {
          subtreeWarmupDelayMs: roundPerfMs(warmupProbe.subtreeWarmupDelayMs),
          subtreeWarmupMs: roundPerfMs(subtreeWarmupMs),
          draggedSubtreeNodeCount: draggedSubtreeNodeIds.size,
        });
      }
      requestRender();
    }, 0);
  });
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
  const dragRootIdSet = new Set(currentDrag.dragRoots);

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
    if (isNodeInsideDraggedTree(nodeId, currentDrag, dragRootIdSet)) {
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
      if (isNodeInsideDraggedTree(parentInfo.parentId, currentDrag, dragRootIdSet)) {
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
      if (isNodeInsideDraggedTree(parentInfo.parentId, currentDrag, dragRootIdSet)) {
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
  const probe = getActiveMindPerfProbe();
  const resolveStartedAt = probe?.op === 'drag-node' ? performance.now() : 0;
  const { target, invalidReason } = resolveDropTarget(screenX, screenY);
  if (probe?.op === 'drag-node') {
    noteDragDropResolve(performance.now() - resolveStartedAt, {
      targetType: target?.type ?? null,
      invalidReason,
    });
  }
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
  const activeProbe = getActiveMindPerfProbe();
  const dragProbe = activeProbe?.op === 'drag-node' ? activeProbe : null;
  const nodes = getMindNodes();
  if (!nodes) return { command: null, reason: 'missingNodes', changed: false, beforeHash: null, afterHash: null };
  const movingRootIds = dragState.value.dragRoots;
  if (!movingRootIds.length) return { command: null, reason: 'pointerStateLost', changed: false, beforeHash: null, afterHash: null };

  const sourceInfosStartedAt = dragProbe ? performance.now() : 0;
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
  const buildMoveSourceInfosMs = dragProbe ? performance.now() - sourceInfosStartedAt : 0;
  if (!sourceInfos.length) return { command: null, reason: 'pointerStateLost', changed: false, beforeHash: null, afterHash: null };

  const parentSnapshotStartedAt = dragProbe ? performance.now() : 0;
  const affectedParentIds = Array.from(new Set([...sourceInfos.map((info) => info.fromParentId), dropTarget.toParentId]));
  const invalidateSubtreeHeightNodeIds = Array.from(
    new Set(affectedParentIds.flatMap((parentId) => collectAncestorNodeIds(parentId)))
  );
  const beforeChildrenByParent = Object.fromEntries(
    affectedParentIds.map((parentId) => [parentId, [...(Array.isArray(nodes[parentId]?.children) ? nodes[parentId].children : [])]])
  );
  const afterChildrenByParent = Object.fromEntries(
    affectedParentIds.map((parentId) => [parentId, [...beforeChildrenByParent[parentId]]])
  ) as Record<string, string[]>;
  const buildMoveParentSnapshotMs = dragProbe ? performance.now() - parentSnapshotStartedAt : 0;
  const affectedChildrenCounts = affectedParentIds.map((parentId) => beforeChildrenByParent[parentId]?.length ?? 0);
  const buildMoveAffectedChildrenTotal = affectedChildrenCounts.reduce((sum, count) => sum + count, 0);
  const buildMoveMaxChildrenCount = affectedChildrenCounts.length ? Math.max(...affectedChildrenCounts) : 0;

  const applyStartedAt = dragProbe ? performance.now() : 0;
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
  const buildMoveApplyMs = dragProbe ? performance.now() - applyStartedAt : 0;

  const changedCheckStartedAt = dragProbe ? performance.now() : 0;
  const changed = affectedParentIds.some((parentId) => {
    const before = beforeChildrenByParent[parentId];
    const after = afterChildrenByParent[parentId];
    return before.length !== after.length || before.some((value, index) => after[index] !== value);
  });
  const buildMoveChangedCheckMs = dragProbe ? performance.now() - changedCheckStartedAt : 0;
  const hashStartedAt = dragProbe ? performance.now() : 0;
  const beforeHash = hashChildrenMap(beforeChildrenByParent);
  const afterHash = hashChildrenMap(afterChildrenByParent);
  const buildMoveHashMs = dragProbe ? performance.now() - hashStartedAt : 0;
  if (dragProbe) {
    dragProbe.buildMoveSourceInfosMs = buildMoveSourceInfosMs;
    dragProbe.buildMoveParentSnapshotMs = buildMoveParentSnapshotMs;
    dragProbe.buildMoveApplyMs = buildMoveApplyMs;
    dragProbe.buildMoveChangedCheckMs = buildMoveChangedCheckMs;
    dragProbe.buildMoveHashMs = buildMoveHashMs;
    dragProbe.buildMoveAffectedParentCount = affectedParentIds.length;
    dragProbe.buildMoveAffectedChildrenTotal = buildMoveAffectedChildrenTotal;
    dragProbe.buildMoveMaxChildrenCount = buildMoveMaxChildrenCount;
  }
  if (!changed) {
    if (dragProbe) {
      pushMindPerfAnchor(dragProbe, 'build-move-command-breakdown', {
        buildMoveSourceInfosMs: roundPerfMs(buildMoveSourceInfosMs),
        buildMoveParentSnapshotMs: roundPerfMs(buildMoveParentSnapshotMs),
        buildMoveApplyMs: roundPerfMs(buildMoveApplyMs),
        buildMoveChangedCheckMs: roundPerfMs(buildMoveChangedCheckMs),
        buildMoveHashMs: roundPerfMs(buildMoveHashMs),
        buildMoveAffectedParentCount: affectedParentIds.length,
        buildMoveAffectedChildrenTotal,
        buildMoveMaxChildrenCount,
        changed: false,
      });
    }
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

  const createCommandStartedAt = dragProbe ? performance.now() : 0;
  const command = createMoveSubtreesCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      applyMutation: applyDocumentMutation,
    },
    {
      movingRootIds,
      beforeChildrenByParent,
      afterChildrenByParent,
      touchedParentIds: affectedParentIds,
      invalidateSubtreeHeightNodeIds,
      previousSelection: snapshotSelection(),
      nextSelection: {
        ids: movingRootIds,
        primaryId: dragState.value.primaryDragRootId ?? movingRootIds[movingRootIds.length - 1] ?? null,
      },
    }
  );
  const buildMoveCreateCommandMs = dragProbe ? performance.now() - createCommandStartedAt : 0;
  if (dragProbe) {
    dragProbe.buildMoveCreateCommandMs = buildMoveCreateCommandMs;
    pushMindPerfAnchor(dragProbe, 'build-move-command-breakdown', {
      buildMoveSourceInfosMs: roundPerfMs(buildMoveSourceInfosMs),
      buildMoveParentSnapshotMs: roundPerfMs(buildMoveParentSnapshotMs),
      buildMoveApplyMs: roundPerfMs(buildMoveApplyMs),
      buildMoveChangedCheckMs: roundPerfMs(buildMoveChangedCheckMs),
      buildMoveHashMs: roundPerfMs(buildMoveHashMs),
      buildMoveCreateCommandMs: roundPerfMs(buildMoveCreateCommandMs),
      buildMoveAffectedParentCount: affectedParentIds.length,
      buildMoveAffectedChildrenTotal,
      buildMoveMaxChildrenCount,
      changed: true,
    });
  }
  return {
    command,
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
  cancelPendingDragBootstrap();
  const ghostCleared = dragState.value.draggedSubtreeNodeIds.size > 0;
  resetDragState();
  resumeSelectionUiSyncAfterDrag();
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
  const previousMode = interactionState.value.mode;
  const pointerId = interactionState.value.pointerId;
  if (previousMode === 'pointerDownSecondary' || previousMode === 'panningCanvas') {
    setCanvasCursor('');
  }
  interactionState.value = createIdleInteractionState();
  pendingDragPerfStartContext = null;
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
    finishPendingDragPerfProbe(reason);
    cancelMindPerfOperationProbe();
  }
  removeGlobalDragListeners();
  resetInteractionToIdle(reason);
  requestRender();
}

function beginDragging(screenX: number, screenY: number) {
  const candidate = interactionState.value.dragCandidate;
  if (!candidate) return;
  const dragStartedAt = performance.now();
  const normalizeStartedAt = performance.now();
  const normalized = normalizeDragRootsFromIds(candidate.selectionIds);
  const normalizeDragRootsMs = performance.now() - normalizeStartedAt;
  setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
  if (normalized.invalidReason || !normalized.finalTargets.length) {
    pendingDragPerfStartContext = null;
    resetInteractionToIdle(normalized.invalidReason ?? 'node-not-draggable');
    requestRender();
    return;
  }
  const dragRoots = normalized.finalTargets.map((target) => target.nodeId);
  beginMindPerfOperationProbe({
    op: 'drag-node',
    label: '拖拽移动节点',
    trigger: 'pointer-drag',
    finishMode: 'flush',
    targetNodeId: candidate.primaryDragRootId ?? dragRoots[dragRoots.length - 1] ?? null,
    selectedCount: candidate.selectionIds.length,
    startedAt: pendingDragPerfStartContext?.startedAt ?? dragStartedAt,
  });
  const probe = beginDragPerfProbe({
    targetNodeId: candidate.primaryDragRootId ?? dragRoots[dragRoots.length - 1] ?? pendingDragPerfStartContext?.targetNodeId ?? null,
    selectedCount: candidate.selectionIds.length,
    dragRootCount: dragRoots.length,
    pointerDownLeadMs: pendingDragPerfStartContext ? dragStartedAt - pendingDragPerfStartContext.startedAt : null,
  });
  pendingDragPerfStartContext = null;
  if (probe) {
    probe.normalizeDragRootsMs = normalizeDragRootsMs;
    noteDragPerfStep('normalize-drag-roots', {
      normalizeDragRootsMs: roundPerfMs(normalizeDragRootsMs),
      dragRootCount: dragRoots.length,
      filteredOutDescendantsCount: normalized.filteredOutDescendantsCount,
      rootId: normalized.rootId,
    });
  }
  const pointerId = interactionState.value.pointerId;
  const captureSuccess = pointerId != null ? capturePointer(pointerId, 'begin-dragging') : false;
  cancelPendingDragBootstrap();
  pauseSelectionUiSyncForDrag();
  setDragState({
    isDragging: true,
    dragRoots,
    dragRootTexts: dragRoots.map(getNodeLabel),
    dragRootTextLayouts: [],
    primaryDragRootId: candidate.primaryDragRootId ?? dragRoots[dragRoots.length - 1] ?? null,
    rootId: normalized.rootId,
    draggedSubtreeNodeIds: new Set(dragRoots),
    cursorScreenX: screenX,
    cursorScreenY: screenY,
    dropTarget: null,
    lastValidDropTarget: null,
    invalidReason: null,
    filteredOutDescendantsCount: normalized.filteredOutDescendantsCount,
    autoPanActive: false,
    autoPanVelocityX: 0,
    autoPanVelocityY: 0,
  });
  transitionInteraction('begin-dragging', 'draggingNodes', {
    lastScreenX: screenX,
    lastScreenY: screenY,
  });
  addGlobalDragListeners();
  requestRender();
  if (probe) {
    probe.dragStartSetupMs = performance.now() - dragStartedAt;
    noteDragPerfStep('drag-state-ready', {
      dragStartSetupMs: roundPerfMs(probe.dragStartSetupMs),
      captureSuccess,
      pointerId,
      globalListenersActive: globalDragListenersActive,
      dragRoots,
    });
  }
  if (DEBUG_CANVAS_OVERLAY) {
    console.debug('[mind-drag-start]', {
      pointerId,
      captureSuccess,
      globalListenersActive: globalDragListenersActive,
      dragRoots,
    });
  }
  scheduleDragBootstrap(dragRoots);
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

function beginCanvasPanning(screenX: number, screenY: number) {
  suppressCanvasContextMenuUntil = performance.now() + 400;
  transitionInteraction('begin-canvas-pan', 'panningCanvas', {
    lastScreenX: screenX,
    lastScreenY: screenY,
  });
  addGlobalDragListeners();
  setCanvasCursor('grabbing');
}

function panCanvasFromPointerDelta(deltaX: number, deltaY: number) {
  setCanvasCursor('grabbing');
  if (deltaX === 0 && deltaY === 0) return;
  panByPixels(deltaX, deltaY);
  requestRender();
  schedulePersistViewport();
}

function finalizeDrop(reason = 'pointerup') {
  const startedAt = performance.now();
  const probe = getActiveMindPerfProbe();
  const dragProbe = probe?.op === 'drag-node' ? probe : null;
  if (dragProbe) dragProbe.releaseStartedAt = startedAt;
  const canUseLastValidTarget =
    !dragState.value.dropTarget &&
    !!dragState.value.lastValidDropTarget &&
    (!dragState.value.invalidReason || dragState.value.invalidReason === 'tooFar' || dragState.value.invalidReason === 'pointerStateLost');
  const stableTarget = dragState.value.dropTarget ?? (canUseLastValidTarget ? dragState.value.lastValidDropTarget : null);
  const effectiveInvalidReason = stableTarget ? null : dragState.value.invalidReason ?? 'tooFar';
  const buildMoveCommandStartedAt = dragProbe ? performance.now() : 0;
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
  if (dragProbe) {
    dragProbe.buildMoveCommandMs = performance.now() - buildMoveCommandStartedAt;
    dragProbe.finalDropTargetType = stableTarget?.type ?? null;
    dragProbe.finalDropToParentId = stableTarget?.toParentId ?? null;
    dragProbe.finalDropToIndex = stableTarget?.toIndex ?? null;
    pushMindPerfAnchor(dragProbe, 'build-move-command', {
      buildMoveCommandMs: roundPerfMs(dragProbe.buildMoveCommandMs),
      chosenDropTargetType: stableTarget?.type ?? null,
      toParentId: stableTarget?.toParentId ?? null,
      toIndex: stableTarget?.toIndex ?? null,
      invalidReason: result.reason,
      changed: result.changed,
    });
  }
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

  if (dragProbe && !isNoOp) {
    dragProbe.committed = true;
  }
  clearDragTransient(reason);
  if (isNoOp) {
    if (dragProbe) {
      dragProbe.finalizeDropMs = performance.now() - startedAt;
      dragProbe.releaseToDropRenderedMs = dragProbe.releaseStartedAt
        ? performance.now() - dragProbe.releaseStartedAt
        : dragProbe.finalizeDropMs;
      finishPendingDragPerfProbe(result.reason ?? reason, {
        finalizeDropMs: roundPerfMs(dragProbe.finalizeDropMs),
        releaseToDropRenderedMs: roundPerfMs(dragProbe.releaseToDropRenderedMs),
        noOpReason: result.reason,
        });
      }
    const operationProbe = getActiveMindPerfOperationProbe();
    if (operationProbe?.op === 'drag-node') {
      finishMindPerfOperationProbe(operationProbe, 'fallback', {
        fallbackReason: result.reason ?? reason,
      });
    }
    return;
  }
  if (dragProbe) {
    dragProbe.finalizeDropMs = performance.now() - startedAt;
    pushMindPerfAnchor(dragProbe, 'drag-command-dispatched', {
      finalizeDropMs: roundPerfMs(dragProbe.finalizeDropMs),
      commandName: result.command.name,
      chosenDropTargetType: stableTarget?.type ?? null,
    });
  }
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
    } else if (mode === 'pointerDownSecondary') {
      focusViewportWithoutScroll();
    } else if (mode === 'marqueeSelecting') {
      finishMarqueeSelection();
    } else if (mode === 'panningCanvas') {
      focusViewportWithoutScroll();
    } else if (mode === 'draggingNodes') {
      if (options.commitDrag === false) {
        clearDragTransient(reason);
        finishPendingDragPerfProbe(reason, {
          eventSource: options.eventSource ?? 'system',
        });
      } else {
        finalizeDrop(reason);
      }
    } else if (mode === 'pointerDownOnNode') {
      if (interactionState.value.hitNodeId && selectedIds.value.size > 1) {
        setSingleSelected(interactionState.value.hitNodeId);
      }
      focusViewportWithoutScroll();
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

function createDeleteMutationOptions(targets: Array<{ parentId: string; deletedSnapshot: MindSubtreeSnapshot }>) {
  const touchedParentIds = Array.from(new Set(targets.map((target) => target.parentId).filter(Boolean)));
  const invalidateSubtreeHeightNodeIds = Array.from(
    new Set(touchedParentIds.flatMap((parentId) => collectAncestorNodeIds(parentId)).filter(Boolean))
  );
  const removedNodeIds = Array.from(
    new Set(targets.flatMap((target) => target.deletedSnapshot.nodeIds).filter(Boolean))
  );
  return {
    invalidateSubtreeHeightNodeIds,
    removedNodeIds,
    touchedParentIds,
    trustExistingNodeMeasureCache: true,
    useLayoutChangedNodeIds: true,
  };
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

function resolvePreferredNodeClipboardState(
  externalClipboardState: InternalClipboardState | null,
  clipboardData?: DataTransfer | null
) {
  const internalClipboard = getInternalClipboard();
  if (!externalClipboardState) {
    const plainText = clipboardData?.getData('text/plain') ?? '';
    const hasExternalText = plainText.length > 0 && !plainText.startsWith(NODE_CLIPBOARD_TEXT_PREFIX);
    const hasExternalItems = Array.from(clipboardData?.items ?? []).some((item) => item.type !== 'text/plain');
    if (hasExternalText || hasExternalItems) return null;
    return internalClipboard.type === 'empty' ? null : internalClipboard;
  }
  if (internalClipboard.type === 'empty') return externalClipboardState;
  const externalCreatedAt = externalClipboardState.createdAt ?? 0;
  const internalCreatedAt = internalClipboard.createdAt ?? 0;
  return internalCreatedAt >= externalCreatedAt ? internalClipboard : externalClipboardState;
}

async function syncClipboardStateToSystemClipboard(clipboardState: InternalClipboardState) {
  if (clipboardState.type === 'empty') return;
  await tools.copyText(getNodeClipboardFallbackText(clipboardState));
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
  const result = normalizeSelectionTargetsFromParentIndex(getSelectedNodeIds(), options);
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
  const deleteMutationOptions = createDeleteMutationOptions([{ parentId, deletedSnapshot }]);

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
      deleteMutationOptions,
    }
  );
}

function createBatchAddChildSelectionCommand(targetNodeIds: string[]): Command | null {
  if (!targetNodeIds.length) return null;
  const newNodeIds = targetNodeIds.map(() => createNodeId());
  const roleByNodeId = Object.fromEntries(
    newNodeIds.map((nodeId, index) => [nodeId, resolveNewChildRole(targetNodeIds[index])])
  );
  return createBatchAddChildCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      startEditing: () => undefined,
      applyMutation: applyDocumentMutation,
      createNodeRecord: (nodeId: string) => createNodeRecord(nodeId, NEW_NODE_TEXT, roleByNodeId[nodeId] ?? 'default'),
    },
    {
      parentIds: targetNodeIds,
      newNodeIds,
      previousSelection: snapshotSelection(),
    }
  );
}

function createBatchAddSiblingSelectionCommand(
  targetNodeIds: string[],
  options?: { insertBefore?: boolean }
): Command | null {
  const nodes = getMindNodes();
  if (!nodes || !targetNodeIds.length) return null;
  const insertBefore = !!options?.insertBefore;

  const targetInfos = targetNodeIds
    .map((nodeId) => findParentAndIndex(nodeId))
    .map((parentInfo, index) =>
      parentInfo
        ? {
            nodeId: targetNodeIds[index],
            parentId: parentInfo.parentId,
            indexInParent: parentInfo.index,
            insertIndex: insertBefore ? parentInfo.index : parentInfo.index + 1,
          }
        : null
    )
    .filter(
      (value): value is { nodeId: string; parentId: string; indexInParent: number; insertIndex: number } => !!value
    )
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
  const roleByNewNodeId = Object.fromEntries(
    targetInfos.map((target) => [
      newNodeIdsByTargetId[target.nodeId],
      getMindNodeRole(props.doc, target.nodeId),
    ])
  );
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
      createNodeRecord: (nodeId: string) => createNodeRecord(nodeId, NEW_NODE_TEXT, roleByNewNodeId[nodeId] ?? 'default'),
    },
    {
      targetsForMutation: targetInfos,
      newNodeIdsByTargetId,
      addedNodeIdsInSelectionOrder: selectionOrder,
      previousSelection: snapshotSelection(),
    }
  );
}

function createBatchAddParentSelectionCommand(targetInfosInput: SelectionTargetInfo[]): Command | null {
  const nodes = getMindNodes();
  if (!nodes || !targetInfosInput.length) return null;

  const shouldProfileAddParent = DEBUG_MIND_PERF_PROBE && getActiveMindPerfProbe()?.op === 'add-parent-shortcut';
  const resolveTargetInfosStartedAt = shouldProfileAddParent ? performance.now() : 0;
  const targetInfos = targetInfosInput.filter((value): value is SelectionTargetInfo => !!value && !!value.parentId);
  if (shouldProfileAddParent) {
    noteMindPerfStep('resolve-target-infos', {
      targetNodeCount: targetInfosInput.length,
      targetInfoCount: targetInfos.length,
      resolveTargetInfosMs: roundPerfMs(performance.now() - resolveTargetInfosStartedAt),
      reusedNormalizedTargetInfos: true,
    });
  }

  if (!targetInfos.length) return null;

  const groupByParentStartedAt = shouldProfileAddParent ? performance.now() : 0;
  const groupsByParentId = new Map<
    string,
    {
      parentId: string;
      firstOrder: number;
      childIds: string[];
      indices: number[];
      newParentId: string;
      role: MindNodeRole;
    }
  >();

  targetInfos.forEach((info, orderIndex) => {
    if (!info.parentId) return;
    const existing = groupsByParentId.get(info.parentId);
    if (existing) {
      existing.childIds.push(info.nodeId);
      existing.indices.push(info.indexInParent);
      return;
    }
    groupsByParentId.set(info.parentId, {
      parentId: info.parentId,
      firstOrder: orderIndex,
      childIds: [info.nodeId],
      indices: [info.indexInParent],
      newParentId: createNodeId(),
      role: getMindNodeRole(props.doc, info.nodeId),
    });
  });
  if (shouldProfileAddParent) {
    noteMindPerfStep('group-targets-by-parent', {
      groupedParentCount: groupsByParentId.size,
      groupTargetsByParentMs: roundPerfMs(performance.now() - groupByParentStartedAt),
    });
  }

  const finalizeGroupsStartedAt = shouldProfileAddParent ? performance.now() : 0;
  const groups = Array.from(groupsByParentId.values())
    .sort((a, b) => a.firstOrder - b.firstOrder)
    .map((group) => {
      const parentChildren = Array.isArray(nodes[group.parentId]?.children) ? [...nodes[group.parentId].children] : [];
      const childIdSet = new Set(group.childIds);
      const orderedChildIds = parentChildren.filter((childId) => childIdSet.has(childId));
      const remainingChildren = parentChildren.filter((childId) => !childIdSet.has(childId));
      const insertIndex = Math.min(...group.indices);
      const afterChildren = [...remainingChildren];
      afterChildren.splice(insertIndex, 0, group.newParentId);
      return {
        parentId: group.parentId,
        childIds: orderedChildIds,
        beforeChildren: parentChildren,
        afterChildren,
        newParentId: group.newParentId,
        role: group.role,
      };
    })
    .filter((group) => group.childIds.length > 0);
  if (shouldProfileAddParent) {
    noteMindPerfStep('finalize-parent-groups', {
      groupCount: groups.length,
      wrappedChildCount: groups.reduce((sum, group) => sum + group.childIds.length, 0),
      finalizeParentGroupsMs: roundPerfMs(performance.now() - finalizeGroupsStartedAt),
    });
  }

  if (!groups.length) return null;

  const newParentIds = groups.map((group) => group.newParentId);
  const touchedParentIds = Array.from(new Set(groups.flatMap((group) => [group.parentId, group.newParentId]).filter(Boolean)));
  const invalidateSubtreeHeightNodeIds = Array.from(
    new Set(groups.flatMap((group) => [group.newParentId, ...collectAncestorNodeIds(group.parentId)]).filter(Boolean))
  );
  if (shouldProfileAddParent) {
    noteMindPerfStep('prepare-incremental-mutation-options', {
      touchedParentCount: touchedParentIds.length,
      invalidateCount: invalidateSubtreeHeightNodeIds.length,
    });
  }
  const createCommandStartedAt = shouldProfileAddParent ? performance.now() : 0;
  const command = createBatchAddParentCommand(
    {
      getNodes: getMindNodes,
      setSelection,
      applyMutation: applyDocumentMutation,
      createNodeRecord: (nodeId: string) =>
        createNodeRecord(
          nodeId,
          NEW_NODE_TEXT,
          groups.find((group) => group.newParentId === nodeId)?.role ?? 'default'
        ),
    },
    {
      groups: groups.map(({ role: _role, ...group }) => group),
      insertMutationOptions: {
        ensureVisibleNodeIds: newParentIds,
        invalidateSubtreeHeightNodeIds,
        touchedParentIds,
        trustExistingNodeMeasureCache: true,
        useLayoutChangedNodeIds: true,
      },
      previousSelection: snapshotSelection(),
      nextSelection: {
        ids: newParentIds,
        primaryId: newParentIds[newParentIds.length - 1] ?? null,
      },
    }
  );
  if (shouldProfileAddParent) {
    noteMindPerfStep('create-batch-add-parent-command', {
      createCommandMs: roundPerfMs(performance.now() - createCommandStartedAt),
      newParentCount: newParentIds.length,
    });
  }
  return command;
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
      createNodeRecord: (nodeId: string) =>
        createNodeRecord(nodeId, lineByNodeId[nodeId] ?? NEW_NODE_TEXT, resolveNewChildRole(targetParentId)),
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
  const deleteMutationOptions = createDeleteMutationOptions(
    targetsForMutation.map((target) => ({
      parentId: target.parentId,
      deletedSnapshot: target.deletedSnapshot,
    }))
  );

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
      deleteMutationOptions,
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
  const previousCollapsed = !!parentNode.collapsed;
  const newNodeRole = resolveNewChildRole(parentId);

  return {
    name: 'AddChildCommand',
    do: () => {
      const prepareStartedAt = performance.now();
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      currentParent.collapsed = false;
      const parentChildrenBefore = currentParent.children.length;
      noteMindPerfStep('prepare-parent-context', {
        ms: roundPerfMs(performance.now() - prepareStartedAt),
        parentChildrenBefore,
      });
      const createNodeStartedAt = performance.now();
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId, NEW_NODE_TEXT, newNodeRole);
      noteMindPerfStep('create-node-record', {
        ms: roundPerfMs(performance.now() - createNodeStartedAt),
        parentChildrenBefore,
      });
      const insertStartedAt = performance.now();
      currentParent.children.splice(insertIndex, 0, newNodeId);
      noteMindPerfStep('insert-child-reference', {
        ms: roundPerfMs(performance.now() - insertStartedAt),
        parentChildrenBefore,
        parentChildrenAfter: currentParent.children.length,
        insertIndex,
      });
      const selectionStartedAt = performance.now();
      setSingleSelected(newNodeId, { suppressRender: true, suppressFocus: true });
      noteMindPerfStep('selection-updated', {
        ms: roundPerfMs(performance.now() - selectionStartedAt),
      });
      void applyDocumentMutation('history:add-child', {
        ensureVisibleNodeId: newNodeId,
        invalidateSubtreeHeightNodeIds: [newNodeId, ...collectAncestorNodeIds(parentId)],
        addedNodeInfo: { nodeId: newNodeId, parentId },
      });
    },
    undo: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      const nextIndex = currentParent.children.indexOf(newNodeId);
      if (nextIndex >= 0) currentParent.children.splice(nextIndex, 1);
      currentParent.collapsed = previousCollapsed;
      delete currentNodes[newNodeId];
      const restoredSelectionId = resolveFallbackSelection(previousSelectionId, parentId);
      setSingleSelected(restoredSelectionId, { suppressRender: true, suppressFocus: true });
      editingNodeId.value = null;
      void applyDocumentMutation('history:undo-add-child', { ensureVisibleNodeId: restoredSelectionId });
    },
    redo: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      currentParent.collapsed = false;
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId, NEW_NODE_TEXT, newNodeRole);
      const nextIndex = Math.min(insertIndex, currentParent.children.length);
      if (!currentParent.children.includes(newNodeId)) currentParent.children.splice(nextIndex, 0, newNodeId);
      setSingleSelected(newNodeId, { suppressRender: true, suppressFocus: true });
      void applyDocumentMutation('history:redo-add-child', {
        ensureVisibleNodeId: newNodeId,
        invalidateSubtreeHeightNodeIds: [newNodeId, ...collectAncestorNodeIds(parentId)],
        addedNodeInfo: { nodeId: newNodeId, parentId },
      });
    },
  };
}

function createAddSiblingCommand(nodeId: string): Command | null {
  return createAddSiblingCommandAt(nodeId, { insertBefore: false });
}

function createAddSiblingBeforeCommand(nodeId: string): Command | null {
  return createAddSiblingCommandAt(nodeId, { insertBefore: true });
}

function createAddSiblingCommandAt(nodeId: string, options?: { insertBefore?: boolean }): Command | null {
  const parentInfo = findParentAndIndex(nodeId);
  if (!parentInfo) return null;

  const { parentId, index } = parentInfo;
  const nodes = getMindNodes();
  const parentNode = nodes?.[parentId];
  if (!nodes || !parentNode) return null;

  const insertBefore = !!options?.insertBefore;
  const previousSelectionId = getPrimarySelectedId();
  const newNodeId = createNodeId();
  const insertIndex = insertBefore ? index : index + 1;
  const siblingRole = getMindNodeRole(props.doc, nodeId);
  const commandName = insertBefore ? 'AddSiblingBeforeCommand' : 'AddSiblingCommand';
  const mutationReason = insertBefore ? 'add-sibling-before' : 'add-sibling';

  return {
    name: commandName,
    do: () => {
      const prepareStartedAt = performance.now();
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      const parentChildrenBefore = currentParent.children.length;
      noteMindPerfStep('prepare-parent-context', {
        ms: roundPerfMs(performance.now() - prepareStartedAt),
        parentChildrenBefore,
      });
      const createNodeStartedAt = performance.now();
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId, NEW_NODE_TEXT, siblingRole);
      noteMindPerfStep('create-node-record', {
        ms: roundPerfMs(performance.now() - createNodeStartedAt),
        parentChildrenBefore,
      });
      const insertStartedAt = performance.now();
      currentParent.children.splice(Math.min(insertIndex, currentParent.children.length), 0, newNodeId);
      noteMindPerfStep('insert-sibling-reference', {
        ms: roundPerfMs(performance.now() - insertStartedAt),
        parentChildrenBefore,
        parentChildrenAfter: currentParent.children.length,
        insertIndex,
      });
      const selectionStartedAt = performance.now();
      setSingleSelected(newNodeId, { suppressRender: true, suppressFocus: true });
      noteMindPerfStep('selection-updated', {
        ms: roundPerfMs(performance.now() - selectionStartedAt),
      });
      void applyDocumentMutation(`history:${mutationReason}`, {
        ensureVisibleNodeId: newNodeId,
        invalidateSubtreeHeightNodeIds: [newNodeId, ...collectAncestorNodeIds(parentId)],
        addedNodeInfo: { nodeId: newNodeId, parentId },
      });
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
      setSingleSelected(restoredSelectionId, { suppressRender: true, suppressFocus: true });
      editingNodeId.value = null;
      void applyDocumentMutation(`history:undo-${mutationReason}`, { ensureVisibleNodeId: restoredSelectionId });
    },
    redo: () => {
      const currentNodes = getMindNodes();
      const currentParent = currentNodes?.[parentId];
      if (!currentNodes || !currentParent) return;
      currentParent.children = Array.isArray(currentParent.children) ? currentParent.children : [];
      if (!currentNodes[newNodeId]) currentNodes[newNodeId] = createNodeRecord(newNodeId, NEW_NODE_TEXT, siblingRole);
      const nextIndex = Math.min(insertIndex, currentParent.children.length);
      if (!currentParent.children.includes(newNodeId)) currentParent.children.splice(nextIndex, 0, newNodeId);
      setSingleSelected(newNodeId, { suppressRender: true, suppressFocus: true });
      void applyDocumentMutation(`history:redo-${mutationReason}`, {
        ensureVisibleNodeId: newNodeId,
        invalidateSubtreeHeightNodeIds: [newNodeId, ...collectAncestorNodeIds(parentId)],
        addedNodeInfo: { nodeId: newNodeId, parentId },
      });
    },
  };
}

function wrapCommandDoWithMindPerf(command: Command, probe: MindPerfProbe): Command {
  return {
    ...command,
    do: () => {
      pushMindPerfAnchor(probe, 'command-do-start', { commandName: command.name });
      const commandDoStartedAt = performance.now();
      command.do();
      probe.commandDoMs = performance.now() - commandDoStartedAt;
      pushMindPerfAnchor(probe, 'command-do-end', {
        commandName: command.name,
        commandDoMs: roundPerfMs(probe.commandDoMs),
      });
    },
  };
}

function executeCommand(command: Command | null) {
  if (!command) {
    cancelMindPerfOperationProbe();
    return;
  }
  resetCommandDebugState();
  const probe = getActiveMindPerfProbe();
  setMindPerfOperationCommandName(command.name);
  const commandToExecute = probe ? wrapCommandDoWithMindPerf(command, probe) : command;
  if (probe) {
    probe.commandName = command.name;
    pushMindPerfAnchor(probe, 'history-execute-start', { commandName: command.name });
  }
  const executeStartedAt = probe ? performance.now() : 0;
  history.execute(commandToExecute);
  if (probe) {
    probe.historyExecuteMs = performance.now() - executeStartedAt;
    pushMindPerfAnchor(probe, 'history-execute-end', {
      commandName: command.name,
      historyExecuteMs: roundPerfMs(probe.historyExecuteMs),
    });
  }
}

function isEditableTarget(target: EventTarget | null) {
  const element = target as HTMLElement | null;
  if (!element) return false;
  if (isPendingDirectTypeInputTarget(element)) return false;
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
  if (editingSession.value && typeof document !== 'undefined' && isEditableTarget(document.activeElement)) return true;
  return false;
}

function withCameraResetLog(reason: string, mutate: () => void) {
  const before = { ...camera.value };
  mutate();
  logCameraReset(reason, before, camera.value);
}

function requestRender() {
  const perfProbe = getActiveMindPerfProbe();
  const isPreFlushProbeRender = !!perfProbe && perfProbe.flushStartedAt == null;
  if (perfProbe && isPreFlushProbeRender) {
    perfProbe.preFlushRequestRenderCount += 1;
    if (perfProbe.preFlushRequestRenderCount === 1) {
      pushMindPerfAnchor(perfProbe, 'request-render-queued', {
        phase: 'pre-flush',
      });
    }
  }
  if (drawRafId != null) return;
  drawRafId = requestAnimationFrame(() => {
    drawRafId = null;
    const drawStartedAt = performance.now();
    draw();
    const drawMs = performance.now() - drawStartedAt;
    noteMindPerfCameraDraw(drawMs);
    const operationProbe = getActiveMindPerfOperationProbe();
    if (perfProbe && isPreFlushProbeRender) {
      perfProbe.preFlushDrawCount += 1;
      perfProbe.preFlushDrawMs += drawMs;
      if (perfProbe.op === 'add-node-enter' || perfProbe.preFlushDrawCount === 1) {
        if (perfProbe.op === 'drag-node' && perfProbe.dragStartToFollowVisibleMs == null) {
          perfProbe.dragStartToFollowVisibleMs = performance.now() - perfProbe.startedAt;
        }
        pushMindPerfAnchor(perfProbe, perfProbe.op === 'drag-node' ? 'drag-first-draw' : 'request-render-draw', {
          phase: 'pre-flush',
          drawMs: roundPerfMs(drawMs),
        });
      }
    }
    if (operationProbe && operationProbe.finishMode === 'draw') {
      finishMindPerfOperationProbe(operationProbe, 'draw');
    }
  });
}

function rebuildSpatialCaches() {
  worldBoxes.value = buildWorldBoxes(props.doc, layoutLocal);
  descendantCounts.value = buildDescendantCountMap(props.doc);
  parentIndexByNodeId.value = buildParentIndex(getMindNodes());
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
  () => schedulePersistViewport(),
  noteMindPerfCameraInteractionFrame
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
  options: {
    restoreViewport: boolean;
    preserveSubtreeHeightCache?: boolean;
    invalidateSubtreeHeightNodeIds?: string[];
    addedNodeInfos?: Array<{ nodeId: string; parentId: string | null }>;
    removedNodeIds?: string[];
    hiddenNodeIds?: string[];
    touchedParentIds?: string[];
    reuseDescendantCounts?: boolean;
    reuseParentIndex?: boolean;
    forceFullEdgeRebuild?: boolean;
    trustExistingNodeMeasureCache?: boolean;
    useLayoutChangedNodeIds?: boolean;
  } = { restoreViewport: true }
) {
  const startedAt = performance.now();
  if (options.restoreViewport) {
    await nextTick();
  }
  resizeToViewport();

  if (props.doc) ensureMindRoots(props.doc);

  if (options.invalidateSubtreeHeightNodeIds?.length) {
    invalidateSubtreeHeightCache(options.invalidateSubtreeHeightNodeIds);
  }
  const layoutStartedAt = performance.now();
  rebuildLayout({
    preserveSubtreeHeightCache: options.preserveSubtreeHeightCache,
    trustExistingNodeMeasureCache: options.trustExistingNodeMeasureCache ?? !!options.addedNodeInfos?.length,
    translationBlockedNodeIds: options.invalidateSubtreeHeightNodeIds,
  });
  const layoutRebuildMs = performance.now() - layoutStartedAt;
  const layoutPerfMetrics = getLastLayoutPerfMetrics();
  const layoutTranslationOps = getLastLayoutTranslationOps();
  const layoutChangedNodeIds = options.useLayoutChangedNodeIds ? getLastLayoutChangedNodeIds() : [];
  const edgesStartedAt = performance.now();
  const worldBoxesStartedAt = performance.now();
  const previousWorldBoxes = worldBoxes.value;
  const nextWorldBoxes = buildWorldBoxes(props.doc, layoutLocal);
  worldBoxes.value = nextWorldBoxes;
  const worldBoxesBuildMs = performance.now() - worldBoxesStartedAt;
  const parentIndexStartedAt = performance.now();
  const nodes = getMindNodes();
  const nextParentIndex = options.reuseParentIndex
    ? parentIndexByNodeId.value
    : options.removedNodeIds?.length
    ? updateParentIndexForRemovedNodes(nodes, parentIndexByNodeId.value, options.touchedParentIds ?? [], options.removedNodeIds)
    : options.touchedParentIds?.length
    ? updateParentIndexForTouchedParents(nodes, parentIndexByNodeId.value, options.touchedParentIds)
    : options.addedNodeInfos?.length
      ? updateParentIndexForAddedNodes(nodes, parentIndexByNodeId.value, options.addedNodeInfos)
      : buildParentIndex(nodes);
  const parentIndexBuildMs = performance.now() - parentIndexStartedAt;
  const changedNodeIds: string[] = options.useLayoutChangedNodeIds && layoutChangedNodeIds.length ? [...layoutChangedNodeIds] : [];
  if (options.removedNodeIds?.length) {
    options.removedNodeIds.forEach((nodeId) => {
      if (nodeId && !changedNodeIds.includes(nodeId)) changedNodeIds.push(nodeId);
    });
  }
  if (options.hiddenNodeIds?.length) {
    options.hiddenNodeIds.forEach((nodeId) => {
      if (nodeId && !changedNodeIds.includes(nodeId)) changedNodeIds.push(nodeId);
    });
  }
  const changedNodeScanStartedAt = performance.now();
  if (!changedNodeIds.length && options.addedNodeInfos?.length) {
    for (const [nodeId, nextRect] of nextWorldBoxes.entries()) {
      if (!isSameWorldRect(previousWorldBoxes.get(nodeId), nextRect)) changedNodeIds.push(nodeId);
    }
  }
  const changedNodeScanMs = performance.now() - changedNodeScanStartedAt;
  const descendantCountsStartedAt = performance.now();
  if (options.reuseDescendantCounts) {
    descendantCounts.value = descendantCounts.value;
  } else if (options.addedNodeInfos?.length) {
    const nextDescendantCounts = new Map(descendantCounts.value);
    options.addedNodeInfos.forEach(({ nodeId, parentId }) => {
      if (!nodeId) return;
      nextDescendantCounts.set(nodeId, nextDescendantCounts.get(nodeId) ?? 0);
      let currentId = parentId;
      while (currentId) {
        nextDescendantCounts.set(currentId, (nextDescendantCounts.get(currentId) ?? 0) + 1);
        const parentInfo = parentIndexByNodeId.value.get(currentId);
        currentId = parentInfo?.parentId ?? null;
      }
    });
    descendantCounts.value = nextDescendantCounts;
  } else if (options.removedNodeIds?.length) {
    descendantCounts.value = buildDescendantCountMap(props.doc);
  } else {
    descendantCounts.value = buildDescendantCountMap(props.doc);
  }
  const descendantCountsMs = performance.now() - descendantCountsStartedAt;
  parentIndexByNodeId.value = nextParentIndex;
  const spatialIndexStartedAt = performance.now();
  if (changedNodeIds.length) {
    spatialIndex.updateMany(worldBoxes.value, changedNodeIds);
  } else {
    spatialIndex.rebuild(worldBoxes.value);
  }
  const spatialIndexMs = performance.now() - spatialIndexStartedAt;
  const edgeCacheStartedAt = performance.now();
  let edgeAffectedParentCount = 0;
  let edgeTranslatedParentCount = 0;
  if (
    (changedNodeIds.length || options.touchedParentIds?.length) &&
    !options.removedNodeIds?.length &&
    !options.hiddenNodeIds?.length &&
    !options.forceFullEdgeRebuild
  ) {
    const affectedParents = new Map<string, string>();
    const translatedParentOffsets = new Map<string, { dx: number; dy: number }>();
    layoutTranslationOps.forEach((op) => {
      op.translatedParentIds.forEach((parentId) => {
        translatedParentOffsets.set(parentId, { dx: op.dx, dy: op.dy });
      });
    });
    const rootIdCache = new Map<string, string | null>();
    const resolveCachedRootNodeId = (nodeId: string | null | undefined) => {
      if (!nodeId) return null;
      if (rootIdCache.has(nodeId)) return rootIdCache.get(nodeId) ?? null;
      const rootId = resolveRootNodeId(nodeId, nextParentIndex);
      rootIdCache.set(nodeId, rootId);
      return rootId;
    };
    changedNodeIds.forEach((nodeId) => {
      if (nodes?.[nodeId]?.children?.length) {
        const rootId = resolveCachedRootNodeId(nodeId);
        if (rootId) affectedParents.set(nodeId, rootId);
      }
      const parentInfo = nextParentIndex.get(nodeId);
      if (!parentInfo?.parentId) return;
      const rootId = resolveCachedRootNodeId(parentInfo.parentId);
      if (rootId) affectedParents.set(parentInfo.parentId, rootId);
    });
    options.touchedParentIds?.forEach((parentId) => {
      const rootId = resolveCachedRootNodeId(parentId);
      if (rootId) affectedParents.set(parentId, rootId);
    });
    edgeAffectedParentCount = affectedParents.size;
    const edgeCacheResult = rebuildEdgeCache(props.doc, worldBoxes.value, {
      previousWorldBoxes,
      translatedParentOffsets,
      affectedParents: Array.from(affectedParents.entries()).map(([parentId, rootId]) => ({ parentId, rootId })),
    });
    edgeTranslatedParentCount = edgeCacheResult?.translatedParentCount ?? 0;
  } else {
    rebuildEdgeCache(props.doc, worldBoxes.value);
  }
  const edgeCacheMs = performance.now() - edgeCacheStartedAt;
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

  const drawStartedAt = performance.now();
  draw();
  const drawMs = performance.now() - drawStartedAt;
  return {
    layoutRebuildMs,
    layoutMeasureMs: layoutPerfMetrics?.measureNodeMs ?? null,
    layoutMeasureCalls: layoutPerfMetrics?.measureNodeCalls ?? null,
    layoutMeasureCacheHits: layoutPerfMetrics?.measureNodeCacheHits ?? null,
    layoutSubtreeMs: layoutPerfMetrics?.subtreeHeightMs ?? null,
    layoutSubtreeCalls: layoutPerfMetrics?.subtreeHeightCalls ?? null,
    layoutSubtreeCacheHits: layoutPerfMetrics?.subtreeHeightCacheHits ?? null,
    layoutPlaceMs: layoutPerfMetrics?.placeMs ?? null,
    layoutPlaceCalls: layoutPerfMetrics?.placeCalls ?? null,
    worldBoxesBuildMs,
    parentIndexBuildMs,
    changedNodeScanMs,
    changedNodeCount: changedNodeIds.length,
    descendantCountsMs,
    spatialIndexMs,
    edgeCacheMs,
    edgeAffectedParentCount,
    edgeTranslatedParentCount,
    edgesRebuildMs,
    drawMs,
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
  const nodes = getMindNodes();
  const node = nodes?.[nodeId];
  const children = Array.isArray(node?.children) ? node.children : [];
  if (!node || !children.length) return;
  const invalidateSubtreeHeightNodeIds = collectAncestorNodeIds(nodeId);
  const hiddenNodeIds = node.collapsed
    ? []
    : collectSubtreeNodeIds(nodes, nodeId).filter((childNodeId) => childNodeId !== nodeId);

  if (editingSession.value) {
    const editingSubtreeIds = new Set(collectSubtreeNodeIds(nodes, nodeId));
    if (editingSubtreeIds.has(editingSession.value.nodeId)) {
      commitEditingSession();
    }
  }

  beginMindPerfOperationProbe({
    op: 'toggle-collapse',
    label: node.collapsed ? '展开节点' : '收起节点',
    trigger: 'collapse-tag-click',
    finishMode: 'flush',
    targetNodeId: nodeId,
    selectedCount: selectedIds.value.size,
  });
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
  await applyDocumentMutation('node-toggle-collapsed', {
    ensureVisibleNodeId: nodeId,
    invalidateSubtreeHeightNodeIds,
    hiddenNodeIds,
    reuseDescendantCounts: true,
    reuseParentIndex: true,
    forceFullEdgeRebuild: true,
    trustExistingNodeMeasureCache: true,
    useLayoutChangedNodeIds: true,
  });
}

function updateHoverFromScreenPoint(screenX: number, screenY: number) {
  if (isMarquee.value || interactionState.value.mode === 'draggingNodes') return;
  const nextCollapseTagHoverId = hitTestCollapseTag(
    collapseTagScreenMap.value,
    collapseTagActiveNodeIds.value,
    screenX,
    screenY,
    { includeHidden: true }
  );
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

function isSecondaryPointerTrigger(event: PointerEvent) {
  return event.button === 2;
}

function isActiveInteractionButtonPressed(event: PointerEvent) {
  if (interactionState.value.mode === 'pointerDownSecondary' || interactionState.value.mode === 'panningCanvas') {
    return (event.buttons & 2) === 2;
  }
  return (event.buttons & 1) === 1;
}

function onCanvasPointerDown(event: PointerEvent) {
  const isPrimaryPointerDown = event.button === 0;
  const isSecondaryPointerDown = isSecondaryPointerTrigger(event);
  if (!isPrimaryPointerDown && !isSecondaryPointerDown) return;
  focusViewportWithoutScroll();
  pendingDragPerfStartContext = null;
  if (editingSession.value) {
    commitEditingSession();
  }
  if (interactionState.value.mode !== 'idle') {
    cancelInteraction('pointerdown-reentry');
  }
  const screenPoint = getPointerScreenPoint(event);
  if (!screenPoint) return;
  const downWorld = screenToWorld(camera.value, screenPoint.x, screenPoint.y);
  const collapseTagNodeId = hitTestCollapseTag(
    collapseTagScreenMap.value,
    collapseTagActiveNodeIds.value,
    screenPoint.x,
    screenPoint.y,
    { includeHidden: true }
  );
  const hitId = hitTest(screenPoint.x, screenPoint.y);
  const imageTarget = isSecondaryPointerDown ? null : getPrimarySelectedImageTarget(screenPoint.x, screenPoint.y);

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

  let pointerDownNeedsRender = false;
  if (imageInteraction.value) {
    clearImageInteraction('pointerdown-outside-image');
    pointerDownNeedsRender = true;
  }

  if (!isSecondaryPointerDown && collapseTagNodeId) {
    event.preventDefault();
    event.stopPropagation();
    editingNodeId.value = null;
    void toggleNodeCollapsed(collapseTagNodeId);
    return;
  }

  capturePointer(event.pointerId, 'pointerdown');

  if (isSecondaryPointerDown) {
    interactionState.value = {
      mode: 'pointerDownSecondary',
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
      dragCandidate: null,
    };
    logInteractionTransition('pointerdown-secondary', 'pointerDownSecondary', {
      hitNodeId: hitId,
    });
    if (pointerDownNeedsRender) requestRender();
    return;
  }

  if (hitId) {
    event.preventDefault();
    if (editingNodeId.value) {
      editingNodeId.value = null;
      pointerDownNeedsRender = true;
    }
    if (event.ctrlKey || event.metaKey) {
      toggleNodeSelection(hitId);
      resetInteractionToIdle('toggle-node-selection');
    } else if (event.shiftKey) {
      extendSelectionFromAnchor(hitId);
      resetInteractionToIdle('range-node-selection');
    } else {
      const isAlreadySelected = selectedIds.value.has(hitId);
      const isPrimarySelected = primarySelectedNodeId.value === hitId;
      const selectionIds = isAlreadySelected ? getSelectedNodeIds() : [hitId];
      if (!isAlreadySelected || !isPrimarySelected || selectedIds.value.size > 1) {
        beginMindPerfOperationProbe({
          op: 'click-select',
          label: '单击选中节点',
          trigger: 'pointer-click',
          finishMode: 'draw',
          targetNodeId: hitId,
          selectedCount: selectionIds.length,
        });
      } else {
        cancelMindPerfOperationProbe();
      }
      pendingDragPerfStartContext = {
        startedAt: performance.now(),
        targetNodeId: hitId,
        selectedCount: selectionIds.length,
        pointerId: event.pointerId,
      };
      if (!isAlreadySelected) setSingleSelected(hitId);
      else if (!isPrimarySelected) setSelection(selectionIds, hitId);
      else dumpCanvasTextDiagnostics(hitId, 'pointerdown-selected-primary');
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
          selectionIds,
          primaryDragRootId: hitId,
        },
      };
      logInteractionTransition('pointerdown-node', 'pointerDownOnNode', {
        hitNodeId: hitId,
        selectionIds,
      });
    }
    if (pointerDownNeedsRender) requestRender();
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
  if (pointerDownNeedsRender) requestRender();
}

function onCanvasDoubleClick(event: MouseEvent) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const screenX = event.clientX - rect.left;
  const screenY = event.clientY - rect.top;
  const imageNodeId = getImageTargetAtScreenPoint(screenX, screenY);
  if (imageNodeId) {
    event.preventDefault();
    event.stopPropagation();
    setSingleSelected(imageNodeId);
    openImagePreview(imageNodeId);
    return;
  }
  const collapseTagNodeId = hitTestCollapseTag(
    collapseTagScreenMap.value,
    collapseTagActiveNodeIds.value,
    screenX,
    screenY,
    { includeHidden: true }
  );
  if (collapseTagNodeId) return;
  const hitId = hitTest(screenX, screenY);
  if (!hitId) return;
  event.preventDefault();
  event.stopPropagation();
  beginMindPerfOperationProbe({
    op: 'double-click-edit',
    label: '双击进入编辑',
    trigger: 'double-click',
    finishMode: 'edit-ready',
    targetNodeId: hitId,
    selectedCount: selectedIds.value.has(hitId) ? selectedIds.value.size : 1,
  });
  if (!selectedIds.value.has(hitId) || primarySelectedNodeId.value !== hitId) {
    setSingleSelected(hitId);
  }
  startEditing(hitId, { mode: 'append', caretPlacement: 'end' });
}

async function onCanvasContextMenu(event: MouseEvent) {
  if (performance.now() <= suppressCanvasContextMenuUntil) {
    suppressCanvasContextMenuUntil = 0;
    event.preventDefault();
    event.stopPropagation();
    return;
  }
  const canvas = canvasRef.value;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const hitId = hitTest(event.clientX - rect.left, event.clientY - rect.top);
  if (!hitId) return;

  event.preventDefault();
  event.stopPropagation();
  focusViewportWithoutScroll();

  const targetNodeIds = resolveContextMenuTargetNodeIds(hitId);
  const action = await window.electronAPI.wm.popupMenu({
    x: event.clientX,
    y: event.clientY,
    items: [
      { id: 'expand-all', label: '全部展开' },
      { id: 'collapse-all', label: '全部收起' },
    ],
  });

  if (action === 'expand-all') {
    await setCollapsedStateForSubtrees(targetNodeIds, false);
    return;
  }
  if (action === 'collapse-all') {
    await setCollapsedStateForSubtrees(targetNodeIds, true);
  }
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

  if (!isActiveInteractionButtonPressed(event) && interactionState.value.mode !== 'idle') {
    finalizeInteraction('buttonsReleasedFallback', {
      commitDrag: interactionState.value.mode === 'draggingNodes',
      eventSource: 'canvas',
    });
    return;
  }

  const previousLastScreenX = interactionState.value.lastScreenX;
  const previousLastScreenY = interactionState.value.lastScreenY;
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

  if (interactionState.value.mode === 'pointerDownSecondary') {
    if (distance >= DRAG_START_THRESHOLD_PX) {
      beginCanvasPanning(screenPoint.x, screenPoint.y);
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

  if (interactionState.value.mode === 'panningCanvas') {
    panCanvasFromPointerDelta(screenPoint.x - previousLastScreenX, screenPoint.y - previousLastScreenY);
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
  if (interactionState.value.mode !== 'draggingNodes' && interactionState.value.mode !== 'panningCanvas') return;
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
  const nodeClipboardState = resolvePreferredNodeClipboardState(parseClipboardNodePayload(clipboardData), clipboardData);
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
  if (!shouldConfirmClose.value) {
    await window.electronAPI.wm.closeResponse({ key, allow: true });
    return;
  }
  closeDialogState.value = {
    visible: true,
    key,
    submitting: false,
  };
}

async function resolveCloseDialog(allow: boolean) {
  const key = closeDialogState.value.key;
  closeDialogState.value = {
    visible: false,
    key: null,
    submitting: false,
  };
  if (!key) return;
  await window.electronAPI.wm.closeResponse({ key, allow });
}

async function onCloseDialogCancel() {
  await resolveCloseDialog(false);
}

async function onCloseDialogDiscard() {
  await resolveCloseDialog(true);
}

async function onCloseDialogSave() {
  const key = closeDialogState.value.key;
  if (!key || closeDialogState.value.submitting || isSaving.value) return;
  closeDialogState.value = {
    ...closeDialogState.value,
    submitting: true,
  };
  const saved = await saveDocument();
  if (saved) {
    await resolveCloseDialog(true);
    return;
  }
  closeDialogState.value = {
    ...closeDialogState.value,
    submitting: false,
  };
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (imagePreviewState.value.visible && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    closeImagePreview();
    return;
  }
  if (closeDialogState.value.visible && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    void onCloseDialogCancel();
    return;
  }
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
  const isToggleSearchPanelShortcut = isModifierPressed && !event.altKey && !event.shiftKey && lowerKey === 'f';
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
  if (isToggleSearchPanelShortcut) {
    event.preventDefault();
    event.stopPropagation();
    emit('toggleSearchPanel');
    return;
  }
  if (isToggleFormatPanelShortcut) {
    event.preventDefault();
    event.stopPropagation();
    emit('toggleFormatPanel');
    return;
  }
  if (editingSession.value && !isTextEditingActive(event.target)) return;
  if (interactionState.value.mode === 'pointerDownOnNode') {
    finalizeInteraction('keyboard-settle-before-shortcut', { commitDrag: false, eventSource: 'system' });
  }
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
  const isEnterKey = event.key === 'Enter';
  const isAddParentShortcut = isEnterKey && isModifierPressed && !event.altKey && !event.shiftKey;
  const isEnterShortcut = isEnterKey && !isModifierPressed && !event.altKey && !event.shiftKey;
  const isArrowNavigationShortcut = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key);
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
    isAddParentShortcut ||
    isEnterShortcut ||
    (isArrowNavigationShortcut && selectedIds.value.size > 0) ||
    isDeleteShortcut ||
    isSelectAllShortcut ||
    isCutShortcut ||
    isLevelMarkerShortcut ||
    isErrorMarkerShortcut ||
    isTaskDoneMarkerShortcut ||
    isUndoShortcut ||
    isRedoShortcut ||
    isSpaceShortcut;

  if (shouldPreventDefault) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (isUndoShortcut) {
    stopEditingSession();
    resetCommandDebugState();
    beginMindPerfOperationProbe({
      op: 'undo',
      label: '撤销',
      trigger: 'keyboard-shortcut',
      finishMode: 'flush',
      commandName: historySnapshot.value.lastCommandName,
      selectedCount: selectedIds.value.size,
      targetNodeId: getPrimarySelectedId(),
    });
    history.undo();
    setMindPerfOperationCommandName(historySnapshot.value.lastCommandName);
    return;
  }

  if (isRedoShortcut) {
    stopEditingSession();
    resetCommandDebugState();
    beginMindPerfOperationProbe({
      op: 'redo',
      label: '重做',
      trigger: 'keyboard-shortcut',
      finishMode: 'flush',
      selectedCount: selectedIds.value.size,
      targetNodeId: getPrimarySelectedId(),
    });
    history.redo();
    setMindPerfOperationCommandName(historySnapshot.value.lastCommandName);
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
    beginMindPerfOperationProbe({
      op: 'space-edit',
      label: '空格进入编辑',
      trigger: 'keyboard-shortcut',
      finishMode: 'edit-ready',
      targetNodeId: primarySelectedId,
      selectedCount,
    });
    startEditing(primarySelectedId, { mode: 'append', caretPlacement: 'end' });
    return;
  }

  if (primarySelectedId && isPrintableCharacter && !isComposing.value) {
    beginMindPerfOperationProbe({
      op: 'type-to-edit',
      label: '直接输入进入编辑',
      trigger: 'keyboard-shortcut',
      finishMode: 'edit-ready',
      targetNodeId: primarySelectedId,
      selectedCount,
    });
    pendingDirectTypeSeed.value = {
      nodeId: primarySelectedId,
      key: event.key,
    };
    if (!editingSession.value || editingSession.value.nodeId !== primarySelectedId || editingSession.value.mode !== 'replace') {
      startEditing(primarySelectedId, {
        mode: 'replace',
        insertedText: '',
        caretPlacement: 'end',
        shouldFocusEditor: false,
      });
    }
    if (!isPendingDirectTypeInputTarget(document.activeElement) && !focusPendingDirectTypeInput(primarySelectedId)) {
      clearPendingDirectTypeSeed();
      startEditing(primarySelectedId, { mode: 'replace', insertedText: event.key, caretPlacement: 'end' });
    }
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
    const targetIds = normalized.finalTargets.map((target) => target.nodeId);
    performCopy(targetIds);
    const clipboardState = getInternalClipboard();
    if (clipboardState.type !== 'empty') {
      void syncClipboardStateToSystemClipboard(clipboardState);
    }
    stopEditingSession();
    executeCommand(
      normalized.finalTargets.length === 1
        ? createCutCommand(normalized.finalTargets[0].nodeId)
        : createBatchCutSelectionCommand(targetIds)
    );
    return;
  }

  if (!primarySelectedId) return;

  if (isArrowNavigationShortcut) {
    if (event.key === 'ArrowUp') moveSelectionWithKeyboard('up');
    if (event.key === 'ArrowDown') moveSelectionWithKeyboard('down');
    if (event.key === 'ArrowLeft') moveSelectionWithKeyboard('left');
    if (event.key === 'ArrowRight') moveSelectionWithKeyboard('right');
    return;
  }

  if (isDeleteShortcut) {
    beginMindPerfOperationProbe({
      op: 'delete-node',
      label: '删除节点',
      trigger: 'keyboard-shortcut',
      finishMode: 'flush',
      targetNodeId: primarySelectedId,
      selectedCount,
    });
    const normalized = normalizeSelectedTargets({
      allowRoot: false,
    });
    setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
    if (!normalized.finalTargets.length) {
      cancelMindPerfOperationProbe();
      return;
    }
    stopEditingSession();
    executeCommand(
      normalized.finalTargets.length === 1
        ? createDeleteCommand(normalized.finalTargets[0].nodeId)
        : createBatchDeleteSelectionCommand(normalized.finalTargets.map((target) => target.nodeId))
    );
    return;
  }

  if (isTabShortcut) {
    beginMindPerfOperationProbe({
      op: 'add-child-tab',
      label: 'Tab 新增子节点',
      trigger: 'keyboard-shortcut',
      finishMode: 'flush',
      targetNodeId: primarySelectedId,
      selectedCount,
    });
    if (selectedCount >= 2) {
      const uniqueTargets = Array.from(new Set(selectedNodeIds));
      executeCommand(createBatchAddChildSelectionCommand(uniqueTargets));
      return;
    }
    executeCommand(createAddChildCommand(primarySelectedId));
    return;
  }

  if (isAddParentShortcut) {
    beginMindPerfOperationProbe({
      op: 'add-parent-shortcut',
      label: 'Ctrl/Cmd+Enter 增加父节点',
      trigger: 'keyboard-shortcut',
      finishMode: 'flush',
      targetNodeId: primarySelectedId,
      selectedCount,
    });
    beginAddParentPerfProbe('batch-add-parent', primarySelectedId, selectedCount);
    const shouldProfileAddParent = DEBUG_MIND_PERF_PROBE;
    const normalizeSelectionStartedAt = shouldProfileAddParent ? performance.now() : 0;
    const normalized = normalizeSelectedTargets({
      allowRoot: false,
    });
    if (shouldProfileAddParent) {
      noteMindPerfStep('normalize-selection-targets', {
        normalizeSelectionMs: roundPerfMs(performance.now() - normalizeSelectionStartedAt),
        filteredOutDescendantsCount: normalized.filteredOutDescendantsCount,
        finalTargetCount: normalized.finalTargets.length,
      });
    }
    setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
    if (!normalized.finalTargets.length) {
      cancelMindPerfOperationProbe();
      cancelMindPerfProbe('no-valid-targets');
      return;
    }
    const command = createBatchAddParentSelectionCommand(normalized.finalTargets);
    if (!command) {
      cancelMindPerfOperationProbe();
      cancelMindPerfProbe('command-create-failed');
      return;
    }
    noteMindPerfStep('command-created', { commandName: command.name });
    executeCommand(command);
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
        beginMindPerfOperationProbe({
          op: 'add-child-enter',
          label: 'Enter 新增子节点',
          trigger: 'keyboard-shortcut',
          finishMode: 'flush',
          targetNodeId: primarySelectedId,
          selectedCount,
        });
        beginAddNodePerfProbe('batch-add-child', primarySelectedId, selectedCount);
        const command = createBatchAddChildSelectionCommand(selectedNodeIds);
        if (!command) {
          cancelMindPerfOperationProbe();
          cancelMindPerfProbe('command-create-failed');
          return;
        }
        noteMindPerfStep('command-created', { commandName: command.name });
        executeCommand(command);
        return;
      }
      beginMindPerfOperationProbe({
        op: 'add-sibling-enter',
        label: 'Enter 新增同级节点',
        trigger: 'keyboard-shortcut',
        finishMode: 'flush',
        targetNodeId: primarySelectedId,
        selectedCount,
      });
      beginAddNodePerfProbe('batch-add-sibling', primarySelectedId, selectedCount);
      const command = createBatchAddSiblingSelectionCommand(siblingTargetIds);
      if (!command) {
        cancelMindPerfOperationProbe();
        cancelMindPerfProbe('command-create-failed');
        return;
      }
      noteMindPerfStep('command-created', { commandName: command.name });
      executeCommand(command);
      return;
    }
    const parentInfo = findParentAndIndex(primarySelectedId);
    if (!parentInfo) {
      beginMindPerfOperationProbe({
        op: 'add-child-enter',
        label: 'Enter 新增子节点',
        trigger: 'keyboard-shortcut',
        finishMode: 'flush',
        targetNodeId: primarySelectedId,
        selectedCount,
      });
      beginAddNodePerfProbe('add-child', primarySelectedId, selectedCount);
      const command = createAddChildCommand(primarySelectedId);
      if (!command) {
        cancelMindPerfOperationProbe();
        cancelMindPerfProbe('command-create-failed');
        return;
      }
      noteMindPerfStep('command-created', { commandName: command.name });
      executeCommand(command);
      return;
    }
    beginMindPerfOperationProbe({
      op: 'add-sibling-enter',
      label: 'Enter 新增同级节点',
      trigger: 'keyboard-shortcut',
      finishMode: 'flush',
      targetNodeId: primarySelectedId,
      selectedCount,
    });
    beginAddNodePerfProbe('add-sibling', primarySelectedId, selectedCount);
    const command = createAddSiblingCommand(primarySelectedId);
    if (!command) {
      cancelMindPerfOperationProbe();
      cancelMindPerfProbe('command-create-failed');
      return;
    }
    noteMindPerfStep('command-created', { commandName: command.name });
    executeCommand(command);
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

function onCompositionStart(event: CompositionEvent) {
  if (event.target === pendingDirectTypeInputRef.value) return;
  isComposing.value = true;
}

function onCompositionEnd(event: CompositionEvent) {
  if (event.target === pendingDirectTypeInputRef.value) return;
  isComposing.value = false;
  clearPendingDirectTypeSeed();
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
  { deep: false }
);

watch(
  [isDirty, isSaving, () => props.filePath],
  () => {
    emitSaveState();
  },
  { immediate: true }
);

watch(
  [selectedIds, contentRevision],
  () => {
    scheduleNodeCountStateEmit();
  },
  { immediate: true, deep: false }
);

watch(
  [primarySelectedNodeId, contentRevision],
  () => {
    scheduleStylePanelSync();
  },
  { immediate: true, deep: false }
);

watch(
  searchTextQuery,
  (nextQuery) => {
    clearSearchTextQueryDebounceTimer();
    const normalizedQuery = normalizeSearchQuery(nextQuery);
    if (!normalizedQuery) {
      searchResolvedTextQuery.value = '';
      return;
    }
    searchTextQueryDebounceTimerId = window.setTimeout(() => {
      searchTextQueryDebounceTimerId = null;
      searchResolvedTextQuery.value = normalizeSearchQuery(searchTextQuery.value);
    }, SEARCH_TEXT_QUERY_DEBOUNCE_MS);
  },
  { immediate: true }
);

watch(
  [() => !!props.showSearchPanel, contentRevision],
  ([visible]) => {
    if (!visible) return;
    rebuildSearchNodeEntries();
  },
  { immediate: true, deep: false }
);

watch(
  searchResultScrollRef,
  () => {
    nextTick().then(() => {
      bindSearchResultResizeObserver();
      updateSearchResultScrollMetrics();
    });
  },
  { deep: false }
);

watch(
  [() => !!props.showSearchPanel, () => searchPanelTab.value, () => searchResolvedTextQuery.value, () => searchMarkerKeys.value.join('|'), contentRevision],
  ([visible]) => {
    if (!visible) {
      stopSearchResultScrollbarDrag();
      teardownSearchResultResizeObserver();
      resetSearchResultScrollMetrics();
      return;
    }
    nextTick().then(() => {
      bindSearchResultResizeObserver();
      updateSearchResultScrollMetrics();
    });
  },
  { immediate: true, deep: false }
);

watch(
  () => searchResolvedTextQuery.value,
  () => {
    selectedSearchResultNodeId.value = null;
  }
);

watch(
  () => searchTextResults.value.map((entry) => `${entry.nodeId}:${entry.singleLineText}`).join('|'),
  () => {
    selectedSearchResultNodeId.value = null;
  }
);

watch(
  selectedIds,
  (nextSelection) => {
    if (isSelectionWatchSuppressed()) return;
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
    primaryId: primarySelectedNodeId.value,
    selectionVersion: selectedIds.value,
  }),
  () => {
    const current = imageInteraction.value;
    if (!current) return;
    if (editingSession.value || !selectedIds.value.has(current.nodeId) || primarySelectedNodeId.value !== current.nodeId) {
      clearImageInteraction('selection-or-editing-changed');
      requestRender();
    }
  }
);

onBeforeUnmount(() => {
  clearSearchTextQueryDebounceTimer();
  stopSearchResultScrollbarDrag();
  teardownSearchResultResizeObserver();
  if (activeMindPerfCameraFpsSession) finishMindPerfCameraFpsSession(activeMindPerfCameraFpsSession, 'unmount');
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
  cancelPendingDragBootstrap();
  if (drawRafId != null) cancelAnimationFrame(drawRafId);
  if (emitNodeCountRafId != null) cancelAnimationFrame(emitNodeCountRafId);
  if (syncStylePanelRafId != null) cancelAnimationFrame(syncStylePanelRafId);
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
.mind-ime-capture {
  position: absolute;
  left: -10000px;
  top: -10000px;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: 0;
  border: 0;
  outline: none;
  resize: none;
  overflow: hidden;
  background: transparent;
  color: transparent;
  caret-color: transparent;
  opacity: 0;
  pointer-events: none;
  z-index: 7;
  white-space: pre-wrap;
  word-break: break-word;
  box-sizing: border-box;
}

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
  border: none;
  border-radius: 10px;
  outline: none;
  box-shadow: none;
  /* 类似 XMind：禁止浏览器触控默认行为（可选） */
  touch-action: none;
  cursor: default;
}

.main-container:focus,
.main-container:focus-visible {
  outline: none;
  box-shadow: none;
}

.search-panel-shell,
.format-panel-shell {
  flex: 0 0 15%;
  width: 15%;
  min-width: 270px;
  max-width: 15%;
  height: 100%;
  display: flex;
}

.search-panel-shell {
  justify-content: flex-end;
}

.format-panel-shell {
  justify-content: flex-start;
  // padding-right: 10px;
}

.search-panel,
.format-panel {
  width: 100%;
  height: 100%;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.search-panel {
  background:
    linear-gradient(180deg, rgba(248, 252, 254, 0.96), rgba(240, 248, 251, 0.94)),
    #ffffff;
  border: 1px solid rgba(201, 216, 226, 0.96);
  box-shadow:
    0 14px 28px rgba(15, 23, 42, 0.08),
    inset 0 1px 0 rgba(255, 255, 255, 0.84);
}

.format-panel {
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.94), rgba(245, 247, 250, 0.92)),
    #ffffff;
  border: 1px solid rgba(226, 232, 240, 0.92);
  box-shadow:
    0 12px 24px rgba(15, 23, 42, 0.07),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.search-panel-header,
.format-panel-header {
  display: flex;
  gap: 8px;
  padding: 12px;
  border-bottom: 1px solid rgba(226, 232, 240, 0.9);
  background: rgba(255, 255, 255, 0.78);
}

.search-panel-tab,
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

.search-panel-tab:hover,
.format-panel-tab:hover {
  background: rgba(148, 163, 184, 0.14);
  color: #0f172a;
}

.search-panel-tab.is-active {
  background: #0f172a;
  color: #f8fafc;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
}

.format-panel-tab.is-active {
  background: #0f172a;
  color: #f8fafc;
  box-shadow: 0 8px 18px rgba(15, 23, 42, 0.16);
}

.search-panel-body,
.format-panel-body {
  position: relative;
  flex: 1;
  min-height: 0;
  padding: 14px 12px 18px;
}

.search-panel-body {
  overflow: hidden;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.format-panel-body {
  overflow-y: auto;
}

.search-pane {
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  min-width: 0;
  flex: 1;
}

.search-query-card {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 14px;
  border-radius: 16px;
  border: 1px solid rgba(203, 213, 225, 0.9);
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.99), rgba(241, 245, 249, 0.98)),
    #ffffff;
  box-shadow: 0 10px 22px rgba(15, 23, 42, 0.05);
  min-width: 0;
}

.search-query-label {
  color: #0f172a;
  font-size: 12px;
  font-weight: 800;
  letter-spacing: 0.06em;
}

.search-query-input {
  width: 100%;
  max-width: 100%;
  height: 38px;
  padding: 0 12px;
  border: 1px solid rgba(148, 163, 184, 0.34);
  border-radius: 12px;
  outline: none;
  box-sizing: border-box;
  background: rgba(255, 255, 255, 0.95);
  color: #0f172a;
  font-size: 13px;
  font-weight: 600;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease;
}

.search-query-input:focus {
  border-color: rgba(14, 116, 144, 0.55);
  box-shadow: 0 0 0 4px rgba(14, 116, 144, 0.12);
}

.search-action-row {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 8px;
}

.search-action-button {
  height: 32px;
  border: 1px solid rgba(148, 163, 184, 0.28);
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.96);
  color: #0f172a;
  font-size: 12px;
  font-weight: 700;
  cursor: pointer;
  transition:
    border-color 0.16s ease,
    background-color 0.16s ease,
    transform 0.16s ease,
    box-shadow 0.16s ease;
}

.search-action-button:hover:not(:disabled) {
  transform: translateY(-1px);
  border-color: rgba(14, 116, 144, 0.34);
  background: rgba(240, 249, 255, 0.95);
  box-shadow: 0 8px 14px rgba(14, 116, 144, 0.08);
}

.search-action-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
  box-shadow: none;
}

.search-query-hint {
  margin: 0;
  color: #64748b;
  font-size: 11px;
  line-height: 1.45;
}

.search-marker-groups {
  display: flex;
  flex-direction: column;
  gap: 18px;
  flex: 0 0 auto;
  min-height: 0;
  max-height: 30%;
  overflow-y: auto;
  overflow-x: hidden;
  padding-right: 4px;
}

.search-results-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  min-height: 22px;
  padding: 0 2px;
}

.search-results-count {
  color: #475569;
  font-size: 12px;
  font-weight: 700;
  letter-spacing: 0.03em;
}

.search-results-chip {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  background: rgba(14, 116, 144, 0.11);
  color: #155e75;
  font-size: 11px;
  font-weight: 700;
}

.search-result-shell {
  position: relative;
  flex: 1;
  min-height: 0;
  min-width: 0;
  padding-top: 4px;
}

.search-result-list-shell {
  flex: 1;
  height: 100%;
  min-height: 0;
  min-width: 0;
  overflow: auto;
  box-sizing: border-box;
  padding-right: 14px;
  padding-bottom: 14px;
  scrollbar-width: none;
}

.search-result-list-shell::-webkit-scrollbar {
  width: 0;
  height: 0;
}

.search-result-list {
  display: flex;
  flex-direction: column;
  gap: 6px;
  width: max-content;
  min-width: 100%;
}

.search-result-item {
  width: max-content;
  min-width: 100%;
  display: grid;
  grid-template-columns: max-content auto;
  align-items: start;
  gap: 4px;
  padding: 7px 9px;
  border: 1px solid rgba(203, 213, 225, 0.88);
  border-radius: 12px;
  background: rgba(255, 255, 255, 0.97);
  box-shadow: 0 4px 10px rgba(15, 23, 42, 0.03);
  text-align: left;
  cursor: pointer;
  transition:
    border-color 0.18s ease,
    box-shadow 0.18s ease,
    transform 0.18s ease,
    background-color 0.18s ease;
}

.search-result-item:hover {
  transform: translateY(-1px);
  border-color: rgba(14, 116, 144, 0.3);
  box-shadow: 0 8px 16px rgba(14, 116, 144, 0.08);
}

.search-result-item.is-active {
  border-color: rgba(14, 116, 144, 0.6);
  background: rgba(240, 249, 255, 0.98);
  box-shadow:
    0 0 0 3px rgba(14, 116, 144, 0.12),
    0 8px 16px rgba(14, 116, 144, 0.08);
}

.search-result-order {
  color: #64748b;
  font-size: 11px;
  font-weight: 800;
  line-height: 1.4;
}

.search-result-text {
  color: #0f172a;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.4;
  white-space: nowrap;
}

.search-result-text[data-empty='true']::before {
  content: ' ';
}

.search-empty-state {
  flex: 1;
  min-height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 14px;
  border: 1px dashed rgba(148, 163, 184, 0.3);
  border-radius: 16px;
  background: rgba(248, 250, 252, 0.86);
  color: #64748b;
  font-size: 12px;
  font-weight: 600;
  line-height: 1.6;
  text-align: center;
}

.search-panel-scrollbar {
  position: absolute;
  z-index: 2;
  border: 1px solid rgba(203, 213, 225, 0.75);
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.52);
  backdrop-filter: blur(8px);
  user-select: none;
}

.search-panel-scrollbar-x {
  left: 0;
  right: 14px;
  bottom: 0;
  height: 8px;
}

.search-panel-scrollbar-y {
  top: 4px;
  right: 0;
  bottom: 14px;
  width: 8px;
}

.search-panel-scrollbar-thumb {
  position: absolute;
  left: 0;
  top: 0;
  border-radius: 999px;
  background: linear-gradient(180deg, rgba(148, 163, 184, 0.34) 0%, rgba(100, 116, 139, 0.46) 100%);
  box-shadow: inset 0 1px 0 rgba(255, 255, 255, 0.5);
  cursor: pointer;
}

.search-panel-scrollbar-thumb.is-dragging {
  background: linear-gradient(180deg, rgba(100, 116, 139, 0.5) 0%, rgba(71, 85, 105, 0.62) 100%);
}

.search-panel-scrollbar-thumb.is-disabled {
  cursor: default;
  opacity: 0.55;
}

.search-panel-scrollbar-x .search-panel-scrollbar-thumb {
  height: 100%;
}

.search-panel-scrollbar-y .search-panel-scrollbar-thumb {
  width: 100%;
}

.search-marker-groups::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.search-marker-groups::-webkit-scrollbar-track {
  background: rgba(226, 232, 240, 0.8);
  border-radius: 999px;
}

.search-marker-groups::-webkit-scrollbar-thumb {
  background: rgba(148, 163, 184, 0.8);
  border-radius: 999px;
  border: 2px solid rgba(226, 232, 240, 0.8);
}

.style-panel {
  position: relative;
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

.style-section+.style-section {
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

.style-control-mask-shell {
  position: relative;
}

.style-control-mask {
  position: absolute;
  inset: 0;
  border-radius: 14px;
  background: rgba(241, 245, 249, 0.68);
  backdrop-filter: saturate(0.85);
  pointer-events: auto;
  z-index: 2;
}

.style-font-grid.is-editing-locked,
.style-size-grid.is-editing-locked {
  opacity: 0.45;
  filter: saturate(0.75);
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

.search-marker-tile.is-selected {
  background: rgba(14, 116, 144, 0.12);
  border-color: rgba(14, 116, 144, 0.38);
  box-shadow: 0 0 0 3px rgba(14, 116, 144, 0.12);
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
  z-index: 4;
  background: rgba(241, 245, 249, 0.7);
  backdrop-filter: saturate(0.85);
  pointer-events: auto;
}

.format-panel-body.is-disabled>.style-panel,
.format-panel-body.is-disabled>.marker-panel {
  opacity: 0.45;
  filter: saturate(0.75);
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

.mind-close-dialog-overlay {
  position: fixed;
  inset: 0;
  z-index: 3000;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24px;
  background:
    radial-gradient(circle at top, rgba(34, 197, 94, 0.1), transparent 32%),
    rgba(15, 23, 42, 0.32);
  backdrop-filter: blur(10px) saturate(1.08);
  -webkit-backdrop-filter: blur(10px) saturate(1.08);
}

.mind-close-dialog {
  position: relative;
  width: min(460px, calc(100vw - 32px));
  overflow: hidden;
  border-radius: 24px;
  padding: 24px;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(247, 250, 252, 0.96));
  box-shadow:
    0 28px 72px rgba(15, 23, 42, 0.18),
    inset 0 1px 0 rgba(255, 255, 255, 0.92);
  border: 1px solid rgba(226, 232, 240, 0.92);
}

.mind-close-dialog-ornament {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 110px;
  pointer-events: none;
  background:
    radial-gradient(circle at 18% 18%, rgba(34, 197, 94, 0.14), transparent 34%),
    radial-gradient(circle at 82% 0%, rgba(16, 185, 129, 0.1), transparent 26%);
}

.mind-close-dialog-brand {
  position: relative;
  display: flex;
  align-items: flex-start;
  gap: 16px;
}

.mind-close-dialog-logo-shell {
  flex: 0 0 auto;
  width: 58px;
  height: 58px;
  border-radius: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background:
    linear-gradient(180deg, rgba(255, 255, 255, 0.96), rgba(240, 253, 244, 0.92));
  border: 1px solid rgba(34, 197, 94, 0.18);
  box-shadow:
    inset 0 1px 0 rgba(255, 255, 255, 0.88),
    0 10px 24px rgba(15, 23, 42, 0.08);
}

.mind-close-dialog-logo {
  width: 30px;
  height: 30px;
  display: block;
}

.mind-close-dialog-copy {
  min-width: 0;
  padding-top: 2px;
}

.mind-close-dialog-title {
  margin: 0;
  color: #0f172a;
  font-size: 21px;
  line-height: 1.2;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.mind-close-dialog-subtitle {
  margin: 10px 0 0 0;
  color: #475569;
  font-size: 13px;
  line-height: 1.7;
}

.mind-close-dialog-actions {
  position: relative;
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 26px;
}

.mind-close-dialog-button {
  height: 38px;
  padding: 0 16px;
  border-radius: 12px;
  border: 1px solid transparent;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.01em;
  cursor: pointer;
  transition:
    transform 0.16s ease,
    box-shadow 0.16s ease,
    background-color 0.16s ease,
    border-color 0.16s ease,
    color 0.16s ease;
}

.mind-close-dialog-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
  transform: none;
  box-shadow: none;
}

.mind-close-dialog-button:not(:disabled):hover {
  transform: translateY(-1px);
}

.mind-close-dialog-button--save {
  color: #ffffff;
  background: linear-gradient(135deg, #111827, #0f172a);
  box-shadow: 0 12px 24px rgba(15, 23, 42, 0.16);
}

.mind-close-dialog-button--save:not(:disabled):hover {
  box-shadow: 0 16px 28px rgba(15, 23, 42, 0.22);
}

.mind-close-dialog-button--ghost {
  color: #0f172a;
  background: rgba(255, 255, 255, 0.9);
  border-color: rgba(148, 163, 184, 0.38);
}

.mind-close-dialog-button--ghost:not(:disabled):hover {
  border-color: rgba(100, 116, 139, 0.5);
  box-shadow: 0 10px 20px rgba(15, 23, 42, 0.08);
}

.mind-close-dialog-button--neutral {
  color: #475569;
  background: rgba(241, 245, 249, 0.9);
  border-color: rgba(226, 232, 240, 0.95);
}

.mind-close-dialog-button--neutral:not(:disabled):hover {
  color: #334155;
  border-color: rgba(203, 213, 225, 0.98);
}

.mind-close-dialog-fade-enter-active,
.mind-close-dialog-fade-leave-active {
  transition: opacity 0.18s ease;
}

.mind-close-dialog-fade-enter-active .mind-close-dialog,
.mind-close-dialog-fade-leave-active .mind-close-dialog {
  transition:
    transform 0.22s ease,
    opacity 0.22s ease;
}

.mind-close-dialog-fade-enter-from,
.mind-close-dialog-fade-leave-to {
  opacity: 0;
}

.mind-close-dialog-fade-enter-from .mind-close-dialog,
.mind-close-dialog-fade-leave-to .mind-close-dialog {
  opacity: 0;
  transform: translateY(10px) scale(0.98);
}

.mind-image-preview-overlay {
  position: fixed;
  inset: 0;
  z-index: 3100;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 32px;
  background: rgba(2, 6, 23, 0.72);
  backdrop-filter: blur(10px) saturate(1.04);
  -webkit-backdrop-filter: blur(10px) saturate(1.04);
}

.mind-image-preview-shell {
  position: relative;
  max-width: min(92vw, 1400px);
  max-height: min(90vh, 980px);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12px;
}

.mind-image-preview-close {
  position: absolute;
  top: -10px;
  right: -10px;
  width: 34px;
  height: 34px;
  border: 1px solid rgba(255, 255, 255, 0.18);
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.72);
  color: #ffffff;
  font-size: 22px;
  line-height: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  box-shadow: 0 10px 28px rgba(15, 23, 42, 0.22);
}

.mind-image-preview-image {
  display: block;
  max-width: min(92vw, 1400px);
  max-height: min(84vh, 920px);
  object-fit: contain;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.96);
  box-shadow:
    0 24px 60px rgba(15, 23, 42, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.8);
}

.mind-image-preview-caption {
  max-width: min(80vw, 960px);
  padding: 8px 14px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.58);
  color: rgba(255, 255, 255, 0.92);
  font-size: 12px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.mind-image-preview-fade-enter-active,
.mind-image-preview-fade-leave-active {
  transition: opacity 0.18s ease;
}

.mind-image-preview-fade-enter-active .mind-image-preview-shell,
.mind-image-preview-fade-leave-active .mind-image-preview-shell {
  transition:
    transform 0.2s ease,
    opacity 0.2s ease;
}

.mind-image-preview-fade-enter-from,
.mind-image-preview-fade-leave-to {
  opacity: 0;
}

.mind-image-preview-fade-enter-from .mind-image-preview-shell,
.mind-image-preview-fade-leave-to .mind-image-preview-shell {
  opacity: 0;
  transform: translateY(8px) scale(0.985);
}
</style>
