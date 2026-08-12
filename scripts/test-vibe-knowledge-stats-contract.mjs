import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const policyPath = path.join(
  root,
  'src/views/electron_views/vibe/knowledge/projectStatsPolicy.ts',
)
const viewPath = path.join(
  root,
  'src/views/electron_views/vibe/knowledge/index.vue',
)
const browserPath = path.join(
  root,
  'src/views/electron_views/vibe/browser/index.vue',
)
const sourceReaderPath = path.join(
  root,
  'src/views/electron_views/vibe/browser/components/SourceReader.vue',
)
const policySource = fs.readFileSync(policyPath, 'utf8')
const viewSource = fs.readFileSync(viewPath, 'utf8')
const browserSource = fs.readFileSync(browserPath, 'utf8')
const sourceReaderSource = fs.readFileSync(sourceReaderPath, 'utf8')
const browserSfc = parse(browserSource, { filename: browserPath })
assert.deepEqual(browserSfc.errors, [])
const browserScript = browserSfc.descriptor.scriptSetup?.content || ''
const transpiled = ts.transpileModule(policySource, {
  compilerOptions: {
    module: ts.ModuleKind.ES2022,
    target: ts.ScriptTarget.ES2022,
    strict: true,
  },
  reportDiagnostics: true,
})
assert.deepEqual(transpiled.diagnostics || [], [])
const policy = await import(
  `data:text/javascript;base64,${Buffer.from(transpiled.outputText).toString('base64')}`
)

assert.equal(policy.knowledgeStatsProjectId(19), '19')
assert.equal(policy.knowledgeStatsProjectId('019'), '19')
assert.equal(
  policy.knowledgeStatsProjectId('f576695a-256f-4202-adea-67271dc95ea3'),
  '',
)
assert.deepEqual(
  policy.collectKnowledgeStatsProjectIds([
    { id: 19 },
    { id: '20' },
    { id: 19 },
    { id: 'f576695a-256f-4202-adea-67271dc95ea3' },
  ]),
  ['19', '20'],
)

const payload = {
  items: {
    19: { sections: 4, modules: 4 },
    20: { sections: 0, modules: 0 },
  },
}
const stats = {}
assert.equal(policy.writeKnowledgeStats(stats, payload, 19), true)
assert.equal(policy.writeKnowledgeStats(stats, payload, 20), true)
assert.deepEqual(policy.readKnowledgeStats(stats, 19), {
  sections: 4,
  modules: 4,
})
assert.equal(policy.hasKnowledgeWriteCommit(null), false)
assert.equal(policy.hasKnowledgeWriteCommit({ writeCommits: [] }), false)
assert.equal(policy.hasKnowledgeWriteCommit({ writeCommits: [{ commit_seq: 1 }] }), true)
assert.deepEqual(policy.readKnowledgeStats(stats, 20), {
  sections: 0,
  modules: 0,
})
assert.deepEqual(policy.readKnowledgeStats(stats, 21), {
  sections: 0,
  modules: 0,
})
assert.deepEqual(policy.readKnowledgeStats(stats, 20), {
  sections: 0,
  modules: 0,
})
assert.deepEqual(policy.readKnowledgeStats(stats, 19), {
  sections: 4,
  modules: 4,
})

const refreshed = { 19: { sections: 1, modules: 1 } }
assert.equal(policy.writeKnowledgeStats(refreshed, payload, '19'), true)
assert.deepEqual(refreshed['19'], { sections: 4, modules: 4 })
assert.equal(
  policy.writeKnowledgeStats(
    refreshed,
    payload,
    'f576695a-256f-4202-adea-67271dc95ea3',
  ),
  false,
)
assert.equal(Object.keys(refreshed).length, 1)

