import type { ProcessStep } from './useProcessTurn'

export type TurnProtocolStateName =
  | 'queued'
  | 'running'
  | 'waiting_user'
  | 'cancelling'
  | 'cancelled'
  | 'interrupted'
  | 'succeeded'
  | 'failed'

export interface TurnProtocolItem {
  item_id: string
  turn_id?: string
  item_type: string
  phase?: string
  content?: string
  payload?: Record<string, any>
  parent_id?: string | null
}

export interface TurnProtocolEvent {
  schema_version?: number
  event_id: string
  turn_id: string
  sequence: number
  event_type: string
  created_at?: string
  payload?: Record<string, any>
  item?: TurnProtocolItem
  parent_id?: string | null
}

export interface TurnProtocolPacket {
  schema_version?: number
  events?: TurnProtocolEvent[]
  state?: TurnProtocolStateName
  terminal?: string | null
}

export interface TurnProtocolReadModel {
  turnId: string
  state: TurnProtocolStateName
  terminal: string
  content: string
  answers: string[]
  process: ProcessStep[]
  processSummary: Record<string, any>
  actions: string[]
  sources: any[]
  verification: any | null
  clarification: { question: string; raw?: any; pending: any[] } | null
  writeCommits: any[]
  turnPlan: Record<string, any>
  outcome: TurnProtocolOutcome | null
}

export type TurnProtocolOutcomeKind = 'failed' | 'cancelled' | 'interrupted'

export interface TurnProtocolOutcome {
  kind: TurnProtocolOutcomeKind
  state: TurnProtocolStateName
  terminal: string
  title: string
  detail: string
  reason: string
  partial: boolean
}

export interface SessionTurnPublicV1 {
  schema: 'session_turn_public.v1'
  latest_sequence: number
  state: TurnProtocolStateName
  terminal: string | null
  duration_ms?: number
  write_commit_count?: number
  outcome?: {
    kind: TurnProtocolOutcomeKind
    code: 'turn_failed' | 'turn_cancelled' | 'turn_interrupted'
      | 'answer_contract_failed' | 'resolution_answer_contract_failed'
    partial: false
  }
}

export interface TurnProtocolState {
  events: Map<string, TurnProtocolEvent>
}

const PROCESS_MESSAGE_TYPES = new Set(['reasoning_summary', 'commentary', 'runtime_progress'])
const TERMINAL_STATE: Record<string, TurnProtocolStateName> = {
  completed: 'succeeded',
  failed: 'failed',
  interrupted: 'interrupted',
  cancelled: 'cancelled',
}
const TURN_PROTOCOL_STATES = new Set<TurnProtocolStateName>([
  'queued',
  'running',
  'waiting_user',
  'cancelling',
  'cancelled',
  'interrupted',
  'succeeded',
  'failed',
])
const PUBLIC_OUTCOME_CODE: Record<
  TurnProtocolOutcomeKind,
  NonNullable<SessionTurnPublicV1['outcome']>['code']
> = {
  failed: 'turn_failed',
  cancelled: 'turn_cancelled',
  interrupted: 'turn_interrupted',
}
const PUBLIC_OUTCOME_TITLE: Record<TurnProtocolOutcomeKind, string> = {
  failed: '本轮处理失败',
  cancelled: '本轮已停止',
  interrupted: '本轮处理中断',
}
const ANSWER_DELIVERY_FAILURE_CODES = new Set([
  'answer_contract_failed', 'resolution_answer_contract_failed',
])
const ANSWER_DELIVERY_FAILURE_DETAIL = '答复未能交付；已执行操作的结果请以本轮操作记录为准。'
const sessionTurnPublicCache = new WeakMap<object, { signature: string; model: TurnProtocolReadModel }>()

