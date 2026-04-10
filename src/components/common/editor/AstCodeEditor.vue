<template>
  <div ref="rootEl" class="ast-code-editor" :class="{ 'ace-fullscreen': isFullscreen }" :style="isFullscreen ? {} : { height }">
    <!-- 顶部标题栏 -->
    <div class="ace-titlebar">
      <div class="titlebar-left">
        <img class="file-icon" src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_light.svg" alt="logo" />
        <span class="file-name">{{ displayFileName }}</span>
        <span v-if="dirty" class="dirty-dot" title="未保存">●</span>
      </div>
      <div class="titlebar-right">
        <button v-if="canRun" class="titlebar-btn" :title="`运行 (${runShortcutLabel})`" @click="handleRun">
          <span class="btn-run-icon">▶</span>
          <span class="btn-label">运行</span>
        </button>
        <button v-if="hasShortcuts" class="titlebar-btn" :title="shortcutsPanelOpen ? '关闭代码片段' : '代码片段'" @click="shortcutsPanelOpen = !shortcutsPanelOpen">
          <span>{ }</span>
        </button>
        <button class="titlebar-btn" title="重置" @click="handleReset">
          <span>↺</span>
        </button>
        <button class="titlebar-btn" :title="isFullscreen ? '退出全屏' : '全屏'" @click="toggleFullscreen">
          <span>{{ isFullscreen ? '⊡' : '⊞' }}</span>
        </button>
      </div>
    </div>

    <!-- 环境信息条 -->
    <div v-if="showEnvBanner" class="ace-env-banner">
      <div class="banner-items">
        <span class="banner-item">
          服务器 Python {{ serverPythonVersion }}，建议本地使用相同版本
        </span>
        <span class="banner-sep">|</span>
        <span class="banner-item">
          请勿使用第三方包（已提供 {{ serverPackages }}）如需其他包请联系管理员
        </span>
      </div>
      <button class="banner-close" @click="showEnvBanner = false">✕</button>
    </div>

    <!-- 编辑器主区域（编辑器 + 可选代码片段侧栏） -->
    <div class="ace-main">
      <!-- Monaco 编辑器主体 -->
      <div class="ace-body" ref="editorContainer"></div>

      <!-- 代码片段侧栏 -->
      <div v-if="shortcutsPanelOpen && hasShortcuts" class="ace-shortcuts-panel">
        <div class="shortcuts-header">代码片段</div>
        <div class="shortcuts-list">
          <div
            v-for="(s, i) in shortcuts"
            :key="i"
            class="shortcut-item"
            @click="insertShortcutCode(s.code)"
            :title="s.code"
          >
            {{ s.label }}
          </div>
        </div>
      </div>
    </div>

    <!-- 底部状态栏 -->
    <div class="ace-statusbar">
      <div class="statusbar-left">
        <span class="status-item">行 {{ cursorLine }}, 列 {{ cursorColumn }}</span>
        <span v-if="selectedCount > 0" class="status-item">已选择 {{ selectedCount }} 个字符</span>
      </div>
      <div class="statusbar-right">
        <button
          v-if="isElectronEnv"
          class="statusbar-python-btn"
          @click="showPythonSelector"
          @contextmenu.prevent="resetPythonBinary"
          :title="(activePythonDisplay || 'Python (自动检测)') + '\n右键点击恢复自动检测'"
        >
          🐍 {{ activePythonDisplay || 'Python (自动检测)' }}
        </button>
        <button
          class="statusbar-terminal-btn"
          :class="{ active: terminalVisible }"
          @click="terminalVisible = !terminalVisible"
          title="切换终端"
        >
          <span class="terminal-icon">⌘</span>
          <span>终端</span>
        </button>
        <span class="status-item">空格: 4</span>
        <span class="status-item">UTF-8</span>
        <span class="status-item status-lang">{{ languageLabel }}</span>
      </div>
    </div>

    <!-- 终端面板 -->
    <div v-if="terminalVisible" class="ace-terminal" :style="{ height: terminalHeight + 'px' }">
      <div class="terminal-drag-handle" @pointerdown="onTerminalDragStart"></div>
      <div class="terminal-header">
        <span class="terminal-title">终端</span>
        <div class="terminal-actions">
          <button v-if="isRunning" class="terminal-btn stop-btn" @click="handleStop" title="停止">
            ■
          </button>
          <button class="terminal-btn" @click="handleClearTerminal" title="清空">⌫</button>
          <button class="terminal-btn" @click="terminalVisible = false" title="关闭">✕</button>
        </div>
      </div>
      <div class="terminal-body" ref="terminalBody" tabindex="0">
        <!-- 首次提示信息 -->
        <div v-if="terminalLines.length === 0" class="terminal-welcome">
          <template v-if="isElectronEnv">
            <p class="welcome-hint">按 ▶ 运行 或 {{ runShortcutLabel }} 执行当前脚本</p>
          </template>
          <template v-else>
            <p class="welcome-hint">{{ envTips.useDesktop }}</p>
          </template>
        </div>
        <div v-for="(line, i) in terminalLines" :key="i" :class="['terminal-line', line.type]">
          {{ line.text }}
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, onBeforeUnmount, watch, computed, nextTick } from 'vue';
import { defineVscodeDarkTheme, EDITOR_FONT_FAMILY } from './themes/vscodeDark';
import { registerEnhancedPythonTokenizer } from './themes/pythonTokenizer';
import { registerCompletions } from './completions/index';
import { applyImportWarnings } from './utils/importChecker';
import { isElectron, ENV_TIPS, SERVER_PYTHON_VERSION, SERVER_PACKAGES } from './utils/envDetect';
import { connectPyrightLsp } from './lsp/pyrightBridge';

