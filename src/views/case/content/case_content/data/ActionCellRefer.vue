<template>
    <div class="my-cell">
        <ActionGroup :group="['copy', 'delete', 'addSiblingStep', 'batchEdit']" :actionDesc="actionDesc"
            @action="action">
        </ActionGroup>
    </div>
</template>

<script setup lang="ts">
import { defineProps } from 'vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'

// AG Grid 会传过来这几个 props
const props = defineProps<{
    params: any
}>()

const actionDesc = {
    copy: '复制',
    disable: '禁用/启用',
    delete: '删除此行',
    addSiblingStep: '添加相邻行',
    addChildStep: '添加子步骤',
    batchEdit: '批量编辑此行'
}

function action(t: string) {
    if (t === 'copy') {
        props.params.copy_row(props.params)
    } else if (t === 'delete') {
        props.params.delete_row(props.params)
    } else if (t === 'addSiblingStep') {
        props.params.add_row(props.params)
    } else if (t === 'batchEdit') {
        props.params.eidt_row(props.params)
    }
}
</script>

<style scoped>
.my-cell {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
}

.my-cell span {
    font-weight: bold;
}
</style>