function sessionProcessSteps(meta: any): ProcessStep[] {
  const rows = Array.isArray(meta?.process) ? meta.process : []
  const steps: ProcessStep[] = []
  rows.forEach((item: any, index: number) => {
    if (!item || typeof item !== 'object') return
    const sequence = typeof item.sequence === 'number' ? item.sequence : undefined
    if (item.kind === 'message') {
      steps.push({
        kind: 'message',
        key: String(item.item_id || item.step_id || `m-${index}`),
        text: String(item.text || ''),
        itemId: item.item_id || undefined,
        sequence,
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
        status: item.status || 'success',
        durationMs: typeof item.duration_ms === 'number' ? item.duration_ms : undefined,
        stats: item.stats && typeof item.stats === 'object' ? item.stats : undefined,
        itemId: item.item_id || undefined,
        sequence,
        phase: item.phase || undefined,
        source: item.source || undefined,
        authority: item.authority || undefined,
      })
    }
  })
  return steps.sort((left: any, right: any) => {
    const leftSequence = typeof left.sequence === 'number' ? left.sequence : Number.MAX_SAFE_INTEGER
    const rightSequence = typeof right.sequence === 'number' ? right.sequence : Number.MAX_SAFE_INTEGER
    return leftSequence - rightSequence
  })
}
const PROVIDER_TOOL_CALL_ID = /^call_[A-Za-z0-9_-]{8,}$/
const GENERIC_ACTION_SEMANTICS = new Set([
  'action',
  'tool_call',
  'process_action_started',
  'process_action_done',
])

function hasFormalActionSemantic(value: unknown): boolean {
  const normalized = String(value || '').trim()
  return !!normalized
    && !GENERIC_ACTION_SEMANTICS.has(normalized)
    && !PROVIDER_TOOL_CALL_ID.test(normalized)
}

function isInternalOrphanToolCall(content: string, payload: Record<string, any>): boolean {
  const title = String(payload.title || content || '').trim()
  if (!PROVIDER_TOOL_CALL_ID.test(title)) return false
  return ![
    payload.title,
    payload.action_code,
    payload.code,
    payload.action_type,
  ].some(hasFormalActionSemantic)
}

export function createTurnProtocolState(initialEvents: any[] = []): TurnProtocolState {
  const state: TurnProtocolState = { events: new Map() }
  applyTurnProtocolEvents(state, initialEvents)
  return state
}

export function hasTurnProtocolPacket(event: any): boolean {
  return Array.isArray(event?.turn_protocol?.events)
}

export function applyTurnProtocolPacket(state: TurnProtocolState, packet: any): TurnProtocolReadModel {
  applyTurnProtocolEvents(state, Array.isArray(packet?.events) ? packet.events : [])
  return readTurnProtocol(state)
}

export function applyTurnProtocolEvents(state: TurnProtocolState, events: any[]): TurnProtocolReadModel {
  for (const raw of events || []) {
    if (!raw || typeof raw !== 'object') continue
    const eventId = String(raw.event_id || '')
    const turnId = String(raw.turn_id || '')
    const sequence = Number(raw.sequence || 0)
    if (!eventId || !turnId || !Number.isFinite(sequence) || sequence < 1) continue
    state.events.set(eventId, {
      ...raw,
      event_id: eventId,
      turn_id: turnId,
      sequence,
      event_type: String(raw.event_type || ''),
      created_at: String(raw.created_at || ''),
      payload: raw.payload && typeof raw.payload === 'object' ? raw.payload : {},
      item: raw.item && typeof raw.item === 'object'
        ? {
            ...raw.item,
            item_id: String(raw.item.item_id || ''),
            item_type: String(raw.item.item_type || ''),
            payload: raw.item.payload && typeof raw.item.payload === 'object' ? raw.item.payload : {},
          }
        : undefined,
    })
  }
  return readTurnProtocol(state)
}

export function replayTurnProtocol(events: any[]): TurnProtocolReadModel {
  return readTurnProtocol(createTurnProtocolState(events))
}

export function readTurnProtocolFromMeta(meta: any): TurnProtocolReadModel | null {
  const events = meta?.turn_protocol?.events
  return Array.isArray(events) && events.length ? replayTurnProtocol(events) : null
}

/**
 * Session history 的 v1 终态摘要只负责公开身份；答案、过程和来源继续
 * 各自使用外层 event/meta 的单一副本，不再复制一份完整 Journal。
 */
