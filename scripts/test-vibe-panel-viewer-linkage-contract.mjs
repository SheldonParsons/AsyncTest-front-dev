import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { computed, isRef, ref } from 'vue'

// This is a non-visual component-controller test: no browser, DOM renderer,
// layout measurements, network access, or copied state-transition controller.
const root = path.resolve(import.meta.dirname, '..')
const viewPath = 'src/views/electron_views/vibe/knowledge/index.vue'
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const source = read(viewPath)
const parsed = parse(source, { filename: viewPath })
assert.deepEqual(parsed.errors, [])
const script = parsed.descriptor.scriptSetup?.content
const template = parsed.descriptor.template?.content
assert.ok(script && template, 'the actual script setup and template must be present')
const ast = ts.createSourceFile(viewPath + '.ts', script, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)

const stateNames = [
  'selectedProjectId', 'activeSessionId', 'currentView',
  'infoRailPreference', 'workspacePanelViewerState', 'infoRailCollapsed',
  'workspaceWindowOpen', 'workspaceWindowRequestedOpen', 'workspaceWindowLayoutActive',
  'workspaceTabs', 'activeWorkspaceTabId', 'workspaceRef',
  'workspaceConversationStore', 'workspaceRequestGate',
  'workspaceFileListRequests', 'workspaceChangeListRequests',
]
const functionNames = [
  'initializeInfoRail', 'setInfoRailCollapsed', 'toggleInfoRail',
  'mountWorkspaceWindow', 'shouldMoveFocusToWorkspace', 'focusWorkspaceAfterEnter',
  'applyWorkspaceWindowState', 'setWorkspaceWindowOpen',
  'finishWorkspaceWindowLeave', 'keepWorkspaceWindowLayout',
  'workspaceTabById', 'replaceWorkspaceTab', 'applyWorkspaceTabsState',
  'selectWorkspaceTab', 'closeWorkspaceTab', 'workspaceProjectContextId',
  'resumeWorkspaceConversationRequests', 'activateWorkspaceConversation',
  'adoptWorkspaceDraftForSession', 'discardWorkspaceConversation',
  'beginWorkspaceRequest', 'workspaceRequestIsCurrent',
  'openInfoRailChange', 'openInfoRailFile',
  'openInfoRailChangeList', 'openInfoRailFileList',
  'openWorkspaceChangeFromList', 'openWorkspaceFileFromList',
  'openWorkspaceChange', 'openWorkspaceFile', 'openMessageAttachmentViewer',
  'openConversationSource', 'loadWorkspaceCitationSource', 'openWorkspaceSource',
  'attachmentName', 'eventAttachments',
]
const wanted = new Set([...stateNames, 'workspaceFocusAfterEnter', ...functionNames])
const declarations = new Map()
const fragments = []
const printer = ts.createPrinter()
for (const statement of ast.statements) {
  if (ts.isFunctionDeclaration(statement) && wanted.has(statement.name?.text)) {
    const name = statement.name.text
    assert.ok(!declarations.has(name), `duplicate controller function: ${name}`)
    declarations.set(name, statement)
    fragments.push(statement.getText(ast))
  } else if (ts.isVariableStatement(statement)) {
    const selected = statement.declarationList.declarations.filter(declaration => (
      ts.isIdentifier(declaration.name) && wanted.has(declaration.name.text)
    ))
    for (const declaration of selected) {
      assert.ok(!declarations.has(declaration.name.text), `duplicate state: ${declaration.name.text}`)
      declarations.set(declaration.name.text, declaration)
    }
    if (selected.length) {
      const selectedStatement = ts.factory.updateVariableStatement(statement, statement.modifiers,
        ts.factory.updateVariableDeclarationList(statement.declarationList, selected))
      fragments.push(printer.printNode(ts.EmitHint.Unspecified, selectedStatement, ast))
    }
  }
}
assert.deepEqual([...wanted].filter(name => !declarations.has(name)), [], 'do not silently test a removed/replaced controller')

