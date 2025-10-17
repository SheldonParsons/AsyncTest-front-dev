<template>
    <div class="counter-container">
        <!-- <AnimateNumber :style="number" :value="displayValue" /> -->
        {{ displayValue }}
        <span class="unit">个</span>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount, nextTick, watch } from 'vue';
// import { AnimateNumber } from 'motion-plus-vue';
const props = defineProps<{
    params: any
}>()

const displayValue = ref(props.params.value);

const number = {
    fontSize: '1rem',
    fontWeight: 500,
    fontVariantNumeric: 'tabular-nums',
};
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

<style scoped>
.counter-container {
    display: flex;
    align-items: center;
    font-size: 0.9rem;
    font-family: "Monoton-Regular", 'Courier New', Courier, monospace;
    font-variant-numeric: tabular-nums;
}

.unit {
    font-size: 0.9rem;
    margin-left: 8px;
    font-weight: 500;
}
</style>