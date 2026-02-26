<template>
    <div class="custom-input-wrapper" :style="rootStyle">
        <div class="main-container" :class="allowNewline ? 'mode-multi' : 'mode-single'"
            :style="{ height: containerHeight }">
            <div class="left-padding-spacer"></div>
            <div class="editor-section">
                <div ref="backdrop" class="input-content backdrop" v-html="renderedHTML"></div>
                <textarea ref="textarea" v-model="internalValue" class="input-content main-textarea" rows="1"
                    :spellcheck="false" :wrap="allowNewline ? 'soft' : 'off'" :placeholder="placeholder"
                    @scroll="handleScroll" @keydown="handleKeyDown" @input="onInput" @paste="handlePaste"></textarea>
            </div>
            <div class="suffix-section" ref="suffixRef">
                <el-icon v-if="showClear" class="field-icon clear-btn" @click.stop="clearContent"
                    onselectstart="return false">
                    <CloseBold />
                </el-icon>
                <slot name="suffix"></slot>

                <div class="right-margin-spacer"></div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, computed, watch, onMounted, nextTick } from 'vue';
const props = defineProps({
    modelValue: { type: String, default: '' },
    allowNewline: { type: Boolean, default: false },
    showClear: { type: Boolean, default: true },
    maxHeight: { type: Number, default: 300 },
    paddingX: { type: null, default: 12 },
    paddingY: { type: null, default: 8 },
    fontSize: { type: null, default: 14 },
    placeholder: { type: String, default: '' }
});


const emit = defineEmits(['update:modelValue']);

const textarea: any = ref(null);
const backdrop: any = ref(null);
const suffixRef = ref(null);
const internalValue = ref('');
const containerHeight = ref('38px');

// 样式变量注入
const rootStyle = computed(() => {
    const px = typeof props.paddingX === 'number' ? `${props.paddingX}px` : props.paddingX;
    const py = typeof props.paddingY === 'number' ? `${props.paddingY}px` : props.paddingY;
    const fs = typeof props.fontSize === 'number' ? `${props.fontSize}px` : props.fontSize;

    // 强制 line-height 为 22px，计算出 8+22+8 = 38px
    const lineHeight = '22px';
    const baseH = `calc(${lineHeight} + (${py} * 2))`;

    return {
        '--pad-x': px,
        '--pad-y': py,
        '--font-size': fs,
        '--line-height': lineHeight,
        '--base-height': baseH,
        '--max-h': `${props.maxHeight}px`
    };
});

// HTML 渲染逻辑
const renderedHTML = computed(() => {
    const raw = internalValue.value || '';
    let content = raw.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

    // 橙色高亮 {{}}
    content = content.replace(/\{\{(.*?)\}\}/g, '<span class="hl-tag hl-orange" data-tip="变量: $1">{{$1}}</span>');
    // 蓝色高亮 {%%}
    content = content.replace(/\{\%(.*?)\%\}/g, '<span class="hl-tag hl-blue" data-tip="逻辑: $1">{%$1%}</span>');

    return props.allowNewline ? content + (raw.endsWith('\n') ? '&nbsp;' : '') : content;
});

const sanitize = (val: any) => {
    if (!props.allowNewline && val) {
        return val.toString().replace(/[\n\r]+/g, '');
    }
    return val;
};

// 高度及滚动同步
const syncHeight = () => {
    const el: any = textarea.value;
    if (!el) return;

    // 强制重置以获取准确 scrollHeight
    el.style.height = 'var(--base-height)';

    if (!props.allowNewline) {
        containerHeight.value = 'var(--base-height)';
        return;
    }
    el.style.height = '0px'

    nextTick(() => {
        const scrollH = el.scrollHeight;
        // 计算当前的单行像素高度用于比较
        const computedBaseH = parseFloat(getComputedStyle(el).lineHeight) + (parseFloat(props.paddingY) * 2);
        const finalH = Math.min(Math.max(scrollH, computedBaseH), props.maxHeight);

        containerHeight.value = `${finalH}px`;
        el.style.height = `${finalH}px`;
        handleScroll();
    });
};

const handleScroll = () => {
    if (backdrop.value && textarea.value) {
        backdrop.value.scrollTop = textarea.value.scrollTop;
        backdrop.value.scrollLeft = textarea.value.scrollLeft;
    }
};

const onInput = () => {
    syncHeight();
};

const handleKeyDown = (e: any) => {
    if (e.key === 'Enter' && !props.allowNewline) e.preventDefault();
};

const handlePaste = (e: any) => {
    if (!props.allowNewline) {
        e.preventDefault();
        const text = (e.clipboardData).getData('text');
        document.execCommand('insertText', false, text.replace(/[\n\r]+/g, ''));
    }
};

const clearContent = () => {
    internalValue.value = '';
};

// 监听器
watch(() => props.modelValue, (newVal) => {
    const cleanVal = sanitize(newVal);
    if (cleanVal !== internalValue.value) {
        internalValue.value = cleanVal;
        nextTick(syncHeight);
    }
}, { immediate: true });