interface TerminalLine {
  text: string;
  type: 'stdout' | 'stderr' | 'info' | 'warn' | 'error';
}

const props = withDefaults(
  defineProps<{
    modelValue: string;
    language?: string;
    readonly?: boolean;
    showMinimap?: boolean;
    fileName?: string;
    enableBusinessCompletions?: boolean;
    height?: string;
    shortcuts?: { label: string; code: string }[];
  }>(),
  {
    language: 'python',
    readonly: false,
    showMinimap: true,
    enableBusinessCompletions: true,
    height: '100%',
    shortcuts: () => [],
  }
);

const emit = defineEmits<{
  'update:modelValue': [value: string];
  run: [code: string];
  save: [code: string];
}>();

// 状态
const dirty = ref(false);
const cursorLine = ref(1);
const cursorColumn = ref(1);
const selectedCount = ref(0);
const terminalVisible = ref(false);
const terminalLines = ref<TerminalLine[]>([]);
const isRunning = ref(false);
const showEnvBanner = ref(true);
const terminalHeight = ref(200);
const isFullscreen = ref(false);
const customPythonBin = ref('');       // 用户自定义 Python 路径
const activePythonDisplay = ref('');   // 状态栏显示当前 Python

const editorContainer = ref<HTMLElement>();
const terminalBody = ref<HTMLElement>();

let monacoInstance: any = null;
let editorInstance: any = null;
let editorModel: any = null;
const disposables: any[] = [];
let isInternalChange = false;
let importCheckTimer: ReturnType<typeof setTimeout> | null = null;
let disposeLsp: (() => void) | null = null;

// 计算属性
const isElectronEnv = computed(() => isElectron());
const serverPythonVersion = SERVER_PYTHON_VERSION;
const serverPackages = SERVER_PACKAGES.join('、');
const envTips = ENV_TIPS;

const isMac = computed(() => navigator.platform.toUpperCase().indexOf('MAC') >= 0);
const runShortcutLabel = computed(() => isMac.value ? '⌘+Enter' : 'Ctrl+Enter');
const canRun = computed(() => !props.readonly);
const hasShortcuts = computed(() => props.shortcuts.length > 0);
const shortcutsPanelOpen = ref(false);

const displayFileName = computed(() => {
  if (props.fileName) return props.fileName;
  const ext: Record<string, string> = { python: '.py', json: '.json', shell: '.sh', sql: '.sql' };
  return `asyncexecutor${ext[props.language] || ''}`;
});

const languageLabel = computed(() => {
  const map: Record<string, string> = { python: 'Python', json: 'JSON', shell: 'Shell', sql: 'SQL' };
  return map[props.language] || props.language;
});

// Monaco 语言 ID 映射
const monacoLangId = computed(() => {
  const map: Record<string, string> = { python: 'python', json: 'json', shell: 'shell', sql: 'sql' };
  return map[props.language] || props.language;
});

// 全局快捷键：焦点在终端时也能触发 Ctrl/Cmd+Enter
// 根元素 ref
const rootEl = ref<HTMLElement>();

