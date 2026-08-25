export interface ConversationEmptyStateInput {
  eventCount: number
  activeSessionId: string
  streamingOwnerSessionId: string
  streamingPending: boolean
}

/**
 * 欢迎页只属于“当前会话既无历史、也无在途 turn”的状态。
 * streamingPending 必须由调用方的会话级 owner/运行态得出，不能传窗口级 busy。
 */
export function shouldShowConversationEmptyState(input: ConversationEmptyStateInput): boolean {
  if (input.eventCount > 0) return false
  const currentSessionOwnsStreamingTurn = !!input.activeSessionId
    && input.streamingOwnerSessionId === input.activeSessionId
    && input.streamingPending
  return !currentSessionOwnsStreamingTurn
}
