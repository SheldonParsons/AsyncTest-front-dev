<template>
  <div class="chat-markdown-editor" :class="{ 'is-empty': isEmpty }">
    <div
      ref="rootEl"
      class="composer-input chat-markdown-editor-root"
      contenteditable="true"
      role="textbox"
      aria-multiline="true"
      :aria-label="ariaLabel"
      :aria-placeholder="placeholder"
      :data-placeholder="placeholder"
      spellcheck="true"
      tabindex="0"
      @compositionstart="onCompositionStart"
      @compositionend="onCompositionEnd"
    ></div>
    <span class="chat-markdown-placeholder" aria-hidden="true">{{ placeholder }}</span>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { $insertDataTransferForPlainText } from '@lexical/clipboard'
import { CodeNode } from '@lexical/code'
import { createEmptyHistoryState, registerHistory } from '@lexical/history'
import { registerList, ListItemNode, ListNode } from '@lexical/list'
import {
  $convertFromMarkdownString,
  $convertToMarkdownString,
  registerMarkdownShortcuts,
} from '@lexical/markdown'
import { HeadingNode, QuoteNode, registerRichText } from '@lexical/rich-text'
import {
  $getRoot,
  $getSelection,
  $isElementNode,
  $isRangeSelection,
  COMMAND_PRIORITY_LOW,
  COMMAND_PRIORITY_HIGH,
  CONTROLLED_TEXT_INSERTION_COMMAND,
  createEditor,
  INSERT_LINE_BREAK_COMMAND,
  INSERT_PARAGRAPH_COMMAND,
  KEY_ENTER_COMMAND,
  PASTE_COMMAND,
  type LexicalEditor,
  type PasteCommandType,
} from 'lexical'
import { CHAT_MARKDOWN_TRANSFORMERS } from './chatMarkdownTransformers'