function onGlobalKeydown(e: KeyboardEvent) {
  // 检查事件来源是否在本编辑器内
  if (!rootEl.value?.contains(e.target as Node)) return;

  if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
    // Monaco 编辑器内部已通过 addCommand 处理，避免重复触发
    const target = e.target as HTMLElement;
    if (target.closest('.monaco-editor')) return;
    e.preventDefault();
    handleRun();
  }
  if (e.key === 'Escape' && isFullscreen.value) {
    isFullscreen.value = false;
    nextTick(() => editorInstance?.layout());
  }
}

let bannerTimer: ReturnType<typeof setTimeout> | null = null;

onMounted(async () => {
  document.addEventListener('keydown', onGlobalKeydown, true);

  // 30 秒后自动关闭环境提示
  bannerTimer = setTimeout(() => { showEnvBanner.value = false; }, 30000);

  // 加载已持久化的 Python 配置
  loadPythonConfig();

  const m = await import('monaco-editor/esm/vs/editor/editor.main');
  // 按语言加载高亮
  if (props.language === 'python') {
    await import('monaco-editor/esm/vs/basic-languages/python/python.contribution');
  } else if (props.language === 'shell') {
    await import('monaco-editor/esm/vs/basic-languages/shell/shell.contribution');
  }
  monacoInstance = m;
  initEditor(m);
});

onBeforeUnmount(() => {
  document.removeEventListener('keydown', onGlobalKeydown, true);
  if (bannerTimer) clearTimeout(bannerTimer);

  if (importCheckTimer) clearTimeout(importCheckTimer);
  if (disposeLsp) { disposeLsp(); disposeLsp = null; }
  disposables.forEach((d) => d.dispose());
  if (editorModel) editorModel.dispose();
  if (editorInstance) editorInstance.dispose();
});

// 外部 v-model 变更同步
watch(
  () => props.modelValue,
  (val) => {
    if (isInternalChange) return;
    if (editorInstance && editorInstance.getValue() !== val) {
      isInternalChange = true;
      editorInstance.setValue(val);
      isInternalChange = false;
      dirty.value = false;
    }
  }
);

// 代码片段侧栏切换时，动态开关 minimap
watch(shortcutsPanelOpen, (open) => {
  if (!editorInstance) return;
  editorInstance.updateOptions({ minimap: { enabled: !open } });
});

