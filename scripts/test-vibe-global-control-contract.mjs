import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relative => fs.readFileSync(path.join(root, relative), 'utf8')
const settings = read('src/views/electron_views/vibe/settings/index.vue')
const control = read('src/views/electron_views/vibe/settings/VibeGlobalControlSettings.vue')
const api = read('src/views/electron_views/vibe/api.ts')
const policyPath = path.join(root, 'src/views/electron_views/vibe/settings/attachmentOssBaseUrlPolicy.ts')

async function importTs(file) {
  const result = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
    reportDiagnostics: true,
  })
  assert.deepEqual(result.diagnostics || [], [])
  return import(`data:text/javascript;base64,${Buffer.from(result.outputText).toString('base64')}`)
}

const policy = await importTs(policyPath)

assert.match(settings, /activeKey === 'admin-global'/, 'Admin Settings must expose the global control section')
assert.match(settings, />\s*全局控制\s*</, 'global control navigation must use the requested label')
assert.match(settings, /<VibeGlobalControlSettings\s*\/>/, 'settings must delegate to one focused control component')

assert.match(control, /v-model="draft\.disabled" type="checkbox"/, 'disable conversation must be an explicit checkbox')
assert.match(control, /v-if="draft\.disabled" class="reply-field"/, 'custom reply input must only appear while disabled')
assert.match(control, /v-model="draft\.message"/, 'admin must control the exact maintenance reply')
assert.match(control, /updateVibeConversationControl/, 'save must use the server-owned global control API')
assert.deepEqual(parse(control, { filename: 'VibeGlobalControlSettings.vue' }).errors, [])

assert.match(control, />\s*附件 OSS 存储地址\s*</, 'global control must expose the attachment namespace URL')
assert.match(control, /v-model="draft\.attachment_oss_base_url"/, 'namespace URL must be server-backed')
assert.match(control, /https:\/\/asynctest\.oss-cn-shenzhen\.aliyuncs\.com\/vibe\/files\/dev/, 'field must show the requested environment example')
assert.match(control, /当前环境的服务端附件命名空间；下载按钮仍经服务端鉴权，Bucket 公私属性由部署方承担；不填写任何密钥/, 'field must explain the deployment-owned bucket boundary')
assert.doesNotMatch(control, /不会公开此地址|存储层不可公开|私有 Bucket/, 'frontend must not promise a private bucket ACL')
assert.doesNotMatch(control, /type="password"/, 'global control must never ask for an OSS credential')
assert.doesNotMatch(`${control}\n${api}`, /access[_-]?key|secret[_-]?key|session[_-]?token/i, 'frontend must not accept or expose OSS credentials')

assert.equal(policy.normalizeAttachmentOssBaseUrlInput('  https://oss.example.test/vibe/files/dev/  '), 'https://oss.example.test/vibe/files/dev/')
assert.equal(policy.attachmentOssBaseUrlValidationMessage(''), '', 'empty means not configured')
assert.equal(policy.attachmentOssBaseUrlValidationMessage('   '), '', 'trimmed empty means not configured')
assert.equal(policy.attachmentOssBaseUrlValidationMessage('https://oss.example.test/vibe/files/dev'), '')
assert.notEqual(policy.attachmentOssBaseUrlValidationMessage('http://oss.example.test/vibe/files/dev'), '', 'HTTP must get a basic HTTPS hint')
assert.notEqual(policy.attachmentOssBaseUrlValidationMessage('not a url'), '', 'malformed input must get a basic HTTPS hint')

assert.match(api, /GET', '\/vibe\/admin\/conversation-control'/, 'global control must load from the backend')
assert.match(api, /PATCH', '\/vibe\/admin\/conversation-control'/, 'global control must persist in the backend')
assert.match(api, /attachment_oss_base_url:\s*string/, 'GET item must type the exact backend field')
assert.match(api, /attachment_oss_base_url:\s*string[\s\S]*PATCH', '\/vibe\/admin\/conversation-control'/, 'PATCH payload must include the current namespace URL')

console.log('vibe global control contract: PASS')
