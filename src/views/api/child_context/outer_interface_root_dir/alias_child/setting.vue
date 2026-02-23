<template>
    <div class="setting-container">
        <div class="ast-dir-container">
            <div class="tree">
                <div style="display: flex;justify-content: start;align-items: center;gap: 5px;">
                    <img style="width: 35px;height: 35px;border-radius: 4px;object-fit: fill;" class='img'
                        src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/IntelliJ_IDEA_Icon.svg" alt="">
                    <InputAnimation v-model="filterText" :placeholder="'搜索 接口/目录名'" :maxLength="300"></InputAnimation>
                </div>
                <el-tree style="margin-top: 10px;" class="api-tree no-scroll" ref="treeRef" :key="treeKey"
                    id="api-tree-core" :data="data" node-key="id" icon="ArrowRightBold" :highlight-current="true"
                    :expand-on-click-node="false" :default-expanded-keys="firstLevelKeys" icon-class="none"
                    :filter-node-method="filterNode">
                    <template #default="{ node, data }">
                        <div v-if="
                            data.child_type === 0 ||
                            data.child_type === 1 ||
                            data.child_type === 2
                        " class="tree-node-father g-unselect">
                            <div class="tree-node g-ellipsis">
                                <div class="expand-icon">
                                    <el-icon v-if="data.child_type !== 2" :size="8" color="#606266" :class="node.expanded ? 'private-icon icon-expanded' : 'private-icon'
                                        " @click.stop="changeExpanded(node)">
                                        <ArrowRightBold />
                                    </el-icon>
                                </div>
                                <div v-if="node.level === 1" class="tree-icon-container">
                                    <div style="width: 20px;">
                                        <img style="width: 20px;"
                                            src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/IntelliJ_IDEA_Icon.svg"
                                            alt="IntelliJ IDEA" width="80">
                                    </div>
                                </div>
                                <div v-if="data.child_type !== 2 && node.level !== 1 && data.code_type !== 2"
                                    class="tree-icon-container">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                        <g fill="none" fill-rule="evenodd">
                                            <path fill="#9AA7B0" fill-opacity=".8"
                                                d="M7.9844,4 L6.6964,2.711 C6.3044,2.32 5.5324,2 4.9784,2 L1.0504,2 C1.0234,2 1.0004,2.022 1.0004,2.051 L1.0004,13 L9.0004,13 L9.0004,9 L15.0004,9 L15.0004,4 L7.9844,4 Z" />
                                            <polygon fill="#40B6E0" points="10 16 16 16 16 10 10 10" />
                                        </g>
                                    </svg>
                                </div>
                                <div v-if="data.child_type !== 2 && node.level !== 1 && data.code_type === 2"
                                    class="tree-icon-container">
                                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                                        <g fill="none" fill-rule="evenodd">
                                            <path fill="#40B6E0" fill-opacity=".6"
                                                d="M15,8 C15,11.866 11.866,15 8,15 C4.134,15 1,11.866 1,8 C1,4.134 4.134,1 8,1 C11.866,1 15,4.134 15,8" />
                                            <path fill="#231F20" fill-opacity=".7"
                                                d="M5,4.28253174 C4.53,4.74153174 4.028,4.978 3.1,5 C2.061,5.022 1,4.2794 1,3.0004 C1,1.7124 1.971,1 3.1,1 C3.94833171,1 4.54833171,1.18475342 4.9,1.55426025 L5.5162,0.836730957 C4.8293999,0.270175195 4.28826904,0.0004 3.0982,0.0004 C1.3402,0.0004 0.0002,1.3584 0.0002,3.0004 C0.0002,4.6824 1.3642,6.0004 3.0022,6.0004 C4.29284668,6.0004 5.0232,5.5934 5.6162,4.9814 C5.2054,4.51548783 5,4.28253174 5,4.28253174 Z"
                                                transform="translate(5 5)" />
                                        </g>
                                    </svg>
                                </div>
                                <span v-if="data.child_type === 2" class="method-span"
                                    :class="method_color[data.method.toLowerCase()]">{{
                                        data.method.toLowerCase() }}</span>
                                <div class="label-span-method">
                                    <div class="g-ellipsis">{{ getName(data) }}</div>
                                </div>
                                <div v-if="data.child_type === 0 && node.level === 1"
                                    @click.stop="show_nick_name = !show_nick_name">
                                    <SwitchBtn :type="show_nick_name" :trueText="'显示原始名'"></SwitchBtn>
                                </div>
                                <div v-if="node.level !== 1" @click="setNameMatch(data)">
                                    <MiniIconBtn :text="'设置匹配名称'">
                                        <GetNameSvg></GetNameSvg>
                                    </MiniIconBtn>
                                </div>
                                <div v-if="node.level !== 1" @click="setPathMatch(data)">
                                    <MiniIconBtn :text="'设置匹配路径'">
                                        <GetPathSvg></GetPathSvg>
                                    </MiniIconBtn>
                                </div>
                            </div>
                        </div>
                    </template>
                </el-tree>
            </div>
            <div class="control">
                <div class="middle-part">
                    <div class="setting-part">
                        <div class="alias-name item">
                            <InputAnimation v-model="aliasName" :placeholder="'别名'" :maxLength="300"></InputAnimation>
                        </div>
                        <div class="match-type item">
                            <Radio v-model="match_type" :items="MatchType">
                            </Radio>
                            <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                                <TooltipAnimation :isOpen="isShowMatchTypeDesc">
                                    <template #trigger><span
                                            style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                            @mouseenter="isShowMatchTypeDesc = true"
                                            @mouseleave="isShowMatchTypeDesc = false">
                                            <InfoSvg />
                                        </span></template>
                                    <template #default>
                                        <div style="display: flex;flex-direction: column;gap: 5px;">
                                            <div>匹配方式介绍</div>
                                            <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                                【名称匹配】意为当前指定模块下，只要与该名称相同的目录，都将设置为该别称。</div>
                                            <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                                【路径精准匹配】意为当前指定模块下，只有次目录才会设置为该别称。</div>
                                            <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                                Tips：【路径精准匹配】优先级大于【名称匹配】</div>
                                        </div>
                                    </template>
                                </TooltipAnimation>
                            </div>
                        </div>
                        <div class="match-name item" v-if="match_type === '0'">
                            <InputAnimation v-model="match_name" :placeholder="'匹配名称'" :maxLength="300">
                            </InputAnimation>
                        </div>
                        <div class="match-path item" v-if="match_type === '1'">
                            <InputAnimation :disabled="true" v-model="match_path"
                                :placeholder="'匹配路径（请点击左侧树结构中的某个节点来进行填充）'" :maxLength="300"></InputAnimation>
                        </div>
                        <div class="match-modules">
                            <div class="select">
                                <div>
                                    <MotionSelect v-model="match_modules" :options="FakeMatchModulesData"
                                        placeholder="选择绑定的模块" label-field="name" value-field="code"
                                        @change="handleSelectChange" />
                                </div>
                            </div>
                            <div class="add">
                                <MotionButton @click="createTesting" style="width: 100px;height: 30px;">
                                    添加 & 预览
                                </MotionButton>
                                <MotionButton v-if="is_edit" @click="reset" style="width: 100px;height: 30px;">
                                    还原
                                </MotionButton>
                            </div>

                        </div>

                    </div>
                    <div class="adding-part">
                        <div class="data-set-container">
                            <BlankAmination v-if="adding_data.length === 0"></BlankAmination>
                            <motion.div v-if="adding_data.length !== 0" :initial="{ opacity: 0 }"
                                :animate="{ opacity: 1 }" :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }"
                                class="header">
                                <div class="inner">
                                    <div class="title title-name">Alias</div>
                                    <div class="title title-update">匹配模式</div>
                                    <div class="title title-update-person">关联模块</div>
                                    <div class="title title-status">匹配名称</div>
                                    <div class="title title-action">匹配路径</div>
                                    <div class="title title-action">操作</div>
                                </div>
                            </motion.div>
                            <div class="data no-scroll" v-if="adding_data.length !== 0">
                                <motion.div :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
                                    :transition="{ duration: 1.2 }" class="data-item"
                                    v-for="(item, index) in adding_data" :key="index">
                                    <div class="title title-name">
                                        <HoverTooltip :text="item.alias">
                                            <div class="g-e">{{ item.alias }}</div>
                                        </HoverTooltip>
                                    </div>
                                    <div class="title title-update"><span>{{ item.match_type === '0' ? '名称匹配' : '精准匹配'
                                            }}</span>
                                    </div>
                                    <div class="title title-update-person">
                                        <HoverTooltip :text="item.match_modules">
                                            <div class="g-e">{{ item.match_modules === 'all' ? '所有模块' :
                                                item.match_modules
                                                }}</div>
                                        </HoverTooltip>
                                    </div>
                                    <div class="title title-update-person">
                                        <HoverTooltip :text="item.match_type === '0' ? item.match_name : '暂无'">
                                            <div class="g-e">{{ item.match_type === '0' ? item.match_name : '-' }}
                                            </div>
                                        </HoverTooltip>
                                    </div>
                                    <div class="title title-action" @click.stop>
                                        <HoverTooltip :text="item.match_path.length === 0 ? '-' : item.match_path">
                                            <div class="g-e">{{ item.match_path.length === 0 ? "-" :
                                                item.match_path_name }}</div>
                                        </HoverTooltip>
                                    </div>
                                    <div class="title title-action" @click.stop>
                                        <MotionButton @click="removeAddingItem(index)"
                                            style="width: 100px;height: 30px;" :danger="true">
                                            删除
                                        </MotionButton>
                                    </div>
                                </motion.div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, watch } from 'vue'
