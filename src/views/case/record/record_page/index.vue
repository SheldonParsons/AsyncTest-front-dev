<template>
    <SplitterGroup direction="vertical">
        <SplitterPanel :default-size="80" :min-size="80" :max-size="80">
            <div class="data-set-container">
                <BlankAmination v-if="data.length === 0"></BlankAmination>
                <motion.div v-if="data.length !== 0" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                    :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }" class="header">
                    <div class="inner">
                        <div class="title title-name">执行来源</div>
                        <div class="title title-time">开始时间</div>
                        <div class="title title-time">结束时间</div>
                        <div class="title title-name">耗时</div>
                        <div class="title title-count">用例数</div>
                        <div class="title title-count">子用例数</div>
                        <div class="title title-status">状态</div>
                        <div class="title title-user">运行人</div>
                        <div class="title title-action">操作</div>
                    </div>
                </motion.div>
                <div class="data no-scroll">
                    <motion.div @click.stop="action('to_record', item, 0)" :initial="{ opacity: 0 }"
                        :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }"
                        class="data-item" v-for="(item, index) in data" :key="index">
                        <div class="title title-name g-e"
                            style="font-family: 'Monoton-Regular';font-size: 1rem;color: #282b5d;"><span>{{
                                item.run_source }}</span></div>
                        <div class="title title-time g-e"><span>{{
                            tools.getFormattedTimeOriginMs(item.start_at) }}</span></div>
                        <div class="title title-time g-e" :class="{ 'running': item.end_at === 0 }"><span>{{
                            item.end_at === 0 ? '未结束' : tools.getFormattedTimeOriginMs(item.end_at) }}</span></div>
                        <div class="title title-name g-e"><span>
                                <AnimationNumber :start_at="item.start_at" :end_at="item.end_at"
                                    :server_current_time="item.current_time"></AnimationNumber>
                            </span>
                        </div>
                        <div class="title title-count g-e"><span>{{
                            item.case_count }}</span></div>
                        <div class="title title-count g-e"><span>{{
                            item.child_case_count }}</span></div>
                        <div class="title title-status g-e" :class="item.status"><span>{{
                            item.status.toUpperCase() }}</span></div>
                        <div class="title title-user g-e"><span>{{
                            item.exec_user }}</span></div>
                        <div class="title title-action" @click.stop>
                            <div @click="open_summary_record(item)" class="run-btn">Record</div>
                            <div @click="stopTask(item)" class="stop-btn">停止任务</div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </SplitterPanel>
        <SplitterPanel :default-size="10" :min-size="10" :max-size="10">
            <!-- <div class="task-pagination">
                <Pagination :total="total_count" :size="page_size"></Pagination>
            </div> -->
        </SplitterPanel>
    </SplitterGroup>
    <DialogAnimation ref="taskDetailRef" title="任务整体日志" confirm_title="关闭" :bgtype="'white'" :topMove="'0% !important'"
        :showCancel="false">
        <div style="height: 500px;width: 900px;">
            <ProcessRecord :callback="summary_process_record" :interface_callback="interface_detail_record"
                :wating="true">
            </ProcessRecord>
        </div>
    </DialogAnimation>
</template>

