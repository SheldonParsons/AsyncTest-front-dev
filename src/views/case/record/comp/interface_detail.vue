<template>
    <div class="interface-detail-container">
        <div class="params-headers">
            <div class="default-insert">
                <span class="back-icon" @click="back"><el-icon color="#000000" :size="16">
                        <ArrowLeftBold />
                    </el-icon></span>
                <span style="margin-left: 10px; font-weight: 500;font-size: 0.9rem;">返回日志</span>
            </div>
        </div>
        <div style="padding-top: 5px;">
            <el-divider></el-divider>
            <TabSelect :selectedTab="current_page" @change="change_page" :tabs="tabs"></TabSelect>
        </div>
        <div class="content no-scroll" v-if="request && current_page === 0">
            <div
                style="display: flex;padding: 5px;border: 1px solid #f0f0f0;border-radius: 8px;justify-content: space-between;">
                <div style="font-size: 1rem;font-weight: 500;" :class="get_special_method_class(request.method)">{{
                    request.method.toUpperCase() }}</div>
                <div style="font-size: 1rem;font-weight: 500;">{{ tools.getFormattedTimeOriginMsHasYear(request.time) }}
                </div>
            </div>
            <div>
                <MarkDown :data="`\`\`\`json\n${request.url}\n\`\`\``"></MarkDown>
            </div>
            <div class="detail-title">URL参数:</div>
            <div>
                <MarkDown :data="`\`\`\`json\n${JSON.stringify(request.query_params, null, 2)}\n\`\`\``"></MarkDown>
            </div>
            <div class="detail-title">Headers:</div>
            <div>
                <MarkDown :data="`\`\`\`json\n${JSON.stringify(request.headers, null, 2)}\n\`\`\``"></MarkDown>
            </div>
            <div class="detail-title">Body:</div>
            <div>
                <MarkDown :data="get_request_body(request.body)"></MarkDown>
            </div>
        </div>
        <div class="content no-scroll" v-if="request && current_page === 1">
            <div
                style="display: flex;padding: 5px;border: 1px solid #f0f0f0;border-radius: 8px;justify-content: space-between;">
                <div style="display: flex; justify-content: start;align-items: center;">
                    <div style="font-size: 1rem;font-weight: 500;" :class="get_special_method_status(response.status)">
                        {{ response.status }}</div>

                </div>
                <div style="font-size: 1rem;font-weight: 500;">{{
                    tools.getFormattedTimeOriginMsHasYear(response.time) }}
                </div>
                <div style="font-size: 1rem;font-weight: 500;">{{ response.waste_time }} 秒</div>
            </div>
            <div>
                <MarkDown :data="`\`\`\`json\n${JSON.stringify(response.headers, null, 2)}\n\`\`\``"></MarkDown>
            </div>
            <div>
                <MarkDown :data="response.body"></MarkDown>
            </div>
        </div>
        <div class="content no-scroll" v-if="timing && current_page === 2">
            <div class="timing-item" v-for="(value, key) in timing" :key="key">{{ get_timing_string(key, value) }}</div>
        </div>
        <div class="content no-scroll" v-if="process && current_page === 3">
            <div class="timing-item" v-for="(item, index) in process.loggings" :key="index">{{ item }}</div>
        </div>
        <div class="content no-scroll" v-if="error && current_page === 4">
            <MarkDown :data="`\`\`\`json\n${error.info}\n\`\`\``"></MarkDown>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from 'vue'
import TabSelect from '@/assets/motion/tab_select.vue'
import { ArrowLeftBold } from "@element-plus/icons-vue";
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import tools from '@/utils/tools'

const props: any = defineProps({
    detail: {
        type: null
    }
})

const timing_mapping: any = {
    start_time_at: ['步骤开始时间', 0],
    request_start: ['请求开始时间', 0],
    total_time: ['总耗时', 1],
    receive_chunk_time_last: ['接收最后一个Chunk耗时', 1],
    receive_chunk_time_last_at: ['接收最后一个Chunk时间', 0],
    network_time: ['网络总耗时', 1],
    response_time_at: ['响应时间', 0],
    error_time: ['接收错误耗时', 2],
    error_time_at: ['接收错误时间', 0],
    redirect_time: ['重定向耗时', 2],
    redirect_time_at: ['重定向时间', 0],
    queue_start: ['进入连接队列耗时', 2],
    queue_start_at: ['进入连接队列时间', 0],
    queue_end: ['退出连接队列耗时', 2],
    queue_end_at: ['退出连接队列时间', 0],
    conn_create_start: ['开始创建连接[距离真正请求开始时间]耗时', 2],
    conn_create_start_at: ['开始创建连接时间', 0],
    conn_create_end: ['创建连接耗时', 1],
    conn_create_end_at: ['完成创建连接时间', 0],
    dns_start_at: ['开始DNS解析时间', 0],
    dns_start: ['开始DNS解析[距离真正请求开始时间]耗时', 2],
    dns_end: ['完成DNS解析耗时', 2],
    dns_end_at: ['完成DNS解析时间', 0]
}

