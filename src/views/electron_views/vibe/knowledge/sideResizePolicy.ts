/**
 * Width policy for the Vibe knowledge page's project/conversation sidebar.
 *
 * The sidebar is intentionally kept independent from the conversation panel's
 * Viewer width policy.  Keeping the numbers here makes the responsive tradeoff
 * explicit and avoids scattering magic values through the view component.
 */
export const VIBE_SIDE_WIDTH_DEFAULT_PX = 282
export const VIBE_SIDE_WIDTH_MIN_PX = 220
export const VIBE_SIDE_WIDTH_MAX_PX = 420
export const VIBE_SIDE_MAIN_MIN_PX = 360
export const VIBE_SIDE_WIDTH_KEYBOARD_STEP_PX = 24

export interface VibeSideWidthRange {
  min: number
  max: number
}

function finitePixels(value: unknown): number {
  const numeric = Number(value)
  return Number.isFinite(numeric) ? Math.max(0, Math.round(numeric)) : 0
}

/**
 * Return the legal sidebar range for the current shell width.
 *
 * On a normal/large window the range is 220–420px.  When the available width
 * is smaller than that range, the sidebar yields space to the main panel and
 * contracts below 220px as a responsive fallback.  This keeps the two grid
 * tracks inside the viewport instead of allowing a horizontal overflow.
 */
export function vibeSideWidthRange(containerWidth: unknown): VibeSideWidthRange {
  const available = finitePixels(containerWidth)
  if (!available) {
    return { min: VIBE_SIDE_WIDTH_MIN_PX, max: VIBE_SIDE_WIDTH_MAX_PX }
  }

  const roomForSide = available - VIBE_SIDE_MAIN_MIN_PX
  const responsiveMin = Math.max(0, Math.min(VIBE_SIDE_WIDTH_MIN_PX, roomForSide))
  const max = Math.max(
    responsiveMin,
    Math.min(VIBE_SIDE_WIDTH_MAX_PX, Math.max(0, roomForSide)),
  )

  return { min: responsiveMin, max }
}

export function clampVibeSideWidth(width: unknown, containerWidth: unknown): number {
  const range = vibeSideWidthRange(containerWidth)
  const value = finitePixels(width)
  const requested = value > 0 ? value : VIBE_SIDE_WIDTH_DEFAULT_PX
  return Math.min(range.max, Math.max(range.min, requested))
}

/** Dragging the boundary to the right expands the sidebar. */
export function draggedVibeSideWidth(input: {
  startWidth: number
  startClientX: number
  clientX: number
  containerWidth: number
}): number {
  return clampVibeSideWidth(
    input.startWidth + input.clientX - input.startClientX,
    input.containerWidth,
  )
}
