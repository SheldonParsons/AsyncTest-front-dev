<template>
    <div class="code-highlight-wrapper">
        <div v-if="isEmpty" class="empty-state">
            <span class="empty-text">{{ emptyText }}</span>
        </div>
        <div v-else class="editor-container-record" ref="editorDom"></div>
    </div>
</template>

<script lang="ts" setup>
import { ref, watch, onMounted, onBeforeUnmount, computed, shallowRef, nextTick } from 'vue';

const props = defineProps({
    content: {
        type: String,
        default: ''
    },
    language: {
        type: String,
        default: 'json', // json, html, plaintext
        validator: (value: string) => ['json', 'html', 'plaintext', 'text'].includes(value)
    },
    height: {
        type: String,
        default: '200px'
    },
    emptyText: {
        type: String,
        default: '暂无内容'
    }
});

const editorDom = ref<HTMLElement>();
const monaco = shallowRef<any>(null);
let editorInstance: any = null;

const isEmpty = computed(() => !props.content || props.content.trim() === '');

// 格式化JSON
function formatJSON(str: string): string {
    try {
        const parsed = JSON.parse(str);
        return JSON.stringify(parsed, null, 2);
    } catch (e) {
        return str;
    }
}

// 获取格式化后的内容
const formattedContent = computed(() => {
    if (!props.content) return '';
    if (props.language === 'json') {
        return formatJSON(props.content);
    }
    return props.content;
});

async function initEditor() {
    if (isEmpty.value) return;

    // 确保DOM元素已经渲染
    if (!editorDom.value) {
        console.warn('CodeHighlight: editorDom not ready');
        return;
    }

    // 动态导入Monaco Editor
    const m = await import('monaco-editor/esm/vs/editor/editor.main');
    monaco.value = m;

    // 根据语言类型导入对应的语言支持
    if (props.language === 'json') {
        await import('monaco-editor/esm/vs/language/json/monaco.contribution');
    } else if (props.language === 'html') {
        await import('monaco-editor/esm/vs/language/html/monaco.contribution');
    }

    // 定义主题 - 更轻盈的配色
    monaco.value.editor.defineTheme('codeHighlight', {
        base: 'vs',
        inherit: true,
        rules: [
            { token: 'string.key.json', foreground: '0066CC' },
            { token: 'string.value.json', foreground: 'D73A49' },
            { token: 'number', foreground: '005CC5' },
            { token: 'keyword', foreground: 'D73A49' },
            { token: 'comment', foreground: '6A737D', fontStyle: 'italic' }
        ],
        colors: {
            'editor.foreground': '#24292e',
            'editor.background': '#ffffff',
            'editorCursor.foreground': '#24292e',
            'editor.lineHighlightBackground': '#f6f8fa',
            'editorLineNumber.foreground': '#bbb',
            'editor.selectionBackground': '#c8e1ff',
            'editorWidget.background': '#ffffff'
        }
    });

    // 创建编辑器实例
    editorInstance = monaco.value.editor.create(editorDom.value, {
        value: formattedContent.value,
        language: props.language === 'text' ? 'plaintext' : props.language,
        theme: 'codeHighlight',
        readOnly: true,
        automaticLayout: true,
        fontSize: 13,
        fontFamily: '"JetBrains Mono", "SF Mono", "Monaco", "Menlo", "Consolas", monospace',
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        minimap: { enabled: false },
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            verticalScrollbarSize: 8,
            horizontalScrollbarSize: 8
        },
        wordWrap: 'on',
        wrappingStrategy: 'advanced',
        padding: { top: 8, bottom: 8 },
        renderWhitespace: 'none',
        contextmenu: false,
        folding: true,
        lineDecorationsWidth: 0,
        lineNumbersMinChars: 3
    });

    // 修复滚动冲突：当编辑器滚动到边界时，允许外层容器继续滚动
    editorInstance.getDomNode().addEventListener(
        'wheel',
        function (event: any) {
            const currentScrollTop = editorInstance.getScrollTop();
            const maxScrollTop = editorInstance.getScrollHeight() - editorInstance.getLayoutInfo().height;

            if (
                (currentScrollTop <= 0 && event.deltaY < 0) ||
                (currentScrollTop >= maxScrollTop && event.deltaY > 0)
            ) {
                event.stopPropagation();
                window.scrollBy(0, event.deltaY);
            }
        },
        { capture: true }
    );
}

// 监听内容变化
watch(() => [props.content, props.language], async () => {
    if (editorInstance) {
        editorInstance.dispose();
        editorInstance = null;
    }
    if (!isEmpty.value) {
        // 等待DOM更新后再初始化编辑器
        await nextTick();
        await initEditor();
    }
}, { deep: true });

onMounted(async () => {
    if (!isEmpty.value) {
        await initEditor();
    }
});

onBeforeUnmount(() => {
    if (editorInstance) {
        editorInstance.dispose();
        editorInstance = null;
    }
});
</script>

<style lang="scss" scoped>
.code-highlight-wrapper {
    width: 100%;
    border: 1px solid #e8e8e8;
    border-radius: 4px;
    overflow: hidden;
    background: #fff;
}

.editor-container-record {
    width: 100%;
    height: v-bind(height);
    min-height: 80px;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 80px;
    padding: 16px;
}

.empty-text {
    color: #bbb;
    font-size: 12px;
    font-style: italic;
}
</style>
