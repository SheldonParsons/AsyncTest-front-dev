<template>
    <div class="motion-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger as-child>
                <motion.div :while-press="{ scale: 0.95 }" :whileHover="{ scale: 1.1 }"
                    style="height: 20px;display: flex;justify-content: center;align-items: center;cursor: pointer;background-color: #f0f0f0;border-radius: 4px;background-color: black;color: white;">
                    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none"
                        stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
                        class="lucide lucide-ellipsis-icon lucide-ellipsis">
                        <circle cx="12" cy="12" r="1" />
                        <circle cx="19" cy="12" r="1" />
                        <circle cx="5" cy="12" r="1" />
                    </svg>
                </motion.div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <AnimatePresence>
                    <DropdownMenu.Content v-if="open" :side-offset="10" style="z-index: 9999;" side="bottom">
                        <div class="no-scroll panel">
                            <ObjectTable :tableData="dsData" :canRootDs="false" :inOuter="inOuter"
                                :can_show_ds_detail="false">
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
import { AnimatePresence, motion } from 'motion-v'
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
                if (Object.prototype.hasOwnProperty.call(res, 'result') && res.result === 0) {
                    window.$toast({ title: "数据模型已不存在，请检查。" })
                    return
                }
                dsData.value = res.data
            })
        } else {
            ApiGetDsingle(props.index, {}).then((res: any) => {
                if (Object.prototype.hasOwnProperty.call(res, 'result') && res.result === 0) {
                    window.$toast({ title: "数据模型已不存在，请检查。" })
                    return
                }
                dsData.value = res.data
            })
        }
    }
});
</script>

<style lang="scss" scope>
.panel {
    background-color: #ffffff;
    height: 100%;
    width: 900px;
    max-height: 350px;
    background-color: var(--layer-transparent);
    backdrop-filter: blur(10px);
    border: 1px solid #90a4a8;
    color: black;
    border-radius: 6px;
    padding: 4px;
    margin-top: 5px;
    transform-origin: var(--radix-context-menu-content-transform-origin);
    z-index: 2012 !important;
    min-width: 300px;
}
</style>