import InputAnimation from '@/components/common/general/input.vue'
import HoverTooltip from '@/components/common/general/tooltip_hover.vue'
import { motion } from 'motion-v'
import MiniIconBtn from '@/components/common/general/mini_icon_btn.vue'
import { useRoute } from "vue-router";
import Radio from '@/components/common/general/radio.vue'
import MotionButton from '@/assets/motion/button.vue'
import MotionSelect from '@/components/common/general/motion_select.vue'
import BlankAmination from '@/components/common/blank/blank_animation.vue'
import SwitchBtn from '@/components/layout/special/tooltips_btn.vue'
import GetPathSvg from '@/assets/svg/common/get_path.vue'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import GetNameSvg from '@/assets/svg/common/get_name.vue'
import InfoSvg from '@/assets/svg/common/new_icon/info.vue'
import { getOuterTree, getOuterTreeModule } from "@/api/program/tree";
import { MatchType } from '@/views/api/child_context/outer_interface_root_dir/constants'
import { ApiPostAliasSetting } from '@/api/project/index'
import tools from '@/utils/tools'

const props = defineProps({
    is_edit: {
        type: Boolean,
        default: false
    },
    edit_object: {
        type: null,
        default: null
    }
})

const route = useRoute();

// 树相关
const treeRef = ref()
const treeKey = ref(0)
const filterText = ref("")
const firstLevelKeys = ref<number[]>([])
const data: any = ref([])

