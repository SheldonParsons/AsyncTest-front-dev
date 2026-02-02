<template>
    <div class="case-container">
        <div class="case-container-select">
            <TabSelect :selectedTab="current_page" @change="change_page">
                <div class="tab-action">
                    <div class="dataset-group-tab-atcion" v-if="current_page === 1 && isOpen">
                        <AstButton @click="addDataSet">
                            <div style="display: flex; gap: 4px;font-size: 0.8rem;">
                                <AddDatasetSvg style="width: 15px;"></AddDatasetSvg>新建数据集
                            </div>
                        </AstButton>
                    </div>
                    <div class="dataset-group-tab-atcion" v-if="current_page === 1 && !isOpen">
                        <motion.div @click="editTableName" class="edit-dataset-btn" :whilePress="{ scale: 0.9 }">
                            <EditDatasetSvg style="width: 15px;"></EditDatasetSvg>修改数据集
                        </motion.div>
                        <motion.div @click="deleteTable" class="delete-dataset-btn" :whilePress="{ scale: 0.9 }">
                            <DeleteDatasetSvg style="width: 15px;"></DeleteDatasetSvg>删除数据集
                        </motion.div>
                    </div>
                    <div class="case-group-tab-atcion" v-if="current_page === 0">
                        <motion.div @click="run_case_task" class="run-btn" :whilePress="{ scale: 0.9 }"
                            :whileHover="{ scale: 1.05 }">
                            <RunCaseSvg />
                            <div>运行</div>
                        </motion.div>
                        <motion.div @click="setting_case" class="case-setting-btn" :whilePress="{ scale: 0.9 }"
                            :whileHover="{ scale: 1.05 }">
                            <CaseSettingSvg></CaseSettingSvg>
                        </motion.div>
                    </div>
                </div>
            </TabSelect>
        </div>
        <div class="case-content" v-if="current_page === 0">
            <SplitterGroup direction="horizontal" ref="groupRef" v-if="!loading">
                <SplitterPanel :default-size="100" :min-size="40"
                    style="display:flex; flex-direction:column; height:100%;overflow: scroll;"
                    class="caseContentRef no-scroll">
                    <CaseInfo v-if="case_info" :data="case_info" :node_id="node_id"></CaseInfo>
                    <CaseSteps ref="caseStepRef" :case_id="case_id" @scroll="scroll" @choice="choice_step"
                        @delete="delete_step" @done="case_done">
                    </CaseSteps>
                </SplitterPanel>
                <SplitterResizeHandle ref="handleRef" class="SplitterResizeHandle"
                    :style="{ width: isCollapsed ? '0px' : '10px' }" />
                <SplitterPanel class="animated-panel" @resize="onPanelResize" style="
            display:flex; flex-direction:column; height:100%;
          " ref="panelRef" :default-size="0" :min-size="0" :max-size="60" :collapsed-size="0">
                    <div style="overflow-y: auto;flex: 1;" class="no-scroll">
                        <StepDetail :case_id="case_id" :data="step_data" v-if="show_step_detail" @save="saveStep">
                        </StepDetail>
                        <CaseSetting v-if="show_case_detail" :data="case_info" @save="saveCase"></CaseSetting>
                    </div>
                </SplitterPanel>
            </SplitterGroup>
            <AstLoading v-else></AstLoading>
            <div v-if="isCollapsed" class="floating-handle" @click="togglePanel">
                <span class="vertical-text">SHOW</span>
            </div>
        </div>
        <div class="data-content" v-if="current_page === 1">
            <motion.div v-if="isOpen" style="width: 100%;height: 100%;position: relative;" :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }">
                <SplitterGroup direction="horizontal" ref="groupRef">
                    <SplitterPanel :default-size="100">
                        <DataSet ref="datasetRef" :case_id="case_id" @edit="go_table"></DataSet>
                    </SplitterPanel>
                </SplitterGroup>
            </motion.div>
            <motion.div style="width: 100%;height: 100%;position: relative;" v-if="!isOpen" :initial="{ opacity: 0 }"
                :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }">
                <div class="floating-handle-left" @click="isOpen = !isOpen">
                    <span class="vertical-text">BACK</span>
                </div>
                <SplitterGroup direction="horizontal" ref="groupRef">
                    <SplitterPanel :default-size="13"
                        style="display:flex; flex-direction:column;align-items: center; height:100%;border-right: 1px solid #f0f0f0;box-sizing: border-box;">
                        <TabSelectCol :selectedTab="current_env" @change="change_env" :tabs="tabs">
                        </TabSelectCol>
                        <el-divider></el-divider>
                        <div :title="dataset.name" class="dataset-name g-e">{{ dataset.name }}</div>
                    </SplitterPanel>
                    <SplitterPanel :default-size="1" style="display:flex; flex-direction:column; height:100%;">
                    </SplitterPanel>
                    <SplitterPanel :default-size="84" style="display:flex; flex-direction:column; height:100%;">
                        <DataCore v-if="showTable" :dataset="dataset" :env="current_env_data" :data="table_data"
                            @change_depend="change_depend"></DataCore>
                    </SplitterPanel>
                    <SplitterPanel :default-size="2" style="display:flex; flex-direction:column; height:100%;">
                    </SplitterPanel>
                </SplitterGroup>
            </motion.div>
        </div>
        <div class="record-content" v-if="current_page === 2">
            <Record :case_id="props.case_id" ref="recordRef"></Record>
        </div>
        <DialogAnimation ref="tableRef" title="编辑表格名称" cancel_title="取消" :confirm_title="'确认'"
            :before_comfirm="check_table_name">
            <div>
                <input ref="inputRef" v-model="table_name" placeholder="表格名称">
            </div>
        </DialogAnimation>
        <DialogAnimation ref="deleteTableRef" title="删除表格" cancel_title="取消" :confirm_title="'确认'"
            :before_comfirm="check_table_delete">
            <div>
                <span style="color: #ec6d51;font-size: 0.9rem;">您确定要删除表格吗？删除后表格中的数据将会永久删除，无法恢复。</span>
            </div>
        </DialogAnimation>
    </div>
