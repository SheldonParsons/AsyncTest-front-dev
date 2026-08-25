import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const apiPath = path.join(root, 'src/views/electron_views/vibe/api.ts')
const conversationPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const modelSettingsPath = path.join(root, 'src/views/electron_views/vibe/VibeModelSettings.vue')
const adminSettingsPath = path.join(root, 'src/views/electron_views/vibe/settings/index.vue')

const apiSource = fs.readFileSync(apiPath, 'utf8')
const conversationSource = fs.readFileSync(conversationPath, 'utf8')
const modelSettingsSource = fs.readFileSync(modelSettingsPath, 'utf8')
const adminSettingsSource = fs.readFileSync(adminSettingsPath, 'utf8')

for (const [file, source] of [
  [conversationPath, conversationSource],
  [modelSettingsPath, modelSettingsSource],
  [adminSettingsPath, adminSettingsSource],
]) {
  assert.deepEqual(parse(source, { filename: file }).errors, [])
}

assert.match(apiSource, /export interface VibeSessionPage\s*\{[\s\S]*sessions:\s*VibeSession\[\][\s\S]*next_cursor:\s*string \| null/)
assert.match(apiSource, /listVibeSessions\([\s\S]*options:\s*\{ cursor\?: string; limit\?: number \}[\s\S]*Promise<VibeSessionPage>/)
assert.match(apiSource, /new URLSearchParams\(\{ limit: String\(options\.limit \?\? 100\) \}\)/)
assert.match(apiSource, /if \(options\.cursor\) query\.set\('cursor', options\.cursor\)/)

assert.match(conversationSource, /v-if="sessionNextCursor"[\s\S]*@click="loadMoreSessions"/)
assert.match(conversationSource, /const sessionNextCursor = ref\(''\)/)
assert.match(conversationSource, /async function loadMoreSessions\(\)[\s\S]*listVibeSessions\(ownerId, \{ cursor \}\)/)
assert.match(conversationSource, /const seen = new Set\(sessions\.value\.map\(item => item\.id\)\)/)

assert.match(apiSource, /schema:\s*'llm_provider_settings\.v1'/)
assert.match(apiSource, /export function getVibeLLMModelPicker\([\s\S]*\/vibe\/llm\/model-picker/)
assert.match(conversationSource, /getVibeLLMModelPicker/)
assert.doesNotMatch(conversationSource, /getVibeLLMRuntimeConfig|listVibeLLMProviders/)
assert.match(conversationSource, /if \(!llmProviders\.value\.length\) await loadModelConfig/)
assert.match(conversationSource, /const candidate = String\(picker\.selected_provider_id \|\| ''\)/)
assert.doesNotMatch(conversationSource, /session\?\.llm_provider_id \|\| String\(picker\.selected_provider_id/)

assert.match(apiSource, /has_api_key\?: boolean/)
assert.doesNotMatch(apiSource, /export interface VibeLLMProviderConfig\s*\{[\s\S]*?\n\s*api_key:\s*string/)
assert.doesNotMatch(modelSettingsSource, /getVibeLLMRuntimeConfig/)
assert.match(modelSettingsSource, /editingProvider\?\.has_api_key \? '已配置，留空则保持不变'/)
assert.match(modelSettingsSource, /if \(apiKey\) payload\.api_key = apiKey/)
assert.match(adminSettingsSource, /adminEditingProvider\?\.has_api_key \? '已配置，留空则保持不变'/)
assert.match(adminSettingsSource, /if \(apiKey\) payload\.api_key = apiKey/)

console.log('vibe data fetch contract: PASS')
