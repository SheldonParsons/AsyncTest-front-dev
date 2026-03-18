<template>
    <div class="footer-container">
        <div class="footer-node-count">
            {{ footerCountText }}
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';

const props = withDefaults(defineProps<{
    totalNodes?: number;
    selectedNodes?: number;
}>(), {
    totalNodes: 0,
    selectedNodes: 0,
});

const footerCountText = computed(() => {
    if (props.selectedNodes > 0) return `主题 ${props.selectedNodes}/${props.totalNodes}`;
    return `主题 ${props.totalNodes}`;
});
</script>

<style lang="scss" scoped>
.footer-container {
    height: 30px;
    display: flex;
    align-items: center;
    justify-content: flex-end;
    padding: 0 14px;
}

.footer-node-count {
    font-size: 12px;
    line-height: 1;
    color: rgba(23, 32, 51, 0.72);
    letter-spacing: 0.01em;
    user-select: none;
}
</style>