const compilerOptions = { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true }
const compiled = ts.transpileModule(fragments.join('\n') + `
globalThis.component = {
  ${[...stateNames, ...functionNames].join(',\n  ')},
  focusPending: () => workspaceFocusAfterEnter,
}
`, { compilerOptions, reportDiagnostics: true })
assert.deepEqual(compiled.diagnostics || [], [])
const controllerScript = new vm.Script(compiled.outputText, { filename: viewPath + ':extracted-controller' })

async function importPolicy(relative) {
  const output = ts.transpileModule(read(relative), { compilerOptions, reportDiagnostics: true })
  assert.deepEqual(output.diagnostics || [], [], relative)
  return import(`data:text/javascript;base64,${Buffer.from(output.outputText).toString('base64')}`)
}
const [panelPolicy, viewerPolicy, citationPolicy, railPolicy, statsPolicy, changePresentation] = await Promise.all([
  importPolicy('src/views/electron_views/vibe/knowledge/workspacePanelPolicy.ts'),
  importPolicy('src/views/electron_views/vibe/knowledge/workspaceViewerPolicy.ts'),
  importPolicy('src/views/electron_views/vibe/knowledge/sourceCitationPolicy.ts'),
  importPolicy('src/views/electron_views/vibe/knowledge/conversationInfoRailPolicy.ts'),
  importPolicy('src/views/electron_views/vibe/knowledge/projectStatsPolicy.ts'),
  importPolicy('src/views/electron_views/vibe/browser/knowledgeChangePresentation.ts'),
])

// Execute the real toolbar handler using Vue-style ref unwrapping. A renamed
// or disconnected handler therefore cannot leave a copied test callback green.
const toolbar = template.match(/<button\b[^>]*class="workspace-window-toggle\b[^>]*>/)?.[0]
assert.ok(toolbar, 'persistent Viewer toolbar button must exist')
const toolbarExpression = toolbar.match(/@click="([^"]+)"/)?.[1]
assert.ok(toolbarExpression, 'Viewer toolbar must have a click handler')
const toolbarScript = new vm.Script(`with (templateBindings) { ${toolbarExpression} }`)

class FocusTarget {
  constructor(inPanel = false) { this.inPanel = inPanel }
  closest() { return this.inPanel ? this : null }
}
const plain = value => JSON.parse(JSON.stringify(value))

