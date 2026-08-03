import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { compileScript, parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const personalPath = path.join(
  root,
  'src/views/electron_views/vibe/VibeModelSettings.vue',
)
const adminPath = path.join(
  root,
  'src/views/electron_views/vibe/settings/index.vue',
)
const personalSource = fs.readFileSync(personalPath, 'utf8')
const adminSource = fs.readFileSync(adminPath, 'utf8')

for (const [filename, source] of [
  [personalPath, personalSource],
  [adminPath, adminSource],
]) {
  const parsed = parse(source, { filename })
  assert.deepEqual(parsed.errors, [])
  compileScript(parsed.descriptor, { id: filename })
}

assert.match(personalSource, /<input v-model="enhancedModel"/)
assert.match(personalSource, /<input v-model="lightModel"/)
assert.doesNotMatch(
  personalSource,
  /:value="DEEPSEEK_(?:ENHANCED|LIGHT)_MODEL" readonly/,
)
assert.match(
  personalSource,
  /mini:\s*lightModel\.value\.trim\(\)[\s\S]*strong:\s*enhancedModel\.value\.trim\(\)/,
)
assert.match(
  personalSource,
  /mini:\s*String\(provider\.model_config\?\.mini[\s\S]*strong:\s*String\(provider\.model_config\?\.strong/,
)

for (const source of [personalSource, adminSource]) {
  assert.match(
    source,
    /const DEEPSEEK_ENHANCED_MODEL = 'deepseek-v4-flash'/,
  )
  assert.match(
    source,
    /const DEEPSEEK_LIGHT_MODEL = 'deepseek-v4-flash'/,
  )
}

assert.match(adminSource, /<input v-model="adminStrongModel"/)
assert.match(adminSource, /<input v-model="adminLightModel"/)

console.log('vibe DeepSeek model config contract: PASS')
