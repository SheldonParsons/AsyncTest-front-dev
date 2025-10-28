<template>
    <div style="height: 100%;width: 100%;padding: 10px;box-sizing: border-box;">
        <div v-if="show_type === 2" style="height: 100%;">
            <InterfaceDetail :detail="interface_detail" @back="show_type = 1"></InterfaceDetail>
        </div>
        <div v-if="show_type === 3" style="height: 100%;">
            <SetVariableDetail :data="current_set_variable_detail" @back="show_type = 1"></SetVariableDetail>
        </div>
        <div v-if="show_type === 4" style="height: 100%;">
            <GetVariableDetail :data="current_get_variable_detail" @back="show_type = 1"></GetVariableDetail>
        </div>
        <div v-if="show_type === 5" style="height: 100%;">
            <GetParamDetail :data="current_get_variable_detail" @back="show_type = 1"></GetParamDetail>
        </div>

        <div v-show="show_type === 1" style="display: flex;padding-bottom: 10px;justify-content: space-between;">
            <div>
                <InputAnimation @change="debouncedSearch" v-model="search_test" placeholder="搜索(步骤标签、内容)"
                    :maxLength="50">
                </InputAnimation>
            </div>
            <div style="display: flex;align-items: center;justify-content: end;gap: 5px;">
                <MotionButton @click="reset_filter" style="width: 80px;height: 30px;">
                    <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
                        <div style="font-size: 14px;">重置筛选</div>
                    </div>
                </MotionButton>
                <MotionButton @click="emit('showStepDetail')" style="width: 80px;height: 30px;" v-if="is_step_detail">
                    <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
                        <div style="font-size: 14px;">步骤详情</div>
                    </div>
                </MotionButton>
            </div>
        </div>
        <div v-if="show_type === 1 && loading === false" ref="caseInfoRef" class="process-record-contrainer"
            :style="{ height: `calc(100% - ${padding_height}px)` }">
            <div class="item-container" v-for="(item, index) in show_data" :key="index">
                <div class="item">
                    <div class="time">{{ tools.getFormattedTimeNoYMD(item.time) }}</div>
                    <div class="info-type" @click="search_test = info_type_mapping[item.type]" :class="item.type">{{
                        info_type_mapping[item.type] }}</div>
                    <div class="desc">{{ get_desc(item) }}
                    </div>

                    <div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }"
                        v-if="item.type === 'interface_success_finished' || item.type === 'interface_error_finished'"
                        class="info-type" @click="check_interface_detail(item)">接口详情</div>
                    <div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }"
                        v-if="item.type === 'action_extract'" class="info-type" @click="show_get_variable_detail(item)">
                        提取详情
                    </div>
                    <div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }" v-if="item.type === 'variable_get'"
                        class="info-type" @click="show_get_param_detail(item)">
                        变量内容
                    </div>
                    <div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }" v-if="item.type === 'variable_set'"
                        class="info-type" @click="show_set_variable_detail(item)">
                        设置详情
                    </div>
                    <TooltipAnimation :isOpen="current_position_index === index" v-if="item.position_list !== null">
                        <template #trigger><span
                                style="color: rgba(0,0,0);width: 1rem;height: 25px;display: flex;align-items: center;cursor: pointer;"
                                @click="current_position_index = index">
                                <InfoSvg />
                            </span></template>
                        <template #default>
                            <div style="display: flex;flex-direction: column;gap: 5px;max-width: 800px;">
                                <div>位置路径</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">您可以通过点击来筛选指定位置下的一批日志。
                                </div>
                                <div class="position-container">
                                    <div style="display: flex;justify-content: center;align-items: center;gap: 3px;"
                                        v-for="(position, position_index) in item.position_list">
                                        <motion.div @click="filter_position_record(item, position_index)"
                                            :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }"
                                            class="position-item">{{ get_position_label(position) }}</motion.div>
                                    </div>
                                </div>
                                <div style="display: flex;justify-content: end;">
                                    <motion.div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }"
                                        @click="current_position_index = -1"
                                        style="background-color: white;color: black;padding: 5px;border-radius: 5px;cursor: pointer;">
                                        关闭</motion.div>
                                </div>
                            </div>
                        </template>
                    </TooltipAnimation>
                </div>
            </div>
        </div>
        <div v-if="show_type === 1 && loading === true">
            <el-skeleton animated>
                <template #template>
                    <el-skeleton-item v-for="_ in 10" variant="h1"
                        style="width: 100%;height: 30px; margin-bottom: 10px;" />
                </template>
            </el-skeleton>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref, nextTick, onUnmounted } from 'vue';
