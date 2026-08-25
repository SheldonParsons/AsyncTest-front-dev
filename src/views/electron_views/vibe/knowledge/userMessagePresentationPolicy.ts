export const USER_MESSAGE_COLLAPSED_LINES = 18
export const USER_MESSAGE_COLLAPSED_VIEWPORT_RATIO = 0.52
export const USER_MESSAGE_OVERFLOW_TOLERANCE_PX = 1

/** 与 CSS 的 min(18lh, 52dvh) 保持同一边界。 */
export function userMessageCollapsedMaxHeight(input: {
  lineHeight: number
  viewportHeight: number
}): number {
  const lineHeight = Number.isFinite(input.lineHeight) ? Math.max(0, input.lineHeight) : 0
  const viewportHeight = Number.isFinite(input.viewportHeight) ? Math.max(0, input.viewportHeight) : 0
  return Math.min(
    lineHeight * USER_MESSAGE_COLLAPSED_LINES,
    viewportHeight * USER_MESSAGE_COLLAPSED_VIEWPORT_RATIO,
  )
}

/** 用真实排版后的 scrollHeight 判定，避免按字数猜测在不同宽度下产生假按钮。 */
export function userMessageContentOverflows(input: {
  scrollHeight: number
  lineHeight: number
  viewportHeight: number
}): boolean {
  const scrollHeight = Number.isFinite(input.scrollHeight) ? Math.max(0, input.scrollHeight) : 0
  return scrollHeight > userMessageCollapsedMaxHeight(input) + USER_MESSAGE_OVERFLOW_TOLERANCE_PX
}
