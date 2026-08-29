import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const viewSource = fs.readFileSync(viewPath, 'utf8')

assert.deepEqual(parse(viewSource, { filename: viewPath }).errors, [])
assert.match(viewSource, /\.conversation-rail\s*\{[^}]*left:\s*14px;/)
assert.match(viewSource, /\.conversation-rail-row\.hover \.conversation-rail-line\s*\{[^}]*width:\s*28px;/)
assert.match(
  viewSource,
  /\.timeline\s*\{[^}]*padding:\s*84px\s+max\(28px, calc\(\(100% - 760px\) \/ 2\)\)\s+24px\s+max\(52px, calc\(\(100% - 760px\) \/ 2\)\);/,
)

console.log('vibe conversation rail spacing contract: PASS')
