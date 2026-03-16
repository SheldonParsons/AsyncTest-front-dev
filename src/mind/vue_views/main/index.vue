<template>
  <div class="main-container" ref="viewportRef">
    <canvas
      ref="canvasRef"
      class="mind-canvas"
      :width="viewportW"
      :height="viewportH"
      @pointerdown="onCanvasPointerDown"
      @pointermove="onCanvasPointerMove"
      @pointerleave="onCanvasPointerLeave"
      @pointerup="onCanvasPointerUp"
      @pointercancel="onCanvasPointerCancel"
      @lostpointercapture="onCanvasLostPointerCapture"
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
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue';
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
import { collectSubtreeNodeIds, createSubtreeSnapshot } from '@/mind/core/commands/subtreeSnapshot';
import type { DragDropState, DragDropTarget } from '@/mind/core/drag/types';
import { createHistory, type Command, type HistorySnapshot } from '@/mind/core/history';
import { compareSelectionTargetInfo, getSelectionTargetInfo, normalizeSelectionTargets } from '@/mind/core/selection/normalizeSelection';
import { ensureMindRoots } from './actions/useDocUtils';
import { useLayout } from './actions/useLayout';
import { MAX_CAMERA_SCALE, MIN_CAMERA_SCALE, getAxisConstraint, useCamera } from './actions/useCamera';
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

const props = defineProps<{ doc?: any; filePath?: any; docId?: string; windowKey?: any }>();

const viewportRef = ref<HTMLDivElement | null>(null);
const canvasRef = ref<HTMLCanvasElement | null>(null);

const viewportW = ref(1200);
const viewportH = ref(800);
const worldBoxes = ref<WorldBoxes>(new Map());
const hoverNodeId = ref<string | null>(null);
const editingNodeId = ref<string | null>(null);
const isComposing = ref(false);
const primarySelectedNodeId = ref<string | null>(null);
const historySnapshot = ref<HistorySnapshot>({
  canUndo: false,
  canRedo: false,
  undoDepth: 0,
  redoDepth: 0,
  lastCommandName: null,
});
const editorDebugState = ref({
  lastDeletedNodeId: null as string | null,
  lastPastedRootId: null as string | null,
  filteredOutDescendantsCount: 0,
  rebuildCountInLastCommand: 0,
});
const dragState = ref<DragDropState>({
  isDragging: false,
  dragRoots: [],
  dragRootTexts: [],
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
}

// camera（唯一真相）
const { layoutLocal, layoutBounds, rebuildLayout } = useLayout(props, canvasRef);
const { camera, clampScale, zoomAtViewportPoint, panByPixels, setCamera, fitAndCenterCamera, constrainToBounds } =
  useCamera(viewportRef, layoutBounds);

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
  primarySelectedNodeId,
  historySnapshot,
  internalClipboardState,
  editorDebugState
);

// persistence（只存 camera）
const { schedulePersistViewport, restoreViewportFromDoc, clearPersistTimer } =
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

function lerp(from: number, to: number, ratio: number) {
  return from + (to - from) * ratio;
}

function getInitialFitScale() {
  const bounds = layoutBounds.value;
  if (!bounds) return 1;

  const fitX = (viewportW.value - SCROLLBAR_FIT_PADDING * 2) / Math.max(bounds.width, 1);
  const fitY = (viewportH.value - SCROLLBAR_FIT_PADDING * 2) / Math.max(bounds.height, 1);
  return clampScale(Math.min(1, fitX, fitY), MIN_CAMERA_SCALE, 1);
}

function getTargetThumbRatio() {
  const scale = camera.value.scale;
  const initialScale = getInitialFitScale();

  if (scale <= initialScale) {
    const range = Math.max(initialScale - MIN_CAMERA_SCALE, 0.0001);
    const ratio = (scale - MIN_CAMERA_SCALE) / range;
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
  const bounds = layoutBounds.value;
  if (!bounds) return { visible: false, scrollable: false, thumbSize: 0, thumbOffset: 0, trackSize: 0, minOffset: 0, maxOffset: 0 };

  const trackSize = Math.max(0, viewportW.value - SCROLLBAR_TRACK_PADDING * 2);
  return buildScrollbarState(viewportW.value, trackSize, bounds.minX, bounds.maxX, camera.value.tx);
});