function harness({ sessionId = 'session-a', projectId = '19', stored = null, narrow = false } = {}) {
  const storage = new Map(stored === null ? [] : [['vibe_conversation_info_rail_collapsed', stored]])
  const calls = { storage: [], loads: [], focus: [], warnings: [], toasts: [], transitions: 0 }
  const ticks = []
  const document = { activeElement: null }
  const forbiddenDelay = () => assert.fail('Panel/Viewer opening must not wait for a timer or animation frame')
  const context = vm.createContext({
    ref, computed,
    ...panelPolicy, ...viewerPolicy, ...citationPolicy, ...railPolicy, ...statsPolicy, ...changePresentation,
    requestWorkspaceViewerOpen(...args) {
      calls.transitions += 1
      return panelPolicy.requestWorkspaceViewerOpen(...args)
    },
    document,
    HTMLElement: FocusTarget,
    localStorage: {
      getItem: key => storage.get(key) ?? null,
      setItem(key, value) { storage.set(key, value); calls.storage.push([key, value]) },
    },
    window: {
      matchMedia: query => ({ matches: query === '(max-width: 1180px)' && narrow }),
      $toast: message => calls.toasts.push(message),
      setTimeout: forbiddenDelay,
      requestAnimationFrame: forbiddenDelay,
    },
    ElMessage: { warning: message => calls.warnings.push(message) },
    nextTick(callback) { ticks.push(callback); return Promise.resolve() },
    setTimeout: forbiddenDelay,
    requestAnimationFrame: forbiddenDelay,
  })
  // Only data-loading boundaries are stubbed. Entry routing, tab upsert/reuse,
  // request gates, conversation snapshots and all Panel/Viewer logic are real.
  for (const name of [
    'loadWorkspaceChange', 'loadWorkspaceFile', 'loadWorkspaceChangeList',
    'loadWorkspaceFileList', 'loadWorkspaceSourceFragment', 'loadWorkspaceSessionSource',
  ]) context[name] = (...args) => { calls.loads.push([name, ...args]); return Promise.resolve() }
  controllerScript.runInContext(context)
  const api = context.component
  context.templateBindings = new Proxy(api, {
    has: (target, name) => name in target,
    get(target, name) {
      if (name === Symbol.unscopables) return undefined
      const value = target[name]
      return isRef(value) ? value.value : value
    },
  })
  const result = {
    api, calls, document, prepared: {},
    clickToolbar: () => toolbarScript.runInContext(context),
    flushTicks() { for (const callback of ticks.splice(0)) callback?.() },
    pendingTicks: () => ticks.length,
    mountViewer(label = 'viewer') {
      api.workspaceRef.value = { focusActiveViewer: () => calls.focus.push(label) }
    },
    switchConversation(nextProject, nextSession) {
      api.selectedProjectId.value = nextProject
      api.activeSessionId.value = nextSession
      api.activateWorkspaceConversation(nextProject, nextSession)
    },
  }
  api.initializeInfoRail()
  result.switchConversation(projectId, sessionId)
  return result
}

function expectState(h, { viewer, panel, marker }, label) {
  const c = h.api
  assert.deepEqual({
    requested: c.workspaceWindowRequestedOpen.value,
    mounted: c.workspaceWindowOpen.value,
    panel: c.infoRailCollapsed.value,
    marker: c.workspacePanelViewerState.value.autoCollapsedPanelRevision,
  }, { requested: viewer, mounted: viewer, panel, marker }, label)
}

const file = (id = 'file-a') => ({
  identity: `attachment:${id}`, filename: `${id}.md`, content: `# ${id}`,
  event_id: 'event-a', attachment_index: 0, last_event_order: 1, last_seen_at: '',
})
const change = (seq = 4) => ({ project_id: '19', seq, reason: `change-${seq}` })
const citation = (id = 'source-a', ranged = true) => citationPolicy.normalizeConversationSourceCitation({
  source_id: id, display_name: `${id}.md`,
  ...(ranged ? { locator: { start_offset: 0, end_offset: 20 } } : {}),
}, 0)

function prepareChangeSource(h) {
  h.api.openInfoRailChange(change())
  const id = h.api.activeWorkspaceTabId.value
  h.api.replaceWorkspaceTab(id, tab => ({
    ...tab, loading: false,
    detail: { session_id: 'source-owner-session', sources: [{ id: 'detail-source', display_name: 'detail.md' }] },
  }))
  h.prepared.changeId = id
  h.api.setWorkspaceWindowOpen(false)
}

