<template>
  <div class="process-disclosure" :class="{ running }">
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
        :class="{ open }"
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
        <p
          v-if="step.kind === 'message'"
          class="proc-narration"
          :class="{
            streaming: step.streaming,
            'runtime-progress': step.phase === 'runtime_progress',
          }"
        >{{ step.text }}</p>
        <div v-else-if="step.kind === 'diff'" class="proc-diff">
          <div v-for="(ln, j) in step.lines" :key="j" class="proc-diff-line" :class="'pd-' + ln.t">{{ ln.t === 'del' ? '− ' : ln.t === 'add' ? '+ ' : '  ' }}{{ ln.text }}</div>
        </div>
        <div v-else-if="step.kind === 'choice'" class="proc-choice">
          <p v-if="step.question" class="proc-choice-q">{{ step.question }}</p>
          <p class="proc-choice-a"><span class="proc-choice-dot" aria-hidden="true" />你的回答：<b>{{ step.text }}</b></p>
        </div>
        <div v-else class="proc-action" :class="step.status">
          <button
            class="proc-action-head"
            type="button"
            :disabled="!hasDetails(step)"
            @click="toggleAction(step)"
          >
            <span class="proc-action-icon">
              <RunningDots v-if="step.status === 'running'" />
              <CheckComplete v-else-if="step.status === 'success'" />
              <span v-else-if="step.status === 'cancelled'" class="proc-action-dot cancelled" />
              <span v-else-if="step.status === 'unknown' || step.status === 'aborted' || step.status === 'superseded'" class="proc-action-dot unknown" />
              <span v-else class="proc-action-dot error" />
            </span>
            <span class="proc-action-title" :class="{ shimmer: step.status === 'running' }">{{ actionHeadLabel(step) }}</span>
            <span v-if="step.durationMs" class="proc-action-dur">{{ fmt(step.durationMs) }}</span>
            <svg
              v-if="hasDetails(step)"
              class="proc-chevron small"
              :class="{ open: isActionOpen(step) }"
              viewBox="0 0 16 16"
              width="12"
              height="12"
              aria-hidden="true"
            >
              <path d="M5 3.5 9.5 8 5 12.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
          </button>
          <p v-if="step.status === 'error' && step.summary" class="proc-action-error">{{ step.summary }}</p>
          <p v-else-if="step.status === 'cancelled' && step.summary" class="proc-action-cancelled">{{ step.summary }}</p>
          <p v-else-if="['unknown', 'aborted', 'superseded'].includes(step.status) && step.summary" class="proc-action-cancelled">{{ step.summary }}</p>
          <div v-show="isActionOpen(step)" class="proc-action-detail">
            <dl>
              <template v-if="step.model"><dt>模型</dt><dd>{{ step.model }}</dd></template>
              <template v-if="step.useCase"><dt>用途</dt><dd>{{ step.useCase }}</dd></template>
              <template v-for="(value, label) in statEntries(step)" :key="label"><dt>{{ label }}</dt><dd>{{ value }}</dd></template>
              <template v-for="(value, label) in detailEntries(step)" :key="`d-${label}`"><dt>{{ label }}</dt><dd>{{ value }}</dd></template>
            </dl>
          </div>
        </div>
      </template>
    </div>
  </div>
</template>

<script lang="ts">
// 流式轮次落盘时组件会重建；按后端 actionId 记住用户展开状态。
const rememberedActionOpenIds = new Set<string>()
</script>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { formatDuration, type ProcessActionStep, type ProcessStep } from '../composables/useProcessTurn'
import RunningDots from './icons/RunningDots.vue'
import CheckComplete from './icons/CheckComplete.vue'

const props = withDefaults(defineProps<{
  steps: ProcessStep[]
  running?: boolean
  durationMs?: number
  awaiting?: boolean   // 0703:轮次以反问/勾选收尾、等用户决定(第三态,与"正在思考"区分)
}>(), {
  running: false,
  durationMs: 0,
  awaiting: false,
})

const open = ref(false)
const actionOpen = reactive(rememberedActionOpenIds)

