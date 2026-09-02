import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const indexSource = read('src/views/electron_views/vibe/knowledge/index.vue')
const chipsSource = read('src/views/electron_views/vibe/knowledge/components/SourceChips.vue')
const policySource = read('src/views/electron_views/vibe/knowledge/sourceCitationPolicy.ts')
const apiSource = read('src/views/electron_views/vibe/api.ts')

for (const [filename, source] of [
  ['knowledge/index.vue', indexSource],
  ['SourceChips.vue', chipsSource],
]) {
  assert.deepEqual(parse(source, { filename }).errors, [])
}

const compiledPolicy = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
  reportDiagnostics: true,
})
assert.deepEqual(compiledPolicy.diagnostics || [], [])
const policy = await import(`data:text/javascript;base64,${Buffer.from(compiledPolicy.outputText).toString('base64')}`)

const citation = policy.normalizeConversationSourceCitation({
  source_id: 'source-1',
  span_id: 'span-7',
  source_label: 'V1.2.0.md',
  source_location: '主播业绩目标 / 日期选择',
  source_preview: '验证日期选择控件',
  source_kind: 'file',
  mime_type: 'text/markdown',
  locator: { start_offset: 120, end_offset: 168 },
  text: '不得以内联正文进入来源列表',
}, 0)
assert.deepEqual(citation, {
  sourceId: 'source-1',
  spanId: 'span-7',
  label: 'V1.2.0.md',
  location: '主播业绩目标 / 日期选择',
  preview: '验证日期选择控件',
  sourceKind: 'file',
  mimeType: 'text/markdown',
  startOffset: 120,
  endOffset: 168,
  canOpen: true,
})
assert.equal(policy.sourceCitationViewerIdentity(citation), 'source:source-1:range:120:168')
assert.equal(policy.normalizeConversationSourceCitation({
  source_id: 'source-name-priority',
  display_name: '联系人规则.md',
  source_label: '来源',
  source_type: 'knowledge_source',
  locator: { start_offset: 0, end_offset: 10 },
}, 0).label, '联系人规则.md')
assert.equal(policy.normalizeConversationSourceCitation({
  source_id: 'source-type',
  display_name: '来源类型.md',
  source_type: 'knowledge_source',
}, 0).sourceKind, 'knowledge_source')

const compatible = policy.normalizeConversationSourceCitation({
  source_id: 'legacy-source',
  title: '',
  path: '模块 > legacy.md',
  snippet: '兼容旧引用摘要',
  locator: { start_offset: 0, end_offset: 24 },
}, 1)
assert.equal(compatible.label, 'legacy.md')
assert.equal(compatible.location, '模块 > legacy.md')
assert.equal(compatible.preview, '兼容旧引用摘要')
assert.equal(compatible.canOpen, true)

const incomplete = policy.normalizeConversationSourceCitation({ text: '整段原文' }, 2)
assert.equal(incomplete.label, '来源 3')
assert.equal(incomplete.preview, '')
assert.equal(incomplete.canOpen, false)
assert.equal(policy.sourceCitationViewerIdentity(incomplete), '')
assert.equal(policy.normalizeConversationSourceCitation({ id: 'span-only' }, 0).canOpen, false)
assert.equal(policy.normalizeConversationSourceCitation({
  source_ref_id: 'temporary-evidence',
  locator: { start_offset: 0, end_offset: 10 },
}, 0).canOpen, false)
assert.equal(policy.normalizeConversationSourceCitation({
  source_id: 'missing-range',
  display_name: '缺少区间',
}, 0).canOpen, true)
const wholeSource = policy.normalizeConversationSourceCitation({
  source_id: 'missing-range',
  display_name: '缺少区间',
}, 0)
assert.equal(policy.sourceCitationHasReadableRange(wholeSource), false)
assert.equal(policy.sourceCitationViewerIdentity(wholeSource), 'source:missing-range:whole')
const malformedRange = policy.normalizeConversationSourceCitation({
  source_id: 'malformed-range',
  display_name: '错误区间',
  locator: { start_offset: 20, end_offset: 10 },
}, 0)
assert.equal(malformedRange.canOpen, true)
assert.equal(policy.sourceCitationHasReadableRange(malformedRange), false)
assert.equal(policy.sourceCitationViewerIdentity(malformedRange), 'source:malformed-range:whole')
const unsupportedOffsetUnit = policy.normalizeConversationSourceCitation({
  source_id: 'unsupported-offset-unit',
  display_name: '未知偏移单位',
  locator: { start_offset: 0, end_offset: 10, offset_unit: 'utf8_byte' },
}, 0)
assert.equal(policy.sourceCitationHasReadableRange(unsupportedOffsetUnit), false)
assert.equal(policy.sourceCitationViewerIdentity(unsupportedOffsetUnit), 'source:unsupported-offset-unit:whole')

