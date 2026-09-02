import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const harnessPath = path.join(root, 'src/api/harness.ts')
const apiPath = path.join(root, 'src/views/electron_views/vibe/api.ts')
const policyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/turnPresentationPolicy.ts')
const protocolPath = path.join(root, 'src/views/electron_views/vibe/knowledge/composables/turnProtocol.ts')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const agentHostPath = path.join(root, 'electron/vibeAgent/agentHost.node.js')

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

const policy = await importTs(policyPath)
const protocol = await importTs(protocolPath)
const harnessSource = read(harnessPath)
const apiSource = read(apiPath)
const viewSource = read(viewPath)
const agentHostSource = read(agentHostPath)

assert.equal(policy.classifyTurnReplayGap({
  status: 404, liveLease: true, seenRunning: true,
}), 'retry')
assert.equal(policy.classifyTurnReplayGap({
  status: 409, code: 'turn_replay_not_ready', liveLease: true, seenRunning: true,
}), 'retry')
assert.equal(policy.classifyTurnReplayGap({
  status: 503, liveLease: false, seenRunning: true,
  leaseMissingForMs: policy.TURN_REPLAY_FINAL_GRACE_MS - 1,
}), 'retry')
assert.equal(policy.classifyTurnReplayGap({
  status: 404, liveLease: false, seenRunning: true,
  leaseMissingForMs: policy.TURN_REPLAY_FINAL_GRACE_MS,
}), 'expired')
assert.equal(policy.classifyTurnReplayGap({
  status: 403, liveLease: true, seenRunning: true,
}), 'broken')
assert.equal(policy.classifyTurnReplayGap({
  status: 422, liveLease: true, seenRunning: true,
}), 'broken')
assert.equal(policy.classifyTurnReplayGap({
  status: 409, code: 'turn_session_mismatch', liveLease: true, seenRunning: true,
}), 'broken')
assert.equal(policy.classifyTurnReplayGap({
  status: 409, code: 'turn_replay_cursor_invalid', liveLease: true, seenRunning: true,
}), 'broken')
assert.equal(policy.classifyTurnReplayGap({
  status: 413, code: 'journal_delta_event_too_large', retryable: false,
  liveLease: true, seenRunning: true,
}), 'broken')

// 首次全量 prefix 与后续 suffix 必须归并到同一个 reducer，更新同一 item，
// 不得重新下载全量后另起第二套解释器。
const state = protocol.createTurnProtocolState()
let model = protocol.applyTurnProtocolEvents(state, [
  {
    event_id: 'evt-1', turn_id: 'turn-1', sequence: 1,
    event_type: 'started', payload: {},
  },
  {
    event_id: 'evt-2', turn_id: 'turn-1', sequence: 2,
    event_type: 'item_added', payload: {},
    item: {
      item_id: 'answer-1', item_type: 'assistant_message',
      content: '部分答案', payload: {},
    },
  },
])
assert.equal(model.state, 'running')
assert.equal(model.content, '部分答案')
model = protocol.applyTurnProtocolEvents(state, [
  {
    event_id: 'evt-3', turn_id: 'turn-1', sequence: 3,
    event_type: 'item_updated', payload: {},
    item: {
      item_id: 'answer-1', item_type: 'assistant_message',
      content: '完整答案', payload: {},
    },
  },
  {
    event_id: 'evt-4', turn_id: 'turn-1', sequence: 4,
    event_type: 'completed', payload: {},
  },
])
assert.equal(model.state, 'succeeded')
assert.equal(model.terminal, 'completed')
assert.equal(model.content, '完整答案')

