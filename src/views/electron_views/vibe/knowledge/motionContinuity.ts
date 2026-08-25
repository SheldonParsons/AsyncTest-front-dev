export const VIBE_SHIMMER_PERIOD_MS = 1800

/**
 * 把 CSS 动画相位锚定到 performance 时间轴。
 * 组件即使在 live → persisted 交接时重挂载，也会从同一全局相位继续。
 */
export function continuousAnimationDelay(
  periodMs = VIBE_SHIMMER_PERIOD_MS,
  nowMs = typeof performance === 'undefined' ? 0 : performance.now(),
): string {
  if (!Number.isFinite(periodMs) || periodMs <= 0 || !Number.isFinite(nowMs)) return '0ms'
  const phase = ((nowMs % periodMs) + periodMs) % periodMs
  const roundedPhase = Math.round(phase)
  return roundedPhase ? `-${roundedPhase}ms` : '0ms'
}
