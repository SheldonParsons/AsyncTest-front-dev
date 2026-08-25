import type { KnowledgeCommitDetail, KnowledgeCommitSummary } from '../api'
import type { RecentSessionFile } from './conversationInfoRailPolicy'

interface WorkspaceViewerTabBase {
  id: string
  kind: 'file' | 'change'
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

export type WorkspaceViewerTab = WorkspaceFileViewerTab | WorkspaceChangeViewerTab

export interface WorkspaceViewerTabsState {
  tabs: WorkspaceViewerTab[]
  activeTabId: string | null
}

export interface WorkspaceViewerConversationState extends WorkspaceViewerTabsState {
  requestedOpen: boolean
}

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
): WorkspaceViewerConversationState {
  const snapshot = [...tabs]
  const normalizedActiveId = activeTabId && snapshot.some(item => item.id === activeTabId)
    ? activeTabId
    : (snapshot[0]?.id || null)
  return {
    tabs: snapshot,
    activeTabId: normalizedActiveId,
    requestedOpen: Boolean(requestedOpen),
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
      ? snapshotWorkspaceViewerConversation(state.tabs, state.activeTabId, state.requestedOpen)
      : null
  }

  write(key: string, state: WorkspaceViewerConversationState): void {
    if (!key) return
    this.states.set(
      key,
      snapshotWorkspaceViewerConversation(state.tabs, state.activeTabId, state.requestedOpen),
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
  return tab.kind === 'change'
    ? !tab.detail && !tab.error
    : tab.loading
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