const entries = [
  { name: 'toolbar', open: h => h.clickToolbar(), toggle: true },
  { name: 'Panel file', open: h => h.api.openInfoRailFile(file()) },
  { name: 'Panel change', open: h => h.api.openInfoRailChange(change()) },
  { name: 'all changes', open: h => h.api.openInfoRailChangeList() },
  { name: 'all files', open: h => h.api.openInfoRailFileList() },
  { name: 'draft all files', options: { sessionId: '' }, open: h => h.api.openInfoRailFileList() },
  { name: 'message attachment', open(h) {
    const attachment = { id: 'message-file', filename: 'message.md', content: '# message' }
    h.api.openMessageAttachmentViewer(attachment, {
      id: 'event-message', session_id: h.api.activeSessionId.value, attachments: [attachment],
    })
  } },
  { name: 'source fragment', open: h => h.api.openConversationSource(citation()) },
  { name: 'whole source', open: h => h.api.openConversationSource(citation('whole-source', false)) },
  { name: 'change detail source', prepare: prepareChangeSource, open(h) {
    h.api.selectWorkspaceTab(h.prepared.changeId)
    h.api.openWorkspaceSource('detail-source')
  } },
  { name: 'Viewer change-list detail', prepare(h) {
    h.api.openInfoRailChangeList()
    h.prepared.listId = h.api.activeWorkspaceTabId.value
    h.api.setWorkspaceWindowOpen(false)
  }, open(h) {
    h.api.selectWorkspaceTab(h.prepared.listId)
    h.api.openWorkspaceChangeFromList({ seq: 5, reason: 'list detail' })
  } },
  { name: 'Viewer file-list detail', prepare(h) {
    h.api.openInfoRailFileList()
    h.prepared.listId = h.api.activeWorkspaceTabId.value
    h.api.setWorkspaceWindowOpen(false)
  }, open(h) {
    h.api.selectWorkspaceTab(h.prepared.listId)
    h.api.openWorkspaceFileFromList(file('list-file'), h.api.activeSessionId.value)
  } },
]

const tests = []
const test = (name, run) => tests.push({ name, run })
for (const entry of entries) {
  test(`${entry.name}: closed→open simultaneously collapses Panel; close restores`, () => {
    const h = harness(entry.options)
    entry.prepare?.(h)
    expectState(h, { viewer: false, panel: false, marker: null }, 'initial state')
    entry.open(h)
    expectState(h, { viewer: true, panel: true, marker: 0 }, 'both states must change synchronously')
    assert.equal(h.api.workspaceWindowLayoutActive.value, true)
    assert.deepEqual(h.calls.storage, [], 'automatic collapse is not a saved manual preference')
    h.clickToolbar()
    expectState(h, { viewer: false, panel: false, marker: null }, 'only this automatic collapse restores')
    assert.equal(h.api.workspaceWindowLayoutActive.value, false, 'same-tick close without a mounted child cannot wait for after-leave')
    assert.deepEqual(h.calls.storage, [])
  })

  test(`${entry.name}: manually closed Panel stays closed across the whole cycle`, () => {
    const h = harness(entry.options)
    entry.prepare?.(h)
    h.api.setInfoRailCollapsed(true)
    entry.open(h)
    expectState(h, { viewer: true, panel: true, marker: null }, 'manual close prevents automatic restore intent')
    h.clickToolbar()
    expectState(h, { viewer: false, panel: true, marker: null }, 'Viewer close must not reopen a manually closed Panel')
    assert.deepEqual(h.calls.storage, [['vibe_conversation_info_rail_collapsed', '1']])
  })

  if (!entry.toggle) test(`${entry.name}: new/reused tabs preserve the user's reopened Panel`, () => {
    const h = harness(entry.options)
    entry.prepare?.(h)
    h.clickToolbar()
    h.api.toggleInfoRail()
    expectState(h, { viewer: true, panel: false, marker: null }, 'explicit reopen overrides temporary collapse')
    entry.open(h)
    expectState(h, { viewer: true, panel: false, marker: null }, 'adding a Viewer tab is not reopening Viewer')
    const ids = plain(h.api.workspaceTabs.value.map(tab => tab.id))
    entry.open(h)
    expectState(h, { viewer: true, panel: false, marker: null }, 'reusing a Viewer tab is not reopening Viewer')
    assert.deepEqual(plain(h.api.workspaceTabs.value.map(tab => tab.id)), ids, 'repeated entry must deduplicate tabs')
    h.clickToolbar()
    expectState(h, { viewer: false, panel: false, marker: null }, 'manual reopen remains in force when Viewer closes')
    assert.deepEqual(h.calls.storage, [['vibe_conversation_info_rail_collapsed', '0']])
  })
}

