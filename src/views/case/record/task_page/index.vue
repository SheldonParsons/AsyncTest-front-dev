<template>
    <SplitterGroup direction="vertical">
        <SplitterPanel :default-size="80" :min-size="80" :max-size="80">
            <div class="data-set-container">
                <BlankAmination v-if="data.length === 0"></BlankAmination>
                <motion.div v-if="data.length !== 0" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                    :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }" class="header">
                    <div class="inner">
                        <div class="title title-name">任务名称</div>
                        <div class="title title-id">运行次数</div>
                        <div class="title title-update">最近运行时间</div>
                        <div class="title title-update-person">运行人</div>
                        <div class="title title-status">任务状态</div>
                        <div class="title title-action">操作</div>
                    </div>
                </motion.div>
                <div class="data no-scroll">
                    <motion.div @click.stop="action('to_record', item, 0)" :initial="{ opacity: 0 }"
                        :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }"
                        class="data-item" v-for="(item, index) in data" :key="index">
                        <div class="title title-name g-e"><span>{{
                            item.name }}</span></div>
                        <div class="title title-name g-e"><span>{{
                            item.run_times }}</span></div>
                        <div class="title title-update" @click.stop style="cursor: text;"><span @click.stop>{{
                            timeAgo(item.last_started_at)
                                }}</span>
                        </div>
                        <div class="title title-update-person" @click.stop style="cursor: text;">{{ item.updated_user }}
                        </div>
                        <div class="title title-update-person" @click.stop style="cursor: text;" :class="item.status">{{
                            item.status.toUpperCase() }}
                        </div>
                        <div class="title title-action" @click.stop>
                            <div>
                                <ActionGroup :group="['delete', 'batchEdit']" :actionDesc="actionDesc"
                                    @action="(action_type) => action(action_type, item, index)">
                                </ActionGroup>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </SplitterPanel>
        <SplitterPanel :default-size="20" :min-size="20" :max-size="20">
            <div class="task-pagination">
                <Pagination :total="total_count" :size="page_size"></Pagination>
            </div>
        </SplitterPanel>
    </SplitterGroup>
    <DialogAnimation ref="deleteDatasetConfirmRef" title="删除任务" cancel_title="取消" confirm_title="确认"
        :before_comfirm="check_delete_dataset_confirm_text">
        <div style="display: flex;flex-direction: column;gap: 10px;">
            <div style="color: #ec6d51;font-size: 0.9rem;padding-left: 5px;">
                该任务以及旗下的所有记录都将被删除，您确认删除吗？请键入<span>“确认删除”</span>在下方输入框。
            </div>
            <div>
                <input v-model="deleteConfirmText" placeholder="确认删除">
            </div>
        </div>
    </DialogAnimation>
    <DialogAnimation ref="taskDetailRef" title="编辑任务详情" cancel_title="取消" confirm_title="确认" :bgtype="'white'"
        :before_comfirm="check_task_detail" :topMove="'0% !important'">
        <TaskDetail ref="taskDetailCheckRef" :can_edit="range_type === 'project'" :task_info="task_info"></TaskDetail>
    </DialogAnimation>
</template>

