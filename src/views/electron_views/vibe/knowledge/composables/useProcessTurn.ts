// 可观察执行过程的展示类型与存量历史记录兼容读取。
// 实时与 replay 的唯一 SSE 归约器位于 turnProtocol.ts；本模块不得解释生产事件。

import { reactive } from 'vue'

export interface ProcessActionStep {
  kind: 'action'
  key: string
  actionId: string
  actionType: string
  title: string
  summary: string
  status: 'running' | 'success' | 'error' | 'cancelled' | 'unknown' | 'aborted' | 'superseded'
  itemId?: string
  sequence?: number
  phase?: string
  source?: string
  authority?: string
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
  itemId?: string
  sequence?: number
  phase?: string
  source?: string
  authority?: string
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

// Reconstruct ProcessStep[] from a persisted assistant event.meta.process array.
export function stepsFromMeta(meta: any): ProcessStep[] {
  const raw = meta?.process
  if (!Array.isArray(raw)) return []
  const steps: ProcessStep[] = []
  raw.forEach((item: any, index: number) => {
    if (!item || typeof item !== 'object') return
    if (item.kind === 'message') {
      steps.push({
        kind: 'message', key: String(item.item_id || item.step_id || `m-${index}`), text: String(item.text || ''),
        itemId: item.item_id || undefined,
        sequence: typeof item.sequence === 'number' ? item.sequence : undefined,
        phase: item.phase || undefined,
        source: item.source || undefined,
        authority: item.authority || undefined,
      })
    } else if (item.kind === 'action') {
      steps.push({
        kind: 'action',
        key: String(item.item_id || item.step_id || `a-${index}`),
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
        itemId: item.item_id || undefined,
        sequence: typeof item.sequence === 'number' ? item.sequence : undefined,
        phase: item.phase || undefined,
        source: item.source || undefined,
        authority: item.authority || undefined,
      })
    }
  })
  return steps.sort((a: any, b: any) => {
    const left = typeof a.sequence === 'number' ? a.sequence : Number.MAX_SAFE_INTEGER
    const right = typeof b.sequence === 'number' ? b.sequence : Number.MAX_SAFE_INTEGER
    return left - right
  })
}

export function durationFromMeta(meta: any): number {
  const ms = meta?.process_summary?.duration_ms
  return typeof ms === 'number' ? ms : 0
}

export function formatDuration(ms: number): string {
  if (!ms || ms < 0) return '0s'
  if (ms < 1000) return '<1s'
  const seconds = ms / 1000
  if (seconds < 60) return `${Math.round(seconds)}s`
  const mins = Math.floor(seconds / 60)
  const rem = Math.round(seconds % 60)
  return rem ? `${mins}m${rem}s` : `${mins}m`
}
