import assert from 'node:assert/strict'
import { spawn } from 'node:child_process'
import { mkdtemp, rm } from 'node:fs/promises'
import http from 'node:http'
import os from 'node:os'
import path from 'node:path'
import readline from 'node:readline'
import { fileURLToPath } from 'node:url'

import { identityOf, makeFrame, parseOutboundLine } from '../electron/vibeAgent/runtime/protocol.mjs'

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)))
const temporary = await mkdtemp(path.join(os.tmpdir(), 'vibe-pi-cancel-'))
const identity = {
  run_id: 'cancel-run',
  turn_id: 'cancel-turn',
  request_id: 'cancel-request',
}
let child
let requestSeen = false
let requestClosed = false
let abortSent = false

const server = http.createServer((_request, response) => {
  requestSeen = true
  response.writeHead(200, {
    'Content-Type': 'text/event-stream',
    'Cache-Control': 'no-cache',
    Connection: 'keep-alive',
  })
  response.write(`data: ${JSON.stringify({
    id: 'cancel-stream',
    object: 'chat.completion.chunk',
    created: 1,
    model: 'cancel-model',
    choices: [{ index: 0, delta: { role: 'assistant' }, finish_reason: null }],
  })}\n\n`)
  response.on('close', () => { requestClosed = true })
  setTimeout(() => {
    if (!child?.stdin?.writable || abortSent) return
    abortSent = true
    child.stdin.write(`${makeFrame(identity, 'abort', { reason: 'user_cancelled' }).serialized}\n`)
  }, 100)
})

try {
  await new Promise((resolve, reject) => {
    server.once('error', reject)
    server.listen(0, '127.0.0.1', resolve)
  })
  const address = server.address()
  assert.ok(address && typeof address === 'object')
  const start = makeFrame(identity, 'start', {
    execution_mode: 'local',
    system_prompt: '只回答用户问题。',
    prompt: '请等待后再回答。',
    tools: [],
    pi_session: {
      schema: 'vibe.pi_session.v1',
      mode: 'create',
      session_id: 'cancel-session',
      directory: path.join(temporary, 'pi-session'),
      file_path: path.join(temporary, 'pi-session', 'session.jsonl'),
      format_version: 3,
      bootstrap_messages: [],
      bootstrap_sequence: 0,
    },
    provider: {
      id: 'cancel-provider',
      model: 'cancel-model',
      api: 'openai-completions',
      mode: 'direct',
      base_url: `http://127.0.0.1:${address.port}/v1`,
      api_key: 'cancel-test-key',
      reasoning: false,
    },
    options: {
      max_retries: 0,
      timeout_ms: 30_000,
      tool_choice: 'auto',
      session_id: 'cancel-session',
    },
  })
  const electron = path.join(root, 'node_modules', '.bin', process.platform === 'win32' ? 'electron.cmd' : 'electron')
  child = spawn(electron, [path.join(root, 'electron', 'vibeAgent', 'runtime', 'runner.mjs')], {
    cwd: root,
    stdio: ['pipe', 'pipe', 'pipe'],
    env: {
      PATH: process.env.PATH,
      LANG: process.env.LANG || 'C',
      TMPDIR: process.env.TMPDIR || os.tmpdir(),
      ELECTRON_RUN_AS_NODE: '1',
      NODE_NO_WARNINGS: '1',
      VIBE_PI_APP_ROOT: root,
      VIBE_PI_PARENT_PID: String(process.pid),
    },
  })
  let stderr = ''
  const frames = []
  child.stderr.on('data', chunk => { stderr += String(chunk) })
  const finished = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      child.kill()
      reject(new Error('cancel test timed out'))
    }, 10_000)
    child.once('error', reject)
    child.once('close', code => {
      clearTimeout(timeout)
      if (code !== 0) reject(new Error(`runner exited ${code}: ${stderr}`))
      else resolve()
    })
  })
  const output = readline.createInterface({ input: child.stdout, crlfDelay: Infinity })
  output.on('line', line => {
    const frame = parseOutboundLine(line, identityOf(start.frame))
    frames.push(frame)
    if (frame.type === 'session_open') {
      child.stdin.write(`${makeFrame(identity, 'session_open_result', { accepted: true }, { reply_to: frame.message_id }).serialized}\n`)
    }
  })
  child.stdin.write(`${start.serialized}\n`)
  await finished

  assert.equal(requestSeen, true)
  assert.equal(abortSent, true)
  assert.equal(requestClosed, true)
  assert.equal(frames.some(frame => frame.type === 'aborted'), true)
  assert.equal(frames.find(frame => frame.type === 'session_checkpoint')?.payload.phase, 'aborted')
  assert.equal(frames.find(frame => frame.type === 'done')?.payload.status, 'aborted')
  assert.equal(frames.some(frame => frame.type === 'candidate_final'), false)
  console.log('vibe runner cancel contract: PASS')
} finally {
  await new Promise(resolve => server.close(resolve))
  await rm(temporary, { recursive: true, force: true })
}
