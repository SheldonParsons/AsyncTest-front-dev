import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const iconSource = read('src/views/electron_views/vibe/knowledge/components/icons/MarkdownFileIcon.vue')
const composerSource = read('src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const railSource = read('src/views/electron_views/vibe/knowledge/components/ConversationInfoRail.vue')
const conversationSource = read('src/views/electron_views/vibe/knowledge/index.vue')

// Markdown 文件在菜单、待发送附件、消息附件和右栏中必须复用同一视觉组件。
assert.match(iconSource, /class="markdown-file-icon"[^>]*>\s*MD\s*</)
assert.match(iconSource, /background:\s*linear-gradient\(135deg,\s*#2563eb,\s*#7c3aed\)/)
assert.match(iconSource, /color:\s*#fff/)
assert.match(iconSource, /-webkit-text-fill-color:\s*#fff/)
assert.match(iconSource, /font-size:\s*var\(--markdown-file-icon-font-size,\s*9px\)/)
assert.match(iconSource, /:style="iconStyle"/)
assert.match(iconSource, /size\?:\s*number/)
assert.match(iconSource, /fontSize\?:\s*number/)
assert.match(iconSource, /radius\?:\s*number/)

assert.equal((composerSource.match(/<MarkdownFileIcon\s*\/>/g) || []).length, 2)
assert.doesNotMatch(composerSource, /class="chip-icon">\s*MD\s*</)
assert.match(composerSource, /\.chip-icon :deep\(\.markdown-file-icon\)\s*\{[^}]*width:\s*100%;[^}]*height:\s*100%;/)
assert.match(composerSource, /\.markdown-icon\s*\{[^}]*--markdown-file-icon-font-size:\s*11px;/)

assert.match(railSource, /<MarkdownFileIcon\s+:size="24"\s+:font-size="9"\s+:radius="8"\s*\/>/)
assert.match(railSource, /\.file-icon\s*\{[^}]*width:\s*24px;[^}]*height:\s*24px;[^}]*border-radius:\s*8px;/)
assert.match(conversationSource, /import MarkdownFileIcon from '.\/components\/icons\/MarkdownFileIcon\.vue'/)
assert.match(conversationSource, /<MarkdownFileIcon\s+v-if="isMarkdownAttachment\(file\)"\s+:size="18"\s+:font-size="7"\s+:radius="6"\s*\/>/)
assert.doesNotMatch(conversationSource, /<svg\s+v-if="isMarkdownAttachment\(file\)"/)
assert.match(conversationSource, /\.user-attachment-chip\s*\{[^}]*grid-template-columns:\s*18px minmax\(0,\s*1fr\);/)
const messageMarkdownBlock = conversationSource.match(/\.user-attachment-icon\.markdown\s*\{[^}]*\}/)?.[0] || ''
assert.doesNotMatch(messageMarkdownBlock, /--markdown-file-icon-font-size:/)
assert.match(messageMarkdownBlock, /width:\s*18px;/)
assert.match(messageMarkdownBlock, /height:\s*18px;/)
assert.match(messageMarkdownBlock, /border-radius:\s*6px;/)
assert.match(conversationSource, /\.user-attachment-icon\.markdown :deep\(\.markdown-file-icon\)\s*\{[^}]*color:\s*#fff;[^}]*-webkit-text-fill-color:\s*#fff;/)

console.log('vibe markdown file icon contract: ok')
