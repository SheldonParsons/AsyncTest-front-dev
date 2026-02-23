<template>
    <div class="response-content-wrapper">
        <div v-if="!responseData" class="empty-container">
            <div class="empty-state">
                <span v-if="isRunning" class="running-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
                <span class="empty-text">{{ isRunning ? '响应数据加载中...' : '暂无响应数据' }}</span>
            </div>
        </div>

        <div v-else class="content-sections">
            <!-- 响应时间、HTTP状态码、耗时 - 一行显示 -->
            <div class="meta-row">
                <!-- Time -->
                <div class="meta-item" :class="{ loading: isRunning && !responseData.time }">
                    <div class="section-header">
                        <span class="section-title">响应时间</span>
                        <span v-if="isRunning && !responseData.time" class="loading-dots">
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </span>
                    </div>
                    <div class="section-content">
                        <div v-if="responseData.time" class="time-display">{{ formatTime(responseData.time) }}</div>
                        <div v-else class="skeleton-box"></div>
                    </div>
                </div>

                <!-- Status -->
                <div class="meta-item" :class="{ loading: isRunning && !responseData.status }">
                    <div class="section-header">
                        <span class="section-title">HTTP状态码</span>
                        <span v-if="isRunning && !responseData.status" class="loading-dots">
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </span>
                    </div>
                    <div class="section-content">
                        <div v-if="responseData.status" class="status-display" :class="getStatusClass(responseData.status)">
                            {{ responseData.status }}
                        </div>
                        <div v-else class="skeleton-box"></div>
                    </div>
                </div>

                <!-- Waste Time -->
                <div class="meta-item" :class="{ loading: isRunning && responseData.waste_time === undefined }">
                    <div class="section-header">
                        <span class="section-title">耗时</span>
                        <span v-if="isRunning && responseData.waste_time === undefined" class="loading-dots">
                            <span class="dot"></span>
                            <span class="dot"></span>
                            <span class="dot"></span>
                        </span>
                    </div>
                    <div class="section-content">
                        <div v-if="responseData.waste_time !== undefined" class="waste-time-display">
                            {{ formatDuration(responseData.waste_time) }}
                        </div>
                        <div v-else class="skeleton-box"></div>
                    </div>
                </div>
            </div>

            <!-- Body -->
            <div class="section" :class="{ loading: isRunning && !responseData.body }">
                <div class="section-header">
                    <span class="section-title">响应Body</span>
                    <span v-if="isRunning && !responseData.body" class="loading-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </div>
                <div class="section-content">
                    <CodeHighlight
                        v-if="responseData.body"
                        :content="responseData.body"
                        :language="detectBodyLanguage(responseData.body)"
                        height="300px"
                        empty-text="无响应Body"
                    />
                    <div v-else class="skeleton-editor large"></div>
                </div>
            </div>

            <!-- Headers -->
            <div class="section" :class="{ loading: isRunning && !responseData.headers }">
                <div class="section-header">
                    <span class="section-title">响应Headers</span>
                    <span v-if="isRunning && !responseData.headers" class="loading-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </div>
                <div class="section-content">
                    <CodeHighlight
                        v-if="responseData.headers"
                        :content="formatHeaders(responseData.headers)"
                        language="json"
                        height="200px"
                        empty-text="无响应Headers"
                    />
                    <div v-else class="skeleton-editor"></div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import CodeHighlight from '@/components/common/editor/CodeHighlight.vue';

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

// 获取响应数据
const responseData = computed(() => {
    return props.detailData?.response;
});

// 格式化时间戳
function formatTime(timestamp: string | number | undefined): string {
    if (!timestamp) return 'N/A';
    try {
        const date = new Date(parseFloat(timestamp.toString()) * 1000);
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
        return timestamp.toString();
    }
}

// 格式化耗时
function formatDuration(seconds: number | string): string {
    const num = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    if (num < 0.001) return `${(num * 1000000).toFixed(0)}μs`;
    if (num < 1) return `${(num * 1000).toFixed(2)}ms`;
    return `${num.toFixed(3)}s`;
}

// 检测Body的语言类型
function detectBodyLanguage(body: string | undefined): string {
    if (!body) return 'plaintext';
    const trimmed = body.trim();

    // 检测JSON
    if ((trimmed.startsWith('{') && trimmed.endsWith('}')) ||
        (trimmed.startsWith('[') && trimmed.endsWith(']'))) {
        try {
            JSON.parse(trimmed);
            return 'json';
        } catch (e) {
            // 不是有效的JSON
        }
    }

    // 检测HTML
    if (trimmed.startsWith('<') && trimmed.includes('>')) {
        return 'html';
    }

    return 'plaintext';
}

// 格式化Headers为JSON字符串
function formatHeaders(headers: any): string {
    if (!headers) return '';
    if (typeof headers === 'string') return headers;
    try {
        return JSON.stringify(headers, null, 2);
    } catch (e) {
        return String(headers);
    }
}

// 获取状态码样式类
function getStatusClass(status: number): string {
    if (status >= 200 && status < 300) return 'status-success';
    if (status >= 300 && status < 400) return 'status-redirect';
    if (status >= 400 && status < 500) return 'status-client-error';
    if (status >= 500) return 'status-server-error';
    return '';
}
</script>

<style lang="scss" scoped>
.response-content-wrapper {
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

.content-sections {
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.meta-row {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
}

.meta-item {
    transition: all 0.2s ease;

    &.loading {
        animation: sectionPulse 2s ease-in-out infinite;
    }
}

.section {
    transition: all 0.2s ease;

    &.loading {
        animation: sectionPulse 2s ease-in-out infinite;
    }
}

.section-header {
    margin-bottom: 8px;
    display: flex;
    align-items: center;
    gap: 8px;
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

.section-content {
    // 无额外padding，让内容更紧凑
}

.skeleton-box {
    height: 40px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
}

.skeleton-editor {
    height: 200px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    border: 1px solid #e8e8e8;

    &.large {
        height: 300px;
    }
}

.time-display {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    color: #24292e;
    padding: 10px 12px;
    background: #f8f9fa;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-left: 2px solid #6f42c1;
    line-height: 1.6;
}

.status-display {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
    font-weight: 600;
    padding: 10px 12px;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    display: inline-block;
    line-height: 1.6;

    &.status-success {
        background: linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%);
        color: #2e7d32;
        border-left: 2px solid #4caf50;
    }

    &.status-redirect {
        background: linear-gradient(135deg, #e3f2fd 0%, #bbdefb 100%);
        color: #1565c0;
        border-left: 2px solid #2196f3;
    }

    &.status-client-error {
        background: linear-gradient(135deg, #fff3e0 0%, #ffe0b2 100%);
        color: #e65100;
        border-left: 2px solid #ff9800;
    }

    &.status-server-error {
        background: linear-gradient(135deg, #ffebee 0%, #ffcdd2 100%);
        color: #c62828;
        border-left: 2px solid #f44336;
    }
}

.waste-time-display {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 13px;
    font-weight: 600;
    padding: 10px 12px;
    background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
    color: #6a1b9a;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    display: inline-block;
    border-left: 2px solid #9c27b0;
    line-height: 1.6;
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

@keyframes shimmer {
    0% {
        background-position: -200% 0;
    }
    100% {
        background-position: 200% 0;
    }
}

@keyframes sectionPulse {
    0%, 100% {
        opacity: 0.95;
    }
    50% {
        opacity: 1;
    }
}
</style>
