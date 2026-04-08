<template>
  <div class="lexical-overlay-root" :style="overlayRootStyle">
    <div
      ref="editorShellRef"
      class="lexical-editor-shell"
      :style="resolvedEditorShellStyle"
      @pointerdown.stop
      @mousedown.stop
      @click.stop
    >
      <div ref="editorInnerRef" class="lexical-editor-inner" :style="editorInnerStyle">
        <div ref="editorRootRef" class="lexical-editor-root" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch, type CSSProperties } from 'vue';
import { lexicalEditorManager } from '@/mind/core/lexicalEditorManager';
import type { SerializedLexicalEditorState } from '@/mind/core/lexicalState';
import { getDomTextTopOffset, type DomTextCalibrationStyle } from '@/mind/core/text/domTextCalibration';

const props = defineProps<{
  visible: boolean;
  overlayRootStyle: CSSProperties;
  textBoxRect: { x: number; y: number; width: number; height: number } | null;
  editorShellStyle: CSSProperties;
  calibrationStyle: DomTextCalibrationStyle | null;
  innerTranslateYpx: number;
  expectedGlyphTopPx: number;
  expectedGlyphCenterPx: number;
  nodeId: string;
  initialState: SerializedLexicalEditorState;
  mode: 'append' | 'replace';
  caretPlacement: 'start' | 'end' | 'none';
}>();

const emit = defineEmits<{
  change: [state: SerializedLexicalEditorState];
  commit: [];
  cancel: [];
}>();

const editorShellRef = ref<HTMLDivElement | null>(null);
const editorRootRef = ref<HTMLDivElement | null>(null);
const editorInnerRef = ref<HTMLDivElement | null>(null);
const dynamicGlyphTranslateYPx = ref(0);
let glyphAlignRafId: number | null = null;
let glyphAlignTimeoutIds: number[] = [];
let glyphAlignmentSettled = false;
const OPTICAL_GLYPH_Y_NUDGE_PX = -0.25;

const estimatedGlyphTranslateYPx = computed(() => {
  if (!props.calibrationStyle) return 0;
  return props.expectedGlyphTopPx - getDomTextTopOffset(props.calibrationStyle);
});

const resolvedEditorShellStyle = computed<CSSProperties>(() => {
  return {
    ...props.editorShellStyle,
    overflow: 'visible',
  };
});

const editorInnerStyle = computed<CSSProperties>(() =>
  dynamicGlyphTranslateYPx.value !== 0
    ? {
      transform: `translateY(${dynamicGlyphTranslateYPx.value}px)`,
    }
    : {}
);

function clearGlyphAlignTimers() {
  if (glyphAlignRafId != null) cancelAnimationFrame(glyphAlignRafId);
  glyphAlignRafId = null;
  glyphAlignTimeoutIds.forEach((id) => window.clearTimeout(id));
  glyphAlignTimeoutIds = [];
  glyphAlignmentSettled = false;
}

function settleGlyphAlignment() {
  glyphAlignmentSettled = true;
  glyphAlignTimeoutIds.forEach((id) => window.clearTimeout(id));
  glyphAlignTimeoutIds = [];
}

function findFirstTextNode(node: Node | null | undefined): Text | null {
  if (!node) return null;
  if (node instanceof Text) return node;
  for (const child of Array.from(node.childNodes ?? [])) {
    const found = findFirstTextNode(child);
    if (found && (found.textContent?.length ?? 0) > 0) return found;
  }
  return null;
}

function measureGlyphMetricsFromShell() {
  const shell = editorShellRef.value;
  const root = editorRootRef.value;
  if (!shell || !root || !props.visible) return null;
  const textNode = findFirstTextNode(root);
  const textLength = textNode?.textContent?.length ?? 0;
  if (!textNode || textLength <= 0) return null;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, Math.min(1, textLength));
  const rangeRect = range.getBoundingClientRect();
  const shellRect = shell.getBoundingClientRect();
  if (!Number.isFinite(rangeRect.top) || !Number.isFinite(shellRect.top) || !Number.isFinite(rangeRect.height)) return null;
  const top = rangeRect.top - shellRect.top;
  const height = rangeRect.height;
  return {
    top,
    height,
    center: top + height / 2,
  };
}

function alignEditorGlyphTop() {
  const actualGlyphMetrics = measureGlyphMetricsFromShell();
  if (!actualGlyphMetrics) return null;
  const targetGlyphCenterPx = props.expectedGlyphCenterPx + OPTICAL_GLYPH_Y_NUDGE_PX;
  const deltaPx = targetGlyphCenterPx - actualGlyphMetrics.center;
  if (Math.abs(deltaPx) <= 0.15) return 0;
  dynamicGlyphTranslateYPx.value += deltaPx;
  return Math.abs(deltaPx);
}

