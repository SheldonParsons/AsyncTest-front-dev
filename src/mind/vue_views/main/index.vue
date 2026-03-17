<template>
  <div class="main-container" ref="viewportRef">
    <canvas
      ref="canvasRef"
      class="mind-canvas"
      :width="canvasPixelW"
      :height="canvasPixelH"
      :style="canvasStyle"
      @dblclick="onCanvasDoubleClick"
      @pointerdown="onCanvasPointerDown"
      @pointermove="onCanvasPointerMove"
      @pointerleave="onCanvasPointerLeave"
      @pointerup="onCanvasPointerUp"
      @pointercancel="onCanvasPointerCancel"
      @lostpointercapture="onCanvasLostPointerCapture"
    />
    <LexicalNodeEditorOverlay
      v-if="editingSession"
      :visible="!!editingSession"
      :overlay-root-style="editingOverlayRootStyle"
      :text-box-rect="editingTextBoxRect"
      :editor-shell-style="editingEditorShellStyle"
      :calibration-style="editingCalibrationStyle"
      :inner-translate-ypx="editingOverlayInnerTranslateYPx"
      :node-id="editingSession.nodeId"
      :initial-state="editingDraftLexicalState"
      :mode="editingSession.mode"
      :caret-placement="editingSession.caretPlacement"
      @change="onLexicalEditorChange"
      @commit="commitEditingSession"
      @cancel="cancelEditingSession"
    />

    <div v-if="horizontalScrollbar.visible" class="mind-scrollbar mind-scrollbar-x">
      <div class="mind-scrollbar-track">
        <div
          class="mind-scrollbar-thumb"
          :class="{ 'is-active': isScrollbarDragging }"
          :style="{
            width: `${horizontalScrollbar.thumbSize}px`,
            transform: `translateX(${horizontalScrollbar.thumbOffset}px)`,
          }"
          @mousedown.stop.prevent="onScrollbarMouseDown('x', $event)"
        />
      </div>
    </div>

    <div v-if="verticalScrollbar.visible" class="mind-scrollbar mind-scrollbar-y">
      <div class="mind-scrollbar-track">
        <div
          class="mind-scrollbar-thumb"
          :class="{ 'is-active': isScrollbarDragging }"
          :style="{
            height: `${verticalScrollbar.thumbSize}px`,
            transform: `translateY(${verticalScrollbar.thumbOffset}px)`,
          }"
          @mousedown.stop.prevent="onScrollbarMouseDown('y', $event)"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
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
import { cloneNodeImage, getNodeImage, getNodeLexicalState, getNodePlainText, type MindNodeImage } from '@/mind/core/nodeContent';
import { layoutOverlayTextLines } from '@/mind/core/dragDrop/overlayTextLayout';
import type { DragDropState, DragDropTarget } from '@/mind/core/drag/types';
import { createHistory, type Command, type HistorySnapshot } from '@/mind/core/history';
import { lexicalEditorManager } from '@/mind/core/lexicalEditorManager';
import {
  cloneLexicalState,
  lexicalStateFromPlainText,
  richTextFromLexicalState,
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
import { SPATIAL_GRID_CELL_SIZE } from './constants';
import { DEBUG_RENDER_DIAGNOSTICS, logCameraReset, logRendererDebugInstructions } from './diagnostics';
import { getWorldViewportRect, pointInRect, rectContains, screenToWorld, worldToScreen } from './geom/rect';
import { buildWorldBoxes, type WorldBoxes } from './geom/worldBoxes';
import { UniformGridSpatialIndex } from './grid/spatialIndex';
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
  computeNodeTextGeometry,
  getNodeTextStyle,
  measureTextVerticalMetrics,
  NODE_CONTENT_MAX_W,
  NODE_MAX_W,
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

const props = defineProps<{ doc?: any; filePath?: any; docId?: string; windowKey?: any }>();
const emit = defineEmits<{
  (event: 'filePathChange', value: string | null): void;
  (event: 'saveStateChange', value: { isDirty: boolean; isSaving: boolean; displayName: string }): void;
}>();

const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const viewportW = ref(1200);
const viewportH = ref(800);
const canvasDpr = ref(1);
const canvasPixelW = ref(1200);
const canvasPixelH = ref(800);
const worldBoxes = ref<WorldBoxes>(new Map());
const hoverNodeId = ref<string | null>(null);
const editingNodeId = ref<string | null>(null);
const editingSession = ref<null | {
  nodeId: string;
  initialLexicalState: SerializedLexicalEditorState;
  mode: 'append' | 'replace';
  caretPlacement: 'start' | 'end' | 'none';
}> (null);
const editingDraftLexicalState = ref<SerializedLexicalEditorState>(getNodeLexicalState(null));
const editingPreview = ref<null | {
  nodeId: string;
  liveLexicalState: SerializedLexicalEditorState;
  measuredTextW: number;
  measuredTextH: number;
  computedNodeW: number;
  computedNodeH: number;
}> (null);
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
    siblings.slice(startIndex, endIndex + 1).forEach((nodeId) => nextSelection.add(nodeId));
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
  return getNodeImageWorldRect(nodeRect, imageSize);
}

