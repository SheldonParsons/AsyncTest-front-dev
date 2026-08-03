import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

const source = fs.readFileSync(
  new URL('../src/utils/authNavigationPolicy.ts', import.meta.url),
  'utf8',
)
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020,
    strict: true,
  },
}).outputText
const module = { exports: {} }
vm.runInNewContext(compiled, {
  module,
  exports: module.exports,
})

const {
  isAuthenticationFailure,
  isProtectedVibePath,
  isVibeContext,
  unauthenticatedLocation,
} = module.exports

const protectedPaths = [
  '/vibe/knowledge',
  '/vibe/browser',
  '/vibe/settings',
  '/vibe/settings/trace',
  '/vibe/chat',
]
for (const path of protectedPaths) {
  assert.equal(isProtectedVibePath(path), true, `${path} should be protected`)
}
assert.equal(isProtectedVibePath('/vibe'), false)

assert.equal(isVibeContext('/vibe/knowledge', {}), true)
assert.equal(isVibeContext('/dashboard', { windowKey: 'vibe-workbench' }), true)
assert.equal(isVibeContext('/dashboard', { windowKey: 'main' }), false)

assert.equal(
  JSON.stringify(unauthenticatedLocation({
    path: '/vibe/knowledge',
    query: { windowKey: 'vibe-workbench', project: 'do-not-preserve' },
    electron: true,
  })),
  JSON.stringify({ name: 'vibeWorkbench', query: { windowKey: 'vibe-workbench' } }),
)
assert.equal(
  JSON.stringify(unauthenticatedLocation({ path: '/dashboard', query: {}, electron: true })),
  JSON.stringify({ name: 'dashboard' }),
)
assert.equal(
  JSON.stringify(unauthenticatedLocation({ path: '/home', query: {}, electron: false })),
  JSON.stringify({ name: 'login' }),
)

assert.equal(isAuthenticationFailure(401, {}), true)
assert.equal(isAuthenticationFailure(403, { detail: 'token expired' }), true)
assert.equal(isAuthenticationFailure(403, { detail: 'not a member', code: 302 }), false)
assert.equal(isAuthenticationFailure(403, { code: 302 }), false)
assert.equal(isAuthenticationFailure(403, { message: 'permission denied' }), false)
assert.equal(isAuthenticationFailure(500, { detail: 'server error' }), false)

console.log('vibe auth navigation contract: 18/18')
