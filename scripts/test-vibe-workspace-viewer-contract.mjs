import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const indexSource = read('src/views/electron_views/vibe/knowledge/index.vue')
const workspaceSource = read('src/views/electron_views/vibe/knowledge/components/ConversationWorkspace.vue')
const railSource = read('src/views/electron_views/vibe/knowledge/components/ConversationInfoRail.vue')
const policySource = read('src/views/electron_views/vibe/knowledge/workspaceViewerPolicy.ts')
const resizePolicySource = read('src/views/electron_views/vibe/knowledge/workspaceResizePolicy.ts')
const diffSource = read('src/views/electron_views/vibe/browser/components/CommitDiffDetail.vue')

for (const [filename, source] of [
  ['knowledge/index.vue', indexSource],
  ['ConversationWorkspace.vue', workspaceSource],
  ['CommitDiffDetail.vue', diffSource],
]) {
  assert.deepEqual(parse(source, { filename }).errors, [])
}

const compiledPolicy = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
  reportDiagnostics: true,
})
assert.deepEqual(compiledPolicy.diagnostics || [], [])
const policy = await import(`data:text/javascript;base64,${Buffer.from(compiledPolicy.outputText).toString('base64')}`)

const compiledResizePolicy = ts.transpileModule(resizePolicySource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
  reportDiagnostics: true,
})
assert.deepEqual(compiledResizePolicy.diagnostics || [], [])
const resizePolicy = await import(`data:text/javascript;base64,${Buffer.from(compiledResizePolicy.outputText).toString('base64')}`)

assert.deepEqual(resizePolicy.workspaceViewerWidthRange(1600), { min: 420, max: 1040 })
assert.deepEqual(resizePolicy.workspaceViewerWidthRange(1000), { min: 420, max: 480 })
assert.deepEqual(resizePolicy.workspaceViewerWidthRange(800), { min: 420, max: 420 })
assert.equal(resizePolicy.defaultWorkspaceViewerWidth(1600), 736)
assert.equal(resizePolicy.defaultWorkspaceViewerWidth(2400), 760)
assert.equal(resizePolicy.defaultWorkspaceViewerWidth(1000), 460)
assert.equal(resizePolicy.defaultWorkspaceViewerWidth(Number.NaN), 420)
assert.equal(resizePolicy.clampWorkspaceViewerWidth(100, 1600), 420)
assert.equal(resizePolicy.clampWorkspaceViewerWidth(2000, 1600), 1040)
assert.equal(resizePolicy.draggedWorkspaceViewerWidth({
  startWidth: 600,
  startClientX: 800,
  clientX: 700,
  containerWidth: 1600,
}), 700)
assert.equal(resizePolicy.draggedWorkspaceViewerWidth({
  startWidth: 600,
  startClientX: 800,
  clientX: 1100,
  containerWidth: 1600,
}), 420)

