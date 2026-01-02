<template>
    <div class="motion-container">
        <DropdownMenu.Root v-model:open="open">
            <DropdownMenu.Trigger as-child :disabled="can_show_ds_detail === false">
                <div style="display: flex;justify-content: center;align-items: center;gap: 3px;">
                    <TooltipAnimation :isOpen="showIdTooltip === scope.row.id">
                        <template #trigger>
                            <motion.button class="motion-trigger g-e" @mouseenter="showIdTooltip = scope.row.id"
                                @mouseleave="showIdTooltip = -1" :style="{
                                    color: typingAttrMapping[scope.row.t]['color'],
                                }" :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.95 }">
                                {{ get_name(scope) }} ▾
                            </motion.button>
                        </template>
                        <template #default>
                            <div>{{ get_name(scope) }}</div>
                        </template>
                    </TooltipAnimation>
                    <div v-if="scope.row.t === 'ds' && can_show_ds_detail" @click.stop>
                        <DsDetail :index="inOuter ? scope.row.ds_target : scope.row.ds_id" :inOuter="inOuter"></DsDetail>
                    </div>
                </div>
            </DropdownMenu.Trigger>
            <DropdownMenu.Portal>
                <AnimatePresence>
                    <DropdownMenu.Content v-if="open" :side-offset="10" style="z-index: 9999;" side="right">
                        <motion.div class="motion-content" :initial="{ opacity: 0, scale: 0.85 }"
                            :animate="{ opacity: 1, scale: 1 }" :exit="{ opacity: 0, scale: 0.85 }"
                            :transition="{ duration: 0.2 }" :style="{ willChange: 'transform, opacity' }">
                            <div class="content">
                                <div class="header">
                                    <div>数据类型</div>
                                    <motion.div class="close-icon" :while-hover="{ scale: 1.05 }"
                                        :while-press="{ scale: 0.95 }">
                                        <el-icon @click="open = false">
                                            <CloseBold />
                                        </el-icon>
                                    </motion.div>
                                </div>
                                <div class="main">
                                    <div class="left-menu">
                                        <div v-for="item in props.data" :key="item.value">
                                            <motion.div :while-press="{ scale: 0.95 }" class="left-item"
                                                @click="handleCommand([scope.row, item])">
                                                {{ item.value === 'ds' ? '引用类型' : item.label.charAt(0).toUpperCase() +
                                                    item.label.slice(1) }}
                                            </motion.div>
                                        </div>
                                    </div>
                                    <div class="right-content">
                                        <div v-if="current_type !== 'ds'" class="base-type-content">
                                            <DS class="case-icon" style="height: 33px"></DS>
                                            <div style="font-size: 0.8rem;">暂未开放</div>
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
import { CloseBold } from "@element-plus/icons-vue";
import { Filter } from "@element-plus/icons-vue";
import DS from "@/assets/svg/tree/ds.vue";
import TreeNode from '@/views/case/content/case_content/runner/tree/components/select_ds_tree.vue'
import { useRoute } from "vue-router";
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import DsDetail from '@/views/api/child_context/req/body_child/comp/ds_detail.vue'

const route = useRoute();

const typingAttrMapping: any = GlobalStatus.regular_type_info_map();

const current_type = ref('string')

const filterText = ref("")

const showIdTooltip = ref(-1)

const dsTreeNodeRef: any = ref(null)

// 2. 定义组件的 props
const props = defineProps<{
    // `current` 用于显示在触发器按钮上的当前值
    scope: any;
    // `data` 是下拉菜单的选项列表
    data: Array<any>;
    excluded_ids: Array<Number>;
    can_show_ds_detail: Boolean;
    inOuter: any;
}>()

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
    (e: 'command', value: string | number): void;
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
const handleCommand = (command: any) => {
    current_type.value = command[1].value
    if (command[1].value === 'ds') return
    emit('command', command)
}
</script>

<style lang="scss" scoped>
/* 样式保持不变 */
.motion-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.motion-trigger {
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

.motion-content {
    background-color: #ffffff;
    height: 100%;

    .content {
        min-width: 300px;
        display: flex;
        flex-direction: column;
        height: 100%;

        .header {
            height: 100%;
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.9rem;
            background-color: rgb(0, 0, 0);
            height: 40px;
            color: rgb(255, 255, 255);
            border-radius: 6px 6px 0px 0px;
            padding: 6px;
            box-sizing: border-box;
            border-left: 1px solid #f0f0f0;
            border-top: 1px solid #f0f0f0;
            border-right: 1px solid #f0f0f0;
        }

        .main {
            padding: 4px;
            display: flex;
            justify-content: center;
            align-items: center;
            gap: 5px;
            height: 100%;
            width: 100%;
            box-sizing: border-box;
            align-items: stretch;
            border: 1px solid #f0f0f0;

            .left-menu {
                flex: 30;
                border-right: 1px solid #f0f0f0;
                background-color: black;
                color: #f0f0f0;
                padding: 5px;
                box-sizing: border-box;
                display: flex;
                flex-direction: column;
                border-radius: 6px;

                .left-item {
                    padding: 5px;
                    border-radius: 6px;
                    cursor: pointer;
                    font-size: 0.9rem;
                }

                .left-item:hover {
                    background-color: #59c173;
                }
            }

            .right-content {
                flex: 70;
                display: flex;

                .base-type-content {
                    height: 100%;
                    width: 100%;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    flex-direction: column;
                    gap: 5px;
                    background-color: #f0f0f0;
                    border-radius: 6px;
                }

                .ds-type-content {
                    height: 100%;
                    width: 100%;
                    display: flex;
                    justify-content: start;
                    flex-direction: column;
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

    .close-icon {
        padding: 3px;
        cursor: pointer;
        border-radius: 4px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .close-icon:hover {
        background-color: #f0f0f0;
        color: black;
    }
}

.motion-item {
    width: 100%;
    padding: 8px 12px;
    border: none;
    background: none;
    color: #f5f5f5;
    text-align: left;
    border-radius: 4px;
    cursor: pointer;
    font-size: 14px;
    box-sizing: border-box;
}
</style>