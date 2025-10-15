<template>
    <div class="project-task-container">
        <Record :range_type="'project'" ref="recordRef"></Record>
    </div>
</template>

<script lang="ts" setup>
import Record from '@/views/case/record/index.vue'
</script>

<style lang="scss" scoped>
.project-task-container {
    height: 100%;
    flex: 1 1 auto;
    overflow: hidden;
    display: flex;
    flex-direction: column;
}
</style>