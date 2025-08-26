<template>
    <Case v-if="data.type === 'case'" :data="data" @save="save"></Case>
    <Interface v-if="data.type === 'interface'" :data="data" @save="save"></Interface>
    <Multitasker v-if="data.type === 'multitasker'" :data="data" :case_id="case_id" @save="save"></Multitasker>
    <Assertion v-if="data.type === 'assertion'" :data="data" @save="save"></Assertion>
    <Database v-if="data.type === 'database'" :data="data" @save="save"></Database>
    <Delay v-if="data.type === 'delay'" :data="data" @save="save"></Delay>
    <Error v-if="data.type === 'error'" :data="data" @save="save"></Error>
    <Group v-if="data.type === 'group'" :data="data" @save="save"></Group>
    <Script v-if="data.type === 'script'" :data="data" @save="save"></Script>
    <If v-if="data.type === 'if'" :data="data" @save="save"></If>
</template>

<script lang="ts" setup>

import Case from '@/views/case/content/case_content/runner/detail/case.vue'
import Interface from '@/views/case/content/case_content/runner/detail/interface.vue'
import Multitasker from '@/views/case/content/case_content/runner/detail/multitasker.vue'
import Assertion from '@/views/case/content/case_content/runner/detail/assertion.vue'
import Database from '@/views/case/content/case_content/runner/detail/database.vue'
import Delay from '@/views/case/content/case_content/runner/detail/delay.vue'
import Error from '@/views/case/content/case_content/runner/detail/error.vue'
import Group from '@/views/case/content/case_content/runner/detail/group.vue'
import Script from '@/views/case/content/case_content/runner/detail/script.vue'
import If from '@/views/case/content/case_content/runner/detail/if.vue'
const props = defineProps({
    data: {
        type: null,
        default: null
    },
    case_id: {
        type: Number,
        default: -1
    }
})

const emit = defineEmits(['save'])

function save() {
    emit("save")
}

</script>

<style lang="scss" scope>
.step-info {
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
    min-width: 500px;

    .step-container {
        display: flex;
        justify-content: start;
        align-items: center;
        width: 100%;
        flex-direction: column;
        background-color: #f0f0f03a;
        border: 2px solid #f0f0f0;
        border-radius: 8px;
        gap: 10px;
        padding: 10px;
        box-sizing: border-box;

        .step-footer {
            display: flex;
            justify-content: end;
            align-items: center;
            width: 100%;
        }
    }

    .step-title {
        width: 100%;
        display: flex;
        align-items: center;
        box-sizing: border-box;
    }

    .step-item {
        width: 100%;
        font-size: 14px;
        font-weight: 500;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        justify-content: start;
        align-items: center;
        gap: 10px;
        border-radius: 4px;
    }
}
</style>