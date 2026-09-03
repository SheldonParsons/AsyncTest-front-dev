import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { ref } from 'vue'

const root = path.resolve(import.meta.dirname, '..')
const policyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/projectSwitchDialogPolicy.ts')
const dialogPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ProjectSwitchDialog.vue')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const orbPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ThinkingOrbStatus.vue')

const read = file => fs.readFileSync(file, 'utf8')
const policySource = read(policyPath)
const dialogSource = read(dialogPath)
const viewSource = read(viewPath)
const orbSource = read(orbPath)

for (const [file, source] of [[dialogPath, dialogSource], [viewPath, viewSource], [orbPath, orbSource]]) {
  assert.deepEqual(parse(source, { filename: file }).errors, [], `${file} should parse`)
}

const compiled = ts.transpileModule(policySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
  reportDiagnostics: true,
})
assert.deepEqual(compiled.diagnostics || [], [])
const policy = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)

const project = (id, name = `项目 ${id}`) => ({ id, name })
let state = policy.createProjectSwitchDialogState()
assert.equal(state.phase, 'idle')
assert.equal(state.open, false)

state = policy.beginProjectSwitch(state, project('2', 'Beta'))
const firstRequest = policy.projectSwitchRequest(state)
assert.equal(state.phase, 'working')
assert.equal(state.open, true)
assert.equal(policy.isProjectSwitchCurrent(state, firstRequest), true)
assert.equal(policy.completeProjectSwitch(state, firstRequest).open, true, 'must wait for list/content')

state = policy.markProjectSwitchSessionsLoaded(state, firstRequest, { sessions: [{ id: 'session-b' }] })
assert.equal(state.sessionsLoaded, true)
assert.equal(state.sessionsEmpty, false)
assert.equal(state.firstSessionId, 'session-b')
assert.equal(policy.isProjectSwitchReady(state), false)
state = policy.markProjectSwitchContentLoaded(state, firstRequest, 'wrong-session')
assert.equal(policy.isProjectSwitchReady(state), false)
state = policy.markProjectSwitchContentLoaded(state, firstRequest, { sessionId: 'session-b', displayable: false })
assert.equal(policy.isProjectSwitchReady(state), false)
state = policy.markProjectSwitchContentLoaded(state, firstRequest, 'session-b')
assert.equal(policy.isProjectSwitchReady(state), true)
state = policy.completeProjectSwitch(state, firstRequest)
assert.equal(state.open, false)
assert.equal(state.phase, 'idle')

// A newer intent invalidates every older response, even when the project id
// happens to be the same again.
state = policy.beginProjectSwitch(state, project('3', 'Gamma'))
const secondRequest = policy.projectSwitchRequest(state)
const staleState = policy.markProjectSwitchSessionsLoaded(state, firstRequest, { sessions: [] })
assert.strictEqual(staleState, state)
assert.equal(policy.isProjectSwitchCurrent(state, firstRequest), false)
state = policy.markProjectSwitchSessionsLoaded(state, secondRequest, { sessions: [] })
assert.equal(policy.isProjectSwitchReady(state), true)

// An authoritative empty list is a successful terminal state.
state = policy.completeProjectSwitch(state, secondRequest)
assert.equal(state.open, false)

state = policy.beginProjectSwitch(state, project('4', 'Delta'))
const failedRequest = policy.projectSwitchRequest(state)
state = policy.failProjectSwitch(state, failedRequest, new Error('网络暂不可用'))
assert.equal(state.phase, 'error')
assert.equal(state.open, true)
assert.equal(policy.completeProjectSwitch(state, failedRequest).open, true)
const retryState = policy.retryProjectSwitch(state)
assert.equal(retryState.phase, 'working')
assert.equal(retryState.open, true)
assert.equal(retryState.epoch, state.epoch + 1)
assert.equal(retryState.sessionsLoaded, false)

