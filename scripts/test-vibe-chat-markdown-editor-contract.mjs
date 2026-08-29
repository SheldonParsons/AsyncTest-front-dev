import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { parse } from '@vue/compiler-sfc'
import {
  $getRoot,
  $getSelection,
  $isRangeSelection,
  $createParagraphNode,
  $createTextNode,
  createEditor,
  INSERT_PARAGRAPH_COMMAND,
  COMMAND_PRIORITY_HIGH,
  COMMAND_PRIORITY_LOW,
  INSERT_LINE_BREAK_COMMAND,
  KEY_ENTER_COMMAND,
  KEY_DOWN_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import { registerRichText, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { $createListItemNode, $isListItemNode, $isListNode, registerList, ListItemNode, ListNode } from '@lexical/list'
import { CodeNode } from '@lexical/code'
import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  CODE,
  HEADING,
  ORDERED_LIST,
  QUOTE,
  registerMarkdownShortcuts,
  UNORDERED_LIST,
} from '@lexical/markdown'

const root = path.resolve(import.meta.dirname, '..')
const editorPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatMarkdownEditor.vue')
const transformerPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/chatMarkdownTransformers.ts')
const composerPath = path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatComposer.vue')
const knowledgePath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const editorSource = fs.readFileSync(editorPath, 'utf8')
const transformerSource = fs.readFileSync(transformerPath, 'utf8')
const composerSource = fs.readFileSync(composerPath, 'utf8')
const knowledgeSource = fs.readFileSync(knowledgePath, 'utf8')

for (const [filename, source] of [[editorPath, editorSource], [composerPath, composerSource], [knowledgePath, knowledgeSource]]) {
  const parsed = parse(source, { filename })
  assert.deepEqual(parsed.errors, [], `${filename} must parse as a Vue SFC`)
}

// Component boundary and safety contracts.
assert.match(editorSource, /from '@lexical\/markdown'/)
for (const name of ['HEADING', 'UNORDERED_LIST', 'ORDERED_LIST', 'QUOTE', 'CODE']) {
  assert.match(transformerSource, new RegExp(`\\b${name}\\b`), `${name} must stay enabled`)
}
assert.match(editorSource, /registerMarkdownShortcuts\(instance, CHAT_MARKDOWN_TRANSFORMERS\)/)
// Pasting into a fresh composer imports the same restricted Markdown dialect
// as a draft; subsequent pastes stay plain text so an insertion cannot
// unexpectedly reformat surrounding content.
assert.match(editorSource, /isEmptyEditorRoot/)
assert.match(editorSource, /\$convertFromMarkdownString\((?:text|normalizeLineEndings\(text\)), CHAT_MARKDOWN_TRANSFORMERS/)
assert.match(editorSource, /\$insertDataTransferForPlainText\(dataTransfer, selection\)/)
// Shift+Enter at the end of a heading must leave that block and start a
// paragraph; ordinary blocks retain the soft line-break behavior.
assert.match(editorSource, /isHeadingAtEnd/)
assert.match(editorSource, /INSERT_PARAGRAPH_COMMAND/)
assert.match(editorSource, /markdownCleanup\?\.\(\)/)
assert.match(editorSource, /onBeforeUnmount\(disposeEditor\)/)
assert.match(editorSource, /instance\?\.setRootElement\(null\)/)
assert.match(editorSource, /role="textbox"/)
assert.match(editorSource, /aria-multiline="true"/)
assert.match(editorSource, /aria-placeholder="placeholder"|:aria-placeholder="placeholder"/)
assert.doesNotMatch(editorSource, /v-html/)
assert.doesNotMatch(composerSource, /<textarea\b/)
assert.match(composerSource, /<ChatMarkdownEditor/)
assert.match(composerSource, /@update:model-value="onEditorInput"/)
assert.match(composerSource, /@submit="onEditorSubmit"/)
assert.match(composerSource, /class="composer-shell"/)
assert.match(composerSource, /class="[^"]*attach-button[^"]*"/)
assert.match(composerSource, /class="[^"]*model-picker[^"]*"/)
assert.match(composerSource, /class="[^"]*send-button[^"]*"/)
assert.match(composerSource, /const sendDisabled = computed\(\(\) => editorValue\.value\.trim\(\)\.length === 0\)/)
assert.match(composerSource, /const text = textOverride \?\? inputEl\.value\?\.getMarkdown\?\.\(\) \?\? editorValue\.value[\s\S]*if \(!text\.trim\(\)\) return/)
assert.match(editorSource, /event\.isComposing/)
assert.match(editorSource, /editor\?\.isComposing\(\)/)
assert.match(editorSource, /insertRawText/)
assert.match(editorSource, /CONTROLLED_TEXT_INSERTION_COMMAND/)
assert.match(editorSource, /getMarkdown\(\)/)
assert.match(editorSource, /COMMAND_PRIORITY_LOW/)
assert.match(editorSource, /event\.shiftKey[\s\S]*INSERT_LINE_BREAK_COMMAND/)
assert.match(editorSource, /event\.ctrlKey \|\| event\.metaKey/)
assert.match(editorSource, /KEY_DOWN_COMMAND/)
assert.match(editorSource, /onKeyDown\(event: KeyboardEvent\)/)
assert.match(editorSource, /onComposingEnter\(event: KeyboardEvent \| null\)/)
assert.match(editorSource, /isInsideList\(\)[\s\S]*INSERT_PARAGRAPH_COMMAND/)
assert.match(editorSource, /\$createListItemNode\(\)/)
assert.match(editorSource, /item\.insertAfter\(nextItem\)/)
assert.match(editorSource, /emit\('submit', (?:value|serializeActiveEditorState\(\))\)/)
assert.match(editorSource, /event\.isComposing[\s\S]*return (?:true|false)/)
assert.match(editorSource, /@compositionstart/)
assert.match(editorSource, /@compositionend/)
assert.match(editorSource, /composing\.value/)
assert.match(editorSource, /value === currentMarkdown\.value \|\| value === lastEmittedMarkdown/)
assert.match(editorSource, /editorCleanups\.splice\(0\)/)
assert.match(editorSource, /resizeListener/)
assert.match(editorSource, /cancelAnimationFrame/)
assert.match(composerSource, /if \(props\.sending\) \{ emit\('stop'\)/)
assert.match(composerSource, /emit\('send', \{ text: props\.modelValue, files: outgoingFiles \}\)/)
assert.match(composerSource, /const outgoingFiles = \[\.\.\.selectedFiles\.value\]/)
assert.match(composerSource, /clearAttachments\(\)/)
assert.match(composerSource, /restoreAttachments\(files: File\[\]\)/)
assert.match(composerSource, /:sending="sending"/)
assert.match(composerSource, /:stopping="stopping"/)
assert.match(composerSource, /:uploading="uploading"/)
const composerSendStart = knowledgeSource.indexOf('async function onComposerSend(')
const composerAnswerStart = knowledgeSource.indexOf('// 询问模式（clarification）', composerSendStart)
const composerSendSource = knowledgeSource.slice(composerSendStart, composerAnswerStart > composerSendStart ? composerAnswerStart : undefined)
assert.match(composerSendSource, /const base = \(text \|\| ''\)\.trim\(\)[\s\S]*if \(!base\) return/)
assert.doesNotMatch(composerSendSource, /我上传了/)
assert.match(editorSource, /:deep\(ul\)/)
assert.match(editorSource, /padding-left: 22px/)
assert.doesNotMatch(editorSource, /lexicalEditorManager/)
assert.doesNotMatch(editorSource, /setEditorState\(/)

const transformers = [HEADING, UNORDERED_LIST, ORDERED_LIST, QUOTE, CODE]
const nodes = [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode]
let namespaceCounter = 0

function makeEditor({ history = false } = {}) {
  const editor = createEditor({
    namespace: `chat-markdown-contract-${namespaceCounter++}`,
    nodes,
    onError: (error) => { throw error },
  })
  registerRichText(editor)
  registerList(editor)
  if (history) registerHistory(editor, createEmptyHistoryState(), 0)
  return editor
}

function waitForEditor() {
  return new Promise((resolve) => setTimeout(resolve, 0))
}

function readMarkdown(editor) {
  let value = ''
  editor.getEditorState().read(() => {
    value = $convertToMarkdownString(transformers, $getRoot(), true)
  })
  return value
}

function readRoot(editor) {
  let snapshot
  editor.getEditorState().read(() => {
    const first = $getRoot().getFirstChild()
    snapshot = {
      type: first?.getType(),
      tag: first?.getTag?.(),
      text: $getRoot().getTextContent(),
    }
  })
  return snapshot
}

function readBlocks(editor) {
  let blocks = []
  editor.getEditorState().read(() => {
    blocks = $getRoot().getChildren().map((node) => ({
      type: node.getType(),
      tag: typeof node.getTag === 'function' ? node.getTag() : undefined,
      text: node.getTextContent(),
    }))
  })
  return blocks
}

async function typeIncrementally(editor, value) {
  for (const character of value) {
    editor.update(() => {
      $getRoot().selectEnd()
      const selection = $getSelection()
      if ($isRangeSelection(selection)) selection.insertText(character)
    })
    await waitForEditor()
  }
}

// A block marker is transformed only at the start of its block; #### is h4.
{
  const editor = makeEditor()
  const unregister = registerMarkdownShortcuts(editor, transformers)
  await typeIncrementally(editor, '#### ')
  assert.deepEqual(readRoot(editor), { type: 'heading', tag: 'h4', text: '' })
  unregister()
}
{
  const editor = makeEditor()
  const unregister = registerMarkdownShortcuts(editor, transformers)
  await typeIncrementally(editor, 'sentence #### ')
  assert.equal(readRoot(editor).type, 'paragraph')
  assert.equal(readMarkdown(editor), 'sentence #### ')
  unregister()
}

for (const marker of ['# ', '## ', '### ', '#### ', '##### ', '###### ']) {
  const editor = makeEditor()
  const unregister = registerMarkdownShortcuts(editor, transformers)
  await typeIncrementally(editor, marker)
  assert.equal(readRoot(editor).type, 'heading', `${marker} should create a heading`)
  assert.equal(readRoot(editor).tag, `h${marker.trim().length}`)
  unregister()
}

for (const marker of ['- ', '* ', '+ ']) {
  const editor = makeEditor()
  const unregister = registerMarkdownShortcuts(editor, transformers)
  await typeIncrementally(editor, marker)
  assert.equal(readRoot(editor).type, 'list', `${marker} should create an unordered list`)
  assert.equal(readMarkdown(editor), marker)
  unregister()
}
{
  const editor = makeEditor()
  const unregister = registerMarkdownShortcuts(editor, transformers)
  await typeIncrementally(editor, '1. ')
  assert.equal(readRoot(editor).type, 'list')
  assert.equal(readMarkdown(editor), '1. ')
  unregister()
}

// Command/Ctrl+Enter starts the next list item instead of inserting a soft
// line break. Lexical's list command updates the ordered marker to 2.
for (const modifier of ['metaKey', 'ctrlKey']) {
  const editor = makeEditor()
  const unregisterMarkdown = registerMarkdownShortcuts(editor, transformers)
  editor.update(() => {
    $convertFromMarkdownString('1. 第一步', transformers, $getRoot(), true)
    $getRoot().selectEnd()
  })
  await waitForEditor()
  editor.registerCommand(KEY_DOWN_COMMAND, (event) => {
    if (event.key !== 'Enter' || event.shiftKey || !event[modifier] || event.isComposing) return false
    event.preventDefault()
    let node = $getSelection()?.anchor.getNode() || null
    let insideList = false
    let listItem = null
    while (node) {
      if (!listItem && $isListItemNode(node)) listItem = node
      if ($isListNode(node)) {
        insideList = true
        break
      }
      node = node.getParent()
    }
    if (insideList && listItem) {
      const nextItem = $createListItemNode()
      listItem.insertAfter(nextItem)
      nextItem.selectStart()
      return true
    }
    return editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false)
  }, COMMAND_PRIORITY_HIGH)
  let prevented = false
  const event = {
    key: 'Enter',
    metaKey: modifier === 'metaKey',
    ctrlKey: modifier === 'ctrlKey',
    shiftKey: false,
    isComposing: false,
    preventDefault() { prevented = true },
  }
  assert.equal(editor.dispatchCommand(KEY_DOWN_COMMAND, event), true)
  assert.equal(prevented, true)
  await waitForEditor()
  assert.equal(readMarkdown(editor), '1. 第一步\n2. ')
  const list = readBlocks(editor).filter((block) => block.type === 'list')[0]
  assert.equal(list.text, '第一步\n\n')
  let values = []
  editor.getEditorState().read(() => {
    const listNode = $getRoot().getFirstChild()
    values = listNode?.getChildren().map((item) => item.getValue?.()) || []
  })
  assert.deepEqual(values, [1, 2])
  assert.equal(values.length, 2)
  unregisterMarkdown()
}

// A composing Enter is consumed by the keyboard guard without changing the
// Lexical tree, even if the browser has not set Lexical's composing flag yet.
{
  const editor = makeEditor()
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode('候选词'))
    $getRoot().append(paragraph)
    paragraph.selectEnd()
  })
  await waitForEditor()
  editor.registerCommand(KEY_DOWN_COMMAND, (event) => {
    if (event.key !== 'Enter') return false
    if (event.isComposing) return true
    return false
  }, COMMAND_PRIORITY_HIGH)
  const before = readBlocks(editor)
  editor.dispatchCommand(KEY_DOWN_COMMAND, {
    key: 'Enter',
    metaKey: false,
    ctrlKey: false,
    shiftKey: false,
    isComposing: true,
    preventDefault() {},
  })
  await waitForEditor()
  assert.deepEqual(readBlocks(editor), before)
}
{
  const editor = makeEditor()
  const unregister = registerMarkdownShortcuts(editor, transformers)
  await typeIncrementally(editor, '> ')
  assert.equal(readRoot(editor).type, 'quote')
  assert.equal(readMarkdown(editor), '> ')
  unregister()
}
{
  const editor = makeEditor()
  const unregister = registerMarkdownShortcuts(editor, transformers)
  await typeIncrementally(editor, '```ts ')
  assert.equal(readRoot(editor).type, 'code')
  assert.match(readMarkdown(editor), /^```ts\n[\s\S]*```$/)
  unregister()
}

