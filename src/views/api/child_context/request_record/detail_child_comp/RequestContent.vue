<template>
    <div class="request-content-wrapper">
        <div v-if="!requestData" class="empty-container">
            <div class="empty-state">
                <span v-if="isRunning" class="running-indicator">
                    <span class="dot"></span>
                    <span class="dot"></span>
                    <span class="dot"></span>
                </span>
                <span class="empty-text">{{ isRunning ? '请求数据加载中...' : '暂无请求数据' }}</span>
            </div>
        </div>

        <div v-else class="content-sections">
            <!-- URL -->
            <div class="section" :class="{ loading: isRunning && !requestData.url }">
                <div class="section-header">
                    <span class="section-title">请求URL</span>
                    <span v-if="isRunning && !requestData.url" class="loading-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </div>
                <div class="section-content">
                    <div v-if="requestData.url" class="url-display">{{ requestData.url }}</div>
                    <div v-else class="skeleton-box"></div>
                </div>
            </div>

            <!-- Time -->
            <div class="section" :class="{ loading: isRunning && !requestData.time }">
                <div class="section-header">
                    <span class="section-title">请求时间</span>
                    <span v-if="isRunning && !requestData.time" class="loading-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </div>
                <div class="section-content">
                    <div v-if="requestData.time" class="time-display">{{ formatTime(requestData.time) }}</div>
                    <div v-else class="skeleton-box"></div>
                </div>
            </div>

            <!-- Query Params (如果有) -->
            <div v-if="requestData.query_params || (isRunning && !requestData.method)" class="section" :class="{ loading: isRunning && !requestData.query_params }">
                <div class="section-header">
                    <span class="section-title">Query参数</span>
                    <span v-if="isRunning && !requestData.query_params" class="loading-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </div>
                <div class="section-content">
                    <CodeHighlight
                        v-if="requestData.query_params"
                        :content="requestData.query_params"
                        language="plaintext"
                        height="120px"
                        empty-text="无Query参数"
                    />
                    <div v-else class="skeleton-editor"></div>
                </div>
            </div>

            <!-- Body -->
            <div class="section" :class="{ loading: isRunning && requestData.body === undefined }">
                <div class="section-header">
                    <span class="section-title">请求Body</span>
                    <span v-if="isRunning && requestData.body === undefined" class="loading-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </div>
                <div class="section-content">
                    <CodeHighlight
                        v-if="hasBody(requestData.body)"
                        :content="requestData.body"
                        :language="detectBodyLanguage(requestData.body)"
                        height="250px"
                        empty-text="无请求Body"
                    />
                    <div v-else-if="isRunning && requestData.body === undefined" class="skeleton-editor large"></div>
                    <div v-else class="empty-body">无请求Body</div>
                </div>
            </div>

            <!-- Headers -->
            <div class="section" :class="{ loading: isRunning && !requestData.headers }">
                <div class="section-header">
                    <span class="section-title">请求Headers</span>
                    <span v-if="isRunning && !requestData.headers" class="loading-dots">
                        <span class="dot"></span>
                        <span class="dot"></span>
                        <span class="dot"></span>
                    </span>
                </div>
                <div class="section-content">
                    <CodeHighlight
                        v-if="requestData.headers"
                        :content="formatHeaders(requestData.headers)"
                        language="json"
                        height="200px"
                        empty-text="无请求Headers"
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

// 获取请求数据
const requestData = computed(() => {
    return props.detailData?.request;
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

// 判断是否有 body 内容
function hasBody(body: any): boolean {
    return body !== null && body !== undefined && body !== '';
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
</script>

<style lang="scss" scoped>
.request-content-wrapper {
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
    height: 120px;
    background: linear-gradient(90deg, #f0f0f0 25%, #e8e8e8 50%, #f0f0f0 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s infinite;
    border-radius: 4px;
    border: 1px solid #e8e8e8;

    &.large {
        height: 250px;
    }
}

.url-display {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 12px;
    color: #0066cc;
    word-break: break-all;
    padding: 10px 12px;
    background: #f8f9fa;
    border-top-right-radius: 4px;
    border-bottom-right-radius: 4px;
    border-left: 2px solid #0066cc;
    line-height: 1.6;
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

.empty-body {
    padding: 40px 20px;
    text-align: center;
    color: #bbb;
    font-size: 13px;
    font-style: italic;
    background: #fafafa;
    border-radius: 4px;
    border: 1px dashed #e0e0e0;
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