import { motion } from 'motion-v'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import InputAnimation from '@/components/common/general/input.vue'
import InterfaceDetail from '@/views/case/record/comp/interface_detail.vue'
import SetVariableDetail from '@/views/case/record/comp/set_variable_detail.vue'
import GetVariableDetail from '@/views/case/record/comp/get_variable_detail.vue'
import GetParamDetail from '@/views/case/record/comp/get_param_detail.vue'
import InfoSvg from '@/assets/svg/common/new_icon/info.vue'
import tools from '@/utils/tools'
import _ from 'lodash'
import MotionButton from '@/assets/motion/button.vue'

const emit = defineEmits(['showStepDetail'])

const props = defineProps({
    callback: {
        type: null
    },
    interface_callback: {
        type: null
    },
    stop_key: {
        type: String,
        default: 'desc'
    },
    stop_value: {
        type: String,
        default: '任务结束'
    },
    stop_type: {
        type: String,
        default: 'include'
    },
    check_ending: {
        type: null,
        default: null
    },
    force_check_ending: {
        type: null,
        default: null
    },
    padding_height: {
        type: Number,
        default: 40
    },
    wating: {
        type: Boolean,
        default: false
    },
    is_step_detail: {
        type: Boolean,
        default: false
    }
})

const data: any = ref([])

const show_data: any = ref([])

const current_index = ref(0)

const caseInfoRef: any = ref(null)

const current_position_index = ref(-1)

const search_test = ref("")

const show_type = ref(1)

const interface_detail = ref()

const debouncedSearch = _.debounce(search_record, 300);

const running_get_circle_data = ref(0)

const current_set_variable_detail = ref({})

const current_get_variable_detail = ref({})

const loading = ref(true)

const variable_range_mapping: any = {
    'global': '全局变量',
    'env': '环境变量',
    'temp': '临时变量'
}

function search_record(text: string) {
    current_position_index.value = -1
    show_data.value = []
    for (let i = 0; i < data.value.length; i++) {
        if (info_type_mapping[data.value[i].type].includes(text)) {
            show_data.value.push(data.value[i])
        } else if (data.value[i].type === 'action_extract') {
            const variable_info = JSON.parse(data.value[i].desc.extract_info)
            if (variable_info.name.includes(text)) {
                show_data.value.push(data.value[i])
            }
        } else if (data.value[i].type === 'variable_get') {
            if (JSON.parse(data.value[i].desc).includes(text)) {
                show_data.value.push(data.value[i])
            }
        } else if (data.value[i].type === 'variable_set') {
            const set_variable_info = JSON.parse(data.value[i].desc)
            const search_desc = `设置${variable_range_mapping[set_variable_info.type]}：${set_variable_info.key}`
            if (search_desc.includes(text)) {
                show_data.value.push(data.value[i])
            }
        } else if (data.value[i].desc.includes(text)) {
            show_data.value.push(data.value[i])
        }
    }
}

function show_set_variable_detail(record_line: any) {
    show_type.value = 3
    current_set_variable_detail.value = JSON.parse(record_line.desc)
}

function show_get_param_detail(record_line: any) {
    show_type.value = 5
    current_get_variable_detail.value = record_line.desc
}

function show_get_variable_detail(record_line: any) {
    show_type.value = 4
    current_get_variable_detail.value = record_line.desc
}

