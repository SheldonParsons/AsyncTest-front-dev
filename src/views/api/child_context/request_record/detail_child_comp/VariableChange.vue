<template>
    <div class="variable-change-wrapper">
        <div v-if="!variableData || variableData.length === 0" class="empty-container">
            <div class="empty-state">
                <span v-if="isRunning" class="running-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
                <span class="empty-text">{{ isRunning ? '临时变量数据加载中...' : '暂无临时变量替换' }}</span>
            </div>
        </div>

        <div v-else class="variable-content">
            <div class="section-header">
                <span class="section-title">临时变量替换记录</span>
                <span class="count-badge">{{ variableData.length }}</span>
                <span v-if="isRunning" class="loading-dots">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
            </div>

            <div class="variable-list">
                <div
                    v-for="(item, index) in variableData"
                    :key="index"
                    class="variable-item"
                >
                    <div class="item-header">
                        <div class="variable-key">
                            <span class="key-icon">⇄</span>
                            <span class="key-text">{{ item.key || 'N/A' }}</span>
                        </div>
                        <div class="interface-tag">
                            {{ item.interface || '未知接口' }}
                        </div>
                    </div>

                    <div class="item-body">
                        <div class="info-row">
                            <div class="info-label">替换值</div>
                            <div class="info-value value-display">
                                {{ formatValue(item.value) }}
                            </div>
                        </div>

                        <div class="info-row">
                            <div class="info-label">替换时间</div>
                            <div class="info-value time-display">
                                {{ formatTime(item.time) }}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';

interface VariableChange {
    key: string;
    time: number;
    value: any;
    interface: string;
}

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

// 获取临时变量数据
const variableData = computed<VariableChange[]>(() => {
    const data = props.detailData?.change_temporary_variable;
    if (!data) return [];
    if (Array.isArray(data)) return data;
    // 容错处理：如果是字符串，尝试解析
    if (typeof data === 'string') {
        try {
            const parsed = JSON.parse(data);
            return Array.isArray(parsed) ? parsed : [];
        } catch (e) {
            return [];
        }
    }
    return [];
});

// 格式化时间戳
function formatTime(timestamp: number | string | undefined): string {
    if (!timestamp) return 'N/A';
    try {
        const num = typeof timestamp === 'string' ? parseFloat(timestamp) : timestamp;
        const date = new Date(num * 1000);
        return date.toLocaleString('zh-CN', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: false
        });
    } catch (e) {
        return String(timestamp);
    }
}

// 格式化值
function formatValue(value: any): string {
    if (value === null) return 'null';
    if (value === undefined) return 'undefined';
    if (typeof value === 'object') {
        try {
            return JSON.stringify(value);
        } catch (e) {
            return String(value);
        }
    }
    return String(value);
}
</script>

<style lang="scss" scoped>
.variable-change-wrapper {
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

.variable-content {
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

.count-badge {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    min-width: 20px;
    height: 20px;
    padding: 0 6px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-size: 11px;
    font-weight: 600;
    border-radius: 10px;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
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

.variable-list {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.variable-item {
    background: #fafafa;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-left: 3px solid #667eea;
    overflow: hidden;
    transition: all 0.2s ease;

    &:hover {
        background: #f5f5f5;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        border-left-color: #764ba2;
    }
}

.item-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 12px 14px;
    background: linear-gradient(135deg, #f5f7fa 0%, #fafbfc 100%);
    border-bottom: 1px solid #e8eaed;
}

.variable-key {
    display: flex;
    align-items: center;
    gap: 8px;
}

.key-icon {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 24px;
    height: 24px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: #fff;
    font-size: 16px;
    font-weight: 900;
    border-radius: 4px;
    box-shadow: 0 2px 4px rgba(102, 126, 234, 0.3);
}

.key-text {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 14px;
    font-weight: 600;
    color: #24292e;
}

.interface-tag {
    padding: 4px 10px;
    background: linear-gradient(135deg, #e0e7ff 0%, #f0f4ff 100%);
    color: #4c51bf;
    font-size: 11px;
    font-weight: 500;
    border-radius: 12px;
    border: 1px solid #c7d2fe;
}

.item-body {
    padding: 12px 14px;
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.info-row {
    display: flex;
    align-items: center;
    gap: 12px;
}

.info-label {
    flex-shrink: 0;
    width: 80px;
    font-size: 11px;
    font-weight: 600;
    color: #888;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.info-value {
    flex: 1;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    color: #24292e;
    line-height: 1.6;
    word-break: break-word;
}

.value-display {
    padding: 8px 12px;
    background: linear-gradient(135deg, #fff9e6 0%, #fffef5 100%);
    border-left: 2px solid #fbbf24;
    border-radius: 4px;
    font-weight: 500;
    color: #92400e;
}

.time-display {
    font-size: 12px;
    color: #6b7280;
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
