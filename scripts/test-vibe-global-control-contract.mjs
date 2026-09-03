import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const settings = read('src/views/electron_views/vibe/settings/index.vue')
const control = read('src/views/electron_views/vibe/settings/VibeGlobalControlSettings.vue')
const api = read('src/views/electron_views/vibe/api.ts')

assert.match(settings, /activeKey === 'admin-global'/, 'Admin Settings must expose the global control section')
assert.match(settings, />\s*全局控制\s*</, 'global control navigation must use the requested label')
assert.match(settings, /<VibeGlobalControlSettings\s*\/>/, 'settings must delegate to one focused control component')

assert.match(control, /v-model="draft\.disabled" type="checkbox"/, 'disable conversation must be an explicit checkbox')
assert.match(control, /v-if="draft\.disabled" class="reply-field"/, 'custom reply input must only appear while disabled')
assert.match(control, /v-model="draft\.message"/, 'admin must control the exact maintenance reply')
assert.match(control, /updateVibeConversationControl/, 'save must use the server-owned global control API')
assert.deepEqual(parse(control, { filename: 'VibeGlobalControlSettings.vue' }).errors, [])

assert.match(api, /GET', '\/vibe\/admin\/conversation-control'/, 'global control must load from the backend')
assert.match(api, /PATCH', '\/vibe\/admin\/conversation-control'/, 'global control must persist in the backend')
assert.doesNotMatch(`${control}\n${api}`, /attachment_oss_base_url/, 'local attachments must not expose server OSS configuration')

console.log('vibe global control contract: PASS')