function get_timing_string(key: any, value: any) {
    const _data = timing_mapping[key]
    if (key.includes('dns') && value === null) {
        return `${_data[0]}:已缓存，无耗时`
    }

    if (value === null) {
        return `${_data[0]}:该请求无此时间记录`
    }

    if (_data[1] === 0) {
        return `${_data[0]}:${tools.getFormattedTimeOriginMsHasYear(value)}`
    } else if (_data[1] === 1) {
        return `${_data[0]}:${value}秒`
    } else if (_data[1] === 2) {
        const seconds = (value / 1000).toFixed(3)
        return `${_data[0]}:${seconds}秒`
    }
}


onMounted(() => {
    if (props.detail.result !== 'success') {
        tabs.value = ['请求报文', '响应报文', '耗时详情', 'Process', '异常信息']
        error.value = JSON.parse(props.detail.error)
    }
    if (props.detail.response === '{}') {
        has_response.value = false
    } else {
        response.value = JSON.parse(props.detail.response)
    }
    request.value = JSON.parse(props.detail.request)
    timing.value = JSON.parse(props.detail.timing)
    process.value = JSON.parse(props.detail.process)
})

const emit = defineEmits(["back", "close"]);

function back() {
    emit("back");
}

function get_request_body(body:any) {
    if (body === null) {
        return `\`\`\`json\n\n\`\`\``;
    } else {
        try {
            JSON.stringify(body)
            return body
        } catch (error) {
            return `\`\`\`json\n${body}\n\`\`\``;
        }
    }
}
function get_special_method_class(method: String) {
    if (method === 'get') {
        return 'special-success'
    }
    return 'special-warning'
}

function get_special_method_status(status: number) {
    if (status > 199 && status < 300) {
        return 'special-success'
    }
    return 'special-warning'
}

async function change_page(index: number) {
    if (!has_response.value && index === 1) {
        window.$toast({ title: "没有接收到响应内容，无法查看" })
    } else {
        current_page.value = index
    }
}

const current_page = ref(0)
const has_response = ref(true)
const request: any = ref(null)
const response: any = ref(null)
const timing: any = ref(null)
const process: any = ref([])
const error: any = ref(null)

const tabs = ref(['请求报文', '响应报文', '耗时详情', 'Process'])

</script>

<style lang="scss" scoped>
.timing-item {
    padding: 5px;
    border: 2px solid #f0f0f0;
    border-radius: 5px;
    font-size: 1rem;
    font-weight: 500;
}

.interface-detail-container {
    padding: 8px;
    border: 2px solid #f0f0f0;
    border-radius: 8px;
    height: calc(100% - 0px);
    position: relative;
    display: flex;
    flex-direction: column;
    box-sizing: border-box;

    .content {
        overflow-y: scroll;
        display: flex;
        flex-direction: column;
        gap: 5px;
    }
}

.detail-title {
    border-radius: 5px;
    background-color: #f0f0f0;
    padding: 5px;
    font-weight: 500;
}

.special-success {
    -webkit-background-clip: text !important;
    /* 文字本身透明，这样才能显示背景 */
    -webkit-text-fill-color: transparent;
    /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
    background-clip: text;
    /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
    color: transparent;
    font-weight: 800;
    background: linear-gradient(80deg, rgb(62, 208, 54) 0%, #4fa380 50%);
}

.special-warning {
    -webkit-background-clip: text !important;
    /* 文字本身透明，这样才能显示背景 */
    -webkit-text-fill-color: transparent;
    /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
    background-clip: text;
    /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
    color: transparent;
    font-weight: 800;
    background: linear-gradient(80deg, #c5a44a 0%, #f8b98c 40%, #f07b3f 90%);
}

.params-headers {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .close-icon {
        width: 100%;
        display: flex;
        justify-content: end;
        align-items: center;
        padding-right: 10px;

        i {
            cursor: pointer;
        }
    }

    .default-insert {
        width: 100%;
        display: flex;
        justify-content: start;
        align-items: center;
        padding-left: 10px;
    }

    .back-icon {
        background: #fff;
        border: 0.5px solid #1018280a;
        border-radius: 999px;
        padding: 4px;
        box-shadow: 0 2px 4px #0000000d, 0 4px 8px -2px #00000005;
        height: 16px;
        display: flex;
        cursor: pointer;
    }

    .back-icon:hover {
        box-shadow: 0 0 2px #0000000a, 0 4px 8px #00000014;
    }
}
</style>