import { computed, ref } from 'vue'
import { http } from '@/utils/http'

export const CURRENT_USER_PROFILE_EVENT = 'user:profile-updated'
export const DEFAULT_AVATAR_USER_ID = 99
export const DEFAULT_AVATAR_BASE_URL = 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/users'

export interface CurrentUserProfile {
  id: number | null
  username: string
  nick_name: string
  display_name: string
  email: string
  mobile: string
  sex: number
  last_login: string
  is_superuser: boolean
  is_staff: boolean
  is_active: boolean
  date_joined: string
  add_time: string
  avatar_url: string
}

export interface CurrentUserProfilePayload {
  id?: number | string | null
  username?: string | null
  nick_name?: string | null
  display_name?: string | null
  email?: string | null
  mobile?: string | null
  sex?: number | string | null
  last_login?: string | null
  is_superuser?: boolean | null
  is_staff?: boolean | null
  is_active?: boolean | null
  date_joined?: string | null
  add_time?: string | null
  avatar_url?: string | null
}

export interface CurrentUserProfileForm {
  nick_name: string
  email: string
  mobile: string
  sex: number
}

export interface ApplyCurrentUserProfileOptions {
  broadcast?: boolean
  refreshAvatar?: boolean
}

interface CurrentUserProfileResponse {
  result: number
  msg?: string
  data?: CurrentUserProfilePayload | Record<string, unknown>
}

interface CurrentUserProfileBroadcast {
  schema: 'current_user_profile.v1'
  profile: Pick<CurrentUserProfile, 'id' | 'username' | 'nick_name' | 'display_name' | 'avatar_url'>
}

const profile = ref<CurrentUserProfile | null>(null)
const loading = ref(false)
const error = ref('')
let profileFetched = false
let profileEpoch = 0
let profileRevision = 0
let activeFetch: Promise<CurrentUserProfile | null> | null = null
let profileSyncRegistered = false
const avatarRefreshRevision = ref(0)
export const currentUserAvatarRevision = avatarRefreshRevision
let profileRefreshNonce = 0

function normalizedString(value: unknown): string {
  return typeof value === 'string' ? value : ''
}

function normalizedUserId(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null
  const parsed = Number(value)
  return Number.isSafeInteger(parsed) && parsed >= 0 ? parsed : null
}

function normalizedSex(value: unknown): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

export function normalizeCurrentUserProfile(
  payload: CurrentUserProfilePayload = {},
  previous: CurrentUserProfile | null = null,
): CurrentUserProfile {
  const payloadHasIdentity = Object.prototype.hasOwnProperty.call(payload, 'id')
  const incomingId = normalizedUserId(payload.id)
  const reusablePrevious = !payloadHasIdentity || incomingId === previous?.id ? previous : null
  const merged: CurrentUserProfilePayload = {
    ...(reusablePrevious || {}),
    ...payload,
  }
  return {
    id: normalizedUserId(merged.id),
    username: normalizedString(merged.username),
    nick_name: normalizedString(merged.nick_name),
    display_name: normalizedString(merged.display_name),
    email: normalizedString(merged.email),
    mobile: normalizedString(merged.mobile),
    sex: normalizedSex(merged.sex),
    last_login: normalizedString(merged.last_login),
    is_superuser: merged.is_superuser === true,
    is_staff: merged.is_staff === true,
    is_active: merged.is_active !== false,
    date_joined: normalizedString(merged.date_joined),
    add_time: normalizedString(merged.add_time),
    avatar_url: normalizedString(merged.avatar_url).trim(),
  }
}

export function defaultAvatarUrlForUser(userId: unknown): string {
  const normalizedId = normalizedUserId(userId)
  const avatarId = normalizedId === null ? DEFAULT_AVATAR_USER_ID : normalizedId % 53
  return `${DEFAULT_AVATAR_BASE_URL}/${avatarId}.png`
}

export function resolveCurrentUserAvatarUrl(value: CurrentUserProfile | null): string {
  const canonicalUrl = value?.avatar_url.trim()
  return canonicalUrl || defaultAvatarUrlForUser(value?.id)
}

function appendAvatarCacheBust(url: string, revision: number): string {
  if (!url || revision <= 0) return url
  const hashIndex = url.indexOf('#')
  const hash = hashIndex >= 0 ? url.slice(hashIndex) : ''
  const withoutHash = hashIndex >= 0 ? url.slice(0, hashIndex) : url
  const separator = withoutHash.includes('?') ? '&' : '?'
  return `${withoutHash}${separator}v=${revision}${hash}`
}

function isOssAvatarUrl(url: string): boolean {
  try {
    return new URL(url).hostname === 'asynctest.oss-cn-shenzhen.aliyuncs.com'
  } catch {
    return false
  }
}