const props = withDefaults(defineProps<{
  modelValue: string
  placeholder?: string
  ariaLabel?: string
  sending?: boolean
  stopping?: boolean
  uploading?: boolean
}>(), {
  placeholder: '询问任何问题',
  ariaLabel: '聊天输入内容',
  sending: false,
  stopping: false,
  uploading: false,
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
  (e: 'submit', value: string): void
}>()

const rootEl = ref<HTMLDivElement | null>(null)
const currentMarkdown = ref(normalizeLineEndings(props.modelValue || ''))
const isEmpty = computed(() => currentMarkdown.value.length === 0)

let editor: LexicalEditor | null = null
let editorCleanups: Array<() => void> = []
let historyCleanup: (() => void) | null = null
let markdownCleanup: (() => void) | null = null
let mounted = false
let pluginsReady = false
let initializing = true
let lastEmittedMarkdown = currentMarkdown.value
let lastPropMarkdown = currentMarkdown.value
let externalSyncToken = 0
let serializationQueued = false
let heightRafId: number | null = null
let suppressControlledPasteUntil = 0
let resizeListener: (() => void) | null = null
const composing = ref(false)

function normalizeLineEndings(value: string): string {
  return value.replace(/\r\n?/g, '\n')
}

function serializeEditorState(): string {
  const instance = editor
  if (!instance) return currentMarkdown.value
  let value = ''
  instance.getEditorState().read(() => {
    value = $convertToMarkdownString(CHAT_MARKDOWN_TRANSFORMERS, $getRoot(), true)
  })
  return value
}

function scheduleHeightSync() {
  if (typeof window === 'undefined') return
  if (heightRafId !== null) {
    if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(heightRafId)
    else window.clearTimeout(heightRafId)
  }
  const update = () => {
    heightRafId = null
    syncHeight()
  }
  heightRafId = typeof window.requestAnimationFrame === 'function'
    ? window.requestAnimationFrame(update)
    : window.setTimeout(update, 0)
}

function syncHeight() {
  const root = rootEl.value
  if (!root) return
  root.style.height = 'auto'
  const naturalHeight = Math.max(40, root.scrollHeight || 40)
  const maxHeight = 170
  root.style.height = `${Math.min(naturalHeight, maxHeight)}px`
  root.style.overflowY = naturalHeight > maxHeight ? 'auto' : 'hidden'
}

function queueSerialization() {
  if (initializing) return
  if (serializationQueued) return
  serializationQueued = true
  const run = () => {
    serializationQueued = false
    if (!mounted || !editor) return
    const value = serializeEditorState()
    currentMarkdown.value = value
    scheduleHeightSync()

    // A parent v-model echo or an external draft import must never look like
    // a fresh user edit. The Lexical state remains the only editing source.
    if (initializing || externalSyncToken !== 0) {
      lastEmittedMarkdown = value
      externalSyncToken = 0
      return
    }
    if (value === lastEmittedMarkdown) return
    lastEmittedMarkdown = value
    emit('update:modelValue', value)
  }
  // Markdown shortcuts can enqueue a nested Lexical update (notably code
  // fences). Give that reconciliation a turn before serializing, so parents
  // receive the final block state rather than a transient marker-only draft.
  if (typeof queueMicrotask === 'function') queueMicrotask(() => queueMicrotask(run))
  else setTimeout(run, 0)
}

function onEditorUpdate() {
  queueSerialization()
}

function onCompositionStart() {
  composing.value = true
}

function onCompositionEnd() {
  composing.value = false
}

function plainTextFromHtml(html: string): string | null {
  if (typeof DOMParser === 'undefined') return null
  const documentFragment = new DOMParser().parseFromString(html, 'text/html')
  const body = documentFragment.body
  if (!body) return ''
  return body.innerText || body.textContent || ''
}

function dataTransferFromPasteEvent(event: PasteCommandType): DataTransfer | null {
  if ('clipboardData' in event && event.clipboardData) return event.clipboardData
  if ('dataTransfer' in event && event.dataTransfer) return event.dataTransfer
  return null
}

function isEmptyEditorRoot(): boolean {
  const root = $getRoot()
  const children = root.getChildren()
  return children.length === 0 || children.every((child) => child.getTextContentSize() === 0)
}

function insertPastedText(text: string, selection: ReturnType<typeof $getSelection>): boolean {
  if (!$isRangeSelection(selection)) return false
  if (isEmptyEditorRoot()) {
    // A Markdown paste into a fresh composer is an intentional import. The
    // conversion creates Lexical blocks (rather than injecting clipboard HTML)
    // and leaves the caret at the end of the imported draft.
    $convertFromMarkdownString(normalizeLineEndings(text), CHAT_MARKDOWN_TRANSFORMERS, $getRoot(), true)
    $getRoot().selectEnd()
    return true
  }
  selection.insertRawText(text)
  return true
}

function insertPlainPaste(event: PasteCommandType): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false

  const dataTransfer = dataTransferFromPasteEvent(event)
  if (dataTransfer) {
    const plainText = dataTransfer.getData('text/plain') || dataTransfer.getData('text/uri-list')
    if (plainText) {
      if (isEmptyEditorRoot()) return insertPastedText(plainText, selection)
      $insertDataTransferForPlainText(dataTransfer, selection)
      return true
    }

    // Do not hand HTML back to Lexical's rich-text importer. Convert it to
    // text first, so pasted markup can never become executable/user HTML.
    const html = dataTransfer.getData('text/html')
    if (html) {
      const text = plainTextFromHtml(html)
      if (text !== null) {
        insertPastedText(text, selection)
      }
      return true
    }
  }

  if ('data' in event && typeof event.data === 'string' && event.data) {
    return insertPastedText(event.data, selection)
  }
  return false
}

function onPaste(event: PasteCommandType): boolean {
  if (!insertPlainPaste(event)) return false
  event.preventDefault()
  suppressControlledPasteUntil = typeof performance === 'undefined' ? Date.now() + 80 : performance.now() + 80
  return true
}

