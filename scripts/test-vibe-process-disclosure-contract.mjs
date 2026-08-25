import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const emptyPolicyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/conversationEmptyStatePolicy.ts')
const processPolicyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/processDisclosurePolicy.ts')
const turnPresentationPolicyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/turnPresentationPolicy.ts')
const motionContinuityPath = path.join(root, 'src/views/electron_views/vibe/knowledge/motionContinuity.ts')
const turnProtocolPath = path.join(root, 'src/views/electron_views/vibe/knowledge/composables/turnProtocol.ts')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const disclosurePath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ProcessDisclosure.vue')
const orbPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ThinkingOrbStatus.vue')

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

const emptyPolicy = await importTs(emptyPolicyPath)
const processPolicy = await importTs(processPolicyPath)
const turnPresentationPolicy = await importTs(turnPresentationPolicyPath)
const motionContinuity = await importTs(motionContinuityPath)
const turnProtocol = await importTs(turnProtocolPath)
const viewSource = read(viewPath)
const disclosureSource = read(disclosurePath)
const orbSource = read(orbPath)

// 新会话已由当前会话 owner 持有在途 turn 时，欢迎页数量必须为 0。
const visibleEmptyCount = [emptyPolicy.shouldShowConversationEmptyState({
  eventCount: 0,
  activeSessionId: 'session-new',
  streamingOwnerSessionId: 'session-new',
  streamingPending: true,
})].filter(Boolean).length
assert.equal(visibleEmptyCount, 0)
assert.equal(emptyPolicy.shouldShowConversationEmptyState({
  eventCount: 0,
  activeSessionId: 'session-b',
  streamingOwnerSessionId: 'session-a',
  streamingPending: true,
}), true, 'another session streaming must not suppress this session empty state')
assert.equal(emptyPolicy.shouldShowConversationEmptyState({
  eventCount: 1,
  activeSessionId: 'session-a',
  streamingOwnerSessionId: '',
  streamingPending: false,
}), false)

// default-deny：任意未知 stats/details 都不能进入用户可见统计。
assert.deepEqual(processPolicy.visibleProcessActionStats({
  audit_schema: 'candidate_addressing_audit.v1',
  input_tokens: 9267,
  page_token_count: 9339,
  audit_digest: 'secret-digest',
  has_more: true,
  status: 'incomplete',
}), [])
const internalOnlyMeta = processPolicy.compactProcessActionMeta({
  status: 'success',
  stats: {},
  details: {
    canonical_tool_result: {
      ok: false,
      status: 'incomplete',
      has_more: true,
    },
  },
  durationMs: 0,
})
assert.equal(internalOnlyMeta.length, 0, 'unknown details must produce zero visible rows')

// 只展示后端正式 stats allowlist；不从内部 ok/status/has_more 推断结论。
const formalMeta = processPolicy.compactProcessActionMeta({
  status: 'success',
  stats: {
    source_count: 2,
    read_unit_count: 3,
    evidence_ref_count: 5,
    input_tokens: 999,
    has_more: true,
  },
  durationMs: 1400,
})
assert.equal(formalMeta, '来源 2 · 原文片段 3 · 可引用证据 5 · 1.4s')
assert.deepEqual(processPolicy.visibleProcessActionStats({ source_count: '2' }), [], 'stats must remain typed numeric fields')
assert.equal(processPolicy.compactProcessActionMeta({ status: 'error', stats: { source_count: 2 }, durationMs: 1400 }), '')
assert.equal(processPolicy.compactProcessActionMeta({ status: 'cancelled', stats: { source_count: 2 }, durationMs: 1400 }), '')