</template>

<script setup lang="ts">
import TabSelect from '@/assets/motion/tab_select.vue'
import TabSelectCol from '@/assets/motion/tab_select_col.vue'
import CaseSteps from '@/views/case/content/case_content/runner/tree/index.vue'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { ref, computed, watch, nextTick } from 'vue'
import Record from '@/views/case/record/index.vue'
import CaseInfo from '@/views/case/content/case_content/runner/case_info/index.vue'
import DataCore from '@/views/case/content/case_content/data/index.vue'
import DataSet from '@/views/case/content/case_content/data_set/index.vue'
import AstButton from '@/components/common/general/button.vue'
import AddDatasetSvg from '@/assets/logo/final/match_vue/add_dataset.vue'
import EditDatasetSvg from '@/assets/logo/final/match_vue/edit.vue'
import DeleteDatasetSvg from '@/assets/logo/final/match_vue/delete.vue'
import CaseSettingSvg from '@/assets/logo/final/match_vue/setting.vue'
import RunCaseSvg from '@/assets/logo/final/match_vue/play.vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import CaseSetting from '@/views/case/content/case_content/runner/case_info/detail.vue'
import { useRoute } from 'vue-router'
import { motion } from 'motion-v'
import { send_action, send_case_action } from '@/views/case/utils'
import { ApiRunCase } from '@/api/case/case/index'
import StepDetail from '@/views/case/content/case_content/runner/detail/step_detail.vue'
import _ from 'lodash'
const table_name = ref('')
const tableRef: any = ref(null)
const deleteTableRef: any = ref(null)
const recordRef: any = ref(null)
const route = useRoute()
/** 拿到右侧面板实例 */
const panelRef: any = ref(null)
const handleRef = ref(null)
const COLLAPSE_THRESHOLD = 20
const dandle_id = ref(0)
const current_page = ref(0)
const current_env = ref(0)
const isOpen = ref(true)
const datasetRef: any = ref(null)
const loading = ref(false)
const tabs: any = ref([])
const env_list: any = ref([])
const current_env_data: any = ref()
const dataset: any = ref(null)
const table_data: any = ref({ cols: [], rows: [] })
const showTable = ref(false)
let timer: any = null
const step_data: any = ref(null)
const show_step_detail = ref(false)
const show_case_detail = ref(false)
const current_step_origin_detail: any = ref(null)
const caseStepRef: any = ref(null)
const case_info: any = ref(null)

