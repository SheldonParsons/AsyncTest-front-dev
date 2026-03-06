<template>
    <div class="record_nav g-unselect">
        <div style="display: flex;">
            <div v-for="(router_name, index) in router_list" :key="index" class="inner-item">
                <span v-if="router_name !== 'Task'">/</span>
                <motion.div class="item" :class="{ 'pointer': current_page === router_name }"
                    :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }"
                    @click="go_ahead_action(null, router_name)">{{ router_name }}</motion.div>
            </div>
        </div>
        <div v-if="range_type === 'project' && current_page === 'Task'" class="task-action">
            <motion.div @click="crateTask" :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.09 }"
                class="create-task">
                新建任务</motion.div>
        </div>
        <div v-if="current_page === 'Step'">
            <div class="case-group-tab-atcion">
                <motion.div @click="run_case_task" class="run-btn" :whilePress="{ scale: 0.9 }"
                    :whileHover="{ scale: 1.05 }">
                    <RunCaseSvg />
                    <div>运行</div>
                </motion.div>
            </div>
        </div>
    </div>
    <TaskPage v-if="current_page === 'Task'" :case_id="props.case_id" :range_type="props.range_type"
        @action="(task_id) => go_ahead_action(task_id, 'Record')" @run="run_task" ref="TaskPageRef"></TaskPage>
    <RecordPage v-if="current_page === 'Record'" :case_id="props.case_id" :range_type="props.range_type"
        @action="(record_backup_index) => go_ahead_action(record_backup_index, 'CaseTable')" :task_id="task_id">
    </RecordPage>
    <ChildCaseTable v-if="current_page === 'CaseTable'"
        @action="(child_case: any, case_id: any) => go_ahead_action(child_case, 'Step', case_id)"
        :case_id="props.case_id" :range_type="props.range_type" :record_id="record_id"></ChildCaseTable>
    <StepPage v-if="current_page === 'Step'" :child_case_index="child_case_index" :record_id="record_id"
        :range_type="props.range_type" :case_id="current_case_id"></StepPage>

    <DialogAnimation v-if="range_type !== 'case'" ref="taskDetailRef" title="新建任务" cancel_title="取消" confirm_title="新建"
        :bgtype="'white'" :before_comfirm="check_task_detail" :topMove="'0% !important'">
        <TaskDetail ref="taskDetailCheckRef" :can_edit="range_type === 'project'" :is_edit="false"></TaskDetail>
    </DialogAnimation>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router'
import { motion } from 'motion-v'
import TaskPage from '@/views/case/record/task_page/index.vue'
import RecordPage from '@/views/case/record/record_page/index.vue'
import ChildCaseTable from '@/views/case/record/child_case_page/index.vue'
import StepPage from '@/views/case/record/step_page/index.vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import TaskDetail from '@/views/case/record/task_page/detail.vue'
import tools from '@/utils/tools'
import { ApiCreateTask, ApiRunTask, ApiGetTaskList } from '@/api/case/case/index'
import RunCaseSvg from '@/assets/logo/final/match_vue/play.vue'
import { HttpClass } from "@/utils/http";

const router_list = ref(['Task'])
const all_router_list = ['Task', 'Record', 'CaseTable', 'Step']
const route = useRoute()
const project_id = ref(-1)
const child_case_index = ref(null)
const current_case_id: any = ref(null)
const current_page = ref('Task')
const task_id: any = ref(null)
const record_id: any = ref(null)
const TaskPageRef: any = ref(null)
const taskDetailCheckRef: any = ref(null)
const taskDetailRef: any = ref(null)
let current_run_task_list: Array<number> = []


const props = defineProps({
    case_id: {
        type: Number,
        default: 1,
    },
    range_type: {
        type: String,
        default: 'case'
    }
});


async function openCaseRecord() {
    const first_task: any = await TaskPageRef.value.getFirstTask()
    go_ahead_action(first_task.id, "Record")
}

function run_task(task: any) {
    run_case_task(task)
}

let cancelTokenSource: any;
function getAbortController() {
    if (cancelTokenSource) {
        cancelTokenSource.cancel("取消重复请求");
    }
    return HttpClass.createCancelToken();
}

