import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const composer = read('src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const chatFileIcon = read('src/views/electron_views/vibe/knowledge/components/icons/FileTextIcon.vue')
const localRefs = read('electron/vibeAgent/localFileRefs.node.js')
const ipcMain = read('electron/vibeAgent/ipcMain.node.js')

const menu = composer.match(/<!-- 添加内容菜单（文件） -->([\s\S]*?)<div class="composer-shell"/)?.[1] || ''
assert.ok(menu, '本机文件菜单必须保留在 ChatComposer')
assert.match(menu, /localMode \? '本机文件' : 'Markdown 文件'/)
assert.match(menu, /localMode \? 'markdown、txt、HTML 等文件' : '\.md \/ \.markdown'/)

// Chat composer 的菜单和每个待发送附件 card 共用同一个 FileText 组件；
// Markdown 专用 MD 图标仍只留给无关的历史/Viewer surfaces。
assert.match(menu, /<FileTextIcon\s+:size="20"\s*\/>/)
assert.equal((composer.match(/<FileTextIcon(?:\s+[^>]*)?\s*\/>/g) || []).length, 2)
assert.doesNotMatch(menu, /<MarkdownFileIcon|linear-gradient|>\s*MD\s*</)
assert.doesNotMatch(composer, /MarkdownFileIcon|markdown-file-icon/)
for (const pathData of [
  'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
  'M14 2v4a2 2 0 0 0 2 2h4',
  'M10 9H8',
  'M16 13H8',
  'M16 17H8',
]) {
  assert.match(chatFileIcon, new RegExp(`d="${pathData.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"`))
}
assert.match(chatFileIcon, /stroke="currentColor"/)
assert.match(chatFileIcon, /stroke-width="2"/)
assert.match(chatFileIcon, /stroke-linecap="round"/)
assert.match(chatFileIcon, /stroke-linejoin="round"/)
assert.match(composer, /\.file-text-icon-container\s*\{[^}]*background:\s*#f3f4f5/)

// Cards remain a single horizontal row and never widen the composer itself.
assert.match(composer, /class="attachment-list"[\s\S]*role="list"[\s\S]*tabindex="0"/)
assert.match(composer, /\.attachment-list\s*\{[\s\S]*overflow-x:\s*auto[\s\S]*overflow-y:\s*hidden[\s\S]*max-width:\s*100%/)
assert.match(composer, /\.attachment-list\s*\{[\s\S]*height:\s*72px[\s\S]*max-height:\s*72px/)
assert.match(composer, /\.attachment-list-track\s*\{[\s\S]*flex-wrap:\s*nowrap/)
assert.match(composer, /\.attachment-list\s*\{[\s\S]*white-space:\s*nowrap/)
assert.match(composer, /\.attachment-list-track\s*\{[\s\S]*height:\s*52px[\s\S]*min-height:\s*52px/)
assert.match(composer, /\.attachment-chip\s*\{[\s\S]*flex:\s*0 0 224px[\s\S]*height:\s*52px/)
assert.match(composer, /\.attachment-chip\s*\{[\s\S]*padding:\s*6px 36px 6px 6px/)
assert.match(composer, /\.chip-name\s*\{[\s\S]*text-overflow:\s*ellipsis[\s\S]*white-space:\s*nowrap/)
assert.match(composer, /fileTypeLabel\(file\)/)
assert.match(composer, /class="chip-type"/)
assert.match(composer, /@click\.stop="removeFile\(i, \$event\)"/)
assert.match(composer, /class="chip-remove"[\s\S]*position:\s*absolute/)
assert.match(composer, /class="chip-remove"[\s\S]*:disabled="sending \|\| uploading \|\| stopping"/)
assert.match(composer, /class="chip-remove"[\s\S]*:aria-label="`移除附件 \$\{file\.name\}`"/)
assert.match(composer, /class="chip-remove-icon"/)
assert.match(composer, /d="M6 6l12 12"/)
assert.match(composer, /d="M18 6 6 18"/)
assert.match(composer, /\.chip-remove\s*\{[\s\S]*top:\s*6px[\s\S]*right:\s*6px[\s\S]*border-radius:\s*50%[\s\S]*background:\s*#171b21/)
assert.match(composer, /\.chip-remove:focus-visible\s*\{[\s\S]*outline:/)
assert.match(composer, /function removeFile\(i: number, event\?: Event\)[\s\S]*props\.sending \|\| props\.uploading \|\| props\.stopping/)
assert.match(composer, /function clearAttachments\(\)[\s\S]*attachmentScrollLeft = 0/)

// The native picker is intentionally broad; Pi's local reader and the OS
// decide how a selected file is interpreted.
assert.match(composer, /accept="\.md,\.markdown,text\/markdown,text\/plain"/)

// Native local selection has no restrictive dialog filter and maps HTML/TXT to text.
assert.match(localRefs, /\.txt.*\.csv.*\.json.*\.yaml.*\.yml.*\.xml.*\.html.*\.htm/)
assert.match(ipcMain, /properties:\s*\["openFile",\s*"multiSelections"\]/)

console.log('vibe local file menu contract: PASS')