watch(current_page, (newVal, oldVal) => {
    console.log(newVal);
    if (newVal === 0) {
        loading.value = true
        // 每次都重置等待
        if (timer) clearTimeout(timer)
        timer = setTimeout(() => {
            loading.value = false
        }, 500) // 1秒延迟，你可以调整时间
    } else {
        // 只要不是0就立即清除定时器（可选）
        if (timer) clearTimeout(timer)
        loading.value = true
    }
    setTimeout(() => {
        isOpen.value = true
        current_env.value = 0
    }, 0)
})

async function runCase() {
    current_page.value = 2
    await nextTick();
    if (recordRef.value) {
        recordRef.value.openCaseRecord();
    }
}

function scroll() {
    setTimeout(() => {
        const container: any = document.querySelector('.caseContentRef') // 你的滚动容器
        container.scrollTo({
            top: container.scrollHeight,
            behavior: 'smooth'
        })
    }, 500)
}
const isCollapsed = computed(() => {
    try {
        return panelRef.value?.getSize() === 0
    } catch (error) {
        return false
    }
})

async function delete_step(data_id: any) {
    if (current_step_origin_detail.value && data_id === current_step_origin_detail.value.id) {
        closePanel()
    }
}

function case_done() {
    case_info.value = caseStepRef.value.get_case()
}

let current_run_task_list: Array<number> = []

async function run_case_task() {
    if (current_run_task_list.includes(props.case_id)) {
        window.$toast({ title: '任务正在运行中，请稍后再试' })
        return
    } else {
        current_run_task_list.push(props.case_id)
    }
    const data = {
        type: 1,
        child_action_type: "run_case_task",
        content: {
            case_id: props.case_id
        }
    }
    await ApiRunCase(data).then(async (res: any) => {
        const index = current_run_task_list.indexOf(props.case_id)
        if (index !== -1) current_run_task_list.splice(index, 1);
        if (res.hasOwnProperty("result")) {
            if (res.result === 50001) {
                window.$toast({ title: res.data, type: 'error' })
                return false;
            } else if (res.result === 0) {
                window.$toast({ title: res.data, type: 'error' })
            }
        } else {
            window.$toast({ title: '用例开始执行', type: 'success' })
            await runCase()
        }
    })
}

async function setting_case() {
    if (show_step_detail.value === true) {
        show_step_detail.value = false
    }
    if (show_case_detail.value === true) {
        show_case_detail.value = false
        closePanel()
    } else {
        case_info.value = caseStepRef.value.get_case()
        caseStepRef.value.clean_choice()
        show_case_detail.value = true
        openPanel()
    }
}

async function choice_step(data: any, node: any, tree_node: any, event: any) {
    if (show_case_detail.value === true) {
        show_case_detail.value = false
    }
    current_step_origin_detail.value = data
    step_data.value = _.cloneDeep(data)
    show_step_detail.value = false
    await nextTick()
    show_step_detail.value = true
    openPanel()
}

async function saveCase() {
    console.log(case_info.value);
    const _data = {
        type: 0,
        child_action_type: 'update_case',
        content: {
            case_id: props.case_id,
            env: case_info.value.env,
            error_strategy: case_info.value.error_strategy,
            runtime_parameters_strategy: case_info.value.runtime_parameters_strategy,
            loop_strategy: case_info.value.loop_strategy,
            drive_strategy: case_info.value.drive_strategy,
            data_set: case_info.value.data_set,
            before_script: case_info.value.before_script,
            loop_times: case_info.value.loop_times,
            global_datasource: case_info.value.global_datasource
        }
    }
    const result = await send_case_action(_data)
    if (result !== false) {
        window.$toast({ title: '用例更新成功' })
    }
}

