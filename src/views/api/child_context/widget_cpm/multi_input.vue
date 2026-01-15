<template>
    <div class="ast-container">
        <div class="ast-header">
            <div class="ast-header-left">
                <span class="ast-block-icon" :class="{ 'is-preview': showMarkdown }"></span>
                <label class="ast-label">{{ label }}</label>
            </div>

            <div class="ast-mode-badge" :class="showMarkdown ? 'mode-preview' : 'mode-edit'">
                <span class="dot"></span>
                {{ showMarkdown ? 'Markdown' : 'EDITING' }}
            </div>
        </div>

        <div class="ast-editor-wrapper" :class="{
            'ast-is-focused': isFocused && !showMarkdown,
            'ast-is-preview': showMarkdown
        }">
            <div class="ast-scan-line" v-show="!showMarkdown"></div>
            <div class="ast-glow-effect" v-show="isFocused && !showMarkdown"></div>
            <textarea v-if="!showMarkdown" ref="textareaRef" class="ast-textarea custom-scrollbar" :value="modelValue"
                @input="handleInput" @focus="isFocused = true" @blur="isFocused = false"
                placeholder="说明描述" spellcheck="false"></textarea>
            <div v-else class="ast-markdown-wrapper">
                <div class="ast-markdown-view custom-scrollbar">
                    <MarkdownComponent :data="localValue" />
                </div>
            </div>
            <div class="ast-toolbar">
                <div class="ast-toolbar-left">
                    <span class="ast-char-count">
                        <span class="count-number">{{ modelValue?.length || 0 }}</span>
                        <span class="count-label">字符</span>
                    </span>
                </div>
                <button class="ast-mode-toggle-btn" @click="toggleMode" :class="{ 'is-preview': showMarkdown }">
                    <span class="btn-background"></span>
                    <span class="btn-content">
                        <span class="icon">
                            <SwitchSvg style="height: 14px;"></SwitchSvg>
                        </span>
                        <span class="btn-text">{{ showMarkdown ? '编辑' : '转 MARKDOWN' }}</span>
                    </span>
                </button>
            </div>
        </div>
    </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import MarkdownComponent from '@/views/api/child_component/params_child/comp/markdown.vue';
import SwitchSvg from '@/assets/svg/tree/switch.vue'

const props = defineProps({
    modelValue: { type: String, default: '' },
    showMarkdown: { type: Boolean, default: false },
    label: { type: String, default: '说明文档' }
});

const emit = defineEmits(['update:modelValue', 'update:showMarkdown', 'save']);

// 状态
const isFocused = ref(false);
const textareaRef = ref(null);

// 用于 Markdown 组件的本地计算属性
const localValue = computed({
    get: () => props.modelValue,
    set: (val) => emit('update:modelValue', val)
});

// 输入处理
const handleInput = (e) => {
    emit('update:modelValue', e.target.value);
};

// 模式切换 - 核心功能
const toggleMode = () => {
    emit('save', !props.showMarkdown);
};
</script>

<style lang="scss" scoped>
// ==================== Variables ====================
$c-white: #ffffff;
$c-black: #0a0a0a;
$c-gray-light: #e5e7eb;
$c-gray-medium: #9ca3af;
$c-gray-dark: #374151;
$c-green: #10b981;
$c-green-light: #34d399;

$line-height: 1.7;
$font-size: 14px;
$padding-y: 20px;
$border-radius: 12px;
$transition-smooth: cubic-bezier(0.4, 0, 0.2, 1);

// ==================== Container ====================
.ast-container {
    width: 100%;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Inter', system-ui, sans-serif;
    margin: 4px 0;
    padding: 6px;
    box-sizing: border-box;
}

