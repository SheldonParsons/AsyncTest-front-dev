<template>
    <div class="motion-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger as-child>
                <div
                    style="display: flex;justify-content: center;align-items: center;cursor: pointer;background-color: #f0f0f0;border-radius: 4px;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="lucide lucide-ellipsis-icon lucide-ellipsis">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                    </svg>
                </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <AnimatePresence>
                    <DropdownMenu.Content v-if="open" :side-offset="10" style="z-index: 9999;" side="bottom">
                        <div class="no-scroll"
                            style="background-color: #f0f0f0;width: 900px;max-height: 350px;overflow-y: auto;border-bottom: 1px solid #f0f0f0;padding: 10px;box-sizing: border-box;border-radius: 6px;border: 1px solid #f0f0f0;">
                            <ObjectTable :tableData="dsData" :canRootDs="false" :can_show_ds_detail="false">
                            </ObjectTable>
                        </div>
                    </DropdownMenu.Content>
                </AnimatePresence>
            </DropdownMenu.Portal>
        </DropdownMenu.Root>
    </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
// @ts-ignore
import { DropdownMenu } from 'reka-ui/namespaced'
import { AnimatePresence } from 'motion-v'
import { useRoute } from 'vue-router'
import ObjectTable from '@/views/api/child_context/req/body_child/json_body.vue'
import { ApiGetDsingle, ApiGetDsingleList } from '@/api/ds/index'

const route = useRoute()

const dsData = ref([])

const open = ref(false)

const props = defineProps({
    index: {
        type: Number,
        default: -1
    },
    inOuter: {
        type: Boolean,
        default: false
    }
})

watch(open, (val: any) => {
    if (val) {
        if (typeof props.index === 'string') {
            const _data = {
                ds_key: props.index,
                project: route.params.project
            }
            ApiGetDsingleList(_data).then((res: any) => {
                dsData.value = res.data
            })
        } else {
            ApiGetDsingle(props.index, {}).then((res: any) => {
                dsData.value = res.data
            })
        }
    }
});
</script>