function initEditor(monaco: any) {
  defineVscodeDarkTheme(monaco);
  // 注册增强版 Python tokenizer（f-string 高亮等）
  registerEnhancedPythonTokenizer(monaco);

  editorModel = monaco.editor.createModel(props.modelValue, monacoLangId.value);

  editorInstance = monaco.editor.create(editorContainer.value!, {
    model: editorModel,
    theme: 'ast-vscode-dark',
    automaticLayout: true,
    readOnly: props.readonly,

    // 字体
    fontSize: 14,
    lineHeight: 20,
    fontFamily: EDITOR_FONT_FAMILY,
    fontLigatures: false,
    fontWeight: '400',

    // 编辑
    tabSize: 4,
    insertSpaces: true,
    detectIndentation: false,
    autoClosingBrackets: 'always',
    autoClosingQuotes: 'always',
    autoSurround: 'languageDefined',
    formatOnPaste: true,

    // 光标
    cursorBlinking: 'smooth',
    cursorSmoothCaretAnimation: 'on',
    cursorStyle: 'line',
    cursorWidth: 2,

    // 滚动
    scrollBeyondLastLine: false,
    smoothScrolling: true,
    mouseWheelZoom: false,

    // 渲染
    renderWhitespace: 'selection',
    roundedSelection: true,
    renderLineHighlight: 'all',

    // 括号
    bracketPairColorization: { enabled: true },
    guides: {
      bracketPairs: 'active',
      bracketPairsHorizontal: true,
      indentation: true,
      highlightActiveIndentation: true,
    },

    // 建议
    quickSuggestions: { other: true, comments: false, strings: true },
    suggestOnTriggerCharacters: true,
    parameterHints: { enabled: true },
    wordBasedSuggestions: 'currentDocument',

    // 小地图（初始：侧栏关闭则显示）
    minimap: {
      enabled: props.showMinimap,
      maxColumn: 100,
      renderCharacters: false,
      showSlider: 'mouseover',
    },

    // 滚动条
    scrollbar: {
      verticalScrollbarSize: 10,
      horizontalScrollbarSize: 10,
      useShadows: false,
      alwaysConsumeMouseWheel: false,
    },

    // 其他
    stickyScroll: { enabled: true },
    folding: true,
    foldingStrategy: 'indentation',
    showFoldingControls: 'mouseover',
    padding: { top: 8, bottom: 8 },
    fixedOverflowWidgets: true,
  });

  // 滚动到边界时穿透到页面
  const domNode = editorInstance.getDomNode();
  if (domNode) {
    domNode.addEventListener('wheel', (event: WheelEvent) => {
      const scrollTop = editorInstance.getScrollTop();
      const scrollHeight = editorInstance.getScrollHeight();
      const layoutHeight = editorInstance.getLayoutInfo().height;
      const maxScrollTop = scrollHeight - layoutHeight;

      if (
        (scrollTop <= 0 && event.deltaY < 0) ||
        (scrollTop >= maxScrollTop && event.deltaY > 0)
      ) {
        event.stopPropagation();
      }
    }, { capture: true });
  }

  // 光标 & 选区
  disposables.push(
    editorInstance.onDidChangeCursorPosition((e: any) => {
      cursorLine.value = e.position.lineNumber;
      cursorColumn.value = e.position.column;
    })
  );
  disposables.push(
    editorInstance.onDidChangeCursorSelection((e: any) => {
      const sel = e.selection;
      selectedCount.value = sel.isEmpty() ? 0 : editorInstance.getModel().getValueInRange(sel).length;
    })
  );

  // 内容变更 → v-model + import 检查
  disposables.push(
    editorInstance.onDidChangeModelContent(() => {
      if (isInternalChange) return;
      dirty.value = true;
      const val = editorInstance.getValue();
      isInternalChange = true;
      emit('update:modelValue', val);
      isInternalChange = false;

      // 防抖 import 检查
      if (props.language === 'python') {
        if (importCheckTimer) clearTimeout(importCheckTimer);
        importCheckTimer = setTimeout(() => {
          applyImportWarnings(monaco, editorModel, val);
        }, 800);
      }
    })
  );

  // Ctrl+S 保存（emit 后重新派发事件，让外部也能捕获）
  editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
    emit('save', editorInstance.getValue());
    dirty.value = false;
    // 重新派发 Ctrl+S / Cmd+S，让父组件的 keydown 监听也能收到
    const isMacOS = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    rootEl.value?.dispatchEvent(new KeyboardEvent('keydown', {
      key: 's',
      code: 'KeyS',
      ctrlKey: !isMacOS,
      metaKey: isMacOS,
      bubbles: true,
      cancelable: true,
    }));
  });

  // Ctrl+Enter 运行
  editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.Enter, () => {
    handleRun();
  });

  // Option+Cmd+L (Mac) / Ctrl+Alt+L (Win) 格式化代码
  editorInstance.addCommand(
    monaco.KeyMod.Alt | monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyL,
    () => { formatCode(); }
  );

  // 注册补全
  const completionDisposables = registerCompletions(monaco, {
    language: props.language,
    enableBusiness: props.enableBusinessCompletions,
  });
  disposables.push(...completionDisposables);

  // 初始 import 检查
  if (props.language === 'python' && props.modelValue) {
    applyImportWarnings(monaco, editorModel, props.modelValue);
  }

  // Electron 端：连接 Pyright LSP
  if (isElectronEnv.value && props.language === 'python') {
    connectPyrightLsp({
      monaco,
      model: editorModel,
      language: monacoLangId.value,
    }).then((dispose) => {
      disposeLsp = dispose;
    }).catch((err) => {
      console.warn('[AstCodeEditor] LSP connection failed:', err);
    });
  }
}

// ── 操作 ──

/** 格式化代码：Python 基本缩进整理 */
function formatCode() {
  if (!editorInstance) return;
  const model = editorInstance.getModel();
  if (!model) return;

  const src = model.getValue();
  const formatted = formatPython(src);
  if (formatted === src) return;

  // 用 pushEditOperations 保留撤销栈
  editorInstance.pushUndoStop();
  editorInstance.executeEdits('format', [{
    range: model.getFullModelRange(),
    text: formatted,
  }]);
  editorInstance.pushUndoStop();
}

/**
 * 轻量 Python 格式化：
 * - 行尾空格清理
 * - 空行不超过 2 连续
 * - 缩进统一为 4 空格（tab→4空格）
 * - 冒号后代码块自动对齐
 */
