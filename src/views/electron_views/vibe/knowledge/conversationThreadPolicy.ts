export interface ConversationThreadEvent {
  id?: unknown
  session_id?: unknown
  event_order?: unknown
  created_at?: unknown
  role?: unknown
  content?: unknown
  meta?: Record<string, any>
}

function eventId(event: ConversationThreadEvent | null | undefined): string {
  return String(event?.id || '')
}

function explicitContinuationParentId(event: ConversationThreadEvent): string {
  return String(event?.meta?.continuation_context?.parent_event_id || '').trim()
}

function compareEvents(a: ConversationThreadEvent, b: ConversationThreadEvent): number {
  const orderA = Number(a?.event_order || 0)
  const orderB = Number(b?.event_order || 0)
  if (orderA !== orderB) return orderA - orderB
  return String(a?.created_at || '').localeCompare(String(b?.created_at || ''))
}

function sameSession(a: ConversationThreadEvent, b: ConversationThreadEvent): boolean {
  const aSession = String(a?.session_id || '')
  const bSession = String(b?.session_id || '')
  return !aSession || !bSession || aSession === bSession
}

function localRunId(event: ConversationThreadEvent): string {
  return event?.meta?.local_agent === true ? String(event?.meta?.run_id || '').trim() : ''
}

/**
 * 一份事件快照只排序、索引一次。页面应通过 computed 持有该索引，避免每个
 * 消息、每次输入和流式刷新都重新扫描整段历史。索引不缓存正文，也不修改事件。
 */