assert.match(dialogSource, /<Teleport\s+to="body">/)
assert.match(dialogSource, /name="project-switch-dialog-fade"/)
assert.match(dialogSource, /role="dialog"[\s\S]*aria-modal="true"/)
assert.match(dialogSource, /state="working"/)
assert.match(dialogSource, /:disabled="interactionLocked \|\| project\.disabled"/)
assert.match(dialogSource, /:disabled="busy"[\s\S]*@click="requestClose"/)
assert.match(dialogSource, /项目列表加载中…/)
assert.match(dialogSource, /project-switch-dialog-skeleton/)
assert.match(dialogSource, /displayProjectListError/)
assert.match(dialogSource, /@click="refreshProjects"/)
assert.match(dialogSource, /@keydown="handleKeydown"/)
assert.match(dialogSource, /if \(event\.key === 'Escape'\)/)
assert.match(dialogSource, /@click="retry"/)
assert.match(dialogSource, /prefers-reduced-motion: reduce/)

assert.doesNotMatch(viewSource, /<AppSelect\b/)
assert.match(viewSource, /class="project-switch-trigger"/)
assert.match(viewSource, /aria-haspopup="dialog"/)
assert.doesNotMatch(
  viewSource.match(/<button[\s\S]*?class="project-switch-trigger"[\s\S]*?<\/button>/)?.[0] || '',
  /!projects\.length/,
)
assert.match(viewSource, /@click="openProjectSwitchDialog"/)
assert.match(viewSource, /<ProjectSwitchDialog[\s\S]*@select="handleProjectChange"/)
assert.match(viewSource, /:projects-loading="projectListRefreshing"/)
assert.match(viewSource, /:project-list-error="projectListRefreshError"/)
assert.match(viewSource, /@refresh="refreshProjectList"/)
assert.match(viewSource, /async function loadProjectSwitchContext\(/)
assert.match(viewSource, /await localSessionsForProject\(String\(project\.id\)\)/)
assert.match(viewSource, /await requestSessionEvents\(firstSessionId\)/)
assert.match(viewSource, /markProjectSwitchSessionsLoaded\(/)
assert.match(viewSource, /markProjectSwitchContentLoaded\(/)
assert.match(viewSource, /completeProjectSwitch\(/)
assert.match(viewSource, /if \(!projectSwitchRequestIsActive\(request\)\) return null/)
assert.match(viewSource, /const contextStillCurrent = sendProjectIsCurrent\(\)/)
assert.match(viewSource, /if \(contextStillCurrent\) foundationBusy\.value = false/)
assert.match(viewSource, /const contextEpoch = projectContextEpoch/)
assert.match(viewSource, /contextEpoch !== projectContextEpoch/)
assert.match(viewSource, /const firstSessionId = String\(loadedSessions\[0\]\?\.id \|\| ''\)/)
assert.match(viewSource, /if \(loadedSessions\.length && !firstSessionId\)/)
assert.match(orbSource, /resolvePreset\(props\.state, ORB_SIZE\)/)

const viewScript = parse(viewSource, { filename: viewPath }).descriptor.scriptSetup?.content || ''
const viewAst = ts.createSourceFile(`${viewPath}.ts`, viewScript, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS)
const stateNames = [
  'projects', 'selectedProject', 'selectedProjectId', 'projectSwitchDialogOpen',
  'projectSwitchState', 'projectSwitchRequestToken', 'projectSwitchTargetId',
  'projectListRefreshing', 'projectListRefreshError', 'projectListRefreshEpoch', 'loading',
]
const functionNames = [
  'joinedProjectRows', 'projectListRefreshFailure', 'refreshProjectList',
  'openProjectSwitchDialog', 'closeProjectSwitchDialog',
]
const wanted = new Set([...stateNames, ...functionNames])
const fragments = []
const declarations = new Set()
const printer = ts.createPrinter()
for (const statement of viewAst.statements) {
  if (ts.isFunctionDeclaration(statement) && wanted.has(statement.name?.text)) {
    declarations.add(statement.name.text)
    fragments.push(statement.getText(viewAst))
  } else if (ts.isVariableStatement(statement)) {
    const selected = statement.declarationList.declarations.filter(declaration => (
      ts.isIdentifier(declaration.name) && wanted.has(declaration.name.text)
    ))
    selected.forEach(declaration => declarations.add(declaration.name.text))
    if (selected.length) {
      fragments.push(printer.printNode(
        ts.EmitHint.Unspecified,
        ts.factory.updateVariableStatement(
          statement,
          statement.modifiers,
          ts.factory.updateVariableDeclarationList(statement.declarationList, selected),
        ),
        viewAst,
      ))
    }
  }
}
assert.deepEqual([...wanted].filter(name => !declarations.has(name)), [])

const controllerSource = ts.transpileModule(`${fragments.join('\n')}
globalThis.projectListController = {
  ${stateNames.filter(name => name !== 'projectListRefreshEpoch').join(',\n  ')},
  ${functionNames.join(',\n  ')},
  requestEpoch: () => projectListRefreshEpoch,
}
`, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
  reportDiagnostics: true,
})
assert.deepEqual(controllerSource.diagnostics || [], [])

const pending = []
const statsCalls = []
const context = vm.createContext({
  ref,
  createProjectSwitchDialogState: policy.createProjectSwitchDialogState,
  closeProjectSwitchDialogState: policy.closeProjectSwitchDialog,
  ApiGetJoinProjects() {
    let resolve
    const promise = new Promise(done => { resolve = done })
    pending.push({ promise, resolve })
    return promise
  },
  refreshProjectOptionStats(rows, epoch) { statsCalls.push({ rows, epoch }) },
})
new vm.Script(controllerSource.outputText, { filename: `${viewPath}:project-list-controller` }).runInContext(context)
const controller = context.projectListController
const flush = () => new Promise(resolve => setImmediate(resolve))

// Empty cache must not disable/open-block the entry; each explicit opening
// starts exactly one request and exposes the loading lock immediately.
controller.projects.value = []
controller.selectedProjectId.value = '1'
controller.selectedProject.value = { id: 1, name: 'Cached' }
controller.openProjectSwitchDialog()
assert.equal(controller.projectSwitchDialogOpen.value, true)
assert.equal(controller.projectListRefreshing.value, true)
assert.equal(pending.length, 1)

// Close/reopen invalidates the old epoch. Its late response cannot replace
// the last opening's list or loading state.
const stale = pending.shift()
controller.closeProjectSwitchDialog()
controller.openProjectSwitchDialog()
const current = pending.shift()
assert.ok(current)
stale.resolve([{ id: 99, name: 'Stale' }])
await flush()
assert.deepEqual(controller.projects.value, [])
assert.equal(controller.projectListRefreshing.value, true)
current.resolve([{ id: 1, name: 'Fresh current' }, { id: 2, name: 'New' }])
await flush()
assert.deepEqual(controller.projects.value.map(item => item.id), [1, 2])
assert.equal(controller.selectedProject.value.name, 'Fresh current')
assert.equal(controller.selectedProjectId.value, '1', 'refresh must not switch projects')
assert.equal(controller.projectListRefreshing.value, false)
assert.equal(statsCalls.length, 1)

// A resolved API error preserves the cached list, keeps the dialog open, and
// a retry starts a fresh request instead of reusing the failed promise.
controller.closeProjectSwitchDialog()
const cached = [{ id: 1, name: 'Fresh current' }]
controller.projects.value = cached
controller.openProjectSwitchDialog()
const failed = pending.shift()
failed.resolve({ result: 0, msg: 'offline' })
await flush()
assert.deepEqual(controller.projects.value, cached)
assert.equal(controller.projectSwitchDialogOpen.value, true)
assert.match(controller.projectListRefreshError.value, /项目列表刷新失败，可重试/)
controller.refreshProjectList()
assert.equal(pending.length, 1)
assert.equal(controller.projectListRefreshing.value, true)
pending.shift().resolve([{ id: 1, name: 'Recovered' }])
await flush()
assert.equal(controller.projects.value[0].name, 'Recovered')
assert.equal(controller.projectListRefreshError.value, '')

console.log('vibe project switch dialog contract: PASS')
