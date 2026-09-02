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

function localInteractionRootId(
  events: ConversationThreadEvent[],
  event: ConversationThreadEvent,
): string {
  const runId = localRunId(event)
  if (!runId) return ''
  const ordered = [...events].sort(compareEvents)
  const id = eventId(event)
  const index = ordered.findIndex(item => item === event || (!!id && eventId(item) === id))
  if (index <= 0) return ''
  const root = ordered.slice(0, index).find(item => (
    item?.role === 'assistant'
    && localRunId(item) === runId
    && sameSession(item, event)
    && !!String(item?.meta?.clarification?.question || '').trim()
  ))
  return eventId(root)
}

export function interactionReplyParentEventId(
  events: ConversationThreadEvent[],
  event: ConversationThreadEvent,
): string {
  const explicit = event?.role === 'user' && event?.meta?.confirmation_reply === true
    ? String(event?.meta?.parent_event_id || '').trim()
    : ''
  if (explicit) return explicit
  if (event?.role !== 'user' || !event?.meta?.interaction_response) return ''
  return localInteractionRootId(events, event)
}

/**
 * 显式 continuation_context 永远优先。仅为存量异常失败回执提供窄兼容：
 * assistant 在事件序列中紧邻 confirmation_reply user，且该 user 指向同会话内
 * 已存在的 assistant 根时，才推导为该根的 continuation。
 */
export function continuationParentEventId(
  events: ConversationThreadEvent[],
  event: ConversationThreadEvent,
): string {
  const explicit = explicitContinuationParentId(event)
  if (explicit) return explicit
  if (event?.role !== 'assistant') return ''

  const localRoot = localInteractionRootId(events, event)
  if (localRoot) return localRoot

  const ordered = [...events].sort(compareEvents)
  const id = eventId(event)
  const index = ordered.findIndex(item => item === event || (!!id && eventId(item) === id))
  if (index <= 0) return ''
  const reply = ordered[index - 1]
  if (reply?.role !== 'user' || reply?.meta?.confirmation_reply !== true || !sameSession(reply, event)) return ''

  const parentId = String(reply?.meta?.parent_event_id || '').trim()
  if (!parentId) return ''
  const root = events.find(item => eventId(item) === parentId)
  if (!root || root?.role !== 'assistant' || !sameSession(root, event)) return ''
  return parentId
}

function directParentEventId(
  events: ConversationThreadEvent[],
  event: ConversationThreadEvent,
): string {
  return continuationParentEventId(events, event)
    || String(event?.meta?.parent_event_id || '').trim()
}

export function eventThreadRootId(
  events: ConversationThreadEvent[],
  event: ConversationThreadEvent,
): string {
  let parentId = directParentEventId(events, event)
  const seen = new Set<string>()
  while (parentId && !seen.has(parentId)) {
    seen.add(parentId)
    const parent = events.find(item => eventId(item) === parentId)
    if (!parent) return parentId
    const nextParentId = directParentEventId(events, parent)
    if (!nextParentId) return parentId
    parentId = nextParentId
  }
  return parentId
}

export function isContinuationAssistantEvent(
  events: ConversationThreadEvent[],
  event: ConversationThreadEvent,
): boolean {
  return event?.role === 'assistant' && !!continuationParentEventId(events, event)
}

export function shouldRenderThreadEvent(
  events: ConversationThreadEvent[],
  event: ConversationThreadEvent,
): boolean {
  // Tool messages and assistant tool-call envelopes are Provider history, not
  // chat bubbles. The visible final/interaction assistant for the same local
  // run projects their narration into ProcessDisclosure.
  if (event?.role === 'tool') return false
  if (event?.role === 'assistant'
    && event?.meta?.local_agent === true
    && Array.isArray(event?.meta?.tool_calls)
    && event.meta.tool_calls.length > 0) return false
  // Context checkpoints and language repairs are internal control evidence;
  // even if an older/local journal contains them, they must never become a
  // standalone assistant bubble or participate in thread projection.
  if (event?.role === 'assistant'
    && new Set(['context_checkpoint', 'language_repair']).has(String(event?.meta?.purpose || ''))) return false
  if (event?.meta?.hidden_interaction_reply) return false
  const continuationParent = continuationParentEventId(events, event)
  if (event?.role === 'assistant' && continuationParent
    && events.some(item => eventId(item) === continuationParent)) return false
  const replyParent = interactionReplyParentEventId(events, event)
  return event?.role !== 'user' || (!event?.meta?.confirmation_reply && !event?.meta?.interaction_response)
    || !replyParent || !events.some(item => eventId(item) === replyParent)
}

export function parentContinuationResponses(
  events: ConversationThreadEvent[],
  root: ConversationThreadEvent,
): ConversationThreadEvent[] {
  const rootId = eventId(root)
  if (!rootId || root?.role !== 'assistant') return []
  return events
    .filter(item => isContinuationAssistantEvent(events, item)
      && !(item?.meta?.local_agent === true
        && Array.isArray(item?.meta?.tool_calls)
        && item.meta.tool_calls.length > 0)
      && eventThreadRootId(events, item) === rootId)
    .sort(compareEvents)
}

/**
 * A completed pending interaction remains one visible conversation turn even
 * after the backend removes its closed clarification card.  The durable
 * identity is the explicit confirmation reply plus its continuation child;
 * adjacency and message text are deliberately not used.
 */
export function isResolvedInteractionThreadRoot(
  events: ConversationThreadEvent[],
  root: ConversationThreadEvent,
): boolean {
  const rootId = eventId(root)
  if (!rootId || root?.role !== 'assistant') return false
  if (continuationParentEventId(events, root)) return false
  const hasReply = events.some(item => item?.role === 'user'
    && interactionReplyParentEventId(events, item) === rootId
    && sameSession(item, root))
  return hasReply && parentContinuationResponses(events, root).length > 0
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
): string {
  const seen = new Set<string>()
  const answers: string[] = []
  for (const event of [root, ...parentContinuationResponses(events, root)]) {
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