// 同一个 Canonical item 更新时 key 必须稳定；公共 duration 被过滤后，
// 历史耗时由 started → terminal 的正式时间戳恢复，而不是退回 0s。
const protocolState = turnProtocol.createTurnProtocolState()
const runningModel = turnProtocol.applyTurnProtocolEvents(protocolState, [
  {
    event_id: 'event-started', turn_id: 'turn-handoff', sequence: 1,
    event_type: 'started', created_at: '2026-08-24T02:32:57.688Z', payload: {},
  },
  {
    event_id: 'event-tool-added', turn_id: 'turn-handoff', sequence: 2,
    event_type: 'item_added', created_at: '2026-08-24T02:32:57.788Z', payload: {},
    item: {
      item_id: 'item-retrieve', item_type: 'tool_call', content: '检索知识',
      payload: { action_type: 'retrieve', title: '检索知识', status: 'running' },
    },
  },
])
assert.equal(runningModel.process[0].key, 'item-retrieve')
const completedModel = turnProtocol.applyTurnProtocolEvents(protocolState, [
  {
    event_id: 'event-tool-updated', turn_id: 'turn-handoff', sequence: 3,
    event_type: 'item_updated', created_at: '2026-08-24T02:33:30.000Z', payload: {},
    item: {
      item_id: 'item-retrieve', item_type: 'tool_call', content: '检索知识',
      payload: { action_type: 'retrieve', title: '检索知识', status: 'success' },
    },
  },
  {
    event_id: 'event-process-done', turn_id: 'turn-handoff', sequence: 4,
    event_type: 'checkpoint', created_at: '2026-08-24T02:33:30.261Z',
    payload: { checkpoint: 'process_done', data: { summary: '本轮处理完成' } },
  },
  {
    event_id: 'event-completed', turn_id: 'turn-handoff', sequence: 5,
    event_type: 'completed', created_at: '2026-08-24T02:33:35.360Z', payload: {},
  },
])
assert.equal(completedModel.process[0].key, 'item-retrieve')
assert.equal(completedModel.processSummary.duration_ms, 37672)

// 即时 event_saved 是 thin row：必须用本轮已归约的模型桥接到历史富投影接管。
const thinSavedEvent = { id: 'assistant-1', content: '答案', meta: { foundation: true } }
const displayEvent = turnPresentationPolicy.attachLocalTurnPresentation(thinSavedEvent, completedModel, 7234)
assert.notEqual(displayEvent, thinSavedEvent)
assert.equal(turnPresentationPolicy.localTurnPresentation(displayEvent).model, completedModel)
assert.equal(turnPresentationPolicy.localTurnPresentation(displayEvent).observedDurationMs, 7234)
assert.equal(turnPresentationPolicy.localTurnPresentation(thinSavedEvent), null)
assert.equal(turnPresentationPolicy.preferredProcessDuration(0, undefined, 7234), 7234)
assert.equal(turnPresentationPolicy.preferredProcessDuration(32328, 7234), 32328)

// event_saved 可能先携带合法 running prefix：活动 Turn 不报警；completed 到达后必须
// 原地升级同一 assistant 气泡，不等待 /events 历史重投影。
const runningSavedEvent = turnPresentationPolicy.attachLocalTurnPresentation(
  { id: 'assistant-live', role: 'assistant', session_id: 'session-a', content: '答案', meta: { foundation: true } },
  runningModel,
  1200,
  { terminalPending: true },
)
assert.equal(
  turnPresentationPolicy.shouldShowMissingTerminalNotice(
    runningModel,
    turnPresentationPolicy.localTurnPresentation(runningSavedEvent),
  ),
  false,
)
const completedSavedEvent = turnPresentationPolicy.refreshAssistantTurnPresentation(
  [runningSavedEvent],
  {
    assistantEventId: 'assistant-live',
    sessionId: 'session-a',
    model: completedModel,
    observedDurationMs: 37672,
    terminalPending: false,
  },
)
assert.ok(completedSavedEvent)
assert.equal(completedSavedEvent.id, 'assistant-live')
assert.equal(turnPresentationPolicy.localTurnPresentation(completedSavedEvent).model, completedModel)
assert.equal(turnPresentationPolicy.localTurnPresentation(completedSavedEvent).terminalPending, false)
assert.equal(
  turnPresentationPolicy.shouldShowMissingTerminalNotice(
    completedModel,
    turnPresentationPolicy.localTurnPresentation(completedSavedEvent),
  ),
  false,
)

