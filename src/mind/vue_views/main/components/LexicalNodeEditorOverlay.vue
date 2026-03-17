<template>
  <div class="lexical-overlay-root" :style="overlayRootStyle">
    <div
      ref="editorShellRef"
      class="lexical-editor-shell"
      :style="editorShellStyle"
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

const editorRootRef = ref<HTMLDivElement | null>(null);
const editorInnerRef = ref<HTMLDivElement | null>(null);
const editorShellRef = ref<HTMLDivElement | null>(null);
const residualOffsetPx = ref(0);
let measureRafId: number | null = null;
let alignmentPasses = 0;

const calibrationOffsetPx = computed(() => (props.calibrationStyle ? getDomTextTopOffset(props.calibrationStyle) : 0));

const editorInnerStyle = computed<CSSProperties>(() => ({
  transform:
    props.innerTranslateYpx || residualOffsetPx.value
      ? `translateY(${props.innerTranslateYpx + residualOffsetPx.value}px)`
      : undefined,
}));

function mountEditor() {
  lexicalEditorManager.setRootElement(editorRootRef.value);
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

function findFirstTextNode(node: Node | null): Text | null {
  if (!node) return null;
  if (node.nodeType === Node.TEXT_NODE) {
    const text = node.textContent ?? '';
    return text.length > 0 ? (node as Text) : null;
  }
  for (const child of Array.from(node.childNodes)) {
    const textNode = findFirstTextNode(child);
    if (textNode) return textNode;
  }
  return null;
}

function measureFirstGlyphTopPx() {
  const root = editorRootRef.value;
  const shell = editorShellRef.value;
  if (!root || !shell) return 0;
  const shellRect = shell.getBoundingClientRect();
  const firstTextNode = findFirstTextNode(root);
  if (firstTextNode) {
    const range = document.createRange();
    range.setStart(firstTextNode, 0);
    range.setEnd(firstTextNode, Math.min(1, firstTextNode.length));
    const rect = range.getBoundingClientRect();
    return rect.top - shellRect.top;
  }
  const firstBlock = root.querySelector('p, div, span, br');
  if (firstBlock instanceof HTMLElement) {
    const rect = firstBlock.getBoundingClientRect();
    return rect.top - shellRect.top;
  }
  return 0;
}

function logAlignment(reason: string) {
  if (!props.textBoxRect) return;
  const actualGlyphTopPx = measureFirstGlyphTopPx();
  console.log(JSON.stringify({
    tag: 'mind-text-align',
    reason,
    canvasTextBaseline: 'top',
    textBoxRectTop: props.textBoxRect.y,
    computedOffset: calibrationOffsetPx.value,
    residualOffsetPx: residualOffsetPx.value,
    actualGlyphTopPx,
    overlayInnerTranslateY: props.innerTranslateYpx + residualOffsetPx.value,
  }));
}

function scheduleBlockAlignment(reason: string) {
  if (measureRafId != null) cancelAnimationFrame(measureRafId);
  measureRafId = requestAnimationFrame(() => {
    measureRafId = null;
    logAlignment(reason);
    alignmentPasses = 0;
  });
}

onMounted(() => {
  void nextTick().then(() => {
    if (!props.visible) return;
    residualOffsetPx.value = 0;
    alignmentPasses = 0;
    mountEditor();
    scheduleBlockAlignment('mounted');
  });
});

watch(
  () => [props.visible, props.nodeId, props.mode] as const,
  async ([visible]) => {
    if (!visible) return;
    await nextTick();
    residualOffsetPx.value = 0;
    alignmentPasses = 0;
    mountEditor();
    scheduleBlockAlignment('session-change');
  },
  { deep: false }
);

watch(
  () => [props.calibrationStyle, props.textBoxRect, props.initialState] as const,
  async () => {
    if (!props.visible) return;
    await nextTick();
    alignmentPasses = 0;
    scheduleBlockAlignment('props-change');
  }
);

onBeforeUnmount(() => {
  if (measureRafId != null) cancelAnimationFrame(measureRafId);
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
}

.lexical-editor-inner {
  width: 100%;
  height: 100%;
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
  overflow-wrap: anywhere;
  word-break: break-all;
  line-break: anywhere;
  hyphens: none;
  color: inherit;
  font-family: inherit;
  font-size: inherit;
  font-style: inherit;
  font-weight: inherit;
  line-height: inherit;
  text-align: inherit;
  caret-color: currentColor;
  cursor: text;
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
  line-height: inherit;
  text-align: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
  line-break: anywhere;
  hyphens: none;
}

.lexical-editor-root :deep(span) {
  color: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
  line-break: anywhere;
  hyphens: none;
}
</style>
