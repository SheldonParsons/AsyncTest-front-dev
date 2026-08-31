/**
 * Project switch request state.
 *
 * The view owns the network work; this module only owns the small state
 * machine around it.  Every asynchronous callback must carry the epoch (and
 * project identity) returned by the request that started it.  A callback from
 * an older request therefore becomes a no-op instead of being allowed to
 * write into the newly selected project.
 */

export type ProjectSwitchPhase = 'idle' | 'working' | 'error'

export type ProjectIdentityLike =
  | string
  | number
  | { id?: unknown; project_id?: unknown; session_id?: unknown; value?: unknown }
  | null
  | undefined

export interface ProjectSwitchRequest {
  epoch: number
  projectId: string
}

export interface ProjectSwitchDialogState {
  /** Whether the dialog should remain mounted/visible. */
  open: boolean
  phase: ProjectSwitchPhase
  /** Monotonically increasing request identity. */
  epoch: number
  targetProjectId: string
  targetProject: unknown | null
  /** The session list response has reached a trusted boundary. */
  sessionsLoaded: boolean
  /** A successful list response explicitly contained no sessions. */
  sessionsEmpty: boolean
  /** The first session's content has loaded and can be rendered. */
  sessionContentLoaded: boolean
  firstSessionId: string
  contentSessionId: string
  error: string
}

// Short aliases keep the policy ergonomic for view controllers and contract
// tests without introducing a second state shape.
export type ProjectSwitchState = ProjectSwitchDialogState
export type ProjectSwitchToken = ProjectSwitchRequest

export interface ProjectSwitchSessionLoadResult {
  /** Number of sessions returned by the authoritative list request. */
  count?: number
  /** Optional rows; when supplied the first row identity is retained. */
  sessions?: readonly unknown[]
  /** Explicitly establish the empty terminal state. */
  empty?: boolean
}

export interface ProjectSwitchContentLoadResult {
  sessionId?: ProjectIdentityLike
  session_id?: ProjectIdentityLike
  /** A false value means the request returned but the content is not usable. */
  displayable?: boolean
}

function nonEmpty(value: unknown): string {
  return String(value ?? '').trim()
}

/**
 * Return one stable identity for a project/session-like value.  Accepting a
 * row object keeps the policy convenient for callers that already have the
 * project list in hand, while primitives remain the normal fast path.
 */
export function projectIdentity(value: ProjectIdentityLike): string {
  if (value && typeof value === 'object') {
    const row = value as Record<string, unknown>
    return nonEmpty(row.id) || nonEmpty(row.project_id) || nonEmpty(row.session_id) || nonEmpty(row.value)
  }
  return nonEmpty(value)
}

function sessionIdentity(value: unknown): string {
  if (!value || typeof value !== 'object') return projectIdentity(value as ProjectIdentityLike)
  const row = value as Record<string, unknown>
  return nonEmpty(row.id) || nonEmpty(row.session_id) || nonEmpty(row.value)
}

function isSessionLoadResult(value: unknown): value is ProjectSwitchSessionLoadResult {
  return !!value && typeof value === 'object' && !Array.isArray(value)
}

function normalizeEpoch(value: unknown): number {
  const epoch = Number(value)
  return Number.isSafeInteger(epoch) && epoch >= 0 ? epoch : 0
}

function requestFrom(
  state: ProjectSwitchDialogState,
  epochOrRequest: number | string | ProjectSwitchRequest,
  projectId?: ProjectIdentityLike,
): ProjectSwitchRequest {
  if (epochOrRequest && typeof epochOrRequest === 'object') {
    return {
      epoch: normalizeEpoch(epochOrRequest.epoch),
      projectId: projectIdentity(epochOrRequest.projectId),
    }
  }
  const epoch = normalizeEpoch(epochOrRequest)
  return {
    epoch,
    // When a caller only has an epoch, the state identity remains the safest
    // default.  Callers handling multiple projects should pass projectId too.
    projectId: projectIdentity(projectId) || state.targetProjectId,
  }
}

function sameRequest(
  state: ProjectSwitchDialogState,
  epochOrRequest: number | string | ProjectSwitchRequest,
  projectId?: ProjectIdentityLike,
): boolean {
  const request = requestFrom(state, epochOrRequest, projectId)
  return state.open
    && state.phase === 'working'
    && !!state.targetProjectId
    && !!request.projectId
    && request.epoch === state.epoch
    && request.projectId === state.targetProjectId
}

function firstSessionId(input: ProjectSwitchSessionLoadResult | readonly unknown[] | number | undefined): string {
  if (Array.isArray(input)) return sessionIdentity(input[0])
  if (isSessionLoadResult(input)) {
    const rows = input.sessions
    return Array.isArray(rows) ? sessionIdentity(rows[0]) : ''
  }
  return ''
}

