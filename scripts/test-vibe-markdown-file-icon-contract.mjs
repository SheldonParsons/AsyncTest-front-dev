import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const read = relativePath => fs.readFileSync(path.join(root, relativePath), 'utf8')

const iconSource = read('src/views/electron_views/vibe/knowledge/components/icons/MarkdownFileIcon.vue')
const chatFileIconSource = read('src/views/electron_views/vibe/knowledge/components/icons/FileTextIcon.vue')
const composerSource = read('src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const railSource = read('src/views/electron_views/vibe/knowledge/components/ConversationInfoRail.vue')
const conversationSource = read('src/views/electron_views/vibe/knowledge/index.vue')

// Markdown 专用标识继续供历史消息/Viewer 使用；聊天 composer 内的菜单和
// 待发送附件统一使用独立的 Lucide FileText 图标。
assert.match(iconSource, /class="markdown-file-icon"[^>]*>\s*MD\s*</)
assert.match(iconSource, /background:\s*linear-gradient\(135deg,\s*#2563eb,\s*#7c3aed\)/)
assert.match(iconSource, /color:\s*#fff/)
assert.match(iconSource, /-webkit-text-fill-color:\s*#fff/)
assert.match(iconSource, /font-size:\s*var\(--markdown-file-icon-font-size,\s*9px\)/)
assert.match(iconSource, /:style="iconStyle"/)
assert.match(iconSource, /size\?:\s*number/)
assert.match(iconSource, /fontSize\?:\s*number/)
assert.match(iconSource, /radius\?:\s*number/)

assert.equal((composerSource.match(/<MarkdownFileIcon(?:\s+[^>]*)?\s*\/>/g) || []).length, 0)
assert.equal((composerSource.match(/<FileTextIcon(?:\s+[^>]*)?\s*\/>/g) || []).length, 2)
assert.match(composerSource, /import FileTextIcon from '\.\/icons\/FileTextIcon\.vue'/)
assert.doesNotMatch(composerSource, /class="(?:markdown-icon|chip-icon)"[^>]*>[\s\S]*?MD\s*</)
assert.doesNotMatch(composerSource, /background:\s*linear-gradient\(135deg,\s*#2563eb,\s*#7c3aed\)/)
assert.match(chatFileIconSource, /stroke="currentColor"/)
assert.match(chatFileIconSource, /stroke-width="2"/)
assert.match(chatFileIconSource, /stroke-linecap="round"/)
assert.match(chatFileIconSource, /stroke-linejoin="round"/)
for (const pathData of [
  'M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z',
  'M14 2v4a2 2 0 0 0 2 2h4',
  'M10 9H8',
  'M16 13H8',
  'M16 17H8',
]) assert.match(chatFileIconSource, new RegExp(`d="${pathData.replace(/[.*+?^${}()|[\\]\\]/g, '\\$&')}"`))

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