const verticalScrollbar = computed(() => {
  const bounds = layoutBounds.value;
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
const MARQUEE_START_THRESHOLD_PX = 5;

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

function setSelection(nodeIds: Iterable<string>, primaryId?: string | null) {
  const nextIds = Array.from(new Set(nodeIds));
  selectedIds.value = new Set(nextIds);
  const nextPrimaryId =
    primaryId && nextIds.includes(primaryId) ? primaryId : nextIds[nextIds.length - 1] ?? null;
  primarySelectedNodeId.value = nextPrimaryId;
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

function startEditing(nodeId: string) {
  editingNodeId.value = nodeId;
  if (DEBUG_RENDER_DIAGNOSTICS) console.debug('[mind-start-editing]', { nodeId });
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

async function applyDocumentMutation(
  reason: string,
  options?: { ensureVisibleNodeId?: string | null; ensureVisibleNodeIds?: string[] }
) {
  editorDebugState.value.rebuildCountInLastCommand += 1;
  await redrawAllInternal(reason, { restoreViewport: false });
  if (options?.ensureVisibleNodeIds?.length) {
    ensureNodesVisible(options.ensureVisibleNodeIds);
    return;
  }
  if (options?.ensureVisibleNodeId) ensureNodeVisible(options.ensureVisibleNodeId);
}

function createNodeRecord(nodeId: string) {
  return {
    id: nodeId,
    text: NEW_NODE_TEXT,
    children: [],
    images: [],
  };
}

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
  return getMindNodes()?.[nodeId]?.text ?? '新增主题';
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
  if (!canvas?.setPointerCapture) return;
  try {
    canvas.setPointerCapture(pointerId);
  } catch (error) {
    if (DEBUG_RENDER_DIAGNOSTICS) {
      console.debug('[mind-pointer-capture-failed]', { reason, pointerId, error });
    }
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
  resetDragState();
  if (DEBUG_RENDER_DIAGNOSTICS && reason) {
    console.debug('[mind-drag-clear]', { reason });
  }
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

function cancelInteraction(reason: string) {
  if (interactionState.value.mode === 'marqueeSelecting') {
    clearMarqueeTransient(reason);
  }
  if (interactionState.value.mode === 'draggingNodes') {
    clearDragTransient(reason);
  }
  resetInteractionToIdle(reason);
  requestRender();
}

function beginDragging(screenX: number, screenY: number) {
  const candidate = interactionState.value.dragCandidate;
  if (!candidate) return;
  const draggedSubtreeNodeIds = collectDraggedSubtreeIds(candidate.dragRoots);
  setDragState({
    isDragging: true,
    dragRoots: candidate.dragRoots,
    dragRootTexts: candidate.dragRoots.map(getNodeLabel),
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
      isNoOp: !result.command,
      computedBeforeAfterChanged: result.changed,
      beforeHash: result.beforeHash,
      afterHash: result.afterHash,
    });
  }

  clearDragTransient(reason);
  if (result.command) executeCommand(result.command);
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
      startEditing,
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
      startEditing,
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
      startEditing,
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
      startEditing,
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
      startEditing(newNodeId);
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
      startEditing(newNodeId);
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
      startEditing(newNodeId);
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
      startEditing(newNodeId);
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
  MIN_CAMERA_SCALE,
  MAX_CAMERA_SCALE,
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

  const paddingPx = 48;
  const topLeft = worldToScreen(camera.value, rect.x1, rect.y1);
  const bottomRight = worldToScreen(camera.value, rect.x2, rect.y2);

  let dx = 0;
  if (topLeft.x < paddingPx) dx = paddingPx - topLeft.x;
  else if (bottomRight.x > viewportW.value - paddingPx) dx = viewportW.value - paddingPx - bottomRight.x;

  let dy = 0;
  if (topLeft.y < paddingPx) dy = paddingPx - topLeft.y;
  else if (bottomRight.y > viewportH.value - paddingPx) dy = viewportH.value - paddingPx - bottomRight.y;

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
  await nextTick();
  resizeToViewport();

  if (props.doc) ensureMindRoots(props.doc);

  rebuildLayout();
  rebuildSpatialCaches();

  if (options.restoreViewport) {
    hasSavedViewport.value = restoreViewportFromDoc();

    if (!hasSavedViewport.value) {
      hasAppliedInitialFit.value = false;
      maybeApplyInitialFit(`${reason}:initial-fit`);
    } else {
      withCameraResetLog(`${reason}:constrain-after-restore`, () => constrainToBounds());
    }
  } else {
    withCameraResetLog(`${reason}:constrain-without-restore`, () => constrainToBounds());
  }

  draw();
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
  if (interactionState.value.mode !== 'idle') {
    cancelInteraction('pointerdown-reentry');
  }
  const screenPoint = getPointerScreenPoint(event);
  if (!screenPoint) return;
  const downWorld = screenToWorld(camera.value, screenPoint.x, screenPoint.y);
  const hitId = hitTest(screenPoint.x, screenPoint.y);

  capturePointer(event.pointerId, 'pointerdown');

  if (hitId) {
    event.preventDefault();
    editingNodeId.value = null;
    if (event.ctrlKey || event.metaKey) {
      const nextSelection = new Set(selectedIds.value);
      if (nextSelection.has(hitId)) nextSelection.delete(hitId);
      else nextSelection.add(hitId);
      setSelection(nextSelection, hitId);
      resetInteractionToIdle('toggle-node-selection');
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
    additiveSelection: event.ctrlKey || event.metaKey,
    baseSelectionIds: getSelectedNodeIds(),
    shouldClearSelectionOnClick: !(event.ctrlKey || event.metaKey),
    dragCandidate: null,
  };
  logInteractionTransition('pointerdown-blank', 'pointerDownBlank', {
    shouldClearSelectionOnClick: !(event.ctrlKey || event.metaKey),
  });
}

function onCanvasPointerMove(event: PointerEvent) {
  const screenPoint = getPointerScreenPoint(event);
  if (!screenPoint) return;

  if (interactionState.value.pointerId == null || event.pointerId !== interactionState.value.pointerId) {
    updateHoverFromScreenPoint(screenPoint.x, screenPoint.y);
    return;
  }

  if ((event.buttons & 1) !== 1 && interactionState.value.mode !== 'idle') {
    cancelInteraction('buttonsReleased');
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
}

function onCanvasPointerLeave() {
  if (interactionState.value.mode !== 'idle' && interactionState.value.pointerId != null) {
    const canvas = canvasRef.value;
    const hasCapture = canvas?.hasPointerCapture?.(interactionState.value.pointerId) ?? false;
    if (!hasCapture) {
      cancelInteraction('pointerleave-without-capture');
      return;
    }
  }
  if (!hoverNodeId.value) return;
  hoverNodeId.value = null;
  requestRender();
}

function onCanvasPointerUp(event: PointerEvent) {
  if (interactionState.value.pointerId == null || event.pointerId !== interactionState.value.pointerId) return;

  const mode = interactionState.value.mode;
  if (mode === 'pointerDownBlank') {
    if (interactionState.value.shouldClearSelectionOnClick) {
      setSelection([], null);
      requestRender();
    }
  } else if (mode === 'marqueeSelecting') {
    finishMarqueeSelection();
  } else if (mode === 'draggingNodes') {
    finalizeDrop('pointerup');
    clearDragTransient('pointerup');
  } else if (mode === 'pointerDownOnNode') {
    requestRender();
  }

  resetInteractionToIdle('pointerup');
}

function onCanvasPointerCancel(event: PointerEvent) {
  if (interactionState.value.pointerId != null && event.pointerId === interactionState.value.pointerId) {
    cancelInteraction('pointercancel');
  }
}

function onCanvasLostPointerCapture(event: PointerEvent) {
  if (interactionState.value.pointerId != null && event.pointerId === interactionState.value.pointerId && interactionState.value.mode !== 'idle') {
    cancelInteraction('lostpointercapture');
  }
}

function onWindowKeyDown(event: KeyboardEvent) {
  if (interactionState.value.mode === 'draggingNodes' && event.key === 'Escape') {
    event.preventDefault();
    event.stopPropagation();
    cancelInteraction('escape');
    return;
  }
  if (event.isComposing || isTextEditingActive(event.target)) return;

  const lowerKey = event.key.toLowerCase();
  const isModifierPressed = event.metaKey || event.ctrlKey;
  const isUndoShortcut = isModifierPressed && !event.altKey && lowerKey === 'z' && !event.shiftKey;
  const isRedoShortcut =
    isModifierPressed && !event.altKey && (lowerKey === 'y' || (lowerKey === 'z' && event.shiftKey));
  const isCopyShortcut = isModifierPressed && !event.altKey && lowerKey === 'c';
  const isCutShortcut = isModifierPressed && !event.altKey && lowerKey === 'x';
  const isPasteShortcut = isModifierPressed && !event.altKey && lowerKey === 'v';
  const isDeleteShortcut = event.key === 'Backspace' || event.key === 'Delete';
  const isEnterShortcut = event.key === 'Enter';
  const isTabShortcut = event.key === 'Tab';
  const shouldPreventDefault =
    isTabShortcut ||
    isEnterShortcut ||
    isDeleteShortcut ||
    isCopyShortcut ||
    isCutShortcut ||
    isPasteShortcut ||
    isUndoShortcut ||
    isRedoShortcut;

  if (shouldPreventDefault) {
    event.preventDefault();
    event.stopPropagation();
  }

  if (isUndoShortcut) {
    editingNodeId.value = null;
    resetCommandDebugState();
    history.undo();
    return;
  }

  if (isRedoShortcut) {
    editingNodeId.value = null;
    resetCommandDebugState();
    history.redo();
    return;
  }

  const primarySelectedId = getPrimarySelectedId();
  const selectedNodeIds = getSelectedNodeIds();
  const selectedCount = selectedNodeIds.length;

  if (isCopyShortcut) {
    if (!selectedCount) return;
    const normalized = normalizeSelectedTargets(getMindNodes() ?? {}, selectedNodeIds, {
      rootNodeId: getRootNodeId(),
      allowRoot: true,
      collapseToRootIfSelected: true,
    });
    setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
    performCopy(normalized.finalTargets.map((target) => target.nodeId));
    return;
  }

  if (isCutShortcut) {
    const normalized = normalizeSelectedTargets(getMindNodes() ?? {}, selectedNodeIds, {
      rootNodeId: getRootNodeId(),
      allowRoot: false,
    });
    setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
    if (!normalized.finalTargets.length) return;
    editingNodeId.value = null;
    executeCommand(
      normalized.finalTargets.length === 1
        ? createCutCommand(normalized.finalTargets[0].nodeId)
        : createBatchCutSelectionCommand(normalized.finalTargets.map((target) => target.nodeId))
    );
    return;
  }

  if (isPasteShortcut) {
    if (!primarySelectedId) return;
    editingNodeId.value = null;
    const clipboardState = getInternalClipboard();
    executeCommand(
      clipboardState.type === 'multi-subtree'
        ? createBatchPasteCommand(primarySelectedId, clipboardState)
        : createPasteCommand(primarySelectedId)
    );
    return;
  }

  if (!primarySelectedId) return;

  if (isDeleteShortcut) {
    const normalized = normalizeSelectedTargets(getMindNodes() ?? {}, selectedNodeIds, {
      rootNodeId: getRootNodeId(),
      allowRoot: false,
    });
    setFilteredOutDescendantsCount(normalized.filteredOutDescendantsCount);
    if (!normalized.finalTargets.length) return;
    editingNodeId.value = null;
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
    fitAndCenterCamera();
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
  window.electronAPI.on('wm:before-close', async (_event: any, { key }: any) => {
    const allow = confirm('窗口有未保存内容，确定关闭吗？');
    await window.electronAPI.wm.closeResponse({ key, allow });
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
  window.addEventListener('compositionstart', onCompositionStart, true);
  window.addEventListener('compositionend', onCompositionEnd, true);
});

watch(
  () => props.doc,
  () => {
    if (!props.doc) return;
    ensureMindRoots(props.doc);
    redrawAll('watch:doc');
  },
  { deep: true }
);

watch(
  selectedIds,
  (nextSelection) => {
    if (!nextSelection.size) {
      primarySelectedNodeId.value = null;
      return;
    }
    if (primarySelectedNodeId.value && nextSelection.has(primarySelectedNodeId.value)) return;
    primarySelectedNodeId.value = Array.from(nextSelection).at(-1) ?? null;
  },
  { deep: false }
);

onBeforeUnmount(() => {
  clearPersistTimer();
  cleanup();
  cleanupMarquee();
  cancelInteraction('beforeUnmount');
  onScrollbarMouseUp();
  hoverNodeId.value = null;
  resizeObserver?.disconnect();
  resizeObserver = null;
  if (drawRafId != null) cancelAnimationFrame(drawRafId);
  if (viewportRef.value) viewportRef.value.removeEventListener('wheel', onWheel as any);
  window.removeEventListener('resize', handleResize);
  window.removeEventListener('keydown', onWindowKeyDown);
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