// 表单相关
const aliasName = ref("")
const match_type = ref('0')
const match_name = ref("")
const match_path = ref("")
const match_modules = ref("all")
const show_nick_name = ref(true)
const isShowMatchTypeDesc = ref(false)

// 数据列表
const adding_data = ref<any[]>([])

// edit_object 备份
const edit_object_backup = ref<any>(null)

const FakeMatchModulesData = ref()

const method_color: any = {
    get: "get",
    post: "post",
    put: "put",
    delete: "delete",
    patch: "patch"
};

defineEmits(['close'])

defineExpose({ create, check_content })

onMounted(() => {
    initEditData()
    getData()
    initModuleName()
})

function check_content() { return true }

// ==================== 初始化编辑数据 ====================

function initEditData() {
    if (props.is_edit && props.edit_object) {
        // 备份 edit_object
        edit_object_backup.value = JSON.parse(JSON.stringify(props.edit_object))
        // 插入到 adding_data
        adding_data.value.push(JSON.parse(JSON.stringify(props.edit_object)))
    }
}

watch(filterText, (val: string) => {
    treeRef.value?.filter(val);
});

// ==================== 数据获取 ====================

async function initModuleName() {
    const params = { project: route.params.project }
    const data: any = await getOuterTreeModule(params)
    FakeMatchModulesData.value = [{ name: '所有模块', code: 'all' }]
    for (let i = 0; i < data.length; i++) {
        console.log(data[i]);
        
        FakeMatchModulesData.value.push({
            name: data[i],
            code: data[i]
        })
    }
}

