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
  COMMAND_PRIORITY_LOW,
  INSERT_LINE_BREAK_COMMAND,
  KEY_ENTER_COMMAND,
  REDO_COMMAND,
  UNDO_COMMAND,
} from 'lexical'
import { registerRichText, HeadingNode, QuoteNode } from '@lexical/rich-text'
import { registerList, ListItemNode, ListNode } from '@lexical/list'
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
const editorSource = fs.readFileSync(editorPath, 'utf8')
const transformerSource = fs.readFileSync(transformerPath, 'utf8')
const composerSource = fs.readFileSync(composerPath, 'utf8')

for (const [filename, source] of [[editorPath, editorSource], [composerPath, composerSource]]) {
  const parsed = parse(source, { filename })
  assert.deepEqual(parsed.errors, [], `${filename} must parse as a Vue SFC`)
}

// Component boundary and safety contracts.
assert.match(editorSource, /from '@lexical\/markdown'/)
for (const name of ['HEADING', 'UNORDERED_LIST', 'ORDERED_LIST', 'QUOTE', 'CODE']) {
  assert.match(transformerSource, new RegExp(`\\b${name}\\b`), `${name} must stay enabled`)
}
assert.match(editorSource, /registerMarkdownShortcuts\(instance, CHAT_MARKDOWN_TRANSFORMERS\)/)
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
assert.match(editorSource, /event\.isComposing/)
assert.match(editorSource, /editor\?\.isComposing\(\)/)
assert.match(editorSource, /insertRawText/)
assert.match(editorSource, /CONTROLLED_TEXT_INSERTION_COMMAND/)
assert.match(editorSource, /getMarkdown\(\)/)
assert.match(editorSource, /COMMAND_PRIORITY_LOW/)
assert.match(editorSource, /event\.shiftKey[\s\S]*INSERT_LINE_BREAK_COMMAND/)
assert.match(editorSource, /emit\('submit', (?:value|serializeActiveEditorState\(\))\)/)
assert.match(editorSource, /if \(!event \|\| event\.isComposing[\s\S]*return false/)
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

// Plain multiline insertion never parses or injects pasted HTML.
{
  const editor = makeEditor()
  editor.update(() => {
    $getRoot().selectEnd()
    const selection = $getSelection()
    if ($isRangeSelection(selection)) selection.insertRawText('line one\n#### stays text\n<svg onload="bad()">')
  })
  await waitForEditor()
  assert.equal(readRoot(editor).type, 'paragraph')
  assert.match(readRoot(editor).text, /<svg onload="bad\(\)">/)
  assert.equal(readMarkdown(editor), 'line one\n#### stays text\n<svg onload="bad()">')
}

console.log('vibe chat markdown editor contract: PASS')
