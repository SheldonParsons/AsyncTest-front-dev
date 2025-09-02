<template>
    <div class="dialog-container">
        <Dialog.Root :open="visible">
            <Dialog.Portal>
                <AnimatePresence>
                    <Dialog.Overlay as-child>
                        <motion.div class="overlay" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                            :exit="{ opacity: 0 }" />
                    </Dialog.Overlay>
                    <Dialog.Content as-child>
                        <motion.div class="interface-modal-container" @click="onOverlayClick"
                            :initial="dialogInitialState" :animate="dialogOpenState" :exit="dialogInitialState"
                            :style="{ transformPerspective: 200 }">
                            <div class="modal" @click.stop>
                                <Dialog.Description>
                                    <div
                                        style="width: 100%;display: flex;flex-direction: column;gap: 5px;min-width: 500px;">
                                        <div>
                                            <Select v-if="show_selecter" :value="current_project" :items="project_list"
                                                :current="Number(route.params.project)"
                                                @change="changeProject"></Select>
                                        </div>
                                        <el-divider></el-divider>
                                        <div style="height: 500px;overflow-y: auto;">
                                            <TreeNode :project="current_project.id" :is_case="true" :case_id="case_id"
                                                ref="caseTreeNodeRef">
                                            </TreeNode>
                                        </div>
                                        <el-divider></el-divider>
                                        <div
                                            style="display: flex;justify-content: end;align-items: center;gap: 10px;padding-top: 10px;box-sizing: border-box;">
                                            <AstButton bgColor="white" fontColor="black" @click="visible = false"
                                                borderColor="#f0f0f0">
                                                <span style="font-size: 0.8rem;">取消</span>
                                            </AstButton>
                                            <AstButton>
                                                <span style="font-size: 0.8rem;" @click="action">新增用例</span>
                                            </AstButton>
                                        </div>
                                    </div>
                                </Dialog.Description>
                            </div>
                        </motion.div>
                    </Dialog.Content>
                </AnimatePresence>
            </Dialog.Portal>
        </Dialog.Root>
    </div>
</template>

<script setup lang="ts">
// @ts-ignore
import { Dialog } from 'reka-ui/namespaced'
import Select from '@/components/common/general/select.vue'
import TreeNode from "@/views/case/content/case_content/runner/tree/components/select_interface_tree.vue";
import AstButton from '@/components/common/general/button.vue'
import { ref, onMounted } from 'vue'
import { useRoute } from "vue-router";
import { ApiGetJoinProjects } from '@/api/project/index'
import { AnimatePresence, motion } from "motion-v"

const current_project: any = ref({
    id: -1,
    name: '请输入项目'
})
const show_selecter: any = ref(false)
const project_list: any = ref([])
const caseTreeNodeRef: any = ref([])
onMounted(async () => {
    show_selecter.value = true
    // ApiGetJoinProjects({}).then((res: any) => {
    //     project_list.value = res.results
    //     current_project.value = project_list.value.find((item: any) => item.id === Number(route.params.project))
    // })
})

const route = useRoute();

const case_id = ref(-1)

const visible = ref(false)


function onOverlayClick() {
    visible.value = false
}

let resolver: any
function action() {
    const choice_nodes = caseTreeNodeRef.value.getCheckedNodes()
    const case_list = filter_choice_case(choice_nodes)
    if (case_list === false) return
    visible.value = false
    resolver?.({ action: 'comfirm', case_list: case_list, project: current_project.value })
}

function filter_choice_case(data: any) {
    let case_list = []
    for (let i = 0; i < data.length; i++) {
        if (data[i].child_type === 3) {
            case_list.push({
                id: data[i].target,
                name: data[i].name
            })
        }
    }
    if (case_list.length === 0) {
        window.$toast({ title: '请至少选择一个用例', type: 'info' })
        return false
    }
    return case_list
}

function changeProject(project_item: any) {
    current_project.value = project_item
}

// 暴露方法（open/close，可选）
const open = (caseId: number) => {
    case_id.value = caseId
    visible.value = true
    show_selecter.value = true
    ApiGetJoinProjects({}).then((res: any) => {
        project_list.value = res.results
        current_project.value = project_list.value.find((item: any) => item.id === Number(route.params.project))
    })
    return new Promise((resolve, reject) => {
        resolver = resolve
    })
}
const close = () => (visible.value = false)
defineExpose({ open, close })

// 动画参数（可继续复用你的）
const dialogOpenState: any = {
    opacity: 1,
    filter: 'blur(0px)',
    rotateX: 0,
    rotateY: 0,
    z: 0,
    transition: {
        delay: 0.2,
        duration: 0.1,
        ease: [0.17, 0.67, 0.51, 1],
        opacity: { delay: 0.2, duration: 0.5, ease: 'easeOut' }
    }
}

const dialogInitialState: any = {
    opacity: 0,
    filter: 'blur(10px)',
    z: -100,
    rotateY: 25,
    rotateX: 5,
    transformPerspective: 500,
    transition: { duration: 0.3, ease: [0.67, 0.17, 0.62, 0.64] }
}
</script>

<style lang="scss" scoped>
/* 你的样式原样保留 */
.dialog-container {
    display: flex;
    align-items: center;
    justify-content: center;
}

.overlay {
    background: rgba(0, 0, 0, 0.5);
    position: fixed;
    inset: 0;
    z-index: 100 !important;
    backdrop-filter: blur(3px);
}

.interface-modal-container {
    position: fixed;
    inset: 0;
    z-index: 100 !important;
    display: flex;
    align-items: center;
    justify-content: center;
    pointer-events: none;

    .modal {
        border-radius: 10px;
        border: 1px solid #1d2628;
        background-color: #ffffff;
        z-index: 100 !important;
        padding-left: 20px;
        padding-right: 20px;
        pointer-events: auto;
    }
}
</style>
