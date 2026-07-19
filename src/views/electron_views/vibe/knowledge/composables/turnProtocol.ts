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
  payload?: Record<string, any>
  item?: TurnProtocolItem
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
  failed: string
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

  for (const event of events) {
    const item = event.item
    if ((event.event_type === 'item_added' || event.event_type === 'item_updated') && item?.item_id) {
      if (!itemOrder.has(item.item_id)) itemOrder.set(item.item_id, event.sequence)
      items.set(item.item_id, item)
    }
    if (event.event_type === 'checkpoint') checkpoints.push(event)
    if (event.event_type === 'started') protocolState = 'running'
    else if (event.event_type === 'waiting') protocolState = 'waiting_user'
    else if (event.event_type === 'resumed') protocolState = 'running'
    else if (event.event_type === 'cancel_requested' || event.event_type === 'cancel_observed') protocolState = 'cancelling'
    else if (TERMINAL_STATE[event.event_type]) {
      protocolState = TERMINAL_STATE[event.event_type]
      terminal = event.event_type
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
  const notes: string[] = []
  const receipts: string[] = []
  const errors: string[] = []

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
      if (legacyType === 'notes') notes.push(...(payload.items || []).map(String).filter(Boolean))
    } else if (itemType === 'tool_call') {
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
      clarification = {
        question: content,
        raw: payload.raw,
        pending: Array.isArray(payload.pending) ? payload.pending : [],
      }
    } else if (itemType === 'receipt') {
      if (legacyType === 'write_commit' && payload.result && typeof payload.result === 'object') {
        writeCommits.push(payload.result)
      }
      if (content && payload.outcome) receipts.push(content)
    } else if (itemType === 'error' && content) {
      errors.push(content)
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

  const failed = errors.at(-1) || ''
  const contentParts = failed
    ? [failed.startsWith('本轮处理失败：') ? failed : `本轮处理失败：${failed}`]
    : [...answers]
  if (!contentParts.length && receipts.length) contentParts.push(receipts.at(-1) || '')
  if (notes.length) contentParts.push(`> ${notes.join('\n> ')}`)

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
    failed,
  }
}
