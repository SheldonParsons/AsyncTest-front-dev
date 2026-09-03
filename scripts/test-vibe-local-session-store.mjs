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
  await store.append({ sessionId: 'session-1', accountId: 'account-1', role: 'assistant', content: '旧回答' })
  await store.append({ sessionId: 'session-1', accountId: 'account-1', role: 'user', content: '新问题' })
  const piSession = await store.piSession('session-1', { accountId: 'account-1' })
  assert.equal(piSession.mode, 'create')
  assert.equal(piSession.schema, 'vibe.pi_session.v1')
  await fs.writeFile(piSession.file_path, `${JSON.stringify({
    type: 'session', version: 3, id: 'pi-session-1', timestamp: new Date().toISOString(), cwd: os.homedir(),
  })}\n`, { mode: 0o600 })
  await store.recordPiSession('session-1', {
    accountId: 'account-1', piSessionId: 'pi-session-1', entryCount: 0,
    contextMessageCount: 0, bootstrapSequence: 3, resumed: false,
  })
  assert.equal((await store.piSession('session-1', { accountId: 'account-1' })).mode, 'open')
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
  assert.equal(manifest.pi_session.initialized, true)
  assert.equal(manifest.pi_session.pi_session_id, 'pi-session-1')
  assert.equal(manifest.pi_session.migrated_through_sequence, 3)
  assert.equal((await store.list({ accountId: 'account-2' })).length, 0)
  await assert.rejects(store.events('session-1', { accountId: 'account-2' }), /account_drift/)
  const history = await store.history('session-1', { accountId: 'account-1' })
  assert.equal(history[0].role, 'user')
  assert.equal(history[0].content, '旧问题')
  assert.equal(history[1].content, '旧回答')
  assert.equal(history.at(-1).content, '新回答')
  await store.close()
  console.log('vibe local session store contract: PASS')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