async function saveStep() {
    console.log(step_data.value);
    let has_change = false
    for (let variable in step_data.value) {
        if (variable !== 'id' && variable !== 'children') {
            if (JSON.stringify(current_step_origin_detail.value[variable]) !== JSON.stringify(step_data.value[variable])) {
                current_step_origin_detail.value[variable] = step_data.value[variable]
                has_change = true
            }
        }
    }
    if (has_change === true) {
        const _data = {
            type: 0,
            child_action_type: 'update_node',
            content: {
                case_id: props.case_id,
                node_content: step_data.value
            }
        }
        await send_case_action(_data)
        step_data.value = _.cloneDeep(current_step_origin_detail.value)
        window.$toast({ title: '步骤修改已保存' })
    } else {
        window.$toast({ title: '步骤无变化', type: 'info' })
    }

}

async function deleteTable() {
    const result = await deleteTableRef.value.open()
    if (result.action === 'comfirm' && result.hook_result === true) {
        if (result.action === 'comfirm') {
            window.$toast({ title: '数据集删除成功' })
        }
    }
}

async function editTableName() {
    table_name.value = current_env_data.value.name
    const result = await tableRef.value.open()
    if (result.action === 'comfirm' && result.hook_result === true) {
        current_env_data.value.name = table_name.value
        if (result.action === 'comfirm') {
            window.$toast({ title: '新增数据集成功。' })
        }
    }
}

async function check_table_name() {
    const _data = {
        type: 1,
        child_action_type: 'edit_table',
        content: {
            project_id: route.params.project,
            table_id: env_list.value[current_env.value].table_id,
            new_name: table_name.value
        }
    }
    const result = await send_action(_data)
    if (!result) return false
}

async function check_table_delete() {
    const _data = {
        type: 1,
        child_action_type: 'delete_table',
        content: {
            project_id: route.params.project,
            table_id: env_list.value[current_env.value].table_id
        }
    }
    const result = await send_action(_data)
    if (!result) return false
}

async function change_page(index: number) {
    current_page.value = index
}

async function change_env(index: number) {
    current_env.value = index
    showTable.value = false
    await get_table()
    showTable.value = true
}

function addDataSet() {
    datasetRef.value.addDataset()
}

async function go_table(dataset_item: any) {
    current_env.value = 0
    showTable.value = false
    const _data = {
        type: 1,
        child_action_type: 'get_dataset_env_list',
        content: {
            project: route.params.project,
            dataset_id: dataset_item.id
        }
    }
    const result = await send_action(_data)
    env_list.value = result
    dataset.value = dataset_item
    tabs.value = result.map((item: any) => item.name)
    isOpen.value = !isOpen.value
    current_env_data.value = env_list.value[current_env.value]
    await get_table()
    showTable.value = true

}

function change_depend() {
    current_env_data.value.depend = current_env_data.value.depend === 1 ? 0 : 1
}

async function get_table() {
    current_env_data.value = env_list.value[current_env.value]

    const _data = {
        type: 1,
        child_action_type: 'get_table',
        content: {
            table_id: env_list.value[current_env.value].table_id
        }
    }
    const result = await send_action(_data)
    table_data.value = result
    window.$toast({ title: '数据已加载。' })
}

/** 切换折叠/展开 */
function togglePanel() {
    if (!panelRef.value) return
    const isCollapsedNow = panelRef.value.getSize() === 0
    panelRef.value.resize(isCollapsedNow ? 60 : 0)
    dandle_id.value += 1
    if (!(show_case_detail.value || show_step_detail.value)) {
        show_case_detail.value = true
    }
}

function openPanel() {
    if (!panelRef.value) return
    panelRef.value.resize(60)
    dandle_id.value += 1
}

function closePanel() {
    if (!panelRef.value) return
    panelRef.value.resize(0)
    dandle_id.value += 1
}