export function readSessionTurnPublic(event: any): TurnProtocolReadModel | null {
  if (!event || typeof event !== 'object') return null
  const turn = event.turn
  if (!turn || typeof turn !== 'object' || turn.schema !== 'session_turn_public.v1') return null
  const turnId = String(event.turn_id || '')
  const state = String(turn.state || '') as TurnProtocolStateName
  const terminal = String(turn.terminal || '')
  const latestSequence = Number(turn.latest_sequence || 0)
  if (!turnId || !TURN_PROTOCOL_STATES.has(state)) return null
  if (!Number.isSafeInteger(latestSequence) || latestSequence < 1) return null
  if (terminal && TERMINAL_STATE[terminal] !== state) return null
  if (state === 'succeeded' && terminal !== 'completed') return null
  if (['failed', 'cancelled', 'interrupted'].includes(state) && !terminal) return null

  const signature = JSON.stringify([
    turnId,
    turn,
    event.content,
    event.meta,
  ])
  const cached = sessionTurnPublicCache.get(event)
  if (cached?.signature === signature) return cached.model

  const meta = event.meta && typeof event.meta === 'object' ? event.meta : {}
  const processSummary = meta.process_summary && typeof meta.process_summary === 'object'
    ? { ...meta.process_summary }
    : {}
  const durationMs = Number(turn.duration_ms || 0)
  if (Number.isFinite(durationMs) && durationMs > 0) {
    processSummary.duration_ms = Math.round(durationMs)
  }
  const clarificationValue = meta.clarification && typeof meta.clarification === 'object'
    ? meta.clarification
    : null
  const clarificationQuestion = String(clarificationValue?.question || '')
  const clarification = clarificationQuestion
    ? {
        question: clarificationQuestion,
        raw: clarificationValue?.raw,
        pending: Array.isArray(clarificationValue?.pending)
          ? clarificationValue.pending
          : (Array.isArray(meta.pending_interactions) ? meta.pending_interactions : []),
      }
    : null
  const adverse = ['failed', 'cancelled', 'interrupted'].includes(state)
    ? state as TurnProtocolOutcomeKind
    : null
  const answerDeliveryFailed = adverse === 'failed'
    && ANSWER_DELIVERY_FAILURE_CODES.has(String(turn.outcome?.code || ''))
  if (adverse) {
    const outcome = turn.outcome
    if (!outcome || outcome.kind !== adverse
      || (outcome.code !== PUBLIC_OUTCOME_CODE[adverse] && !answerDeliveryFailed)) {
      return null
    }
  }
  const content = adverse ? '' : String(event.content || '')
  const writeCommitCount = Math.max(0, Math.floor(Number(turn.write_commit_count) || 0))
  const model: TurnProtocolReadModel = {
    turnId,
    state,
    terminal,
    content,
    answers: content.trim() ? [content] : [],
    process: sessionProcessSteps(meta),
    processSummary,
    actions: [],
    sources: Array.isArray(meta.sources) ? meta.sources : [],
    verification: meta.verification && typeof meta.verification === 'object'
      ? meta.verification
      : null,
    clarification,
    writeCommits: writeCommitCount > 0
      ? Array.from({ length: Math.min(writeCommitCount, 1000) }, () => ({ publicCommit: true }))
      : [],
    turnPlan: {},
    outcome: adverse
      ? {
          kind: adverse,
          state,
          terminal,
          title: answerDeliveryFailed ? '答复未能交付' : PUBLIC_OUTCOME_TITLE[adverse],
          detail: answerDeliveryFailed ? ANSWER_DELIVERY_FAILURE_DETAIL : '',
          reason: '',
          partial: false,
        }
      : null,
  }
  sessionTurnPublicCache.set(event, { signature, model })
  return model
}

export function protocolEventsFromMeta(meta: any): TurnProtocolEvent[] {
  const events = meta?.turn_protocol?.events
  return Array.isArray(events) ? events : []
}