// ==================== Header ====================
.ast-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 12px;
    padding: 0 4px;

    .ast-header-left {
        display: flex;
        align-items: center;
        gap: 10px;
    }

    .ast-block-icon {
        width: 4px;
        height: 18px;
        background: linear-gradient(180deg, $c-black 0%, $c-gray-dark 100%);
        border-radius: 2px;
        transition: all 0.5s $transition-smooth;
        box-shadow: 0 2px 8px rgba($c-black, 0.15);

        &.is-preview {
            background: linear-gradient(180deg, $c-green 0%, $c-green-light 100%);
            box-shadow: 0 2px 12px rgba($c-green, 0.4);
            transform: scaleY(1.1);
        }
    }

    .ast-label {
        font-size: 15px;
        font-weight: 700;
        color: $c-black;
        letter-spacing: -0.01em;
    }

    .ast-mode-badge {
        display: flex;
        align-items: center;
        gap: 6px;
        font-size: 9px;
        font-weight: 600;
        padding: 4px 10px;
        border-radius: 6px;
        letter-spacing: 0.08em;
        backdrop-filter: blur(10px);
        transition: all 0.3s $transition-smooth;

        .dot {
            width: 5px;
            height: 5px;
            border-radius: 50%;
            background: currentColor;
        }

        &.mode-edit {
            color: $c-gray-dark;
            background: rgba($c-gray-medium, 0.12);
            border: 1px solid rgba($c-gray-medium, 0.2);

            .dot {
                background: $c-green;
                animation: pulse 2s ease-in-out infinite;
            }
        }

        &.mode-preview {
            color: $c-green;
            background: rgba($c-green, 0.12);
            border: 1px solid rgba($c-green, 0.25);
            box-shadow: 0 0 20px rgba($c-green, 0.15);

            .dot {
                animation: none;
            }
        }
    }
}

@keyframes pulse {

    0%,
    100% {
        opacity: 1;
    }

    50% {
        opacity: 0.5;
    }
}

// ==================== Main Wrapper ====================
.ast-editor-wrapper {
    position: relative;
    margin: 2px;
    background: linear-gradient(135deg, rgba($c-white, 0.95) 0%, rgba($c-white, 0.98) 100%);
    backdrop-filter: blur(20px);
    border: 1px solid rgba($c-gray-medium, 0.15);
    border-radius: $border-radius;
    box-shadow:
        0 4px 6px -1px rgba(0, 0, 0, 0.03),
        0 2px 4px -1px rgba(0, 0, 0, 0.02),
        0 0 0 1px rgba($c-white, 0.5) inset;
    transition: all 0.4s $transition-smooth;
    overflow: hidden;

    &::before {
        content: '';
        position: absolute;
        top: 0;
        left: 0;
        right: 0;
        bottom: 0;
        background: radial-gradient(circle at top right, rgba($c-green, 0.03), transparent 60%);
        pointer-events: none;
        opacity: 0;
        transition: opacity 0.5s ease;
    }

    &:hover {
        border-color: rgba($c-gray-dark, 0.25);
        box-shadow:
            0 8px 16px -4px rgba(0, 0, 0, 0.05),
            0 4px 8px -2px rgba(0, 0, 0, 0.03),
            0 0 0 1px rgba($c-white, 0.7) inset;
        transform: translateY(-1px);
    }

    &.ast-is-focused {
        margin: 4px;
        border-color: rgba($c-black, 0.3);
        box-shadow:
            0 12px 24px -6px rgba(0, 0, 0, 0.08),
            0 8px 16px -4px rgba(0, 0, 0, 0.05),
            0 0 0 3px rgba($c-green, 0.12),
            0 0 0 1px rgba($c-white, 0.9) inset;
        transform: translateY(-2px);

        &::before {
            opacity: 1;
        }

        .ast-scan-line {
            width: 100%;
            opacity: 1;
        }

        .ast-glow-effect {
            opacity: 1;
        }
    }

    &.ast-is-preview {
        border-color: rgba($c-green, 0.35);
        background: rgba($c-white, 0.98);

        &::before {
            opacity: 0;
        }
    }
}

.ast-scan-line {
    position: absolute;
    top: 0;
    left: 0;
    height: 2px;
    width: 0;
    background: linear-gradient(90deg, transparent, $c-green, transparent);
    opacity: 0;
    transition: width 0.6s $transition-smooth, opacity 0.6s $transition-smooth;
    z-index: 20;
}

.ast-glow-effect {
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: radial-gradient(circle, rgba($c-green, 0.08) 0%, transparent 70%);
    opacity: 0;
    transition: opacity 0.6s ease;
    pointer-events: none;
    z-index: 1;
}

