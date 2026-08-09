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
  if (event?.meta?.hidden_interaction_reply) return false
  const continuationParent = continuationParentEventId(events, event)
  if (event?.role === 'assistant' && continuationParent
    && events.some(item => eventId(item) === continuationParent)) return false
  const replyParent = String(event?.meta?.parent_event_id || '').trim()
  return event?.role !== 'user' || event?.meta?.confirmation_reply !== true
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
      && eventThreadRootId(events, item) === rootId)
    .sort(compareEvents)
}

export function threadFinalAnswerText(
  events: ConversationThreadEvent[],
  root: ConversationThreadEvent,
  displayContent: (event: ConversationThreadEvent) => string,
): string {
  const seen = new Set<string>()
  const answers: string[] = []
  for (const event of [root, ...parentContinuationResponses(events, root)]) {
    const answer = String(displayContent(event) || '').trim()
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
  return event?.role === 'assistant' && hasAnswerContent
}