const fileTab = {
  id: policy.workspaceFileViewerTabId('session-a', 'attachment:file-a'),
  kind: 'file',
  title: 'a.md',
  loading: false,
  error: '',
  sessionId: 'session-a',
  file: {},
  content: '# A',
}
const changeTab = {
  id: policy.workspaceChangeViewerTabId('19', 4),
  kind: 'change',
  title: '录入规则',
  loading: true,
  error: '',
  projectId: '19',
  commitSeq: 4,
  summary: {},
  detail: null,
}
const fileSnapshot = {
  identity: 'attachment:file-a',
  filename: 'a.md',
  event_id: 'event-1',
  attachment_index: 0,
  last_event_order: 1,
  last_seen_at: '',
}
assert.equal(
  policy.workspaceViewerConversationKey('project-a', 'session-a'),
  'project:project-a:session:session-a',
)
assert.equal(
  policy.workspaceViewerConversationKey('project-a', ''),
  'project:project-a:draft',
)
assert.equal(policy.workspaceViewerConversationKey('', 'session-a'), '')
const conversationTabs = [fileTab, changeTab]
const conversationSnapshot = policy.snapshotWorkspaceViewerConversation(
  conversationTabs,
  'missing-tab',
  true,
)
assert.notEqual(conversationSnapshot.tabs, conversationTabs)
assert.deepEqual(conversationSnapshot.tabs.map(item => item.id), [fileTab.id, changeTab.id])
assert.equal(conversationSnapshot.activeTabId, fileTab.id)
assert.equal(conversationSnapshot.requestedOpen, true)
const sessionAKey = policy.workspaceViewerConversationKey('project-a', 'session-a')
const sessionBKey = policy.workspaceViewerConversationKey('project-a', 'session-b')
const emptyConversation = policy.snapshotWorkspaceViewerConversation([], null, false)
const conversationStore = new policy.WorkspaceViewerConversationStore()
let activation = conversationStore.activate(sessionAKey, emptyConversation)
assert.equal(activation.changed, true)
assert.deepEqual(activation.state, emptyConversation)
activation = conversationStore.activate(
  sessionBKey,
  policy.snapshotWorkspaceViewerConversation([changeTab], changeTab.id, true),
)
assert.deepEqual(activation.state, emptyConversation)
activation = conversationStore.activate(
  sessionAKey,
  policy.snapshotWorkspaceViewerConversation([{ ...changeTab, title: 'B 的同一变更' }], changeTab.id, false),
)
assert.equal(activation.state.tabs[0].title, changeTab.title)
assert.equal(activation.state.requestedOpen, true)
activation = conversationStore.activate(sessionBKey, activation.state)
assert.equal(activation.state.tabs[0].title, 'B 的同一变更')
assert.equal(activation.state.requestedOpen, false)
conversationStore.drop(sessionAKey)
activation = conversationStore.activate(sessionAKey, activation.state)
assert.deepEqual(activation.state, emptyConversation)

const draftKey = policy.workspaceViewerConversationKey('project-a', '')
const createdSessionKey = policy.workspaceViewerConversationKey('project-a', 'created-session')
const draftStore = new policy.WorkspaceViewerConversationStore()
draftStore.activate(draftKey, emptyConversation)
assert.equal(draftStore.adoptActiveDraft(draftKey, createdSessionKey), true)
assert.equal(draftStore.currentKey, createdSessionKey)
activation = draftStore.activate(
  draftKey,
  policy.snapshotWorkspaceViewerConversation([fileTab], fileTab.id, true),
)
assert.deepEqual(activation.state, emptyConversation)
activation = draftStore.activate(createdSessionKey, emptyConversation)
assert.equal(activation.state.tabs[0].id, fileTab.id)
assert.equal(activation.state.requestedOpen, true)

const requestGate = new policy.WorkspaceViewerRequestGate()
const a1 = requestGate.begin(changeTab.id, sessionAKey)
assert.equal(requestGate.isCurrent(changeTab.id, a1, sessionAKey), true)
const b1 = requestGate.begin(changeTab.id, sessionBKey)
assert.equal(requestGate.isCurrent(changeTab.id, a1, sessionAKey), false)
assert.equal(requestGate.isCurrent(changeTab.id, b1, sessionBKey), true)
requestGate.invalidateAll()
assert.equal(requestGate.isCurrent(changeTab.id, b1, sessionBKey), false)
const a2 = requestGate.begin(changeTab.id, sessionAKey)
const a3 = requestGate.begin(changeTab.id, sessionAKey)
assert.equal(requestGate.isCurrent(changeTab.id, a2, sessionAKey), false)
assert.equal(requestGate.isCurrent(changeTab.id, a3, sessionAKey), true)
const draftRequest = requestGate.begin(fileTab.id, draftKey)
requestGate.migrateConversation(draftKey, createdSessionKey)
assert.equal(requestGate.isCurrent(fileTab.id, draftRequest, createdSessionKey), true)
assert.equal(requestGate.isCurrent(fileTab.id, draftRequest, draftKey), false)

