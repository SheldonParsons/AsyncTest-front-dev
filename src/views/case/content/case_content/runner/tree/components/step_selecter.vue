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
                            <motion.div class="modal" @click.stop :animate="modalAnimateState" layout
                                :transition="{ type: 'spring', stiffness: 300, damping: 30 }">
                                <Dialog.Description>
                                    <div style="width: 100%;display: flex;flex-direction: column;gap: 5px;">
                                        <div>
                                            <div style="font-size: 0.9rem;font-weight: 500;" v-if="current_page === 'case'">选择用例</div>
                                            <div class="back" v-if="current_page === 'step'">
                                                <motion.div @click="backToCasePage" :whileHover="{ scale: 1.2 }"
                                                    class="back-icon-btn">
                                                    <BackSvg></BackSvg>
                                                </motion.div>
                                                <div>返回</div>
                                            </div>
                                        </div>
                                        <el-divider></el-divider>
                                        <div style="height: 500px;overflow-y: auto;">
                                            <TreeNode v-if="current_page === 'case'" :excluded_ids="excluded_ids"
                                                :project="current_project.id" @action="choiceCase"
                                                ref="interfaceTreeNodeRef">
                                            </TreeNode>
                                            <CaseStep v-if="current_page === 'step'" :case_id="case_id" :read_only="1">
                                            </CaseStep>
                                        </div>
                                        <el-divider v-if="current_page === 'step'"></el-divider>
                                        <div v-if="current_page === 'step'"
                                            style="display: flex;justify-content: end;align-items: center;gap: 10px;padding-top: 10px;box-sizing: border-box;">
                                            <AstButton bgColor="white" fontColor="black" @click="visible = false"
                                                borderColor="#f0f0f0">
                                                <span style="font-size: 0.8rem;">取消</span>
                                            </AstButton>
                                            <AstButton>
                                                <span style="font-size: 0.8rem;" @click="action">添加步骤</span>
                                            </AstButton>
                                        </div>
                                    </div>
                                </Dialog.Description>
                            </motion.div>
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
import TreeNode from "@/views/case/content/case_content/runner/tree/components/select_case_tree.vue";
import AstButton from '@/components/common/general/button.vue'
import { ref, onMounted, computed } from 'vue'
import { useRoute } from "vue-router";
import { ApiGetJoinProjects } from '@/api/project/index'
import { AnimatePresence, motion } from "motion-v"
import { usePointerPosition } from "motion-plus-vue"
import CaseStep from '@/views/case/content/case_content/runner/tree/index.vue'
import BackSvg from '@/assets/svg/common/new_icon/back.vue'

const current_page = ref('case')
const case_id = ref(-1)

const current_project: any = ref({
    id: -1,
    name: '请输入项目'
})

const props = defineProps({
    excluded_ids: {
        type: Array<Number>,
        default: []
    }
})
// 修改点 3: 添加 computed 属性来动态控制宽度
const modalAnimateState = computed(() => ({
    width: current_page.value === 'case' ? '30%' : '50%'
}))

const show_selecter: any = ref(false)
const project_list: any = ref([])
const interfaceTreeNodeRef: any = ref([])
onMounted(async () => {
    show_selecter.value = true
    ApiGetJoinProjects({}).then((res: any) => {
        project_list.value = res.results
        current_project.value = project_list.value.find((item: any) => item.id === Number(route.params.project))
    })
})

const route = useRoute();

const visible = ref(false)


function onOverlayClick() {
    visible.value = false
}
const position = usePointerPosition()

let resolver: any
function action() {
    const choice_nodes = interfaceTreeNodeRef.value.getCheckedNodes()
    console.log(choice_nodes);
    const interface_list = filter_choice_interface(choice_nodes)
    if (interface_list === false) return
    visible.value = false
    resolver?.({ action: 'comfirm', interface_list: interface_list })
}

function choiceCase(case_item: any) {
    case_id.value = case_item.target
    current_page.value = 'step'
}

function backToCasePage() {
    case_id.value = -1
    current_page.value = 'case'
}

function filter_choice_interface(data: any) {
    let interface_list = []
    for (let i = 0; i < data.length; i++) {
        if (data[i].child_type === 2) {
            interface_list.push({
                id: data[i].target,
                name: data[i].name,
                method: data[i].method
            })
        }
    }
    if (interface_list.length === 0) {
        window.$toast({ title: '请至少选择一个接口', type: 'info' })
        return false
    }
    return interface_list
}

// 暴露方法（open/close，可选）
const open = () => {

    visible.value = true
    backToCasePage()
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
.back {
    width: 100%;
    display: flex;
    justify-content: start;
    align-items: center;
    gap: 10px;
    font-size: 0.9rem;
    font-weight: 500;
    padding-bottom: 10px;

    .back-icon-btn {
        border-radius: 50%;
        box-shadow: 0 2px 4px #0000000d, 0 4px 8px -2px #00000005;
        background-color: white;
        padding: 4px;
        border: 0.5 solid #1018280a;
        color: #f07b3f;
        width: 1.2rem;
        height: 1.2rem;
        cursor: pointer;

    }
}


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
        // border: 1px solid #1d2628;
        background-color: #ffffff;
        z-index: 100 !important;
        padding-left: 20px;
        padding-right: 20px;
        pointer-events: auto;
        max-height: 80vh;
        min-width: 30%;
    }
}
</style>
