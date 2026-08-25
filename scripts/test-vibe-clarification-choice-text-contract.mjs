import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(
  path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatComposer.vue'),
  'utf8',
)

assert.match(source, /<span class="choice-label">\{\{ item\.label \}\}<\/span>/)
assert.doesNotMatch(source, /class="choice-label"[^>]*v-html/)

console.log('vibe clarification choice text contract: PASS')