async function getData() {
    const params = { project: route.params.project }
    data.value = await getOuterTree(params)
    firstLevelKeys.value = calculateExpandedKeys(data.value)
}

function calculateExpandedKeys(nodes: any[]): number[] {
    const keys: number[] = []
    const traverse = (list: any[]) => {
        for (const node of list) {
            const shouldExpand = node.code_type === 0 ||
                (node.code_type === 1 && node.children?.some((child: any) => child.code_type === 1))
            if (shouldExpand) {
                keys.push(node.id)
            }
            if (node.children?.length > 0) {
                traverse(node.children)
            }
        }
    }
    traverse(nodes)
    return keys
}

// ==================== 树操作 ====================

function filterNode(value: string, data: any): boolean {
    if (!value) return true
    return data.name.includes(value)
}

function changeExpanded(node: any) {
    if (node.expanded) {
        node.collapse()
        const index = firstLevelKeys.value.indexOf(node.data.id)
        if (index !== -1) {
            firstLevelKeys.value.splice(index, 1)
        }
    } else {
        node.expand()
        firstLevelKeys.value.push(node.data.id)
    }
}

function getName(data: any): string {
    if (show_nick_name.value) {
        if (data.ast_alias && data.ast_alias.length > 0) {
            return data.ast_alias
        }
    }
    const isAliasTarget = (data.child_type === 1 && data.code_type === 2) ||
        (data.child_type === 2 && data.code_type === 3)
    if (isAliasTarget && data.alias?.length > 0) {
        return data.alias
    }
    return data.name
}

// ==================== 匹配设置 ====================

function setNameMatch(data: any) {
    match_type.value = '0'
    match_name.value = data.name
    match_path.value = ""
}

function setPathMatch(data: any) {
    match_type.value = '1'
    match_name.value = ""
    match_path.value = data.tree_path
}

function handleSelectChange(item: any) {
    console.log('选中的完整对象:', item)
}

// ==================== 添加数据 ====================

function reset() {
    adding_data.value = []
    if (edit_object_backup.value) {
        adding_data.value.push(JSON.parse(JSON.stringify(edit_object_backup.value)))
    }
    getData()
}

function createTesting() {
    if (!validateAddingForm()) return

    const [pathValue, pathName] = getPathAndName()
    const newItem = {
        alias: aliasName.value,
        match_type: match_type.value,
        match_modules: match_modules.value,
        match_name: match_name.value,
        match_path: pathValue,
        match_path_name: pathName,
        id: null
    }
    adding_data.value.push(newItem)
    match_name.value = ""
    match_path.value = ""
    aliasName.value = ""

    // 发起预览请求
    sendPreview()
}

function getPathAndName(): [string, string] {
    if (match_type.value === '0') {
        return ["", ""]
    }
    return [match_path.value, getLastField(match_path.value)]
}

function getLastField(pathStr: string): string {
    if (!pathStr) return ''
    const parts = pathStr.split('.')
    const lastPart = parts[parts.length - 1]
    return lastPart.replace(/\[\d+\]$/, '')
}