<script lang="ts" setup>
import { onUnmounted, onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import Pagination from '@/components/common/general/pagination.vue'
import BlankAmination from '@/components/common/blank/blank_animation.vue'
import { SplitterGroup, SplitterPanel } from 'reka-ui'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import { ApiGetTaskList, ApiDeleteTask, ApiEditTask } from '@/api/case/case/index'
import { PollingUtil } from '@/views/case/record/utils/PollingUtil'
import { send_action } from '@/views/case/record/utils/Sender'
import tools from '@/utils/tools'
import DialogAnimation from '@/components/common/general/dialog.vue'
import TaskDetail from '@/views/case/record/task_page/detail.vue'

const data: any = ref([])

const page_size = ref(10)
const page_number = ref(1)
const total_count = ref(0)

const deleteConfirmText = ref("")
const taskDetailRef: any = ref(null)
const taskDetailCheckRef: any = ref(null)
const deleteDatasetConfirmRef: any = ref(null)

const task_info: any = ref(null)

const poller: any = ref(null)

const emit = defineEmits(['action'])

const actionDesc: any = {
    copy: '复制',
    delete: '删除',
    batchEdit: '编辑任务'
}

const props = defineProps({
    case_id: {
        default: null,
        type: Number
    },
    range_type: {
        default: 'case',
        type: String
    }
})
async function deleteTask(id: any) {
    return await ApiDeleteTask(id, {}).then((res: any) => {
        return res
    })
}

async function action(t: string, item: any, index: number) {
    if (t === 'to_record') {
        emit('action', item.id)
    } else if (t === 'delete') {
        const result = await deleteDatasetConfirmRef.value.open()
        if (result.action === 'comfirm' && result.hook_result === true) {
            const result = await send_action(deleteTask, item.id)
            if (result !== false) {
                data.value = data.value.filter((_item: any) => _item.id != item.id)
                window.$toast({ title: '删除数据集成功' })
            }
        }
        deleteConfirmText.value = ""
    } else if (t === 'batchEdit') {
        task_info.value = item
        console.log(task_info.value);

        const result = await taskDetailRef.value.open()
        if (result.action === 'cancel') return

        const data = taskDetailCheckRef.value.get_task_info()
        console.log(data);
        const update_date = {
            env: data.env,
            loop_strategy: data.loop_strategy,
            error_strategy: data.error_strategy,
            case_list: data.case_list.map((item: any) => item.id)
        }
        console.log(update_date);

        await tools.send(ApiEditTask, data.id, update_date)
    }
}

async function check_delete_dataset_confirm_text() {
    if (deleteConfirmText.value !== '确认删除') {
        window.$toast({ title: '请正确输入确认文案。', type: 'error' })
        return false
    }
    return true
}

async function check_task_detail() {
    return taskDetailCheckRef.value.check_task()
}

function timeAgo(timestamp: number) {
    const now = Date.now()
    const diff = Math.floor((now - timestamp) / 1000) // 秒差
    if (diff < 10) return "刚刚"
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}月前`
    return `${Math.floor(diff / 31536000)}年前`
}

onMounted(async () => {
    await get_task()
})

async function refresh_data() {
    const _data = {
        case: props.case_id,
        range_type: props.range_type,
        size: page_size.value,
        page: page_number.value
    }
    await ApiGetTaskList(_data).then((res: any) => {
        if (res.data.length === 0) {
            poller.value.stop()
            return
        }
        // 1. 初始化状态标志
        // B条件标志：是否存在 pending -> running 的任务
        let hasPendingToRunning = false;
        // A条件标志：是否存在 running -> pending 的任务
        let hasRunningToPending = false;
        // A条件标志：是否所有新任务的状态都是 pending
        let areAllNewTasksPending = res.data.length > 0;

        for (let i = 0; i < res.data.length; i++) {
            const oldStatus = data.value[i].status;
            const newStatus = res.data[i].status;

            // 检查 B 条件
            if (oldStatus === 'pending' && newStatus === 'running') {
                hasPendingToRunning = true;
            }

            // 检查 A 条件的第一个子条件
            if (oldStatus === 'running' && newStatus === 'pending') {
                hasRunningToPending = true;
            }

            // 检查 A 条件的第二个子条件
            if (newStatus !== 'pending') {
                areAllNewTasksPending = false;
            }

            // 在比较之后更新视图数据
            if (data.value[i].status !== newStatus || data.value[i].run_times !== res.data[i].run_times) {
                data.value[i].status = newStatus;
                data.value[i].run_times = res.data[i].run_times;
                data.value[i].last_started_at = res.data[i].last_started_at;
                data.value[i].updated_user = res.data[i].updated_user;
            }
        }
        if (hasPendingToRunning) {
            console.log("检测到任务从 pending -> running，切换到快速轮询模式。");
            // B代码：
            if (poller.value) {
                // 这里我假设您想重置轮询，如果不是，可以去掉 stop 和 start
                poller.value.clear();
                poller.value.setInterval(1000);
                poller.value.setMaxRetries(300);
            }
        }
        // 如果B条件不满足，再判断A条件
        else if (areAllNewTasksPending && hasRunningToPending) {
            console.log("检测到所有任务已完成并转为 pending，切换到慢速轮询模式。");
            // A代码：
            if (poller.value) {
                poller.value.clear();
                poller.value.setInterval(5000);
                poller.value.setMaxRetries(360);
            }
        }
    })
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

onUnmounted(() => {
    if (poller.value) {
        poller.value.stop()
    }
})

async function getFirstTask() {
    for (let i = 0; i < 200; i++) {
        if (data.value.length === 0) {
            await tools.delaySec(200)
        } else {
            break
        }
    }
    if (data.value.length === 0) return false
    return data.value[0]
}

defineExpose({ getFirstTask })


async function get_task() {
    const _data = {
        case: props.case_id,
        range_type: props.range_type,
        size: page_size.value,
        page: page_number.value
    }
    ApiGetTaskList(_data).then((res: any) => {
        data.value = res.data
        total_count.value = res.total
        if (data.value.length > 0) {
            if (!poller.value) {
                createPolling(refresh_data)
            }
            let has_running_task = false
            for (let i = 0; i < res.data.length; i++) {
                if (res.data[i].status === 'running') {
                    has_running_task = true
                    break
                }
            }
            if (has_running_task) {
                poller.value.setInterval(1000)
                poller.value.setMaxRetries(300)
            } else {
                poller.value.setInterval(5000)
            }
            startPolling(refresh_data)
        } else {
            if (!poller.value) {
                poller.value.stop()
            }
        }
    })
}
</script>

<style lang="scss" scoped>
.task-pagination {
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: auto;
}

.data-set-container {
    height: 100%;
    width: 100%;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;
    gap: 10px;

    .data {
        height: 100%;
        width: 100%;
        display: flex;
        justify-content: start;
        align-items: center;
        flex-direction: column;
        box-sizing: border-box;
        overflow: auto;
        gap: 10px;
        padding: 5px 20px 20px 20px;

        .data-item {
            height: 50px;
            width: 100%;
            background-color: rgba($color: #ffffff, $alpha: 0.7);
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            border: 2px solid #f0f0f0;
            border-radius: 8px;
            padding: 2px;
            box-sizing: border-box;
            transition: box-shadow 0.3s ease, transform 0.3s ease;
            flex-shrink: 0;
            display: flex;
            align-items: center;
            justify-content: center;
            cursor: pointer;

            .title {
                font-size: 14px;
                font-weight: 500;
                display: flex;
                justify-content: start;
                align-items: center;
                padding-left: 10px;
                padding-right: 5px;
                box-sizing: border-box;
                color: #3c3c3c;
            }

            .pending {
                background-image: linear-gradient(to right, rgb(169, 172, 255), rgb(0, 30, 255), rgb(17, 0, 255));
                font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
                -webkit-background-clip: text;
                color: transparent;
            }

            .running {
                background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
                font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
                -webkit-background-clip: text;
                color: transparent;
                animation: blink 3s infinite;
            }

            @keyframes blink {
                0% {
                    opacity: 1;
                    /* 不透明 */
                }

                50% {
                    opacity: 0;
                    /* 透明 */
                }

                100% {
                    opacity: 1;
                    /* 不透明 */
                }
            }

            .title-id {
                span {
                    cursor: pointer;
                    color: #6e6e6e;
                    border-bottom: 1px dotted #f0f0f0;
                }

                span:hover {
                    color: rgb(47, 47, 47);
                    border-bottom: 1px dotted rgb(47, 47, 47);
                }
            }

            .title-name,
            .title-id,
            .title-update,
            .title-update-person {
                flex: 22;
            }

            .title-action {
                flex: 12;
            }
        }



        .data-item:hover {
            /* 漂浮时放大阴影并略微上移 */
            box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }
    }

    .header {
        width: 100%;
        padding: 20px 20px 0 20px;
        box-sizing: border-box;

        .inner {
            width: 100%;
            height: 100%;
            display: flex;
            height: 40px;
            border: 2px solid #f0f0f0;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
        }

        .title {
            font-size: 14px;
            font-weight: 500;
            display: flex;
            justify-content: start;
            align-items: center;
            padding-left: 10px;
            padding-right: 5px;
            box-sizing: border-box;
        }

        .title-name,
        .title-id,
        .title-update,
        .title-update-person,
        .title-status {
            flex: 22;
        }

        .title-action {
            flex: 12;
        }
    }

}
</style>