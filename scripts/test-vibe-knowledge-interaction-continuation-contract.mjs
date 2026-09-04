import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
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

const authorityRouter = new LocalToolRouter({
  defaultQuery: '请修改 示例.md 的状态。',
})
const payload = await authorityRouter.knowledgePayload('edit_knowledge', 'prepare_change', {
  request_text: '模型伪造的请求',
  original_request_text: '模型伪造的原始请求',
  changes: [{ target: { source_name: '示例.md' }, new_content: '新状态' }],
})
assert.equal(payload.request_text, '请修改 示例.md 的状态。')
assert.equal(payload.original_request_text, '请修改 示例.md 的状态。')

authorityRouter.restorePending({
  interaction_id: 'clarification-1',
  sequence: 1,
  kind: 'clarification',
  spec_digest: 'b'.repeat(64),
  options: [{ label: '是，修改 Pi 链路自测.md', value: 'Pi 链路自测.md' }],
}, { toolCallId: 'tool-clarification-1', toolName: 'ask_clarification' })
await authorityRouter.resolveInteraction('clarification-1', {
  clarification_response: { type: 'option', option_id: 'Pi 链路自测.md' },
})
const clarifiedPayload = await authorityRouter.knowledgePayload('edit_knowledge', 'prepare_change', {
  changes: [{ target: { source_name: 'Pi 链路自测.md' }, before_text: '已复核', new_content: '测试中' }],
})
assert.equal(clarifiedPayload.request_text, '请修改 示例.md 的状态。')
assert.match(clarifiedPayload.original_request_text, /请修改 示例\.md 的状态。/)
assert.match(clarifiedPayload.original_request_text, /是，修改 Pi 链路自测\.md/)

const recoveredAuthorityRouter = new LocalToolRouter({
  defaultQuery: '修改链路自测的状态为：测试中',
  userAuthorityTexts: ['Pi 链路自测.md'],
})
const recoveredPayload = await recoveredAuthorityRouter.knowledgePayload('edit_knowledge', 'prepare_change', {
  changes: [{ target: { source_name: 'Pi 链路自测.md' }, before_text: '已复核', new_content: '测试中' }],
})
assert.match(recoveredPayload.original_request_text, /Pi 链路自测\.md/)

const ipcSource = await fs.readFile(new URL('../electron/vibeAgent/ipcMain.node.js', import.meta.url), 'utf8')
assert.match(ipcSource, /sessionStore\.events\(run\.session_id,[\s\S]*interaction_response\?\.clarification_response/)
assert.match(ipcSource, /recoveryRouter\.recordUserAuthority\(responseText\)/)

console.log('vibe knowledge interaction continuation contract: ok')
