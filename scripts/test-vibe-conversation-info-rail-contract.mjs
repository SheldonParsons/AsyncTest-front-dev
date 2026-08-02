import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const policyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/conversationInfoRailPolicy.ts')
const presentationPath = path.join(root, 'src/views/electron_views/vibe/browser/knowledgeChangePresentation.ts')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const railPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ConversationInfoRail.vue')
const commitPanelPath = path.join(root, 'src/views/electron_views/vibe/browser/components/CommitPanel.vue')
const apiPath = path.join(root, 'src/views/electron_views/vibe/api.ts')
const harnessPath = path.join(root, 'src/api/harness.ts')

function read(file) { return fs.readFileSync(file, 'utf8') }
function importTs(file) {
  const source = read(file)
  const result = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
    reportDiagnostics: true,
  })
  assert.deepEqual(result.diagnostics || [], [])
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`)
}

const policy = await importTs(policyPath)
const presentation = await importTs(presentationPath)
const viewSource = read(viewPath)
const railSource = read(railPath)
const commitPanelSource = read(commitPanelPath)
const apiSource = read(apiPath)
const harnessSource = read(harnessPath)

const events = [
  { id: 'e1', session_id: 'session-a', event_order: 1, created_at: '2026-08-01T01:00:00Z', attachments: [
    { id: 'file-a', filename: 'a.md', mime: 'text/markdown', size: 100 },
    { id: 'file-b', filename: 'b.pdf', mime: 'application/pdf', size: 200 },
  ] },
  { id: 'e2', session_id: 'session-b', event_order: 20, created_at: '2026-08-01T20:00:00Z', attachments: [
    { id: 'foreign', filename: 'foreign.md' },
  ] },
  { id: 'e3', session_id: 'session-a', event_order: 3, created_at: '2026-08-01T03:00:00Z', attachments: [
    { id: 'file-a', filename: 'a-renamed.md', mime: 'text/markdown', size: 100 },
    { resource_id: 'resource-c', filename: 'c.txt', status: 'ready' },
    { source_ref_id: 'source-d', filename: 'd.csv' },
    { attachment_source_ref: { ref_id: 'ref-e' }, filename: 'e.docx' },
    { id: 'file-f', filename: 'f.md' },
    { id: 'file-g', filename: 'g.md' },
  ] },
]
assert.equal(policy.attachmentIdentity({ id: 'file-a' }), 'attachment:file-a')
assert.equal(policy.attachmentIdentity({ resource_id: 'resource-c' }), 'resource:resource-c')
assert.equal(policy.attachmentIdentity({ source_ref_id: 'source-d' }), 'source-ref:source-d')
assert.equal(policy.attachmentIdentity({ attachment_source_ref: { ref_id: 'ref-e' } }), 'attachment-ref:ref-e')
assert.equal(policy.attachmentIdentity({ filename: 'guess.md', size: 1 }), '')
const recent = policy.recentSessionFiles(events, 'session-a')
assert.equal(recent.length, 5)
assert.deepEqual(recent.map(item => item.filename), ['g.md', 'f.md', 'e.docx', 'd.csv', 'c.txt'])
assert.equal(policy.recentSessionFiles(events, 'session-b')[0].filename, 'foreign.md')
assert.deepEqual(policy.recentSessionFiles(events, ''), [])
assert.equal(policy.recentSessionFiles(events, 'session-a', 50).length, 7)
let activityCursor = policy.advanceKnowledgeChangeCursor(0, '19', {
  schema: 'knowledge_activity.v1', type: 'knowledge_change', project_id: '19', commit_seq: 4,
})
assert.deepEqual(activityCursor, { cursor: 4, changed: true })
activityCursor = policy.advanceKnowledgeChangeCursor(activityCursor.cursor, '19', {
  schema: 'knowledge_activity.v1', type: 'knowledge_change', project_id: '19', commit_seq: 4,
})
assert.deepEqual(activityCursor, { cursor: 4, changed: false })
assert.equal(policy.advanceKnowledgeChangeCursor(4, '19', {
  schema: 'knowledge_activity.v1', type: 'knowledge_change', project_id: '20', commit_seq: 5,
}).changed, false)

assert.equal(presentation.knowledgeChangeTitle({ seq: 4, reason: '调整规则' }), '调整规则')
assert.equal(presentation.knowledgeChangeTitle({ seq: 4, request_text: '录入规则' }), '录入规则')
assert.equal(presentation.knowledgeChangeTitle({ seq: 4 }), '提交 #4')
assert.equal(presentation.knowledgeChangeKindLabel('modify'), '修改')

for (const [file, source] of [[viewPath, viewSource], [railPath, railSource]]) {
  const parsed = parse(source, { filename: file })
  assert.deepEqual(parsed.errors, [])
}

assert.match(viewSource, /<ConversationInfoRail/)
assert.match(viewSource, /:changes="recentKnowledgeChanges"/)
assert.match(viewSource, /:files="recentSessionFiles"/)
assert.match(viewSource, /const recentSessionFiles = computed\(/)
assert.match(viewSource, /getKnowledgeCommits\(projectId, \{ limit: 5 \}\)/)
assert.match(viewSource, /knowledgeStatsProjectId\(projectValue\)/)
assert.match(viewSource, /let knowledgeActivityEpoch = 0/)
assert.match(viewSource, /knowledgeActivityAbort\?\.abort\(\)/)
assert.match(viewSource, /if \(epoch !== knowledgeActivityEpoch/)
assert.match(viewSource, /let sessionRequestEpoch = 0/)
assert.match(viewSource, /const epoch = \+\+sessionRequestEpoch[\s\S]*events\.value = \[\]/)
assert.match(viewSource, /if \(epoch !== sessionRequestEpoch[^)]*\) return/)
assert.match(viewSource, /void startKnowledgeActivity\(project\.id\)[\s\S]*await getVibeProjectByAsyncProject/)
assert.doesNotMatch(viewSource, /getKnowledgeCommit\(/)

assert.match(apiSource, /streamKnowledgeActivity[\s\S]*\/vibe\/foundation\/knowledge\/activity/)
assert.match(apiSource, /project_id:\s*project[\s\S]*after/)
assert.match(harnessSource, /signal\?: AbortSignal/)
assert.match(harnessSource, /signal,\s*\n\s*body:/)

assert.match(commitPanelSource, /knowledgeChangeTitle/)
assert.match(commitPanelSource, /knowledgeChangeKindLabel/)
assert.match(railSource, /knowledgeChangeTitle/)
assert.match(railSource, /knowledgeChangeKindLabel/)
assert.match(railSource, /aria-disabled="true"/)
assert.match(railSource, /M14 17H5/)
assert.match(railSource, /M19 7h-9/)
const railTemplate = parse(railSource, { filename: railPath }).descriptor.template?.content || ''
assert.doesNotMatch(railTemplate, /info-row[^>]*@click/)
assert.doesNotMatch(railTemplate, /<router-link|<a\s/)
assert.equal((railTemplate.match(/class="info-section"/g) || []).length, 2)
assert.doesNotMatch(railTemplate, /Trace|模型|知识状态|统计/)

console.log('vibe conversation info rail contract: PASS')
