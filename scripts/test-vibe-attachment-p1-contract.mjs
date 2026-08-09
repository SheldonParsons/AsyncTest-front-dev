import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const resourceContractPath = path.join(root, 'src/views/electron_views/vibe/attachmentResourceContract.ts')
const threadPolicyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/conversationThreadPolicy.ts')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const composerPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const apiPath = path.join(root, 'src/views/electron_views/vibe/api.ts')
const harnessPath = path.join(root, 'src/api/harness.ts')
const fixturePath = path.join(root, 'scripts/fixtures/vibe-attachment-resource-p1-contract-v1.json')
const brokenContinuationFixturePath = path.join(root, 'scripts/fixtures/vibe-confirmation-thread-broken-continuation-v1.json')

function read(file) { return fs.readFileSync(file, 'utf8') }
function importTs(file) {
  const result = ts.transpileModule(read(file), {
    compilerOptions: {
      module: ts.ModuleKind.ES2022,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    reportDiagnostics: true,
  })
  assert.deepEqual(result.diagnostics || [], [])
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`)
}

const contract = JSON.parse(read(fixturePath))
const resourceContractSource = read(resourceContractPath)
const resourceContract = await importTs(resourceContractPath)
const threadPolicy = await importTs(threadPolicyPath)
const viewSource = read(viewPath)
const composerSource = read(composerPath)
const apiSource = read(apiPath)
const harnessSource = read(harnessPath)
const brokenContinuation = JSON.parse(read(brokenContinuationFixturePath))

assert.equal(contract.schema, 'vibe_attachment_p1_contract.v1')
assert.equal(contract.p1_resource_ref.implemented, true)
assert.equal(contract.p1_resource_ref.schema, 'attachment_resource_ref.v1')
assert.deepEqual(contract.p1_resource_ref.turn_payload_must_not_include, ['content', 'text'])
assert.equal(contract.upload.path, '/vibe/sessions/{session_id}/attachments')
assert.equal(contract.upload.multipart_file_field, 'file')
assert.equal(contract.upload.idempotency_header, 'Idempotency-Key')
assert.equal(contract.upload.expires_at_type, 'string|null')
assert.equal(contract.turn.rollback_uploaded_pending_on_batch_failure, true)
assert.equal(contract.turn.retain_selection_until_user_event_bound, true)
assert.equal(contract.turn.rollback_pending_when_user_event_not_bound, true)

// P1 上传完成后的引用必须是封闭的版本化合同，不能退回任意 VibeAttachment。
assert.match(resourceContractSource, /export interface VibeAttachmentResourceRef\s*{[\s\S]*schema:\s*'attachment_resource_ref\.v1'[\s\S]*resource_id:\s*string[\s\S]*filename:\s*string[\s\S]*mime:\s*string[\s\S]*size:\s*number[\s\S]*chars:\s*number[\s\S]*content_sha256:\s*string[\s\S]*download_url:\s*string[\s\S]*}/)
assert.match(apiSource, /attachments\?:\s*VibeAttachmentResourceRef\[\]/)
const projected = resourceContract.normalizeAttachmentResourceRef({
  schema: 'attachment_resource_ref.v1',
  resource_id: 'resource-1',
  filename: 'facts.md',
  mime: 'text/markdown',
  size: 12,
  chars: 8,
  content_sha256: 'a'.repeat(64),
  download_url: '/vibe/sessions/session-1/attachments/resource-1',
  content: '正文绝不能进入 turn',
  text: '正文绝不能进入 turn',
  internal_owner_id: 99,
})
assert.deepEqual(projected, {
  schema: 'attachment_resource_ref.v1',
  resource_id: 'resource-1',
  filename: 'facts.md',
  mime: 'text/markdown',
  size: 12,
  chars: 8,
  content_sha256: 'a'.repeat(64),
  download_url: '/vibe/sessions/session-1/attachments/resource-1',
})
assert.throws(() => resourceContract.normalizeAttachmentResourceRef({ schema: 'attachment_resource_ref.v1' }))

// macOS / Electron 可能把合法 .md 报成 text/x-markdown 或 application/octet-stream。
// 上传边界必须按受支持后缀收口声明 MIME；原始字节仍交由后端做严格 UTF-8 / 二进制嗅探。
assert.equal(resourceContract.canonicalAttachmentUploadMime('canary.md', 'text/x-markdown'), 'text/markdown')
assert.equal(resourceContract.canonicalAttachmentUploadMime('/tmp/canary.md', 'application/octet-stream'), 'text/markdown')
assert.equal(resourceContract.canonicalAttachmentUploadMime('notes.markdown', ''), 'text/markdown')
assert.equal(resourceContract.canonicalAttachmentUploadMime('notes.txt', 'application/octet-stream'), 'text/plain')
assert.throws(() => resourceContract.canonicalAttachmentUploadMime('renamed.pdf', 'application/pdf'))

// 选择的 File 必须先上传换取资源引用；浏览器不再读正文或把正文塞进 turn JSON。
assert.match(harnessSource, /export async function harnessMultipartRequest/)
assert.match(apiSource, /formData\.append\('file', uploadBody/)
assert.match(apiSource, /canonicalAttachmentUploadMime\(file\.name, file\.type\)/)
assert.match(apiSource, /file\.slice\(0, file\.size, canonicalMime\)/)
assert.match(apiSource, /`\/vibe\/sessions\/\$\{encodeURIComponent\(sessionId\)\}\/attachments`/)
assert.match(apiSource, /'Idempotency-Key': idempotencyKey/)
assert.match(apiSource, /normalizeAttachmentResourceRef\(response\.resource\)/)
assert.match(apiSource, /expires_at:\s*string \| null/)
assert.match(apiSource, /response\.expires_at !== null/)
assert.match(apiSource, /deleteVibeAttachmentResource[\s\S]*\/attachments\/\$\{encodeURIComponent\(resourceId\)\}/)
assert.doesNotMatch(apiSource, /payload:\s*{[^\n]*document\?:/)
assert.match(viewSource, /await\s+uploadVibeAttachmentResource\(/)
assert.match(viewSource, /await\s+deleteVibeAttachmentResource\(/)
assert.match(viewSource, /const turnOutcome = await sendFoundationTurn\(/)
// emit 同步交出 File[] 副本后立即清空视觉选择；event_saved 只决定失败时是否恢复。
assert.match(viewSource, /onUserEventSaved\?:\s*\(\)\s*=>\s*void/)
assert.match(viewSource, /case 'event_saved':[\s\S]*event\.role === 'user'[\s\S]*userEventSaved = true[\s\S]*opts\?\.onUserEventSaved\?\.\(\)/)
assert.match(composerSource, /const outgoingFiles = \[\.\.\.selectedFiles\.value][\s\S]*emit\('send', \{ text: props\.modelValue, files: outgoingFiles }\)[\s\S]*clearAttachments\(\)/)
assert.match(composerSource, /function restoreAttachments\(files: File\[\]\)[\s\S]*admitAttachmentSelection\(\[\], files\)[\s\S]*selectedFiles\.value = admission\.files/)
assert.match(composerSource, /defineExpose\(\{[^}]*clearAttachments[^}]*restoreAttachments[^}]*focusInput[^}]*}\)/)
assert.match(viewSource, /let attachmentBound = false[\s\S]*onUserEventSaved:\s*\(\)\s*=>\s*{[\s\S]*attachmentBound = true[\s\S]*}\)/)
assert.doesNotMatch(viewSource, /onUserEventSaved:\s*\(\)\s*=>\s*{[\s\S]{0,120}clearAttachments\(\)/)
assert.match(viewSource, /function restoreComposerAttachments\(files: File\[\]\)[\s\S]*nextTick\(\(\) => composerRef\.value\?\.restoreAttachments\(snapshot\)\)/)
assert.match(viewSource, /catch \(reason\) {[\s\S]*restoreComposerAttachments\(fileList\)[\s\S]*cleanupUploadedPendingAttachments\(uploadSessionId, uploaded\)/)
assert.match(viewSource, /if \(attachmentBound \|\| turnOutcome\?\.userEventSaved\) return[\s\S]*restoreComposerAttachments\(fileList\)[\s\S]*cleanupUploadedPendingAttachments\(/)
assert.doesNotMatch(viewSource, /file\.text\(\)/)
assert.doesNotMatch(viewSource, /documentContent/)
assert.doesNotMatch(viewSource, /content,\s*\n\s*text:\s*content/)

// 上传阶段不再在输入框下方显示文案，但保留 aria-busy / live-region 语义。
assert.doesNotMatch(viewSource, /if \(preparingSend\.value\) return '正在上传附件…'/)
assert.match(viewSource, /:uploading="preparingSend"/)
assert.match(composerSource, /aria-busy[\s\S]*role="status"[\s\S]*正在上传附件/)

// 存量异常失败回执漏 continuation_context：只允许从紧邻 confirmation_reply 推导线程归属。
assert.equal(brokenContinuation.schema, 'vibe_confirmation_thread_broken_continuation.v1')
const brokenEvents = brokenContinuation.events
const brokenRoot = brokenEvents.find(event => event.id === brokenContinuation.expected.thread_root_id)
const brokenFailure = brokenEvents.find(event => event.id === brokenContinuation.expected.inferred_continuation_id)
assert.equal(
  threadPolicy.continuationParentEventId(brokenEvents, brokenFailure),
  brokenContinuation.expected.thread_root_id,
)
assert.equal(threadPolicy.parentContinuationResponses(brokenEvents, brokenRoot).length, 1)
assert.equal(
  threadPolicy.threadFinalAnswerText(brokenEvents, brokenRoot, event => String(event.content || '')),
  brokenContinuation.expected.thread_final_answer,
)
const visibleAssistants = brokenEvents.filter(event =>
  event.role === 'assistant' && threadPolicy.shouldRenderThreadEvent(brokenEvents, event))
assert.equal(visibleAssistants.length, brokenContinuation.expected.visible_assistant_count)
const emptyStandaloneActions = visibleAssistants.filter(event =>
  threadPolicy.shouldRenderStandaloneAssistantBody(event, Boolean(String(event.content || '').trim())))
assert.equal(emptyStandaloneActions.length, brokenContinuation.expected.empty_standalone_action_count)

// 未来后端恢复显式 continuation_context 后，显式身份必须优先于邻接推断。
const explicitParent = 'explicit-root-id'
assert.equal(threadPolicy.continuationParentEventId([
  ...brokenEvents,
  { id: explicitParent, event_order: 0, role: 'assistant', content: '显式根', meta: {} },
], {
  ...brokenFailure,
  meta: { ...brokenFailure.meta, continuation_context: { parent_event_id: explicitParent } },
}), explicitParent)
assert.match(viewSource, /shouldRenderStandaloneAssistantAnswer\(event\)/)
assert.doesNotMatch(viewSource, /v-else-if="!isPendingClarification\(event\) \|\| eventHasAnswerContent\(event\)"/)

// 历史 inline 事件仍可下载：优先鉴权 download_url，失败再用 content/text 兜底。
assert.match(apiSource, /export interface VibeAttachment[\s\S]*content\?: string[\s\S]*text\?: string[\s\S]*download_url\?: string/)
assert.match(apiSource, /downloadVibeSessionEventAttachment[\s\S]*\/events\/\$\{encodeURIComponent\(eventId\)\}\/attachments\/\$\{index\}/)
assert.match(viewSource, /const url = String\(file\?\.download_url \|\| ''\)\.trim\(\)/)
assert.match(viewSource, /const content = String\(file\?\.content \?\? file\?\.text \?\? ''\)/)

console.log('vibe attachment P1 contract: PASS')