test('existing list/file/change/source tabs reopen a closed Viewer through the same edge', () => {
  for (const entry of entries.filter(item => !item.toggle)) {
    const h = harness(entry.options)
    entry.prepare?.(h)
    entry.open(h)
    const ids = plain(h.api.workspaceTabs.value.map(tab => tab.id))
    h.api.setWorkspaceWindowOpen(false)
    entry.open(h)
    expectState(h, { viewer: true, panel: true, marker: 0 }, entry.name)
    assert.deepEqual(plain(h.api.workspaceTabs.value.map(tab => tab.id)), ids, entry.name)
  }
})

test('selecting existing tabs, including an unknown id, never restarts Panel auto-collapse', () => {
  const h = harness()
  h.api.openInfoRailFile(file('one'))
  h.api.toggleInfoRail()
  h.api.openInfoRailFile(file('two'))
  const firstId = h.api.workspaceTabs.value[0].id
  const transitions = h.calls.transitions
  h.api.selectWorkspaceTab(firstId)
  assert.equal(h.api.activeWorkspaceTabId.value, firstId)
  h.api.selectWorkspaceTab('missing-tab')
  assert.equal(h.api.activeWorkspaceTabId.value, firstId)
  expectState(h, { viewer: true, panel: false, marker: null })
  assert.equal(h.calls.transitions, transitions)
})

test('closing a non-final tab keeps Viewer; last-tab closure restores only an automatic Panel', () => {
  for (const manual of [false, true]) {
    const h = harness()
    if (manual) h.api.setInfoRailCollapsed(true)
    h.api.openInfoRailFile(file('one'))
    h.api.openInfoRailFile(file('two'))
    h.mountViewer()
    h.api.closeWorkspaceTab(h.api.activeWorkspaceTabId.value)
    expectState(h, { viewer: true, panel: true, marker: manual ? null : 0 })
    const lastId = h.api.activeWorkspaceTabId.value
    const token = h.api.beginWorkspaceRequest(lastId)
    h.api.closeWorkspaceTab(lastId)
    expectState(h, { viewer: false, panel: manual, marker: null })
    assert.equal(h.api.workspaceTabs.value.length, 0)
    assert.equal(h.api.activeWorkspaceTabId.value, null)
    assert.equal(h.api.workspaceRequestIsCurrent(lastId, token), false)
    h.api.finishWorkspaceWindowLeave()
    assert.equal(h.api.workspaceWindowLayoutActive.value, false)
  }
})

test('manual close after manual reopen cancels restoration, including on final-tab closure', () => {
  const h = harness()
  h.api.openInfoRailFile(file())
  h.api.toggleInfoRail()
  h.api.toggleInfoRail()
  expectState(h, { viewer: true, panel: true, marker: null })
  h.api.closeWorkspaceTab(h.api.activeWorkspaceTabId.value)
  expectState(h, { viewer: false, panel: true, marker: null })
  h.api.toggleInfoRail()
  h.api.openInfoRailFile(file())
  expectState(h, { viewer: true, panel: true, marker: 3 }, 'a later new cycle uses the current manual choice')
  assert.deepEqual(h.calls.storage.map(call => call[1]), ['0', '1', '0'])
})

test('same-value manual close overrides an automatic collapse rather than silently retaining its marker', () => {
  const h = harness()
  h.clickToolbar()
  h.api.setInfoRailCollapsed(true)
  expectState(h, { viewer: true, panel: true, marker: null })
  h.clickToolbar()
  expectState(h, { viewer: false, panel: true, marker: null })
  assert.deepEqual(h.calls.storage, [['vibe_conversation_info_rail_collapsed', '1']])
})

test('open→close in one tick, without a mounted component, has no stale layout or delayed reopening', () => {
  const h = harness()
  h.clickToolbar()
  h.clickToolbar()
  h.api.keepWorkspaceWindowLayout()
  h.api.finishWorkspaceWindowLeave()
  h.flushTicks()
  expectState(h, { viewer: false, panel: false, marker: null })
  assert.equal(h.api.workspaceWindowLayoutActive.value, false)
  assert.equal(h.pendingTicks(), 0)
})