assert.equal(policy.workspaceViewerTabNeedsReload(changeTab), true)
assert.equal(policy.workspaceViewerTabNeedsReload({ ...changeTab, error: '读取失败' }), false)
assert.equal(policy.workspaceViewerTabNeedsReload({ ...fileTab, loading: true }), true)
assert.equal(policy.workspaceViewerTabNeedsReload({ ...fileTab, loading: false, content: '' }), false)
assert.equal(policy.deletedConversationIsStillActive('p1', 'p1', 's1', 's1'), true)
assert.equal(policy.deletedConversationIsStillActive('p1', 'p2', 's1', 's1'), false)
assert.equal(policy.deletedConversationIsStillActive('p1', 'p1', 's1', 's2'), false)
const activeDraftCreation = {
  creationProjectEpoch: 2,
  currentProjectEpoch: 2,
  creationSessionEpoch: 5,
  currentSessionEpoch: 5,
  activeSessionId: '',
  activeConversationKey: draftKey,
  creationDraftKey: draftKey,
}
assert.equal(policy.workspaceDraftCreationIsStillActive(activeDraftCreation), true)
assert.equal(policy.workspaceDraftCreationIsStillActive({ ...activeDraftCreation, currentSessionEpoch: 6 }), false)
assert.equal(policy.workspaceDraftCreationIsStillActive({ ...activeDraftCreation, activeSessionId: 's2' }), false)
assert.equal(policy.workspaceInlineFileContent({ ...fileSnapshot, content: '' }), '')
assert.equal(policy.workspaceInlineFileContent({ ...fileSnapshot, text: '# A' }), '# A')
assert.equal(policy.workspaceInlineFileContent({ ...fileSnapshot, content: null }), null)
assert.equal(
  policy.workspaceFileLocatorSignature('session-a', { ...fileSnapshot, body_omitted: true }),
  policy.workspaceFileLocatorSignature('session-a', { ...fileSnapshot, body_omitted: false }),
)
assert.notEqual(
  policy.workspaceFileLocatorSignature('session-a', fileSnapshot),
  policy.workspaceFileLocatorSignature('session-a', { ...fileSnapshot, event_id: 'event-2' }),
)
assert.notEqual(
  policy.workspaceFileLocatorSignature('session-a', { ...fileSnapshot, citation_start_offset: 0, citation_end_offset: 10 }),
  policy.workspaceFileLocatorSignature('session-a', { ...fileSnapshot, citation_start_offset: 10, citation_end_offset: 20 }),
)
let state = policy.upsertViewerTab([], fileTab)
assert.deepEqual(state.tabs.map(item => item.id), [fileTab.id])
assert.equal(state.activeTabId, fileTab.id)
state = policy.upsertViewerTab(state.tabs, changeTab)
assert.deepEqual(state.tabs.map(item => item.id), [fileTab.id, changeTab.id])
assert.equal(state.activeTabId, changeTab.id)
const refreshedChange = { ...changeTab, loading: false, title: '已读取变更' }
state = policy.upsertViewerTab(state.tabs, refreshedChange)
assert.equal(state.tabs.length, 2)
assert.equal(state.tabs[1].title, '已读取变更')
state = policy.closeViewerTab(state.tabs, changeTab.id, changeTab.id)
assert.equal(state.activeTabId, fileTab.id)
state = policy.closeViewerTab(state.tabs, fileTab.id, fileTab.id)
assert.deepEqual(state, { tabs: [], activeTabId: null })

