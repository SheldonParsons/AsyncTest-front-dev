import assert from 'node:assert/strict'

import {
  KnowledgeRemoteClient,
  KnowledgeRemoteError,
} from '../electron/vibeAgent/knowledgeRemoteClient.node.js'

function clientWith(payload, status) {
  return new KnowledgeRemoteClient({
    baseUrl: 'http://127.0.0.1:6001',
    authToken: 'test-token',
    agentBinding: 'binding-test',
    isDevelopment: true,
    fetchImpl: async () => new Response(JSON.stringify(payload), {
      status,
      headers: { 'Content-Type': 'application/json' },
    }),
  })
}

const call = {
  operation: 'resolve_confirmation',
  requestId: 'request-1',
  projectId: '1137',
  sessionId: 'session-local',
  turnId: 'turn-local',
  toolCallId: 'call-local',
  idempotencyKey: 'run-local:confirmation-1:apply',
  payload: { confirmation_id: 'confirmation-1', action: 'apply' },
}

const outcome = {
  schema: 'knowledge_capability.outcome.v1',
  status: 'non_retryable_failure',
  error: { code: 'knowledge_runtime_error', message: '确认写入执行权已经失效' },
}
assert.deepEqual(await clientWith({
  schema: 'knowledge_tool_response.v1',
  operation: call.operation,
  request_id: call.requestId,
  outcome,
}, 422).call(call), outcome)

await assert.rejects(
  clientWith({
    schema: 'knowledge_tool_error.v1',
    code: 'invalid_payload',
    detail: '请求无效',
  }, 422).call(call),
  error => error instanceof KnowledgeRemoteError
    && error.code === 'invalid_payload'
    && error.message === '请求无效',
)

console.log('vibe knowledge remote outcome contract: PASS')
