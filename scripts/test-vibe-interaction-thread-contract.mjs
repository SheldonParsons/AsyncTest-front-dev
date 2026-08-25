import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const policyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/conversationThreadPolicy.ts')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')

function read(file) { return fs.readFileSync(file, 'utf8') }

async function importTs(file) {
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

const policy = await importTs(policyPath)
const events = [
  {
    id: 'preview-root', session_id: 'session-a', event_order: 1, role: 'assistant',
    content: '已生成待确认预览，请确认是否提交。', meta: {},
  },
  {
    id: 'confirmation-reply', session_id: 'session-a', event_order: 2, role: 'user',
    content: '确认修改', meta: { confirmation_reply: true, parent_event_id: 'preview-root' },
  },
  {
    id: 'completion-child', session_id: 'session-a', event_order: 3, role: 'assistant',
    content: '已完成这次修改。',
    meta: { continuation_context: { parent_event_id: 'preview-root' } },
  },
]

const previewRoot = events[0]
assert.equal(policy.isResolvedInteractionThreadRoot(events, previewRoot), true)
assert.equal(policy.parentContinuationResponses(events, previewRoot).length, 1)
assert.equal(policy.shouldRenderThreadEvent(events, previewRoot), true)
assert.equal(policy.shouldRenderThreadEvent(events, events[1]), false)
assert.equal(policy.shouldRenderThreadEvent(events, events[2]), false)

// Closed preview prose is not a final answer; the continuation completion is.
assert.equal(policy.threadFinalAnswerText(
  events,
  previewRoot,
  event => event.id === 'preview-root' ? '' : String(event.content || ''),
), '已完成这次修改。')

// A formally projected read answer from a compound request is still preserved.
assert.equal(policy.threadFinalAnswerText(
  events,
  previewRoot,
  event => event.id === 'preview-root' ? '维修状态标签为蓝色。' : String(event.content || ''),
), '维修状态标签为蓝色。\n\n已完成这次修改。')

const compactPreviewRoot = {
  ...previewRoot,
  turn: { schema: 'session_turn_public.v1', state: 'waiting_user' },
}
assert.equal(policy.resolvedInteractionRootAnswerText(
  compactPreviewRoot,
  ['已生成待确认预览，请确认是否提交。'],
), '')
assert.equal(policy.resolvedInteractionRootAnswerText({
  ...compactPreviewRoot,
  meta: { answer: { answer_text: '维修状态标签为蓝色。' } },
}, ['已生成待确认预览，请确认是否提交。']), '维修状态标签为蓝色。')
assert.equal(policy.resolvedInteractionRootAnswerText(
  previewRoot,
  ['维修状态标签为蓝色。'],
), '维修状态标签为蓝色。')

assert.equal(policy.isResolvedInteractionThreadRoot([
  previewRoot,
  events[2],
], previewRoot), false)
assert.equal(policy.isResolvedInteractionThreadRoot([
  previewRoot,
  { ...events[1], session_id: 'session-b' },
  events[2],
], previewRoot), false)

const viewSource = read(viewPath)
const view = parse(viewSource, { filename: viewPath })
assert.deepEqual(view.errors, [])
assert.match(viewSource, /v-if="isInteractionThreadRoot\(event\)"/)
assert.match(viewSource, /isResolvedInteractionThreadRoot\(events\.value, event\)/)
assert.match(viewSource, /threadNodeDisplayContent\(root, node\)/)
assert.doesNotMatch(viewSource, /isClarifyThreadRoot/)

console.log('vibe interaction thread contract: PASS')
