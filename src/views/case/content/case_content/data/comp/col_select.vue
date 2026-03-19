<template>
    <div class="col-select-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger as-child>
                <MoreBtn></MoreBtn>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <DropdownMenu.Content class="col-select-content" :side-offset="8" :style="{ zIndex: 200 }">
                    <DropdownMenu.Item as-child v-if="has_action.includes('edit')">
                        <button class="item" @click="edit_col">
                            <EditBtn></EditBtn>批量编辑此列
                        </button>
                    </DropdownMenu.Item>
                    <DropdownMenu.Separator class="separator" v-if="has_action.includes('delete')" />
                    <DropdownMenu.Item as-child v-if="has_action.includes('delete')">
                        <button class="item" @click="delete_col">
                            <DeleteBtn></DeleteBtn>删除此列
                        </button>
                    </DropdownMenu.Item>
                </DropdownMenu.Content>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
// @ts-ignore
import { DropdownMenu } from 'reka-ui/namespaced'
import DeleteBtn from '@/components/common/mini_btn/delete.vue'
import MoreBtn from '@/components/common/mini_btn/more.vue'
import EditBtn from '@/components/common/mini_btn/edit.vue'

const open = ref(false)

const emit = defineEmits(['delete_col', 'edit_col'])

const props = defineProps({
    has_action: {
        default: ['edit', 'delete']
    }
})

function delete_col() {
    emit('delete_col')
}

function edit_col() {
    emit('edit_col')
}
</script>

<style lang="scss" scope>
.col-select-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.col-select-content {
    min-width: 160px;
    padding: 6px;
    border: 1px solid rgba(226, 232, 240, 0.95);
    border-radius: 12px;
    background-color: rgba(255, 255, 255, 0.98);
    box-shadow: 0 16px 30px rgba(15, 23, 42, 0.12);
    box-sizing: border-box;
    z-index: 100;

    .item {
        width: 100%;
        padding: 9px 12px;
        border: none;
        background: none;
        color: #334155;
        text-align: left;
        border-radius: 8px;
        cursor: pointer;
        font-size: 13px;
        font-weight: 500;
        box-sizing: border-box;
        display: flex;
        align-items: center;
        justify-content: start;
        gap: 8px;
    }

    .item:hover {
        color: white;
        background: #111827;
    }

    .separator {
        height: 1px;
        background-color: #e2e8f0;
        margin: 4px 0;
    }
}
</style>
