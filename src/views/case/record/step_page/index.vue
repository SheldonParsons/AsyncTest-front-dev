<template>
    <div class="case-content">
        <SplitterGroup v-if="data" direction="horizontal" ref="groupRef">
            <SplitterPanel :default-size="100" :min-size="40"
                style="display:flex; flex-direction:column; height:100%;overflow: scroll;background-color: white;"
                class="caseContentRef no-scroll">
                <CaseSteps ref="caseStepRef" :read_only="3" :case_id="case_id" @choice="choice_step"
                    :status_mapping="status_mapping" :ready_data="data">
                </CaseSteps>
            </SplitterPanel>
            <SplitterResizeHandle ref="handleRef" class="SplitterResizeHandle"
                :style="{ width: isCollapsed ? '0px' : '10px' }" />
            <SplitterPanel class="animated-panel" @resize="onPanelResize" style="
            display:flex; flex-direction:column; height:100%; background-color: white;
          " ref="panelRef" :default-size="0" :min-size="0" :max-size="60" :collapsed-size="0">
                <ProcessRecord v-if="show_step_process" :is_step_detail="true" :callback="child_case_process_record"
                    :padding_height="100" :interface_callback="interface_detail_record"
                    :force_check_ending="stopRecordChecking" @showStepDetail=showStepDetailAction>
                </ProcessRecord>
                <div class="step-tips" v-if="show_step_detail && current_step_data && current_step_data.type === 'interface'">
                    <div>
                        需要提醒您，您现在看到的接口信息是最新的，而不是您运行任务时的接口信息。
                    </div>
                </div>
                <div style="overflow-y: auto;flex: 1;" class="no-scroll" v-if="show_step_detail">
                    <StepDetail :case_id="case_id" :data="current_step_data" :show_save="false" @save="saveStep">
                    </StepDetail>
                </div>
            </SplitterPanel>
        </SplitterGroup>
        <AstLoading v-else></AstLoading>
        <div v-if="isCollapsed" class="floating-handle" @click="togglePanel">
            <span class="vertical-text">SHOW</span>
        </div>
    </div>
</template>

<script lang="ts" setup>
import tools from '@/utils/tools'
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import CaseSteps from '@/views/case/content/case_content/runner/tree/index.vue'
import { ApiGetRecordList } from '@/api/case/case/index'
import { onMounted, ref, computed, onUnmounted, nextTick } from 'vue'
import { PollingUtil } from '@/views/case/record/utils/PollingUtil'
import ProcessRecord from '@/views/case/record/comp/process_record.vue'
import StepDetail from '@/views/case/content/case_content/runner/detail/step_detail.vue'


const data = ref(null)
const panelRef: any = ref(null)
const status_mapping: any = ref()
const poller: any = ref(null)
const COLLAPSE_THRESHOLD = 20
const current_step_id = ref(-1)
const show_step_process = ref(false)
const current_step_info = ref()
const show_step_detail = ref(false)
const current_step_data = ref()
const isCollapsed = computed(() => {
    try {
        return panelRef.value?.getSize() === 0
    } catch (error) {
        return false
    }
})

onMounted(async () => {
    await get_steps()
    get_status_mapping()
    console.log(status_mapping.value);
})

onUnmounted(() => {
    if (poller.value) {
        poller.value.stop()
    }
})

function openPanel() {
    if (!panelRef.value) return
    panelRef.value.resize(60)
}

function closePanel() {
    if (!panelRef.value) return
    panelRef.value.resize(0)
}

function showStepDetailAction() {
    show_step_process.value = false
    show_step_detail.value = true
}

function saveStep() {
    window.$toast({ title: '您无法在日志处修改步骤信息', type: 'info' })
}

