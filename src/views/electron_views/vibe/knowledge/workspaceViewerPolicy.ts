import type { KnowledgeCommitDetail, KnowledgeCommitSummary } from '../api'
import type { RecentSessionFile } from './conversationInfoRailPolicy'
import type { WorkspacePanelViewerState } from './workspacePanelPolicy'

interface WorkspaceViewerTabBase {
  id: string
  kind: 'file' | 'change' | 'file-list' | 'change-list'
  title: string
  loading: boolean
  error: string
}

export interface WorkspaceFileViewerTab extends WorkspaceViewerTabBase {
  kind: 'file'
  sessionId: string
  file: RecentSessionFile
  content: string
}

export interface WorkspaceChangeViewerTab extends WorkspaceViewerTabBase {
  kind: 'change'
  projectId: string
  commitSeq: number
  summary: KnowledgeCommitSummary
  detail: KnowledgeCommitDetail | null
}

/**
 * Paging state is part of the conversation snapshot so a list survives
 * switching Viewer tabs or sessions while its component is unmounted.
 */
export interface WorkspaceChangeListViewerTab extends WorkspaceViewerTabBase {
  kind: 'change-list'
  projectId: string
  items: KnowledgeCommitSummary[]
  loading: boolean
  loadingMore: boolean
  nextCursor: number | null
  hasMore: boolean
}

/** Readable domain alias for consumers that do not use the shorter tab kind. */
export type WorkspaceKnowledgeChangesViewerTab = WorkspaceChangeListViewerTab

/** Session file list state; presentation and fetching remain in the parent. */
export interface WorkspaceFileListViewerTab extends WorkspaceViewerTabBase {
  kind: 'file-list'
  sessionId: string
  items: RecentSessionFile[]
  loading: boolean
  loadingMore: boolean
  nextCursor: string | number | null
  hasMore: boolean
}

export type WorkspaceViewerTab =
  | WorkspaceFileViewerTab
  | WorkspaceChangeViewerTab
  | WorkspaceChangeListViewerTab
  | WorkspaceFileListViewerTab

export interface WorkspaceViewerTabsState {
  tabs: WorkspaceViewerTab[]
  activeTabId: string | null
}

export interface WorkspaceViewerConversationState extends WorkspaceViewerTabsState, WorkspacePanelViewerState {}

export interface WorkspaceViewerConversationActivation {
  changed: boolean
  state: WorkspaceViewerConversationState
}

export interface WorkspaceViewerRequestToken {
  id: number
  conversationKey: string
}

function identityPart(value: unknown): string {
  return encodeURIComponent(String(value ?? '').trim())
}

/**
 * Viewer 属于“项目中的某个会话”；尚未创建后端会话时使用项目级草稿槽位。
 * 项目维度也进入 key，避免项目切换时 UUID/草稿状态互相污染。
 */
export function workspaceViewerConversationKey(projectId: unknown, sessionId: unknown): string {
  const project = String(projectId ?? '').trim()
  if (!project) return ''
  const session = String(sessionId ?? '').trim()
  return session
    ? `project:${identityPart(project)}:session:${identityPart(session)}`
    : `project:${identityPart(project)}:draft`
}

/** 保存独立数组快照，并保证 activeTabId 永远指向快照中真实存在的页签。 */
export function snapshotWorkspaceViewerConversation(
  tabs: readonly WorkspaceViewerTab[],
  activeTabId: string | null,
  requestedOpen: boolean,
  autoCollapsedPanelRevision: number | null = null,
): WorkspaceViewerConversationState {
  const snapshot = [...tabs]
  const normalizedActiveId = activeTabId && snapshot.some(item => item.id === activeTabId)
    ? activeTabId
    : (snapshot[0]?.id || null)
  return {
    tabs: snapshot,
    activeTabId: normalizedActiveId,
    requestedOpen: Boolean(requestedOpen),
    autoCollapsedPanelRevision: requestedOpen
      && autoCollapsedPanelRevision !== null
      && Number.isSafeInteger(autoCollapsedPanelRevision)
      && autoCollapsedPanelRevision >= 0
      ? autoCollapsedPanelRevision
      : null,
  }
}

/**
 * Viewer 的内存状态所有者。页面只负责把当前 UI 快照交进来，不直接操作内部 Map，
 * 从而让相同 tab id 在不同会话里仍然拥有完全独立的页签与展开状态。
 */
export class WorkspaceViewerConversationStore {
  private readonly states = new Map<string, WorkspaceViewerConversationState>()
  private activeKey = ''

  get currentKey(): string {
    return this.activeKey
  }

  activate(
    nextKey: string,
    currentState: WorkspaceViewerConversationState,
  ): WorkspaceViewerConversationActivation {
    if (!nextKey || nextKey === this.activeKey) {
      return {
        changed: false,
        state: snapshotWorkspaceViewerConversation(
          currentState.tabs,
          currentState.activeTabId,
          currentState.requestedOpen,
          currentState.autoCollapsedPanelRevision,
        ),
      }
    }
    if (this.activeKey) this.write(this.activeKey, currentState)
    this.activeKey = nextKey
    return {
      changed: true,
      state: this.read(nextKey) || snapshotWorkspaceViewerConversation([], null, false),
    }
  }

