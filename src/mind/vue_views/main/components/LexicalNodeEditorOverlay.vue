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
import { getDomTextBaselineMetrics, type DomTextCalibrationStyle } from '@/mind/core/text/domTextCalibration';

const props = defineProps<{
  visible: boolean;
  overlayRootStyle: CSSProperties;
  textBoxRect: { x: number; y: number; width: number; height: number } | null;
  editorShellStyle: CSSProperties;
  calibrationStyle: DomTextCalibrationStyle | null;
  innerTranslateYpx: number;
  /** canvas 首行真实绘制基线相对 shell 顶部的屏幕距离（含设备像素吸附） */
  expectedBaselinePx: number;
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

/** 闭环实测得到的附加纠偏量（理想情况下恒为 0，仅吸收真实布局与探针的意外差异） */
const liveCorrectionYPx = ref(0);
let liveMeasureRafId: number | null = null;

/**
 * 基线对齐：把 DOM 首行字母基线平移到 canvas 绘制基线上。
 * 探针（getDomTextBaselineMetrics）实测浏览器行盒的真实基线位置，无经验系数。
 */
const baselineTranslateYPx = computed(() => {
  if (!props.calibrationStyle) return 0;
  return props.expectedBaselinePx - getDomTextBaselineMetrics(props.calibrationStyle).baselineOffsetPx;
});

// 世界坐标模型：shell 铺满整个节点文本区，内容溢出可见，导航靠相机平移
const resolvedEditorShellStyle = computed<CSSProperties>(() => {
  return {
    ...props.editorShellStyle,
    overflow: 'visible',
  };
});

const editorInnerStyle = computed<CSSProperties>(() => {
  const translateY = baselineTranslateYPx.value + liveCorrectionYPx.value;
  return translateY !== 0 ? { transform: `translateY(${translateY}px)` } : {};
});

/** 从 shell 样式解析当前 transform: scale（浮层按基准字号排版 + 整体缩放） */
function resolveShellScale(): number {
  const transform = props.editorShellStyle.transform;
  if (typeof transform === 'string') {
    const match = /scale\(([\d.]+)\)/.exec(transform);
    if (match) {
      const parsed = Number.parseFloat(match[1]);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  }
  return 1;
}

function findFirstTextNode(root: Node): Text | null {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let current = walker.nextNode();
  while (current) {
    if (current.textContent && current.textContent.length > 0) return current as Text;
    current = walker.nextNode();
  }
  return null;
}

/**
 * 闭环校准：编辑器真实渲染后，实测活体 DOM 首字符的位置，
 * 换算出真实基线并与 canvas 期望基线求差，把残差补进 translate。
 * 若探针与活体布局一致，残差为 0；只在出现滚动、边框、亚像素累积等
 * 预测模型覆盖不到的情况时产生非零修正。一步收敛（测量值已包含当前修正量）。
 */
function measureLiveBaselineCorrection() {
  const shell = editorShellRef.value;
  const root = editorRootRef.value;
  const style = props.calibrationStyle;
  if (!props.visible || !shell || !root || !style) return;
  const textNode = findFirstTextNode(root);
  if (!textNode) return;
  const range = document.createRange();
  range.setStart(textNode, 0);
  range.setEnd(textNode, Math.min(1, textNode.length));
  const rangeRect = range.getBoundingClientRect();
  if (!Number.isFinite(rangeRect.top) || (rangeRect.width === 0 && rangeRect.height === 0)) return;
  const shellRect = shell.getBoundingClientRect();
  if (!Number.isFinite(shellRect.top)) return;
  const scale = resolveShellScale();
  const probe = getDomTextBaselineMetrics(style);
  // 同一字体样式下「Range rect 顶 → 基线」为常量，用探针值换算活体基线。
  // ClientRect 是缩放后的视觉坐标，除回 scale 转成布局坐标；scrollTop 本身是布局坐标。
  const rangeTopToBaseline = probe.baselineOffsetPx - probe.firstGlyphRangeTopPx;
  const actualBaselinePx = (rangeRect.top - shellRect.top) / scale + shell.scrollTop + rangeTopToBaseline;
  const delta = props.expectedBaselinePx - actualBaselinePx;
  if (Math.abs(delta) > 0.05 && Math.abs(delta) < 8) {
    liveCorrectionYPx.value += delta;
  }
}

function scheduleLiveBaselineMeasure() {
  if (typeof window === 'undefined') return;
  if (liveMeasureRafId != null) cancelAnimationFrame(liveMeasureRafId);
  liveMeasureRafId = requestAnimationFrame(() => {
    liveMeasureRafId = null;
    measureLiveBaselineCorrection();
  });
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
      onChange: (state) => {
        emit('change', state);
        // 空文本首次输入后才有可测的字符；内容变化时补测（rAF 合并，开销可忽略）
        scheduleLiveBaselineMeasure();
      },
      onCommit: () => emit('commit'),
      onCancel: () => emit('cancel'),
    });
  }
}

onMounted(() => {
  lexicalEditorManager.setRootElement(editorRootRef.value);
  if (props.visible) mountEditor();
  scheduleLiveBaselineMeasure();
  // 字体异步就绪后，探针缓存已被清空，重测一次吸收字体替换带来的度量变化
  if (typeof document !== 'undefined' && document.fonts?.ready) {
    document.fonts.ready.then(() => scheduleLiveBaselineMeasure());
  }
});

watch(
  () => [props.visible, props.nodeId, props.mode, props.caretPlacement] as const,
  async ([visible]) => {
    if (!visible) {
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
    props.nodeId,
    props.calibrationStyle?.fontFamily ?? '',
    props.calibrationStyle?.fontSizePx ?? 0,
    props.calibrationStyle?.fontWeight ?? 0,
    props.calibrationStyle?.fontStyle ?? 'normal',
    props.calibrationStyle?.lineHeightPx ?? 0,
    props.calibrationStyle?.letterSpacingPx ?? 0,
    props.expectedBaselinePx,
  ] as const,
  () => {
    // 对齐基准变化（换节点/换字体/缩放）：清掉旧修正，布局稳定后重新闭环实测
    liveCorrectionYPx.value = 0;
    nextTick(() => scheduleLiveBaselineMeasure());
  },
  { deep: false }
);

onBeforeUnmount(() => {
  if (liveMeasureRafId != null) cancelAnimationFrame(liveMeasureRafId);
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
  min-height: 100%;
  background: transparent;
  overflow: visible;
}

.lexical-editor-root {
  width: 100%;
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
  overflow-wrap: anywhere;
  word-break: break-all;
  line-break: anywhere;
  hyphens: none;
  -webkit-font-smoothing: auto;
  -moz-osx-font-smoothing: auto;
}

.lexical-editor-root :deep(span) {
  color: inherit;
  letter-spacing: inherit;
  line-height: inherit;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-all;
  line-break: anywhere;
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
