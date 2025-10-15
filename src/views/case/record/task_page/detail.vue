<template>
    <div class="task-container" v-if="data">
        <div class="task-edit-container">
            <div class="task-edit-item">
                <InputAnimation v-model="data.name" :placeholder="'任务名称'" :maxLength="50"></InputAnimation>
            </div>
            <div class="detail-setting">
                <div class="task-edit-item">
                    <span class="title">环境选择</span>
                    <div style="display: flex; gap: 5px;align-items: center;">
                        <Select :current="data.env" :items="env_list" @change="changeEnvStraegy"></Select>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="showRunTooltip2">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="showRunTooltip2 = true" @mouseleave="showRunTooltip2 = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>提示</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            如果您选择了具体的环境，任务将尝试使用该环境去驱动您的用例。</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            如果在您的用例中找到了相同的环境名，如果找不到则会使用用例自身的环境进行驱动。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                </div>
                <div class="task-edit-item">
                    <span class="title">发生错误时</span>
                    <div>
                        <Select :current="data.error_strategy" :items="errorTaskRealStrategy"
                            @change="changeErrorStraegy"></Select>
                    </div>
                </div>
                <div class="task-edit-item">
                    <span class="title">执行方式</span>
                    <div style="display: flex;justify-content: center;gap: 5px;">
                        <Radio v-model="data.loop_strategy" :items="multitaskerLoopStrategy"></Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;cursor: pointer;">
                            <TooltipAnimation :isOpen="showRunTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 20px;height: 20px;display: flex;align-items: center;"
                                        @mouseenter="showRunTooltip = true" @mouseleave="showRunTooltip = false">
                                        <InfoSvg style="width: 0.9rem;" />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>执行方式</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            顺序执行将以同步的方式运行您的任务。
                                        </div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            并发执行可以更快的执行您的任务，并获取结果。但请确保您的服务可以正确的接受它。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>

                </div>
            </div>
            <div style="min-width: 500px;display: flex;flex-direction: column;overflow: hidden;">
                <div style="padding: 5px 0px;">
                    <ProjectSelect :value="current_project" :items="project_list"
                        :current="Number(route.params.project)" @change="changeProject"></ProjectSelect>
                </div>
                <el-divider></el-divider>
                <div style="overflow-y: auto;flex-grow: 1; min-height: 0;" class="no-scroll" v-if="current_project.id !== -1">
                    <TreeNode style="width: 100%;" :project="current_project.id" :is_case="true" ref="caseTreeNodeRef"
                        @change_check="change_check" @ready="ready"></TreeNode>
                </div>
            </div>
        </div>
        <div class="task-transfer-icon">
            <TransferIcon></TransferIcon>
        </div>
        <div class="task-case-list">
            <div class="title">任务用例列表</div>
            <div class="case-list no-scroll" v-if="case_list.length > 0">
                <draggable :list="case_list" item-key="id" handle=".drag-handle" :animation="200">
                    <template #item="{ element, index }">
                        <div class="item">
                            <DragHandle class="drag-handle" :key="element.id">
                            </DragHandle>
                            <div class="main">
                                <div
                                    style="display: flex;max-width:450px;gap: 5px;overflow: hidden;align-items: center;">
                                    <Case style="height: 1.5rem;min-width: 50px;"></Case>
                                    <div class="name g-e" style="max-width: 450px">{{ element.name }}</div>
                                </div>
                                <div style="max-width:150px;">
                                    <div class="g-e" style="font-size: 0.8rem;background-color: black;color: white;
                                    cursor: pointer;border-radius: 5px;display: flex;padding: 3px 5px;
                                    justify-content: start;align-items: center;">
                                        {{ element.project }}</div>
                                </div>

                            </div>
                            <div style="width: 2rem;height: 2rem;">
                                <DeleteBtn @click="delete_case(element)"></DeleteBtn>
                            </div>
                        </div>
                    </template>
                </draggable>
            </div>
            <div v-else style="width: 100%;height: 100%;">
                <Empty></Empty>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute } from "vue-router"
import draggable from "vuedraggable";
import { ApiGetEnvListAndUserSetting } from "@/api/interface/env";
import DragHandle from '@/views/case/content/case_content/runner/tree/components/draghandle.vue'
import Select from '@/components/common/general/select_public.vue'
import ProjectSelect from '@/components/common/general/select.vue'
import Radio from '@/components/common/general/radio.vue'
import TransferIcon from '@/assets/svg/common/new_icon/transfer.vue'
import InfoSvg from '@/assets/svg/common/new_icon/info.vue'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import InputAnimation from '@/components/common/general/input.vue'
import DeleteBtn from '@/components/common/button/delete_btn.vue'
import { errorTaskRealStrategy } from '@/views/case/utils/constants'
import { multitaskerLoopStrategy } from '@/views/case/utils/constants'
import { ApiGetJoinProjects } from '@/api/project/index'
import { ApiGetTaskDetail } from '@/api/case/case/index'
import Case from "@/assets/svg/tree/case.vue";
import Empty from "@/views/api/child_component/params_child/comp/empty.vue";
import TreeNode from "@/views/case/content/case_content/runner/tree/components/select_interface_tree.vue";

const route = useRoute()
const env_list: any = ref([])
const showRunTooltip = ref(false)
const showRunTooltip2 = ref(false)
const caseTreeNodeRef: any = ref(null)
const project_list: any = ref([])
const case_list: any = ref([])
const data: any = ref(null)
const case_set: any = ref(new Set([]))
const current_project: any = ref({
    id: -1,
    name: '请输入项目'
})

let cache_id_list: any = []

const props = defineProps({
    can_edit: {
        default: true,
        type: Boolean
    },
    task_info: {
        default: null,
        type: null
    },
    is_edit: {
        default: true,
        type: Boolean
    }
})