test('open→close→open tolerates late after-leave/leave-cancelled without overriding manual state', () => {
  const h = harness()
  h.clickToolbar()
  h.mountViewer()
  h.clickToolbar()
  assert.equal(h.api.workspaceWindowLayoutActive.value, true, 'mounted Viewer retains layout while leaving')
  h.clickToolbar()
  h.api.toggleInfoRail()
  for (const callback of ['finishWorkspaceWindowLeave', 'keepWorkspaceWindowLayout', 'finishWorkspaceWindowLeave']) {
    h.api[callback]()
    expectState(h, { viewer: true, panel: false, marker: null }, callback)
    assert.equal(h.api.workspaceWindowLayoutActive.value, true)
  }
  h.clickToolbar()
  h.api.finishWorkspaceWindowLeave()
  h.api.keepWorkspaceWindowLayout()
  assert.equal(h.api.workspaceWindowLayoutActive.value, false, 'late cancellation cannot re-enable a closed layout')
})

test('same-tick reopen and repeated explicit open do not create multiple automatic cycles', () => {
  const h = harness()
  h.clickToolbar()
  h.clickToolbar()
  h.clickToolbar()
  h.api.setWorkspaceWindowOpen(true)
  expectState(h, { viewer: true, panel: true, marker: 0 })
  h.api.setInfoRailCollapsed(false)
  h.api.setWorkspaceWindowOpen(true)
  h.api.setWorkspaceWindowOpen(true)
  expectState(h, { viewer: true, panel: false, marker: null })
})

test('conversation/project snapshots restore their own auto-collapse markers without rerunning open policy', () => {
  const h = harness()
  h.api.openInfoRailFile(file('a'))
  const aTab = h.api.activeWorkspaceTabId.value
  const transitions = h.calls.transitions
  h.switchConversation('19', 'session-b')
  expectState(h, { viewer: false, panel: false, marker: null }, 'B must not inherit A automatic collapse')
  assert.equal(h.api.workspaceTabs.value.length, 0)
  h.switchConversation('20', 'session-a')
  expectState(h, { viewer: false, panel: false, marker: null }, 'same session id under another project is isolated')
  h.switchConversation('19', 'session-a')
  expectState(h, { viewer: true, panel: true, marker: 0 }, 'A restores its own pending cycle')
  assert.equal(h.api.activeWorkspaceTabId.value, aTab)
  assert.equal(h.calls.transitions, transitions, 'restoring snapshots must not request a fresh Viewer opening')
  h.api.setWorkspaceWindowOpen(false)
  expectState(h, { viewer: false, panel: false, marker: null })
  assert.deepEqual(h.calls.storage, [])
})

test('manual reopening survives A→B→A; a same-context activation is idempotent', () => {
  const h = harness()
  h.api.openInfoRailFile(file('a'))
  h.api.setInfoRailCollapsed(false)
  const transitions = h.calls.transitions
  h.switchConversation('19', 'session-b')
  h.switchConversation('19', 'session-a')
  expectState(h, { viewer: true, panel: false, marker: null })
  h.switchConversation('19', 'session-a')
  expectState(h, { viewer: true, panel: false, marker: null })
  assert.equal(h.calls.transitions, transitions)
  h.api.openInfoRailChangeList()
  expectState(h, { viewer: true, panel: false, marker: null })
})