// Import/export keeps multiline drafts and all enabled block constructs.
{
  const editor = makeEditor()
  const markdown = '# one\n\n- two\n\n> three\n\n```js\nconst x = 1\n```'
  editor.update(() => {
    $convertFromMarkdownString(markdown, transformers, $getRoot(), true)
  })
  await waitForEditor()
  assert.equal(readMarkdown(editor), markdown)
}

// A Markdown clipboard payload pasted into an empty composer is imported as
// Lexical blocks (rather than remaining one literal paragraph).  This mirrors
// the component's empty-root paste branch without requiring a DOM clipboard
// implementation in the contract test.
{
  const editor = makeEditor()
  const markdown = [
    '#### 粘贴标题',
    '',
    '正文',
    '',
    '- 项目一',
    '- 项目二',
    '',
    '1. 第一步',
    '2. 第二步',
    '',
    '> 引用',
    '',
    '```js',
    'const x = 1',
    '```',
  ].join('\n')
  editor.update(() => {
    const root = $getRoot()
    root.clear()
    $convertFromMarkdownString(markdown, transformers, root, true)
    root.selectEnd()
  })
  await waitForEditor()
  const blocks = readBlocks(editor)
  const nonEmpty = blocks.filter((block) => block.text.length > 0)
  assert.deepEqual(nonEmpty.map(({ type, tag }) => ({ type, tag })), [
    { type: 'heading', tag: 'h4' },
    { type: 'paragraph', tag: undefined },
    { type: 'list', tag: 'ul' },
    { type: 'list', tag: 'ol' },
    { type: 'quote', tag: undefined },
    { type: 'code', tag: undefined },
  ])
  assert.equal(nonEmpty[0].text, '粘贴标题')
  assert.equal(readMarkdown(editor), markdown)

  // A marker in the middle of a pasted sentence is still plain paragraph
  // text; import must not broaden the enabled shortcut dialect.
  editor.update(() => {
    const root = $getRoot()
    root.clear()
    $convertFromMarkdownString('sentence #### stays text', transformers, root, true)
  })
  await waitForEditor()
  assert.deepEqual(readRoot(editor), {
    type: 'paragraph',
    tag: undefined,
    text: 'sentence #### stays text',
  })
}

