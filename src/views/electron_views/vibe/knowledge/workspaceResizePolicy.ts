export const WORKSPACE_VIEWER_DEFAULT_RATIO = 0.46
export const WORKSPACE_VIEWER_DEFAULT_MAX_PX = 760
export const WORKSPACE_VIEWER_MIN_PX = 420
export const WORKSPACE_VIEWER_MAX_PX = 1040
export const WORKSPACE_CONVERSATION_MIN_PX = 520
export const WORKSPACE_VIEWER_KEYBOARD_STEP_PX = 24

export interface WorkspaceViewerWidthRange {
  min: number
  max: number
}

function finitePixels(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0
}

/** Viewer 保留自身最小宽度，同时不侵占主对话的最低可用空间。 */
export function workspaceViewerWidthRange(containerWidth: unknown): WorkspaceViewerWidthRange {
  const available = finitePixels(containerWidth)
  if (!available) return { min: WORKSPACE_VIEWER_MIN_PX, max: WORKSPACE_VIEWER_MAX_PX }
  const max = Math.max(
    WORKSPACE_VIEWER_MIN_PX,
    Math.min(WORKSPACE_VIEWER_MAX_PX, available - WORKSPACE_CONVERSATION_MIN_PX),
  )
  return { min: WORKSPACE_VIEWER_MIN_PX, max }
}

export function clampWorkspaceViewerWidth(width: unknown, containerWidth: unknown): number {
  const range = workspaceViewerWidthRange(containerWidth)
  const value = finitePixels(width) || range.min
  return Math.min(range.max, Math.max(range.min, value))
}

/** 默认比旧 62% 更克制；宽屏也不会超过 760px。 */
export function defaultWorkspaceViewerWidth(containerWidth: unknown): number {
  const available = finitePixels(containerWidth)
  return clampWorkspaceViewerWidth(
    Math.min(available * WORKSPACE_VIEWER_DEFAULT_RATIO, WORKSPACE_VIEWER_DEFAULT_MAX_PX),
    available,
  )
}

/** 拖动左边界：指针向左扩大 Viewer，向右缩小 Viewer。 */
export function draggedWorkspaceViewerWidth(input: {
  startWidth: number
  startClientX: number
  clientX: number
  containerWidth: number
}): number {
  return clampWorkspaceViewerWidth(
    input.startWidth + input.startClientX - input.clientX,
    input.containerWidth,
  )
}