<script lang="ts" setup>
import { onUnmounted, onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import BlankAmination from '@/components/common/blank/blank_animation.vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import { SplitterGroup, SplitterPanel } from 'reka-ui'
import { ApiGetRecordList } from '@/api/case/case/index'
import { PollingUtil } from '@/views/case/record/utils/PollingUtil'
import ProcessRecord from '@/views/case/record/comp/process_record.vue'
import tools from '@/utils/tools'
import AnimationNumber from '@/views/case/record/record_page/animation_number.vue'
import { ApiPostAsyncExecutorClient } from '@/api/project/index'

const data: any = ref([])

const page_size = ref(10)
const page_number = ref(1)
const total_count = ref(0)

const taskDetailRef: any = ref(null)
const current_record_backup_index = ref()

const poller: any = ref(null)

const emit = defineEmits(['action'])

const props = defineProps({
    case_id: {
        default: null,
        type: Number
    },
    range_type: {
        default: 'case',
        type: String
    },
    task_id: {
        default: -1,
        type: Number
    }
})

async function summary_process_record(current_index: Number) {
    const _data = {
        type: "summary_list",
        record_backup_index: current_record_backup_index.value,
        index: current_index
    }
    return await tools.send(ApiGetRecordList, _data)
}

async function interface_detail_record(type: String, index: String) {
    console.log(current_record_backup_index.value);

    const _data = {
        type: type,
        record_backup_index: current_record_backup_index.value,
        index: index
    }
    return await tools.send(ApiGetRecordList, _data)
}

async function open_summary_record(item: any) {
    console.log(item);
    current_record_backup_index.value = `${item.record_backup_index}&&${item.executor}`
    await taskDetailRef.value.open()
}

async function action(t: string, item: any, index: number) {
    if (t === 'to_record') {
        emit('action', `${item.record_backup_index}&&${item.executor}`)
    }
}

onMounted(async () => {
    await get_record()
})

async function refresh_data() {
    const _data = {
        type: 'record',
        task: props.task_id,
        size: page_size.value,
        page: page_number.value
    }
    const res = await tools.send(ApiGetRecordList, _data)
    if (res.data.length === 0) {
        poller.value.stop()
        return
    }
    // 1. 初始化状态标志
    // B条件标志：是否存在 completed -> running 的任务
    let hasPendingToRunning = false;
    // A条件标志：是否存在 running -> completed 的任务
    let hasRunningToPending = false;
    // A条件标志：是否所有新任务的状态都是 completed
    let areAllNewTasksPending = res.data.length > 0;
    for (let i = 0; i < res.data.length; i++) {
        const oldStatus = data.value[i].status;
        const newStatus = res.data[i].status;

        // 检查 B 条件
        if (oldStatus === 'completed' && newStatus === 'running') {
            hasPendingToRunning = true;
        }

        // 检查 A 条件的第一个子条件
        if (oldStatus === 'running' && newStatus === 'completed') {
            hasRunningToPending = true;
        }

        // 检查 A 条件的第二个子条件
        if (newStatus !== 'completed') {
            areAllNewTasksPending = false;
        }
    }
    data.value = res.data
    if (hasPendingToRunning) {
        console.log("检测到任务从 completed -> running，切换到快速轮询模式。");
        // B代码：
        if (poller.value) {
            // 这里我假设您想重置轮询，如果不是，可以去掉 stop 和 start
            poller.value.clear();
            poller.value.setInterval(500);
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


async function stopTask(item: any) {
    console.log(item);

    const params = {
        type: 'stop_task'
    }
    const _data = {
        executor_id: item.executor,
        record_id: item.id
    }
    await stop_all_task(_data, params)
}


async function stop_all_task(data: any, params: any) {
    const stop_result = await tools.send(ApiPostAsyncExecutorClient, data, params)
    if (stop_result) {
        if (stop_result.result === true) {
            window.$toast({ title: stop_result.message, type: 'info' })
        } else {
            window.$toast({ title: stop_result.message, type: 'error' })
        }
    }
}


async function get_record() {
    const _data = {
        type: 'record',
        task: props.task_id,
        size: page_size.value,
        page: page_number.value
    }
    const res = await tools.send(ApiGetRecordList, _data)
    data.value = res.data
    total_count.value = res.total
    console.log(data.value);
    
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
            poller.value.setInterval(500)
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
}
</script>

<style lang="scss" scoped>
.run-btn {
    width: 80px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
    /* 核心修改 */
    border: none;
    /* 移除边框，让渐变和阴影成为主体 */
    background: linear-gradient(to right, #6c757d, #495057, #343a40);
    /* 柔和的蓝-青渐变 */
    background-size: 200% 200%;
    animation: gradient-move 4s ease-in-out infinite;
    /* 动画更平滑，时间更长 */
    padding: 4px;
    border-radius: 6px;
    /* 更圆润的边角 */
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.3s ease;
    /* 为悬停效果添加过渡 */
    box-shadow: 0 4px 15px 0 rgba(0, 118, 255, 0.3);
    /* 添加与渐变色匹配的发光效果 */
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}

/* 增强交互反馈 */
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

.stop-btn {
    width: 80px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    color: white;
    font-size: 0.9rem;
    font-weight: 500;
    border: none;
    background: linear-gradient(to right, #dc3545, #c82333, #bd2130);
    /* 红色渐变表示停止操作 */
    background-size: 200% 200%;
    animation: gradient-move 4s ease-in-out infinite;
    padding: 4px;
    border-radius: 6px;
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.3s ease;
    box-shadow: 0 4px 15px 0 rgba(220, 53, 69, 0.3);
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}

.stop-btn:hover {
    box-shadow: 0 6px 20px 0 rgba(220, 53, 69, 0.4);
    transform: translateY(-2px);
}

.stop-btn:active {
    transform: translateY(0);
    box-shadow: 0 2px 10px 0 rgba(220, 53, 69, 0.2);
}

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

.task-pagination {
    width: 100%;
    box-sizing: border-box;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: auto;
}

.record-action {
    padding: 3px 5px;
    font-weight: 800;
    cursor: pointer;
    transition: transform 0s ease;
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
    background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
    -webkit-background-clip: text;
    color: transparent;
    border: 2px solid rgb(255, 119, 0);
    border-radius: 5px;
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
                justify-content: center;
                align-items: center;
                padding-left: 10px;
                padding-right: 5px;
                box-sizing: border-box;
                color: #3c3c3c;
            }

            .completed {
                background-image: linear-gradient(to right, rgb(169, 172, 255), rgb(0, 30, 255), rgb(17, 0, 255));
                font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
                -webkit-background-clip: text;
                color: transparent;
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

            .title-name {
                flex: 18
            }

            .title-time {
                font-size: 0.9rem;
                font-weight: 800;
                flex: 25
            }

            .title-count {
                flex: 10
            }

            .title-status,
            .title-user {
                flex: 20
            }

            .title-action {
                flex: 30;
                display: flex;
                gap: 10px;
                justify-content: center;
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
            justify-content: center;
            align-items: center;
            padding-left: 10px;
            padding-right: 5px;
            box-sizing: border-box;
        }

        .title-name {
            flex: 18
        }

        .title-time {
            flex: 25
        }

        .title-count {
            flex: 10
        }

        .title-status,
        .title-user {
            flex: 20
        }

        .title-action {
            flex: 30
        }
    }

}
</style>