const info_type_mapping: any = {
    system: "系统日志",
    interface_success_finished: "接口日志",
    interface_error_finished: "接口异常",
    assertion_exception: '断言异常',
    step_running: "步骤日志",
    step_skipped: "步骤跳过",
    system_exception: "系统异常",
    variable_warning: "参数异常",
    assertion_failed: "断言失败",
    assertion_success: '断言成功',
    action_script: '执行脚本',
    variable_get: '获取变量',
    action_script_print: '打印内容',
    variable_set: '设置变量',
    action_extract: '提取变量',
    case_drive: '嵌套用例',
    multitasker_drive: '多执行器',
    if_success: '条件分支',
    action_sleep: '强制等待',
    action_warning: '步骤警告',
    error_failed: '抛出错误',
    delay_success: '休眠步骤',
    delay_warning: '休眠警告'
}

function get_desc(item: any) {
    if (item.type === 'assertion_success') {
        return JSON.parse(item.desc).desc
    } else if (item.type === 'action_extract') {
        return JSON.parse(item.desc.extract_info).name
    } else if (item.type === 'variable_get') {
        return JSON.parse(item.desc).key
    } else if (item.type === 'variable_set') {
        try {
            const result = JSON.parse(item.desc)
            return `设置${variable_range_mapping[result.type]}：${result.key}`
        } catch (error) {
            return item.desc
        }
    } else {
        return item.desc
    }
}

function filter_position_record(item: any, position_index: number) {
    search_test.value = ""
    current_position_index.value = -1
    const target_position_list = item.position_list.slice(0, position_index + 1)
    show_data.value = []
    for (let i = 0; i < data.value.length; i++) {
        if (data.value[i].position_list) {
            if (isArrayPrefix(target_position_list, data.value[i].position_list)) {
                show_data.value.push(data.value[i])
            }
        }
    }
}

function isArrayPrefix(prefixArr: any, targetArr: any) {
    // 1. 初始检查：如果前缀数组比目标数组还长，那肯定不是前缀。
    if (prefixArr.length > targetArr.length) {
        return false;
    }

    // 2. 遍历前缀数组中的每一个对象
    for (let i = 0; i < prefixArr.length; i++) {
        const prefixObj = prefixArr[i];
        const targetObj = targetArr[i];

        // 3. 逐个对比对象的三个属性
        // 注意：不能直接用 prefixObj === targetObj，因为它们是不同的对象引用。
        if (
            prefixObj.type !== targetObj.type ||
            prefixObj.index !== targetObj.index ||
            prefixObj.label !== targetObj.label
        ) {
            // 只要有一个属性不匹配，就可以立即判断结果为 false，并终止函数
            return false;
        }
    }
    return true;
}

onMounted(async () => {
    if (props.wating) {
        await tools.delaySec(1000)
    }
    const _data = await props.callback(current_index.value)
    loading.value = false
    filter_middleware(_data.data)
    current_index.value = _data.next_index
    if (_data.data[_data.data.length - 1][props.stop_key].includes(props.stop_value)) {
        running_get_circle_data.value = 2
    }
    if (props.force_check_ending !== null && props.force_check_ending() === true) {
        running_get_circle_data.value += 2
    }
    circle_get_data()
})


onUnmounted(() => {
    running_get_circle_data.value = 2
})

async function circle_get_data() {
    if (running_get_circle_data.value === 2) return
    for (let i = 0; i < 300; i++) {
        const _data = await props.callback(current_index.value)
        await new Promise(resolve => setTimeout(resolve, 800));
        if (_data.data.length > 0) {
            filter_middleware(_data.data)
            current_index.value = _data.next_index
        }
        if (_data.data.length > 0 && _data.data[_data.data.length - 1][props.stop_key].includes(props.stop_value)) {
            running_get_circle_data.value = 2
        }
        if (props.check_ending !== null && props.check_ending() === true) {
            running_get_circle_data.value += 1
        }
        if (props.force_check_ending !== null && props.force_check_ending() === true) {
            running_get_circle_data.value += 2
        }
        console.log(running_get_circle_data.value);

        if (running_get_circle_data.value > 1) break
    }
}

async function check_interface_detail(item: any) {
    interface_detail.value = await props.interface_callback(item.type, item.detail.index)
    if (interface_detail.value) {
        current_position_index.value = -1
        show_type.value = 2
    }
}

function get_position_label(position: any) {
    if (position.type === 'task') return '主任务'
    if (position.type === 'child_case' || position.type === 'child_multitasker' || position.type === 'child_step_case') return `第${position.index + 1}次`
    return position.label
}


