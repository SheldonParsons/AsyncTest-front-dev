import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { LocalSessionStore } from '../electron/vibeAgent/session/localSessionStore.node.js'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-local-session-'))
try {
  let store = new LocalSessionStore({ rootPath: root })
  await store.create({
    sessionId: 'session-1', accountId: 'account-1', projectId: 'project-1',
    title: '新的需求对话', providerId: 'provider-1', draft: '草稿',
  })
  await store.append({ sessionId: 'session-1', accountId: 'account-1', role: 'user', content: '旧问题' })
  await store.append({
    sessionId: 'session-1', accountId: 'account-1', role: 'assistant', content: '{"summary":"历史摘要"}',
    meta: { purpose: 'context_checkpoint', private_checkpoint: true }, internal: true,
  })
  await store.append({ sessionId: 'session-1', accountId: 'account-1', role: 'user', content: '新问题' })
  await store.update('session-1', { accountId: 'account-1', title: '总结标题', providerId: 'provider-2', draft: '新草稿' })
  await store.close()

  // Simulate a crash in the middle of the final append. A new Main process
  // repairs only that partial tail and recovers next_sequence from JSONL.
  await fs.appendFile(path.join(root, 'session-1', 'events.jsonl'), '{"partial":', 'utf8')
  store = new LocalSessionStore({ rootPath: root })
  const rows = await store.events('session-1', { accountId: 'account-1' })
  assert.equal(rows.length, 3)
  const appended = await store.append({ sessionId: 'session-1', accountId: 'account-1', role: 'assistant', content: '新回答' })
  assert.equal(appended.sequence, 4)
  const manifest = await store.manifest('session-1', { accountId: 'account-1' })
  assert.equal(manifest.provider_id, 'provider-2')
  assert.equal(manifest.title, '总结标题')
  assert.equal(manifest.draft, '新草稿')
  assert.equal((await store.list({ accountId: 'account-2' })).length, 0)
  await assert.rejects(store.events('session-1', { accountId: 'account-2' }), /account_drift/)
  const history = await store.history('session-1', { accountId: 'account-1' })
  assert.equal(history[0].role, 'user')
  assert.equal(history[0].content, '旧问题')
  assert.match(history[1].content, /历史摘要/)
  assert.equal(history.at(-1).content, '新回答')
  await store.close()
  console.log('vibe local session store contract: PASS')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