// The heading-aware Shift+Enter path delegates to Lexical's paragraph
// insertion command.  Verify that it produces a normal paragraph instead of
// a line break child which would inherit the h4 style.
{
  const editor = makeEditor()
  editor.update(() => {
    $convertFromMarkdownString('#### 标题', transformers, $getRoot(), true)
    $getRoot().selectEnd()
  })
  await waitForEditor()
  assert.equal(editor.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined), true)
  await waitForEditor()
  assert.deepEqual(readBlocks(editor).slice(0, 2), [
    { type: 'heading', tag: 'h4', text: '标题' },
    { type: 'paragraph', tag: undefined, text: '' },
  ])
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) selection.insertText('正常文本')
  })
  await waitForEditor()
  assert.deepEqual(readBlocks(editor).slice(0, 2), [
    { type: 'heading', tag: 'h4', text: '标题' },
    { type: 'paragraph', tag: undefined, text: '正常文本' },
  ])
  assert.equal(readMarkdown(editor), '#### 标题\n正常文本')
}

// Soft line breaks remain available for ordinary paragraphs, and do not split
// the block or accidentally promote the following line to a heading.
{
  const editor = makeEditor()
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode('普通文本'))
    $getRoot().append(paragraph)
    paragraph.selectEnd()
  })
  await waitForEditor()
  assert.equal(editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false), true)
  await waitForEditor()
  assert.deepEqual(readBlocks(editor), [
    { type: 'paragraph', tag: undefined, text: '普通文本\n' },
  ])
}