onMounted(async () => {
    if (props.is_edit === true) {
        await getTaskDetail()
    } else {
        data.value = {
            name: '',
            env: '#bcenvlovelychoice',
            error_strategy: 'case',
            loop_strategy: 'sequential'
        }
        data.value.case_list = []
    }
    await get_env_list_and_user_env()
    await getProjectList()
    for (let i = 0; i < data.value.case_list.length; i++) {
        case_list.value.push({
            id: data.value.case_list[i].id,
            name: data.value.case_list[i].name,
            project: data.value.case_list[i].project
        })
        case_set.value.add(data.value.case_list[i].id)
        cache_id_list.push(data.value.case_list[i].id)
    }
})

function ready() {
    caseTreeNodeRef.value.check(cache_id_list, true)
}

async function getTaskDetail() {
    return await ApiGetTaskDetail(props.task_info.id).then((res: any) => {
        data.value = res
        return
    })
}
function change_check(data: any) {
    console.log(data);
    loop_and_add_tree([data.data], data.wantChecked)
}

function loop_and_add_tree(_node: any, wantChecked: any) {
    for (let i = 0; i < _node.length; i++) {
        if (_node[i].child_type === 3) {
            if (wantChecked) {
                if (!case_set.value.has(_node[i].target)) {
                    if (wantChecked) {
                        case_list.value.push({
                            id: _node[i].target,
                            name: _node[i].name,
                            project: current_project.value.name
                        })
                        case_set.value.add(_node[i].target)
                    }
                }
            } else {
                if (case_set.value.has(_node[i].target)) {
                    case_list.value = case_list.value.filter((e: any) => e.id !== _node[i].target)
                    case_set.value.delete(_node[i].target)
                }
            }
        } else {
            loop_and_add_tree(_node[i].children, wantChecked)
        }
    }
}

async function getProjectList() {
    return await ApiGetJoinProjects({}).then((res: any) => {
        project_list.value = res.results
        current_project.value = project_list.value.find((item: any) => item.id === Number(route.params.project))
        return
    })
}

function changeProject(project_item: any) {
    current_project.value = project_item
}

function changeEnvStraegy(item: any) {
    data.value.env = item.key
}

function changeErrorStraegy(item: any) {
    data.value.error_strategy = item.key
}

function delete_case(e: any) {
    case_list.value = case_list.value.filter((element: any) => {
        return element.id !== e.id
    })
    case_set.value.delete(e.id)
    console.log(e);
    
    caseTreeNodeRef.value.check([e.id], false)
}


async function get_env_list_and_user_env() {
    const data = {
        type: 0,
        child_action_type: "get_env_list_and_user_env",
        content: {
            project: route.params.project,
        },
    };
    return await ApiGetEnvListAndUserSetting(data).then((res: any) => {
        env_list.value = []
        env_list.value.push({
            key: "#bcenvlovelychoice",
            value: '由用例自行决定'
        })
        res.env_list.forEach((element: any) => {
            env_list.value.push({
                key: element.name,
                value: element.name
            })
        })
        return
    });
}

function get_task_info() {
    data.value.case_list = case_list.value
    return data.value
}


function check_task() {
    if (case_list.value.length === 0) {
        window.$toast({ title: '请至少选择一个测试用例', type: 'info' })
        return false
    }
    if (data.value.name.length === 0) {
        window.$toast({ title: '任务名称不能为空', type: 'info' })
        return false
    }
    if (props.can_edit === false) {
        window.$toast({ title: '用例任务内容不允许编辑', type: 'info' })
        return false
    }
    return true
}

defineExpose({ check_task, get_task_info })

</script>

<style lang="scss" scoped>
.task-container {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 600px;
}

.task-transfer-icon {
    width: 1rem;
    padding: 10px;
    // box-sizing: border-box;
    border: 1px solid #f0f0f0;
    display: flex;
    height: 1rem;
    border-radius: 10px;
    margin: 0px 5px;
}

.task-case-list {
    display: flex;
    justify-content: start;
    align-items: start;
    width: 700px;
    height: 100%;
    flex-direction: column;
    background-color: #ffffff;
    // border: 2px solid #f0f0f0;
    border-radius: 8px;
    gap: 10px;
    padding: 10px;

    .case-list {
        width: 100%;
        height: 100%;
        user-select: none;

        >div {
            width: 100%;
            display: flex;
            flex-direction: column;
            gap: 5px;
        }

        .item {
            width: 100%;
            display: flex;
            gap: 5px;
            align-items: center;
            justify-content: center;

            .main {
                padding: 10px;
                box-sizing: border-box;
                border: 1px solid #f0f0f0;
                width: 100%;
                border-radius: 8px;
                display: flex;
                align-items: center;
                justify-content: space-between;
                gap: 10px;

                .name {
                    font-size: 0.9rem;
                    font-weight: 500;
                }
            }
        }
    }

    // box-sizing: border-box;
    .title {
        font-size: 0.9rem;
        font-weight: 500;
    }
}

.task-edit-container {
    display: flex;
    flex-direction: column;
    gap: 10px;
    height: 100%;

    .detail-setting {
        display: flex;
        justify-content: start;
        align-items: start;
        width: 100%;
        flex-direction: column;
        background-color: #f0f0f03a;
        border: 2px solid #f0f0f0;
        border-radius: 8px;
        gap: 10px;
        padding: 10px;
        box-sizing: border-box;
    }

    .task-edit-item {
        display: flex;
        align-items: center;
        justify-content: space-between;
        width: 100%;
        gap: 5px;

        .title {
            font-size: 0.9rem;
            white-space: nowrap;
        }
    }
}
</style>