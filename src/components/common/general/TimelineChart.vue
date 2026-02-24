<template>
    <div class="timeline-chart">
        <div v-if="!hasData" class="empty-state">
            <span v-if="isRunning" class="running-indicator">
                <span class="dot"></span>
                <span class="dot"></span>
                <span class="dot"></span>
            </span>
            <span class="empty-text">{{ isRunning ? '时间数据加载中...' : '暂无时间数据' }}</span>
        </div>

        <div v-else class="timeline-content">
            <!-- 时间轴标题 -->
            <div class="timeline-header">
                <h3 class="timeline-title">请求时间线</h3>
                <div class="timeline-summary">
                    <span class="summary-label">总耗时:</span>
                    <span class="summary-value">{{ formatDuration(totalDuration) }}</span>
                </div>
            </div>

            <!-- 时间轴可视化 -->
            <div class="timeline-visual">
                <div class="timeline-bar" ref="timelineBar">
                    <!-- Redirect -->
                    <div
                        v-if="phases.redirect"
                        class="phase-segment redirect"
                        :style="getSegmentStyle(phases.redirect)"
                        @mouseenter="showTooltip($event, 'redirect', phases.redirect)"
                        @mouseleave="hideTooltip"
                    >
                        <span class="phase-label" v-if="getSegmentWidth(phases.redirect) > 5">重定向</span>
                        <span class="phase-percentage" v-if="getSegmentWidth(phases.redirect) > 12">
                            {{ getPercentage(phases.redirect) }}%
                        </span>
                    </div>

                    <!-- Queue -->
                    <div
                        v-if="phases.queue"
                        class="phase-segment queue"
                        :style="getSegmentStyle(phases.queue)"
                        @mouseenter="showTooltip($event, 'queue', phases.queue)"
                        @mouseleave="hideTooltip"
                    >
                        <span class="phase-label" v-if="getSegmentWidth(phases.queue) > 5">队列</span>
                        <span class="phase-percentage" v-if="getSegmentWidth(phases.queue) > 12">
                            {{ getPercentage(phases.queue) }}%
                        </span>
                    </div>

                    <!-- DNS -->
                    <div
                        v-if="phases.dns"
                        class="phase-segment dns"
                        :style="getSegmentStyle(phases.dns)"
                        @mouseenter="showTooltip($event, 'dns', phases.dns)"
                        @mouseleave="hideTooltip"
                    >
                        <span class="phase-label" v-if="getSegmentWidth(phases.dns) > 5">DNS</span>
                        <span class="phase-percentage" v-if="getSegmentWidth(phases.dns) > 12">
                            {{ getPercentage(phases.dns) }}%
                        </span>
                    </div>

                    <!-- Connection -->
                    <div
                        v-if="phases.connection"
                        class="phase-segment connection"
                        :style="getSegmentStyle(phases.connection)"
                        @mouseenter="showTooltip($event, 'connection', phases.connection)"
                        @mouseleave="hideTooltip"
                    >
                        <span class="phase-label" v-if="getSegmentWidth(phases.connection) > 5">连接</span>
                        <span class="phase-percentage" v-if="getSegmentWidth(phases.connection) > 12">
                            {{ getPercentage(phases.connection) }}%
                        </span>
                    </div>

                    <!-- Request Response -->
                    <div
                        v-if="phases.request_response"
                        class="phase-segment request-response"
                        :style="getSegmentStyle(phases.request_response)"
                        @mouseenter="showTooltip($event, 'request_response', phases.request_response)"
                        @mouseleave="hideTooltip"
                    >
                        <span class="phase-label" v-if="getSegmentWidth(phases.request_response) > 5">请求响应</span>
                        <span class="phase-percentage" v-if="getSegmentWidth(phases.request_response) > 12">
                            {{ getPercentage(phases.request_response) }}%
                        </span>
                    </div>
                </div>

                <!-- 时间刻度 -->
                <div class="timeline-scale">
                    <span class="scale-mark">0ms</span>
                    <span class="scale-mark">{{ formatDuration(totalDuration / 2) }}</span>
                    <span class="scale-mark">{{ formatDuration(totalDuration) }}</span>
                </div>
            </div>

            <!-- Tooltip -->
            <div v-if="tooltip.visible" class="timeline-tooltip" :style="tooltipStyle">
                <div class="tooltip-header">
                    <span class="tooltip-icon" :class="tooltip.phase"></span>
                    <span class="tooltip-title">{{ tooltip.title }}</span>
                </div>
                <div class="tooltip-content">
                    <div class="tooltip-row">
                        <span class="tooltip-label">耗时:</span>
                        <span class="tooltip-value">{{ tooltip.duration }}</span>
                    </div>
                    <div class="tooltip-row">
                        <span class="tooltip-label">占比:</span>
                        <span class="tooltip-value">{{ tooltip.percentage }}%</span>
                    </div>
                </div>
            </div>

            <!-- 图例 -->
            <div class="timeline-legend">
                <div class="legend-item" v-if="phases.redirect">
                    <span class="legend-color redirect"></span>
                    <span class="legend-label">重定向</span>
                </div>
                <div class="legend-item" v-if="phases.queue">
                    <span class="legend-color queue"></span>
                    <span class="legend-label">队列等待</span>
                </div>
                <div class="legend-item" v-if="phases.dns">
                    <span class="legend-color dns"></span>
                    <span class="legend-label">DNS解析</span>
                </div>
                <div class="legend-item" v-if="phases.connection">
                    <span class="legend-color connection"></span>
                    <span class="legend-label">建立连接</span>
                </div>
                <div class="legend-item" v-if="phases.request_response">
                    <span class="legend-color request-response"></span>
                    <span class="legend-label">请求响应</span>
                </div>
            </div>

            <!-- 详细时间表 -->
            <div class="timeline-details">
                <div class="details-header">详细时间数据</div>
                <div class="detail-grid">
                    <div class="detail-row" v-for="item in detailItems" :key="item.label">
                        <span class="detail-label">{{ item.label }}</span>
                        <span class="detail-value" :class="{ loading: item.loading }">
                            <template v-if="item.loading">
                                <span class="loading-dots">
                                    <span class="dot"></span>
                                    <span class="dot"></span>
                                    <span class="dot"></span>
                                </span>
                            </template>
                            <template v-else>{{ item.value }}</template>
                        </span>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, ref, reactive } from 'vue';