export function readTurnProtocol(state: TurnProtocolState): TurnProtocolReadModel {
  const events = [...state.events.values()].sort((left, right) => left.sequence - right.sequence)
  const items = new Map<string, TurnProtocolItem>()
  const itemOrder = new Map<string, number>()
  const checkpoints: TurnProtocolEvent[] = []
  let protocolState: TurnProtocolStateName = 'queued'
  let terminal = ''
  let terminalPayload: Record<string, any> = {}
  let cancellationPayload: Record<string, any> = {}
  let pendingClarificationId = ''
  let startedAtMs = 0
  let settledAtMs = 0

  for (const event of events) {
    const item = event.item
    if ((event.event_type === 'item_added' || event.event_type === 'item_updated') && item?.item_id) {
      if (!itemOrder.has(item.item_id)) itemOrder.set(item.item_id, event.sequence)
      items.set(item.item_id, item)
    }
    if (event.event_type === 'checkpoint') checkpoints.push(event)
    const eventAtMs = protocolTimestampMs(event.created_at)
    if (event.event_type === 'started') {
      protocolState = 'running'
      if (eventAtMs > 0 && !startedAtMs) startedAtMs = eventAtMs
    }
    else if (event.event_type === 'waiting') {
      protocolState = 'waiting_user'
      pendingClarificationId = String(event.parent_id || '')
      if (eventAtMs > 0) settledAtMs = eventAtMs
    }
    else if (event.event_type === 'resumed') {
      protocolState = 'running'
      pendingClarificationId = ''
    }
    else if (event.event_type === 'cancel_requested' || event.event_type === 'cancel_observed') {
      protocolState = 'cancelling'
      cancellationPayload = event.payload && typeof event.payload === 'object' ? event.payload : {}
    }
    else if (TERMINAL_STATE[event.event_type]) {
      protocolState = TERMINAL_STATE[event.event_type]
      pendingClarificationId = ''
      terminal = event.event_type
      terminalPayload = event.payload && typeof event.payload === 'object' ? event.payload : {}
      if (eventAtMs > 0) settledAtMs = eventAtMs
    }
  }

  const orderedItems = [...items.values()].sort((left, right) => {
    return (itemOrder.get(left.item_id) || Number.MAX_SAFE_INTEGER)
      - (itemOrder.get(right.item_id) || Number.MAX_SAFE_INTEGER)
  })
  const answers: string[] = []
  const process: ProcessStep[] = []
  let actions: string[] = []
  let sources: any[] = []
  let verification: any | null = null
  let clarification: TurnProtocolReadModel['clarification'] = null
  const writeCommits: any[] = []
  const receipts: Array<{ content: string; payload: Record<string, any> }> = []
  const errors: Array<{ content: string; payload: Record<string, any> }> = []

  for (const item of orderedItems) {
    const itemId = String(item.item_id || '')
    const itemType = String(item.item_type || '')
    const content = String(item.content || '').trim()
    const payload = item.payload && typeof item.payload === 'object' ? item.payload : {}
    const legacyType = String(payload.legacy_type || '')
    const sequence = itemOrder.get(itemId)
    if (itemType === 'assistant_message') {
      if (content && !answers.includes(content)) answers.push(content)
    } else if (PROCESS_MESSAGE_TYPES.has(itemType)) {
      if (content) {
        process.push({
          kind: 'message',
          key: itemId,
          itemId,
          sequence,
          phase: String(payload.phase || item.phase || 'commentary'),
          source: String(payload.source || 'runtime'),
          authority: String(payload.authority || 'display_only'),
          text: content,
          streaming: itemType === 'commentary' && !payload.complete,
        })
      }
      if (legacyType === 'intent') actions = (payload.actions || []).map(String)
    } else if (itemType === 'tool_call') {
      // 纵深防御：原始 Canonical 事件仍留在 state，只从可见过程投影中排除无正式语义的孤立调用 ID。
      if (isInternalOrphanToolCall(content, payload)) continue
      process.push({
        kind: 'action',
        key: itemId,
        itemId,
        sequence,
        phase: String(payload.phase || item.phase || 'runtime_progress'),
        source: String(payload.source || 'runtime'),
        authority: String(payload.authority || 'runtime_truth'),
        actionId: String(payload.action_id || ''),
        actionType: String(payload.action_type || 'action'),
        title: String(payload.title || content || '执行动作'),
        summary: String(payload.summary || ''),
        status: (payload.status || 'unknown') as any,
        durationMs: typeof payload.duration_ms === 'number' ? payload.duration_ms : undefined,
        model: payload.model || undefined,
        useCase: payload.use_case || undefined,
        stats: payload.stats && typeof payload.stats === 'object' ? payload.stats : {},
        details: payload.details && typeof payload.details === 'object' ? payload.details : {},
      })
    } else if (itemType === 'tool_result') {
      if (legacyType === 'sources') sources = Array.isArray(payload.items) ? payload.items : []
      if (legacyType === 'verification') {
        const issues = Array.isArray(payload.issues) ? payload.issues.map(String) : []
        verification = {
          checked: !!payload.checked,
          clean: payload.clean != null ? !!payload.clean : !issues.length,
          issues,
        }
      }
    } else if (itemType === 'clarification') {
      const completedReadAnswer = String(payload.raw?.completed_read_answer || '').trim()
      if (completedReadAnswer && !answers.includes(completedReadAnswer)) answers.push(completedReadAnswer)
      if (itemId === pendingClarificationId) {
        clarification = {
          question: content,
          raw: payload.raw,
          pending: Array.isArray(payload.pending) ? payload.pending : [],
        }
      }
    } else if (itemType === 'receipt') {
      if (legacyType === 'write_commit' && payload.result && typeof payload.result === 'object') {
        writeCommits.push(payload.result)
      }
      if (content) receipts.push({ content, payload })
    } else if (itemType === 'error' && content) {
      errors.push({ content, payload })
    }
  }

  if (terminal) {
    for (const step of process) {
      if (step.kind === 'action' && step.status === 'running') step.status = 'unknown'
      if (step.kind === 'message' && step.streaming) step.streaming = false
    }
  }

  let turnPlan: Record<string, any> = {}
  let processSummary: Record<string, any> = {}
  for (const event of checkpoints) {
    const checkpoint = String(event.payload?.checkpoint || '')
    const data = event.payload?.data && typeof event.payload.data === 'object' ? event.payload.data : {}
    if (checkpoint === 'decision_contract' && data.plan && typeof data.plan === 'object') {
      turnPlan = data.plan
    } else if (checkpoint === 'process_done') {
      processSummary = {
        duration_ms: Number(data.duration_ms || 0),
        summary: String(data.summary || ''),
        stats: data.stats && typeof data.stats === 'object' ? data.stats : {},
      }
    }
  }
  // 公共协议刻意不暴露内部 duration_ms；用同一 Canonical 生命周期的
  // started → terminal/waiting 时间恢复用户看到的“整轮已处理”耗时。
  if (!(Number(processSummary.duration_ms) > 0) && startedAtMs > 0 && settledAtMs >= startedAtMs) {
    const lifecycleDuration = Math.round(settledAtMs - startedAtMs)
    if (lifecycleDuration > 0) processSummary.duration_ms = lifecycleDuration
  }

  const lastError = errors.at(-1)
  const contentParts = [...answers]
  // 成功写入可能只有后端 receipt、没有独立 answer；只在正式成功终态下把回执作为正文。
  // 失败、取消和中断回执由 outcome 独立展示，绝不能伪装成成功答案。
  if (!contentParts.length && protocolState === 'succeeded' && receipts.length) {
    contentParts.push(receipts.at(-1)?.content || '')
  }

  let outcome: TurnProtocolOutcome | null = null
  if (['failed', 'cancelled', 'interrupted'].includes(protocolState)) {
    const cancelledReceipt = [...receipts].reverse().find(item => item.payload.outcome === 'cancelled')
    const detail = protocolState === 'cancelled'
      ? String(
          cancelledReceipt?.content
          || terminalPayload.detail
          || terminalPayload.message
          || cancellationPayload.detail
          || cancellationPayload.message
          || '',
        )
      : String(lastError?.content || terminalPayload.detail || terminalPayload.message || '')
    const reason = String(
      (protocolState === 'failed' && (lastError?.payload?.reason || lastError?.payload?.code))
      || terminalPayload.reason
      || lastError?.payload?.reason
      || cancelledReceipt?.payload?.reason
      || cancellationPayload.reason
      || '',
    )
    const answerDeliveryFailed = protocolState === 'failed'
      && ANSWER_DELIVERY_FAILURE_CODES.has(reason)
    const title = protocolState === 'failed'
      ? (answerDeliveryFailed ? '答复未能交付' : '本轮处理失败')
      : protocolState === 'cancelled'
        ? '本轮已停止'
        : '本轮处理中断'
    outcome = {
      kind: protocolState as TurnProtocolOutcomeKind,
      state: protocolState,
      terminal,
      title,
      detail: protocolState === 'failed'
        ? (answerDeliveryFailed ? ANSWER_DELIVERY_FAILURE_DETAIL : '')
        : detail,
      reason: protocolState === 'failed' ? '' : reason,
      // Canonical Turn Protocol v2 当前没有正式 partial 字段或 terminal。
      // 即使失败前已有 assistant_message，也不能由前端自行命名为 partial。
      partial: false,
    }
  }

  return {
    turnId: events[0]?.turn_id || '',
    state: protocolState,
    terminal,
    content: contentParts.filter(Boolean).join('\n\n'),
    answers,
    process,
    processSummary,
    actions,
    sources,
    verification,
    clarification,
    writeCommits,
    turnPlan,
    outcome,
  }
}

function protocolTimestampMs(value: unknown): number {
  if (typeof value !== 'string' || !value.trim()) return 0
  const parsed = Date.parse(value)
  return Number.isFinite(parsed) ? parsed : 0
}
