<template>
    <div class="process-info-wrapper">
        <div v-if="!processData || processData.length === 0" class="empty-container">
            <div class="empty-state">
                <span v-if="isRunning" class="running-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
                <span class="empty-text">{{ isRunning ? 'Process 数据加载中...' : '暂无 Process 数据' }}</span>
            </div>
        </div>

        <div v-else class="process-content">
            <div class="section-header">
                <span class="section-title">网络请求过程</span>
                <span v-if="isRunning" class="loading-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
            </div>

            <div class="process-list">
                <div
                    v-for="(item, index) in processData"
                    :key="index"
                    class="process-item"
                    :class="getItemClass(item)"
                >
                    <div class="item-index">{{ index + 1 }}</div>
                    <div class="item-content">
                        <div class="item-icon" :class="getIconClass(item)">
                            <span class="icon-symbol">{{ getIconSymbol(item) }}</span>
                        </div>
                        <div class="item-text">
                            <template v-if="item.includes('\n')">
                                <div v-for="(line, lineIndex) in item.split('\n')" :key="lineIndex" class="text-line">
                                    {{ line }}
                                </div>
                            </template>
                            <template v-else>
                                {{ item }}
                            </template>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

const props = defineProps({
    detailData: {
        type: Object,
        default: null
    }
});

// 判断是否正在运行
const isRunning = computed(() => {
    return props.detailData?.status !== 'end';
});

