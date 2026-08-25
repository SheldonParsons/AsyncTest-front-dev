import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const viewSource = fs.readFileSync(viewPath, 'utf8')

const parsed = parse(viewSource, { filename: viewPath })
assert.deepEqual(parsed.errors, [])

assert.match(viewSource, /\.main-head-actions\s*\{[^}]*flex:\s*0 0 auto;/)
assert.match(viewSource, /\.main-head-leading\s*\{[^}]*flex:\s*1 1 auto;[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/)
assert.match(viewSource, /\.main-head-copy\s*\{[^}]*position:\s*relative;[^}]*flex:\s*1 1 auto;[^}]*min-width:\s*0;[^}]*overflow:\s*hidden;/)
assert.match(viewSource, /\.main-head-copy h1\s*\{[^}]*overflow:\s*hidden;[^}]*white-space:\s*nowrap;/)
assert.match(viewSource, /\.main-head\.compact \.main-head-copy h1\s*\{[^}]*-webkit-mask-image:\s*linear-gradient\(to right, #000 0, #000 calc\(100% - 18px\), transparent 100%\);[^}]*mask-image:\s*linear-gradient\(to right, #000 0, #000 calc\(100% - 18px\), transparent 100%\);/)
assert.doesNotMatch(viewSource, /\.main-head\.compact \.main-head-copy::after/)
assert.doesNotMatch(viewSource, /\.main-head\.compact[^}]*backdrop-filter:/)

console.log('vibe header title overflow contract: PASS')
