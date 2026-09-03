import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const source = fs.readFileSync(viewPath, 'utf8')

// Electron Vibe runs are admitted directly by Main (which performs
// agent-bootstrap); the renderer has no server Agent fallback.
assert.doesNotMatch(source, /\bcreateFoundationAgentRun\b/)
assert.doesNotMatch(source, /\breadElectronAgentIdentity\b/)
assert.doesNotMatch(source, /\brunOnElectronAgent\b/)

const localTurn = source.indexOf('async function sendLocalPiTurn(')
const dispatch = source.indexOf('async function sendFoundationTurn(')
assert.ok(localTurn >= 0 && dispatch > localTurn, 'local turn and dispatcher must remain explicit')
const dispatchSource = source.slice(dispatch, source.indexOf('\nfunction handleDraftKeydown(', dispatch))
assert.match(dispatchSource, /if \(useLocalPiAgent\(\)\) \{[\s\S]*?sendLocalPiTurn\(content, opts \|\| \{\}\)/)
assert.doesNotMatch(dispatchSource, /streamFoundationTurn|streamServerTurn|turnPayload/)

const selectorStart = source.indexOf('function useLocalPiAgent()')
const selectorEnd = source.indexOf('\nfunction localKnowledgeBaseUrl()', selectorStart)
assert.ok(selectorStart >= 0 && selectorEnd > selectorStart, 'host selector must remain local and testable')
const selector = source.slice(selectorStart, selectorEnd)
assert.match(selector, /return true/)
assert.match(source, /function localPiAgentEnabled\(\): boolean \{[\s\S]*startLocal/)
assert.doesNotMatch(source, /localPiAgentConfigured|vibe-agent-execution|VITE_VIBE_AGENT_MODE/)

console.log('vibe agent startup selection contract: PASS')
