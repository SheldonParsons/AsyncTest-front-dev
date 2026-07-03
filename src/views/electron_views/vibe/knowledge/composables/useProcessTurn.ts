// Codex 风格"可观察执行过程"前端数据模型与 SSE 归约器。
//
// 后端通过 ProcessEmitter 发出统一过程事件：
//   process_started / process_message / process_action_started /
//   process_action_done / process_done
// 本模块把这些事件归约成一份有序的 ProcessStep[]，供单一 ProcessDisclosure
// 组件渲染；历史消息则从 assistant event.meta.process 复原成同样的结构。

import { reactive } from 'vue'

export interface ProcessActionStep {
  kind: 'action'
  key: string
  actionId: string
  actionType: string
  title: string
  summary: string
  status: 'running' | 'success' | 'error'
  durationMs?: number
  model?: string
  useCase?: string
  stats?: Record<string, any>
  details?: Record<string, any>
}

export interface ProcessMessageStep {
  kind: 'message'
  key: string
  text: string
  messageId?: string   // 真 ReAct 流式旁白的累积锚点
  streaming?: boolean  // 是否仍在逐字流入（用于光标动画）
}

// 反问续跑：把"反问 + 用户的选择/回答"作为思考中的一环（气泡）插在过程步里
export interface ProcessChoiceStep {
  kind: 'choice'
  key: string
  question: string   // 我（系统）当时问你的话
  text: string       // 你的选择 / 回答
}

// 改原文：把 diff（红删绿增）作为思考中的一环展示
export interface ProcessDiffStep {
  kind: 'diff'
  key: string
  lines: { t: 'ctx' | 'del' | 'add'; text: string }[]
}

export type ProcessStep = ProcessMessageStep | ProcessActionStep | ProcessChoiceStep | ProcessDiffStep

export interface ProcessState {
  status: 'idle' | 'running' | 'done'
  steps: ProcessStep[]
  startedAt: string
  durationMs: number
  summary: string
  stats: Record<string, any>
}

let _seq = 0
function nextKey(prefix: string): string {
  _seq += 1
  return `${prefix}-${_seq}`
}

export function createProcessState(): ProcessState {
  return reactive<ProcessState>({
    status: 'idle',
    steps: [],
    startedAt: '',
    durationMs: 0,
    summary: '',
    stats: {},
  })
}

export function resetProcessState(state: ProcessState) {
  state.status = 'idle'
  state.steps = []
  state.startedAt = ''
  state.durationMs = 0
  state.summary = ''
  state.stats = {}
}