assert.match(chipsSource, /defineEmits<\{[\s\S]*'open-source'/)
assert.match(chipsSource, /class="src-card"[\s\S]*type="button"/)
assert.match(chipsSource, /emit\('open-source',\s*source\)/)
assert.match(chipsSource, /:disabled="!source\.canOpen"/)
assert.match(chipsSource, /:title="source\.canOpen/)
assert.match(chipsSource, /:aria-controls="sourceListId"/)
assert.match(chipsSource, /:id="sourceListId"/)
assert.match(chipsSource, /:focus-visible/)
assert.match(chipsSource, /\.src-card-head\s*\{[^}]*flex-wrap:\s*nowrap;[^}]*min-width:\s*0;/)
assert.match(chipsSource, /\.src-ttl\s*\{[^}]*flex:\s*1 1 0;[^}]*overflow:\s*hidden;[^}]*text-overflow:\s*ellipsis;[^}]*white-space:\s*nowrap;/)
assert.doesNotMatch(chipsSource, /src-open-icon/)
assert.doesNotMatch(chipsSource, /v-html|marked|DOMPurify|\.text\b|\.content\b/)

assert.equal((indexSource.match(/<SourceChips\b/g) || []).length, 8)
assert.equal((indexSource.match(/@open-source="openConversationSource"/g) || []).length, 8)
assert.match(indexSource, /function openConversationSource\(source:/)
assert.match(indexSource, /function openConversationSource\(source:[\s\S]*workspaceFocusAfterEnter = true/)
assert.match(indexSource, /sourceCitationHasReadableRange\(source\)[\s\S]*loadWorkspaceSourceFragment\([\s\S]*loadWorkspaceSessionSource\(/)
assert.match(indexSource, /sourceCitationViewerIdentity\(reference\)/)
assert.match(indexSource, /getVibeSessionSourceFragment\(/)
assert.match(indexSource, /getVibeSessionSource\(/)
assert.match(indexSource, /kind:\s*'knowledge-citation'/)
assert.equal((indexSource.match(/const source = payload\.source/g) || []).length, 2)
assert.match(indexSource, /content:\s*source\.text\s*\|\|\s*''/)
assert.doesNotMatch(indexSource, /content:\s*payload\.text/)
assert.match(indexSource, /function threadSources\([\s\S]*sourceCitationViewerIdentity\(normalized\)/)
assert.match(indexSource, /selectedTab\?\.kind === 'change'[\s\S]*selectedTab\.detail\?\.session_id/)
assert.doesNotMatch(indexSource, /getKnowledgeSource\(/)

assert.match(apiSource, /export interface VibeSessionSourceFragment/)
assert.match(apiSource, /export interface VibeSessionSourceFragmentResponse/)
assert.match(apiSource, /export interface VibeSessionSourceDetailResponse/)
assert.match(apiSource, /export function getVibeSessionSourceFragment\(/)
assert.match(apiSource, /export interface VibeSessionSourceDetail/)
assert.match(apiSource, /export function getVibeSessionSource\(/)
assert.match(apiSource, /\/sources\/\$\{encodeURIComponent\(sourceId\)\}\/fragment/)
assert.match(apiSource, /\/sources\/\$\{encodeURIComponent\(sourceId\)\}`/)
assert.match(apiSource, /start_offset/)
assert.match(apiSource, /end_offset/)
assert.match(apiSource, /source:\s*VibeSessionSourceFragment/)
assert.match(apiSource, /source:\s*VibeSessionSourceDetail/)

console.log('vibe source viewer contract: PASS')