function formatPython(src: string): string {
  let lines = src.split('\n');

  // 1) tab → 4 空格, 行尾空格清理
  lines = lines.map(l => l.replace(/\t/g, '    ').replace(/\s+$/, ''));

  // 2) 压缩连续空行（最多保留 2 行）
  const result: string[] = [];
  let blankCount = 0;
  for (const line of lines) {
    if (line.trim() === '') {
      blankCount++;
      if (blankCount <= 2) result.push('');
    } else {
      blankCount = 0;
      result.push(line);
    }
  }

  // 3) 移除文件尾部多余空行，保留恰好一个换行
  while (result.length > 0 && result[result.length - 1] === '') result.pop();
  result.push('');

  return result.join('\n');
}

function handleRun() {
  if (props.readonly) return;
  terminalVisible.value = true;
  terminalLines.value = []; // 每次运行清空终端

  if (!isElectronEnv.value) {
    appendTerminalLine(ENV_TIPS.useDesktop, 'warn');
    return;
  }

  const code = editorInstance?.getValue() ?? '';
  emit('run', code);
  runInElectron(code);
}

// 渲染端 output/exit 监听的取消函数
let cleanupOutputListeners: (() => void) | null = null;

async function runInElectron(code: string) {
  const api = (window as any).electronAPI;
  if (!api?.python) return;

  isRunning.value = true;
  stopping = false;

  // 先清理上一次可能残留的监听
  if (cleanupOutputListeners) {
    cleanupOutputListeners();
    cleanupOutputListeners = null;
  }

  appendTerminalLine(`$ python ${displayFileName.value}`, 'info');

  // 注册实时输出监听
  const unsubOutput = api.python.onOutput((data: { type: string; text: string }) => {
    appendTerminalLine(data.text, data.type === 'stderr' ? 'stderr' : 'stdout');
  });
  const unsubExit = api.python.onExit((data: { code: number; signal: string; message: string }) => {
    isRunning.value = false;
    appendTerminalLine(data.message, data.code === 0 ? 'info' : 'error');
    cleanup();
  });

  function cleanup() {
    unsubOutput();
    unsubExit();
    cleanupOutputListeners = null;
  }
  cleanupOutputListeners = cleanup;

  try {
    const result = await api.python.run({ code, customBin: customPythonBin.value || undefined });

    if (result.status === 'no_python') {
      isRunning.value = false;
      appendTerminalLine(result.message, 'error');
      cleanup();
      return;
    }

    if (result.status === 'error') {
      isRunning.value = false;
      appendTerminalLine(result.message, 'error');
      cleanup();
      return;
    }

    // 显示 Python 路径和版本
    if (result.pythonPath) {
      activePythonDisplay.value = `Python ${result.pythonVersion || ''} (${result.pythonPath})`;
      appendTerminalLine(`🐍 ${activePythonDisplay.value}`, 'info');
    }

    // 版本不一致警告（黄色）
    if (result.versionWarning) {
      appendTerminalLine(`⚠ ${result.versionWarning}`, 'warn');
    }
  } catch (err: any) {
    isRunning.value = false;
    appendTerminalLine(`执行失败: ${err.message}`, 'error');
    cleanup();
  }
}

/** 选择 Python 环境（持久化） */
async function showPythonSelector() {
  const api = (window as any).electronAPI;
  if (!api?.python?.selectBinary) return;

  const result = await api.python.selectBinary();
  if (result.canceled) return;

  customPythonBin.value = result.path;
  activePythonDisplay.value = result.path;
}

/** 右键重置为自动检测 */
async function resetPythonBinary() {
  const api = (window as any).electronAPI;
  if (!api?.python?.resetBinary) return;

  await api.python.resetBinary();
  customPythonBin.value = '';
  activePythonDisplay.value = '';
}

/** 加载已持久化的 Python 配置 */
async function loadPythonConfig() {
  const api = (window as any).electronAPI;
  if (!api?.python?.getConfig) return;

  const cfg = await api.python.getConfig();
  if (cfg?.pythonBin) {
    customPythonBin.value = cfg.pythonBin;
    activePythonDisplay.value = cfg.pythonBin;
  }
}