  adoptActiveDraft(draftKey: string, sessionKey: string): boolean {
    if (!sessionKey || this.activeKey !== draftKey) return false
    this.states.delete(draftKey)
    this.states.delete(sessionKey)
    this.activeKey = sessionKey
    return true
  }

  read(key: string): WorkspaceViewerConversationState | null {
    const state = this.states.get(key)
    return state
      ? snapshotWorkspaceViewerConversation(
          state.tabs,
          state.activeTabId,
          state.requestedOpen,
          state.autoCollapsedPanelRevision,
        )
      : null
  }

  write(key: string, state: WorkspaceViewerConversationState): void {
    if (!key) return
    this.states.set(
      key,
      snapshotWorkspaceViewerConversation(
        state.tabs,
        state.activeTabId,
        state.requestedOpen,
        state.autoCollapsedPanelRevision,
      ),
    )
  }

  drop(key: string): void {
    if (key) this.states.delete(key)
  }
}

/** 同一 tab id 的请求也必须受会话 key 约束，切换/重试后旧响应一律失效。 */
export class WorkspaceViewerRequestGate {
  private readonly active = new Map<string, WorkspaceViewerRequestToken>()
  private sequence = 0

  begin(tabId: string, conversationKey: string): WorkspaceViewerRequestToken {
    const token = { id: ++this.sequence, conversationKey }
    this.active.set(tabId, token)
    return token
  }

  isCurrent(tabId: string, token: WorkspaceViewerRequestToken, conversationKey: string): boolean {
    return this.active.get(tabId) === token && token.conversationKey === conversationKey
  }

  invalidate(tabId: string): void {
    this.active.delete(tabId)
  }

  invalidateAll(): void {
    this.active.clear()
  }

  migrateConversation(fromKey: string, toKey: string): void {
    for (const token of this.active.values()) {
      if (token.conversationKey === fromKey) token.conversationKey = toKey
    }
  }
}

export function workspaceViewerTabNeedsReload(tab: WorkspaceViewerTab): boolean {
  if (tab.kind === 'change') return !tab.detail && !tab.error
  if (tab.kind === 'file') return tab.loading
  // List tabs carry their own first-page and continuation loading state. A
  // list that was persisted while either request was pending must be resumed
  // after a conversation activation; completed/errored lists wait for retry.
  return tab.loading || tab.loadingMore
}

export function deletedConversationIsStillActive(
  deletionProjectId: string,
  currentProjectId: string,
  deletedSessionId: string,
  activeSessionId: string,
): boolean {
  return deletionProjectId === currentProjectId && activeSessionId === deletedSessionId
}

export function workspaceDraftCreationIsStillActive(input: {
  creationProjectEpoch: number
  currentProjectEpoch: number
  creationSessionEpoch: number
  currentSessionEpoch: number
  activeSessionId: string
  activeConversationKey: string
  creationDraftKey: string
}): boolean {
  return input.creationProjectEpoch === input.currentProjectEpoch
    && input.creationSessionEpoch === input.currentSessionEpoch
    && !input.activeSessionId
    && input.activeConversationKey === input.creationDraftKey
}

export function workspaceFileViewerTabId(sessionId: string, fileIdentity: string): string {
  return `file:${identityPart(sessionId)}:${identityPart(fileIdentity)}`
}

export function workspaceChangeViewerTabId(projectId: string, commitSeq: number): string {
  return `change:${identityPart(projectId)}:${Math.max(0, Number(commitSeq) || 0)}`
}

/** Stable one-per-project identity for the independent knowledge change list. */
export function workspaceChangeListViewerTabId(projectId: string): string {
  return `change-list:${identityPart(projectId)}`
}

/** Stable one-per-session identity for the independent session file list. */
export function workspaceFileListViewerTabId(sessionId: string): string {
  return `file-list:${identityPart(sessionId)}`
}

/** Semantic alias for callers that prefer the full domain name. */
export const workspaceKnowledgeChangesViewerTabId = workspaceChangeListViewerTabId

/** Paging contract used by the independent knowledge change list. */
export const WORKSPACE_CHANGE_LIST_INITIAL_PAGE_SIZE = 20
export const WORKSPACE_CHANGE_LIST_PAGE_SIZE = 10
export const WORKSPACE_FILE_LIST_INITIAL_PAGE_SIZE = 20
export const WORKSPACE_FILE_LIST_PAGE_SIZE = 10

/**
 * Return a stable key for a commit summary. Commit sequence is the canonical
 * pagination identity (the API's `before` cursor is sequence based), so it is
 * preferred even when an overlapping response happens to carry a different
 * presentation id. The id is a fallback for legacy rows without a sequence.
 */
export function knowledgeChangeSummaryIdentity(item: Partial<KnowledgeCommitSummary> | null | undefined): string {
  const seq = Number(item?.seq)
  if (Number.isSafeInteger(seq) && seq > 0) return `seq:${seq}`
  const id = String(item?.id ?? '').trim()
  return id ? `id:${id}` : ''
}

