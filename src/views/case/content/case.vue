<template>
    <div class="case-container">
        <div class="case-container-select">
            <TabSelect></TabSelect>
        </div>
        <div class="case-content no-scroll">
            <Drag1></Drag1>
        </div>
    </div>

</template>


<script setup lang="ts">
import TabSelect from '@/assets/motion/tab_select.vue'
import Drag1 from '@/views/case/content/case_content/tree/index.vue'
const props = defineProps({
    node_id: {
        type: Number,
        default: null,
    },
    case_id: {
        type: Number,
        default: null,
    },
    target_type: {
        type: Number,
        default: -1,
    }
});

</script>

<style lang="scss" scoped>
.case-container {
    display: flex;
    flex-direction: column;

    .case-container-select {
        flex: 0 0 auto;
        position: sticky;
        top: 0;
        z-index: 1;
        background-color: white;
        border-bottom: 1px solid var(--border-color-light);
    }

    .case-content {

        height: 100%;
        flex: 1 1 auto;
        overflow: auto;
    }

}
</style>