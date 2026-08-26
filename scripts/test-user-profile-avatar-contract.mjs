import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const profilePath = path.join(root, 'src/composables/useCurrentUserProfile.ts')
const cropPath = path.join(root, 'src/components/layout/dialogs/avatarCrop.ts')
const dialogPath = path.join(root, 'src/components/layout/dialogs/UserProfileDialog.vue')
const headerPath = path.join(root, 'src/components/layout/headers/commonHeader.vue')
const mindPath = path.join(root, 'src/mind/vue_views/index.vue')
const knowledgePath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const settingsPath = path.join(root, 'src/views/electron_views/vibe/settings/index.vue')
const indexHtmlPath = path.join(root, 'index.html')

function compile(source, moduleKind) {
  const result = ts.transpileModule(source, {
    compilerOptions: {
      module: moduleKind,
      target: ts.ScriptTarget.ES2022,
      strict: true,
    },
    reportDiagnostics: true,
  })
  assert.deepEqual(result.diagnostics || [], [])
  return result.outputText
}

function loadProfileModule() {
  const httpCalls = []
  const broadcasts = []
  const listeners = new Map()
  let listenerRegistrations = 0
  const responses = {
    get: { result: 1, msg: 'ok', data: { id: 54, username: 'tester' } },
    put: { result: 1, msg: 'ok', data: { id: 54, username: 'tester', nick_name: 'New name' } },
    post: {
      result: 1,
      msg: 'ok',
      data: {
        id: 54,
        username: 'tester',
        avatar_url: 'https://cdn.example.test/users/custom.webp?v=2',
      },
    },
  }
  const http = {
    async httpGet(url, params) {
      httpCalls.push({ method: 'GET', url, params })
      return responses.get
    },
    async httpPut(url, data) {
      httpCalls.push({ method: 'PUT', url, data })
      return responses.put
    },
    async httpPost(url, data, params, headers) {
      httpCalls.push({ method: 'POST', url, data, params, headers })
      return responses.post
    },
  }
  const vue = {
    ref: value => ({ value }),
    computed: getter => ({ get value() { return getter() } }),
  }
  const windowStub = {
    electronAPI: {
      on(channel, callback) {
        listenerRegistrations += 1
        listeners.set(channel, callback)
        return () => listeners.delete(channel)
      },
      wm: {
        async broadcast(channel, payload) {
          broadcasts.push({ channel, payload })
        },
      },
    },
  }
  const module = { exports: {} }
  const context = vm.createContext({
    module,
    exports: module.exports,
    require(specifier) {
      if (specifier === 'vue') return vue
      if (specifier === '@/utils/http') return { http }
      throw new Error(`Unexpected test import: ${specifier}`)
    },
    window: windowStub,
    Blob,
    File,
    FormData,
    URL,
    Error,
    Promise,
    Number,
    String,
    Object,
    console,
  })
  vm.runInContext(
    compile(fs.readFileSync(profilePath, 'utf8'), ts.ModuleKind.CommonJS),
    context,
    { filename: profilePath },
  )
  return {
    api: module.exports,
    httpCalls,
    broadcasts,
    listeners,
    responses,
    listenerRegistrations: () => listenerRegistrations,
  }
}

async function importCropModule() {
  const compiled = compile(fs.readFileSync(cropPath, 'utf8'), ts.ModuleKind.ES2022)
  const encoded = Buffer.from(compiled).toString('base64')
  return import(`data:text/javascript;base64,${encoded}`)
}

function functionBody(source, functionName) {
  const functionMatch = new RegExp(`(?:async\\s+)?function\\s+${functionName}\\s*\\(`).exec(source)
  assert.ok(functionMatch, `missing ${functionName} function`)
  const openingBrace = source.indexOf('{', functionMatch.index + functionMatch[0].length)
  assert.notEqual(openingBrace, -1, `missing ${functionName} function body`)
  let depth = 0
  for (let index = openingBrace; index < source.length; index += 1) {
    if (source[index] === '{') depth += 1
    if (source[index] === '}') {
      depth -= 1
      if (depth === 0) return source.slice(openingBrace + 1, index)
    }
  }
  assert.fail(`unterminated ${functionName} function body`)
}

const profileHarness = loadProfileModule()
const profileApi = profileHarness.api
const owner = profileApi.useCurrentUserProfile()

assert.equal(
  profileApi.defaultAvatarUrlForUser(null),
  'https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/99.png',
  'missing identity must retain the legacy 99.png fallback',
)
assert.equal(
  profileApi.defaultAvatarUrlForUser(54),
  'https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/1.png',
  'known identities must map into the canonical 53-image default set',
)