// Lexical history is independent per editor and supports undo/redo.
{
  const editor = makeEditor({ history: true })
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode('base'))
    $getRoot().append(paragraph)
    paragraph.selectEnd()
  })
  await waitForEditor()
  editor.update(() => {
    const selection = $getSelection()
    if ($isRangeSelection(selection)) selection.insertText('!')
  })
  await waitForEditor()
  editor.dispatchCommand(UNDO_COMMAND, undefined)
  await waitForEditor()
  assert.equal(readRoot(editor).text, 'base')
  editor.dispatchCommand(REDO_COMMAND, undefined)
  await waitForEditor()
  assert.equal(readRoot(editor).text, 'base!')
}

// Enter/Shift+Enter/IME command contract: ordinary Enter submits, Shift+Enter
// inserts a soft line break, and composing Enter is left to the IME.
{
  const editor = makeEditor()
  const submissions = []
  editor.registerCommand(KEY_ENTER_COMMAND, (event) => {
    if (!event || event.isComposing) return false
    if (event.shiftKey) {
      event.preventDefault()
      return editor.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false)
    }
    event.preventDefault()
    submissions.push(readMarkdown(editor))
    return true
  }, COMMAND_PRIORITY_LOW)
  editor.update(() => {
    $getRoot().selectEnd()
    const selection = $getSelection()
    if ($isRangeSelection(selection)) selection.insertText('draft')
  })
  await waitForEditor()
  const prevent = () => {}
  assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND, { shiftKey: false, isComposing: false, preventDefault: prevent }), true)
  assert.equal(submissions.length, 1)
  assert.equal(editor.dispatchCommand(KEY_ENTER_COMMAND, { shiftKey: true, isComposing: false, preventDefault: prevent }), true)
  await waitForEditor()
  assert.equal(readRoot(editor).text, 'draft\n')
  editor.dispatchCommand(KEY_ENTER_COMMAND, { shiftKey: false, isComposing: true, preventDefault: prevent })
  assert.equal(submissions.length, 1)
}