export function cacheBustedAvatarUrl(url: string): string {
  return isOssAvatarUrl(url) ? appendAvatarCacheBust(url, avatarRefreshRevision.value) : url
}

function publicProfileSnapshot(value: CurrentUserProfile): CurrentUserProfileBroadcast['profile'] {
  return {
    id: value.id,
    username: value.username,
    nick_name: value.nick_name,
    display_name: value.display_name,
    avatar_url: value.avatar_url,
  }
}

function broadcastProfile(value: CurrentUserProfile): void {
  if (typeof window === 'undefined' || !window.electronAPI?.wm?.broadcast) return
  const payload: CurrentUserProfileBroadcast = {
    schema: 'current_user_profile.v1',
    profile: publicProfileSnapshot(value),
  }
  try {
    const pending = window.electronAPI.wm.broadcast(CURRENT_USER_PROFILE_EVENT, payload)
    if (pending && typeof pending.catch === 'function') void pending.catch(() => {})
  } catch {
    // Profile persistence has already succeeded; cross-window refresh is best-effort.
  }
}

export function applyCurrentUserProfile(
  nextProfile: CurrentUserProfilePayload,
  options: ApplyCurrentUserProfileOptions = {},
): CurrentUserProfile {
  const previousId = profile.value?.id
  const normalized = normalizeCurrentUserProfile(nextProfile, profile.value)
  profileRevision += 1
  profile.value = normalized
  if (options.refreshAvatar || (previousId !== null && previousId !== undefined && previousId !== normalized.id)) {
    avatarRefreshRevision.value += 1
  }
  if (options.broadcast) broadcastProfile(normalized)
  return normalized
}

export function clearCurrentUserProfile(): void {
  profileEpoch += 1
  profileRevision += 1
  activeFetch = null
  profileFetched = false
  loading.value = false
  error.value = ''
  profile.value = null
}

function invalidateProfileRequest() {
  profileEpoch += 1
  activeFetch = null
  profileFetched = false
}

function responseProfile(
  response: CurrentUserProfileResponse | null | undefined,
  fallbackMessage: string,
): CurrentUserProfilePayload {
  if (Number(response?.result) !== 1 || !response?.data) {
    throw new CurrentUserProfileRequestError(
      firstResponseError(response?.data) || response?.msg || fallbackMessage,
    )
  }
  return response.data as CurrentUserProfilePayload
}

function firstResponseError(value: unknown): string {
  if (typeof value === 'string') return value.trim()
  if (Array.isArray(value)) {
    for (const item of value) {
      const message = firstResponseError(item)
      if (message) return message
    }
    return ''
  }
  if (!value || typeof value !== 'object') return ''

  const errorMap = value as Record<string, unknown>
  for (const key of ['avatar', 'non_field_errors', 'detail']) {
    const message = firstResponseError(errorMap[key])
    if (message) return message
  }
  for (const item of Object.values(errorMap)) {
    const message = firstResponseError(item)
    if (message) return message
  }
  return ''
}

export class CurrentUserProfileRequestError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'CurrentUserProfileRequestError'
  }
}

export function ensureCurrentUserProfileSync(): void {
  if (profileSyncRegistered || typeof window === 'undefined' || !window.electronAPI?.on) return
  profileSyncRegistered = true
  window.electronAPI.on(
    CURRENT_USER_PROFILE_EVENT,
    (_event: unknown, payload: Partial<CurrentUserProfileBroadcast> = {}) => {
      if (payload.schema !== 'current_user_profile.v1' || !payload.profile) return
      applyCurrentUserProfile(payload.profile, { refreshAvatar: true })
    },
  )
  window.electronAPI.on('auth:logout', () => {
    clearCurrentUserProfile()
  })
  window.electronAPI.on('auth:login', () => {
    // Keep the immediately-applied login identity visible while replacing any
    // in-flight request with a fresh profile request for the new token.
    void fetchCurrentUserProfile(true)
  })
}

export async function fetchCurrentUserProfile(force = false): Promise<CurrentUserProfile | null> {
  ensureCurrentUserProfileSync()
  if (!force && profileFetched && profile.value) return profile.value
  if (activeFetch) {
    if (!force) return activeFetch
    // A forced refresh must not reuse a request that started before the
    // current authentication state. Its response will be ignored by epoch
    // checks below once this request is invalidated.
    invalidateProfileRequest()
  }

  const requestEpoch = profileEpoch
  const requestRevision = profileRevision
  if (force) profileFetched = false
  loading.value = true
  error.value = ''
  const request = (async () => {
    try {
      const response = await http.httpGet<CurrentUserProfileResponse>('/user/me/', force
        ? { _profile_refresh: `${avatarRefreshRevision.value}-${++profileRefreshNonce}` }
        : {})
      const data = responseProfile(response, '获取用户信息失败')
      if (requestEpoch !== profileEpoch || requestRevision !== profileRevision) return profile.value
      profileFetched = true
      return applyCurrentUserProfile(data, { refreshAvatar: force })
    } catch (reason) {
      if (requestEpoch === profileEpoch && requestRevision === profileRevision) {
        error.value = reason instanceof Error ? reason.message : String(reason)
      }
      return profile.value
    }
  })()
  activeFetch = request

  try {
    return await request
  } finally {
    if (activeFetch === request) {
      activeFetch = null
      loading.value = false
    }
  }
}

