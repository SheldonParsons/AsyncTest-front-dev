import { reactive, readonly } from 'vue'
import GlobalStatus from '@/global'
import asyncTest from '@/db'
import {
  isAuthenticationFailure,
  isVibeContext,
  type RouteQueryLike,
  unauthenticatedLocation,
} from '@/utils/authNavigationPolicy'

const isElectron = import.meta.env.VITE_IS_ELECTRON === 'true'

const authState = reactive({
  hasLocalToken: false,
})

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
  return authState.hasLocalToken
}

export function clearLocalAuthState(): void {
  asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
  authState.hasLocalToken = false
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
  options: { forceVibe?: boolean } = {},
): Promise<boolean> {
  if (!isAuthenticationFailure(status, payload)) return false
  await navigateToUnauthenticated({
    forceVibe: options.forceVibe,
    clearAuth: options.forceVibe || isCurrentVibeContext(),
  })
  return true
}