let stopping = false;
async function handleStop() {
  if (stopping) return;
  stopping = true;

  // 立刻清理渲染端监听，不再接收数据
  if (cleanupOutputListeners) {
    cleanupOutputListeners();
    cleanupOutputListeners = null;
  }

  const api = (window as any).electronAPI;
  if (api?.python) {
    try {
      const result = await api.python.stop();
      console.log('[AstCodeEditor] stop result:', result);
    } catch (err: any) {
      console.error('[AstCodeEditor] stop error:', err);
    }
  }
  isRunning.value = false;
  appendTerminalLine('\n[进程已终止]', 'warn');
  stopping = false;
}

function handleReset() {
  editorInstance?.setValue(props.modelValue);
  dirty.value = false;
}

function handleClearTerminal() {
  terminalLines.value = [];
}

function toggleFullscreen() {
  isFullscreen.value = !isFullscreen.value;
  // 让 Monaco 重新计算布局
  nextTick(() => editorInstance?.layout());
}

// 终端面板拖拽调高
function onTerminalDragStart(e: PointerEvent) {
  e.preventDefault();
  const startY = e.clientY;
  const startH = terminalHeight.value;

  function onMove(ev: PointerEvent) {
    const delta = startY - ev.clientY;
    terminalHeight.value = Math.max(120, Math.min(600, startH + delta));
  }

  function onUp() {
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
  }

  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
}

/** 公开方法：向终端追加输出 */
function appendTerminalLine(text: string, type: TerminalLine['type'] = 'stdout') {
  terminalLines.value.push({ text, type });
  nextTick(() => {
    if (terminalBody.value) {
      terminalBody.value.scrollTop = terminalBody.value.scrollHeight;
    }
  });
}

/** 公开方法：设置运行状态 */
function setRunning(val: boolean) {
  isRunning.value = val;
}

/** 公开方法：获取编辑器实例 */
function getEditor() {
  return editorInstance;
}

/** 插入代码片段到编辑器光标位置 */
function insertShortcutCode(code: string) {
  if (props.readonly || !editorInstance) return;
  insertText(code);
}

/** 公开方法：在光标位置插入文本 */
function insertText(text: string) {
  if (!editorInstance || !monacoInstance) return;
  const position = editorInstance.getPosition();
  if (!position) return;
  editorInstance.executeEdits(null, [{
    range: new monacoInstance.Range(
      position.lineNumber, position.column,
      position.lineNumber, position.column
    ),
    text,
    forceMoveMarkers: true,
  }]);
  editorInstance.focus();
}

defineExpose({
  appendTerminalLine,
  setRunning,
  getEditor,
  clearTerminal: handleClearTerminal,
  insertText,
});
</script>

<style lang="scss" scoped>
.ast-code-editor {
  display: flex;
  flex-direction: column;
  min-height: 0;
  background: #1E1E1E;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.3);

  &.ace-fullscreen {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    z-index: 9999;
    border-radius: 8px;
    padding: 12px;
    background: #111;
    height: 100vh !important;
    box-sizing: border-box;
  }
}

/* ── 标题栏 ── */
.ace-titlebar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 36px;
  min-height: 36px;
  padding: 0 12px;
  background: #252526;
  border-bottom: 1px solid #1E1E1E;
  user-select: none;

  .titlebar-left {
    display: flex;
    align-items: center;
    gap: 6px;

    .file-icon {
      height: 16px;
      width: auto;
      object-fit: contain;
    }

    .file-name {
      font-size: 13px;
      color: #CCC;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .dirty-dot {
      color: #E8E8E8;
      font-size: 18px;
      line-height: 1;
      margin-top: -2px;
    }
  }

  .titlebar-right {
    display: flex;
    align-items: center;
    gap: 2px;
  }
}