function validateAddingForm(): boolean {
    if (aliasName.value.length === 0) {
        window.$toast({ title: "请填写别名" })
        return false
    }
    if (match_type.value === '0' && match_name.value.length === 0) {
        window.$toast({ title: "请填匹配名称" })
        return false
    }
    if (match_type.value === '1' && match_path.value.length === 0) {
        window.$toast({ title: "请在树结构中选择精准匹配路径" })
        return false
    }
    if (match_modules.value.length === 0) {
        window.$toast({ title: "请选择绑定的模块" })
        return false
    }
    return true
}

function removeAddingItem(index: number) {
    adding_data.value.splice(index, 1)
    // 发起预览请求
    sendPreview()
}

// ==================== 请求相关 ====================

function buildRequestData() {
    const requestData: { create: any[], delete: any[] } = {
        create: [],
        delete: []
    }

    // 把 adding_data 中 id 为 null 的元素加入到 create
    adding_data.value.forEach(item => {
        if (item.id === null) {
            requestData.create.push(item)
        }
    })

    // 如果 is_edit 为 true，但 adding_data 里没有 id 不为 null 的对象，
    // 说明原有的 edit_object 被删除了，需要把它加入到 delete
    if (props.is_edit && edit_object_backup.value) {
        const hasExistingItem = adding_data.value.some(item => item.id !== null)
        if (!hasExistingItem) {
            requestData.delete.push(edit_object_backup.value)
        }
    }

    return requestData
}

function sendPreview() {
    const requestData = buildRequestData()
    tools.send(ApiPostAliasSetting, requestData, { type: 'preview', project: route.params.project }).then((res: any) => {
        if (res !== false) {
            data.value = res
            show_nick_name.value = true
            firstLevelKeys.value = calculateExpandedKeys(data.value)
        }
    })
}

async function create() {
    const requestData = buildRequestData()
    return await tools.send(ApiPostAliasSetting, requestData, { type: 'batch_action', project: route.params.project }).then((res: any) => {
        if (res !== false) {
            window.$toast({ title: res.msg || '操作成功', type: 'success' })
            return res
        }
        return false
    })
}
</script>

<style lang="scss" scoped>
.setting-container {
    overflow: hidden;
    width: 1400px;
    height: 600px;
}

.tree-node {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 100%;
    z-index: 9999;
}

.tree-icon-container {
    display: flex;
    justify-content: center;
    align-items: center;
    color: black;
}

.label-span-method {
    align-items: center;
    font-size: 14px;
    font-weight: 400;
    width: 100%;
    padding-left: 5px;
    white-space: nowrap;
    text-overflow: ellipsis;
    overflow: hidden;
    line-height: 28px;
    color: black;
    cursor: pointer;
    font-family: -apple-system, "BlinkMacSystemFont", "Segoe UI", roboto,
        "Helvetica Neue", arial, "Noto Sans", sans-serif, "Apple Color Emoji",
        "Segoe UI Emoji";
}

.ast-dir-container {
    width: 100%;
    height: 100%;
    overflow-y: hidden;
    display: flex;
    justify-content: start;
    align-items: start;
    gap: 5px;

    .tree {
        min-width: 0;
        height: 100%;
        display: flex;
        flex-direction: column;
        flex: 40;

        .api-tree {
            flex: 1;
            overflow: auto;
        }
    }

    .control {
        height: 100%;
        min-width: 0;
        flex: 60;
        border-left: 1px solid #f0f0f0;
        padding-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: start;
        gap: 10px;
        box-sizing: border-box;

        .middle-part {
            display: flex;
            flex: 1;
            gap: 10px;
            min-height: 0px;
            flex-direction: column;

            .adding-part {
                flex: 1;
                overflow-y: auto;
            }

            .setting-part {
                width: 100%;
                display: flex;
                justify-content: start;
                align-items: start;
                flex-direction: column;
                gap: 5px;

                .item {
                    min-height: 40px;
                    width: 100%;
                    display: flex;
                    justify-content: start;
                    align-items: center;
                    gap: 5px;
                    background-color: #f0f0f0;
                    padding: 5px;
                    box-sizing: border-box;
                    border-radius: 8px;
                }

                .match-modules {
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                    gap: 5px;
                    min-height: 40px;
                    width: 100%;

                    .select {
                        background-color: #f0f0f0;
                        padding: 5px;
                        box-sizing: border-box;
                        border-radius: 8px;
                        flex: 0 0 50%;
                    }

                    .add {
                        background-color: #f0f0f0;
                        padding: 5px;
                        box-sizing: border-box;
                        border-radius: 8px;
                        font-size: 0.9rem;
                        color: #7b7b7b;
                        display: flex;
                        justify-content: end;
                        flex: 0 0 auto;
                        gap: 5px;
                    }
                }
            }
        }
    }
}