function onControlledTextInsertion(eventOrText: InputEvent | string): boolean {
  if (typeof eventOrText === 'string') return false
  const now = typeof performance === 'undefined' ? Date.now() : performance.now()
  if (now <= suppressControlledPasteUntil) {
    eventOrText.preventDefault()
    return true
  }
  // Some browsers surface paste only through beforeinput. Keep that path
  // plain-text as well, while allowing ordinary typed input through.
  if (eventOrText.dataTransfer && insertPlainPaste(eventOrText)) {
    eventOrText.preventDefault()
    return true
  }
  return false
}

function isInsideCodeBlock(): boolean {
  let inside = false
  const selection = $getSelection()
  if (!$isRangeSelection(selection)) return false
  const node = selection.anchor.getNode()
  const parent = node.getParent()
  inside = parent?.getType() === 'code' || node.getType() === 'code'
  return inside
}

function serializeActiveEditorState(): string {
  return $convertToMarkdownString(CHAT_MARKDOWN_TRANSFORMERS, $getRoot(), true)
}

function isHeadingAtEnd(): boolean {
  const selection = $getSelection()
  if (!$isRangeSelection(selection) || !selection.isCollapsed()) return false
  const anchor = selection.anchor.getNode()
  const parent = anchor.getParent()
  const block = anchor.getType() === 'heading'
    ? anchor
    : $isElementNode(parent) && parent.getType() === 'heading'
      ? parent
      : null
  if (!$isElementNode(block) || block.getType() !== 'heading') return false
  const lastDescendant = block.getLastDescendant()
  if (lastDescendant) {
    return lastDescendant.is(anchor) && selection.anchor.offset === lastDescendant.getTextContentSize()
  }
  return selection.anchor.key === block.getKey() && selection.anchor.offset === block.getChildrenSize()
}

function onBusyEnter(event: KeyboardEvent | null): boolean {
  if (!props.sending && !props.stopping && !props.uploading) return false
  if (!event || event.isComposing || composing.value || editor?.isComposing() || event.shiftKey) return false
  event.preventDefault()
  emit('submit', serializeActiveEditorState())
  return true
}

function onEnter(event: KeyboardEvent | null): boolean {
  if (!event || event.isComposing || composing.value || editor?.isComposing()) return false

  // The Markdown plugin is registered before this same-priority handler. It
  // consumes a code-fence Enter first; code blocks therefore retain Lexical's
  // native shortcut while ordinary Enter remains the chat send action.
  if (event.shiftKey) {
    event.preventDefault()
    if (isHeadingAtEnd()) {
      return editor?.dispatchCommand(INSERT_PARAGRAPH_COMMAND, undefined) ?? false
    }
    return editor?.dispatchCommand(INSERT_LINE_BREAK_COMMAND, false) ?? false
  }
  if (isInsideCodeBlock() && !props.sending && !props.stopping && !props.uploading) return false

  event.preventDefault()
  emit('submit', serializeActiveEditorState())
  return true
}

function importMarkdown(value: string) {
  const instance = editor
  if (!instance) return
  externalSyncToken += 1
  const markdown = normalizeLineEndings(value)
  lastEmittedMarkdown = markdown
  // A session/draft replacement starts a fresh undo context. Keep the
  // imported state as the new history baseline instead of exposing the prior
  // session's text through undo.
  historyCleanup?.()
  historyCleanup = registerHistory(instance, createEmptyHistoryState(), 250)
  instance.update(() => {
    const root = $getRoot()
    root.clear()
    $convertFromMarkdownString(markdown, CHAT_MARKDOWN_TRANSFORMERS, root, true)
    root.selectEnd()
  }, { tag: 'chat-external-sync', discrete: true })
  scheduleHeightSync()
}

