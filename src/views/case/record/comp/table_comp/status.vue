<template>
    <div :class="displayValue">
        {{ StatusMapping[displayValue] }}
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { StatusMapping } from '@/views/case/record/utils/constant';
const props = defineProps<{
    params: any
}>()

const displayValue = ref(props.params.value);
/**
 * 2. 实现 refresh 方法并暴露给 AG-Grid
 * 这是解决问题的关键！
 */
const refresh = (newParams: any) => {
    displayValue.value = newParams.value;
    return true;
};

// 3. 使用 defineExpose 将 refresh 方法暴露出去
defineExpose({
    refresh
});

// onMounted 现在只负责启动循环
onMounted(async () => {
});
</script>

<style lang="scss" scoped>
.end_normal {
    font-weight: 800;
    font-size: 0.9rem;
    background-image: linear-gradient(to right, rgb(0, 187, 255), rgb(93, 147, 254), rgb(0, 21, 255));
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
    -webkit-background-clip: text;
    color: transparent;
}

.pending {
    font-weight: 800;
    font-size: 0.9rem;
    background-image: linear-gradient(to right, rgb(171, 168, 182), rgb(167, 160, 178), rgb(158, 150, 160));
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
    -webkit-background-clip: text;
    color: transparent;
}

.mid_running {
    font-weight: 800;
    font-size: 0.9rem;
    background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
    -webkit-background-clip: text;
    color: transparent;
    animation: blink 3s infinite;
}

@keyframes blink {
    0% {
        opacity: 1;
        /* 不透明 */
    }

    50% {
        opacity: 0;
        /* 透明 */
    }

    100% {
        opacity: 1;
        /* 不透明 */
    }
}
</style>