const bodyVisible = computed(() => props.running || open.value)
const durationLabel = computed(() => formatDuration(props.durationMs || 0))

function toggle() {
  if (props.running) return
  open.value = !open.value
}

function actionIdentity(step: ProcessActionStep): string {
  return step.actionId || step.key
}

function isActionOpen(step: ProcessActionStep): boolean {
  return actionOpen.has(actionIdentity(step))
}

function toggleAction(step: ProcessActionStep) {
  const key = actionIdentity(step)
  if (actionOpen.has(key)) actionOpen.delete(key)
  else {
    actionOpen.add(key)
    if (actionOpen.size > 500) {
      const oldest = actionOpen.values().next().value
      if (oldest) actionOpen.delete(oldest)
    }
  }
}

const STAT_LABELS: Record<string, string> = {
  facts: '命中事实',
  relations: '命中关系',
  notes: '命中附注',
  impacts: '命中影响',
  candidate_assets: '候选资产',
  llm_calls: '模型调用',
  actions: '动作数',
  item_count: '方案项',
  issue_count: '质量提示',
}

const DETAIL_LABELS: Record<string, string> = {
  route: '路由',
  confidence: '置信度',
  reason: '理由',
  should_answer: '需回答',
  should_model: '需建模',
  intent: '意图',
  primary_intent: '主意图',
  candidate_count: '候选数',
  passed: '质量门',
  note: '说明',
  response_preview: '返回摘要',
  request_preview: '请求摘要',
}

function actionHeadLabel(step: ProcessActionStep): string {
  if (step.status === 'running') return step.title || '处理中'
  if (step.actionType === 'llm_call') return `已调用模型 · ${step.title}`
  if (step.actionType === 'knowledge_retrieval') return step.title
  return step.title
}

function hasDetails(step: ProcessStep): boolean {
  if (step.kind !== 'action') return false
  return !!(step.model || step.useCase || Object.keys(step.stats || {}).length || Object.keys(step.details || {}).length)
}

function statEntries(step: ProcessActionStep): Record<string, any> {
  const out: Record<string, any> = {}
  Object.entries(step.stats || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return
    out[STAT_LABELS[k] || k] = v
  })
  return out
}

function detailEntries(step: ProcessActionStep): Record<string, any> {
  const out: Record<string, any> = {}
  Object.entries(step.details || {}).forEach(([k, v]) => {
    if (v === null || v === undefined || v === '') return
    let value: any = v
    if (typeof v === 'boolean') value = v ? '是' : '否'
    else if (typeof v === 'object') value = JSON.stringify(v)
    out[DETAIL_LABELS[k] || k] = value
  })
  return out
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
  &.small { opacity: 0.7; }
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
  font-weight: 500;
}

@keyframes proc-shimmer {
  0% { background-position: 120% 0; }
  100% { background-position: -120% 0; }
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
  color: var(--vibe-process-narration, #171717);
  font-weight: 500;
  line-height: 1.55;
  white-space: pre-wrap;
}

.proc-narration.runtime-progress {
  color: var(--vibe-process-fg, #6b7280);
  font-weight: 400;
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
  font-weight: 600;
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
  background: none;
  border: none;
  cursor: pointer;
  color: var(--vibe-process-fg, #6b7280);
  font-size: 13.5px;
  &:disabled { cursor: default; }
}

/* 完成态动作：hover 文字变黑（流光中的运行态标题不变） */
.proc-action-head:hover .proc-action-title:not(.shimmer) {
  color: #111827;
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
  font-weight: 500;
}

.proc-action-dur { color: #9ca3af; font-variant-numeric: tabular-nums; }

.proc-action-detail {
  margin: 4px 0 2px 12px;
  padding: 6px 10px;
  background: var(--vibe-process-detail-bg, #f7f7f8);
  border-radius: 6px;
  font-size: 13px;

  dl {
    display: grid;
    grid-template-columns: auto 1fr;
    gap: 2px 10px;
    margin: 0;
  }
  dt { color: #9ca3af; white-space: nowrap; }
  dd { margin: 0; color: #4b5563; word-break: break-word; }
}
</style>
