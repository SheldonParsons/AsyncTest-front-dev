import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const admissionPath = path.join(root, 'src/views/electron_views/vibe/knowledge/composables/attachmentAdmission.ts')
const policyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/conversationInfoRailPolicy.ts')
const composerPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const apiPath = path.join(root, 'src/views/electron_views/vibe/api.ts')
const fixturePath = path.join(root, 'scripts/fixtures/vibe-attachment-resource-contract-v1.json')

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

function file(name, size, lastModified = 1, type = 'text/markdown') {
  return { name, size, lastModified, type }
}

const admission = await importTs(admissionPath)
const policy = await importTs(policyPath)
const contract = JSON.parse(read(fixturePath))
const composerSource = read(composerPath)
const viewSource = read(viewPath)
const apiSource = read(apiPath)

assert.equal(admission.MAX_ATTACHMENT_COUNT, 10)
assert.equal(admission.MAX_ATTACHMENT_BYTES, 20 * 1024 * 1024)
assert.equal(admission.MAX_ATTACHMENT_BATCH_BYTES, 50 * 1024 * 1024)

const ten = Array.from({ length: 10 }, (_, index) => file(`${index}.md`, 1024, index))
assert.equal(admission.admitAttachmentSelection([], ten).files.length, 10)
assert.equal(admission.admitAttachmentSelection([], [...ten, file('11.md', 1)]).files.length, 0)
assert.match(admission.admitAttachmentSelection([], [...ten, file('11.md', 1)]).error, /最多上传 10 个/)

const existing = [file('kept.md', 1, 9)]
const oversized = admission.admitAttachmentSelection(existing, [file('large.md', 20 * 1024 * 1024 + 1)])
assert.deepEqual(oversized.files, existing)
assert.match(oversized.error, /超过单文件 20 MB/)
const overBatch = admission.admitAttachmentSelection([], [
  file('a.md', 18 * 1024 * 1024, 1),
  file('b.md', 18 * 1024 * 1024, 2),
  file('c.md', 18 * 1024 * 1024, 3),
])
assert.equal(overBatch.files.length, 0)
assert.match(overBatch.error, /合计超过 50 MB/)
assert.equal(admission.admitAttachmentSelection(existing, [file('kept.md', 1, 9)]).files.length, 1)

// P0 only accepts text resources; backend remains the authority for binary sniffing.
assert.match(composerSource, /accept="\.md,\.markdown,text\/markdown,text\/plain"/)
assert.doesNotMatch(composerSource, /accept="[^"]*(?:pdf|docx|xlsx)/i)

assert.equal(contract.schema, 'vibe_attachment_p0_contract.v1')
assert.equal(contract.scope.accepted_content, 'validated_utf8_text_only')
assert.equal(contract.scope.independent_write_goals_per_turn, 1)
assert.equal(contract.p1_resource_ref.implemented, false)
assert.deepEqual(contract.p1_resource_ref.turn_payload_must_not_include, ['content', 'text'])
assert.ok(contract.p1_resource_ref.required_fields.includes('resource_id'))
assert.ok(contract.p1_resource_ref.required_fields.includes('content_sha256'))

// Historical inline events must stay downloadable while P1 introduces refs.
assert.match(apiSource, /export interface VibeAttachment[\s\S]*content\?: string[\s\S]*text\?: string[\s\S]*download_url\?: string/)
assert.match(apiSource, /downloadVibeSessionEventAttachment[\s\S]*\/events\/\$\{encodeURIComponent\(eventId\)\}\/attachments\/\$\{index\}/)
assert.match(viewSource, /const url = String\(file\?\.download_url \|\| ''\)\.trim\(\)/)
assert.match(viewSource, /const content = String\(file\?\.content \?\? file\?\.text \?\? ''\)/)
assert.equal(policy.attachmentIdentity({ resource_id: 'resource-1' }), 'resource:resource-1')

console.log('vibe attachment P0 contract: PASS')
