<template>
    <div class="motion-dropdown-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger asChild :disabled="can_show_ds_detail === false">
                <div style="display: flex;justify-content: center;align-items: center;gap: 5px;">
                    <TooltipAnimation :isOpen="showIdTooltip === scope.row.id">
                        <template #trigger>
                            <motion.button class="motion-dropdown-trigger g-e"
                                @mouseenter="showIdTooltip = scope.row.id" @mouseleave="showIdTooltip = -1" :style="{
                                    color: typingAttrMapping[scope.row.t]['color'],
                                }" :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }">
                                {{ get_name(scope) }} ▾
                            </motion.button>
                        </template>
                        <template #default>
                            <div>{{ get_name(scope) }}</div>
                        </template>
                    </TooltipAnimation>
                </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <AnimatePresence>
                    <DropdownMenu.Content v-if="open && inOuter === false" :side-offset="10" style="z-index: 9999;"
                        side="right">
                        <motion.div class="motion-dropdown-content" :initial="{ opacity: 0, scale: 0.85 }"
                            :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.85 }"
                            :transition="{ duration: 0.2 }" :style="{ willChange: 'transform, opacity' }">
                            <div class="context">
                                <div class="main">
                                    <div style="padding: 10px;">
                                        <MotionDropDown :data="props.data" @change="handleCommand"></MotionDropDown>
                                    </div>
                                    <div class="right-content">
                                        <div v-if="current_type !== 'ds'" class="base-type-content">
                                            <DS class="case-icon" style="height: 33px"></DS>
                                            <div
                                                style="font-size: 0.8rem;display: flex;justify-content: center;align-items: center;">
                                                暂未开放</div>
                                        </div>
                                        <div v-if="current_type === 'ds'" class="ds-type-content">
                                            <div style="width: 100%;">
                                                <el-input v-model="filterText" placeholder="搜索" :suffix-icon="Filter" />
                                            </div>
                                            <div style="width: 100%;">
                                                <TreeNode :excluded_ids="excluded_ids"
                                                    :project="Number(route.params.project)"
                                                    @action="(ds_item) => choiceDs([scope.row, { value: 'ds', lebel: '' }, ds_item])"
                                                    ref="dsTreeNodeRef">
                                                </TreeNode>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
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
import { motion, AnimatePresence } from 'motion-v'
import GlobalStatus from "@/global";
import { Filter } from "@element-plus/icons-vue";
import DS from "@/assets/svg/tree/ds.vue";
import TreeNode from '@/views/case/content/case_content/runner/tree/components/select_ds_tree.vue'
import { useRoute } from "vue-router";
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import MotionDropDown from '@/views/api/child_context/req/body_child/comp/motion_dropdown.vue'

const route = useRoute();

const typingAttrMapping: any = GlobalStatus.regular_type_info_map();

const current_type = ref('string')

const filterText = ref("")

const showIdTooltip = ref(-1)

const dsTreeNodeRef: any = ref(null)


// 2. 定义组件的 props
const props = defineProps({
    // `current` 用于显示在触发器按钮上的当前值
    scope: {
        default: null,
        type: null
    },
    // `data` 是下拉菜单的选项列表
    data: {
        default: [],
        type: null
    },
    excluded_ids: {
        default: [],
        type: Array<Number>
    },
    can_show_ds_detail: {
        default: true,
        type: Boolean
    },
    inOuter: {
        type: Boolean,
        default: false
    }
})

function get_name(scope: any) {
    if (scope.row.t === 'ds') {
        if ("content_type" in scope.row) {
            return scope.row.content_type
        } else {
            return scope.row.name
        }
    } else {
        return scope.row.t.charAt(0).toUpperCase() + scope.row.t.slice(1)
    }
}


watch(filterText, (val: any) => {
    dsTreeNodeRef.value.filterText(val)
});

// 3. 定义组件要触发的事件
const emit = defineEmits<{
    // `command` 事件在用户点击选项时触发，并携带选项的 value
    (e: 'command', value: any): void;
}>()

const open = ref(false)
const open_detail = ref(false)
const highlight = {
    backgroundColor: "#59c173",
}

function choiceDs(command: any) {
    console.log(command[0]);
    console.log(command[1]);
    console.log(command[2]);
    emit('command', command)

}

// 4. 点击事件处理函数
const handleCommand = (item: any) => {
    current_type.value = item.value
    if (item.value === 'ds') return
    emit('command', [props.scope.row, item])
}
</script>

<style lang="scss" scoped>
/* 样式保持不变 */
.motion-dropdown-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.motion-dropdown-trigger {
    padding: 4px 8px;
    border-radius: 6px;
    background-color: #ffffff;
    color: #ffffff;
    border: 0px solid #1d2628;
    cursor: pointer;
    width: 90px;
    font-weight: 500;
    font-size: 0.9rem;
}

.motion-dropdown-content {
    background-color: #ffffff;
    height: 100%;
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

    .context {
        display: flex;
        flex-direction: column;
        height: 100%;
        width: 100%;

        .main {
            padding: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            flex-direction: column;
            gap: 5px;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            align-items: stretch;
            // border: 1px solid #f0f0f0;

            .right-content {

                .base-type-content {
                    height: 100%;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    gap: 5px;
                    border-radius: 6px;
                    min-height: 200px;
                }

                .ds-type-content {
                    height: 100%;
                    width: 100%;
                    display: flex;
                    justify-content: start;
                    align-items: start;
                    flex-direction: column;
                    gap: 5px;
                    border-radius: 6px;
                    max-height: 300px;
                    width: 400px;
                    overflow-y: auto;
                }
            }
        }
    }
}
</style>