function sessionCount(input: ProjectSwitchSessionLoadResult | readonly unknown[] | number | undefined): number {
  if (Array.isArray(input)) return input.length
  if (isSessionLoadResult(input)) {
    if (Array.isArray(input.sessions)) return input.sessions.length
    const count = Number(input.count)
    return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0
  }
  const count = Number(input)
  return Number.isFinite(count) && count >= 0 ? Math.floor(count) : 0
}

function isValidSessionLoadInput(
  input: ProjectSwitchSessionLoadResult | readonly unknown[] | number | undefined,
): boolean {
  if (Array.isArray(input)) return true
  if (typeof input === 'number') return Number.isFinite(input) && input >= 0
  if (!isSessionLoadResult(input)) return false
  return Array.isArray(input.sessions)
    || input.empty === true
    || (input.count !== undefined && Number.isFinite(Number(input.count)) && Number(input.count) >= 0)
}

function normalizeError(reason: unknown): string {
  if (reason instanceof Error && reason.message.trim()) return reason.message.trim()
  if (reason && typeof reason === 'object') {
    const value = reason as Record<string, unknown>
    const response = value.response && typeof value.response === 'object'
      ? value.response as Record<string, unknown>
      : null
    const data = response?.data && typeof response.data === 'object'
      ? response.data as Record<string, unknown>
      : null
    const message = nonEmpty(value.message)
      || nonEmpty(value.error)
      || nonEmpty(value.detail)
      || nonEmpty(typeof response?.data === 'string' ? response.data : '')
      || nonEmpty(data?.message)
      || nonEmpty(data?.error)
      || nonEmpty(data?.detail)
    if (message) return message
  }
  return nonEmpty(reason) || '项目切换失败，请重试。'
}

export function createProjectSwitchDialogState(
  initial: Partial<ProjectSwitchDialogState> = {},
): ProjectSwitchDialogState {
  const targetProjectId = projectIdentity(initial.targetProjectId)
  const phase = initial.phase === 'working' || initial.phase === 'error' ? initial.phase : 'idle'
  return {
    open: initial.open ?? (phase === 'working' || phase === 'error'),
    phase,
    epoch: normalizeEpoch(initial.epoch),
    targetProjectId,
    targetProject: initial.targetProject ?? null,
    sessionsLoaded: Boolean(initial.sessionsLoaded),
    sessionsEmpty: Boolean(initial.sessionsEmpty),
    sessionContentLoaded: Boolean(initial.sessionContentLoaded),
    firstSessionId: nonEmpty(initial.firstSessionId),
    contentSessionId: nonEmpty(initial.contentSessionId),
    error: nonEmpty(initial.error),
  }
}

export const createProjectSwitchState = createProjectSwitchDialogState

/** A request token to pass to every project/session loading callback. */
export function projectSwitchRequest(state: ProjectSwitchDialogState): ProjectSwitchRequest {
  return { epoch: state.epoch, projectId: state.targetProjectId }
}

/** Alias kept deliberately small for callers that call the token an epoch. */
export const projectSwitchEpoch = projectSwitchRequest

/**
 * Start (or restart) a switch.  It always invalidates older callbacks,
 * including a second click for the same project.
 */
export function beginProjectSwitch(
  state: ProjectSwitchDialogState,
  target: ProjectIdentityLike,
): ProjectSwitchDialogState {
  const targetProjectId = projectIdentity(target)
  const epoch = normalizeEpoch(state.epoch) + 1
  if (!targetProjectId) {
    return {
      ...createProjectSwitchDialogState(state),
      open: true,
      phase: 'error',
      epoch,
      targetProjectId: '',
      targetProject: typeof target === 'object' ? target : null,
      error: '项目标识无效，请重新选择项目。',
      sessionsLoaded: false,
      sessionsEmpty: false,
      sessionContentLoaded: false,
      firstSessionId: '',
      contentSessionId: '',
    }
  }
  return {
    open: true,
    phase: 'working',
    epoch,
    targetProjectId,
    targetProject: target && typeof target === 'object' ? target : null,
    sessionsLoaded: false,
    sessionsEmpty: false,
    sessionContentLoaded: false,
    firstSessionId: '',
    contentSessionId: '',
    error: '',
  }
}

/** Start and return the token in one pure operation. */
export function startProjectSwitch(
  state: ProjectSwitchDialogState,
  target: ProjectIdentityLike,
): { state: ProjectSwitchDialogState; request: ProjectSwitchRequest } {
  const next = beginProjectSwitch(state, target)
  return { state: next, request: projectSwitchRequest(next) }
}

/** True only for the currently selected project and request epoch. */
export function isProjectSwitchCurrent(
  state: ProjectSwitchDialogState,
  epochOrRequest: number | string | ProjectSwitchRequest,
  projectId?: ProjectIdentityLike,
): boolean {
  return sameRequest(state, epochOrRequest, projectId)
}

