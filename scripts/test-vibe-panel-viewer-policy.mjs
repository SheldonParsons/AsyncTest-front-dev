import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')

async function loadPolicy(relative) {
  const source = fs.readFileSync(path.join(root, relative), 'utf8')
  const compiled = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
    reportDiagnostics: true,
  })
  assert.deepEqual(compiled.diagnostics || [], [], relative)
  return import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
}

const panel = await loadPolicy('src/views/electron_views/vibe/knowledge/workspacePanelPolicy.ts')
const viewer = await loadPolicy('src/views/electron_views/vibe/knowledge/workspaceViewerPolicy.ts')
const closedViewer = () => ({ requestedOpen: false, autoCollapsedPanelRevision: null })
const preference = (collapsed = false, revision = 0) => ({ collapsed, revision })
const snapshot = (state, tabs = [], activeTabId = null) => viewer.snapshotWorkspaceViewerConversation(
  tabs,
  activeTabId,
  state.requestedOpen,
  state.autoCollapsedPanelRevision,
)

// Manual choice always wins; an automatic marker is effective only in its
// own open cycle and only until the next explicit Panel action anywhere.
for (const collapsed of [false, true]) {
  for (const requestedOpen of [false, true]) {
    for (const autoCollapsedPanelRevision of [null, 0, 1]) {
      const state = { requestedOpen, autoCollapsedPanelRevision }
      assert.equal(
        panel.workspacePanelCollapsed(preference(collapsed), state),
        collapsed || (requestedOpen && autoCollapsedPanelRevision === 0),
        JSON.stringify({ collapsed, ...state }),
      )
    }
  }
}

// Both opening and restoring are synchronous pure state updates; neither
// action rewrites the preference that is persisted by the view.
const manualOpen = Object.freeze(preference(false, 7))
const initial = Object.freeze(closedViewer())
const automaticallyOpened = panel.requestWorkspaceViewerOpen(initial, manualOpen, true)
assert.deepEqual(automaticallyOpened, { requestedOpen: true, autoCollapsedPanelRevision: 7 })
assert.equal(panel.workspacePanelCollapsed(manualOpen, automaticallyOpened), true)
assert.equal(panel.requestWorkspaceViewerOpen(automaticallyOpened, manualOpen, true), automaticallyOpened)
const restored = panel.requestWorkspaceViewerOpen(automaticallyOpened, manualOpen, false)
assert.deepEqual(restored, closedViewer())
assert.equal(panel.workspacePanelCollapsed(manualOpen, restored), false)
assert.equal(panel.requestWorkspaceViewerOpen(restored, manualOpen, false), restored)
assert.deepEqual(initial, closedViewer())
assert.deepEqual(manualOpen, preference(false, 7))

// A Panel manually closed before the Viewer opens remains closed throughout.
const manualClosed = Object.freeze(preference(true, 8))
const openedWithClosedPanel = panel.requestWorkspaceViewerOpen(initial, manualClosed, true)
assert.equal(openedWithClosedPanel.autoCollapsedPanelRevision, null)
assert.equal(panel.workspacePanelCollapsed(manualClosed, openedWithClosedPanel), true)
assert.equal(panel.workspacePanelCollapsed(
  manualClosed,
  panel.requestWorkspaceViewerOpen(openedWithClosedPanel, manualClosed, false),
), true)

// Reopening the automatically hidden Panel is a same-value preference write:
// the revision must still advance, so further tab requests leave it visible.
const reopenedPreference = panel.setWorkspacePanelPreference(manualOpen, false)
assert.deepEqual(reopenedPreference, preference(false, 8))
assert.equal(panel.workspacePanelCollapsed(reopenedPreference, automaticallyOpened), false)
for (const entry of ['file', 'change', 'file-list', 'change-list', 'source', 'existing-tab']) {
  const sameCycle = panel.requestWorkspaceViewerOpen(automaticallyOpened, reopenedPreference, true)
  assert.equal(sameCycle, automaticallyOpened, entry)
  assert.equal(panel.workspacePanelCollapsed(reopenedPreference, sameCycle), false, entry)
}

