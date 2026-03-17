import { createEmptyHistoryState, registerHistory } from '@lexical/history';
import { registerList, ListItemNode, ListNode } from '@lexical/list';
import { registerRichText, HeadingNode, QuoteNode } from '@lexical/rich-text';
import {
  $getRoot,
  COMMAND_PRIORITY_HIGH,
  createEditor,
  KEY_ENTER_COMMAND,
  KEY_ESCAPE_COMMAND,
  KEY_TAB_COMMAND,
  type LexicalEditor,
} from 'lexical';
import { computed, reactive, shallowRef } from 'vue';
import { cloneLexicalState, richTextFromLexicalState, type SerializedLexicalEditorState } from './lexicalState';

type StartSessionOptions = {
  nodeId: string;
  initialState: SerializedLexicalEditorState;
  mode: 'append' | 'replace';
  caretPlacement?: 'start' | 'end' | 'none';
  onChange?: (state: SerializedLexicalEditorState) => void;
  onCommit?: () => void;
  onCancel?: () => void;
};

type ScrollTarget =
  | { kind: 'window'; top: number; left: number }
  | { kind: 'element'; element: HTMLElement; top: number; left: number };

const EDITOR_SCROLL_LOCK_FRAMES = 5;
const EDITOR_SCROLL_LOCK_MS = 120;

const editorRef = shallowRef<LexicalEditor | null>(null);
const activeNodeId = shallowRef<string | null>(null);
const latestState = shallowRef<SerializedLexicalEditorState | null>(null);
const sessionCallbacks = reactive<{
  onChange?: (state: SerializedLexicalEditorState) => void;
  onCommit?: () => void;
  onCancel?: () => void;
}>({});

let unregisterEditor: (() => void) | null = null;
let rootElement: HTMLElement | null = null;
let pendingSession: StartSessionOptions | null = null;

function isScrollableElement(element: HTMLElement) {
  const style = window.getComputedStyle(element);
  const overflowY = style.overflowY;
  const overflowX = style.overflowX;
  const canScrollY = /(auto|scroll|overlay)/.test(overflowY) && element.scrollHeight > element.clientHeight;
  const canScrollX = /(auto|scroll|overlay)/.test(overflowX) && element.scrollWidth > element.clientWidth;
  return canScrollY || canScrollX;
}

function captureScrollTargets(element: HTMLElement | null): ScrollTarget[] {
  if (typeof window === 'undefined') return [];
  const targets: ScrollTarget[] = [];
  if (document.scrollingElement) {
    targets.push({
      kind: 'window',
      top: window.scrollY,
      left: window.scrollX,
    });
  }
  let current = element?.parentElement ?? null;
  while (current) {
    if (isScrollableElement(current)) {
      targets.push({
        kind: 'element',
        element: current,
        top: current.scrollTop,
        left: current.scrollLeft,
      });
    }
    current = current.parentElement;
  }
  return targets;
}

function restoreScrollTargets(targets: ScrollTarget[]) {
  targets.forEach((target) => {
    if (target.kind === 'window') {
      window.scrollTo(target.left, target.top);
      return;
    }
    target.element.scrollTop = target.top;
    target.element.scrollLeft = target.left;
  });
}

function focusRootWithoutScroll(element: HTMLElement | null) {
  if (!element) return;
  const scrollTargets = captureScrollTargets(element);
  try {
    element.focus({ preventScroll: true });
  } catch {
    element.focus();
  }
  restoreScrollTargets(scrollTargets);
}