export function createConversationThreadIndex(events: ConversationThreadEvent[]) {
  const ordered = [...events].sort(compareEvents)
  const byId = new Map<string, ConversationThreadEvent>()
  const positions = new Map<ConversationThreadEvent, number>()
  const idPositions = new Map<string, number>()
  for (const event of events) {
    const id = eventId(event)
    if (id && !byId.has(id)) byId.set(id, event)
  }
  ordered.forEach((event, index) => {
    if (!positions.has(event)) positions.set(event, index)
    const id = eventId(event)
    if (id && !idPositions.has(id)) idPositions.set(id, index)
  })
  const positionOf = (event: ConversationThreadEvent) => idPositions.get(eventId(event)) ?? positions.get(event) ?? -1
  const localRoots = new Map<ConversationThreadEvent, string>()
  type Candidate = { event: ConversationThreadEvent; index: number }
  const runs = new Map<string, { first?: Candidate; unspecified?: Candidate; sessions: Map<string, Candidate> }>()
  ordered.forEach((event, index) => {
    const run = localRunId(event)
    const session = String(event.session_id || '')
    const group = runs.get(run)
    const candidates = session
      ? [group?.sessions.get(session), group?.unspecified]
      : [group?.first]
    const first = candidates.filter((item): item is Candidate => !!item && item.index < positionOf(event))
      .sort((a, b) => a.index - b.index)[0]
    // 重复 ID 属于异常历史：保留原有“第一个相同 ID”定位语义，不猜归属。
    const duplicate = positionOf(event) !== index
    const root = duplicate ? ordered.slice(0, Math.max(0, positionOf(event))).find(item => (
      item.role === 'assistant' && localRunId(item) === run && sameSession(item, event)
      && !!String(item.meta?.clarification?.question || '').trim()
    )) : first?.event
    localRoots.set(event, run ? eventId(root) : '')
    if (!run || event.role !== 'assistant' || !String(event.meta?.clarification?.question || '').trim()) return
    const current = group || { sessions: new Map<string, Candidate>() }
    const candidate = { event, index }
    current.first ??= candidate
    if (!session) current.unspecified ??= candidate
    else if (!current.sessions.has(session)) current.sessions.set(session, candidate)
    runs.set(run, current)
  })

  function localRoot(event: ConversationThreadEvent): string {
    const cached = localRoots.get(event)
    if (cached !== undefined) return cached
    const run = localRunId(event)
    if (!run) return ''
    return eventId(ordered.slice(0, Math.max(0, positionOf(event))).find(item => (
      item.role === 'assistant' && localRunId(item) === run && sameSession(item, event)
      && !!String(item.meta?.clarification?.question || '').trim()
    )))
  }
  function resolveParent(event: ConversationThreadEvent): string {
    const explicit = explicitContinuationParentId(event)
    if (explicit) return explicit
    if (event.role !== 'assistant') return ''
    const local = localRoot(event)
    if (local) return local
    const index = positionOf(event)
    if (index <= 0) return ''
    const reply = ordered[index - 1]
    if (reply.role !== 'user' || reply.meta?.confirmation_reply !== true || !sameSession(reply, event)) return ''
    const id = String(reply.meta?.parent_event_id || '').trim()
    const root = byId.get(id)
    return root?.role === 'assistant' && sameSession(root, event) ? id : ''
  }
  const parents = new Map(events.map(event => [event, resolveParent(event)]))
  const parent = (event: ConversationThreadEvent) => parents.get(event) ?? resolveParent(event)
  function replyParent(event: ConversationThreadEvent): string {
    const explicit = event.role === 'user' && event.meta?.confirmation_reply === true
      ? String(event.meta?.parent_event_id || '').trim() : ''
    if (explicit) return explicit
    return event.role === 'user' && event.meta?.interaction_response ? localRoot(event) : ''
  }
  function rootId(event: ConversationThreadEvent): string {
    const direct = (item: ConversationThreadEvent) => parent(item) || String(item.meta?.parent_event_id || '').trim()
    let id = direct(event)
    const seen = new Set<string>()
    while (id && !seen.has(id)) {
      seen.add(id)
      const ancestor = byId.get(id)
      if (!ancestor) return id
      const next = direct(ancestor)
      if (!next) return id
      id = next
    }
    return id
  }
  const toolEnvelope = (event: ConversationThreadEvent) => event.meta?.local_agent === true
    && Array.isArray(event.meta?.tool_calls) && event.meta.tool_calls.length > 0
  const responses = new Map<string, ConversationThreadEvent[]>()
  const replies = new Map<string, ConversationThreadEvent[]>()
  const visible = new Map<ConversationThreadEvent, boolean>()
  function shouldRender(event: ConversationThreadEvent): boolean {
    if (event.role === 'tool') return false
    if (event.role === 'assistant' && (toolEnvelope(event)
      || ['context_checkpoint', 'language_repair'].includes(String(event.meta?.purpose || '')))) return false
    if (event.meta?.hidden_interaction_reply) return false
    const id = parent(event)
    if (event.role === 'assistant' && id && byId.has(id)) return false
    const reply = replyParent(event)
    return event.role !== 'user' || (!event.meta?.confirmation_reply && !event.meta?.interaction_response)
      || !reply || !byId.has(reply)
  }
  for (const event of events) {
    if (event.role === 'assistant' && parent(event) && !toolEnvelope(event)) {
      const id = rootId(event)
      const children = responses.get(id) || []
      children.push(event)
      responses.set(id, children)
    }
    if (event.role === 'user' && replyParent(event)) {
      const id = replyParent(event)
      const children = replies.get(id) || []
      children.push(event)
      replies.set(id, children)
    }
    visible.set(event, shouldRender(event))
  }
  for (const children of responses.values()) children.sort(compareEvents)
  const empty: ConversationThreadEvent[] = []
  function children(root: ConversationThreadEvent): ConversationThreadEvent[] {
    return root.role === 'assistant' && eventId(root) ? responses.get(eventId(root)) || empty : empty
  }
  return {
    continuationParentEventId: parent,
    interactionReplyParentEventId: replyParent,
    eventThreadRootId: rootId,
    shouldRenderThreadEvent: (event: ConversationThreadEvent) => visible.get(event) ?? shouldRender(event),
    parentContinuationResponses: children,
    firstInteractionReply: (root: ConversationThreadEvent) => replies.get(eventId(root))?.[0],
    isResolvedInteractionThreadRoot: (root: ConversationThreadEvent) => !!eventId(root)
      && root.role === 'assistant' && !parent(root) && children(root).length > 0
      && !!replies.get(eventId(root))?.some(item => sameSession(item, root)),
  }
}