function setCanvasCursor(cursor: string) {
  const canvas = canvasRef.value;
  if (!canvas) return;
  canvas.style.cursor = cursor;
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
  return {
    transform: `translate(${camera.value.tx}px, ${camera.value.ty}px) scale(${camera.value.scale})`,
    transformOrigin: '0 0',
  };
});

const editingCanvasTopLeadingPx = computed(() => {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  const canvas = canvasRef.value;
  if (!session || !node || !canvas) return 0;
  const ctx = canvas.getContext('2d');
  if (!ctx) return 0;
  const textStyle = getNodeTextStyle(node);
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
  const rect = nodeId ? worldBoxes.value.get(nodeId) : null;
  const canvas = canvasRef.value;
  if (!nodeId || !node || !rect || !canvas) return null;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  const textStyle = getNodeTextStyle(node);
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

const editingEditorShellStyle = computed<CSSProperties>(() => {
  const session = editingSession.value;
  const node = getNodeById(session?.nodeId);
  const textBoxRect = editingTextBoxRect.value;
  if (!session || !node || !textBoxRect) {
    return { display: 'none' };
  }
  const textStyle = getNodeTextStyle(node);

  return {
    position: 'absolute',
    left: `${textBoxRect.x}px`,
    top: `${textBoxRect.y}px`,
    width: `${textBoxRect.width}px`,
    height: `${textBoxRect.height}px`,
    fontFamily: textStyle.fontFamily,
    fontSize: `${textStyle.fontSizePx}px`,
    fontWeight: `${textStyle.fontWeight}`,
    fontStyle: textStyle.fontStyle,
    lineHeight: `${textStyle.lineHeightPx}px`,
    letterSpacing: `${textStyle.letterSpacingPx}px`,
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
  const textStyle = getNodeTextStyle(node);
  return {
    fontFamily: textStyle.fontFamily,
    fontSizePx: textStyle.fontSizePx,
    fontWeight: textStyle.fontWeight,
    fontStyle: textStyle.fontStyle,
    lineHeightPx: textStyle.lineHeightPx,
    letterSpacingPx: textStyle.letterSpacingPx,
  };
});

const editingOverlayInnerTranslateYPx = computed(() => {
  const style = editingCalibrationStyle.value;
  if (!style) return 0;
  return editingCanvasTopLeadingPx.value - getDomTextTopOffset(style);
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
  const textStyle = getNodeTextStyle(node);
  const liveRichText = richTextFromLexicalState(editingDraftLexicalState.value);
  const measuredLayout = measureNodeTextLayout(ctx, liveRichText, new Map(), {
    maxWidth: NODE_TEXT_MAX_WIDTH_PX,
    baseStyle: textStyle,
  });
  const textGeometry = computeNodeTextGeometry(ctx, measuredLayout, textStyle, image);
  let computedNodeW = clampNodeDimension(
    Math.max(measuredLayout.contentWidth, image?.width ?? 0) + NODE_PADDING_X,
    NODE_MIN_W,
    Math.min(NODE_MAX_W, NODE_W_HARD_MAX)
  );
  let computedNodeH = textGeometry.contentBoxTop + textGeometry.contentBoxHeight;
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (DEBUG_RENDER_DIAGNOSTICS) console.debug('[mind-start-editing]', { nodeId, mode });
  void nextTick().then(() => {
    if (DEBUG_RENDER_DIAGNOSTICS) {
      const overlayRoot = document.querySelector('.lexical-editor-root');
      const overlayStyle = overlayRoot instanceof HTMLElement ? window.getComputedStyle(overlayRoot) : null;
      console.debug('[mind-enter-editing]', {
        nodeId,
        mode,
        initialTextLen: getNodePlainText(node).length,
        appliedFont: getNodeTextStyle(node),
        canvasFontString: getNodeTextStyle(node).canvasFontString,
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
  editingDraftLexicalState.value = cloneLexicalState(state);
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

  if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (!DEBUG_RENDER_DIAGNOSTICS) return;
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
    if (DEBUG_RENDER_DIAGNOSTICS) {
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
    if (DEBUG_RENDER_DIAGNOSTICS) {
      console.debug('[mind-pointer-release-failed]', { reason, pointerId, error });
    }
  }
}

function clearDragTransient(reason?: string) {
  stopAutoPanLoop();
  const ghostCleared = dragState.value.draggedSubtreeNodeIds.size > 0;
  resetDragState();
  if (DEBUG_RENDER_DIAGNOSTICS && reason) {
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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

  if (DEBUG_RENDER_DIAGNOSTICS) {
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
    if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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
      debugEnabled: DEBUG_RENDER_DIAGNOSTICS,
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

  if (DEBUG_RENDER_DIAGNOSTICS) {
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

  if (DEBUG_RENDER_DIAGNOSTICS) {
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
      debugEnabled: DEBUG_RENDER_DIAGNOSTICS,
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
      debugEnabled: DEBUG_RENDER_DIAGNOSTICS,
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

function updateHoverFromScreenPoint(screenX: number, screenY: number) {
  if (isMarquee.value || interactionState.value.mode === 'draggingNodes') return;
  const nextHoverId = hitTest(screenX, screenY);
  if (nextHoverId === hoverNodeId.value) return;
  hoverNodeId.value = nextHoverId;
  if (nextHoverId && DEBUG_RENDER_DIAGNOSTICS) console.debug('[mind-hit-test]', { hoverId: nextHoverId });
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
  const hitId = hitTest(event.clientX - rect.left, event.clientY - rect.top);
  if (!hitId) return;
  event.preventDefault();
  event.stopPropagation();
  setSingleSelected(hitId);
  startEditing(hitId, { mode: 'append', caretPlacement: 'end' });
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
    updateImageHover(screenPoint.x, screenPoint.y);
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
  updateImageHover(screenPoint.x, screenPoint.y);
}

function onCanvasPointerLeave() {
  let imageHoverChanged = false;
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (DEBUG_RENDER_DIAGNOSTICS) {
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
  if (editingSession.value && !isTextEditingActive(event.target)) return;
  if (event.isComposing || isTextEditingActive(event.target)) return;

  const isUndoShortcut = isModifierPressed && !event.altKey && lowerKey === 'z' && !event.shiftKey;
  const isRedoShortcut =
    isModifierPressed && !event.altKey && (lowerKey === 'y' || (lowerKey === 'z' && event.shiftKey));
  const isSelectAllShortcut = isModifierPressed && !event.altKey && lowerKey === 'a';
  const isCopyShortcut = isModifierPressed && !event.altKey && lowerKey === 'c';
  const isCutShortcut = isModifierPressed && !event.altKey && lowerKey === 'x';
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
.main-container {
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
