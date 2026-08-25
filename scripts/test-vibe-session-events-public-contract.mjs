import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const protocolPath = path.join(
  root,
  'src/views/electron_views/vibe/knowledge/composables/turnProtocol.ts',
)
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

const protocol = await importTs(protocolPath)

const completed = {
  id: 'assistant-turn-compact',
  session_id: 'session-compact',
  role: 'assistant',
  content: '维修标签是蓝色。',
  attachments: [],
  event_order: 2,
  created_at: '2026-08-25T06:00:02Z',
  turn_id: 'turn-compact',
  turn: {
    schema: 'session_turn_public.v1',
    latest_sequence: 36,
    state: 'succeeded',
    terminal: 'completed',
    duration_ms: 14279,
    write_commit_count: 1,
  },
  meta: {
    process: [
      { kind: 'message', text: '正在查找资料。' },
      {
        kind: 'action', title: '查找现行知识', status: 'success',
        summary: '已找到 1 条来源', stats: { source_count: 1 },
      },
    ],
    process_summary: { summary: '处理完成', stats: { source_count: 1 } },
    sources: [{ source_label: 'guide.md', source_location: '维修标签' }],
    verification: { checked: true, clean: true, issues: [] },
  },
}

const model = protocol.readSessionTurnPublic(completed)
assert.ok(model)
assert.equal(model.turnId, 'turn-compact')
assert.equal(model.state, 'succeeded')
assert.equal(model.terminal, 'completed')
assert.equal(model.content, '维修标签是蓝色。')
assert.deepEqual(model.answers, ['维修标签是蓝色。'])
assert.equal(model.process.length, 2)
assert.equal(model.process[0].kind, 'message')
assert.equal(model.process[1].kind, 'action')
assert.equal(model.processSummary.duration_ms, 14279)
assert.equal(model.sources.length, 1)
assert.equal(model.verification.clean, true)
assert.equal(model.writeCommits.length, 1)
assert.equal(protocol.readSessionTurnPublic(completed), model, 'same projection should reuse its read model')

const failed = {
  ...completed,
  id: 'assistant-turn-failed',
  content: 'private provider exception must not become an answer',
  turn_id: 'turn-failed',
  turn: {
    schema: 'session_turn_public.v1',
    latest_sequence: 7,
    state: 'failed',
    terminal: 'failed',
    outcome: { kind: 'failed', code: 'turn_failed', partial: false },
  },
  meta: {},
}
const failedModel = protocol.readSessionTurnPublic(failed)
assert.ok(failedModel)
assert.equal(failedModel.content, '')
assert.deepEqual(failedModel.answers, [])
assert.equal(failedModel.outcome.kind, 'failed')
assert.equal(failedModel.outcome.title, '本轮处理失败')
assert.equal(failedModel.outcome.detail, '')
assert.equal(failedModel.outcome.partial, false)

assert.equal(protocol.readSessionTurnPublic({
  ...failed,
  turn: { ...failed.turn, outcome: { ...failed.turn.outcome, code: 'provider_raw' } },
}), null, 'unknown outcome codes must fail closed')
assert.equal(protocol.readSessionTurnPublic({
  ...completed,
  turn: { ...completed.turn, latest_sequence: 0 },
}), null, 'invalid canonical revisions must fail closed')

const legacyEvents = [
  {
    event_id: 'legacy-started', turn_id: 'legacy-turn', sequence: 1,
    event_type: 'started', payload: {},
  },
  {
    event_id: 'legacy-answer', turn_id: 'legacy-turn', sequence: 2,
    event_type: 'item_added', payload: {},
    item: {
      item_id: 'legacy-answer-item', item_type: 'assistant_message',
      content: '旧历史回答', payload: {},
    },
  },
  {
    event_id: 'legacy-completed', turn_id: 'legacy-turn', sequence: 3,
    event_type: 'completed', payload: {},
  },
]
const legacyModel = protocol.readTurnProtocolFromMeta({
  turn_protocol: { events: legacyEvents },
})
assert.ok(legacyModel)
assert.equal(legacyModel.turnId, 'legacy-turn')
assert.equal(legacyModel.content, '旧历史回答')
assert.equal(legacyModel.terminal, 'completed')

const viewSource = read(viewPath)
const eventReader = viewSource.slice(
  viewSource.indexOf('function eventTurnProtocol('),
  viewSource.indexOf('function outcomeNoticeProps('),
)
assert.match(eventReader, /localTurnPresentation\(event\)/)
assert.match(eventReader, /readSessionTurnPublic\(event\)/)
assert.match(eventReader, /readTurnProtocolFromMeta\(meta\)/)
assert.ok(eventReader.indexOf('readSessionTurnPublic(event)') < eventReader.indexOf('readTurnProtocolFromMeta(meta)'))
assert.match(viewSource, /event\?\.turn\?\.schema === 'session_turn_public\.v1'/)
assert.match(viewSource, /event\.turn_id/)
assert.match(viewSource, /event\.turn/)

const parsed = parse(viewSource, { filename: viewPath })
assert.deepEqual(parsed.errors, [])

console.log('vibe session events public contract: PASS')
