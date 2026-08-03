import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const settings = read('src/views/electron_views/vibe/settings/index.vue')
const component = read('src/views/electron_views/vibe/settings/VibeKnowledgeApiModelSettings.vue')
const api = read('src/views/electron_views/vibe/api.ts')

assert.match(settings, />\s*ReRank API 模型配置\s*</, 'Admin Settings must expose a dedicated rerank page')
assert.match(settings, />\s*Embedding API 模型配置\s*</, 'Admin Settings must expose a dedicated embedding page')
assert.match(settings, /VibeKnowledgeApiModelSettings role="rerank"/, 'rerank page must use the dedicated knowledge model component')
assert.match(settings, /VibeKnowledgeApiModelSettings role="embedding"/, 'embedding page must use the dedicated knowledge model component')

assert.match(api, /GET', `\/vibe\/admin\/knowledge-model-configs\/\$\{role\}`/, 'config must load from the server-owned role endpoint')
assert.match(api, /PATCH', `\/vibe\/admin\/knowledge-model-configs\/\$\{role\}`/, 'config must persist to the server-owned role endpoint')
assert.doesNotMatch(api, /interface VibeKnowledgeApiModelConfig[\s\S]*?\n}\n[\s\S]*?api_key:/, 'read model must never expose a stored api key')

assert.match(component, /provider_type: 'dashscope'/, 'the first version must remain bound to DashScope')
assert.match(component, /https:\/\/dashscope\.aliyuncs\.com\/compatible-api\/v1\/reranks/, 'rerank must use the OpenAI-compatible DashScope endpoint')
assert.doesNotMatch(component, /api\/v1\/services\/rerank/, 'the retired native rerank path must not return')
assert.match(component, /DashScope OpenAI-compatible API/, 'rerank protocol label must match its wire contract')
assert.match(component, /type="password"/, 'api key must use a secret input')
assert.match(component, /autocomplete="new-password"/, 'browser must not refill the api key from stored credentials')
assert.match(component, /apiKeyConfigured \? '已配置；留空表示保持不变'/, 'read path must expose configuration state without the secret')
assert.match(component, /if \(apiKey\.value\.trim\(\)\) payload\.api_key =/, 'empty api key must preserve the existing write-only secret')
assert.doesNotMatch(component, /item\.api_key\b/, 'server response must never be copied into the secret input')

assert.match(component, /max="10"/, 'embedding batch size must enforce the DashScope maximum')
assert.doesNotMatch(component, /document_instruct/, 'DashScope v4 must not send instruct for document embeddings')
assert.match(component, /query_instruct/, 'embedding config must support query-role instructions')
assert.match(component, /仅用于 text_type=query/, 'query instruct must state its native DashScope boundary')
assert.doesNotMatch(component, /top_n/, 'rerank must score the complete frozen candidate pool without a configurable cutoff')
assert.match(component, /不会切换到本地模型或其他模型/, 'the UI must state the no-fallback contract')

console.log('vibe knowledge api model settings contract: PASS')
