import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const source = fs.readFileSync(viewPath, 'utf8')
const functionStart = source.indexOf('async function sendLocalPiTurn(')
const functionEnd = source.indexOf('\nasync function sendFoundationTurn(', functionStart)
assert(functionStart >= 0 && functionEnd > functionStart, 'local Pi turn must remain the turn request owner')
const sendTurn = source.slice(functionStart, functionEnd)

assert.match(
  sendTurn,
  /const project = knowledgeStatsProjectId\(selectedProjectId\.value\)/,
  'turn project must use the shared outer numeric project identity validator',
)
assert.match(
  sendTurn,
  /project_id:\s*String\(project\)/,
  'local Pi bootstrap must receive the validated project identity',
)
assert.doesNotMatch(sendTurn, /streamFoundationTurn|streamServerTurn|turnPayload/)

const createSession = source.match(/createVibeSession\(([^,]+),/)
assert(createSession, 'session creation must remain explicit')
assert.equal(createSession[1].trim(), 'ownerProjectId', 'session creation must use its frozen owner identity')
assert.match(
  source,
  /const ownerProjectId = vibeProject\.value\.id[\s\S]*createVibeSession\(ownerProjectId,/,
  'session ownership must keep the VibeProject UUID',
)
assert(!sendTurn.includes('String(vibeProject.value.id)'), 'VibeProject UUID must never authorize a knowledge turn')

console.log('vibe turn project identity contract: PASS')
