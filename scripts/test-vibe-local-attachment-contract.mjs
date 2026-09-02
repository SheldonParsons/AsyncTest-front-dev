import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import { createHash } from 'node:crypto'

import { AttachmentWorkspace } from '../electron/vibeAgent/attachmentWorkspace.node.js'
import { LocalToolRouter } from '../electron/vibeAgent/localToolRouter.node.js'
import { LocalRunStore } from '../electron/vibeAgent/run/localRunStore.node.js'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-local-attachment-'))
const accountId = 'account-1'
const source = path.join(root, '资料.md')
const alternate = path.join(root, '伪造.md')
await fs.writeFile(source, '# 标题 😀😀\n\n中文内容\n第二行\n', 'utf8')
await fs.writeFile(alternate, '# 不应被读取\n', 'utf8')

try {
  const workspace = new AttachmentWorkspace({ rootPath: path.join(root, 'work') })
  const picked = await workspace.admit({ ownerId: 'sender-1', filePaths: [source] })
  assert.equal(picked.files.length, 1)
  assert.ok(picked.files[0].admission_token)

  const resolved = await workspace.resolveAdmissions(picked.files, 'sender-1')
  const manifest = await workspace.create(
    { workspaceId: 'ws1', accountId, runId: 'r1', sessionId: 's1', files: resolved.files },
    { admissionRecords: resolved.records },
  )
  workspace.releaseAdmissions(resolved.records, true)
  const attachment = manifest.attachments[0]
  const page = await workspace.read({
    workspaceId: 'ws1', attachmentId: attachment.attachment_id, offset: 0, length: 8,
    expectedAccountId: accountId, expectedRunId: 'r1', expectedSessionId: 's1',
  })
  assert.ok(page.text)
  assert.ok(page.next_offset > page.offset)
  const streamed = await workspace.authoredChunks({
    workspaceId: 'ws1', attachmentId: attachment.attachment_id, maxChars: 4,
    expectedAccountId: accountId, expectedRunId: 'r1', expectedSessionId: 's1',
  })
  assert.equal(streamed.content_hash, attachment.sha256)
  assert.equal(streamed.chunks.map((item) => item.text).join(''), '# 标题 😀😀\n\n中文内容\n第二行\n')
  assert.ok(streamed.chunks.every((item) => item.end_offset - item.start_offset <= 4))
  assert.deepEqual(streamed.chunks.map((item) => [item.start_offset, item.end_offset]), [[0, 4], [4, 8], [8, 12], [12, 16], [16, 18]])
  await assert.rejects(
    workspace.read({
      workspaceId: 'ws1', attachmentId: attachment.attachment_id,
      expectedRunId: 'other-run',
    }),
    /attachment_run_drift/,
  )

  await assert.rejects(
    workspace.resolveAdmissions([{ ...picked.files[0], path: alternate }], 'sender-1'),
    /admission_source_mismatch|admission_expired/,
  )
  await assert.rejects(
    workspace.resolveAdmissions([{ ...picked.files[0] }], 'sender-1'),
    /admission_expired/,
  )

  const router = new LocalToolRouter({
    workspace,
    workspaceId: 'ws1',
    run: { account_id: accountId, run_id: 'r1', project_id: 'p1', session_id: 's1' },
  })
  const wave = await router.executeWave({
    calls: [{
      id: 'c1',
      name: 'read_attachment_lines',
      arguments: {
        workspace_id: 'ws1',
        attachment_id: attachment.attachment_id,
        start_line: 1,
        max_lines: 2,
      },
    }],
  })
  assert.equal(wave.results.length, 1)
  assert.equal(wave.results[0].is_error, false)
  const authored = '# 分块正文\n\n第二段'
  const split = '# 分块正文\n\n'
  const chunkPayload = {
    schema: 'knowledge_markdown_chunk.v1',
    index: 0,
    start_offset: 0,
    end_offset: split.length,
    text: split,
    content_hash: createHash('sha256').update(split).digest('hex'),
  }
  const secondText = authored.slice(split.length)
  const secondChunk = {
    schema: 'knowledge_markdown_chunk.v1',
    index: 1,
    start_offset: split.length,
    end_offset: authored.length,
    text: secondText,
    content_hash: createHash('sha256').update(secondText).digest('hex'),
  }
  const preservingRouter = new LocalToolRouter({
    workspace,
    workspaceId: 'ws1',
    run: { account_id: accountId, run_id: 'r1', project_id: 'p1', session_id: 's1' },
  })
  const normalized = await preservingRouter.knowledgePayload('add_knowledge', 'prepare_change', {
    documents: [{ filename: '整理.md', source: { kind: 'model_authored' }, chunks: [chunkPayload, secondChunk], content_hash: createHash('sha256').update(authored).digest('hex') }],
  })
  assert.equal(normalized.documents[0].chunks.length, 2)
  assert.equal(normalized.documents[0].content_hash, createHash('sha256').update(authored).digest('hex'))
  assert.equal(normalized.documents[0].content, undefined)
  const localSource = await preservingRouter.knowledgePayload('add_knowledge', 'prepare_change', {
    documents: [{ source: {
      kind: 'local_workspace', workspace_id: 'ws1', attachment_id: attachment.attachment_id,
    } }],
  })
  assert.equal(localSource.documents[0].origin_kind, 'model_authored')
  assert.ok(localSource.documents[0].chunks.length > 0)
  assert.equal(localSource.documents[0].source, undefined)
  assert.equal(localSource.documents[0].content, undefined)
  assert.equal(localSource.documents[0].content_hash, attachment.sha256)
  let captured
  const networkRouter = new LocalToolRouter({
    workspace,
    workspaceId: 'ws1',
    run: { account_id: accountId, run_id: 'r1', project_id: 'p1', session_id: 's1' },
    knowledgeClient: { call: async (request) => { captured = request; return { status: 'completed', result: { accepted: true } } } },
  })
  await networkRouter.executeWave({ calls: [{
    id: 'write1', name: 'add_knowledge', arguments: {
      documents: [{ source: {
        kind: 'local_workspace', workspace_id: 'ws1', attachment_id: attachment.attachment_id,
      } }],
    },
  }] })
  assert.ok(captured)
  assert.equal(captured.payload.documents[0].origin_kind, 'model_authored')
  assert.equal(captured.payload.documents[0].source, undefined)
  assert.equal(captured.payload.documents[0].chunks[0].schema, 'knowledge_markdown_chunk.v1')
  assert.equal(captured.payload.attachments, undefined)
  const editCaptured = {}
  const editRouter = new LocalToolRouter({
    workspace,
    workspaceId: 'ws1',
    run: { account_id: accountId, run_id: 'r1', project_id: 'p1', session_id: 's1' },
    knowledgeClient: { call: async (request) => { editCaptured.request = request; return { status: 'completed', result: { accepted: true } } } },
  })
  await editRouter.executeWave({ calls: [{
    id: 'edit1', name: 'edit_knowledge', arguments: {
      document: {
        target: { source_name: '现行标题' },
        source: { kind: 'local_workspace', workspace_id: 'ws1', attachment_id: attachment.attachment_id },
      },
    },
  }] })
  assert.equal(editCaptured.request.payload.document.filename, attachment.name)
  assert.equal(editCaptured.request.payload.document.source, undefined)
  assert.ok(editCaptured.request.payload.document.chunks.length > 0)
  const drift = await networkRouter.executeWave({ calls: [{
    id: 'write2', name: 'add_knowledge', arguments: {
      documents: [{ source: {
        kind: 'local_workspace', workspace_id: 'other-workspace', attachment_id: attachment.attachment_id,
      } }],
    },
  }] })
  assert.equal(drift.results[0].is_error, true)
  assert.match(drift.results[0].content[0].text, /workspace_drift/)
  await workspace.remove('ws1', { expectedAccountId: accountId, expectedRunId: 'r1', expectedSessionId: 's1' })
  const runStore = new LocalRunStore({ rootPath: path.join(root, 'runs') })
  const run = {
    schema: 'electron_agent_run.v1',
    execution_host: 'electron',
    execution_mode: 'local',
    account_id: accountId,
    run_id: 'run1',
    turn_id: 'turn1',
    request_id: 'request1',
    session_id: 'session1',
    project_id: 'project1',
    trace_id: 'trace1',
    goal_id: 'goal1',
    protocol_version: 2,
  }
  const payload = { execution_mode: 'local', system_prompt: '', tools: [], provider: {
    id: 'provider1', model: 'm', mode: 'direct', api_key: 'provider-secret',
    base_url: 'https://user:password@provider.example/v1',
    proxy_url: 'https://proxy-user:proxy-password@proxy.example',
  }, prompt: 'x' }
  await runStore.create({ run, startPayload: payload, localContext: { account_id: accountId } })
  const descriptor = await runStore.get('run1')
  assert.deepEqual(descriptor.start_payload.provider, { id: 'provider1', model: 'm' })
  assert.equal(JSON.stringify(descriptor).includes('provider-secret'), false)
  assert.equal(JSON.stringify(descriptor).includes('proxy-password'), false)
  await runStore.markTerminal('run1', 'completed', 'done')
  await assert.rejects(runStore.create({ run, startPayload: payload, localContext: { account_id: accountId } }), /descriptor_conflict/)
  await runStore.close()
  console.log('vibe local attachment contract: PASS')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
