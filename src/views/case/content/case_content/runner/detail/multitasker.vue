<template>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f03a'">
                </InputUnderLine>
            </div>
            <div class="step-item">
                <div>发生错误时</div>
                <div>
                    <Select :current="data.error_strategy" :items="errorMultitaskerStrategy"
                        @change="changeErrorStraegy"></Select>
                </div>
            </div>
            <div class="step-item">
                <div style="display: inline-block;white-space: nowrap;">执行方式</div>
                <div>
                    <Radio v-model="data.loop_strategy" :items="multitaskerLoopStrategy"></Radio>
                </div>
                <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                    <TooltipAnimation :isOpen="showRunTooltip">
                        <template #trigger><span style="color: rgba(0,0,0);width: 20px;height: 20px;"
                                @mouseenter="showRunTooltip = true" @mouseleave="showRunTooltip = false">
                                <InfoSvg />
                            </span></template>
                        <template #default>
                            <div style="display: flex;flex-direction: column;gap: 5px;">
                                <div>执行方式</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">顺序执行将以同步的方式运行您的任务。</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">并发执行可以更快的执行您的任务，并获取结果。但请确保您的服务可以正确的接受它。</div>
                            </div>
                        </template>
                    </TooltipAnimation>
                </div>
            </div>
            <div class="step-item">
                <div style="display: inline-block;white-space: nowrap;">驱动方式</div>
                <div style="width: 100%;">
                    <Radio v-model="data.drive_strategy" :items="multitaskerDriveStrategy"></Radio>
                </div>
            </div>
            <div class="step-item" v-if="data.drive_strategy === 'times'">
                <div style="display: inline-block;white-space: nowrap;">循环次数</div>
                <div>
                    <InputAnimation v-model="data.times" :placeholder="'循环次数'" :maxLength="50"></InputAnimation>
                </div>
                <div style="width: 20px;height: 100%;">
                    <TooltipAnimation :isOpen="showIdTooltip">
                        <template #trigger><span style="color: rgba(0,0,0);"
                                @mouseenter="showIdTooltip = true" @mouseleave="showIdTooltip = false">
                                <InfoSvg />
                            </span></template>
                        <template #default>
                            <div style="display: flex;flex-direction: column;gap: 5px;">
                                <div>循环次数</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">您可以填入一个变量值来动态的设置它。</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                    如果该变量是一个整数时，将会循环该整数的次数。当它为一个数组时，将取该数组的长度作为循环次数。</div>
                            </div>
                        </template>
                    </TooltipAnimation>
                </div>
            </div>
            <div class="step-item" v-if="data.drive_strategy === 'dataset'">
                <div style="display: inline-block;white-space: nowrap;">选择数据集</div>
                <div>
                    <Select :current="data.dataset" :items="dataset_list" @change="changeDataset"></Select>
                </div>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.drive_strategy === 'script'">
                <MarkDown :data="createDatasetScript"></MarkDown>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.drive_strategy === 'script'">
                <PythonCode @change="changeLoopCode" :code="data.load_loop_script"></PythonCode>
            </div>
            <div class="step-footer">
                <div>
                    <AstButton @click="save">
                        <div style="font-size: 0.8rem;">保存(Ctrl+E)</div>
                    </AstButton>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import SwitchAnimation from '@/components/common/general/switch.vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import InputAnimation from '@/components/common/general/input.vue'
import AstButton from '@/components/common/general/button.vue'
import { errorMultitaskerStrategy, multitaskerDriveStrategy, multitaskerLoopStrategy,createDatasetScript } from '@/views/case/utils/constants'
import Select from '@/components/common/general/select_public.vue'
import Radio from '@/components/common/general/radio.vue'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import InfoSvg from '@/assets/svg/common/new_icon/info.vue'
import { ApiGetDatasetList } from '@/api/case/dataset/index'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import PythonCode from '@/components/common/general/pythonCode.vue'
const props = defineProps({
    data: {
        type: null,
        default: null
    },
    case_id: {
        type: Number,
        default: -1
    }
})


const showIdTooltip = ref(false)
const showRunTooltip = ref(false)

const dataset_list: any = ref([])

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
    get_data_set()
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
});

function changeLoopCode(value:any) {
    props.data.load_loop_script = value
}

function changeErrorStraegy(item: any) {
    props.data.error_strategy = item.key
}

function changeDataset(item: any) {
    props.data.dataset = item.key
}

async function get_data_set() {
    const _data = {
        case: props.case_id
    }
    dataset_list.value = []
    ApiGetDatasetList(_data).then((res: any) => {
        res.forEach((element: any) => {
            dataset_list.value.push({
                key: element.id,
                value: element.name
            })
        });
    })
    dataset_list.value.push({
        key: -1,
        value: '请选择'
    })
}


function addAltE(event: any) {
    if (
        (event.metaKey || event.ctrlKey) &&
        (event.key === "e" || event.code === "KeyE")
    ) {
        event.preventDefault(); // 阻止浏览器默认行为
        save();
        // 在这里执行你想要的逻辑
    }
}

async function save() {
    window.$toast({ title: '保存步骤设置成功。' })
}

// 创建一个可读写的计算属性
const raiseCodeAsString = computed({
    // "get" 函数：当子组件需要读取值时调用
    get() {
        // 总是返回一个字符串
        return String(props.data.raise_code || '');
    },
    // "set" 函数：当子组件更新值时调用
    set(newValue) {
        // 将新值（一定是字符串）写回到原始数据源
        // 如果您希望 raise_code 最终存为数字，可以在这里转换
        // data.value.raise_code = Number(newValue); 
        props.data.raise_code = newValue;
    }
});

function changeShouldRise(status: boolean) {
    props.data.should_raise = !status
}

</script>