function scheduleGlyphAlignment() {
  clearGlyphAlignTimers();
  dynamicGlyphTranslateYPx.value = estimatedGlyphTranslateYPx.value + OPTICAL_GLYPH_Y_NUDGE_PX;
  const runAlignmentPass = () => {
    if (glyphAlignmentSettled) return;
    const remainingErrorPx = alignEditorGlyphTop();
    if (remainingErrorPx == null || remainingErrorPx <= 0.35) {
      settleGlyphAlignment();
    }
  };
  glyphAlignRafId = requestAnimationFrame(() => {
    glyphAlignRafId = null;
    runAlignmentPass();
  });
  glyphAlignTimeoutIds = [48, 120].map((delayMs) =>
    window.setTimeout(() => {
      runAlignmentPass();
    }, delayMs)
  );
}

function mountEditor() {
  if (!props.visible || !editorRootRef.value || !props.nodeId) return;
  lexicalEditorManager.setRootElement(editorRootRef.value);
  if (lexicalEditorManager.activeNodeId.value !== props.nodeId) {
    lexicalEditorManager.startSession({
      nodeId: props.nodeId,
      initialState: props.initialState,
      mode: props.mode,
      caretPlacement: props.caretPlacement,
      onChange: (state) => emit('change', state),
      onCommit: () => emit('commit'),
      onCancel: () => emit('cancel'),
    });
  }
  scheduleGlyphAlignment();
}

onMounted(() => {
  lexicalEditorManager.setRootElement(editorRootRef.value);
  if (props.visible) mountEditor();
});

watch(
  () => [props.visible, props.nodeId, props.mode, props.caretPlacement] as const,
  async ([visible]) => {
    if (!visible) {
      clearGlyphAlignTimers();
      dynamicGlyphTranslateYPx.value = 0;
      return;
    }
    if (editorRootRef.value) {
      mountEditor();
      return;
    }
    await nextTick();
    mountEditor();
  },
  { deep: false }
);

watch(
  () => [
    props.visible,
    props.calibrationStyle?.fontFamily ?? '',
    props.calibrationStyle?.fontSizePx ?? 0,
    props.calibrationStyle?.fontWeight ?? 0,
    props.calibrationStyle?.fontStyle ?? 'normal',
    props.calibrationStyle?.lineHeightPx ?? 0,
    props.calibrationStyle?.letterSpacingPx ?? 0,
    props.expectedGlyphTopPx,
    props.expectedGlyphCenterPx,
    props.innerTranslateYpx,
    props.editorShellStyle.fontFamily,
    props.editorShellStyle.fontSize,
    props.editorShellStyle.fontWeight,
    props.editorShellStyle.fontStyle,
    props.editorShellStyle.lineHeight,
  ] as const,
  ([visible]) => {
    if (!visible) {
      clearGlyphAlignTimers();
      dynamicGlyphTranslateYPx.value = 0;
      return;
    }
    scheduleGlyphAlignment();
  },
  { deep: false }
);

onBeforeUnmount(() => {
  clearGlyphAlignTimers();
  lexicalEditorManager.setRootElement(null);
});
</script>

<style scoped lang="scss">
.lexical-overlay-root {
  position: absolute;
  inset: 0;
  pointer-events: none;
  overflow: visible;
  z-index: 6;
}

.lexical-editor-shell {
  position: absolute;
  pointer-events: auto;
  color: inherit;
  font: inherit;
  line-height: inherit;
  text-align: inherit;
  background: transparent;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
}

.alignment-guide {
  position: absolute;
  left: -8px;
  right: -8px;
  height: 0;
  border-top: 1px dashed;
  pointer-events: none;
  z-index: 2;
}

.alignment-guide-expected {
  border-color: rgba(34, 197, 94, 0.95);
}

.alignment-guide-actual {
  border-color: rgba(239, 68, 68, 0.95);
}

.lexical-editor-inner {
  width: 100%;
  height: 100%;
  background: transparent;
  overflow: visible;
}

.lexical-editor-root {
  width: 100%;
  height: 100%;
  min-width: 1px;
  min-height: 1px;
  margin: 0;
  padding: 0;
  outline: none;
  border: 0;
  background: transparent;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  line-break: auto;
  hyphens: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  text-align: inherit;
  caret-color: currentColor;
  cursor: text;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
}

.lexical-editor-root:focus {
  outline: none;
}

.lexical-editor-root :deep(p) {
  margin: 0;
  padding: 0;
  min-height: 0;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  font-weight: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  text-align: inherit;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  line-break: auto;
  hyphens: none;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
}

.lexical-editor-root :deep(span) {
  color: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  word-break: break-word;
  line-break: auto;
  hyphens: none;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
}

.lexical-editor-root :deep(.lexical-text-bold) {
  font-weight: 700;
}

.lexical-editor-root :deep(.lexical-text-italic) {
  font-style: italic;
}

.lexical-editor-root :deep(.lexical-text-underline) {
  text-decoration: underline;
  text-underline-offset: 2px;
}

.lexical-editor-root :deep(.lexical-text-strikethrough) {
  text-decoration: line-through;
}

.lexical-editor-root :deep(.lexical-text-underline-strikethrough) {
  text-decoration: underline line-through;
  text-underline-offset: 2px;
}
</style>
