import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const source = fs.readFileSync(viewPath, 'utf8')

// The renderer has one owner for each execution host.  Local runs are
// admitted directly by Main (which performs agent-bootstrap); server is an
// explicit rollback and must not pass through the old host selector.
assert.doesNotMatch(source, /\bcreateFoundationAgentRun\b/)
assert.doesNotMatch(source, /\breadElectronAgentIdentity\b/)
assert.doesNotMatch(source, /\brunOnElectronAgent\b/)

const localTurn = source.indexOf('async function sendLocalPiTurn(')
const dispatch = source.indexOf('async function sendFoundationTurn(')
assert.ok(localTurn >= 0 && dispatch > localTurn, 'local turn and dispatcher must remain explicit')
const dispatchSource = source.slice(dispatch, source.indexOf('\nfunction handleDraftKeydown(', dispatch))
assert.match(dispatchSource, /if \(useLocalPiAgent\(\)\) \{[\s\S]*?sendLocalPiTurn\(content, opts \|\| \{\}\)/)
assert.match(dispatchSource, /Server is an explicit rollback path only\./)
assert.match(dispatchSource, /await streamServerTurn\(turnPayload, \{[\s\S]*?onEvent,/)

const selectorStart = source.indexOf('function localPiAgentConfigured()')
const selectorEnd = source.indexOf('\nfunction localPiAgentEnabled()', selectorStart)
assert.ok(selectorStart >= 0 && selectorEnd > selectorStart, 'host selector must remain local and testable')
const selector = source.slice(selectorStart, selectorEnd)
assert.match(selector, /stored === 'server'\) return false/)
assert.match(selector, /configured === 'server'\) return false/)
assert.match(selector, /VITE_IS_ELECTRON/)

console.log('vibe agent startup selection contract: PASS')
