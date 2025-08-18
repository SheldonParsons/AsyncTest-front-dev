<template>
    <div class="step-tips">
        <div>
            引用的测试用例将无法使用数据驱动，默认仅会被执行一次。获取环境变量时可以正常使用引用用例本身的环境变量，对应的服务也将使用用例本身的服务信息。而旗下的步骤在您设置【临时变量/环境变量/全局变量】时将会穿透到当前用例的对应变量，可以被其他步骤所使用。
        </div>
    </div>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f0'">
                </InputUnderLine>
            </div>
            <div class="step-item">
                <div>环境选择</div>
                <div>
                    <Select :current="data.env_strategy" :items="envStrategy" @change="changeEnvStraegy"></Select>
                </div>
            </div>
            <div class="step-item">
                <div>发生错误时</div>
                <div>
                    <Select :current="data.error_strategy" :items="errorCaseStrategy"
                        @change="changeErrorStraegy"></Select>
                </div>
            </div>
            <div class="step-item">
                <div>运行时是否覆盖变量</div>
                <div>
                    <Select :current="data.runtime_parameters_strategy" :items="errorParamsCoverStrategy"
                        @change="changeParamStraegy"></Select>
                </div>
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
    <CaseStep ref="caseStepRef" :case_id="data.case_id" :read_only="2">
    </CaseStep>
</template>

<script lang="ts" setup>
import { computed, onMounted, onBeforeUnmount } from 'vue'
import CaseStep from '@/views/case/content/case_content/runner/tree/index.vue'
import AstButton from '@/components/common/general/button.vue'
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import Select from '@/components/common/general/select_public.vue'
import { envStrategy, errorCaseStrategy, errorParamsCoverStrategy } from '@/views/case/utils/constants'
const props = defineProps({
    data: {
        type: null,
        default: null
    }
})

function changeEnvStraegy(item: any) {
    props.data.env_strategy = item.key
}

function changeErrorStraegy(item: any) {
    props.data.error_strategy = item.key
}

function changeParamStraegy(item: any) {
    props.data.runtime_parameters_strategy = item.key
}

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
});


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
</style>