async function choice_step(data: any, node: any, tree_node: any, event: any) {
    current_step_data.value = data
    show_step_detail.value = false
    if (data.type === 'empty') {
        window.$toast({ title: '该步骤无法查看详情' })
        return
    }
    if (show_step_process.value === true) {
        if (data.id !== current_step_id.value) {
            current_step_id.value = data.id
            show_step_process.value = false
            await nextTick()
            show_step_process.value = true
        } else {
            closePanel()
            show_step_process.value = false
        }

    } else {
        current_step_id.value = data.id
        show_step_process.value = true
        await nextTick()
        openPanel()
    }

}

async function child_case_process_record(current_index: Number) {
    const _data = {
        type: 'step_process',
        record_backup_index: props.record_id,
        index: props.child_case_index,
        step_id: current_step_id.value,
        case_id: props.case_id,
        start_index: current_index
    }

    const result = await tools.send(ApiGetRecordList, _data)
    current_step_info.value = result.step_info
    return result
}

async function interface_detail_record(type: String, index: String) {
    const _data = {
        type: type,
        record_backup_index: props.record_id,
        index: index
    }
    return await tools.send(ApiGetRecordList, _data)
}

function stopRecordChecking() {
    if (current_step_info.value.status.includes('mid')) {
        return false
    }
    return true
}

async function onPanelResize(newSize: any, oldSize: any) {
    if (!panelRef.value) return
    // 如果拖拽下来到阈值以下，且还没折叠，就 collapse()
    if (newSize <= COLLAPSE_THRESHOLD) {
        panelRef.value.resize(0)
    }
}

function togglePanel() {
    if (current_step_id.value === -1 && show_step_process.value === false) {
        window.$toast({ title: '请选择步骤进行查看' })
        return
    }
    if (!panelRef.value) return
    const isCollapsedNow = panelRef.value.getSize() === 0
    panelRef.value.resize(isCollapsedNow ? 60 : 0)
    if (!isCollapsedNow) {
        show_step_process.value = false
    }
}

async function get_steps() {
    const _data = {
        type: 'steps_snapshot',
        record_backup_index: props.record_id,
        case_id: props.case_id
    }
    data.value = await tools.send(ApiGetRecordList, _data)
}

async function get_status_mapping() {
    const _data = {
        type: 'step_status_mapping',
        record_backup_index: props.record_id,
        index: props.child_case_index
    }
    status_mapping.value = await tools.send(ApiGetRecordList, _data)

    let has_running_task = has_mid_step(status_mapping.value)
    console.log(has_running_task);

    if (has_running_task) {
        if (!poller.value) {
            createPolling(refresh_data)
        }
        poller.value.setInterval(500)
        poller.value.setMaxRetries(300)
        startPolling(refresh_data)
    }
}

function has_mid_step(data: any) {
    return Object.values(data).some((value: any) => value.status.includes('mid'));
}


async function refresh_data() {
    const _data = {
        type: 'step_status_mapping',
        record_backup_index: props.record_id,
        index: props.child_case_index
    }
    status_mapping.value = await tools.send(ApiGetRecordList, _data)

    let has_running_task = has_mid_step(status_mapping.value)
    if (!has_running_task) {
        poller.value.stop()
        return
    }
}


function createPolling(callback: any) {
    poller.value = new PollingUtil(callback, 5000, 360)
}

async function startPolling(callback: any) {
    if (!poller.value) {
        createPolling(callback)
    }
    poller.value.start()
}

const props = defineProps({
    case_id: {
        default: null,
        type: Number
    },
    range_type: {
        default: 'case',
        type: String
    },
    record_id: {
        default: -1,
        type: Number
    },
    child_case_index: {
        default: -1,
        type: null
    }
})

</script>

<style lang="scss" scoped>
.step-tips {
    padding: 10px;

    div {
        box-sizing: border-box;
        border-radius: 8px;
        border: 2px solid #f0f0f0;
        font-weight: 500;
        font-size: 0.9rem;
        padding: 10px;
        color: rgba($color: #000000, $alpha: 0.8);
        background: linear-gradient(80deg, #ffd460 0%, #f8b98c 40%, #f07b3f 90%)
    }
}
.case-content {
    flex-grow: 1;
    min-height: 0;
    background-color: rgb(242, 244, 247);
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