/**
 * Merge a page into an existing server-ordered commit list without duplicate
 * rows. The first occurrence wins, preserving order at a cursor boundary and
 * preventing overlap from producing repeated entries.
 */
export function mergeKnowledgeChangeSummaries(
  existing: readonly KnowledgeCommitSummary[],
  incoming: readonly KnowledgeCommitSummary[],
): KnowledgeCommitSummary[] {
  const result: KnowledgeCommitSummary[] = []
  const seen = new Set<string>()
  for (const item of [...existing, ...incoming]) {
    if (!item || typeof item !== 'object') continue
    const seq = Number(item.seq)
    const seqKey = Number.isSafeInteger(seq) && seq > 0 ? `seq:${seq}` : ''
    const id = String(item.id ?? '').trim()
    const idKey = id ? `id:${id}` : ''
    const keys = [seqKey, idKey].filter(Boolean)
    // Treat either canonical sequence or backend id as a duplicate. This
    // covers deployments where an overlapping page serializes a commit id
    // differently while still guaranteeing one row per commit. For malformed
    // legacy rows, a stable JSON fallback removes exact duplicates without
    // collapsing unrelated rows that have no identity at all.
    const dedupKeys = keys.length ? keys : [`raw:${JSON.stringify(item)}`]
    if (dedupKeys.some(candidate => seen.has(candidate))) continue
    dedupKeys.forEach(candidate => seen.add(candidate))
    result.push(item)
  }
  return result
}

/** Semantic alias used by list state owners. */
export const mergeWorkspaceKnowledgeChanges = mergeKnowledgeChangeSummaries

/** Whether a change-list tab can issue another page request. */
export function workspaceChangeListCanLoadMore(
  tab: Pick<WorkspaceChangeListViewerTab, 'loading' | 'loadingMore' | 'hasMore' | 'nextCursor'>,
): boolean {
  const cursor = Number(tab.nextCursor)
  return !tab.loading
    && !tab.loadingMore
    && tab.hasMore
    && Number.isSafeInteger(cursor)
    && cursor > 0
}

/** Whether a file-list tab is ready for its next local snapshot page. */
export function workspaceFileListCanLoadMore(
  tab: Pick<WorkspaceFileListViewerTab, 'loading' | 'loadingMore' | 'hasMore' | 'nextCursor'>,
): boolean {
  const cursor = Number(tab.nextCursor)
  return !tab.loading
    && !tab.loadingMore
    && tab.hasMore
    && Number.isSafeInteger(cursor)
    && cursor >= 0
}

/** 空字符串是合法正文；只有完全没有字符串正文时才需要走远端读取。 */
export function workspaceInlineFileContent(file: RecentSessionFile): string | null {
  if (typeof file.content === 'string') return file.content
  if (typeof file.text === 'string') return file.text
  return null
}

/** 判断同一稳定文件身份背后的可读取资源是否已更新。 */
export function workspaceFileLocatorSignature(sessionId: string, file: RecentSessionFile): string {
  return JSON.stringify([
    String(sessionId || '').trim(),
    String(file.kind || '').trim(),
    String(file.download_url || '').trim(),
    String(file.event_id || '').trim(),
    Number.isInteger(file.attachment_index) ? file.attachment_index : null,
    String(file.source_ref_id || '').trim(),
    Number.isSafeInteger(Number(file.citation_start_offset)) ? Number(file.citation_start_offset) : null,
    Number.isSafeInteger(Number(file.citation_end_offset)) ? Number(file.citation_end_offset) : null,
    String(file.content_hash || '').trim(),
  ])
}

/** 同一资源只保留一个页签；再次打开时以新快照更新并激活原位置。 */
export function upsertViewerTab(
  tabs: readonly WorkspaceViewerTab[],
  tab: WorkspaceViewerTab,
): WorkspaceViewerTabsState {
  const index = tabs.findIndex(item => item.id === tab.id)
  if (index < 0) {
    return { tabs: [...tabs, tab], activeTabId: tab.id }
  }
  const next = [...tabs]
  next[index] = tab
  return { tabs: next, activeTabId: tab.id }
}

/**
 * 关闭当前页签时优先激活它右侧仍占据同一索引的页签；若没有，则回到左侧。
 * 关闭后台页签不会打断用户正在阅读的 Viewer。
 */
export function closeViewerTab(
  tabs: readonly WorkspaceViewerTab[],
  activeTabId: string | null,
  closingTabId: string,
): WorkspaceViewerTabsState {
  const closingIndex = tabs.findIndex(item => item.id === closingTabId)
  if (closingIndex < 0) return { tabs: [...tabs], activeTabId }

  const next = tabs.filter(item => item.id !== closingTabId)
  if (activeTabId !== closingTabId) {
    return {
      tabs: next,
      activeTabId: activeTabId && next.some(item => item.id === activeTabId) ? activeTabId : (next[0]?.id || null),
    }
  }

  return {
    tabs: next,
    activeTabId: next[closingIndex]?.id || next[closingIndex - 1]?.id || null,
  }
}

export const upsertWorkspaceViewerTab = upsertViewerTab
export const closeWorkspaceViewerTab = closeViewerTab