// Explicit close cancels an old restore intent, including a same-value close.
const explicitlyClosed = panel.setWorkspacePanelPreference(manualOpen, true)
const closedAfterManualChoice = panel.requestWorkspaceViewerOpen(automaticallyOpened, explicitlyClosed, false)
assert.equal(panel.workspacePanelCollapsed(explicitlyClosed, closedAfterManualChoice), true)
assert.deepEqual(panel.setWorkspacePanelPreference(explicitlyClosed, true), preference(true, 9))
const openedAgainWhileClosed = panel.requestWorkspaceViewerOpen(closedAfterManualChoice, explicitlyClosed, true)
assert.equal(openedAgainWhileClosed.autoCollapsedPanelRevision, null)
const openedThenClosedPreference = panel.setWorkspacePanelPreference(reopenedPreference, true)
assert.equal(panel.workspacePanelCollapsed(
  openedThenClosedPreference,
  panel.requestWorkspaceViewerOpen(automaticallyOpened, openedThenClosedPreference, false),
), true)
const laterManualOpen = panel.setWorkspacePanelPreference(explicitlyClosed, false)
assert.deepEqual(
  panel.requestWorkspaceViewerOpen(closedAfterManualChoice, laterManualOpen, true),
  { requestedOpen: true, autoCollapsedPanelRevision: laterManualOpen.revision },
)

// Exercise all action traces through six steps against an independent model
// expressed in visible Panel state and a boolean restore intent. This includes
// rapid toggles, duplicate opens/closes and manual overrides during a cycle.
const actions = ['viewer-open', 'viewer-close', 'panel-open', 'panel-close']
let checkedTransitions = 0
function checkTraces(currentPreference, currentState, model, trace = []) {
  if (trace.length === 6) return
  for (const action of actions) {
    const nextTrace = [...trace, action]
    const message = nextTrace.join(' → ')
    let nextPreference = currentPreference
    let nextState = currentState
    let expected = { ...model }
    if (action.startsWith('panel-')) {
      const collapsed = action === 'panel-close'
      nextPreference = panel.setWorkspacePanelPreference(currentPreference, collapsed)
      expected.panelCollapsed = collapsed
      expected.restorePanel = false
      assert.equal(nextPreference.revision, currentPreference.revision + 1, message)
    } else {
      const open = action === 'viewer-open'
      nextState = panel.requestWorkspaceViewerOpen(currentState, currentPreference, open)
      if (open === model.viewerOpen) {
        assert.equal(nextState, currentState, message)
      } else if (open) {
        expected.viewerOpen = true
        expected.restorePanel = !model.panelCollapsed
        expected.panelCollapsed = true
      } else {
        expected.viewerOpen = false
        expected.panelCollapsed = model.restorePanel ? false : model.panelCollapsed
        expected.restorePanel = false
      }
    }
    assert.equal(nextState.requestedOpen, expected.viewerOpen, message)
    assert.equal(panel.workspacePanelCollapsed(nextPreference, nextState), expected.panelCollapsed, message)
    assert.equal(
      nextState.requestedOpen
        && nextState.autoCollapsedPanelRevision !== null
        && nextState.autoCollapsedPanelRevision === nextPreference.revision,
      expected.restorePanel,
      message,
    )
    checkedTransitions += 1
    checkTraces(Object.freeze(nextPreference), Object.freeze(nextState), expected, nextTrace)
  }
}
for (const collapsed of [false, true]) {
  checkTraces(Object.freeze(preference(collapsed)), Object.freeze(closedViewer()), {
    viewerOpen: false,
    panelCollapsed: collapsed,
    restorePanel: false,
  })
}
assert.equal(checkedTransitions, 10920)