function setupEditor() {
  if (typeof window === 'undefined' || !rootEl.value) return
  const instance = createEditor({
    namespace: 'asynctest-chat-markdown-editor',
    editable: true,
    theme: {
      root: 'chat-markdown-editor-root',
      paragraph: 'chat-markdown-paragraph',
      heading: {
        h1: 'chat-markdown-heading-h1',
        h2: 'chat-markdown-heading-h2',
        h3: 'chat-markdown-heading-h3',
        h4: 'chat-markdown-heading-h4',
        h5: 'chat-markdown-heading-h5',
        h6: 'chat-markdown-heading-h6',
      },
      list: {
        ul: 'chat-markdown-list-ul',
        ol: 'chat-markdown-list-ol',
        listitem: 'chat-markdown-list-item',
      },
      quote: 'chat-markdown-quote',
      code: 'chat-markdown-code',
    },
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode, CodeNode],
    onError: (error) => console.error('[ChatMarkdownEditor]', error),
  })
  editor = instance

  editorCleanups.push(registerRichText(instance))
  editorCleanups.push(registerList(instance))
  editorCleanups.push(instance.registerUpdateListener(onEditorUpdate))
  instance.setRootElement(rootEl.value)
  // Register history before the initial import so the imported draft becomes
  // the baseline that the first user undo can return to.
  editorCleanups.push(() => {
    historyCleanup?.()
    historyCleanup = null
  })
  historyCleanup = registerHistory(instance, createEmptyHistoryState(), 250)
  instance.update(() => {
    const root = $getRoot()
    root.clear()
    $convertFromMarkdownString(currentMarkdown.value, CHAT_MARKDOWN_TRANSFORMERS, root, true)
    root.selectEnd()
  }, { discrete: true })

  // Let the initial import settle before shortcut listeners are added; this
  // keeps imported Markdown from being treated as a typed shortcut.
  queueMicrotask(() => {
    if (!mounted || editor !== instance) return
    editorCleanups.push(instance.registerCommand(KEY_ENTER_COMMAND, onBusyEnter, COMMAND_PRIORITY_HIGH))
    markdownCleanup = registerMarkdownShortcuts(instance, CHAT_MARKDOWN_TRANSFORMERS)
    editorCleanups.push(() => {
      markdownCleanup?.()
      markdownCleanup = null
    })
    editorCleanups.push(instance.registerCommand(PASTE_COMMAND, onPaste, COMMAND_PRIORITY_HIGH))
    editorCleanups.push(instance.registerCommand(CONTROLLED_TEXT_INSERTION_COMMAND, onControlledTextInsertion, COMMAND_PRIORITY_HIGH))
    // Keep this at LOW: registerMarkdownShortcuts' code-fence Enter handler is
    // registered just before it and gets first refusal at the same priority.
    editorCleanups.push(instance.registerCommand(KEY_ENTER_COMMAND, onEnter, COMMAND_PRIORITY_LOW))
    pluginsReady = true
    initializing = false
    const latestProp = normalizeLineEndings(props.modelValue || '')
    if (latestProp !== currentMarkdown.value && latestProp !== lastEmittedMarkdown) {
      importMarkdown(latestProp)
    }
    queueSerialization()
  })
}

function disposeEditor() {
  mounted = false
  pluginsReady = false
  if (resizeListener && typeof window !== 'undefined') {
    window.removeEventListener('resize', resizeListener)
    resizeListener = null
  }
  if (heightRafId !== null && typeof window !== 'undefined') {
    if (typeof window.cancelAnimationFrame === 'function') window.cancelAnimationFrame(heightRafId)
    else window.clearTimeout(heightRafId)
    heightRafId = null
  }
  const instance = editor
  editorCleanups.splice(0).reverse().forEach((cleanup) => cleanup())
  historyCleanup?.()
  historyCleanup = null
  editor = null
  instance?.setRootElement(null)
}

watch(() => props.modelValue, (nextValue) => {
  const value = normalizeLineEndings(nextValue || '')
  if (value === lastPropMarkdown) return
  lastPropMarkdown = value
  if (!editor || !pluginsReady) return
  if (value === currentMarkdown.value || value === lastEmittedMarkdown) return
  importMarkdown(value)
})

function focusEditor() {
  const instance = editor
  const root = rootEl.value
  if (!instance || !root) {
    if (mounted && typeof window !== 'undefined') nextTick(focusEditor)
    return
  }
  root.focus()
  instance.focus(() => {
    instance.update(() => {
      $getRoot().selectEnd()
    })
  }, { defaultSelection: 'rootEnd' })
}

function getMarkdown() {
  return serializeEditorState()
}