/* 兼容单次调用入口；会话页面使用上面的快照索引，所有归并规则保持同一所有者。 */
export function interactionReplyParentEventId(events: ConversationThreadEvent[], event: ConversationThreadEvent): string {
  return createConversationThreadIndex(events).interactionReplyParentEventId(event)
}
export function continuationParentEventId(events: ConversationThreadEvent[], event: ConversationThreadEvent): string {
  return createConversationThreadIndex(events).continuationParentEventId(event)
}
export function eventThreadRootId(events: ConversationThreadEvent[], event: ConversationThreadEvent): string {
  return createConversationThreadIndex(events).eventThreadRootId(event)
}
export function isContinuationAssistantEvent(events: ConversationThreadEvent[], event: ConversationThreadEvent): boolean {
  return event?.role === 'assistant' && !!continuationParentEventId(events, event)
}
export function shouldRenderThreadEvent(events: ConversationThreadEvent[], event: ConversationThreadEvent): boolean {
  return createConversationThreadIndex(events).shouldRenderThreadEvent(event)
}
export function parentContinuationResponses(events: ConversationThreadEvent[], root: ConversationThreadEvent): ConversationThreadEvent[] {
  return createConversationThreadIndex(events).parentContinuationResponses(root)
}
export function isResolvedInteractionThreadRoot(events: ConversationThreadEvent[], root: ConversationThreadEvent): boolean {
  return createConversationThreadIndex(events).isResolvedInteractionThreadRoot(root)
}


/**
 * Return only a formally projected read answer from a resolved interaction
 * root. Compact session history stores its display content outside the Journal;
 * for a write preview that content is the obsolete preview question, so it must
 * never be promoted to an answer. Legacy/full Journal answers remain usable.
 */
export function resolvedInteractionRootAnswerText(
  event: ConversationThreadEvent & { turn?: Record<string, any> },
  protocolAnswers: unknown[] = [],
): string {
  if (event?.meta?.failed === true || event?.meta?.message_kind === 'error') return ''
  const cards = Array.isArray(event?.meta?.answer?.cards) ? event.meta.answer.cards : []
  const answerCard = cards.find((card: any) => card?.type === 'answer' && card?.answer_text)
  const projected = String(event?.meta?.answer?.answer_text || answerCard?.answer_text || '').trim()
  if (projected) return projected
  if (event?.turn?.schema === 'session_turn_public.v1') return ''
  const seen = new Set<string>()
  return protocolAnswers
    .map(value => String(value || '').trim())
    .filter((value) => {
      if (!value || seen.has(value)) return false
      seen.add(value)
      return true
    })
    .join('\n\n')
}

export function threadFinalAnswerText(
  events: ConversationThreadEvent[],
  root: ConversationThreadEvent,
  displayContent: (event: ConversationThreadEvent) => string,
  index = createConversationThreadIndex(events),
): string {
  const seen = new Set<string>()
  const answers: string[] = []
  for (const event of [root, ...index.parentContinuationResponses(root)]) {
    let answer = String(displayContent(event) || '').trim()
    for (const previous of answers) {
      if (!answer.startsWith(previous)) continue
      const suffix = answer.slice(previous.length)
      if (suffix && !/^\s+/.test(suffix)) continue
      answer = suffix.trim()
      break
    }
    const key = answer.replace(/\s+/g, ' ')
    if (!key || seen.has(key)) continue
    seen.add(key)
    answers.push(answer)
  }
  return answers.join('\n\n')
}

export function shouldRenderStandaloneAssistantBody(
  event: ConversationThreadEvent,
  hasAnswerContent: boolean,
): boolean {
  if (event?.role === 'assistant'
    && new Set(['context_checkpoint', 'language_repair']).has(String(event?.meta?.purpose || ''))) return false
  return event?.role === 'assistant' && hasAnswerContent
}
