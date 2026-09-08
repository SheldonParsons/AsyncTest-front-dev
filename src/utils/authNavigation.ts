import { reactive, readonly } from 'vue'
import GlobalStatus from '@/global'
import asyncTest from '@/db'
import {
  isAuthenticationFailure,
  isVibeContext,
  isLocalMindContext,
  type RouteQueryLike,
  unauthenticatedLocation,
} from '@/utils/authNavigationPolicy'

const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true'

const authState = reactive({
  hasLocalToken: false,
  status: 'unknown' as 'unknown' | 'checking' | 'authorized' | 'unauthorized' | 'unavailable',
})

let verifiedToken: string | null = null
export const AUTH_STATE_EVENT = 'ast:auth-state-changed'

export function setAuthStatus(status: typeof authState.status, token = readLocalAuthToken()): void {
  if (token !== readLocalAuthToken()) return
  if (status === 'authorized') verifiedToken = token
  else if (status !== 'checking' || verifiedToken !== token) verifiedToken = null
  authState.hasLocalToken = Boolean(token)
  authState.status = status
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT))
}

export function isSessionAuthorized(): boolean {
  return (authState.status === 'authorized' || authState.status === 'checking')
    && Boolean(verifiedToken) && verifiedToken === readLocalAuthToken()
}

let navigationInFlight: Promise<void> | null = null

function currentRouteContext() {
  const route = asyncTest.router.router?.currentRoute?.value
  return {
    path: String(route?.path || window.location.pathname || ''),
    query: (route?.query || {}) as RouteQueryLike,
  }
}

export const vibeAuthState = readonly(authState)

export function readLocalAuthToken(): string | null {
  const token = asyncTest.cookies.getCookie(GlobalStatus.cookieTag)
  return token === false || !token ? null : String(token)
}

export function refreshLocalAuthState(): boolean {
  authState.hasLocalToken = Boolean(readLocalAuthToken())
  if (!authState.hasLocalToken) { authState.status = 'unauthorized'; verifiedToken = null }
  else if (verifiedToken !== readLocalAuthToken() && authState.status === 'authorized') authState.status = 'unknown'
  return authState.hasLocalToken
}

export function clearLocalAuthState(): void {
  asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
  authState.hasLocalToken = false
  authState.status = 'unauthorized'
  verifiedToken = null
  window.dispatchEvent(new CustomEvent(AUTH_STATE_EVENT))
}

export function isCurrentVibeContext(): boolean {
  const context = currentRouteContext()
  return isVibeContext(context.path, context.query)
}

export async function navigateToUnauthenticated(options: {
  forceVibe?: boolean
  clearAuth?: boolean
} = {}): Promise<void> {
  const router = asyncTest.router.router
  if (!router) return

  const context = currentRouteContext()
  const vibeContext = Boolean(options.forceVibe) || isVibeContext(context.path, context.query)
  if (options.clearAuth || vibeContext) {
    clearLocalAuthState()
  } else {
    refreshLocalAuthState()
  }

  // 本地编辑器及其新窗口不能被认证请求改成 dashboard。
  if (isLocalMindContext(context.path, context.query)) return

  const target = unauthenticatedLocation({
    ...context,
    electron: isElectron,
    forceVibe: options.forceVibe,
  })
  const currentName = String(router.currentRoute.value?.name || '')
  const currentWindowKey = String(router.currentRoute.value?.query?.windowKey || '')
  const targetWindowKey = String(target.query?.windowKey || '')
  if (currentName === target.name && currentWindowKey === targetWindowKey) return
  if (navigationInFlight) return navigationInFlight

  navigationInFlight = Promise.resolve(router.replace(target))
    .then(() => undefined)
    .catch(() => undefined)
    .finally(() => {
      navigationInFlight = null
    })
  return navigationInFlight
}

export async function handleAuthenticationFailure(
  status: unknown,
  payload: unknown,
  options: { forceVibe?: boolean; navigate?: boolean; requestToken?: string | null } = {},
): Promise<boolean> {
  if (!isAuthenticationFailure(status, payload)) return false
  if (options.requestToken !== undefined && options.requestToken !== readLocalAuthToken()) return true
  clearLocalAuthState()
  if (window.electronAPI?.wm?.broadcast) {
    void window.electronAPI.wm.broadcast('auth:logout', { sourceWindow: currentRouteContext().query.windowKey || 'main' }).catch(() => {})
  }
  if (options.navigate !== false) await navigateToUnauthenticated({ forceVibe: options.forceVibe })
  return true
}