async function filter_middleware(new_data: any) {
    console.log(_.cloneDeep(new_data));

    _.cloneDeep(new_data).forEach((element: any) => {
        data.value.push(element)
        show_data.value.push(element)
    });
    await nextTick();
    await new Promise(resolve => setTimeout(resolve, 200));
    const element = caseInfoRef.value;
    if (element) {
        // 使用 scrollTo 滚动元素内部的内容
        element.scrollTo({
            top: element.scrollHeight, // 滚动到内容的总高度，即最底部
            behavior: 'smooth'
        });
    }
}

function reset_filter() {
    search_test.value = ""
    show_data.value = _.cloneDeep(data.value);
}

</script>

<style lang="scss" scoped>
.process-record-contrainer::-webkit-scrollbar {
    display: none !important;
}

.position-container {
    display: flex;
    justify-content: start;
    align-items: center;
    flex-wrap: wrap;
    gap: 5px;
    padding: 10px 0px;

    .position-item {
        background-color: #f0f0f0;
        border-radius: 5px;
        color: black;
        padding: 5px;
        cursor: pointer;
    }
}

.info-type {
    padding: 2px 5px;
    background-color: black;
    color: white;
    border: 2px solid black;
    border-radius: 5px;
    font-size: 0.9rem;
    cursor: pointer;
}

.process-record-contrainer {
    /* 隐藏滚动条 - 兼容 Firefox */
    scrollbar-width: none !important;
    /* 隐藏滚动条 - Firefox */

    /* 隐藏滚动条 - 兼容 IE/Edge */
    -ms-overflow-style: none !important;
    /* 隐藏滚动条 - IE/Edge */
    /* 或者 overflow-x: auto; 和 overflow-y: auto; 单独设置 */

    /* 隐藏滚动条 - 兼容 Webkit（Chrome、Safari、Edge） */
    -webkit-overflow-scrolling: touch !important;
    /* 保证滚动体验 */
    width: 100%;
    display: flex;
    flex-direction: column;
    gap: 5px;
    overflow-y: scroll;

    .item-container {
        .item {
            display: flex;
            justify-content: start;
            align-items: center;
            box-sizing: border-box;
            padding: 5px 10px;
            border: 1px solid #f0f0f0;
            border-radius: 5px;
            gap: 5px;

            .time {
                font-size: 1rem;
                font-weight: 500;
            }



            .position-btn {
                /* 渐变背景 */
                background: rgb(175, 175, 175);
                color: rgb(28, 28, 28);
                border: 1px solid rgb(175, 175, 175);
                border-radius: 5px;
                font-size: 0.9rem;
                cursor: pointer;
                transition: all 0.2s ease;
            }

            .interface_error_finished,
            .assertion_exception,
            .system_exception,
            .variable_warning,
            .error_failed,
            .assertion_failed {
                background-color: #f56565;
                color: #ffffff !important;
                border: 2px solid #f56565;
            }

            .interface_success_finished {
                background: linear-gradient(80deg, #ffd460 0%, #f8b98c 40%, #f07b3f 90%);
                border: 0px solid #ffd460;
            }

            .variable_get,
            .action_extract,
            .variable_set {
                background-image: linear-gradient(to right, rgb(0, 187, 255), rgb(93, 147, 254), rgb(0, 21, 255));
                border: 0px solid rgb(0, 187, 255);
            }

            .assertion_success {
                background: linear-gradient(80deg, #38ef7d 0%, #19d3c4 40%, #38ef7d 90%);
                border: 0px solid #38ef7d;
            }

            .step_skipped {
                background-color: #ffc551;
                color: #ffffff !important;
                border: 2px solid #ffc551;
            }

            .delay_warning,
            .action_warning {
                background: linear-gradient(to right, rgb(255, 123, 0), rgb(228, 160, 23), rgb(220, 133, 20));
                border: 1px solid rgb(255, 162, 40);
            }

            .step_running {
                // color: rgb(81, 79, 121)!important;
            }

            .desc {
                font-size: 0.9rem;
                font-weight: 500;
                max-width: calc(100% - 327px)
            }
        }
    }
}
</style>