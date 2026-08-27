/**
 * Shared geometry for the Codex-style panel toggle.
 *
 * The divider is intentionally authored in its expanded position.  The
 * collapsed state uses a transform on that same path so the browser can
 * interpolate the position and height without rebuilding the SVG DOM.
 */
export const CODEX_PANEL_TOGGLE_GEOMETRY = {
  canvas: {
    width: 40,
    height: 40,
    viewBox: '0 0 40 40',
  },
  frame: {
    x: 8.5,
    y: 10.5,
    width: 23,
    height: 19,
    radius: 4,
  },
  divider: {
    expandedX: 23.5,
    yStart: 11.2,
    yEnd: 28.8,
    collapsedOffsetX: 4,
    collapsedScaleY: 0.42,
  },
  strokeWidth: 2.2,
  transitionDurationMs: 280,
  transitionEasing: 'cubic-bezier(.22, 1, .36, 1)',
} as const

const dividerCenterY =
  (CODEX_PANEL_TOGGLE_GEOMETRY.divider.yStart + CODEX_PANEL_TOGGLE_GEOMETRY.divider.yEnd) / 2

/** The path used by the expanded and animated component states. */
export const CODEX_PANEL_TOGGLE_DIVIDER_PATH = `M${CODEX_PANEL_TOGGLE_GEOMETRY.divider.expandedX} ${CODEX_PANEL_TOGGLE_GEOMETRY.divider.yStart}V${CODEX_PANEL_TOGGLE_GEOMETRY.divider.yEnd}`

/** The equivalent path for a non-animated, collapsed SVG export. */
export const CODEX_PANEL_TOGGLE_COLLAPSED_DIVIDER_PATH = (() => {
  const { divider } = CODEX_PANEL_TOGGLE_GEOMETRY
  const collapsedStart = dividerCenterY + (divider.yStart - dividerCenterY) * divider.collapsedScaleY
  const collapsedEnd = dividerCenterY + (divider.yEnd - dividerCenterY) * divider.collapsedScaleY
  return `M${divider.expandedX + divider.collapsedOffsetX} ${collapsedStart.toFixed(3)}V${collapsedEnd.toFixed(3)}`
})()

export const CODEX_PANEL_TOGGLE_DEFAULT_COLOR = '#191c1f'
// The reference's collapsed raster is the neutral #88898a (expanded is #191c1f).
export const CODEX_PANEL_TOGGLE_COLLAPSED_COLOR = '#88898a'
export const CODEX_PANEL_TOGGLE_EXPANDED_FILL = '#ffffff'
export const CODEX_PANEL_TOGGLE_COLLAPSED_FILL = 'transparent'
