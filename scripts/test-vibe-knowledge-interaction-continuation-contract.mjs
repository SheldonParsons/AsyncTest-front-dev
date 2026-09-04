import assert from 'node:assert/strict'
import { LocalToolRouter } from '../electron/vibeAgent/localToolRouter.node.js'

const router = new LocalToolRouter({
  run: { run_id: 'run-1', project_id: 'project-1', session_id: 'session-1', turn_id: 'turn-1' },
  knowledgeClient: {
    async call() {
      return {
        schema: 'knowledge_capability.outcome.v1',
        status: 'completed',
        result: {
          confirmation_id: 'internal-confirmation',
          request_text: 'large original request',
          operation: 'insert',
          summary: '新增 示例.md',
          user_receipt: '已录入 1 份知识文档：示例.md。',
          verification: {
            ok: true,
            documents: [{ document_id: 'internal-document', filename: '示例.md', title: '示例', active: true }],
          },
        },
      }
    },
  },
})

router.restorePending({
  interaction_id: 'confirmation-1',
  confirmation_id: 'confirmation-1',
  sequence: 1,
  kind: 'knowledge_confirmation',
  spec_digest: 'a'.repeat(64),
}, { toolCallId: 'tool-1', toolName: 'add_knowledge' })

const outcome = await router.resolveInteraction('confirmation-1', { action: 'apply' })
const receipt = JSON.parse(outcome.result.content[0].text)

assert.equal(outcome.status, 'applied')
assert.match(outcome.user_message, /用户已确认执行/)
assert.match(outcome.user_message, /已经提交/)
assert.deepEqual(receipt, {
  schema: 'knowledge_change_receipt.v1',
  action: 'apply',
  status: 'completed',
  operation: 'insert',
  summary: '新增 示例.md',
  user_receipt: '已录入 1 份知识文档：示例.md。',
  verified: true,
  documents: [{ filename: '示例.md', title: '示例', active: true }],
})
assert.equal(outcome.result.is_error, false)
assert.equal(outcome.result.terminate, undefined)
assert.equal(outcome.result.content[0].text.includes('internal-confirmation'), false)
assert.equal(outcome.result.content[0].text.includes('large original request'), false)
assert.equal(outcome.result.content[0].text.includes('internal-document'), false)

const authorityCalls = []
const authorityTrace = []
const signedBinding = `ntc_${'a'.repeat(24)}.${'b'.repeat(43)}`
const authorityRouter = new LocalToolRouter({
  defaultQuery: '请修改 示例.md 的状态。',
  run: { run_id: 'run-2', project_id: 'project-1', session_id: 'session-1', turn_id: 'turn-2' },
  onTrace: async (entry) => authorityTrace.push(entry),
  knowledgeClient: {
    async call(request) {
      authorityCalls.push(request)
      if (request.operation === 'bind_targets') {
        return {
          schema: 'knowledge_capability.outcome.v1',
          status: 'completed',
          result: { schema: 'natural_target_binding.v1', binding: signedBinding },
        }
      }
      return {
        schema: 'knowledge_capability.outcome.v1',
        status: 'completed',
        result: { status: 'ready' },
      }
    },
  },
})
const payload = await authorityRouter.knowledgePayload('edit_knowledge', 'prepare_change', {
  request_text: '模型伪造的请求',
  original_request_text: '模型伪造的原始请求',
  changes: [{ target: { source_name: '示例.md' }, new_content: '新状态' }],
})
assert.equal(payload.request_text, '请修改 示例.md 的状态。')
assert.equal(payload.original_request_text, '请修改 示例.md 的状态。')

await authorityRouter.executeOne({
  toolCallId: 'tool-edit-1',
  name: 'edit_knowledge',
  args: {
  changes: [{ target: { source_name: 'Pi 链路自测.md' }, before_text: '已复核', new_content: '测试中' }],
  },
})
assert.equal(authorityCalls.length, 2)
assert.equal(authorityCalls[0].operation, 'bind_targets')
assert.deepEqual(authorityCalls[0].payload.targets, [{ source_name: 'Pi 链路自测.md' }])
assert.equal(authorityCalls[1].operation, 'prepare_change')
assert.equal(authorityCalls[1].payload.request_text, '请修改 示例.md 的状态。')
assert.equal(authorityCalls[1].payload.original_request_text, '请修改 示例.md 的状态。')
assert.equal(authorityCalls[1].payload.target_binding, signedBinding)
const serializedTrace = JSON.stringify(authorityTrace)
assert.equal(serializedTrace.includes(signedBinding), false)
assert.match(serializedTrace, /binding_sha256/)

const ambiguousCalls = []
const ambiguousRouter = new LocalToolRouter({
  defaultQuery: '修改链路自测的状态为：测试中',
  run: { run_id: 'run-3', project_id: 'project-1', session_id: 'session-1', turn_id: 'turn-3' },
  knowledgeClient: {
    async call(request) {
      ambiguousCalls.push(request)
      return {
        schema: 'knowledge_capability.outcome.v1',
        status: 'completed',
        result: {
          error: { code: 'natural_target_ambiguous' },
          need_info: { question: '请选择唯一文件。' },
        },
      }
    },
  },
})
const ambiguousResult = await ambiguousRouter.executeOne({
  toolCallId: 'tool-edit-2',
  name: 'edit_knowledge',
  args: { changes: [{ target: { source_name: 'Pi 链路自测.md' }, new_content: '状态：测试中' }] },
})
assert.equal(ambiguousCalls.length, 1)
assert.equal(ambiguousCalls[0].operation, 'bind_targets')
assert.equal(ambiguousResult.error.code, 'natural_target_ambiguous')

console.log('vibe knowledge interaction continuation contract: ok')
