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

// Electron 本地 Provider 历史中的 tool result 和 assistant tool-call
// envelope 只能进入过程投影，不能各自冒充一条对话气泡。
const localToolEnvelope = {
  id: 'local-tool', session_id: 'session-local', event_order: 4, role: 'tool',
  content: '{"source_count":0}', meta: { local_agent: true, run_id: 'run-local' },
}
const localAssistantToolEnvelope = {
  id: 'local-assistant-tool', session_id: 'session-local', event_order: 5, role: 'assistant',
  content: '我先查看当前知识库。',
  meta: { local_agent: true, run_id: 'run-local', tool_calls: [{ id: 'call-local', name: 'get_knowledge_overview' }] },
}
const localAssistantFinal = {
  id: 'local-assistant-final', session_id: 'session-local', event_order: 6, role: 'assistant',
  content: '当前知识库为空。', meta: { local_agent: true, run_id: 'run-local', tool_calls: [] },
}
assert.equal(policy.shouldRenderThreadEvent([localToolEnvelope], localToolEnvelope), false)
assert.equal(policy.shouldRenderThreadEvent([localAssistantToolEnvelope], localAssistantToolEnvelope), false)
assert.equal(policy.shouldRenderThreadEvent([localAssistantFinal], localAssistantFinal), true)

// Electron 本地 journal 不依赖 Main 新增 thread_root 字段；同一 run_id 中
// interaction 之后的回答与最终 assistant 仍归到一个可恢复线程。
const localInteractionEvents = [
  {
    id: 'local-root', session_id: 'session-local', event_order: 10, role: 'assistant', content: '确认执行？',
    meta: { local_agent: true, run_id: 'run-local-thread', clarification: { question: '确认执行？' } },
  },
  {
    id: 'local-reply', session_id: 'session-local', event_order: 11, role: 'user', content: '确认执行',
    meta: { local_agent: true, run_id: 'run-local-thread', interaction_response: { action: 'apply' } },
  },
  {
    id: 'local-tool-after', session_id: 'session-local', event_order: 12, role: 'assistant', content: '继续处理',
    meta: { local_agent: true, run_id: 'run-local-thread', tool_calls: [{ id: 'call-after', name: 'read_knowledge' }] },
  },
  {
    id: 'local-final-after', session_id: 'session-local', event_order: 13, role: 'assistant', content: '已经完成。',
    meta: { local_agent: true, run_id: 'run-local-thread', tool_calls: [] },
  },
]
assert.equal(policy.interactionReplyParentEventId(localInteractionEvents, localInteractionEvents[1]), 'local-root')
assert.equal(policy.isResolvedInteractionThreadRoot(localInteractionEvents, localInteractionEvents[0]), true)
assert.deepEqual(policy.parentContinuationResponses(localInteractionEvents, localInteractionEvents[0]).map(event => event.id), ['local-final-after'])
assert.equal(policy.shouldRenderThreadEvent(localInteractionEvents, localInteractionEvents[1]), false)
assert.equal(policy.shouldRenderThreadEvent(localInteractionEvents, localInteractionEvents[3]), false)

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
assert.match(viewSource, /function localRunProcessSteps\(event: any\): ProcessStep\[\]/)
assert.match(viewSource, /const toolResults = new Map/)
assert.doesNotMatch(viewSource, /isClarifyThreadRoot/)

console.log('vibe interaction thread contract: PASS')