// 流/运行确实结束仍缺 terminal 时继续报警，不能把真正协议缺口吞掉。
const endedWithoutTerminal = turnPresentationPolicy.attachLocalTurnPresentation(
  runningSavedEvent,
  runningModel,
  1500,
  { terminalPending: false },
)
assert.equal(
  turnPresentationPolicy.shouldShowMissingTerminalNotice(
    runningModel,
    turnPresentationPolicy.localTurnPresentation(endedWithoutTerminal),
  ),
  true,
)
assert.equal(
  turnPresentationPolicy.shouldShowMissingTerminalNotice(
    runningModel,
    turnPresentationPolicy.localTurnPresentation(runningSavedEvent),
    false,
  ),
  false,
  'snapshot disappearance is not a terminal boundary while authoritative recovery is pending',
)

// running lease 从 /turn/running 消失不代表失败：权威 replay 仍是活动前缀时继续 pending；
// 只有 replay 明确收口但仍缺 terminal 才进入真实协议故障。
assert.equal(turnPresentationPolicy.classifyTurnRecoveryReplay({
  expectedTurnId: 'turn-handoff',
  replayTurnId: 'turn-handoff',
  state: 'running',
  terminal: null,
}), 'pending')
assert.equal(turnPresentationPolicy.classifyTurnRecoveryReplay({
  expectedTurnId: 'turn-handoff',
  replayTurnId: 'turn-handoff',
  state: 'succeeded',
  terminal: 'completed',
}), 'settled')
assert.equal(turnPresentationPolicy.classifyTurnRecoveryReplay({
  expectedTurnId: 'turn-handoff',
  replayTurnId: 'turn-handoff',
  state: 'succeeded',
  terminal: null,
}), 'missing_terminal')
assert.equal(turnPresentationPolicy.classifyTurnRecoveryReplay({
  expectedTurnId: 'turn-handoff',
  replayTurnId: 'turn-foreign',
  state: 'succeeded',
  terminal: 'completed',
}), 'identity_mismatch')

// 切会话/恢复时，即使 event id 偶然相同，也不能用另一个 session/turn 的模型覆盖。
const foreignTurnModel = { ...completedModel, turnId: 'turn-foreign' }
assert.equal(turnPresentationPolicy.refreshAssistantTurnPresentation(
  [runningSavedEvent],
  {
    assistantEventId: 'assistant-live',
    sessionId: 'session-b',
    model: foreignTurnModel,
  },
), null)
assert.equal(turnPresentationPolicy.refreshAssistantTurnPresentation(
  [runningSavedEvent],
  {
    assistantEventId: '',
    sessionId: 'session-a',
    model: foreignTurnModel,
  },
), null)
const recoveredSameTurn = turnPresentationPolicy.refreshAssistantTurnPresentation(
  [runningSavedEvent],
  {
    assistantEventId: '',
    sessionId: 'session-a',
    model: completedModel,
  },
)
assert.equal(recoveredSameTurn?.id, 'assistant-live')

// 重挂载后的 CSS 动画仍锚在 performance 全局时间轴，而不是从 0% 重新开始。
assert.equal(motionContinuity.continuousAnimationDelay(1800, 1900), '-100ms')
assert.equal(motionContinuity.continuousAnimationDelay(1800, 3600), '0ms')

for (const [file, source] of [[viewPath, viewSource], [disclosurePath, disclosureSource], [orbPath, orbSource]]) {
  const parsed = parse(source, { filename: file })
  assert.deepEqual(parsed.errors, [])
}

assert.match(viewSource, /<div v-if="showConversationEmpty" class="empty">/)
assert.doesNotMatch(viewSource, /<div v-if="!events\.length" class="empty">/)
const emptyOwnerStart = viewSource.indexOf('const currentSessionStreamingPending = computed(')
const emptyOwnerEnd = viewSource.indexOf('const streamingAssistantStandaloneVisible', emptyOwnerStart)
const emptyOwnerSource = viewSource.slice(emptyOwnerStart, emptyOwnerEnd)
assert.match(emptyOwnerSource, /visibleStreamingOwner\.value/)
assert.match(emptyOwnerSource, /streamingOwnerSessionId:\s*streamingOwnerSessionId\.value/)
assert.doesNotMatch(emptyOwnerSource, /foundationBusy/)