// Conversation snapshots carry the marker but not a copy of the global manual
// preference. Switching sessions/projects is restoration, not another open.
assert.equal(viewer.snapshotWorkspaceViewerConversation([], null, false).autoCollapsedPanelRevision, null)
const store = new viewer.WorkspaceViewerConversationStore()
const aKey = viewer.workspaceViewerConversationKey('project-a', 'session-a')
const bKey = viewer.workspaceViewerConversationKey('project-a', 'session-b')
const otherProjectKey = viewer.workspaceViewerConversationKey('project-b', 'session-a')
store.activate(aKey, snapshot(initial))
let activation = store.activate(bKey, snapshot(automaticallyOpened))
assert.equal(activation.state.autoCollapsedPanelRevision, null)
assert.equal(panel.workspacePanelCollapsed(manualOpen, activation.state), false)
activation = store.activate(otherProjectKey, activation.state)
assert.equal(activation.state.autoCollapsedPanelRevision, null)
activation = store.activate(aKey, activation.state)
assert.equal(activation.state.autoCollapsedPanelRevision, 7)
assert.equal(panel.workspacePanelCollapsed(manualOpen, activation.state), true)
assert.equal(store.activate(aKey, activation.state).state.autoCollapsedPanelRevision, 7)
activation = store.activate(bKey, activation.state)
const bOpened = panel.requestWorkspaceViewerOpen(activation.state, manualOpen, true)
activation = store.activate(aKey, snapshot(bOpened))
assert.equal(panel.workspacePanelCollapsed(reopenedPreference, activation.state), false)
assert.equal(panel.workspacePanelCollapsed(reopenedPreference, store.read(bKey)), false)
assert.equal(panel.workspacePanelCollapsed(explicitlyClosed, activation.state), true)
assert.equal(panel.workspacePanelCollapsed(
  explicitlyClosed,
  panel.requestWorkspaceViewerOpen(activation.state, explicitlyClosed, false),
), true)
store.drop(bKey)
assert.equal(store.read(bKey), null)

// Direct write/read is also used when async session creation completes after
// the user has left the draft. Its automatic intent must remain isolated.
store.write(bKey, snapshot(bOpened))
const readSnapshot = store.read(bKey)
assert.equal(readSnapshot.autoCollapsedPanelRevision, 7)
readSnapshot.autoCollapsedPanelRevision = null
assert.equal(store.read(bKey).autoCollapsedPanelRevision, 7)

// Adopting an active draft changes ownership without closing/reopening the UI.
const draftStore = new viewer.WorkspaceViewerConversationStore()
const draftKey = viewer.workspaceViewerConversationKey('project-a', '')
const createdKey = viewer.workspaceViewerConversationKey('project-a', 'created-session')
draftStore.activate(draftKey, snapshot(initial))
assert.equal(draftStore.adoptActiveDraft(draftKey, createdKey), true)
assert.equal(draftStore.currentKey, createdKey)
draftStore.activate(bKey, snapshot(automaticallyOpened))
activation = draftStore.activate(createdKey, snapshot(initial))
assert.equal(activation.state.autoCollapsedPanelRevision, 7)
assert.equal(panel.workspacePanelCollapsed(manualOpen, activation.state), true)
assert.equal(draftStore.read(draftKey), null)

// Tab insertion/de-duplication is independent from opening the Viewer. Only
// closing the last tab requests a close and consumes the automatic intent.
const fileTab = {
  id: viewer.workspaceFileViewerTabId('session-a', 'file-a'),
  kind: 'file',
  title: 'a.md',
  loading: false,
  error: '',
  sessionId: 'session-a',
  file: {},
  content: '# A',
}
let tabs = viewer.upsertViewerTab([], fileTab)
let cycle = panel.requestWorkspaceViewerOpen(initial, manualOpen, true)
tabs = viewer.upsertViewerTab(tabs.tabs, fileTab)
assert.equal(tabs.tabs.length, 1)
assert.equal(panel.requestWorkspaceViewerOpen(cycle, reopenedPreference, true), cycle)
const secondTab = { ...fileTab, id: viewer.workspaceFileViewerTabId('session-a', 'file-b'), title: 'b.md' }
tabs = viewer.upsertViewerTab(tabs.tabs, secondTab)
assert.equal(panel.workspacePanelCollapsed(reopenedPreference, cycle), false)
tabs = viewer.closeViewerTab(tabs.tabs, tabs.activeTabId, fileTab.id)
assert.equal(tabs.activeTabId, secondTab.id)
assert.equal(tabs.tabs.length, 1)
assert.equal(cycle.requestedOpen, true)
tabs = viewer.closeViewerTab(tabs.tabs, tabs.activeTabId, secondTab.id)
assert.equal(tabs.tabs.length, 0)
cycle = panel.requestWorkspaceViewerOpen(cycle, manualOpen, false)
assert.equal(panel.workspacePanelCollapsed(manualOpen, cycle), false)
assert.equal(cycle.autoCollapsedPanelRevision, null)
assert.equal(panel.workspacePanelCollapsed(
  explicitlyClosed,
  panel.requestWorkspaceViewerOpen(automaticallyOpened, explicitlyClosed, false),
), true, 'closing the last tab after manual close must not reopen the Panel')

console.log(`vibe panel/viewer policy: PASS (${checkedTransitions} action transitions + context/tab cases)`)