/**
 * Apply the identity returned by the login endpoint immediately, then replace
 * it with the authoritative /user/me/ response. This keeps every shared
 * avatar consumer in sync without waiting for a route reload.
 */
export function syncCurrentUserAfterLogin(payload: CurrentUserProfilePayload = {}): void {
  // Invalidate a request started under the previous token before publishing
  // the new identity, including the case where that request was itself forced.
  invalidateProfileRequest()
  applyCurrentUserProfile(
    {
      ...payload,
      // An omitted avatar must not inherit a previous account's URL when the
      // same numeric id logs in again.
      avatar_url: payload.avatar_url ?? '',
    },
    { refreshAvatar: true },
  )
  void fetchCurrentUserProfile()
}

export async function updateCurrentUserProfile(
  form: CurrentUserProfileForm,
): Promise<CurrentUserProfile> {
  const requestEpoch = profileEpoch
  error.value = ''
  const payload: CurrentUserProfileForm = {
    nick_name: form.nick_name.trim(),
    email: form.email.trim(),
    mobile: form.mobile.trim(),
    sex: form.sex,
  }
  try {
    const response = await http.httpPut<CurrentUserProfileResponse>('/user/me/update_info/', payload)
    const data = responseProfile(response, '修改个人信息失败')
    if (requestEpoch !== profileEpoch) {
      throw new CurrentUserProfileRequestError('登录状态已变化，请重试')
    }
    profileFetched = true
    return applyCurrentUserProfile(data, { broadcast: true, refreshAvatar: true })
  } catch (reason) {
    if (requestEpoch === profileEpoch) {
      error.value = reason instanceof Error ? reason.message : String(reason)
    }
    throw reason
  }
}

export async function uploadCurrentUserAvatar(file: File): Promise<CurrentUserProfile> {
  const requestEpoch = profileEpoch
  const mime = String(file?.type || '').toLowerCase()
  if (!(file instanceof Blob) || file.size <= 0) {
    throw new CurrentUserProfileRequestError('裁剪后的头像文件为空')
  }
  if (mime !== 'image/webp') {
    throw new CurrentUserProfileRequestError('裁剪后的头像必须为 WebP 格式')
  }

  error.value = ''
  const formData = new FormData()
  formData.append('avatar', file, 'avatar.webp')
  try {
    const response = await http.httpPost<CurrentUserProfileResponse>(
      '/user/me/avatar/',
      formData as any,
      {},
      { 'Content-Type': 'multipart/form-data' },
    )
    const data = responseProfile(response, '头像上传失败')
    if (requestEpoch !== profileEpoch) {
      throw new CurrentUserProfileRequestError('登录状态已变化，请重试')
    }
    profileFetched = true
    return applyCurrentUserProfile(data, { broadcast: true, refreshAvatar: true })
  } catch (reason) {
    if (requestEpoch === profileEpoch) {
      error.value = reason instanceof Error ? reason.message : String(reason)
    }
    throw reason
  }
}

const defaultAvatarUrl = computed(() => defaultAvatarUrlForUser(profile.value?.id))
const avatarUrl = computed(() => {
  const resolved = resolveCurrentUserAvatarUrl(profile.value)
  // The default and uploaded OSS avatar URLs are keyed by user id. Add a
  // monotonic revision after an authentication/profile refresh so the browser
  // cannot reuse the previous account's cached object. Other CDN/data URLs are
  // left untouched because they normally already carry their own versioning.
  return cacheBustedAvatarUrl(resolved)
})
const avatarRenderKey = computed(() => {
  const identity = profile.value?.id ?? 'anonymous'
  const source = profile.value?.avatar_url.trim() || 'default'
  return `${identity}:${source}:${avatarRefreshRevision.value}`
})

export function useCurrentUserProfile() {
  return {
    profile,
    avatarUrl,
    avatarRenderKey,
    defaultAvatarUrl,
    loading,
    error,
    fetchProfile: fetchCurrentUserProfile,
    updateProfile: updateCurrentUserProfile,
    uploadAvatar: uploadCurrentUserAvatar,
    applyProfile: applyCurrentUserProfile,
    clearProfile: clearCurrentUserProfile,
    ensureProfileSync: ensureCurrentUserProfileSync,
  }
}