/** A callback may finish only after the list boundary and content boundary. */
export function isProjectSwitchReady(state: ProjectSwitchDialogState): boolean {
  return state.sessionsLoaded && (
    state.sessionsEmpty
    || (
      !!state.firstSessionId
      && state.sessionContentLoaded
      && state.contentSessionId === state.firstSessionId
    )
  )
}

export const isProjectSwitchComplete = isProjectSwitchReady
export const shouldCompleteProjectSwitch = isProjectSwitchReady
export const projectSwitchCanComplete = isProjectSwitchReady

/** Record a successful authoritative session-list response. */
export function markProjectSwitchSessionsLoaded(
  state: ProjectSwitchDialogState,
  epochOrRequest: number | string | ProjectSwitchRequest,
  result?: ProjectSwitchSessionLoadResult | readonly unknown[] | number,
  firstSession?: ProjectIdentityLike,
): ProjectSwitchDialogState {
  if (!sameRequest(state, epochOrRequest) || !isValidSessionLoadInput(result)) return state
  const count = sessionCount(result)
  const explicitEmpty = isSessionLoadResult(result)
    ? result.empty === true
    : false
  // Never trust an `empty` hint when the response also carries rows/count.
  // The authoritative cardinality is the only safe empty-state boundary.
  const empty = count === 0 && (
    explicitEmpty
    || Array.isArray(result)
    || isSessionLoadResult(result)
    || typeof result === 'number'
  )
  return {
    ...state,
    sessionsLoaded: true,
    sessionsEmpty: empty,
    firstSessionId: empty ? '' : projectIdentity(firstSession) || firstSessionId(result),
    // A refreshed list may point at a different first session; never carry a
    // previous content success across that boundary.
    sessionContentLoaded: false,
    contentSessionId: '',
    error: '',
  }
}

/** Record that the first session's events/detail are displayable. */
export function markProjectSwitchContentLoaded(
  state: ProjectSwitchDialogState,
  epochOrRequest: number | string | ProjectSwitchRequest,
  sessionOrResult: ProjectIdentityLike | ProjectSwitchContentLoadResult = '',
  displayable = true,
): ProjectSwitchDialogState {
  if (!sameRequest(state, epochOrRequest)) return state
  const result = sessionOrResult && typeof sessionOrResult === 'object' && !Array.isArray(sessionOrResult)
    ? sessionOrResult as ProjectSwitchContentLoadResult
    : null
  const sessionId = projectIdentity(
    result?.sessionId
      ?? result?.session_id
      ?? sessionOrResult as ProjectIdentityLike,
  )
  const usable = (result?.displayable === undefined || result.displayable === true)
    && displayable !== false
  if (!usable || !sessionId || !state.firstSessionId || sessionId !== state.firstSessionId) return state
  return {
    ...state,
    sessionContentLoaded: true,
    contentSessionId: sessionId,
    error: '',
  }
}

/** Mark a current request as failed while keeping the dialog retryable. */
export function failProjectSwitch(
  state: ProjectSwitchDialogState,
  epochOrRequest: number | string | ProjectSwitchRequest,
  reason: unknown,
): ProjectSwitchDialogState {
  if (!sameRequest(state, epochOrRequest)) return state
  return {
    ...state,
    open: true,
    phase: 'error',
    error: normalizeError(reason),
  }
}

/**
 * Close only after the current request has reached a trusted completion
 * boundary.  Keeping this guard in the policy prevents an accidental early
 * close in a view callback.
 */
export function completeProjectSwitch(
  state: ProjectSwitchDialogState,
  epochOrRequest?: number | string | ProjectSwitchRequest,
): ProjectSwitchDialogState {
  if (epochOrRequest !== undefined && !sameRequest(state, epochOrRequest)) return state
  // A failed request may still retain the two success flags from an earlier
  // callback.  Never let a later, accidentally repeated completion close the
  // retryable error state.
  if (state.phase !== 'working' || !isProjectSwitchReady(state)) return state
  return {
    ...state,
    open: false,
    phase: 'idle',
    // Closing is also a request boundary: callbacks that were already queued
    // must not be able to reopen the dialog or write stale completion flags.
    epoch: normalizeEpoch(state.epoch) + 1,
    error: '',
  }
}

/** Retry the same target with a fresh epoch; old callbacks cannot win. */
export function retryProjectSwitch(state: ProjectSwitchDialogState): ProjectSwitchDialogState {
  return beginProjectSwitch(state, state.targetProject || state.targetProjectId)
}

/** Dismissal is intentionally locked while a switch is in flight. */
export function canDismissProjectSwitch(state: ProjectSwitchDialogState): boolean {
  return state.phase !== 'working'
}

export function closeProjectSwitchDialog(state: ProjectSwitchDialogState): ProjectSwitchDialogState {
  if (!canDismissProjectSwitch(state)) return state
  return {
    ...state,
    open: false,
    phase: 'idle',
    epoch: normalizeEpoch(state.epoch) + 1,
    error: '',
  }
}