// ==================== Content Area ====================
$h-min: calc(#{$font-size} * #{$line-height} * 5 + #{$padding-y} * 2);
$h-max: calc(#{$font-size} * #{$line-height} * 12 + #{$padding-y} * 2);

.ast-textarea {
    position: relative;
    z-index: 2;
    width: 100%;
    min-height: $h-min;
    max-height: $h-max;
    padding: $padding-y 24px;
    font-size: $font-size;
    line-height: $line-height;
    background-color: transparent;
    border: none;
    color: $c-black;
    font-weight: 400;
    resize: none;
    outline: none;
    overflow-y: auto;
    display: block;
    font-family: 'Monaco', 'Menlo', 'Ubuntu Mono', monospace;
    box-sizing: border-box;

    &::placeholder {
        color: rgba($c-gray-medium, 0.6);
        font-style: italic;
    }
}

.ast-markdown-wrapper {
    position: relative;
    z-index: 2;
    width: 100%;
    min-height: $h-min;
    overflow: visible;
}

.ast-markdown-view {
    width: 100%;
    padding: $padding-y 24px;
    font-size: $font-size;
    line-height: $line-height;
    color: $c-black;
    display: block;
    box-sizing: border-box;

    // ========== Markdown 样式美化 ==========
    :deep(h1),
    :deep(h2),
    :deep(h3),
    :deep(h4),
    :deep(h5),
    :deep(h6) {
        margin-top: 24px;
        margin-bottom: 12px;
        font-weight: 700;
        line-height: 1.4;
        color: $c-black;
    }

    :deep(h1) {
        font-size: 28px;
        padding-bottom: 8px;
        border-bottom: 2px solid rgba($c-green, 0.2);
    }

    :deep(h2) {
        font-size: 24px;
        padding-bottom: 6px;
        border-bottom: 1px solid rgba($c-gray-light, 0.6);
    }

    :deep(h3) {
        font-size: 20px;
    }

    :deep(p) {
        margin-bottom: 16px;
        color: $c-gray-dark;
        line-height: 1.8;
    }

    :deep(a) {
        color: $c-green;
        text-decoration: none;
        border-bottom: 1px solid rgba($c-green, 0.3);
        transition: all 0.2s ease;

        &:hover {
            color: $c-green-light;
            border-bottom-color: $c-green-light;
        }
    }

    :deep(code) {
        padding: 2px 6px;
        background: rgba($c-gray-medium, 0.1);
        border: 1px solid rgba($c-gray-medium, 0.15);
        border-radius: 4px;
        font-family: 'Monaco', 'Menlo', monospace;
        font-size: 0.9em;
        color: $c-black;
    }

    :deep(pre) {
        margin: 16px 0;
        padding: 16px;
        background: linear-gradient(135deg, rgba($c-black, 0.03) 0%, rgba($c-black, 0.05) 100%);
        border: 1px solid rgba($c-gray-medium, 0.15);
        border-radius: 8px;
        overflow-x: auto;
        backdrop-filter: blur(10px);

        code {
            padding: 0;
            background: transparent;
            border: none;
            color: $c-gray-dark;
        }
    }

    :deep(blockquote) {
        margin: 16px 0;
        padding: 12px 16px;
        border-left: 4px solid $c-green;
        background: rgba($c-green, 0.05);
        border-radius: 0 6px 6px 0;
        color: $c-gray-dark;
        font-style: italic;
    }

    :deep(ul),
    :deep(ol) {
        margin: 16px 0;
        padding-left: 24px;

        li {
            margin-bottom: 8px;
            color: $c-gray-dark;

            &::marker {
                color: $c-green;
            }
        }
    }

    :deep(table) {
        width: 100%;
        margin: 16px 0;
        border-collapse: collapse;
        border-radius: 8px;
        overflow: hidden;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.05);

        th {
            background: linear-gradient(180deg, rgba($c-black, 0.05) 0%, rgba($c-black, 0.08) 100%);
            padding: 12px 16px;
            font-weight: 600;
            text-align: left;
            color: $c-black;
            border-bottom: 2px solid rgba($c-green, 0.2);
        }

        td {
            padding: 10px 16px;
            border-bottom: 1px solid rgba($c-gray-light, 0.5);
            color: $c-gray-dark;
        }

        tr:last-child td {
            border-bottom: none;
        }

        tr:hover {
            background: rgba($c-green, 0.03);
        }
    }

    :deep(hr) {
        margin: 24px 0;
        border: none;
        height: 1px;
        background: linear-gradient(90deg, transparent, rgba($c-gray-medium, 0.3), transparent);
    }

    :deep(img) {
        max-width: 100%;
        height: auto;
        border-radius: 8px;
        margin: 16px 0;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.08);
    }
}

// ==================== Toolbar ====================
.ast-toolbar {
    position: relative;
    z-index: 10;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 8px 20px;
    background: linear-gradient(180deg, rgba($c-white, 0.7) 0%, rgba($c-gray-light, 0.3) 100%);
    backdrop-filter: blur(10px);
    border-top: 1px solid rgba($c-gray-medium, 0.12);
    min-height: 40px;
}

