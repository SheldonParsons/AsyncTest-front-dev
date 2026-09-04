import assert from 'node:assert/strict'
import fs from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import { LocalRunStore } from '../electron/vibeAgent/run/localRunStore.node.js'
import { LocalSessionStore } from '../electron/vibeAgent/session/localSessionStore.node.js'
import { LocalTraceStore } from '../electron/vibeAgent/trace/localTraceStore.node.js'

const root = await fs.mkdtemp(path.join(os.tmpdir(), 'vibe-session-removal-'))
try {
  const accountId = 'account-1'
  const sessionStore = new LocalSessionStore({ rootPath: path.join(root, 'sessions') })
  const runStore = new LocalRunStore({ rootPath: path.join(root, 'runs') })
  const traceStore = new LocalTraceStore({ rootPath: path.join(root, 'traces') })
  for (const suffix of ['one', 'two']) {
    const sessionId = `session-${suffix}`
    const runId = `run-${suffix}`
    const traceId = `trace-${suffix}`
    await sessionStore.create({ sessionId, accountId, projectId: 'project-1' })
    await runStore.create({
      run: {
        schema: 'electron_agent_run.v1', execution_host: 'electron', execution_mode: 'local',
        run_id: runId, account_id: accountId, session_id: sessionId,
        turn_id: `turn-${suffix}`, request_id: `request-${suffix}`,
        project_id: 'project-1', trace_id: traceId,
      },
      startPayload: { system_prompt: 'test', tools: [], provider: {}, options: {} },
      localContext: { account_id: accountId },
    })
    await traceStore.create({
      traceId, accountId, sessionId, goalId: `turn-${suffix}`,
      runId, projectId: 'project-1',
    })
    await traceStore.append({ traceId, accountId, projectId: 'project-1', name: 'agent.start' })
  }

  // Session deletion must still remove a trace whose JSONL ended mid-write.
  await fs.appendFile(path.join(root, 'traces', 'trace-one', 'events.jsonl'), '{"partial":')
  assert.equal((await runStore.listSession('session-one', { accountId })).length, 1)
  assert.equal((await traceStore.listSession('session-one', { accountId })).length, 1)
  assert.equal((await runStore.listSession('session-one', { accountId: 'account-2' })).length, 0)

  await traceStore.removeSession('session-one', { accountId })
  await runStore.removeSession('session-one', { accountId })
  await sessionStore.remove('session-one', { accountId })

  assert.equal(await runStore.get('run-one', { accountId }), null)
  assert.equal((await traceStore.listSession('session-one', { accountId })).length, 0)
  await assert.rejects(sessionStore.manifest('session-one', { accountId }), /session_not_found/)
  assert.equal((await runStore.listSession('session-two', { accountId })).length, 1)
  assert.equal((await traceStore.listSession('session-two', { accountId })).length, 1)
  assert.equal((await sessionStore.manifest('session-two', { accountId })).session_id, 'session-two')

  const host = await fs.readFile(new URL('../electron/vibeAgent/agentHost.node.js', import.meta.url), 'utf8')
  const ipc = await fs.readFile(new URL('../electron/vibeAgent/ipcMain.node.js', import.meta.url), 'utf8')
  const view = await fs.readFile(new URL('../src/views/electron_views/vibe/knowledge/index.vue', import.meta.url), 'utf8')
  const deleteButton = view.slice(view.indexOf('class="session-delete"'), view.indexOf('</button>', view.indexOf('class="session-delete"')))
  assert.doesNotMatch(deleteButton, /sessionRuntimeState|\bsending\b/)
  assert.match(deleteButton, /<svg width="14" height="14"/)
  assert.match(host, /async terminateSession[\s\S]*session_deleted/)
  assert.match(ipc, /register\("vibeAgent:sessionRemove"[\s\S]*host\.terminateSession[\s\S]*traceStore\.removeSession[\s\S]*runStore\.removeSession[\s\S]*sessionStore\.remove/)

  await Promise.all([sessionStore.close(), runStore.close(), traceStore.close()])
  console.log('vibe session removal contract: PASS')
} finally {
  await fs.rm(root, { recursive: true, force: true })
}
