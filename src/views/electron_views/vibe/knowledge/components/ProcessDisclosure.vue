<template>
  <div class="process-disclosure" :class="{ running }" :style="shimmerStyle">
    <button
      class="proc-header"
      type="button"
      :disabled="running || !steps.length"
      @click="toggle"
    >
      <span v-if="running" class="proc-head-icon"><RunningDots /></span>
      <!-- 0704:运行中头部也带"已处理 Xs"活秒表(父组件每 0.5s 推 durationMs),全轮没结束就一直数 -->
      <span v-if="running" class="proc-thinking">正在思考 · 已处理 {{ durationLabel }}</span>
      <!-- 第三态(0703):后端已收工、在等用户对反问/勾选做决定——既不是"在思考"也不只是"已处理" -->
      <span v-else-if="awaiting" class="proc-done">已处理 {{ durationLabel }} · <b class="proc-awaiting">等你选择</b></span>
      <span v-else class="proc-done">已处理 {{ durationLabel }}</span>
      <svg
        v-if="!running && steps.length"
        class="proc-chevron"
        :class="{ open: bodyVisible }"
        viewBox="0 0 16 16"
        width="14"
        height="14"
        aria-hidden="true"
      >
        <path d="M5 3.5 9.5 8 5 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
      </svg>
    </button>

    <div v-show="bodyVisible" class="proc-body">
      <template v-for="step in steps" :key="step.key">
        <div
          v-if="step.kind === 'message'"
          class="proc-narration"
          :class="{
            streaming: step.streaming,
            'runtime-progress': step.phase === 'runtime_progress',
          }"
          v-html="messageHtml(step)"
        />
        <div v-else-if="step.kind === 'diff'" class="proc-diff">
          <div v-for="(ln, j) in step.lines" :key="j" class="proc-diff-line" :class="'pd-' + ln.t">{{ ln.t === 'del' ? '− ' : ln.t === 'add' ? '+ ' : '  ' }}{{ ln.text }}</div>
        </div>
        <div v-else-if="step.kind === 'choice'" class="proc-choice">
          <p v-if="step.question" class="proc-choice-q">{{ step.question }}</p>
          <p class="proc-choice-a"><span class="proc-choice-dot" aria-hidden="true" />你的回答：<b>{{ step.text }}</b></p>
        </div>
        <div v-else class="proc-action" :class="step.status">
          <div class="proc-action-head">
            <span class="proc-action-icon">
              <RunningDots v-if="step.status === 'running'" />
              <CheckComplete v-else-if="step.status === 'success'" />
              <span v-else-if="step.status === 'cancelled'" class="proc-action-dot cancelled" />
              <span v-else-if="step.status === 'unknown' || step.status === 'aborted' || step.status === 'superseded'" class="proc-action-dot unknown" />
              <span v-else class="proc-action-dot error" />
            </span>
            <span class="proc-action-title" :class="{ shimmer: step.status === 'running' }">{{ actionHeadLabel(step) }}</span>
            <span v-if="step.status !== 'success' && step.durationMs" class="proc-action-dur">{{ fmt(step.durationMs) }}</span>
          </div>
          <p v-if="actionMeta(step)" class="proc-action-stats">{{ actionMeta(step) }}</p>
          <p v-if="step.status === 'error' && step.summary" class="proc-action-error">{{ step.summary }}</p>
          <p v-else-if="step.status === 'cancelled' && step.summary" class="proc-action-cancelled">{{ step.summary }}</p>
          <p v-else-if="['unknown', 'aborted', 'superseded'].includes(step.status) && step.summary" class="proc-action-cancelled">{{ step.summary }}</p>
        </div>
      </template>
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, ref, shallowRef, watch } from 'vue'
import { formatDuration, type ProcessActionStep, type ProcessStep } from '../composables/useProcessTurn'
import { compactProcessActionMeta } from '../processDisclosurePolicy'
import { continuousAnimationDelay } from '../motionContinuity'
import RunningDots from './icons/RunningDots.vue'
import CheckComplete from './icons/CheckComplete.vue'

const emit = defineEmits<{
  (event: 'layout-change'): void
}>()

const props = withDefaults(defineProps<{
  steps: ProcessStep[]
  running?: boolean
  durationMs?: number
  awaiting?: boolean   // 0703:轮次以反问/勾选收尾、等用户决定(第三态,与"正在思考"区分)
  renderMarkdown: (content: string) => string
}>(), {
  running: false,
  durationMs: 0,
  awaiting: false,
})

