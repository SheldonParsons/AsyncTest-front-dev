<template>
    <CaseStep ref="caseStepRef" :case_id="data.case_id" :read_only="2">
    </CaseStep>
</template>

<script lang="ts" setup>
import CaseStep from '@/views/case/content/case_content/runner/tree/index.vue'

const props = defineProps({
    data: {
        type: null,
        default: null
    }
})

</script>

<style lang="scss" scope></style>