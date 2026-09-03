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
  // local terminalPending 表示该气泡仍由 Electron Main 的本地运行 owner
  // 接管。Main 的瞬时状态变化不能推翻 pending；真正收口失败时 owner
  // 会先把 terminalPending 明确降为 false。
  const active = turnIsActive === true || presentation?.terminalPending === true
  return !!model
    && !model.terminal
    && model.state !== 'waiting_user'
    && !active
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