.titlebar-btn {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 24px;
  padding: 0 8px;
  border: none;
  background: transparent;
  color: #CCC;
  border-radius: 4px;
  cursor: pointer;
  font-size: 12px;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  transition: background 0.15s;

  &:hover { background: #3C3C3C; }
  &:active { background: #505050; }

  .btn-run-icon {
    color: #89D185;
    font-size: 10px;
  }
}

/* ── 环境信息条 ── */
.ace-env-banner {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 3px 12px;
  background: #2C2C32;
  border-bottom: 1px solid #3C3C3C;

  .banner-items {
    display: flex;
    align-items: center;
    gap: 8px;
    flex-wrap: wrap;
  }

  .banner-item {
    font-size: 11px;
    color: #B0B0B0;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
  }

  .banner-sep {
    color: #555;
    font-size: 11px;
  }

  .banner-close {
    border: none;
    background: transparent;
    color: #858585;
    cursor: pointer;
    font-size: 12px;
    padding: 2px 4px;
    border-radius: 3px;
    flex-shrink: 0;

    &:hover { background: #3C3C3C; color: #CCC; }
  }
}

/* ── 编辑器主区域（编辑器 + 侧栏） ── */
.ace-main {
  flex: 1;
  min-height: 0;
  display: flex;
  overflow: hidden;
}

.ace-body {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}

.ace-shortcuts-panel {
  width: 160px;
  min-width: 160px;
  border-left: 1px solid #3C3C3C;
  background: #252526;
  display: flex;
  flex-direction: column;
  overflow: hidden;

  .shortcuts-header {
    padding: 6px 10px;
    font-size: 11px;
    color: #858585;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    text-transform: uppercase;
    letter-spacing: 0.5px;
    border-bottom: 1px solid #3C3C3C;
    flex-shrink: 0;
  }

  .shortcuts-list {
    flex: 1;
    overflow-y: auto;
    padding: 4px 0;
  }

  .shortcut-item {
    padding: 5px 10px;
    font-size: 12px;
    color: #BBBBBB;
    cursor: pointer;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.15s, color 0.15s;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;

    &:hover {
      background: #2A2D2E;
      color: #E0E0E0;
    }
  }
}

/* ── 状态栏 ── */
.ace-statusbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  height: 24px;
  min-height: 24px;
  padding: 0 10px;
  background: #007ACC;
  user-select: none;

  .statusbar-left,
  .statusbar-right {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .status-item {
    font-size: 12px;
    color: #FFF;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    white-space: nowrap;
  }

  .status-lang { font-weight: 600; }

  .statusbar-python-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: #B0B0B0;
    font-size: 11px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    cursor: pointer;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    max-width: 300px;
    overflow: hidden;
    text-overflow: ellipsis;
    transition: background 0.15s;
    &:hover { background: rgba(255, 255, 255, 0.1); color: #FFF; }
  }

  .statusbar-terminal-btn {
    display: flex;
    align-items: center;
    gap: 4px;
    border: none;
    background: transparent;
    color: #FFF;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    cursor: pointer;
    padding: 1px 6px;
    border-radius: 3px;
    white-space: nowrap;
    transition: background 0.15s;
    .terminal-icon { font-size: 11px; }
    &:hover { background: rgba(255, 255, 255, 0.15); }
    &.active { background: rgba(255, 255, 255, 0.2); }
  }
}

/* ── 终端面板 ── */
.ace-terminal {
  border-top: 1px solid #3C3C3C;
  background: #1E1E1E;
  min-height: 120px;
  display: flex;
  flex-direction: column;
  flex-shrink: 0;
  position: relative;

  .terminal-drag-handle {
    position: absolute;
    top: -3px;
    left: 0;
    right: 0;
    height: 6px;
    cursor: ns-resize;
    z-index: 10;

    &:hover {
      background: rgba(0, 122, 204, 0.4);
    }
  }

  .terminal-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 30px;
    min-height: 30px;
    padding: 0 12px;
    background: #252526;
    border-bottom: 1px solid #3C3C3C;

    .terminal-title {
      font-size: 12px;
      color: #CCC;
      font-weight: 600;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    }

    .terminal-actions {
      display: flex;
      align-items: center;
      gap: 2px;
    }
  }

  .terminal-btn {
    border: none;
    background: transparent;
    color: #858585;
    cursor: pointer;
    font-size: 13px;
    padding: 2px 6px;
    border-radius: 3px;

    &:hover { background: #3C3C3C; color: #CCC; }

    &.stop-btn {
      color: #F14C4C;
      &:hover { background: #3C3C3C; }
    }
  }

  .terminal-body {
    flex: 1;
    overflow-y: auto;
    padding: 8px 12px;
    font-family: Menlo, Monaco, 'Courier New', monospace;
    font-size: 13px;
    line-height: 1.5;
    outline: none;
  }

  .terminal-welcome {
    .welcome-hint {
      color: #858585;
      margin: 0;
      font-size: 13px;
    }
  }

  .terminal-line {
    white-space: pre-wrap;
    word-break: break-all;

    &.stdout { color: #CCC; }
    &.stderr { color: #F14C4C; }
    &.info { color: #3794FF; }
    &.warn { color: #CCA700; }
    &.error { color: #F14C4C; font-weight: 600; }
  }
}
</style>
