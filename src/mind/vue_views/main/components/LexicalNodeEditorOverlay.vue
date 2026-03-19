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

const resolvedEditorShellStyle = computed<CSSProperties>(() => {
  return {
    ...props.editorShellStyle,
    top:
      typeof props.editorShellStyle.top === 'string'
        ? `calc(${props.editorShellStyle.top} + ${props.innerTranslateYpx}px)`
        : props.editorShellStyle.top,
    overflow: 'visible',
  };
});

const editorInnerStyle = computed<CSSProperties>(() => ({}));

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

onMounted(() => {
  void nextTick().then(() => {
    if (!props.visible) return;
    mountEditor();
  });
});

watch(
  () => [props.visible, props.nodeId, props.mode] as const,
  async ([visible]) => {
    if (!visible) return;
    await nextTick();
    mountEditor();
  },
  { deep: false }
);

onBeforeUnmount(() => {
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