assert.match(workspaceSource, /role="tablist"/)
assert.match(workspaceSource, /role="tab"/)
assert.match(workspaceSource, /role="tabpanel"/)
assert.match(workspaceSource, /:aria-selected="tab\.id === activeId"/)
assert.match(workspaceSource, /:tabindex="tab\.id === activeId \? 0 : -1"/)
assert.match(workspaceSource, /ArrowLeft/)
assert.match(workspaceSource, /ArrowRight/)
assert.match(workspaceSource, /event\.key === 'Delete'/)
assert.match(workspaceSource, /<header v-if="tabs\.length" class="workspace-head">/)
assert.match(workspaceSource, /您尚未选择任何 Viewer/)
assert.match(workspaceSource, /ref="emptyStateEl"[^>]*role="status"[^>]*tabindex="-1"/)
assert.match(workspaceSource, /nextTick\(\(\) => emptyStateEl\.value\?\.focus\(\)\)/)
assert.match(workspaceSource, /defineExpose\(\{ focusActiveViewer \}\)/)
assert.match(workspaceSource, /class="workspace-tab-close"/)
assert.doesNotMatch(workspaceSource, /workspace-new-viewer|request-viewer|选择新的 Viewer/)
assert.doesNotMatch(indexSource, /@request-viewer=|openWorkspaceViewerPicker/)
assert.match(workspaceSource, /\.workspace-tab-shell\s*\{[^}]*height:\s*30px;[^}]*border:\s*0;[^}]*border-radius:\s*10px;/)
assert.match(workspaceSource, /\.workspace-tab-shell\.active\s*\{[^}]*background:\s*rgba\(15,\s*15,\s*15,\s*0\.06\);/)
assert.match(workspaceSource, /import DOMPurify from 'dompurify'/)
assert.match(workspaceSource, /import \{ marked \} from 'marked'/)
assert.match(workspaceSource, /DOMPurify\.sanitize\(String\(marked\.parse/)
assert.match(workspaceSource, /white-space:\s*pre-wrap/)
assert.match(workspaceSource, /<CommitDiffDetail/)
assert.match(diffSource, /v-for="change in documentChanges"/)
assert.match(diffSource, /linePrefix\(line\.kind\)/)
assert.match(diffSource, /\.detail-pane\s*\{[^}]*height:\s*100%;[^}]*overflow-y:\s*auto;/)
assert.match(diffSource, /v-if="detail\.tombstones\.length" class="tombstone-changes"/)
assert.match(diffSource, /删除事件/)
assert.match(diffSource, /<button type="button" @click="emit\('retry'\)">重试<\/button>/)
assert.match(workspaceSource, /@retry="emit\('retry-change', activeTab\.id\)"/)

assert.match(indexSource, /@open-change="openWorkspaceChange"/)
assert.match(indexSource, /@open-file="openWorkspaceFile"/)
assert.match(indexSource, /@click\.stop="openMessageAttachmentViewer\(file, event\)"/)
assert.doesNotMatch(indexSource, /@click\.stop="downloadAttachment\(file\)"/)
assert.doesNotMatch(indexSource, /function saveAttachmentBlob|URL\.createObjectURL|link\.download/)
assert.match(indexSource, /getKnowledgeCommit\(projectId, commitSeq\)/)
assert.match(indexSource, /getVibeSessionSource\(sessionId, sourceId\)/)
assert.match(indexSource, /selectedTab\.detail\?\.session_id/)
assert.match(indexSource, /sourceCitationHasReadableRange\(source\)/)
assert.doesNotMatch(indexSource, /getKnowledgeSource\(/)
assert.doesNotMatch(indexSource, /`knowledge:\$\{projectId\}`/)
assert.match(diffSource, /:disabled="!detail\.session_id"/)
assert.match(indexSource, /downloadVibeSessionEventAttachment\(/)
assert.match(indexSource, /result\.blob\.text\(\)/)
assert.match(indexSource, /function retryWorkspaceChange\(tabId: string\)/)
assert.match(indexSource, /@retry-change="retryWorkspaceChange"/)
assert.match(policySource, /function workspaceInlineFileContent\(file: RecentSessionFile\): string \| null/)
assert.match(policySource, /typeof file\.content === 'string'/)
assert.match(policySource, /typeof file\.text === 'string'/)
assert.match(policySource, /function workspaceFileLocatorSignature/)
assert.match(indexSource, /if \(inlineContent === null\) void loadWorkspaceFile\(id\)/)
assert.match(indexSource, /'点击查看'/)
assert.match(indexSource, /workspaceRequestIsCurrent\(tabId, token\)/)
assert.match(indexSource, /workspaceChangeViewerTabId\(projectId, commitSeq\)/)
assert.match(indexSource, /workspaceFileViewerTabId\(sessionId, file\.identity\)/)
assert.match(indexSource, /\.conversation-workspace-window::before/)
assert.doesNotMatch(indexSource, /\.conversation-workspace-window\.has-viewer::before/)
assert.match(indexSource, /:style="workspaceWindowStyle"/)
assert.match(indexSource, /--workspace-window-width/)
assert.match(indexSource, /class="workspace-resize-handle"[\s\S]*role="separator"[\s\S]*tabindex="0"/)
assert.match(indexSource, /:aria-valuemin="workspaceWindowWidthRange\.min"/)
assert.match(indexSource, /:aria-valuemax="workspaceWindowWidthRange\.max"/)
assert.match(indexSource, /:aria-valuenow="workspaceWindowWidthPx"/)
assert.match(indexSource, /@pointerdown="beginWorkspaceResize"/)
assert.match(indexSource, /@pointercancel="finishWorkspaceResize"/)
assert.match(indexSource, /@lostpointercapture="finishWorkspaceResize"/)
assert.match(indexSource, /@keydown="handleWorkspaceResizeKeydown"/)
assert.match(indexSource, /new ResizeObserver\(updateWorkspaceMainWidth\)/)
assert.match(indexSource, /setPointerCapture\(event\.pointerId\)/)
assert.match(indexSource, /releasePointerCapture\(session\.pointerId\)/)
assert.match(indexSource, /if \(session\.moved\) persistWorkspaceWindowWidth\(\)/)
assert.match(indexSource, /vibe_conversation_workspace_width_px/)
assert.match(indexSource, /event\.key === 'ArrowLeft'/)
assert.match(indexSource, /event\.key === 'ArrowRight'/)
assert.match(indexSource, /event\.key === 'Home'/)
assert.match(indexSource, /event\.key === 'End'/)
assert.match(indexSource, /\.window-drag\.reserve-info-toggle\.workspace-open\s*\{[^}]*var\(--workspace-window-width\)/)
assert.match(indexSource, /\.main\.workspace-open \.main-head\s*\{[^}]*var\(--workspace-window-width\)/)
assert.match(indexSource, /\.conversation-workspace-window\s*\{[^}]*flex:\s*0 0 var\(--workspace-window-width\)/)
assert.match(railSource, /right:\s*calc\(var\(--workspace-window-width\) \+ 10px\)/)
assert.match(railSource, /width:\s*min\(324px,\s*calc\(100% - var\(--workspace-window-width\) - 20px\)\)/)
assert.match(workspaceSource, /<header v-if="tabs\.length" class="workspace-head">/)
assert.doesNotMatch(workspaceSource, /<header v-else|<header v-show/)
assert.match(indexSource, /\.workspace-window-leave-active/)
assert.match(indexSource, /\.workspace-window-leave-to/)
assert.match(indexSource, /@after-leave="finishWorkspaceWindowLeave"/)
assert.match(indexSource, /workspaceWindowLayoutActive/)
assert.match(indexSource, /new WorkspaceViewerConversationStore\(\)/)
assert.match(indexSource, /new WorkspaceViewerRequestGate\(\)/)
assert.match(indexSource, /function activateWorkspaceConversation\(projectId: unknown, sessionId: unknown\)/)
assert.match(indexSource, /workspaceConversationStore\.activate\(/)
assert.match(indexSource, /workspaceRequestGate\.invalidateAll\(\)/)
assert.match(indexSource, /workspaceRequestGate\.isCurrent\(tabId, token, workspaceConversationStore\.currentKey\)/)
assert.match(indexSource, /clearWorkspaceOpenTimer\(\)[\s\S]*workspaceFocusAfterEnter = false[\s\S]*workspaceRequestGate\.invalidateAll\(\)/)
assert.match(indexSource, /const switchingConversation = activeSessionId\.value !== sessionId[\s\S]*activateWorkspaceConversation\(workspaceProjectContextId\(\), sessionId\)/)
assert.match(indexSource, /function newConversation\(\)[\s\S]*activateWorkspaceConversation\(workspaceProjectContextId\(\), ''\)/)
assert.match(indexSource, /function adoptWorkspaceDraftForSession\(projectId: unknown, sessionId: string\)/)
assert.match(indexSource, /adoptWorkspaceDraftForSession\(creationProjectId, session\.id\)/)
assert.match(indexSource, /discardWorkspaceConversation\(deletionProjectId, sessionId\)/)
assert.doesNotMatch(indexSource, /const deletingActive = activeSessionId\.value === sessionId/)
assert.match(indexSource, /deletedConversationIsStillActive\(/)
assert.match(indexSource, /if \(!deletingCurrentProject\) return/)
assert.match(indexSource, /workspaceDraftCreationIsStillActive\(\{/)
assert.match(indexSource, /if \(!creationContextStillActive\)[\s\S]*workspaceConversationStore\.write\(sessionKey, saved\)[\s\S]*return session\.id/)

console.log('vibe workspace viewer contract: PASS')