.expand-icon {
    box-sizing: border-box;
    border-radius: 4px;
    cursor: pointer;

    &:hover {
        background-color: #e6e6e6;
    }
}

.method-span {
    font-family: "JetBrains Mono", monospace;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 4px;
    border-radius: 4px;
    /* 小圆角更显硬朗高级 */
    line-height: 1;
    display: inline-flex;
    align-items: center;
    gap: 6px;
    border: 1px solid transparent;
    transition: all 0.2s;
}

/* --- 1. GET: 最轻，只读 (Light Ghost) --- */
.get {
    background-color: #f3f4f6;
    /* 极浅灰 */
    color: #52525b;
    /* 深灰字 */
    border-color: #e5e7eb;
    /* 浅边框 */
}

/* --- 2. POST: 新增，强调 (Solid Black) --- */
.post {
    background-color: #18181b;
    /* 接近纯黑 */
    color: #ffffff;
    /* 纯白字 */
    border-color: #18181b;
}

/* --- 3. PUT/PATCH: 修改，中间态 (Medium Gray) --- */
.put,
.patch {
    background-color: #e4e4e7;
    /* 中灰 */
    color: #27272a;
    /* 近黑字 */
    border-color: #d4d4d8;
}

/* --- 4. DELETE: 危险，高对比镂空 (Outlined Danger) --- */
.delete {
    background-color: transparent;
    color: #000000;
    border: 1px solid #000000;
    /* 实线黑边框，强调边界 */
    font-weight: 700;
    /*以此区分 */
}

.tree-node-father {
    width: 100%;
    display: flex;
    justify-content: space-between;
    align-items: center;

    .tree-node {
        display: flex;
        justify-content: start;
        align-items: center;
        gap: 5px;
        box-sizing: border-box;
        width: 100%;
    }
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
                min-width: 0;
                overflow: hidden;

                .g-e {
                    width: 100%;
                    text-align: center;
                }
            }

            .title-name,
            .title-update,
            .title-update-person {
                flex: 12;
            }

            .title-action {
                flex: 12;
            }

            &:hover {
                box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1);
                transform: translateY(-1px);
            }
        }
    }

    .header {
        width: 100%;
        padding: 20px 20px 0 20px;
        box-sizing: border-box;

        .inner {
            width: 100%;
            display: flex;
            justify-content: center;
            height: 40px;
            border: 2px solid #f0f0f0;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
            box-sizing: border-box;
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

        .title-name,
        .title-update,
        .title-update-person,
        .title-status {
            flex: 12;
        }

        .title-action {
            flex: 12;
        }
    }
}
</style>

<style lang="scss">
.el-tree--highlight-current .el-tree-node.is-current>.el-tree-node__content {
    background-color: var(--greyLight-0);
}

.el-tree-node__content {
    border-radius: 5px;
    display: flex;
}

.el-tree-node__label {
    width: 100%;

    .tree-node {
        width: 100%;
    }
}

.el-tree-node__expand-icon {
    display: none;
}

.icon-expanded {
    transform: rotate(90deg);
}

.private-icon {
    transition: transform 0.2s ease-in-out;
    padding: 5px;
}

.el-tree-node__children {
    transition: none !important;
}

.el-checkbox__inner {
    border-radius: 5px;
}
</style>