assert.match(
  viewSource,
  /getFoundationKnowledgeStatsMany\(projectIds\)/,
)
assert.match(
  viewSource,
  /function loadCurrentKbStats\(projectValue = selectedProjectId\.value\)[\s\S]*knowledgeStatsProjectId\(projectValue\)/,
)
assert.match(
  viewSource,
  /readKnowledgeStats\(projectStatsMap,\s*selectedProjectId\.value\)/,
)
assert.match(
  viewSource,
  /turnMayChangeKnowledge[\s\S]*void loadCurrentKbStats\(\)/,
)
assert.match(
  viewSource,
  /hasKnowledgeWriteCommit\(canonicalModel\)[\s\S]*loadCurrentKbStats\(project\)/,
)
const bootstrapSection = viewSource.slice(
  viewSource.indexOf('async function bootstrap()'),
  viewSource.indexOf('async function selectProject('),
)
const selectProjectSection = viewSource.slice(
  viewSource.indexOf('async function selectProject('),
  viewSource.indexOf('async function handleProjectChange('),
)
assert.match(
  bootstrapSection,
  /projects\.value\s*=[\s\S]*void loadKbStats\(\)[\s\S]*await selectProject\(/,
)
assert.doesNotMatch(selectProjectSection, /loadKbStats\(/)
assert.match(selectProjectSection, /void loadCurrentKbStats\(project\.id\)/)
assert.match(viewSource, /let allKbStatsRequest:\s*Promise<void>\s*\|\s*null/)
assert.match(viewSource, /const currentKbStatsRequests\s*=\s*new Map<string, Promise<void>>\(\)/)
assert.doesNotMatch(viewSource, /getVibeProjectsByAsyncProjects/)
assert.doesNotMatch(
  viewSource.slice(
    viewSource.indexOf('async function loadCurrentKbStats'),
    viewSource.indexOf('const kbStats = computed'),
  ),
  /vibeProject\.value/,
)
assert.doesNotMatch(policySource, /f576695a|Project 19|sections:\s*4|modules:\s*4/)

const forbiddenBrowserOwners = new Set([
  'getVibeProjectByAsyncProject',
  'initVibeProject',
])

function forbiddenBrowserOwnerImports(source) {
  const file = ts.createSourceFile(
    'browser-contract.ts',
    source,
    ts.ScriptTarget.ES2022,
    true,
    ts.ScriptKind.TS,
  )
  const findings = []
  for (const statement of file.statements) {
    if (
      !ts.isImportDeclaration(statement)
      || !ts.isStringLiteral(statement.moduleSpecifier)
      || statement.moduleSpecifier.text !== '../api'
      || !statement.importClause
    ) continue
    const bindings = statement.importClause.namedBindings
    if (bindings && ts.isNamedImports(bindings)) {
      for (const element of bindings.elements) {
        const imported = element.propertyName?.text || element.name.text
        if (forbiddenBrowserOwners.has(imported)) {
          findings.push({ kind: 'named', imported, local: element.name.text })
        }
      }
    } else if (bindings && ts.isNamespaceImport(bindings)) {
      const namespace = bindings.name.text
      const visit = (node) => {
        if (
          ts.isPropertyAccessExpression(node)
          && ts.isIdentifier(node.expression)
          && node.expression.text === namespace
          && forbiddenBrowserOwners.has(node.name.text)
        ) findings.push({
          kind: 'namespace',
          imported: node.name.text,
          local: `${namespace}.${node.name.text}`,
        })
        ts.forEachChild(node, visit)
      }
      ts.forEachChild(file, visit)
    }
  }
  return findings
}

assert.deepEqual(forbiddenBrowserOwnerImports(browserScript), [])
assert.equal(
  forbiddenBrowserOwnerImports(
    "import { getVibeProjectByAsyncProject } from '../api'; getVibeProjectByAsyncProject(19)",
  ).length,
  1,
)
assert.equal(
  forbiddenBrowserOwnerImports(
    "import { getVibeProjectByAsyncProject as resolveVibe } from '../api'; resolveVibe(19)",
  ).length,
  1,
)
assert.equal(
  forbiddenBrowserOwnerImports(
    "import * as vibeApi from '../api'; vibeApi.initVibeProject(19, {})",
  ).length,
  1,
)

assert.doesNotMatch(browserSource, /vibeProjectId/)
assert.match(
  browserScript,
  /async function reloadStatus\(projectId: string, epoch: number\)[\s\S]*getKnowledgeStatus\(projectId\)/,
)
assert.match(
  browserScript,
  /async function openModule[\s\S]*searchKnowledge\(projectId,[\s\S]*epoch !== projectRequestEpoch/,
)
assert.equal(
  (browserSource.match(/:project-id="selectedAsyncProjectId"/g) || []).length,
  5,
)
assert.equal(
  (browserSource.match(/:key="`[^`]*\$\{selectedAsyncProjectId\}[^`]*`"/g) || []).length,
  6,
)
assert.doesNotMatch(browserSource, /v-else-if="status" class="workspace"/)
assert.match(browserSource, /v-else-if="selectedAsyncProjectId" class="workspace"/)
assert.match(browserScript, /let projectRequestEpoch\s*=\s*0/)
assert.match(
  browserScript,
  /const epoch = \+\+projectRequestEpoch[\s\S]*selectedAsyncProjectId\.value[\s\S]*void reloadStatus\([^\n]*epoch\)/,
)
assert.match(browserScript, /if \(epoch !== projectRequestEpoch[^)]*\) return/)
assert.doesNotMatch(
  browserScript.slice(
    browserScript.indexOf('async function selectProject('),
    browserScript.indexOf('function reload()'),
  ),
  /await getKnowledgeStatus|await reloadStatus/,
)
assert.match(browserSource, /statusError[\s\S]*概况加载失败/)

assert.match(sourceReaderSource, /let requestEpoch\s*=\s*0/)
assert.match(sourceReaderSource, /const epoch = \+\+requestEpoch/)
assert.match(sourceReaderSource, /epoch !== requestEpoch/)
assert.match(sourceReaderSource, /detailLoading/)
assert.match(sourceReaderSource, /正在读取正文/)
assert.match(sourceReaderSource, /正在读取文档列表/)

const panelContracts = new Map([
  ['OverviewPanel.vue', [/getKnowledgeSources\(projectId/]],
  ['SourceReader.vue', [/getKnowledgeDocuments\(projectId/, /getKnowledgeDocument\(projectId/, /getKnowledgeSource\(projectId/]],
  ['SearchPanel.vue', [/searchKnowledge\(props\.projectId/]],
  ['CommitPanel.vue', [/getKnowledgeCommits\(props\.projectId/, /getKnowledgeCommit\(props\.projectId/]],
  ['ReceiptPanel.vue', [/getKnowledgeReceipts\(props\.projectId/, /getKnowledgeReceipt\(props\.projectId/]],
])
for (const [filename, callPatterns] of panelContracts) {
  const panelSource = fs.readFileSync(
    path.join(root, 'src/views/electron_views/vibe/browser/components', filename),
    'utf8',
  )
  assert.match(panelSource, /defineProps<\{ projectId: string/)
  for (const pattern of callPatterns) {
    assert.match(panelSource, pattern)
  }
}

const apiSource = fs.readFileSync(
  path.join(root, 'src/views/electron_views/vibe/api.ts'),
  'utf8',
)
for (const endpoint of [
  'status',
  'sources',
  'documents',
  'search',
  'commits',
  'receipts',
]) {
  assert.match(
    apiSource,
    new RegExp(`/vibe/foundation/knowledge/${endpoint}[^\\n]*kbBrowserQuery\\(\\{ project`),
  )
}

console.log('vibe knowledge identity contract: PASS (stats + browser full chain)')
