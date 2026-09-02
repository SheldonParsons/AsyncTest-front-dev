import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const files = [
  'src/views/electron_views/vibe/knowledge/index.vue',
  'src/views/electron_views/vibe/VibeModelSettings.vue',
  'src/views/electron_views/vibe/settings/index.vue',
]
const source = files.map(file => fs.readFileSync(path.join(root, file), 'utf8')).join('\n')

for (const phrase of ['本地 Pi', 'Pi Agent', 'Pi 任务', 'Pi 最终', 'Pi Trace', 'Pi 可', 'local Pi run']) {
  assert.equal(source.includes(phrase), false, `public copy leaked internal term: ${phrase}`)
}

const knowledge = fs.readFileSync(path.join(root, files[0]), 'utf8')
assert.match(knowledge, /getVibeLLMModelPicker\(localSession \? undefined : \(sessionId \|\| undefined\)\)/)
assert.match(knowledge, /manifest\?\.provider_id/)
assert.ok(knowledge.includes('!/(?:\\bpi\\b|electron|agent|runner)/i.test(raw)'))
assert.doesNotMatch(knowledge, /ElMessage\.error\(`本地 Pi/)
const settings = fs.readFileSync(path.join(root, files[2]), 'utf8')
assert.match(settings, /if \(raw\.startsWith\('pi\.'\)\) return EVENT_TYPE_LABELS\[raw\] \|\| '本机运行事件'/)
assert.match(settings, /const publicTitle = title\.startsWith\('pi\.'\) \? '' : title/)

console.log('vibe local agent public copy contract: PASS')