assert.match(disclosureSource, /compactProcessActionMeta/)
assert.match(disclosureSource, /class="proc-action-stats"/)
assert.doesNotMatch(disclosureSource, /step\.details|detailEntries|JSON\.stringify|Object\.(?:entries|keys)/)
assert.doesNotMatch(disclosureSource, /canonical_tool_result|audit_schema|audit_digest|input_tokens|page_token_count|has_more/)
assert.doesNotMatch(disclosureSource, /toggleAction|isActionOpen|hasDetails|proc-action-detail|class="proc-chevron small"/)
assert.match(disclosureSource, /step\.status === 'error' && step\.summary[\s\S]*\{\{ step\.summary \}\}/)
assert.match(disclosureSource, /step\.status === 'cancelled' && step\.summary[\s\S]*\{\{ step\.summary \}\}/)
assert.match(disclosureSource, /:style="shimmerStyle"/)
assert.match(disclosureSource, /animation-delay:\s*var\(--vibe-shimmer-delay/)
assert.match(disclosureSource, /0%\s*\{\s*background-position:\s*220% 0;/)
assert.match(disclosureSource, /100%\s*\{\s*background-position:\s*-220% 0;/)

assert.match(orbSource, /const ORB_SIZE = 20 as const/)
assert.match(orbSource, /const ORB_DISPLAY_SIZE = 23/)
assert.equal((orbSource.match(/min-height:\s*23px/g) || []).length, 2)
assert.doesNotMatch(orbSource, /min-height:\s*46px/)
assert.match(orbSource, /gap:\s*4px/)
assert.match(orbSource, /margin-top:\s*-6px/)
assert.match(orbSource, /:style="shimmerStyle"/)
assert.match(orbSource, /animation-delay:\s*var\(--vibe-shimmer-delay/)
assert.match(orbSource, /from\s*\{\s*background-position:\s*220% 0;/)
assert.match(orbSource, /to\s*\{\s*background-position:\s*-220% 0;/)

assert.match(viewSource, /attachLocalTurnPresentation/)
assert.match(viewSource, /refreshAssistantTurnPresentation\(events\.value/)
assert.match(viewSource, /assistantPresentationEventId \|\| streamingAssistantEventId\.value/)
assert.match(viewSource, /assistantPresentationSessionId \|\| turnSessionId/)
assert.match(viewSource, /assistantPresentationTurnId \|\| turnStartedId/)
assert.match(viewSource, /shouldShowMissingTerminalNotice\(model, local, eventTurnIsStillActive\(event, model\)\)/)
assert.match(viewSource, /function eventTurnIsStillActive\(event: any, model: TurnProtocolReadModel \| null\)/)
assert.match(viewSource, /if \(replayedModel\.turnId !== turnId\)/)
assert.doesNotMatch(viewSource, /turn\.protocol_events|turn\.events/)
assert.match(viewSource, /adoptRunningTurnLease\(turn\)/)
assert.match(viewSource, /replayFoundationTurn\(\{[\s\S]*?turn_id: turnId,[\s\S]*?session_id: sessionId,[\s\S]*?after_sequence: requestedSequence/)
assert.match(viewSource, /classifyTurnRecoveryReplay/)
assert.match(viewSource, /if \(!turnRecoveryRequestIsCurrent\(recoveryGuard\)\) return/)
assert.doesNotMatch(viewSource, /foundationBusy\.value = false\s*\n\s*streamingAssistantEventId\.value = ''/)
assert.doesNotMatch(viewSource, /setTimeout\([^)]*本轮结果尚未确认/)
assert.match(viewSource, /reconcileAuthoritativeEventProjections\(fresh\)/)
assert.match(viewSource, /localTurnPresentation\(event\)\?\.observedDurationMs/)

console.log('vibe process disclosure contract: PASS')
