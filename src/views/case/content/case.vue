<template>
    <div>
        <TabSelect></TabSelect>
    </div>
    <div class="case-content">
        <Drag1></Drag1>
    </div>
    <HoverSpanAnimation></HoverSpanAnimation>
</template>


<script setup lang="ts">
import TabSelect from '@/assets/motion/tab_select.vue'
import Drag1 from '@/views/case/content/case_content/CaseTree.vue'
import HoverSpanAnimation from '@/views/api/public_dialog/motion_dev_component/hover_animation.vue'
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
.case-content {
    border-top: 1px solid var(--border-color-light);
}
</style>