export type RouteQueryValue = string | number | null | undefined | Array<string | number | null>
export type RouteQueryLike = Record<string, RouteQueryValue>

export interface AuthNavigationContext {
  path: string
  query?: RouteQueryLike
  electron: boolean
  forceVibe?: boolean
}

export interface AuthRouteLocation {
  name: string
  query?: Record<string, string>
}

const VIBE_PROTECTED_PATHS = new Set([
  '/vibe/knowledge',
  '/vibe/browser',
  '/vibe/settings',
  '/vibe/settings/trace',
  '/vibe/chat',
])

function firstQueryValue(value: RouteQueryValue): string {
  const raw = Array.isArray(value) ? value[0] : value
  return raw == null ? '' : String(raw)
}

export function isVibePath(path: string): boolean {
  return path === '/vibe' || path.startsWith('/vibe/')
}

export function isVibeWindowKey(value: RouteQueryValue): boolean {
  const windowKey = firstQueryValue(value)
  return windowKey === 'vibe' || windowKey.startsWith('vibe-')
}

export function isVibeContext(path: string, query: RouteQueryLike = {}): boolean {
  return isVibePath(path) || isVibeWindowKey(query.windowKey)
}

export function isProtectedVibePath(path: string): boolean {
  return VIBE_PROTECTED_PATHS.has(path)
}

export function isAuthenticationFailure(status: unknown, payload: any): boolean {
  const responseStatus = Number(status)
  if (responseStatus === 401) return true
  if (responseStatus !== 403) return false
  if (Number(payload?.code) === 302) return false
  return Boolean(payload?.detail)
}

export function vibeWelcomeQuery(query: RouteQueryLike = {}): Record<string, string> {
  const windowKey = firstQueryValue(query.windowKey)
  return windowKey ? { windowKey } : {}
}

export function unauthenticatedLocation(context: AuthNavigationContext): AuthRouteLocation {
  if (context.forceVibe || isVibeContext(context.path, context.query)) {
    return {
      name: 'vibeWorkbench',
      query: vibeWelcomeQuery(context.query),
    }
  }
  return {
    name: context.electron ? 'dashboard' : 'login',
  }
}
