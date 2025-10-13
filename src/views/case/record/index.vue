<template>
    <div class="record_nav g-unselect">
        <div v-for="(router_name, index) in router_list" :key="index" class="inner-item">
            <span v-if="router_name !== 'Task'">/</span>
            <motion.div class="item" :class="{ 'pointer': current_page === router_name }" :whilePress="{ scale: 0.95 }"
                :whileHover="{ scale: 1.05 }" @click="go_ahead_action(null, router_name)">{{ router_name }}</motion.div>
        </div>
    </div>
    <TaskPage v-if="current_page == 'Task'" :case_id="props.case_id" :range_type="props.range_type"
        @action="(task_id) => go_ahead_action(task_id, 'Record')" ref="TaskPageRef"></TaskPage>
    <RecordPage v-if="current_page === 'Record'" :case_id="props.case_id" :range_type="props.range_type"
        @action="(record_backup_index) => go_ahead_action(record_backup_index, 'CaseTable')" :task_id="task_id">
    </RecordPage>
    <ChildCaseTable v-if="current_page === 'CaseTable'"
        @action="(child_case: any, case_id: any) => go_ahead_action(child_case, 'Step', case_id)"
        :case_id="props.case_id" :range_type="props.range_type" :record_id="record_id"></ChildCaseTable>
    <StepPage v-if="current_page === 'Step'" :child_case_index="child_case_index" :record_id="record_id"
        :range_type="props.range_type" :case_id="current_case_id"></StepPage>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router'
import { motion } from 'motion-v'
import TaskPage from '@/views/case/record/task_page/index.vue'
import RecordPage from '@/views/case/record/record_page/index.vue'
import ChildCaseTable from '@/views/case/record/child_case_page/index.vue'
import StepPage from '@/views/case/record/step_page/index.vue'
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
    justify-content: start;
    align-items: center;
    box-sizing: border-box;
    padding: 10px;
    gap: 5px;
    border-bottom: 1px solid #f0f0f0;

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
</style>