watch(internalValue, (newVal) => {
    const cleanVal = sanitize(newVal);
    if (newVal !== cleanVal) internalValue.value = cleanVal;
    emit('update:modelValue', cleanVal);
    nextTick(syncHeight);
});

onMounted(() => {
    requestAnimationFrame(() => {
        requestAnimationFrame(() => {
            syncHeight()
        })
    })
});
</script>

<style scoped>
.custom-input-wrapper {
    width: 100%;
}

.main-container {
    display: flex;
    position: relative;
    width: 100%;
    box-sizing: border-box;
    overflow: hidden;
    /* 基础高度锁定 */
    min-height: var(--base-height);
    background: transparent;
}

.left-padding-spacer {
    width: var(--pad-x);
    flex-shrink: 0;
}

.editor-section {
    flex: 1;
    position: relative;
    overflow: hidden;
}

/* 1. 强制所有层使用完全相同的等宽字体 */
.input-content {
    width: 100%;
    /* 必须显式声明等宽字体，防止系统默认字体差异 */
    font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
    font-size: var(--font-size);
    line-height: var(--line-height);
    padding: var(--pad-y) 0;
    margin: 0;
    box-sizing: border-box;
    border: none;
    outline: none;
    display: block;
    background: transparent;

    /* 核心修复：禁止字体连字，确保每个字符占据的宽度绝对一致 */
    font-variant-ligatures: none;
    -webkit-font-variant-ligatures: none;

    /* 核心修复：强制字符间距一致 */
    letter-spacing: normal;
    word-spacing: normal;

    /* 核心修复：防止浏览器文本渲染优化导致的宽度微调 */
    text-rendering: optimizeSpeed;
}

.main-textarea {
    position: relative;
    z-index: 2;
    /* 使用 -webkit-text-fill-color 往往比 color: transparent 效果更好 */
    -webkit-text-fill-color: transparent;
    color: transparent;
    caret-color: #333;
    resize: none;
    /* 隐藏 Textarea 的滚动条，或者确保 Backdrop 也有同样的滚动空间 */
    scrollbar-width: none;
    /* Firefox */
}

.main-textarea::-webkit-scrollbar {
    display: none;
    /* Chrome/Safari */
}

.backdrop {
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    /* height: 100%; */
    z-index: 1;
    color: #333;
    pointer-events: none;
    overflow: hidden;
    /* 确保 backdrop 里的文本也不会因为排版优化而产生位移 */
    white-space: pre-wrap;
    word-break: break-all;
}

.suffix-section {
    display: flex;
    align-items: center;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 8px;
    flex-shrink: 0;
    z-index: 3;
    height: 100%;
    /* 固定高度对齐 */
}

.right-margin-spacer {
    width: var(--pad-x);
    flex-shrink: 0;
}

/* 布局模式逻辑 */
.mode-single .input-content {
    white-space: pre !important;
    word-wrap: normal !important;
    overflow-y: hidden;
    overflow-x: auto;
}

.mode-multi .input-content {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
}

.mode-multi .backdrop {
    white-space: pre-wrap !important;
    word-wrap: break-word !important;
}

/* 高亮标签修复 */
:deep(.hl-tag) {
    border-radius: 2px;
    position: relative;
    pointer-events: auto;
    /* 严禁在 hl-tag 上增加任何会改变字符宽度的属性 */
    font-weight: normal;
    font-style: normal;
    /* 使用 box-shadow 而不是 border/padding */
    padding: 0;
    margin: 0;
}

:deep(.hl-orange) {
    color: #ff8c00;
    background-color: rgba(255, 140, 0, 0.15);
    box-shadow: 0 0 0 1px rgba(255, 140, 0, 0.1);
}

:deep(.hl-blue) {
    color: #007bff;
    background-color: rgba(0, 123, 255, 0.15);
    box-shadow: 0 0 0 1px rgba(0, 123, 255, 0.1);
}

/* Tooltip */
:deep(.hl-tag):hover::after {
    content: attr(data-tip);
    position: absolute;
    bottom: 100%;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0, 0, 0, 0.85);
    color: #fff;
    padding: 4px 10px;
    border-radius: 4px;
    font-size: 12px;
    white-space: nowrap;
    margin-bottom: 8px;
    z-index: 100;
}

.clear-btn {
    cursor: pointer;
    color: #909399;
    font-size: 14px;
}

.clear-btn:hover {
    color: #f56c6c;
}

/* 核心修复：强制显示 placeholder */
.main-textarea::placeholder {
    /* 必须使用这个属性来覆盖之前的 transparent */
    -webkit-text-fill-color: #999; 
    color: #999;
    /* 确保不透明度正常 */
    opacity: 1; 
}

/* 针对火狐等浏览器的兼容处理 */
.main-textarea::-moz-placeholder {
    color: #999;
    opacity: 1;
}

/* 针对 IE 的兼容处理 */
.main-textarea:-ms-input-placeholder {
    color: #999 !important;
}
</style>