// The direct KEY_ENTER path is guarded too, so a browser composition event
// cannot fall through to rich-text's paragraph insertion listener.
{
  const editor = makeEditor()
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode('输入中'))
    $getRoot().append(paragraph)
    paragraph.selectEnd()
  })
  await waitForEditor()
  editor.registerCommand(KEY_ENTER_COMMAND, (event) => {
    if (event?.isComposing) return true
    return false
  }, COMMAND_PRIORITY_HIGH)
  const before = readBlocks(editor)
  editor.dispatchCommand(KEY_ENTER_COMMAND, { shiftKey: false, isComposing: true, preventDefault() {} })
  await waitForEditor()
  assert.deepEqual(readBlocks(editor), before)
}

// The non-empty-editor paste fallback remains plain text and never injects
// pasted HTML; Markdown parsing is reserved for the fresh-composer branch.
{
  const editor = makeEditor()
  editor.update(() => {
    const paragraph = $createParagraphNode().append($createTextNode('prefix '))
    $getRoot().append(paragraph)
    paragraph.selectEnd()
    const selection = $getSelection()
    if ($isRangeSelection(selection)) selection.insertRawText('line one\n#### stays text\n<svg onload="bad()">')
  })
  await waitForEditor()
  assert.equal(readRoot(editor).type, 'paragraph')
  assert.match(readRoot(editor).text, /prefix line one\n#### stays text\n<svg onload="bad\(\)">/)
  assert.equal(readMarkdown(editor), 'prefix line one\n#### stays text\n<svg onload="bad()">')
}

console.log('vibe chat markdown editor contract: PASS')
