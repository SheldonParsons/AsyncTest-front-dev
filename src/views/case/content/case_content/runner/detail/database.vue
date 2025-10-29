<template>
    <div class="step-info">
        <div class="step-container">
            <div class="step-title">
                <InputUnderLine v-model="data.label" :maxLength="225" :placeholder="'步骤名称'" :bgcolor="'#f0f0f03a'">
                </InputUnderLine>
            </div>
            <div class="step-item">
                <div>选择数据库</div>
                <div>
                    <Select :current="data.database_id" :items="databse_list" @change="changeDatabase"></Select>
                </div>
            </div>
            <div class="step-item" style="align-items: start;">
                <div style="display: inline-block;white-space: nowrap;">SQL命令</div>
                <div style="width: 100%;">
                    <div style="
                  width: 95%;
                  border: 1px solid #f3f5f6;
                  border-radius: 10px;
                  margin-left: 20px;
                ">
                        <div class="database-editor-header">
                            <Params @insert_action="insert_params">
                            </Params>
                        </div>
                        <SqlEditor ref="ediorSql" :code="real_sql" @change="code_change">
                        </SqlEditor>
                    </div>
                </div>
            </div>
            <div class="step-item">
                <div style="display: inline-block;white-space: nowrap;">提取方式</div>
                <div style="width: 100%;">
                    <Radio v-model="data.params_mode" :items="extractDatabaseParamMode"></Radio>
                </div>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.params_mode === 'kv'">
                <AstButton @click="add_params">
                    <div style="font-size: 0.8rem;">新建参数</div>
                </AstButton>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.params_mode === 'kv'">
                <div class="params-list">
                    <div class="params-item" v-for="(item, index) in data.params" :key="index">
                        <InputAnimation style="flex: 35" v-model="item.name" :placeholder="'参数名'" :maxLength="50">
                        </InputAnimation>
                        <InputAnimation style="flex: 35" v-model="item.pattern" :placeholder="'Jsonpath'"
                            :maxLength="50">
                        </InputAnimation>
                        <Select :padding="'10px 8px'" style="flex: 20" :current="item.range" :items="paramsRange"
                            @change="(val) => changeParamsRange(val, item)"></Select>
                        <AstButton style="width: 40px;" @click="deleteParams(index)">
                            <div style="font-size: 0.8rem;text-align: center;">Delete</div>
                        </AstButton>
                    </div>

                </div>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.params_mode === 'script'">
                <MarkDown :data="databseReaultScriptDemo"></MarkDown>
            </div>
            <div class="step-item" style="width: 100%;" v-if="data.params_mode === 'script'">
                <PythonCode :shortcuts="script_demo" @change="changeExtractCode" :code="data.script"></PythonCode>
            </div>
            <div class="step-footer" style="display: flex;justify-content: end;align-items: center;">
                <MotionButton @click="save" style="width: 90px;">
                    <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
                        <div style="font-size: 14px;">保存</div>
                        <div
                            style="font-size: 0.7rem;background-color: black;color: white;padding: 1px 2px;border-radius: 4px;">
                            {{ get_system_save() }}</div>
                    </div>
                </MotionButton>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, onBeforeUnmount, ref } from 'vue'
import { useRoute } from "vue-router";
import InputUnderLine from '@/components/common/general/inputUnderLine.vue'
import Params from "@/views/api/child_component/params.vue";
import SqlEditor from "@/components/common/editor/SqlEditor.vue";
import InputAnimation from '@/components/common/general/input.vue'
import AstButton from '@/components/common/general/button.vue'
import { ApiGetDatabaseInfo } from "@/api/project/index";
import { paramsRange, databseReaultScriptDemo, extractDatabaseParamMode } from '@/views/case/utils/constants'
import Select from '@/components/common/general/select_public.vue'
import Radio from '@/components/common/general/radio.vue'
import MarkDown from "@/views/api/child_component/params_child/comp/markdown.vue";
import PythonCode from '@/components/common/general/pythonCode.vue'
import MotionButton from '@/assets/motion/button.vue'

function get_system_save() {
    if (navigator.platform.toUpperCase().indexOf('MAC') >= 0) {
        return '⌘+E'
    }
    return 'Ctrl+E'
}
const databse_list: any = ref([]);
const ediorSql: any = ref(null);
const route = useRoute();
const real_sql = ref("")
const script_demo = [
    { label: "获取全局变量", code: "at.gv.get('variable_key')\n" },
    { label: "设置全局变量", code: "at.gv.set('variable_key', 'variable_value')\n" },
    { label: "获取环境变量", code: "at.env.get('variable_key')\n" },
    { label: "设置环境变量", code: "at.env.set('variable_key', 'variable_value')\n" },
    { label: "获取临时变量", code: "at.temp.get('variable_key')\n" },
    { label: "设置临时变量", code: "at.temp.set('variable_key', 'variable_value')\n" },
    { label: "获取生成器函数", code: "at.func.boolean(10, 20, 'true').value\n" },
    { label: "获取处理函数", code: "at.pipeline.sha('abc', 'sha1')\n" },
    { label: "获取环境名称", code: "at.env_name\n" },
    { label: "获取SQL结果集", code: "at.database.get_result()\n" }
]
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

onMounted(async () => {
    // 添加全局事件监听
    window.addEventListener("keydown", addAltE);
    await get_databases()
    real_sql.value = props.data.sql
});

onBeforeUnmount(() => {
    window.removeEventListener("keydown", addAltE);
});

function insert_params(text: string) {
    ediorSql.value?.insertText(text);
}

async function code_change(value: string) {
    props.data.sql = value
}

function changeDatabase(item: any) {
    props.data.database_id = item.key
}

function changeExtractCode(value: any) {
    props.data.script = value
}

function changeParamsRange(item: any, data: any) {
    data.range = item.key
}

async function get_databases() {
    const data = {
        project: route.params.project,
        simple: 1,
    };
    ApiGetDatabaseInfo({ params: data }).then((res: any) => {
        res.data.forEach((element: any) => {
            databse_list.value.push({
                key: element.id,
                value: element.name
            })
        });
    });
}

function deleteParams(index: number) {
    props.data.params.splice(index, 1)
}

function add_params() {
    props.data.params.push({
        name: "",
        pattern: "",
        range: 'temp'
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
.database-editor-header {
    height: 2.5rem;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    flex-flow: wrap;
    min-width: 0;
    display: flex;
    flex-shrink: 0;
    align-items: center;
    flex-wrap: nowrap;
    border-bottom: 1px solid #f3f5f6;
}

.params-list {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 10px;
    flex-direction: column;
    width: 100%;

    .params-item {
        width: 100%;
        display: flex;
        justify-content: start;
        align-items: center;
        gap: 10px;
    }
}
</style>