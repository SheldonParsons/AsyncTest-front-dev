import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const composerPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')

const composerSource = fs.readFileSync(composerPath, 'utf8')
const viewSource = fs.readFileSync(viewPath, 'utf8')

for (const [file, source] of [[composerPath, composerSource], [viewPath, viewSource]]) {
  const parsed = parse(source, { filename: file })
  assert.deepEqual(parsed.errors, [])
}

// 输入框下方不再承载任何可见警告或运行状态；上传 live-region 仅供无障碍读取。
assert.doesNotMatch(composerSource, /class="composer-status|class="composer-error/)
assert.doesNotMatch(composerSource, /\battachmentError\b|\bstatusText\b/)
assert.match(
  composerSource,
  /<span v-if="uploading" class="visually-hidden" role="status" aria-live="polite">正在上传附件<\/span>/,
)
assert.doesNotMatch(viewSource, /:status-text=|\bcomposerStatusText\b/)

// 附件准入错误在选择与恢复两个入口都转成一次右下角 error toast。
assert.match(composerSource, /\(e: 'notice', notice: ComposerNotice\): void/)
assert.equal(
  (composerSource.match(/emitAttachmentNotice\(admission\.error\)/g) || []).length,
  2,
  '选择附件和失败恢复都必须把准入错误交给 toast owner',
)
assert.match(composerSource, /emit\('notice', \{ title, type: 'error', duration: 5000 \}\)/)
assert.match(viewSource, /@notice="showComposerToast"/)
assert.match(
  viewSource,
  /function showComposerToast\([\s\S]*window\.\$toast\(\{[\s\S]*position: 'bottom-right',[\s\S]*}\)/,
)

// “正在停止”也只在状态首次进入时提示一次；按钮自身的可访问文案继续保留。
assert.match(
  viewSource,
  /watch\(cancelRequested, \(stopping, wasStopping\) => \{[\s\S]*if \(!stopping \|\| wasStopping\) return[\s\S]*title: '正在停止本轮…'[\s\S]*type: 'info'/,
)
assert.match(composerSource, /stopping \? '正在停止' : sending \? '停止本轮'/)
assert.match(composerSource, /'is-sending': sending && !uploading/)
assert.match(viewSource, /:uploading="composerStartPending"/)
assert.match(viewSource, /const composerStartPending = computed\(\(\) => preparingSend\.value/)
assert.match(viewSource, /visibleRun\.cancelRequested = true[\s\S]*if \(!visibleRun\.localStartAccepted\) return/)
assert.match(viewSource, /await bridge\.startLocal\([\s\S]*context\.localStartAccepted = true[\s\S]*if \(context\.cancelRequested\)[\s\S]*await bridge\.cancel/)

console.log('vibe composer notice contract: PASS')