interface TimeData {
    start_time_at?: number | null;
    request_start?: number | null;
    total_time?: number | null;
    receive_chunk_time_last?: number | null;
    receive_chunk_time_last_at?: number | null;
    network_time?: number | null;
    response_time_at?: number | null;
    error_time?: number | null;
    error_time_at?: number | null;
    redirect_time?: number | null;
    redirect_time_at?: number | null;
    queue_start?: number | null;
    queue_start_at?: number | null;
    queue_end?: number | null;
    queue_end_at?: number | null;
    conn_create_start?: number | null;
    conn_create_start_at?: number | null;
    conn_create_end?: number | null;
    conn_create_end_at?: number | null;
    dns_start_at?: number | null;
    dns_start?: number | null;
    dns_end?: number | null;
    dns_end_at?: number | null;
}

interface Phase {
    start: number;
    duration: number;
}

const props = defineProps({
    timeData: {
        type: Object as () => TimeData | null,
        default: null
    },
    isRunning: {
        type: Boolean,
        default: false
    }
});

const timelineBar = ref<HTMLElement | null>(null);

// Tooltip状态
const tooltip = reactive({
    visible: false,
    phase: '',
    title: '',
    duration: '',
    percentage: '',
    startTime: '',
    endTime: '',
    x: 0,
    y: 0
});

// 检查是否有数据
const hasData = computed(() => {
    return props.timeData && Object.values(props.timeData).some(v => v !== null && v !== undefined);
});