const runningType = apiSource.slice(
  apiSource.indexOf('export interface FoundationRunningTurn'),
  apiSource.indexOf('export interface FoundationTurnReplay'),
)
assert.doesNotMatch(runningType, /\bevents\??\s*:/)
assert.doesNotMatch(runningType, /\bprotocol_events\??\s*:/)
assert.match(runningType, /last_sequence\?: number/)
assert.match(runningType, /replay_ready\?: boolean/)
assert.match(apiSource, /after_sequence\?: number/)
assert.match(apiSource, /last_event_id\?: string/)
assert.match(apiSource, /projection: 'journal_delta\.v1'/)
assert.match(apiSource, /delivered_through_sequence: number/)
assert.match(apiSource, /query\.set\('projection', 'journal_delta'\)/)
assert.match(apiSource, /query\.set\('after_sequence'/)
assert.match(apiSource, /query\.set\('last_event_id'/)
const replayType = apiSource.slice(
  apiSource.indexOf('export interface FoundationTurnReplay'),
  apiSource.indexOf('export interface FoundationCancelResult'),
)
assert.doesNotMatch(replayType, /\bitems\??:|\btimeline\??:|revision_history|pending_clarification/)
assert.match(harnessSource, /export class HarnessRequestError extends Error/)
assert.match(harnessSource, /status: Number\(error\.response\?\.status \|\| 0\)/)
assert.match(harnessSource, /code: typeof data\?\.code === 'string' \? data\.code : ''/)
assert.match(harnessSource, /retryable: typeof data\?\.retryable === 'boolean' \? data\.retryable : null/)

assert.doesNotMatch(viewSource, /turn\.protocol_events|turn\.events/)
assert.doesNotMatch(viewSource, /运行快照没有提供 Canonical Journal/)
assert.match(viewSource, /adoptRunningTurnLease\(turn\)/)
assert.match(viewSource, /recoverCanonicalTurnReplay\(/)
assert.match(viewSource, /function localPiAgentConfigured\(\)/)
assert.match(viewSource, /function useLocalPiAgent\(\): boolean\s*\{[\s\S]*?return localPiAgentConfigured\(\)/)
assert.doesNotMatch(viewSource, /return localPiAgentConfigured\(\) \|\| String\(activeSessionId\.value \|\| ''\)\.startsWith\('session_'\)/)
assert.doesNotMatch(viewSource, /runningSessionIds\.value = Object\.keys\(next\)/)
assert.match(viewSource, /if \(sessionId\.startsWith\('session_'\)\) return/)
assert.match(viewSource, /!!sessionRuntimeState\(activeSessionId\.value\)/)
assert.match(viewSource, /state === 'waiting_user'\) return '需要用户输入'/)
assert.match(viewSource, /typeof status\.assistantPartialText === 'string'[\s\S]*context\.ephemeralText = status\.assistantPartialText\.slice\(-2_000_000\)/)
assert.match(agentHostSource, /this\.assistantPartialText = ""/)
assert.match(agentHostSource, /frame\.type === "assistant_delta"[\s\S]*this\.assistantPartialText = `[\s\S]*\.slice\(-2_000_000\)/)
assert.match(agentHostSource, /frame\.type === "assistant_end"\) this\.assistantPartialText = ""/)
assert.match(agentHostSource, /assistantPartialText: this\.assistantPartialText/)
assert.match(viewSource, /sessionRuntimeState\(item\.id\) === 'waiting_user'[^>]*>[\s\S]*?需要用户输入<\/span>/)
assert.match(viewSource, /&\.waiting-user\s*\{[\s\S]*?background:\s*#e8f1ff;[\s\S]*?white-space:\s*nowrap;/)
assert.match(viewSource, /after_sequence: requestedSequence/)
assert.match(viewSource, /last_event_id: requestedSequence > 0 \? recovery\.lastEventId : ''/)
assert.match(viewSource, /applyTurnProtocolEvents\(recovery\.protocolState, journalEvents\)/)
assert.match(viewSource, /journal\?\.has_more === true/)
assert.match(viewSource, /TURN_REPLAY_MAX_PAGES_PER_POLL/)
assert.match(viewSource, /if \(recovery\.broken\) return/)
assert.match(viewSource, /if \(turn\.replay_ready === false\)/)
assert.match(viewSource, /Number\(event\?\.sequence\) !== requestedSequence \+ index \+ 1/)
assert.match(viewSource, /eventIds\.has\(eventId\)/)
assert.match(viewSource, /recovery\.seenEventIds\.has\(eventId\)/)
assert.match(viewSource, /for \(const event of journalEvents\) recovery\.seenEventIds\.add\(String\(event\.event_id\)\)/)
assert.match(viewSource, /replay\.projection !== 'journal_delta\.v1'/)
assert.match(viewSource, /journal\?\.delivered_through_sequence/)
assert.match(viewSource, /journal\?\.has_more !== \(deliveredThroughSequence < latestSequence\)/)
assert.match(viewSource, /reason instanceof HarnessRequestError/)
assert.match(viewSource, /retryable: reason\.retryable/)
assert.doesNotMatch(viewSource, /detail\.includes\(/)
assert.match(viewSource, /if \(recovery\.leaseMissingAt === null\) recovery\.leaseMissingAt = Date\.now\(\)/)
assert.match(viewSource, /if \(turnStartedId\) turnReplayRecoveryState\(turnStartedId\)\.seenRunning = true/)
assert.match(viewSource, /当前窗口自己的 SSE 已实时驱动界面，禁止迟到 replay 覆盖同一轮实时 reducer/)
assert.match(viewSource, /function keepRecoveredTerminalBridgePending\(/)
assert.match(viewSource, /TERMINAL_HISTORY_BRIDGE_MAX_ATTEMPTS = 12/)
assert.match(viewSource, /TERMINAL_HISTORY_BRIDGE_MAX_MS = 30_000/)
assert.match(viewSource, /async function bridgeRecoveredTerminalHistory\(/)
assert.match(viewSource, /if \(recovery\.terminalModel\) \{[\s\S]*?bridgeRecoveredTerminalHistory\([\s\S]*?return/)
assert.match(viewSource, /recovery\.terminalModel = replayedModel\s*\n\s*await bridgeRecoveredTerminalHistory/)
assert.match(viewSource, /const historyHasTurnAssistant = !!fresh && events\.value\.some\(event =>[\s\S]*?eventTurnProtocol\(event\)\?\.turnId === turnId\)/)
assert.match(viewSource, /const historyOwnsTurn = historyHasTurnAssistant\s*&& refreshRecoveredAssistantPresentation\(sessionId, model, false\)/)
assert.match(viewSource, /if \(!assistantAttached\) streamingAssistantEventId\.value = ''/)
assert.match(viewSource, /function recoveredTerminalAssistantIsAttached\([\s\S]*?eventTurnProtocol\(event\)\?\.turnId === turnId/)
assert.match(viewSource, /if \(!historyOwnsTurn\) \{[\s\S]*?keepRecoveredTerminalBridgePending\(sessionId, turnId, model, assistantAttached\)[\s\S]*?return/)
assert.match(viewSource, /terminalBridgeAttempts >= TERMINAL_HISTORY_BRIDGE_MAX_ATTEMPTS/)
assert.match(viewSource, /bridgeElapsedMs >= TERMINAL_HISTORY_BRIDGE_MAX_MS/)
assert.match(viewSource, /title: '本轮结果已恢复，但保存状态尚未确认'/)
assert.match(viewSource, /setSessionRunning\(sessionId, false\)/)
const historyGateIndex = viewSource.indexOf('const historyOwnsTurn = historyHasTurnAssistant')
const historyPendingIndex = viewSource.indexOf('keepRecoveredTerminalBridgePending(sessionId, turnId, model, assistantAttached)', historyGateIndex)
const historyReleaseIndex = viewSource.indexOf('releaseRecoveredTurnOwner(sessionId)', historyGateIndex)
assert.ok(historyGateIndex > 0 && historyPendingIndex > historyGateIndex)
assert.ok(historyReleaseIndex > historyPendingIndex)
const terminalBridgeIndex = viewSource.indexOf('async function bridgeRecoveredTerminalHistory(')
const terminalBridgeExhaustedIndex = viewSource.indexOf('if (recovery.terminalBridgeExhausted)', terminalBridgeIndex)
const terminalBridgeCurrentHistoryIndex = viewSource.indexOf('const currentHistoryHasTurnAssistant', terminalBridgeExhaustedIndex)
const terminalBridgeExhaustedReleaseIndex = viewSource.indexOf('releaseRecoveredTurnOwner(sessionId)', terminalBridgeCurrentHistoryIndex)
const terminalBridgeHistoryRequestIndex = viewSource.indexOf('const fresh = await listVibeEvents(sessionId)', terminalBridgeIndex)
assert.ok(terminalBridgeIndex > 0 && terminalBridgeExhaustedIndex > terminalBridgeIndex)
assert.ok(terminalBridgeCurrentHistoryIndex > terminalBridgeExhaustedIndex)
assert.ok(terminalBridgeExhaustedReleaseIndex > terminalBridgeCurrentHistoryIndex)
assert.ok(terminalBridgeHistoryRequestIndex > terminalBridgeExhaustedIndex)

const parsed = parse(viewSource, { filename: viewPath })
assert.deepEqual(parsed.errors, [])

console.log('vibe running turn recovery contract: PASS')
