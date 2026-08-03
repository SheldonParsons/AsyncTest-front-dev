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
const composerPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const markdownIconPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/icons/MarkdownFileIcon.vue')
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
const composerSource = read(composerPath)
const markdownIconSource = read(markdownIconPath)
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
assert.equal(presentation.formatKnowledgeChangeTime('2026-08-02T08:22:00Z'), '08/02 16:22')
assert.equal(presentation.formatKnowledgeChangeTime('2026-08-02T08:22:03Z', true), '2026/08/02 16:22:03')

for (const [file, source] of [
  [viewPath, viewSource],
  [railPath, railSource],
  [composerPath, composerSource],
  [markdownIconPath, markdownIconSource],
]) {
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
assert.equal((railSource.match(/class="view-all"/g) || []).length, 2)
assert.doesNotMatch(railSource, /aria-disabled="true"/)
assert.match(railSource, /function showComingSoon\(\): void\s*\{\s*window\.\$toast\(\{ title: '开发中，敬请期待' \}\)\s*\}/)
assert.match(railSource, /v-for="file in files\.slice\(0, 5\)"/)
assert.doesNotMatch(railSource, /change-dot/)
assert.match(railSource, /\.knowledge-row strong\s*\{[\s\S]*font-size:\s*13px;/)
assert.match(railSource, /\.knowledge-row small\s*\{[\s\S]*font-size:\s*11px;/)
assert.match(railSource, /\.view-all:hover\s*\{[\s\S]*background:/)
assert.match(railSource, /\.view-all\s*\{[\s\S]*border-radius:[\s\S]*cursor:\s*pointer;/)
assert.match(railSource, /\.info-row\s*\{[\s\S]*cursor:\s*pointer;/)
assert.match(railSource, /\.info-row:hover\s*\{[\s\S]*background:/)
assert.match(railSource, /import MarkdownFileIcon from '.\/icons\/MarkdownFileIcon\.vue'/)
assert.match(composerSource, /import MarkdownFileIcon from '.\/icons\/MarkdownFileIcon\.vue'/)
assert.match(railSource, /<MarkdownFileIcon/)
assert.match(composerSource, /<MarkdownFileIcon/)
assert.match(composerSource, /\.send-button\s*\{[\s\S]*width:\s*28px;[\s\S]*height:\s*28px;/)
assert.match(composerSource, /\.send-button:disabled\s*\{[\s\S]*color:\s*#fff;[\s\S]*background:\s*#9b9d9f;/)
assert.match(composerSource, /\.send-button:not\(\.is-sending\) \.send-arrow-shape\s*\{[\s\S]*transform:\s*scale\(1\.05\);/)
assert.match(composerSource, /class="lucide lucide-plus-icon lucide-plus attach-plus-icon"/)
assert.match(composerSource, /stroke-width="1\.4"/)
assert.match(composerSource, /d="M5 12h14"/)
assert.match(composerSource, /d="M12 5v14"/)
assert.doesNotMatch(composerSource, /file-upload-rise|upload-file|upload-pin|cc-upfile|cc-uppin/)
assert.match(composerSource, /\.attach-button\s*\{[^}]*display:\s*inline-flex;[^}]*align-items:\s*center;[^}]*justify-content:\s*center;[^}]*padding:\s*0;[^}]*line-height:\s*0;/)
assert.match(composerSource, /\.attach-plus-icon\s*\{[^}]*display:\s*block;[^}]*width:\s*17px;[^}]*height:\s*17px;[^}]*margin:\s*0;/)
assert.match(composerSource, /const contentWidth = Math\.ceil\(label\.scrollWidth\) \+ 56/)
assert.match(composerSource, /\.model-picker\s*\{[\s\S]*position:\s*relative;[\s\S]*padding:\s*0 28px;/)
assert.match(composerSource, /\.model-picker-label\s*\{[\s\S]*text-align:\s*center;/)
assert.match(composerSource, /\.model-picker-chevron\s*\{[\s\S]*position:\s*absolute;[\s\S]*right:\s*10px;[\s\S]*transform:\s*translateY\(-50%\);/)
assert.match(railSource, /function fileTypeLabel\(file: RecentSessionFile\): string/)
assert.match(railSource, /mime\.includes\('markdown'\)[\s\S]*return 'MD'/)
assert.match(railSource, /fileTypeLabel\(file\),[\s\S]*sizeLabel\(file\.size\)/)
assert.match(viewSource, /M14 17H5/)
assert.match(viewSource, /M19 7h-9/)
assert.match(viewSource, /class="window-actions"/)
assert.match(viewSource, /class="info-rail-toggle"/)
assert.match(viewSource, /const showWinControls = computed\(\(\) => !!window\.electronAPI && !isMacPlatform\)/)
assert.match(viewSource, /\.window-actions\s*\{[\s\S]*display:\s*flex/)
assert.match(viewSource, /\.window-actions\s*\{[\s\S]*left:\s*8px;[\s\S]*right:\s*auto;/)
assert.match(viewSource, /\.side-toggle\s*\{[\s\S]*left:\s*98px;/)
assert.match(viewSource, /\.side-toggle\.mac\s*\{[\s\S]*left:\s*72px;/)
assert.match(viewSource, /\.window-drag\s*\{[\s\S]*z-index:\s*10;/)
assert.match(viewSource, /class="window-drag"\s*:class="\{ 'reserve-info-toggle': currentView === 'conversation', 'workspace-open': workspaceWindowOpen \}"/)
assert.match(viewSource, /\.window-drag\.reserve-info-toggle\s*\{[\s\S]*right:\s*56px;/)
assert.match(viewSource, /\.window-drag\.reserve-info-toggle\.workspace-open\s*\{[^}]*right:\s*calc\(min\(62vw,\s*1040px\) \+ 56px\);/)
assert.match(viewSource, /\.main-head\s*\{[\s\S]*z-index:\s*21;[\s\S]*pointer-events:\s*none;/)
assert.match(viewSource, /\.info-rail-toggle\s*\{[\s\S]*pointer-events:\s*auto;[\s\S]*-webkit-app-region:\s*no-drag;/)
assert.match(viewSource, /\.main-frame\s*\{[\s\S]*?z-index:\s*auto;[\s\S]*?display:\s*flex/)
assert.match(viewSource, /\.main\s*\{[\s\S]*flex-direction:\s*row/)
assert.match(viewSource, /--vibe-sidebar-bg:\s*rgb\(252,\s*252,\s*252\);/)
assert.match(viewSource, /--vibe-conversation-bg:\s*rgb\(255,\s*255,\s*255\);/)
assert.match(viewSource, /\.side\s*\{[^}]*background:\s*var\(--vibe-sidebar-bg\);/)
assert.match(viewSource, /\.main-frame\s*\{[^}]*background:\s*var\(--vibe-conversation-bg\);/)
assert.match(viewSource, /\.side::after\s*\{[^}]*right:\s*0;[^}]*width:\s*8px;[^}]*background:\s*linear-gradient\(\s*to left,\s*rgba\(15,\s*15,\s*15,\s*0\.05\) 0%,\s*rgba\(15,\s*15,\s*15,\s*0\.014\) 45%,\s*rgba\(15,\s*15,\s*15,\s*0\) 100%\s*\);/)
assert.match(viewSource, /\.side-collapsed \.side::after\s*\{[^}]*opacity:\s*0;/)
assert.doesNotMatch(viewSource, /\.side::after\s*\{[^}]*box-shadow:/)
assert.match(viewSource, /\.main\s*\{[^}]*background:\s*var\(--vibe-conversation-bg\);/)
assert.match(viewSource, /<el-avatar\s+:size="24"/)
assert.match(viewSource, /\.side-user-card\s*\{[^}]*width:\s*calc\(100% \+ 24px\);[^}]*min-height:\s*52px;[^}]*margin:\s*0 -12px -12px;[^}]*border-top:\s*1px solid var\(--hairline\);[^}]*border-radius:\s*0;[^}]*background:\s*var\(--vibe-sidebar-bg\);/)
assert.match(viewSource, /\.side-user-card:hover\s*\{[^}]*background:\s*var\(--vibe-sidebar-bg\);/)
assert.doesNotMatch(viewSource, /\.side-user-card:hover\s*\{[^}]*box-shadow:/)
assert.match(viewSource, /\.side-user-profile\s*\{[^}]*border-radius:\s*12px;[^}]*padding:\s*6px 9px;/)
assert.match(viewSource, /\.side-user-profile:hover\s*\{[^}]*background:\s*var\(--fill-1\);/)
assert.match(viewSource, /\.side-user-avatar\.avatar-container\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;/)
assert.doesNotMatch(viewSource, /\.side-user-profile:hover \.side-user-avatar \.user-avatar/)
assert.match(viewSource, /\.side-user-kb\s*\{[^}]*color:\s*#8f8f8f;/)
assert.match(viewSource, /\.side-user-kb:hover:not\(:disabled\)\s*\{[^}]*background:\s*var\(--fill-1\);[^}]*color:\s*#777;/)
assert.match(viewSource, /class="lucide lucide-library-icon lucide-library"/)
assert.match(viewSource, /<path d="m16 6 4 14"\/>/)
assert.match(viewSource, /<path d="M12 6v14"\/>/)
assert.match(viewSource, /<path d="M8 8v12"\/>/)
assert.match(viewSource, /<path d="M4 4v16"\/>/)
assert.match(viewSource, /\.session-open\s*\{[^}]*min-height:\s*32px;[^}]*border-radius:\s*12px;/)
assert.match(viewSource, /\.session-row\s*\{[\s\S]*?&:hover \.session-open,\s*\n\s*&:focus-within \.session-open,\s*\n\s*&\.active \.session-open\s*\{[^}]*background:\s*rgba\(15,\s*15,\s*15,\s*0\.055\);[^}]*box-shadow:\s*none;/)
assert.match(viewSource, /&:hover \.session-title,\s*\n\s*&:focus-within \.session-title,\s*\n\s*&\.active \.session-title\s*\{[^}]*color:\s*var\(--ink-1\);/)
assert.doesNotMatch(viewSource, /\.session-row\s*\{[\s\S]*?&\.active \.session-open\s*\{[^}]*background:\s*#fff;/)
assert.match(viewSource, /\.main-conversation-pane\s*\{[^}]*background-color:\s*var\(--vibe-conversation-bg\);/)
assert.match(viewSource, /\.main-head\s*\{[\s\S]*?background:\s*var\(--vibe-conversation-bg\);/)
assert.match(viewSource, /linear-gradient\(to bottom,\s*rgb\(255,\s*255,\s*255\),\s*rgba\(255,\s*255,\s*255,\s*0\)\)/)
assert.match(viewSource, /\.conversation\s*\{[^}]*background:\s*var\(--vibe-conversation-bg\);/)
assert.match(viewSource, /\.timeline\s*\{[^}]*background-color:\s*var\(--vibe-conversation-bg\);/)
assert.doesNotMatch(viewSource, /\.vibe-shell\s*>\s*\.main-frame\s*>\s*\.main\s*\{[^}]*rgb\(252,\s*252,\s*252\)/)
assert.match(viewSource, /class="main-conversation-pane"/)
assert.match(viewSource, /<\/footer>\s*<\/section>\s*<\/div>\s*<ConversationInfoRail[\s\S]*?<\/section>\s*<\/section>/)
assert.match(railSource, /border-radius:\s*22px/)
assert.match(railSource, /box-shadow:/)
assert.match(railSource, /flex:\s*0 0 324px/)
assert.match(railSource, /align-self:\s*flex-start/)
assert.match(railSource, /height:\s*auto/)
assert.match(railSource, /max-height:\s*clamp\(280px,\s*50%,\s*520px\)/)
assert.match(railSource, /class="info-section knowledge-section"/)
assert.match(railSource, /\.info-section h2\s*\{[\s\S]*color:\s*#8f8f8f;[\s\S]*font-size:\s*14px;[\s\S]*font-weight:\s*600;/)
assert.match(railSource, /\.conversation-info-rail\.collapsed\s*\{[\s\S]*flex-basis:\s*0/)
assert.match(viewSource, /\.main\.workspace-open :deep\(\.conversation-info-rail\)\s*\{[^}]*position:\s*absolute;[^}]*right:\s*calc\(min\(62%,\s*1040px\) \+ 10px\);[^}]*flex:\s*none;[^}]*width:\s*min\(324px,\s*calc\(100% - min\(62%,\s*1040px\) - 20px\)\);/)
const viewTemplate = parse(viewSource, { filename: viewPath }).descriptor.template?.content || ''
const sideStart = viewTemplate.indexOf('<aside class="side">')
const globalWindowHeader = viewTemplate.slice(0, sideStart)
assert.match(globalWindowHeader, /<VibeWindowControls/)
assert.doesNotMatch(globalWindowHeader, /info-rail-toggle/)
const mainHeadClassIndex = viewTemplate.indexOf('class="main-head"')
const mainHeadStart = viewTemplate.lastIndexOf('<header', mainHeadClassIndex)
const mainHeadEnd = viewTemplate.indexOf('</header>', mainHeadStart)
const mainHeadTemplate = viewTemplate.slice(mainHeadStart, mainHeadEnd)
assert.match(mainHeadTemplate, /class="info-rail-toggle"/)
const conversationPaneStart = viewTemplate.indexOf('<div class="main-conversation-pane">')
const conversationStart = viewTemplate.indexOf('<section v-if="currentView === \'conversation\'" class="conversation">')
assert.ok(mainHeadStart >= 0 && mainHeadEnd < conversationPaneStart && conversationPaneStart < conversationStart, 'Settings2 header must stay anchored to the whole main content area and not move with info rail width')
const railTemplate = parse(railSource, { filename: railPath }).descriptor.template?.content || ''
assert.equal((railTemplate.match(/@click="showComingSoon"/g) || []).length, 4)
assert.equal((railTemplate.match(/class="view-all"[^>]*@click="showComingSoon"/g) || []).length, 2)
assert.match(railTemplate, /<button\s+v-for="item in changes"[^>]*class="info-row knowledge-row"[^>]*type="button"[^>]*@click="showComingSoon"/)
assert.match(railTemplate, /<button\s+v-for="file in files\.slice\(0, 5\)"[^>]*class="info-row file-row"[^>]*type="button"[^>]*@click="showComingSoon"/)
assert.doesNotMatch(railTemplate, /<router-link|<a\s/)
assert.doesNotMatch(railSource, /router\.push|useRouter|href=/)
assert.doesNotMatch(railTemplate, /info-rail-toggle|M14 17H5|M19 7h-9/)
assert.equal((railTemplate.match(/class="info-section(?: knowledge-section)?"/g) || []).length, 2)
assert.doesNotMatch(railTemplate, /Trace|模型|知识状态|统计/)

console.log('vibe conversation info rail contract: PASS')