// 计算各个阶段
const phases = computed(() => {
    if (!props.timeData) return {};

    const data:any = props.timeData;
    const result: Record<string, Phase> = {};
    let currentTime = 0;

    // 按HTTP请求的实际时间顺序构建各个阶段

    // 1. 重定向阶段（如果存在，发生在最开始）
    if (data.redirect_time !== null && data.redirect_time !== undefined && data.redirect_time > 0) {
        result.redirect = {
            start: currentTime,
            duration: data.redirect_time
        };
        currentTime += data.redirect_time;
    }

    // 2. 队列等待阶段
    if (data.queue_start !== null && data.queue_end !== null && data.queue_start !== undefined && data.queue_end !== undefined) {
        const queueDuration = data.queue_end - data.queue_start;
        if (queueDuration > 0) {
            result.queue = {
                start: currentTime,
                duration: queueDuration
            };
            currentTime += queueDuration;
        }
    }

    // 3. 连接创建阶段 - 分为DNS和其他连接部分
    if (data.conn_create_start !== null && data.conn_create_end !== null && data.conn_create_start !== undefined && data.conn_create_end !== undefined) {
        // 3.1 DNS解析阶段（连接创建的第一部分）
        if (data.dns_start !== null && data.dns_end !== null && data.dns_start !== undefined && data.dns_end !== undefined) {
            const dnsDuration = data.dns_end - data.dns_start;
            if (dnsDuration > 0) {
                result.dns = {
                    start: currentTime,
                    duration: dnsDuration
                };
                currentTime += dnsDuration;
            }
        }

        // 3.2 连接建立的其他部分（SSL握手等）
        const connDuration = data.conn_create_end - data.conn_create_start;
        const dnsTime = (data.dns_end && data.dns_start) ? (data.dns_end - data.dns_start) : 0;
        const otherConnDuration = connDuration - dnsTime;

        if (otherConnDuration > 0) {
            result.connection = {
                start: currentTime,
                duration: otherConnDuration
            };
            currentTime += otherConnDuration;
        }
    }

    // 4. 请求响应阶段
    if (data.total_time !== null && data.total_time !== undefined && data.total_time > 0) {
        const requestResponseDuration = data.total_time - currentTime;
        if (requestResponseDuration > 0) {
            result.request_response = {
                start: currentTime,
                duration: requestResponseDuration
            };
        }
    }

    return result;
});

// 总耗时
const totalDuration = computed(() => {
    return props.timeData?.total_time || 0;
});

// 计算段的样式
function getSegmentStyle(phase: Phase): Record<string, string> {
    if (totalDuration.value === 0) return {};

    const percentage = (phase.duration / totalDuration.value) * 100;
    return {
        width: `${Math.max(percentage, 2)}%` // 最小2%以确保可见
    };
}

// 获取段的宽度百分比
function getSegmentWidth(phase: Phase): number {
    if (totalDuration.value === 0) return 0;
    return (phase.duration / totalDuration.value) * 100;
}

// 获取百分比
function getPercentage(phase: Phase): string {
    if (totalDuration.value === 0) return '0';
    const percentage = (phase.duration / totalDuration.value) * 100;
    return percentage.toFixed(1);
}

// 格式化持续时间
function formatDuration(seconds: number | null | undefined): string {
    if (seconds === null || seconds === undefined) return 'N/A';
    const num = typeof seconds === 'string' ? parseFloat(seconds) : seconds;
    if (num < 0.001) return `${(num * 1000000).toFixed(0)}μs`;
    if (num < 1) return `${(num * 1000).toFixed(2)}ms`;
    return `${num.toFixed(3)}s`;
}

// 显示tooltip
function showTooltip(event: MouseEvent, phase: string, phaseData: Phase) {
    const phaseNames: Record<string, string> = {
        queue: '队列等待',
        dns: 'DNS解析',
        connection: '建立连接',
        request_response: '请求响应',
        redirect: '重定向'
    };

    tooltip.visible = true;
    tooltip.phase = phase;
    tooltip.title = phaseNames[phase] || phase;
    tooltip.duration = formatDuration(phaseData.duration);
    tooltip.percentage = getPercentage(phaseData);
    tooltip.startTime = formatDuration(phaseData.start);
    tooltip.endTime = formatDuration(phaseData.start + phaseData.duration);

    // 智能定位：检测是否靠近屏幕右边或底部
    const tooltipWidth = 220; // tooltip 的大概宽度
    const tooltipHeight = 100; // tooltip 的大概高度
    const padding = 10;

    // 水平定位
    const spaceOnRight = window.innerWidth - event.clientX;
    if (spaceOnRight < tooltipWidth + padding) {
        // 靠近右边，显示在鼠标左边
        tooltip.x = event.clientX - tooltipWidth - padding;
    } else {
        // 显示在鼠标右边
        tooltip.x = event.clientX + padding;
    }

    // 垂直定位
    const spaceOnBottom = window.innerHeight - event.clientY;
    if (spaceOnBottom < tooltipHeight + padding) {
        // 靠近底部，显示在鼠标上方
        tooltip.y = event.clientY - tooltipHeight - padding;
    } else {
        // 显示在鼠标下方
        tooltip.y = event.clientY + padding;
    }
}

// 隐藏tooltip
function hideTooltip() {
    tooltip.visible = false;
}

