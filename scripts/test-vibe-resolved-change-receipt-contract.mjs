import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const policyPath = path.join(
  root,
  'src/views/electron_views/vibe/knowledge/resolvedChangeReceiptPolicy.ts',
)
const componentPath = path.join(
  root,
  'src/views/electron_views/vibe/knowledge/components/ResolvedChangeReceipt.vue',
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

const policy = await importTs(policyPath)
const applied = {
  schema: 'knowledge_change_receipt.v1',
  receipt_id: `kcr_${'a'.repeat(24)}`,
  confirmation_id: 'kcf_0123456789abcdef',
  status: 'applied',
  operation: 'delete',
  summary: '删除《设备管理规则.md》中的“维修流程”章节',
  resolved_at: '2026-08-25T15:13:00+00:00',
  commit_seq: 4,
  commit_id: 'commit-4',
  idempotent_replay: false,
}
const normalized = policy.readKnowledgeChangeReceipt(applied)
assert.ok(normalized)
assert.equal(normalized.receiptId, applied.receipt_id)
assert.equal(normalized.commitSeq, 4)
assert.equal(policy.knowledgeChangeReceiptTitle(normalized), '已完成删除')
assert.equal(policy.knowledgeChangeReceiptStatusLabel(normalized), '提交成功')
assert.ok(policy.readKnowledgeChangeReceipt({
  ...applied,
  receipt_id: `kcr_${'b'.repeat(24)}`,
  commit_id: undefined,
}))

const cancelled = policy.readKnowledgeChangeReceipt({
  ...applied,
  receipt_id: `kcr_${'c'.repeat(24)}`,
  status: 'cancelled',
  summary: '取消修改“报废流程”',
  commit_seq: undefined,
  commit_id: undefined,
  idempotent_replay: undefined,
})
assert.ok(cancelled)
assert.equal(policy.knowledgeChangeReceiptTitle(cancelled), '已取消变更')
assert.equal(policy.knowledgeChangeReceiptStatusLabel(cancelled), '未产生写入')

for (const unsafe of [
  { ...applied, old_body: '不得把正文塞进历史回执' },
  { ...applied, diff: { old: 'a', new: 'b' } },
  { ...applied, actions: [{ id: 'apply' }] },
  { ...applied, summary: '第一行\n第二行' },
  { ...applied, summary: 'x'.repeat(241) },
  { ...applied, status: 'cancelled' },
  {
    ...applied,
    receipt_id: `kcr_${'e'.repeat(24)}`,
    status: 'cancelled',
    commit_seq: undefined,
    commit_id: undefined,
    idempotent_replay: false,
  },
  { ...applied, receipt_id: 'not-a-receipt-id' },
]) {
  assert.equal(policy.readKnowledgeChangeReceipt(unsafe), null)
}

const rootEvent = { meta: { knowledge_change_receipts: [applied] } }
const continuationEvent = {
  meta: {
    knowledge_change_receipts: [
      applied,
      { ...applied, receipt_id: `kcr_${'d'.repeat(24)}`, operation: 'update', commit_seq: 5 },
    ],
  },
}
assert.deepEqual(
  policy.collectKnowledgeChangeReceipts([rootEvent, continuationEvent]).map(item => item.receiptId),
  [`kcr_${'a'.repeat(24)}`, `kcr_${'d'.repeat(24)}`],
)
assert.deepEqual(policy.eventKnowledgeChangeReceipts({ meta: {} }), [])

const componentSource = read(componentPath)
const component = parse(componentSource, { filename: componentPath })
assert.deepEqual(component.errors, [])
assert.match(componentSource, /receipt\.summary/)
assert.match(componentSource, /Commit \{\{ receipt\.commitSeq \}\}/)
assert.doesNotMatch(componentSource, /<button\b/)
assert.doesNotMatch(componentSource, /old_body|new_body|confirmationId/)

const viewSource = read(viewPath)
const view = parse(viewSource, { filename: viewPath })
assert.deepEqual(view.errors, [])
assert.match(viewSource, /v-for="receipt in threadKnowledgeChangeReceipts\(event\)"/)
assert.equal(
  (viewSource.match(/v-for="receipt in threadKnowledgeChangeReceipts\(event\)"/g) || []).length,
  2,
)
assert.doesNotMatch(viewSource, /eventKnowledgeChangeReceiptRows/)
assert.match(viewSource, /collectKnowledgeChangeReceipts\(\[root, \.\.\.parentContinuationResponses\(root\)\]\)/)

console.log('vibe resolved change receipt contract: PASS')