owner.applyProfile({ id: 54, username: 'tester', nick_name: 'Tester' })
assert.equal(owner.avatarUrl.value, 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/users/1.png')
owner.applyProfile({ avatar_url: ' https://cdn.example.test/users/custom.webp?v=1 ' })
assert.equal(owner.avatarUrl.value, 'https://cdn.example.test/users/custom.webp?v=1')

owner.ensureProfileSync()
owner.ensureProfileSync()
assert.equal(profileHarness.listenerRegistrations(), 3, 'profile and auth listeners must each be registered once per renderer')
assert.ok(profileHarness.listeners.has('auth:logout'))
assert.ok(profileHarness.listeners.has('auth:login'))
profileHarness.listeners.get(profileApi.CURRENT_USER_PROFILE_EVENT)?.({}, {
  schema: 'current_user_profile.v1',
  profile: {
    id: 54,
    username: 'tester',
    nick_name: 'Synced name',
    display_name: 'Synced name',
    avatar_url: 'https://cdn.example.test/users/custom.webp?v=remote',
  },
})
assert.equal(owner.profile.value.nick_name, 'Synced name')
assert.equal(owner.avatarUrl.value, 'https://cdn.example.test/users/custom.webp?v=remote')

owner.applyProfile({ email: 'private@example.test' }, { broadcast: true })
await Promise.resolve()
const broadcast = profileHarness.broadcasts.at(-1)
assert.equal(broadcast.channel, 'user:profile-updated')
assert.equal(broadcast.payload.schema, 'current_user_profile.v1')
assert.equal('email' in broadcast.payload.profile, false, 'cross-window payload must stay small and omit private profile fields')

profileHarness.listeners.get(profileApi.CURRENT_USER_PROFILE_EVENT)?.({}, {
  schema: 'current_user_profile.v1',
  profile: {
    id: 55,
    username: 'next-account',
    nick_name: 'Next account',
    display_name: 'Next account',
    avatar_url: '',
  },
})
assert.equal(owner.profile.value.email, '', 'an identity change must not retain fields from the previous account')

const callsBeforeWrongAvatarMime = profileHarness.httpCalls.length
await assert.rejects(
  owner.uploadAvatar(new File(['png-fallback'], 'avatar.png', { type: 'image/png' })),
  /必须为 WebP 格式/,
)
assert.equal(
  profileHarness.httpCalls.length,
  callsBeforeWrongAvatarMime,
  'a non-WebP crop result must be rejected before an upload request is sent',
)

const croppedUpload = new File(['cropped-avatar'], 'arbitrary-local-name.webp', { type: 'image/webp' })
const uploadedProfile = await owner.uploadAvatar(croppedUpload)
const uploadCall = profileHarness.httpCalls.find(call => call.method === 'POST')
assert.equal(uploadCall.url, '/user/me/avatar/')
assert.equal(uploadCall.headers['Content-Type'], 'multipart/form-data')
const multipartAvatar = uploadCall.data.get('avatar')
assert.ok(multipartAvatar instanceof File)
assert.equal(multipartAvatar.name, 'avatar.webp', 'multipart filename must not trust a caller-provided local name')
assert.equal(await multipartAvatar.text(), 'cropped-avatar')
assert.equal(uploadedProfile.avatar_url, 'https://cdn.example.test/users/custom.webp?v=2')
assert.equal(owner.avatarUrl.value, 'https://cdn.example.test/users/custom.webp?v=2')

profileHarness.responses.post = {
  result: 0,
  msg: '头像文件不合法',
  data: { avatar: ['头像图片内容无效'] },
}
await assert.rejects(
  owner.uploadAvatar(new File(['invalid-avatar'], 'avatar.webp', { type: 'image/webp' })),
  /头像图片内容无效/,
  'the upload toast must surface the backend field error instead of hiding it behind a generic message',
)

let resolveStaleUpdate
profileHarness.responses.put = new Promise(resolve => {
  resolveStaleUpdate = resolve
})
const broadcastsBeforeStaleUpdate = profileHarness.broadcasts.length
const staleUpdate = owner.updateProfile({
  nick_name: 'Old account response',
  email: 'old-account@example.test',
  mobile: '13800000000',
  sex: 1,
})
profileHarness.listeners.get('auth:logout')?.({}, {})
assert.equal(owner.profile.value, null, 'logout must immediately clear the shared owner')
resolveStaleUpdate({ result: 1, data: { id: 54, nick_name: 'Old account response' } })
await assert.rejects(staleUpdate, /登录状态已变化，请重试/)
assert.equal(owner.profile.value, null, 'a stale mutation response must not repopulate the logged-out owner')
assert.equal(profileHarness.broadcasts.length, broadcastsBeforeStaleUpdate, 'a stale mutation must not broadcast')

profileHarness.listeners.get('auth:login')?.({}, {})
await new Promise(resolve => setImmediate(resolve))
assert.equal(owner.profile.value.id, 54, 'login must invalidate and fetch the newly authenticated profile')

let resolveStaleFetch
profileHarness.responses.get = new Promise(resolve => {
  resolveStaleFetch = resolve
})
const staleFetch = owner.fetchProfile(true)
profileHarness.listeners.get(profileApi.CURRENT_USER_PROFILE_EVENT)?.({}, {
  schema: 'current_user_profile.v1',
  profile: {
    id: 54,
    username: 'tester',
    nick_name: 'Fresh broadcast',
    display_name: 'Fresh broadcast',
    avatar_url: 'https://cdn.example.test/users/custom.webp?v=fresh-broadcast',
  },
})
resolveStaleFetch({
  result: 1,
  data: {
    id: 54,
    username: 'tester',
    avatar_url: 'https://cdn.example.test/users/custom.webp?v=stale-fetch',
  },
})
await staleFetch
assert.equal(
  owner.avatarUrl.value,
  'https://cdn.example.test/users/custom.webp?v=fresh-broadcast',
  'an in-flight profile GET must not overwrite a newer cross-window profile broadcast',
)

let resolveStaleUpload
profileHarness.responses.post = new Promise(resolve => {
  resolveStaleUpload = resolve
})
const broadcastsBeforeStaleUpload = profileHarness.broadcasts.length
const staleUpload = owner.uploadAvatar(new File(['old-account-avatar'], 'avatar.webp', { type: 'image/webp' }))
profileHarness.listeners.get('auth:logout')?.({}, {})
resolveStaleUpload({
  result: 1,
  data: { id: 54, avatar_url: 'https://cdn.example.test/users/stale.webp?v=3' },
})
await assert.rejects(staleUpload, /登录状态已变化，请重试/)
assert.equal(owner.profile.value, null, 'a stale avatar response must not repopulate the logged-out owner')
assert.equal(profileHarness.broadcasts.length, broadcastsBeforeStaleUpload, 'a stale avatar response must not broadcast')

const cropApi = await importCropModule()
const encodedCrop = new Blob(['canvas-only-result'], { type: 'image/webp' })
let requestedMime = ''
let requestedQuality = 0
const cropper = {
  getResult() {
    return {
      canvas: {
        width: 512,
        height: 512,
        toBlob(callback, mime, quality) {
          requestedMime = mime
          requestedQuality = quality
          callback(encodedCrop)
        },
      },
    }
  },
}
const croppedFile = await cropApi.createCroppedAvatarFile(cropper, { lastModified: 1234 })
assert.ok(croppedFile instanceof File)
assert.notEqual(croppedFile, encodedCrop, 'crop confirmation must create a new File from the canvas Blob')
assert.equal(croppedFile.name, 'avatar.webp')
assert.equal(croppedFile.type, 'image/webp')
assert.equal(croppedFile.lastModified, 1234)
assert.equal(await croppedFile.text(), 'canvas-only-result')
assert.equal(requestedMime, 'image/webp')
assert.equal(requestedQuality, 0.88)
await assert.rejects(
  cropApi.createCroppedAvatarFile({
    getResult: () => ({
      canvas: {
        width: 512,
        height: 512,
        toBlob: callback => callback(new Blob(['png-fallback'], { type: 'image/png' })),
      },
    }),
  }, { lastModified: 1234 }),
  /无法生成 WebP 头像/,
  'the frontend must never upload a non-WebP encoder fallback to the WebP-only backend contract',
)
await assert.rejects(
  cropApi.createCroppedAvatarFile({ getResult: () => ({ canvas: null }) }),
  /没有可上传的头像裁剪结果/,
)

const dialogSource = fs.readFileSync(dialogPath, 'utf8')
const dialogSfc = parse(dialogSource, { filename: dialogPath })
assert.deepEqual(dialogSfc.errors, [])
assert.ok(dialogSfc.descriptor.scriptSetup, 'profile dialog must use a script setup block')
const dialogScript = dialogSfc.descriptor.scriptSetup.content
const confirmAvatarUploadBody = functionBody(dialogScript, 'confirmAvatarUpload')
const createCropIndex = confirmAvatarUploadBody.indexOf('createCroppedAvatarFile(cropperRef.value)')
const uploadCropIndex = confirmAvatarUploadBody.indexOf('uploadAvatar(croppedFile)')
assert.ok(createCropIndex >= 0, 'confirmation must create a File from the cropper canvas')
assert.ok(uploadCropIndex > createCropIndex, 'confirmation must upload only the File created from the cropper canvas')
const cancelCropBody = functionBody(dialogScript, 'cancelCrop')
assert.doesNotMatch(cancelCropBody, /uploadAvatar|http(?:Get|Put|Post)|\/user\//)
assert.match(dialogSource, /import\s*\{[^}]*CircleStencil[^}]*Cropper[^}]*\}\s*from\s*['"]vue-advanced-cropper['"]/s)
assert.match(dialogSource, /:stencil-component="CircleStencil"/)
assert.match(dialogSource, /:accessibleTitle="cropSourceUrl \? '调整您的图片' : '个人设置'"/)
assert.match(dialogSource, /:modalClass="cropSourceUrl \? 'avatar-crop-modal' : ''"/)
assert.match(dialogSource, /@keydown="handleCropperKeydown"/)
assert.match(dialogSource, /@ready="handleCropperReady"/)
assert.match(dialogSource, /@error="handleCropperError"/)
assert.match(dialogSource, /:transitions="false"/)
assert.match(dialogSource, /:check-orientation="false"/)
assert.match(dialogScript, /图片读取失败，请重新选择/)
assert.match(dialogScript, /cropperRef\.value\.move\(delta\[0\], delta\[1\]\)/)
assert.match(dialogScript, /const cropperCanvas\s*=\s*\{\s*width:\s*512,\s*height:\s*512,/s)
assert.match(dialogScript, /const cropperResizeImage\s*=\s*\{\s*adjustStencil:\s*false,\s*touch:\s*false,\s*wheel:\s*false\s*\}/s)
assert.match(dialogScript, /const cropperStencilProps\s*=\s*\{[\s\S]*handlers:\s*\{\},[\s\S]*lines:\s*\{\}/)
assert.match(dialogSource, /v-loading="avatarUploading"/)
assert.match(dialogSource, /type="range"[\s\S]*:min="MIN_CROP_ZOOM"[\s\S]*:max="MAX_CROP_ZOOM"/)
assert.match(dialogSource, /:disabled="avatarUploading"[^>]*@click="cancelCrop"/s)
assert.match(dialogSource, /:disabled="avatarUploading \|\| !cropperReady"[^>]*@click="confirmAvatarUpload"/s)
assert.doesNotMatch(dialogSource, />重新选择</)
assert.doesNotMatch(dialogSource, />确认上传</)
assert.doesNotMatch(dialogSource, /avatar-editor__hint|selectedFileName/)

const indexHtmlSource = fs.readFileSync(indexHtmlPath, 'utf8')
assert.match(
  indexHtmlSource,
  /img-src[^;]*\bblob:/,
  'the CSP must allow the cropper image element to display a local Blob URL',
)

const settingsSource = fs.readFileSync(settingsPath, 'utf8')
assert.deepEqual(parse(settingsSource, { filename: settingsPath }).errors, [])
assert.match(settingsSource, /<UserProfileDialog\s+ref="userProfileDialogRef"\s*\/\>/)
assert.match(settingsSource, /@click="openUserProfile"/)
assert.match(settingsSource, /useCurrentUserProfile/)

const headerSource = fs.readFileSync(headerPath, 'utf8')
const mindSource = fs.readFileSync(mindPath, 'utf8')
const knowledgeSource = fs.readFileSync(knowledgePath, 'utf8')
for (const [label, source, avatarClass] of [
  ['common header', headerSource, 'avatar-container'],
  ['mind header', mindSource, 'mind-header-avatar-container'],
]) {
  assert.match(
    source,
    new RegExp(`<button\\s+class="${avatarClass}"[^>]*type="button"[^>]*aria-label="打开个人设置"`, 's'),
    `${label} avatar entry must be a keyboard-accessible button`,
  )
  assert.match(source, new RegExp(`\\.${avatarClass}(?::focus-visible|[\\s\\S]*?:focus-visible)`))
  assert.match(source, /useCurrentUserProfile/)
}
assert.match(knowledgeSource, /useCurrentUserProfile/)
assert.doesNotMatch(
  knowledgeSource,
  /applyProfile\s*\(\s*res\.user\s*\)/,
  'late capability responses must not repopulate a profile invalidated by logout',
)
assert.doesNotMatch(headerSource, /asynctest\.oss-cn-shenzhen\.aliyuncs\.com\/users/)
assert.doesNotMatch(mindSource, /asynctest\.oss-cn-shenzhen\.aliyuncs\.com\/users/)
assert.doesNotMatch(knowledgeSource, /asynctest\.oss-cn-shenzhen\.aliyuncs\.com\/users/)

console.log('user profile/avatar contract: PASS')
