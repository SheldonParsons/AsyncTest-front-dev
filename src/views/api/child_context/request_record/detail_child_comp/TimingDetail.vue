<template>
    <div class="timing-detail-wrapper">
        <TimelineChart :time-data="timeData" :is-running="isRunning" />
    </div>
</template>

<script lang="ts" setup>
import { computed } from 'vue';
import TimelineChart from '@/components/common/general/TimelineChart.vue';

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

// 获取时间数据并解析JSON字符串
const timeData = computed(() => {
    const timing = props.detailData?.timing;
    if (!timing) return null;

    // 如果是字符串，解析为对象
    if (typeof timing === 'string') {
        try {
            return JSON.parse(timing);
        } catch (e) {
            console.error('Failed to parse timing data:', e);
            return null;
        }
    }

    // 如果已经是对象，直接返回
    return timing;
});
</script>

<style lang="scss" scoped>
.timing-detail-wrapper {
    padding: 16px;
    background: #fff;
    min-height: 100%;
}
</style>
