import type { TurnProtocolReadModel } from './composables/turnProtocol'

export interface LocalTurnPresentation {
  model: TurnProtocolReadModel
  observedDurationMs: number
  /** Canonical Turn 仍在活动或等待权威恢复；合法非终态前缀不能被当成协议故障。 */
  terminalPending: boolean
}

export interface AssistantTurnPresentationRefresh {
  assistantEventId?: string
  sessionId: string
  model: TurnProtocolReadModel
  observedDurationMs?: number
  terminalPending?: boolean
}

export type TurnRecoveryDisposition = 'pending' | 'settled' | 'missing_terminal' | 'identity_mismatch'

export type TurnReplayGapDisposition = 'retry' | 'broken' | 'expired'

export const TURN_REPLAY_FINAL_GRACE_MS = 30_000

export interface TurnReplayGapObservation {
  status?: number
  code?: string
  retryable?: boolean | null
  liveLease: boolean
  seenRunning: boolean
  leaseMissingForMs?: number
}

export interface TurnRecoveryReplayObservation {
  expectedTurnId: string
  replayTurnId: string
  state: string
  terminal?: unknown
}

const LOCAL_TURN_PRESENTATION = '__localTurnPresentation'

/**
 * assistant event_saved 先返回轻量 Session row，完整历史投影会稍后补齐。
 * 这里把已经由 Canonical reducer 得到的只读模型临时挂在本地事件上，
 * 仅用于无缝显示，不写进 meta，也不会回传服务端。
 */
export function attachLocalTurnPresentation<T extends Record<string, any>>(
  event: T,
  model: TurnProtocolReadModel | null,
  observedDurationMs = 0,
  options: { terminalPending?: boolean } = {},
): T {
  if (!model) return event
  return {
    ...event,
    [LOCAL_TURN_PRESENTATION]: {
      model,
      observedDurationMs: finitePositiveDuration(observedDurationMs),
      terminalPending: options.terminalPending === true,
    } satisfies LocalTurnPresentation,
  }
}

export function localTurnPresentation(event: any): LocalTurnPresentation | null {
  const value = event?.[LOCAL_TURN_PRESENTATION]
  return value?.model ? value as LocalTurnPresentation : null
}

/**
 * 后续 Canonical packet 必须升级已经落入 timeline 的同一 assistant 气泡。
 * 事件 id 优先；恢复路径允许用本地 turn identity 兜底，但会话或 turn 冲突时一律拒绝。
 */
export function refreshAssistantTurnPresentation<T extends Record<string, any>>(
  events: readonly T[],
  input: AssistantTurnPresentationRefresh,
): T | null {
  const expectedEventId = String(input.assistantEventId || '')
  const expectedSessionId = String(input.sessionId || '')
  const expectedTurnId = String(input.model?.turnId || '')

  const compatible = (event: T): boolean => {
    if (String(event?.role || '') !== 'assistant') return false
    const eventSessionId = String(event?.session_id || '')
    if (expectedSessionId && eventSessionId !== expectedSessionId) return false
    const currentTurnId = String(localTurnPresentation(event)?.model?.turnId || '')
    return !(currentTurnId && expectedTurnId && currentTurnId !== expectedTurnId)
  }

  const direct = expectedEventId
    ? events.find(event => String(event?.id || '') === expectedEventId && compatible(event))
    : undefined
  const fallback = direct || (expectedTurnId
    ? events.find((event) => {
        if (!compatible(event)) return false
        return String(localTurnPresentation(event)?.model?.turnId || '') === expectedTurnId
      })
    : undefined)
  if (!fallback) return null
  return attachLocalTurnPresentation(
    fallback,
    input.model,
    input.observedDurationMs,
    { terminalPending: input.terminalPending },
  )
}

/** 历史/已结束 Turn 缺 terminal 才报警；活动 Turn 的非终态 prefix 是合法状态。 */
export function shouldShowMissingTerminalNotice(
  model: TurnProtocolReadModel | null,
  presentation: LocalTurnPresentation | null = null,
  turnIsActive?: boolean,
): boolean {
  // local terminalPending 表示该气泡仍由 running/replay owner 接管。/turn/running
  // 的 lease 可以先于权威 terminal 消失，因此瞬时的外部 false 不能推翻 pending；
  // 真正收口失败时 owner 会先把 terminalPending 明确降为 false。
  const active = turnIsActive === true || presentation?.terminalPending === true
  return !!model
    && !model.terminal
    && model.state !== 'waiting_user'
    && !active
}

/**
 * /turn/running 只是 live lease，不是完成边界。只有权威 replay 已给出 terminal、
 * waiting_user，或明确落在无 terminal 的最终态，前端才可以结束 pending。
 */
export function classifyTurnRecoveryReplay(
  observation: TurnRecoveryReplayObservation,
): TurnRecoveryDisposition {
  const expectedTurnId = String(observation.expectedTurnId || '')
  const replayTurnId = String(observation.replayTurnId || '')
  if (!expectedTurnId || replayTurnId !== expectedTurnId) return 'identity_mismatch'
  if (String(observation.terminal || '')) return 'settled'
  const state = String(observation.state || '')
  if (state === 'waiting_user') return 'settled'
  if (['queued', 'running', 'cancelling'].includes(state)) return 'pending'
  return 'missing_terminal'
}

/**
 * running lease 可能先于第一条 Canonical 事件出现，也可能先于 terminal Journal
 * 消失。只要该 Turn 曾由 running 权威发现，暂态 HTTP/空页都必须在 live 期间
 * 保持恢复；lease 消失后再留一个时间有界的 final grace。只有明确权限/协议
 * 错误可立即 fail closed，绝不解析本地化错误文案。
 */
export function classifyTurnReplayGap(
  observation: TurnReplayGapObservation,
): TurnReplayGapDisposition {
  const status = Math.max(0, Math.floor(Number(observation.status) || 0))
  const code = String(observation.code || '')
  const explicitlyRetryable = code === 'turn_replay_not_ready'
    || observation.retryable === true
  const explicitlyOversized = code === 'journal_delta_event_too_large' || status === 413
  const explicitIdentityFailure = code === 'turn_session_mismatch'
    || code === 'turn_identity_mismatch'
    || code.endsWith('_identity_mismatch')
    || code.endsWith('_cursor_invalid')
    || code.endsWith('_cursor_mismatch')
  if (explicitlyOversized || status === 403 || status === 422 || explicitIdentityFailure) {
    return 'broken'
  }
  const withinFinalGrace = observation.seenRunning
    && Math.max(0, Number(observation.leaseMissingForMs) || 0) < TURN_REPLAY_FINAL_GRACE_MS
  if (explicitlyRetryable && observation.seenRunning
    && (observation.liveLease || withinFinalGrace)) return 'retry'
  if (observation.seenRunning && observation.liveLease) return 'retry'
  if (withinFinalGrace) return 'retry'
  return 'expired'
}

/** 依次取第一项可信的正耗时；缺失值和历史 0 占位不能盖掉后续真实耗时。 */
export function preferredProcessDuration(...values: unknown[]): number {
  for (const value of values) {
    const duration = finitePositiveDuration(value)
    if (duration > 0) return duration
  }
  return 0
}

function finitePositiveDuration(value: unknown): number {
  const duration = typeof value === 'number' ? value : Number(value)
  return Number.isFinite(duration) && duration > 0 ? Math.round(duration) : 0
}