.ast-toolbar-left {
    display: flex;
    align-items: center;

    .ast-char-count {
        display: flex;
        align-items: baseline;
        gap: 6px;
        font-family: 'Monaco', 'Menlo', monospace;

        .count-number {
            font-size: 14px;
            font-weight: 700;
            color: $c-black;
        }

        .count-label {
            font-size: 11px;
            color: $c-gray-medium;
            letter-spacing: 0.02em;
        }
    }
}

// ==================== Mode Toggle Button (玻璃质感按钮) ====================
.ast-mode-toggle-btn {
    position: relative;
    display: flex;
    align-items: center;
    padding: 6px 16px;
    font-size: 12px;
    font-weight: 600;
    letter-spacing: 0.02em;
    border: 1px solid rgba($c-gray-medium, 0.2);
    border-radius: 8px;
    cursor: pointer;
    overflow: hidden;
    transition: all 0.3s $transition-smooth;

    // 玻璃质感背景
    background: linear-gradient(135deg,
            rgba($c-white, 0.95) 0%,
            rgba($c-white, 0.8) 100%);
    backdrop-filter: blur(12px) saturate(180%);
    box-shadow:
        0 3px 8px rgba(0, 0, 0, 0.04),
        0 1px 3px rgba(0, 0, 0, 0.02),
        0 0 0 1px rgba($c-white, 0.9) inset;

    .btn-background {
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        background: linear-gradient(135deg, $c-black 0%, $c-gray-dark 100%);
        opacity: 0;
        transition: opacity 0.4s $transition-smooth;
        z-index: 1;
    }

    .btn-content {
        position: relative;
        z-index: 2;
        display: flex;
        align-items: center;
        gap: 8px;
        color: $c-gray-dark;
        transition: color 0.3s ease;

        .icon {
            display: flex;
            align-items: center;
            justify-content: center;
            transition: transform 0.3s $transition-smooth, color 0.3s ease;

            svg {
                transition: all 0.3s ease;
            }
        }

        .btn-text {
            white-space: nowrap;
        }
    }

    // Hover 效果
    &:hover {
        border-color: rgba($c-black, 0.3);
        box-shadow:
            0 8px 20px rgba(0, 0, 0, 0.08),
            0 4px 10px rgba(0, 0, 0, 0.05),
            0 0 0 1px rgba($c-white, 0.9) inset;
        transform: translateY(-2px);

        .btn-background {
            opacity: 0.05;
        }

        .btn-content {
            color: $c-black;

            .icon {
                transform: scale(1.1) rotate(5deg);
                color: $c-green;
            }
        }
    }

    // Active 效果
    &:active {
        transform: translateY(0);
        box-shadow:
            0 2px 8px rgba(0, 0, 0, 0.06),
            0 1px 4px rgba(0, 0, 0, 0.04);
    }

    // Preview 模式样式 - 更优雅的黑白灰配色
    &.is-preview {
        border-color: rgba($c-black, 0.2);
        background: linear-gradient(135deg,
                rgba($c-black, 0.04) 0%,
                rgba($c-white, 0.85) 100%);
        box-shadow:
            0 4px 12px rgba(0, 0, 0, 0.08),
            0 2px 6px rgba(0, 0, 0, 0.04),
            0 0 0 1px rgba($c-green, 0.1) inset,
            inset 0 1px 2px rgba($c-white, 0.8);

        .btn-content {
            color: $c-gray-dark;

            .icon {
                color: $c-green;
            }
        }

        &:hover {
            border-color: rgba($c-black, 0.35);
            background: linear-gradient(135deg,
                    rgba($c-black, 0.06) 0%,
                    rgba($c-white, 0.9) 100%);
            box-shadow:
                0 8px 20px rgba(0, 0, 0, 0.12),
                0 4px 10px rgba(0, 0, 0, 0.06),
                0 0 0 1px rgba($c-green, 0.15) inset,
                inset 0 1px 2px rgba($c-white, 0.9);

            .btn-content {
                color: $c-black;

                .icon {
                    color: $c-green-light;
                }
            }
        }
    }
}

// ==================== Scrollbar ====================
.custom-scrollbar {
    &::-webkit-scrollbar {
        width: 8px;
        height: 8px;
    }

    &::-webkit-scrollbar-track {
        background: transparent;
    }

    &::-webkit-scrollbar-thumb {
        background: linear-gradient(180deg, rgba($c-gray-medium, 0.3), rgba($c-gray-medium, 0.5));
        border-radius: 4px;
        border: 2px solid transparent;
        background-clip: padding-box;
        transition: background 0.2s ease;

        &:hover {
            background: linear-gradient(180deg, rgba($c-gray-dark, 0.4), rgba($c-gray-dark, 0.6));
            background-clip: padding-box;
        }
    }
}
</style>