test('a later global manual choice invalidates an older conversation restore marker', () => {
  const h = harness()
  h.clickToolbar()
  h.switchConversation('19', 'session-b')
  h.api.setInfoRailCollapsed(true)
  h.switchConversation('19', 'session-a')
  expectState(h, { viewer: true, panel: true, marker: 0 }, 'old marker may be retained in the snapshot but is stale')
  assert.equal(h.api.infoRailPreference.value.revision, 1)
  h.clickToolbar()
  expectState(h, { viewer: false, panel: true, marker: null }, 'stale restore intent cannot undo manual close in B')
  h.api.setInfoRailCollapsed(false)
  h.clickToolbar()
  expectState(h, { viewer: true, panel: true, marker: 2 }, 'new cycle records the latest preference revision')
})

test('draft adoption carries the live cycle and list identity; deleted snapshots lose restore intent', () => {
  const h = harness({ sessionId: '' })
  h.api.openInfoRailFileList()
  const draftId = h.api.activeWorkspaceTabId.value
  const transitions = h.calls.transitions
  h.api.adoptWorkspaceDraftForSession('19', 'created-session')
  h.api.activeSessionId.value = 'created-session'
  expectState(h, { viewer: true, panel: true, marker: 0 })
  assert.notEqual(h.api.activeWorkspaceTabId.value, draftId)
  assert.equal(h.api.workspaceTabs.value[0].sessionId, 'created-session')
  assert.equal(h.api.workspaceConversationStore.currentKey, viewerPolicy.workspaceViewerConversationKey('19', 'created-session'))
  assert.equal(h.calls.transitions, transitions)
  h.switchConversation('19', 'session-b')
  h.api.discardWorkspaceConversation('19', 'created-session')
  h.switchConversation('19', 'created-session')
  expectState(h, { viewer: false, panel: false, marker: null })
  assert.equal(h.api.workspaceTabs.value.length, 0)
})

test('queued focus belongs to the originating conversation and cannot focus the next one', () => {
  const h = harness()
  h.api.openConversationSource(citation())
  h.mountViewer('A')
  h.api.focusWorkspaceAfterEnter()
  assert.equal(h.pendingTicks(), 1)
  h.switchConversation('19', 'session-b')
  h.api.openConversationSource(citation('source-b'))
  h.mountViewer('B')
  h.flushTicks()
  assert.deepEqual(h.calls.focus, [], 'A nextTick must not focus B')
  h.api.focusWorkspaceAfterEnter()
  h.flushTicks()
  assert.deepEqual(h.calls.focus, ['B'])
})

test('close-before-focus drops pending focus; existing Viewer entries transfer focus without hiding Panel', () => {
  const h = harness()
  h.document.activeElement = new FocusTarget(true)
  h.api.openInfoRailFile(file('first'))
  h.mountViewer()
  h.api.focusWorkspaceAfterEnter()
  h.api.setWorkspaceWindowOpen(false)
  h.flushTicks()
  assert.deepEqual(h.calls.focus, [])
  h.api.setWorkspaceWindowOpen(true)
  h.api.setInfoRailCollapsed(false)
  h.api.openInfoRailFile(file('second'))
  h.flushTicks()
  assert.deepEqual(h.calls.focus, ['viewer'])
  expectState(h, { viewer: true, panel: false, marker: null })
})

test('source/detail/list ownership is retained while using the unified opening flow', () => {
  const h = harness()
  prepareChangeSource(h)
  h.api.openWorkspaceSource('detail-source')
  const sourceTab = h.api.workspaceTabById(h.api.activeWorkspaceTabId.value)
  assert.equal(sourceTab.sessionId, 'source-owner-session')
  assert.ok(h.calls.loads.some(call => call[0] === 'loadWorkspaceSessionSource' && call[2] === 'source-owner-session'))
  h.api.openInfoRailChangeList()
  h.api.setInfoRailCollapsed(false)
  const count = h.api.workspaceTabs.value.length
  h.api.openWorkspaceChangeFromList({ project_id: '20', seq: 99 })
  assert.equal(h.api.workspaceTabs.value.length, count, 'foreign project item is rejected')
  expectState(h, { viewer: true, panel: false, marker: null })
  h.api.openWorkspaceFileFromList(file('owned-file'), 'file-owner-session')
  assert.equal(h.api.workspaceTabById(h.api.activeWorkspaceTabId.value).sessionId, 'file-owner-session')
})