// Tooltip样式
const tooltipStyle = computed(() => ({
    left: `${tooltip.x + 10}px`,
    top: `${tooltip.y + 10}px`
}));

// 详细信息项
const detailItems = computed(() => {
    if (!props.timeData) return [];

    const data = props.timeData;
    const items = [
        { label: '总耗时', value: formatDuration(data.total_time), loading: props.isRunning && !data.total_time },
        { label: '网络耗时', value: formatDuration(data.network_time), loading: props.isRunning && !data.network_time },
    ];

    // 重定向
    if (data.redirect_time !== null || props.isRunning) {
        items.push({ label: '重定向耗时', value: formatDuration(data.redirect_time), loading: props.isRunning && !data.redirect_time });
    }

    // 队列等待
    if (data.queue_start !== null || props.isRunning) {
        const queueDuration = (data.queue_end !== null && data.queue_start !== null) ? data.queue_end - data.queue_start : null;
        items.push({ label: '队列等待', value: formatDuration(queueDuration), loading: props.isRunning && !queueDuration });
    }

    // 连接创建总时间
    if (data.conn_create_start !== null || props.isRunning) {
        const connDuration = (data.conn_create_end !== null && data.conn_create_start !== null) ? data.conn_create_end - data.conn_create_start : null;
        items.push({ label: '连接创建总耗时', value: formatDuration(connDuration), loading: props.isRunning && !connDuration });
    }

    // DNS解析（连接创建的一部分）
    if (data.dns_start !== null || props.isRunning) {
        const dnsDuration = (data.dns_end !== null && data.dns_start !== null) ? data.dns_end - data.dns_start : null;
        items.push({ label: '  └ DNS解析', value: formatDuration(dnsDuration), loading: props.isRunning && !dnsDuration });
    }

    // 其他连接时间（SSL握手等）
    if (data.conn_create_start !== null && data.dns_start !== null) {
        const connTotal = (data.conn_create_end !== null && data.conn_create_start !== null) ? data.conn_create_end - data.conn_create_start : null;
        const dnsTime = (data.dns_end !== null && data.dns_start !== null) ? data.dns_end - data.dns_start : null;
        const otherConn = (connTotal !== null && dnsTime !== null) ? connTotal - dnsTime : null;
        if (otherConn !== null && otherConn > 0) {
            items.push({ label: '  └ SSL握手等', value: formatDuration(otherConn), loading: false });
        }
    }

    // 请求响应时间
    if (data.total_time !== null && data.conn_create_end !== null) {
        const requestResponseTime = data.total_time - data.conn_create_end;
        items.push({ label: '请求响应耗时', value: formatDuration(requestResponseTime), loading: false });
    }

    // 最后chunk接收时间
    if (data.receive_chunk_time_last !== null || props.isRunning) {
        items.push({ label: '最后chunk耗时', value: formatDuration(data.receive_chunk_time_last), loading: props.isRunning && !data.receive_chunk_time_last });
    }

    // 错误时间
    if (data.error_time !== null) {
        items.push({ label: '错误耗时', value: formatDuration(data.error_time), loading: false });
    }

    return items;
});
</script>

<style lang="scss" scoped>
.timeline-chart {
    width: 100%;
}

.empty-state {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 40px;
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

.timeline-content {
    display: flex;
    flex-direction: column;
    gap: 20px;
}

.timeline-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-bottom: 12px;
    border-bottom: 2px solid #e8e8e8;
}

.timeline-title {
    font-size: 15px;
    font-weight: 600;
    color: #333;
    margin: 0;
}

.timeline-summary {
    display: flex;
    align-items: center;
    gap: 8px;
}

.summary-label {
    font-size: 12px;
    color: #888;
    font-weight: 500;
}

.summary-value {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    font-size: 14px;
    font-weight: 600;
    color: #333;
    padding: 4px 10px;
    background: linear-gradient(135deg, #f3e5f5 0%, #e1bee7 100%);
    border-radius: 4px;
}

.timeline-visual {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.timeline-bar {
    display: flex;
    height: 36px;
    background: #f5f5f5;
    border-radius: 8px;
    overflow: hidden;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.1);
    position: relative;
}

.phase-segment {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 2px;
    position: relative;
    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    cursor: pointer;
    border-right: 1px solid rgba(255, 255, 255, 0.3);

    &:hover {
        filter: brightness(1.15);
        z-index: 10;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }

    &.queue {
        background: linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%);
    }

    &.dns {
        background: linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%);
    }

    &.connection {
        background: linear-gradient(135deg, #fff3e0 0%, #ffb74d 100%);
    }

    &.request-response {
        background: linear-gradient(135deg, #e8f5e9 0%, #66bb6a 100%);
    }

    &.redirect {
        background: linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%);
    }
}