// 获取 process 数据
const processData = computed(() => {
    const process = props.detailData?.process;
    if (!process) return [];
    if (Array.isArray(process)) return process;
    // 容错处理：如果是字符串，尝试解析
    if (typeof process === 'string') {
        try {
            const parsed = JSON.parse(process);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
});

// 获取条目的样式类
function getItemClass(item: string): string {
    if (!item) return '';

    if (item.includes('触发重定向') || item.includes('重定向')) {
        return 'item-redirect';
    }
    if (item.includes('总耗时') || item.includes('网络耗时')) {
        return 'item-summary';
    }
    if (item.includes('错误') || item.includes('失败') || item.includes('error') || item.includes('Error')) {
        return 'item-error';
    }
    if (item.includes('开始创建连接') || item.includes('连接创建完成')) {
        return 'item-connection';
    }
    if (item.includes('发送数据块')) {
        return 'item-send';
    }
    if (item.includes('接收数据块')) {
        return 'item-receive';
    }

    return 'item-default';
}

// 获取图标样式类
function getIconClass(item: string): string {
    if (!item) return 'icon-default';

    if (item.includes('触发重定向') || item.includes('重定向')) {
        return 'icon-redirect';
    }
    if (item.includes('总耗时') || item.includes('网络耗时')) {
        return 'icon-summary';
    }
    if (item.includes('错误') || item.includes('失败') || item.includes('error') || item.includes('Error')) {
        return 'icon-error';
    }
    if (item.includes('开始创建连接')) {
        return 'icon-connection-start';
    }
    if (item.includes('连接创建完成')) {
        return 'icon-connection-done';
    }
    if (item.includes('发送数据块')) {
        return 'icon-send';
    }
    if (item.includes('接收数据块')) {
        return 'icon-receive';
    }

    return 'icon-default';
}

// 获取图标符号
function getIconSymbol(item: string): string {
    if (!item) return '•';

    if (item.includes('触发重定向') || item.includes('重定向')) {
        return '↻';
    }
    if (item.includes('总耗时') || item.includes('网络耗时')) {
        return '✓';
    }
    if (item.includes('错误') || item.includes('失败') || item.includes('error') || item.includes('Error')) {
        return '✕';
    }
    if (item.includes('开始创建连接')) {
        return '○';
    }
    if (item.includes('连接创建完成')) {
        return '●';
    }
    if (item.includes('发送数据块')) {
        return '↑';
    }
    if (item.includes('接收数据块')) {
        return '↓';
    }

    return '•';
}
</script>

<style lang="scss" scoped>
.process-info-wrapper {
    padding: 16px;
    background: #fff;
    min-height: 100%;
}

.empty-container {
    display: flex;
    align-items: center;
    justify-content: center;
    min-height: 300px;
}

.empty-state {
    display: flex;
    align-items: center;
    gap: 8px;
}

.empty-text {
    color: #bbb;
    font-size: 13px;
    font-style: italic;
}

.running-indicator {
    display: inline-flex;
    align-items: center;
    gap: 4px;

    .dot {
        width: 5px;
        height: 5px;
        border-radius: 50%;
        background: #4caf50;
        animation: dotPulse 1.4s ease-in-out infinite;

        &:nth-child(1) {
            animation-delay: 0s;
        }

        &:nth-child(2) {
            animation-delay: 0.2s;
        }

        &:nth-child(3) {
            animation-delay: 0.4s;
        }
    }
}

.process-content {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.section-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 4px;
}

.section-title {
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.8px;
}

.loading-dots {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    .dot {
        width: 4px;
        height: 4px;
        border-radius: 50%;
        background: #4caf50;
        animation: dotPulse 1.4s ease-in-out infinite;

        &:nth-child(1) {
            animation-delay: 0s;
        }

        &:nth-child(2) {
            animation-delay: 0.2s;
        }

        &:nth-child(3) {
            animation-delay: 0.4s;
        }
    }
}

.process-list {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.process-item {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    padding: 12px;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    background: #fafafa;
    border-left: 3px solid #e0e0e0;
    transition: all 0.2s ease;

    &:hover {
        background: #f5f5f5;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
    }

    &.item-connection {
        border-left-color: #2196f3;
        background: linear-gradient(135deg, #e3f2fd 0%, #f8fbff 100%);
    }

    &.item-send {
        border-left-color: #ff9800;
        background: linear-gradient(135deg, #fff3e0 0%, #fffaf5 100%);
    }

    &.item-receive {
        border-left-color: #4caf50;
        background: linear-gradient(135deg, #e8f5e9 0%, #f8fdf9 100%);
    }

    &.item-redirect {
        border-left-color: #9c27b0;
        background: linear-gradient(135deg, #f3e5f5 0%, #faf8fb 100%);
    }

    &.item-summary {
        border-left-color: #00bcd4;
        background: linear-gradient(135deg, #e0f7fa 0%, #f5fcfd 100%);
        font-weight: 500;
    }

    &.item-error {
        border-left-color: #f44336;
        background: linear-gradient(135deg, #ffebee 0%, #fffafa 100%);
    }
}

.item-index {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    background: #fff;
    border-radius: 50%;
    font-size: 11px;
    font-weight: 600;
    color: #666;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
}

.item-content {
    flex: 1;
    display: flex;
    align-items: flex-start;
    gap: 10px;
}

.item-icon {
    flex-shrink: 0;
    width: 24px;
    height: 24px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    font-size: 14px;
    font-weight: 600;

    &.icon-connection-start {
        background: #e3f2fd;
        color: #1976d2;
    }

    &.icon-connection-done {
        background: #e3f2fd;
        color: #1565c0;
    }

    &.icon-send {
        background: #fff3e0;
        color: #f57c00;
    }

    &.icon-receive {
        background: #e8f5e9;
        color: #388e3c;
    }

    &.icon-redirect {
        background: #f3e5f5;
        color: #7b1fa2;
    }

    &.icon-summary {
        background: #e0f7fa;
        color: #0097a7;
    }

    &.icon-error {
        background: #ffebee;
        color: #d32f2f;
    }

    &.icon-default {
        background: #f5f5f5;
        color: #757575;
    }
}

.icon-symbol {
    line-height: 1;
}

.item-text {
    flex: 1;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    color: #24292e;
    line-height: 1.6;
    word-break: break-word;
}

.text-line {
    &:not(:last-child) {
        margin-bottom: 4px;
    }
}

@keyframes dotPulse {
    0%, 80%, 100% {
        transform: scale(0.8);
        opacity: 0.5;
    }
    40% {
        transform: scale(1.2);
        opacity: 1;
    }
}
</style>
