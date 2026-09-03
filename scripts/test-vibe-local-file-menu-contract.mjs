import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'

const root = path.resolve(import.meta.dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const composer = read('src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const localRefs = read('electron/vibeAgent/localFileRefs.node.js')
const ipcMain = read('electron/vibeAgent/ipcMain.node.js')
const resourceContract = read('src/views/electron_views/vibe/attachmentResourceContract.ts')

const menu = composer.match(/<!-- 添加内容菜单（文件） -->([\s\S]*?)<div class="composer-shell"/)?.[1] || ''
assert.ok(menu, '本机文件菜单必须保留在 ChatComposer')
assert.match(menu, /localMode \? '本机文件' : 'Markdown 文件'/)
assert.match(menu, /localMode \? 'markdown、txt、HTML 等文件' : '\.md \/ \.markdown'/)

// 仅替换本机文件菜单图标；Markdown 专用图标仍供附件 chip 和历史附件使用。
assert.match(menu, /v-if="localMode"[\s\S]*class="[^"]*\bfile-text-icon\b[^"]*"/)
for (const pathData of [
  'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
  'M14 2v4a2 2 0 0 0 2 2h4',
  'M10 9H8',
  'M16 13H8',
  'M16 17H8',
]) {
  assert.match(menu, new RegExp(`d="${pathData.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"`))
}
assert.doesNotMatch(menu, /linear-gradient|>\s*MD\s*</)
assert.match(composer, /\.file-text-icon-container\s*\{[^}]*background:\s*#f1f3f5/)
assert.match(composer, /\.file-text-icon\s*\{[^}]*width:\s*20px[^}]*height:\s*20px/)

// The browser/server picker stays aligned with the backend's frozen suffix contract.
assert.match(composer, /accept="\.md,\.markdown,text\/markdown,text\/plain"/)
assert.match(resourceContract, /basename\.endsWith\('\.txt'\)/)
assert.doesNotMatch(resourceContract, /basename\.endsWith\('\.(?:html|htm)'\)/)
const compiled = ts.transpileModule(resourceContract, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
  reportDiagnostics: true,
})
assert.deepEqual(compiled.diagnostics || [], [])
const contract = await import(`data:text/javascript;base64,${Buffer.from(compiled.outputText).toString('base64')}`)
assert.equal(contract.canonicalAttachmentUploadMime('notes.txt', 'application/octet-stream'), 'text/plain')
assert.throws(() => contract.canonicalAttachmentUploadMime('notes.html', 'text/html'))

// Native local selection has no restrictive dialog filter and maps HTML/TXT to text.
assert.match(localRefs, /\.txt.*\.csv.*\.json.*\.yaml.*\.yml.*\.xml.*\.html.*\.htm/)
assert.match(ipcMain, /properties:\s*\["openFile",\s*"multiSelections"\]/)

console.log('vibe local file menu contract: PASS')