test('invalid source/change/project identities never start a Viewer or collapse Panel', () => {
  const h = harness({ sessionId: '' })
  h.api.openConversationSource(citation())
  h.api.openInfoRailChange({ seq: 0 })
  h.api.selectedProjectId.value = null
  h.api.openInfoRailChangeList()
  expectState(h, { viewer: false, panel: false, marker: null })
  assert.equal(h.api.workspaceTabs.value.length, 0)
  assert.equal(h.calls.transitions, 0)
})

test('stored and responsive initial Panel preferences remain unchanged by automatic cycles', () => {
  for (const options of [
    { stored: '1', narrow: false, collapsed: true },
    { stored: '0', narrow: true, collapsed: false },
    { stored: null, narrow: true, collapsed: true },
  ]) {
    const h = harness(options)
    h.clickToolbar()
    expectState(h, { viewer: true, panel: true, marker: options.collapsed ? null : 0 })
    h.clickToolbar()
    expectState(h, { viewer: false, panel: options.collapsed, marker: null })
    assert.deepEqual(h.calls.storage, [])
  }
})

test('template entry wiring and existing animation parameters remain intact', () => {
  for (const [event, handler] of [
    ['open-change', 'openInfoRailChange'], ['open-file', 'openInfoRailFile'],
    ['open-change-list', 'openInfoRailChangeList'], ['open-file-list', 'openInfoRailFileList'],
    ['select', 'selectWorkspaceTab'], ['close', 'closeWorkspaceTab'],
    ['open-source', 'openWorkspaceSource'], ['open-change-list-item', 'openWorkspaceChangeFromList'],
    ['open-file-list-item', 'openWorkspaceFileFromList'],
  ]) assert.ok(template.includes(`@${event}="${handler}"`), `${event} must use ${handler}`)
  assert.match(template, /@click\.stop="openMessageAttachmentViewer\(file, event\)"/)
  assert.equal((template.match(/@open-source="openConversationSource"/g) || []).length, 5)
  assert.match(template, /@after-enter="focusWorkspaceAfterEnter"/)
  assert.match(template, /@after-leave="finishWorkspaceWindowLeave"/)
  assert.match(template, /@leave-cancelled="keepWorkspaceWindowLayout"/)
  for (const name of ['setWorkspaceWindowOpen', 'applyWorkspaceWindowState', 'mountWorkspaceWindow']) {
    assert.doesNotMatch(declarations.get(name).getText(ast), /\bawait\b|setTimeout|requestAnimationFrame|infoRailCloseDelay/)
  }
  const rail = read('src/views/electron_views/vibe/knowledge/components/ConversationInfoRail.vue')
  assert.match(rail, /\.conversation-info-rail\s*\{[^}]*position:\s*absolute;/)
  assert.match(rail, /width 220ms ease/)
  assert.match(rail, /transform 220ms ease/)
  assert.match(rail, /right 320ms cubic-bezier\(\.22,\s*1,\s*\.36,\s*1\)/)
  assert.match(source, /\.workspace-window-enter-active,\s*\.workspace-window-leave-active\s*\{[^}]*flex-basis 320ms cubic-bezier\(\.22,\s*1,\s*\.36,\s*1\),\s*opacity 220ms ease;/)
  assert.match(source, /@media \(prefers-reduced-motion: reduce\)[\s\S]*\.workspace-window-enter-active,[\s\S]*transition:\s*none !important;/)
})

for (const { name, run } of tests) {
  try { await run() }
  catch (error) { error.message = `${name}: ${error.message}`; throw error }
}
console.log(`vibe Panel / Viewer component linkage contract: PASS (${tests.length} scenarios, real Vue state + AST-extracted component functions, no browser)`)
