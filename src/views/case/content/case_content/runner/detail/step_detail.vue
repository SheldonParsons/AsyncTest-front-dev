<template>
    <Case v-if="data.type === 'case'" :data="data"></Case>
    <InterfacePage v-if="data.type === 'interface'" :node_id="0" :interface_id="data.interface_id" :is_case="true">
    </InterfacePage>
</template>

<script lang="ts" setup>
import InterfacePage from "@/views/api/child_context/interface_page.vue";
import Case from '@/views/case/content/case_content/runner/detail/case.vue'
const props = defineProps({
    data: {
        type: null,
        default: null
    }
})

</script>