async function onPanelResize(newSize: any, oldSize: any) {
    if (!panelRef.value) return
    // 如果拖拽下来到阈值以下，且还没折叠，就 collapse()
    if (newSize <= COLLAPSE_THRESHOLD) {
        panelRef.value.resize(0)
    }
}
const props = defineProps({
    node_id: {
        type: Number,
        default: null,
    },
    case_id: {
        type: Number,
        default: 1,
    },
    target_type: {
        type: Number,
        default: -1,
    }
});

</script>

<style lang="scss" scoped>
.case-container {
    display: flex;
    flex-direction: column;
    height: 100%;

    .dataset-name {
        font-weight: 500;
        margin-top: 10px;
        font-size: 0.8rem;
        color: #939393;
        border: 1px solid #f0f0f0;
        box-sizing: border-box;
        padding: 3px;
        border-radius: 6px;
        display: flex;
        align-items: center;
        max-width: 80%;
        display: inline-block;
    }

    .case-container-select {
        flex: 0 0 auto;
        position: sticky;
        top: 0;
        z-index: 1;
        background-color: white;
        border-bottom: 1px solid var(--border-color-light);

        .tab-action {
            display: flex;
            justify-content: end;
            align-items: center;
            height: 100%;

            .dataset-group-tab-atcion,
            .case-group-tab-atcion {
                display: flex;
                align-items: center;
                height: 100%;
                padding-right: 20px;
                gap: 10px;

                .run-btn {
                    width: 80px;
                    height: 25px;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 5px;
                    color: white;
                    font-size: 14px;
                    font-weight: 500;
                    border: none;
                    background: linear-gradient(90deg, #3a7bd5, #00d2ff, #3a7bd5);
                    background-size: 200% 200%;
                    animation: gradient-move 4s ease-in-out infinite;
                    padding: 4px;
                    border-radius: 6px;
                    box-sizing: border-box;
                    cursor: pointer;
                    transition: all 0.3s ease;
                    box-shadow: 0 4px 15px 0 rgba(0, 118, 255, 0.3);
                }

                .run-btn:hover {
                    box-shadow: 0 6px 20px 0 rgba(0, 118, 255, 0.4);
                    transform: translateY(-2px);
                    /* 悬停时轻微上浮 */
                }

                .run-btn:active {
                    transform: translateY(0);
                    /* 点击时恢复原位 */
                    box-shadow: 0 2px 10px 0 rgba(0, 118, 255, 0.2);
                }

                .run-btn svg {
                    width: 14px;
                }

                /* 2. 替换您的 @keyframes (与原来相同，但配合新样式效果不同) */
                @keyframes gradient-move {
                    0% {
                        background-position: 0% 50%;
                    }

                    50% {
                        background-position: 100% 50%;
                    }

                    100% {
                        background-position: 0% 50%;
                    }
                }

                .case-setting-btn {
                    width: 25px;
                    height: 25px;
                    background-color: black;
                    color: white;
                    padding: 2px;
                    box-sizing: border-box;
                    border-radius: 4px;
                    cursor: pointer;
                }

                .edit-dataset-btn {
                    position: relative;
                    color: white;
                    box-sizing: border-box;
                    padding: 5px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 6px;
                    background: linear-gradient(135deg, #1a1a1a, #2d2d2d, #1a1a1a);
                    background-size: 200% 200%;
                    animation: gradient-shift 3s ease infinite;
                    box-shadow: 0 4px 15px rgba(0, 0, 0, 0.4),
                        0 0 20px rgba(255, 255, 255, 0.1);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .edit-dataset-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.1), transparent);
                    transition: left 0.5s;
                }

                .edit-dataset-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.5),
                        0 0 30px rgba(255, 255, 255, 0.15);
                    background: linear-gradient(135deg, #2d2d2d, #404040, #2d2d2d);
                }

                .edit-dataset-btn:hover::before {
                    left: 100%;
                }

                .edit-dataset-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 10px rgba(0, 0, 0, 0.3),
                        0 0 15px rgba(255, 255, 255, 0.08);
                }

                .edit-dataset-btn svg {
                    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
                    transition: transform 0.3s ease;
                }

                .edit-dataset-btn:hover svg {
                    transform: scale(1.1);
                }

                .delete-dataset-btn {
                    position: relative;
                    color: white;
                    box-sizing: border-box;
                    padding: 5px 16px;
                    font-size: 14px;
                    font-weight: 500;
                    border: none;
                    border-radius: 8px;
                    cursor: pointer;
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    gap: 6px;
                    background: linear-gradient(135deg, #dc3545, #c82333, #dc3545);
                    background-size: 200% 200%;
                    animation: gradient-shift 3s ease infinite;
                    box-shadow: 0 4px 15px rgba(220, 53, 69, 0.4),
                        0 0 20px rgba(220, 53, 69, 0.2);
                    transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
                    overflow: hidden;
                }

                .delete-dataset-btn::before {
                    content: '';
                    position: absolute;
                    top: 0;
                    left: -100%;
                    width: 100%;
                    height: 100%;
                    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.15), transparent);
                    transition: left 0.5s;
                }

                .delete-dataset-btn:hover {
                    transform: translateY(-2px);
                    box-shadow: 0 6px 20px rgba(220, 53, 69, 0.5),
                        0 0 30px rgba(220, 53, 69, 0.25);
                    background: linear-gradient(135deg, #e74c3c, #dc3545, #e74c3c);
                }

                .delete-dataset-btn:hover::before {
                    left: 100%;
                }

                .delete-dataset-btn:active {
                    transform: translateY(0);
                    box-shadow: 0 2px 10px rgba(220, 53, 69, 0.3),
                        0 0 15px rgba(220, 53, 69, 0.15);
                }

                .delete-dataset-btn svg {
                    filter: drop-shadow(0 0 2px rgba(255, 255, 255, 0.3));
                    transition: transform 0.3s ease;
                }

                .delete-dataset-btn:hover svg {
                    transform: scale(1.1);
                }

                @keyframes gradient-shift {
                    0% {
                        background-position: 0% 50%;
                    }

                    50% {
                        background-position: 100% 50%;
                    }

                    100% {
                        background-position: 0% 50%;
                    }
                }

            }
        }
    }

    .case-content,
    .data-content,
    .record-content {
        height: 100%;
        flex: 1 1 auto;
        overflow: hidden;
        display: flex;
        flex-direction: column;
    }
}