function lockScrollTargets(targets: ScrollTarget[]) {
  if (typeof window === 'undefined') return;
  const startedAt = performance.now();
  let frameCount = 0;
  const tick = () => {
    restoreScrollTargets(targets);
    frameCount += 1;
    if (frameCount >= EDITOR_SCROLL_LOCK_FRAMES) return;
    if (performance.now() - startedAt >= EDITOR_SCROLL_LOCK_MS) return;
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

function applyCaretPlacement(caretPlacement: 'start' | 'end' | 'none') {
  if (caretPlacement === 'none') return;
  const editor = createSingletonEditor();
  editor.update(() => {
    const root = $getRoot();
    if (caretPlacement === 'end') root.selectEnd();
    else root.selectStart();
  });
}

function focusEditor(caretPlacement: 'start' | 'end' | 'none' = 'end') {
  const editor = createSingletonEditor();
  const scrollTargets = captureScrollTargets(rootElement);
  focusRootWithoutScroll(rootElement);
  restoreScrollTargets(scrollTargets);
  editor.focus(undefined, { defaultSelection: 'rootStart' });
  restoreScrollTargets(scrollTargets);
  lockScrollTargets(scrollTargets);
  requestAnimationFrame(() => {
    applyCaretPlacement(caretPlacement);
    restoreScrollTargets(scrollTargets);
  });
}

function createSingletonEditor() {
  if (editorRef.value) return editorRef.value;
  const editor = createEditor({
    namespace: 'amind-node-editor',
    editable: true,
    nodes: [HeadingNode, QuoteNode, ListNode, ListItemNode],
    onError: (error) => {
      throw error;
    },
  });
  const historyState = createEmptyHistoryState();
  unregisterEditor = [
    registerRichText(editor),
    registerHistory(editor, historyState, 250),
    registerList(editor),
    editor.registerUpdateListener(({ editorState }) => {
      latestState.value = editorState.toJSON() as SerializedLexicalEditorState;
      if (latestState.value) sessionCallbacks.onChange?.(latestState.value);
    }),
    editor.registerCommand(
      KEY_ENTER_COMMAND,
      (event) => {
        if (event?.shiftKey) return false;
        if (event?.isComposing) return false;
        event?.preventDefault();
        sessionCallbacks.onCommit?.();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_TAB_COMMAND,
      (event) => {
        event?.preventDefault();
        sessionCallbacks.onCommit?.();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    ),
    editor.registerCommand(
      KEY_ESCAPE_COMMAND,
      (event) => {
        event?.preventDefault();
        sessionCallbacks.onCancel?.();
        return true;
      },
      COMMAND_PRIORITY_HIGH
    ),
  ].reduceRight((previous, current) => () => {
    current();
    previous?.();
  }, null as null | (() => void));
  editorRef.value = editor;
  if (rootElement) editor.setRootElement(rootElement);
  if (pendingSession) loadSession(pendingSession);
  return editor;
}

function loadSession(options: StartSessionOptions) {
  const editor = createSingletonEditor();
  pendingSession = options;
  activeNodeId.value = options.nodeId;
  sessionCallbacks.onChange = options.onChange;
  sessionCallbacks.onCommit = options.onCommit;
  sessionCallbacks.onCancel = options.onCancel;
  const editorState = editor.parseEditorState(options.initialState);
  editor.setEditorState(editorState);
  latestState.value = cloneLexicalState(options.initialState);
  requestAnimationFrame(() => {
    focusEditor(options.caretPlacement ?? 'end');
  });
}

function setRootElement(element: HTMLElement | null) {
  rootElement = element;
  const editor = createSingletonEditor();
  if (element) {
    element.tabIndex = 0;
    element.contentEditable = 'true';
    element.spellcheck = false;
    element.setAttribute('data-lexical-editor-root', '1');
  }
  editor.setRootElement(element);
}

export const lexicalEditorManager = {
  editor: computed(() => createSingletonEditor()),
  activeNodeId,
  latestState,
  startSession(options: StartSessionOptions) {
    loadSession(options);
  },
  stopSession() {
    activeNodeId.value = null;
    pendingSession = null;
    sessionCallbacks.onChange = undefined;
    sessionCallbacks.onCommit = undefined;
    sessionCallbacks.onCancel = undefined;
  },
  setRootElement,
  focusEditor,
  getActiveEditor() {
    return createSingletonEditor();
  },
  destroy() {
    editorRef.value?.setRootElement(null);
    unregisterEditor?.();
    unregisterEditor = null;
    editorRef.value = null;
    rootElement = null;
    pendingSession = null;
  },
  getRichTextSnapshot() {
    return latestState.value ? richTextFromLexicalState(latestState.value) : null;
  },
};