async function get_task(cancelTokenSource: any) {
    const _data = {
        case: props.case_id,
        range_type: props.range_type,
        project: Number(route.params.project),
        size: 1,
        page: 1
    }
    return await ApiGetTaskList({ params: _data, cancelToken: cancelTokenSource.token }).then((res: any) => {
        console.log(res.data);
        
        if (res.data.length > 0) {
            return res.data[0]
        } else {
            return null
        }
    })
}

async function run_case_task(task: any) {
    console.log(props.range_type);
    console.log(task);


    if (props.range_type === 'case' && !('id' in task)) {
        cancelTokenSource = getAbortController()
        task = await get_task(cancelTokenSource)
        console.log(task);

    }
    if (current_run_task_list.includes(task.id)) {
        window.$toast({ title: '任务正在运行中，请稍后再试' })
        return
    } else {
        current_run_task_list.push(task.id)
    }
    const data = {
        type: 1,
        child_action_type: "run_case_task",
        content: {
            case_id: props.case_id,
            task_id: task.id,
            task_type: props.range_type
        }
    }
    await ApiRunTask(data).then(async (res: any) => {
        const index = current_run_task_list.indexOf(task.id)
        if (index !== -1) current_run_task_list.splice(index, 1);
        if (res.hasOwnProperty("result")) {
            if (res.result === 50001) {
                window.$toast({ title: res.data, type: 'error' })
                return false;
            } else if (res.result === 0) {
                window.$toast({ title: res.data, type: 'error' })
            }
        } else {
            window.$toast({ title: '任务开始执行', type: 'success' })
            go_ahead_action(task.id, "Record")
        }
    })
}


defineExpose({ openCaseRecord })


function go_ahead_action(_tag: any, page: any, other_field = null) {
    current_page.value = page
    router_list.value = getSubArray(page)
    if (_tag !== null) {
        if (page === 'Record') {
            task_id.value = _tag
        } else if (page === 'CaseTable') {
            record_id.value = _tag
        } else if (page === 'Step') {
            child_case_index.value = _tag
            current_case_id.value = other_field
        }
    }
}

function uuid24(): string {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let uuid = '';
    for (let i = 0; i < 24; i++) {
        uuid += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return uuid;
}

async function crateTask() {

    const result = await taskDetailRef.value.open()
    if (result.action === 'cancel') return

    const data = taskDetailCheckRef.value.get_task_info()
    let create_data: any = {
        range_type: 'project',
        project: Number(route.params.project),
        name: data.name,
        env: data.env,
        loop_strategy: data.loop_strategy,
        error_strategy: data.error_strategy,
        case_list: data.case_list.map((item: any) => item.id)
    }

    if (data.open_schedule === true) {
        create_data.open_schedule = true
        create_data.schedule_name = uuid24()
        create_data.schedule_type = data.schedule_type
        create_data.expression = data.expression
    } else {
        create_data.open_schedule = false
    }

    const params = {
        type: 'create_task'
    }
    await tools.send(ApiCreateTask, create_data, params)
    TaskPageRef.value.refreshList()

}

async function check_task_detail() {
    return taskDetailCheckRef.value.check_task()
}

function getSubArray(target: string): string[] {
    const index = all_router_list.indexOf(target)
    if (index === -1) return [] // 没找到就返回空数组
    return all_router_list.slice(0, index + 1)
}

onMounted(async () => {
    project_id.value = Number(route.params.project)
    if (props.range_type === 'case') {
        // 跳转至record列表页面
    } else if (props.range_type === 'project') {
        // 跳转至task列表页面
    }
})

</script>

<style lang="scss" scope>
.record_nav {
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    padding: 10px;
    gap: 5px;
    border-bottom: 1px solid #f0f0f0;

    .task-action {
        display: flex;
        justify-content: start;
        align-items: center;

        .create-task {
            padding: 3px 5px;
            background-color: black;
            border: 1px solid #f0f0f0;
            border-radius: 8px;
            color: white;
            font-size: 0.9rem;
            font-weight: 500;
            cursor: pointer;
        }
    }

    .inner-item {
        display: flex;
        align-items: center;
        gap: 5px;
    }

    .item {
        padding: 3px 5px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0s ease;
        font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
    }

    .pointer {
        background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
        -webkit-background-clip: text;
        color: transparent;
    }

    span {
        color: #a8abb2;
        font-weight: 700;
    }
}

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
</style>