.SplitterResizeHandle[data-orientation="horizontal"] {
    width: 0.5rem;
    background-color: rgb(242, 244, 247);
}

.SplitterResizeHandle[data-orientation="vertical"] {
    height: 0.5rem
}


/* 垂直文字 + 闪烁动画 */
.floating-handle {
    position: absolute;
    top: 50%;
    right: 0;
    transform: translate(50%, -50%);
    width: 24px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    animation: blink 5s infinite;
}

.floating-handle-left {
    position: absolute;
    top: 50%;
    left: 0;
    transform: translate(0%, -100%);
    width: 24px;
    height: 80px;
    display: flex;
    align-items: center;
    justify-content: center;
    border-radius: 4px;
    cursor: pointer;
    user-select: none;
    animation: blink 5s infinite;
    z-index: 1;
}

/* 文字竖排 */
.vertical-text {
    writing-mode: vertical-rl;
    text-orientation: upright;
    font-size: 12px;
    font-weight: bold;
    /* 定义背景渐变 */
    /* 将背景裁剪到文字（仅 WebKit 内核生效）*/
    -webkit-background-clip: text;
    /* 文字本身透明，这样才能显示背景 */
    -webkit-text-fill-color: transparent;
    /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
    background-clip: text;
    /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
    color: transparent;
    font-weight: 800;
    background-image: linear-gradient(90deg, #000000, #654730);
    display: inline-block;
    border: 1px solid #f0f0f0;
    border-radius: 4px;
}

/* 闪烁关键帧 */
@keyframes blink {

    0%,
    50%,
    100% {
        opacity: 1;
    }

    25%,
    75% {
        opacity: 0;
    }
}
</style>