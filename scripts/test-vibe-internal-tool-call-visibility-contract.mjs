import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const protocolPath = path.join(root, 'src/views/electron_views/vibe/knowledge/composables/turnProtocol.ts')

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

const protocol = await importTs(protocolPath)
const turnId = 'turn-tool-visibility'

function itemEvent(eventId, sequence, item) {
  return {
    schema_version: 2,
    event_id: eventId,
    turn_id: turnId,
    sequence,
    event_type: 'item_added',
    payload: {},
    item: {
      schema_version: 2,
      turn_id: turnId,
      phase: 'commentary',
      parent_id: null,
      ...item,
    },
  }
}

const rawCallId = 'call_00_kvwXHhPMfJtkgQl1NXX87663'
const historicalCallId = 'call_legacyRawProviderId998877'
const typedCallId = 'call_00_formalTypedAction998877'
const typeOnlyCallId = 'call_00_formalTypeOnly112233'
const events = [
  {
    schema_version: 2,
    event_id: 'evt-started',
    turn_id: turnId,
    sequence: 1,
    event_type: 'started',
    payload: {},
  },
  itemEvent('evt-narration', 2, {
    item_id: 'item-narration',
    item_type: 'runtime_progress',
    content: '正在读取正式资料。',
    payload: { phase: 'runtime_progress', complete: true },
  }),
  // 新事件形态：孤立 action_done 把 provider call ID 同时写进 title/content。
  itemEvent('evt-orphan-current', 3, {
    item_id: 'item-orphan-current',
    item_type: 'tool_call',
    content: rawCallId,
    payload: {
      legacy_type: 'process_action_done',
      action_id: rawCallId,
      action_type: 'action',
      code: 'process_action_done',
      title: rawCallId,
      status: 'success',
      details: { internal_audit: true },
    },
  }),
  // 旧历史形态：没有 title/type，只有 content 中的 provider call ID。
  itemEvent('evt-orphan-history', 4, {
    item_id: 'item-orphan-history',
    item_type: 'tool_call',
    content: historicalCallId,
    payload: {
      action_id: historicalCallId,
      status: 'unknown',
    },
  }),
  itemEvent('evt-formal-action', 5, {
    item_id: 'item-formal-action',
    item_type: 'tool_call',
    content: '查找现行知识',
    payload: {
      action_id: typedCallId,
      action_type: 'knowledge_retrieval',
      title: '查找现行知识',
      status: 'success',
    },
  }),
  // 即使标题仍带内部 ID，只要后端给出正式 typed action，也必须保留。
  itemEvent('evt-formal-type-only', 6, {
    item_id: 'item-formal-type-only',
    item_type: 'tool_call',
    content: typeOnlyCallId,
    payload: {
      action_id: typeOnlyCallId,
      action_type: 'attachment_read',
      title: typeOnlyCallId,
      status: 'success',
    },
  }),
  itemEvent('evt-answer', 7, {
    item_id: 'item-answer',
    item_type: 'assistant_message',
    phase: 'final_answer',
    content: '这是正式答案。',
    payload: { complete: true },
  }),
  itemEvent('evt-sources', 8, {
    item_id: 'item-sources',
    item_type: 'tool_result',
    content: '',
    payload: {
      legacy_type: 'sources',
      items: [{ ref_id: 'source-1', title: '正式来源' }],
    },
  }),
  {
    schema_version: 2,
    event_id: 'evt-completed',
    turn_id: turnId,
    sequence: 9,
    event_type: 'completed',
    payload: {},
  },
]

function visibleSnapshot(model) {
  return {
    content: model.content,
    sources: model.sources,
    process: model.process.map(step => step.kind === 'action'
      ? { kind: step.kind, title: step.title, actionType: step.actionType }
      : { kind: step.kind, text: step.text }),
  }
}

const liveState = protocol.createTurnProtocolState()
let liveModel
for (const event of events) {
  liveModel = protocol.applyTurnProtocolEvents(liveState, [event])
}
assert.ok(liveModel)
assert.equal(liveState.events.has('evt-orphan-current'), true, 'raw audit event must remain in canonical state')
assert.equal(liveState.events.has('evt-orphan-history'), true, 'historical raw event must remain in canonical state')

const liveActions = liveModel.process.filter(step => step.kind === 'action')
assert.deepEqual(liveActions.map(step => step.title), ['查找现行知识', typeOnlyCallId])
assert.equal(liveActions.some(step => step.title === rawCallId), false)
assert.equal(liveActions.some(step => step.title === historicalCallId), false)
assert.equal(liveModel.process.some(step => step.kind === 'message' && step.text === '正在读取正式资料。'), true)
assert.equal(liveModel.content, '这是正式答案。')
assert.deepEqual(liveModel.sources, [{ ref_id: 'source-1', title: '正式来源' }])

const replayModel = protocol.replayTurnProtocol(events)
const historyModel = protocol.readTurnProtocolFromMeta({ turn_protocol: { events } })
assert.ok(historyModel)
assert.deepEqual(visibleSnapshot(replayModel), visibleSnapshot(liveModel), 'live and replay must share one display rule')
assert.deepEqual(visibleSnapshot(historyModel), visibleSnapshot(liveModel), 'historical meta must share one display rule')

const protocolSource = read(protocolPath)
assert.match(protocolSource, /PROVIDER_TOOL_CALL_ID/)
assert.match(protocolSource, /if \(isInternalOrphanToolCall\(content, payload\)\) continue/)
assert.doesNotMatch(protocolSource, /continue_evidence_reading|kvwXHhPMfJtkgQl1NXX87663|ACTION_META/)

console.log('vibe internal tool call visibility contract: PASS')