onMounted(() => {
  mounted = true
  setupEditor()
  resizeListener = scheduleHeightSync
  window.addEventListener('resize', resizeListener)
  nextTick(scheduleHeightSync)
})

onBeforeUnmount(disposeEditor)

defineExpose({ focusEditor, getMarkdown })
</script>

<style scoped>
.chat-markdown-editor {
  position: relative;
  width: 100%;
  min-height: 40px;
  max-height: 170px;
  overflow: hidden;
}

.chat-markdown-editor-root {
  width: 100%;
  min-height: 40px;
  max-height: 170px;
  resize: none;
  border: 0;
  outline: none;
  overflow-x: hidden;
  padding: 3px 2px;
  box-sizing: border-box;
  color: #171b21;
  background: transparent;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-break: anywhere;
  caret-color: currentColor;
  cursor: text;
  -webkit-font-smoothing: antialiased;
}

.chat-markdown-editor-root:focus { outline: none; }

.chat-markdown-placeholder {
  position: absolute;
  top: 3px;
  left: 2px;
  max-width: calc(100% - 4px);
  overflow: hidden;
  color: #9ca3af;
  font-size: 14px;
  font-weight: 400;
  line-height: 1.5;
  pointer-events: none;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.chat-markdown-editor:not(.is-empty) .chat-markdown-placeholder { display: none; }

.chat-markdown-editor-root :deep(p),
.chat-markdown-editor-root :deep(h1),
.chat-markdown-editor-root :deep(h2),
.chat-markdown-editor-root :deep(h3),
.chat-markdown-editor-root :deep(h4),
.chat-markdown-editor-root :deep(h5),
.chat-markdown-editor-root :deep(h6),
.chat-markdown-editor-root :deep(blockquote),
.chat-markdown-editor-root :deep(pre),
.chat-markdown-editor-root :deep(ul),
.chat-markdown-editor-root :deep(ol) {
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  word-break: break-word;
  line-break: anywhere;
}

.chat-markdown-editor-root :deep(p) {
  margin: 0;
  min-height: 0;
}

.chat-markdown-editor-root :deep(h1),
.chat-markdown-editor-root :deep(h2),
.chat-markdown-editor-root :deep(h3),
.chat-markdown-editor-root :deep(h4),
.chat-markdown-editor-root :deep(h5),
.chat-markdown-editor-root :deep(h6) {
  margin: 0 0 4px;
  color: #20242b;
  font-weight: 650;
}

.chat-markdown-editor-root :deep(h1) { font-size: 19px; line-height: 1.3; }
.chat-markdown-editor-root :deep(h2) { font-size: 17px; line-height: 1.34; }
.chat-markdown-editor-root :deep(h3) { font-size: 16px; line-height: 1.38; }
.chat-markdown-editor-root :deep(h4) { font-size: 15px; line-height: 1.42; }
.chat-markdown-editor-root :deep(h5),
.chat-markdown-editor-root :deep(h6) { font-size: 14px; line-height: 1.5; }

.chat-markdown-editor-root :deep(ul),
.chat-markdown-editor-root :deep(ol) {
  margin: 0 0 4px;
  padding-left: 22px;
}

.chat-markdown-editor-root :deep(li) {
  margin: 0;
  padding-left: 2px;
  min-height: 21px;
}

.chat-markdown-editor-root :deep(blockquote) {
  margin: 0 0 4px;
  padding: 1px 0 1px 11px;
  border-left: 2px solid #d5d9df;
  color: #626975;
}

.chat-markdown-editor-root :deep(pre),
.chat-markdown-editor-root :deep(code.chat-markdown-code) {
  display: block;
  margin: 0 0 4px;
  padding: 8px 10px;
  border-radius: 9px;
  color: #252b34;
  background: #f4f5f7;
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
  font-size: 12.5px;
  line-height: 1.55;
  tab-size: 2;
}

.chat-markdown-editor-root :deep(code) {
  font-family: inherit;
  white-space: inherit;
}

.chat-markdown-editor-root :deep(span) {
  color: inherit;
  line-height: inherit;
  white-space: inherit;
}
</style>