.phase-label {
    font-size: 10px;
    font-weight: 700;
    color: rgba(0, 0, 0, 0.75);
    text-transform: uppercase;
    letter-spacing: 0.5px;
    white-space: nowrap;
    text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.phase-percentage {
    font-size: 9px;
    font-weight: 600;
    color: rgba(0, 0, 0, 0.6);
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
}

.timeline-scale {
    display: flex;
    justify-content: space-between;
    padding: 0 4px;
}

.scale-mark {
    font-size: 10px;
    color: #999;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
}

.timeline-tooltip {
    position: fixed;
    background: rgba(0, 0, 0, 0.9);
    color: #fff;
    padding: 12px;
    border-radius: 8px;
    box-shadow: 0 4px 16px rgba(0, 0, 0, 0.3);
    z-index: 1000;
    pointer-events: none;
    min-width: 200px;
    backdrop-filter: blur(10px);
}

.tooltip-header {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 8px;
    padding-bottom: 8px;
    border-bottom: 1px solid rgba(255, 255, 255, 0.2);
}

.tooltip-icon {
    width: 12px;
    height: 12px;
    border-radius: 3px;

    &.queue {
        background: linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%);
    }

    &.dns {
        background: linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%);
    }

    &.connection {
        background: linear-gradient(135deg, #fff3e0 0%, #ffb74d 100%);
    }

    &.request-response {
        background: linear-gradient(135deg, #e8f5e9 0%, #66bb6a 100%);
    }

    &.redirect {
        background: linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%);
    }
}

.tooltip-title {
    font-size: 13px;
    font-weight: 600;
}

.tooltip-content {
    display: flex;
    flex-direction: column;
    gap: 6px;
}

.tooltip-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
}

.tooltip-label {
    font-size: 11px;
    color: rgba(255, 255, 255, 0.7);
}

.tooltip-value {
    font-size: 12px;
    font-weight: 600;
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
}

.timeline-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 16px;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #e8e8e8;
}

.legend-item {
    display: flex;
    align-items: center;
    gap: 6px;
}

.legend-color {
    width: 16px;
    height: 16px;
    border-radius: 3px;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);

    &.queue {
        background: linear-gradient(135deg, #e3f2fd 0%, #90caf9 100%);
    }

    &.dns {
        background: linear-gradient(135deg, #f3e5f5 0%, #ce93d8 100%);
    }

    &.connection {
        background: linear-gradient(135deg, #fff3e0 0%, #ffb74d 100%);
    }

    &.request-response {
        background: linear-gradient(135deg, #e8f5e9 0%, #66bb6a 100%);
    }

    &.redirect {
        background: linear-gradient(135deg, #fce4ec 0%, #f48fb1 100%);
    }
}

.legend-label {
    font-size: 11px;
    color: #666;
    font-weight: 500;
}

.timeline-details {
    display: flex;
    flex-direction: column;
    gap: 12px;
}

.details-header {
    font-size: 13px;
    font-weight: 600;
    color: #666;
    text-transform: uppercase;
    letter-spacing: 0.5px;
}

.detail-grid {
    display: grid;
    grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
    gap: 8px;
    padding: 12px;
    background: #fafafa;
    border-radius: 6px;
    border: 1px solid #e8e8e8;
}

.detail-row {
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 6px 8px;
    background: #fff;
    border-radius: 4px;
    font-size: 11px;
    transition: all 0.2s ease;

    &:hover {
        background: #f5f5f5;
        box-shadow: 0 1px 3px rgba(0, 0, 0, 0.05);
    }
}

.detail-label {
    color: #888;
    font-weight: 500;
}

.detail-value {
    font-family: 'SF Mono', 'Monaco', 'Menlo', 'Consolas', monospace;
    color: #333;
    font-weight: 600;

    &.loading {
        color: #4caf50;
    }
}

.loading-dots {
    display: inline-flex;
    align-items: center;
    gap: 3px;

    .dot {
        width: 3px;
        height: 3px;
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