// 运行与等待用户时展开；完成后默认收起，仍可由用户手动查看。
const open = ref<boolean | undefined>()
const shimmerStyle = { '--vibe-shimmer-delay': continuousAnimationDelay() }
const renderedMessages = shallowRef<Record<string, string>>({})
const messageCache = new Map<string, { text: string; html: string }>()
let messageRenderTimer: ReturnType<typeof setTimeout> | null = null
const STREAMING_PROCESS_RENDER_DELAY_MS = 100

const bodyVisible = computed(() => (
  props.running || (open.value ?? props.awaiting)
))
const durationLabel = computed(() => formatDuration(props.durationMs || 0))

watch(() => props.running, (running, wasRunning) => {
  if (wasRunning && !running && !props.awaiting) open.value = false
})

function renderMessages() {
  if (messageRenderTimer) clearTimeout(messageRenderTimer)
  messageRenderTimer = null
  if (!bodyVisible.value) {
    renderedMessages.value = {}
    void nextTick(() => emit('layout-change'))
    return
  }
  const activeKeys = new Set<string>()
  const next: Record<string, string> = {}
  for (const step of props.steps) {
    if (step.kind !== 'message') continue
    const key = String(step.key || '')
    const text = String(step.text || '')
    activeKeys.add(key)
    const cached = messageCache.get(key)
    const html = cached?.text === text ? cached.html : props.renderMarkdown(text)
    messageCache.set(key, { text, html })
    next[key] = html
  }
  for (const key of messageCache.keys()) {
    if (!activeKeys.has(key)) messageCache.delete(key)
  }
  renderedMessages.value = next
  void nextTick(() => emit('layout-change'))
}

function scheduleMessageRender() {
  const streaming = props.steps.some(step => step.kind === 'message' && step.streaming)
  if (!streaming) {
    renderMessages()
    return
  }
  if (messageRenderTimer) return
  messageRenderTimer = setTimeout(renderMessages, STREAMING_PROCESS_RENDER_DELAY_MS)
}

watch(bodyVisible, scheduleMessageRender, { flush: 'post' })
watch(() => props.steps, scheduleMessageRender, { immediate: true, flush: 'post' })

onBeforeUnmount(() => {
  if (messageRenderTimer) clearTimeout(messageRenderTimer)
})

function messageHtml(step: ProcessStep): string {
  return renderedMessages.value[String(step.key || '')] || ''
}

function toggle() {
  if (props.running) return
  open.value = !bodyVisible.value
}

function actionHeadLabel(step: ProcessActionStep): string {
  return step.title || (step.status === 'running' ? '处理中' : '执行动作')
}

function actionMeta(step: ProcessActionStep): string {
  return compactProcessActionMeta(step)
}

function fmt(ms?: number): string {
  return formatDuration(ms || 0)
}
</script>

<style scoped lang="scss">
.process-disclosure {
  margin: 0 0 8px;
  font-size: 14px;
  color: var(--vibe-process-fg, #6b7280);
}

.proc-header {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 2px 0;
  background: none;
  border: none;
  cursor: pointer;
  color: inherit;
  font-size: 14px;
  line-height: 1.5;

  &:disabled { cursor: default; }
}

.proc-head-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: #9ca3af;
}

