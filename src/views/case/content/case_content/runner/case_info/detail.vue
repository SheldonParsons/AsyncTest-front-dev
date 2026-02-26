<template>
    <div class="step-info">
        <div class="step-container">
            <div class="step-item">
                <div>环境选择</div>
                <div>
                    <Select :current="data.env" :items="env_list" @change="changeEnvStraegy"></Select>
                </div>
            </div>
            <div class="step-item">
                <div>发生错误时</div>
                <div>
                    <Select :current="data.error_strategy" :items="errorCaseRealStrategy"
                        @change="changeErrorStraegy"></Select>
                </div>
            </div>
            <!-- <div class="step-item">
                <div>运行时是否覆盖变量</div>
                <div>
                    <Select :current="data.runtime_parameters_strategy" :items="errorParamsCoverStrategy"
                        @change="changeParamStraegy"></Select>
                </div>
            </div> -->
            <div class="step-item" style="width: 100%;">
                <GlobalDatasource v-model="data.global_datasource"/>
            </div>
            <div class="step-item">
                <div style="display: inline-block;white-space: nowrap;">执行方式</div>
                <div>
                    <Radio v-model="data.loop_strategy" :items="multitaskerLoopStrategy"></Radio>
                </div>
                <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                    <TooltipAnimation :isOpen="showRunTooltip">
                        <template #trigger><span
                                style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                @mouseenter="showRunTooltip = true" @mouseleave="showRunTooltip = false">
                                <InfoSvg />
                            </span></template>
                        <template #default>
                            <div style="display: flex;flex-direction: column;gap: 5px;">
                                <div>执行方式</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">顺序执行将以同步的方式运行您的任务。</div>
                                <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                    并发执行可以更快的执行您的任务，并获取结果。但请确保您的服务可以正确的接受它。</div>
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
                    <InputAnimation v-model="data.loop_times" :placeholder="'循环次数'" :maxLength="50"></InputAnimation>
                </div>
                <div style="width: 20px;height: 100%;">
                    <TooltipAnimation :isOpen="showIdTooltip">
                        <template #trigger><span style="color: rgba(0,0,0);width: 0.7rem;"
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
                    <Select :current="data.data_set" :items="dataset_list" @change="changeDataset"></Select>
                </div>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.drive_strategy === 'script'">
                <MarkDown :data="createDatasetScript"></MarkDown>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.drive_strategy === 'script'">
                <PythonCode @change="changeLoopCode" :code="data.before_script"></PythonCode>
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
import { onMounted, onBeforeUnmount, ref } from 'vue'
import AstButton from '@/components/common/general/button.vue'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import Select from '@/components/common/general/select_public.vue'
import Radio from '@/components/common/general/radio.vue'
import InfoSvg from '@/assets/svg/common/new_icon/info.vue'
import { ApiGetDatasetList } from '@/api/case/dataset/index'
import InputAnimation from '@/components/common/general/input.vue'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import PythonCode from '@/components/common/general/pythonCode.vue'
import GlobalDatasource from '@/views/case/content/case_content/runner/global_datasource.vue'
import { useRoute } from "vue-router"
import { ApiGetEnvListAndUserSetting } from "@/api/interface/env";
import { createDatasetScript, multitaskerDriveStrategy, multitaskerLoopStrategy, errorCaseRealStrategy, errorParamsCoverStrategy } from '@/views/case/utils/constants'
const route = useRoute()
const showRunTooltip = ref(false)
const showIdTooltip = ref(false)
const dataset_list: any = ref([])
const env_list: any = ref([])
const props = defineProps({
    data: {
        type: null,
        default: null
    }
})

async function get_env_list_and_user_env() {
    const data = {
        type: 0,
        child_action_type: "get_env_list_and_user_env",
        content: {
            project: route.params.project,
        },
    };
    ApiGetEnvListAndUserSetting(data).then((res: any) => {
        env_list.value = []
        res.env_list.forEach((element: any) => {
            env_list.value.push({
                key: element.name,
                value: element.name
            })
        })
    });
}

function changeEnvStraegy(item: any) {
    props.data.env = item.value
}

function changeErrorStraegy(item: any) {
    props.data.error_strategy = item.key
}

function changeParamStraegy(item: any) {
    props.data.runtime_parameters_strategy = item.key
}

function changeLoopCode(value: any) {
    props.data.before_script = value
}

function changeDataset(item: any) {
    props.data.data_set = item.key
}

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
    get_data_set()
    get_env_list_and_user_env()
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
});

async function get_data_set() {
    const _data = {
        case: props.data.id
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
        (event.key === "e" || event.code === "KeyE" || event.key === "s" || event.code === "KeyS")
    ) {
        event.preventDefault(); // 阻止浏览器默认行为
        save();
        // 在这里执行你想要的逻辑
    }
}

const emit = defineEmits(['save'])

async function save() {
    if (check() === false) return
    emit("save")
}

function check() {
    return true
}

</script>

<style lang="scss" scope>
.step-tips {
    padding: 10px;


    div {
        box-sizing: border-box;
        border-radius: 8px;
        border: 2px solid #f0f0f0;
        font-weight: 500;
        font-size: 0.9rem;
        padding: 10px;
        color: rgba($color: #000000, $alpha: 0.5);
        background: linear-gradient(80deg, #ffd460 0%, #f8b98c 40%, #f07b3f 90%)
    }
}

.step-info {
    width: 100%;
    padding: 10px;
    box-sizing: border-box;
    min-width: 500px;

    .step-container {
        display: flex;
        justify-content: start;
        align-items: center;
        width: 100%;
        flex-direction: column;
        background-color: #f0f0f03a;
        border: 2px solid #f0f0f0;
        border-radius: 8px;
        gap: 10px;
        padding: 10px;
        box-sizing: border-box;

        .step-footer {
            display: flex;
            justify-content: end;
            align-items: center;
            width: 100%;
        }
    }

    .step-title {
        width: 100%;
        display: flex;
        align-items: center;
        box-sizing: border-box;
    }

    .step-item {
        width: 100%;
        font-size: 14px;
        font-weight: 500;
        padding: 10px;
        box-sizing: border-box;
        display: flex;
        justify-content: start;
        align-items: center;
        gap: 10px;
        border-radius: 4px;
    }
}
</style>