// Returns true if the event was a recognised process event (so callers can
// avoid double-handling it elsewhere).
export function consumeProcessEvent(state: ProcessState, event: any): boolean {
  const type = String(event?.type || '')
  switch (type) {
    case 'process_started':
      state.status = 'running'
      state.steps = []
      state.startedAt = String(event.started_at || '')
      state.durationMs = 0
      state.summary = ''
      state.stats = {}
      return true
    case 'process_message':
      if (state.status === 'idle') state.status = 'running'
      state.steps.push({ kind: 'message', key: nextKey('msg'), text: String(event.message || '') })
      return true
    case 'process_message_delta': {
      // 真 ReAct 流式旁白：按 message_id 把增量累积到同一条旁白上，实现打字机式丝滑。
      if (state.status === 'idle') state.status = 'running'
      const id = String(event.message_id || '')
      if (event.done) {
        const done = findMessageById(state, id)
        if (done) done.streaming = false
        return true
      }
      const delta = String(event.delta || '')
      if (!delta) return true
      let step = findMessageById(state, id)
      if (!step) {
        step = { kind: 'message', key: nextKey('msg'), text: '', messageId: id, streaming: true }
        state.steps.push(step)
      }
      step.text += delta
      step.streaming = true
      return true
    }
    case 'process_action_started': {
      if (state.status === 'idle') state.status = 'running'
      const action: ProcessActionStep = {
        kind: 'action',
        key: nextKey('act'),
        actionId: String(event.action_id || ''),
        actionType: String(event.action_type || 'action'),
        title: String(event.title || event.action_id || '执行动作'),
        summary: String(event.summary || ''),
        status: 'running',
        model: event.model || undefined,
        useCase: event.use_case || undefined,
      }
      state.steps.push(action)
      return true
    }
    case 'process_action_done': {
      const existing = findRunningAction(state, String(event.action_id || ''))
      const patch: Partial<ProcessActionStep> = {
        actionType: String(event.action_type || existing?.actionType || 'action'),
        title: String(event.title || existing?.title || '执行动作'),
        summary: String(event.summary || existing?.summary || ''),
        status: (event.status as ProcessActionStep['status']) || 'success',
        durationMs: typeof event.duration_ms === 'number' ? event.duration_ms : existing?.durationMs,
        model: event.model || existing?.model,
        useCase: event.use_case || existing?.useCase,
        stats: event.stats && typeof event.stats === 'object' ? event.stats : existing?.stats,
        details: event.details && typeof event.details === 'object' ? event.details : existing?.details,
      }
      if (existing) {
        Object.assign(existing, patch)
      } else {
        state.steps.push({
          kind: 'action',
          key: nextKey('act'),
          actionId: String(event.action_id || ''),
          actionType: patch.actionType || 'action',
          title: patch.title || '执行动作',
          summary: patch.summary || '',
          status: patch.status || 'success',
          durationMs: patch.durationMs,
          model: patch.model,
          useCase: patch.useCase,
          stats: patch.stats,
          details: patch.details,
        })
      }
      return true
    }
    case 'process_done':
      state.status = 'done'
      state.durationMs = typeof event.duration_ms === 'number' ? event.duration_ms : state.durationMs
      state.summary = String(event.summary || '')
      state.stats = event.stats && typeof event.stats === 'object' ? event.stats : state.stats
      // Any action left running gets settled so the UI never hangs.
      state.steps.forEach((step) => {
        if (step.kind === 'action' && step.status === 'running') step.status = 'success'
        if (step.kind === 'message' && step.streaming) step.streaming = false
      })
      return true
    default:
      return false
  }
}

function findRunningAction(state: ProcessState, actionId: string): ProcessActionStep | undefined {
  for (let i = state.steps.length - 1; i >= 0; i -= 1) {
    const step = state.steps[i]
    if (step.kind === 'action' && step.actionId === actionId && step.status === 'running') return step
  }
  return undefined
}

function findMessageById(state: ProcessState, messageId: string): ProcessMessageStep | undefined {
  if (!messageId) return undefined
  for (let i = state.steps.length - 1; i >= 0; i -= 1) {
    const step = state.steps[i]
    if (step.kind === 'message' && step.messageId === messageId) return step
  }
  return undefined
}

// Reconstruct ProcessStep[] from a persisted assistant event.meta.process array.
export function stepsFromMeta(meta: any): ProcessStep[] {
  const raw = meta?.process
  if (!Array.isArray(raw)) return []
  const steps: ProcessStep[] = []
  raw.forEach((item: any, index: number) => {
    if (!item || typeof item !== 'object') return
    if (item.kind === 'message') {
      steps.push({ kind: 'message', key: `m-${index}`, text: String(item.text || '') })
    } else if (item.kind === 'action') {
      steps.push({
        kind: 'action',
        key: `a-${index}`,
        actionId: String(item.action_id || ''),
        actionType: String(item.action_type || 'action'),
        title: String(item.title || '执行动作'),
        summary: String(item.summary || ''),
        status: (item.status as ProcessActionStep['status']) || 'success',
        durationMs: typeof item.duration_ms === 'number' ? item.duration_ms : undefined,
        model: item.model || undefined,
        useCase: item.use_case || undefined,
        stats: item.stats && typeof item.stats === 'object' ? item.stats : undefined,
        details: item.details && typeof item.details === 'object' ? item.details : undefined,
      })
    }
  })
  return steps
}

export function durationFromMeta(meta: any): number {
  const ms = meta?.process_summary?.duration_ms
  return typeof ms === 'number' ? ms : 0
}

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s'
  if (ms < 1000) return '<1s'
  const seconds = ms / 1000
  if (seconds < 60) return `${seconds < 10 ? seconds.toFixed(1).replace(/\.0$/, '') : Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const rem = Math.round(seconds % 60)
  return rem ? `${mins}m${rem}s` : `${mins}m`
}