.proc-done { color: var(--vibe-process-fg, #6b7280); }
.proc-awaiting { color: #b26a00; font-weight: 600; }  /* 等你选择:琥珀色,和灰色"已处理"区分 */

.proc-chevron {
  color: var(--vibe-process-fg, #9ca3af);
  transition: transform 0.18s ease;
  &.open { transform: rotate(90deg); }
}

/* Codex 式从左到右流光，而非简单 opacity blink */
.proc-thinking {
  background: linear-gradient(
    90deg,
    rgba(120, 120, 130, 0.55) 0%,
    rgba(120, 120, 130, 0.55) 35%,
    rgba(20, 20, 25, 0.95) 50%,
    rgba(120, 120, 130, 0.55) 65%,
    rgba(120, 120, 130, 0.55) 100%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: proc-shimmer 1.8s linear infinite;
  animation-delay: var(--vibe-shimmer-delay, 0ms);
  font-size: 14px;
  font-weight: 450;
}

@keyframes proc-shimmer {
  0% { background-position: 220% 0; }
  100% { background-position: -220% 0; }
}

.proc-body {
  margin-top: 6px;
  padding-left: 2px;
  border-left: 2px solid var(--vibe-process-rail, #ececf1);
  padding-left: 12px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.proc-narration {
  margin: 2px 0;
  color: #171717;
  font-size: 14px;
  font-weight: 450;
  line-height: 1.55;
  overflow-wrap: anywhere;

  :deep(p) { margin: 0 0 6px; }
  :deep(p:last-child) { margin-bottom: 0; }
  :deep(ul),
  :deep(ol) { margin: 5px 0 6px 18px; padding: 0; }
  :deep(li) { margin: 2px 0; }
  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4),
  :deep(h5),
  :deep(h6) { margin: 6px 0 4px; color: #171717; font-size: 1em; font-weight: 650; }
  :deep(code) {
    padding: 1px 4px;
    border-radius: 4px;
    background: rgba(15, 15, 15, 0.07);
    font-family: "JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace;
    font-size: 12px;
  }
  :deep(pre) {
    max-width: 100%;
    margin: 6px 0;
    padding: 8px 10px;
    overflow: auto;
    border-radius: 8px;
    background: #ececec;
  }
  :deep(pre code) { padding: 0; background: transparent; white-space: pre-wrap; }
  :deep(blockquote) {
    margin: 6px 0;
    padding-left: 9px;
    border-left: 2px solid rgba(15, 15, 15, 0.16);
    color: rgba(15, 15, 15, 0.62);
  }
}

.proc-narration.runtime-progress {
  color: #171717;
  font-weight: 450;
}

/* 反问续跑：思考中"我问的话 + 你的回答"那一环（小卡片） */
.proc-choice {
  align-self: flex-start;
  margin: 2px 0;
  padding: 7px 11px;
  border-radius: 9px;
  background: rgba(17, 24, 39, 0.05);
  font-size: 13px;
  line-height: 1.5;
  color: rgba(15, 15, 15, 0.55);
  max-width: 100%;
}
.proc-choice-q {
  margin: 0 0 3px;
  color: rgba(15, 15, 15, 0.5);
}
.proc-choice-a {
  margin: 0;
  display: flex;
  align-items: center;
  gap: 7px;
  color: rgba(15, 15, 15, 0.6);
}
.proc-choice-dot {
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #9ca3af;
  flex: 0 0 auto;
}
.proc-choice-a b {
  color: rgba(15, 15, 15, 0.82);
  font-size: 14px;
  font-weight: 550;
}

/* 改原文 diff：思考里看红删绿增 */
.proc-diff {
  align-self: flex-start;
  max-width: 100%;
  margin: 2px 0;
  border: 1px solid #e4e6ea;
  border-radius: 8px;
  overflow: auto;
  background: #fcfcfd;
  font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
  font-size: 12px;
  line-height: 1.55;
  padding: 5px 0;
}
.proc-diff-line { padding: 0 10px; white-space: pre-wrap; word-break: break-word; }
.pd-ctx { color: #57606a; }
.pd-del { background: #ffe9e7; color: #b3261e; }
.pd-add { background: #e7f6ea; color: #1a7f37; }

.proc-action-error {
  margin: 2px 0 2px 12px;
  color: #b91c1c;
  font-size: 13px;
  line-height: 1.5;
}

.proc-action-cancelled {
  margin: 2px 0 2px 12px;
  color: #6b7280;
  font-size: 13px;
  line-height: 1.5;
}

.proc-action { margin: 0; }

.proc-action-head {
  display: inline-flex;
  align-items: center;
  gap: 7px;
  padding: 1px 0;
  color: var(--vibe-process-fg, #6b7280);
  font-size: 13.5px;
}

.proc-action-icon {
  width: 18px;
  height: 18px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: 0 0 auto;
  color: #9ca3af;
}
.proc-action.success .proc-action-icon { color: #9ca3af; }

.proc-action-dot.error {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #dc2626;
  display: block;
}

.proc-action-dot.cancelled {
  width: 7px;
  height: 7px;
  border-radius: 50%;
  background: #9ca3af;
  display: block;
}

.proc-action-dot.unknown {
  width: 7px;
  height: 7px;
  border: 1.5px solid #9ca3af;
  border-radius: 50%;
  background: transparent;
  display: block;
}

.proc-action-title {
  color: inherit;
  transition: color 0.15s ease;
}

/* 运行中动作标题流光（与"正在思考"一致） */
.proc-action-title.shimmer {
  background: linear-gradient(
    90deg,
    rgba(120, 120, 130, 0.55) 0%,
    rgba(120, 120, 130, 0.55) 35%,
    rgba(20, 20, 25, 0.95) 50%,
    rgba(120, 120, 130, 0.55) 65%,
    rgba(120, 120, 130, 0.55) 100%
  );
  background-size: 220% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: proc-shimmer 1.8s linear infinite;
  animation-delay: var(--vibe-shimmer-delay, 0ms);
  font-weight: 500;
}

.proc-action-dur { color: #9ca3af; font-variant-numeric: tabular-nums; }

.proc-action-stats {
  margin: 1px 0 1px 25px;
  color: #8a8f98;
  font-size: 12px;
  line-height: 1.5;
  font-variant-numeric: tabular-nums;
  white-space: normal;
}
</style>
