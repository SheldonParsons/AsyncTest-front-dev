<template>
    <div class="ast-dir-container">
        <div class="tree">
            <div style="display: flex;justify-content: start;align-items: center;gap: 5px;">
                <img style="width: 35px;height: 35px;border-radius: 4px;object-fit: fill;" class='img'
                    src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/importer/postman.png" alt="">
                <InputAnimation v-model="filterText" :placeholder="'搜索 接口/目录名'" :maxLength="50"></InputAnimation>
            </div>
            <el-tree style="margin-top: 10px;" show-checkbox class="api-tree no-scroll" ref="treeRef"
                :key="treeKey" id="api-tree-core" :data="data.tree" node-key="id" icon="ArrowRightBold"
                :highlight-current="true" :expand-on-click-node="false" :default-expanded-keys="firstLevelKeys"
                icon-class="none" :filter-node-method="filterNode">
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
                            <div v-if="data.child_type !== 2"
                                style="display: flex;justify-content: center;align-items: center;color: black;">
                                <Fold v-if="!node.expanded"></Fold>
                                <FoldExpend v-else></FoldExpend>
                            </div>
                            <span v-if="data.child_type === 2" class="method-span gradient-text"
                                :class="method_color[data.method]">{{
                                    data.method.toUpperCase() }}</span>
                            <div class="label-span-method">
                                <div class="g-ellipsis">{{ data.name }}</div>
                                <span class="count-span" v-if="data.child_type < 2">({{ data.count }})</span>
                            </div>
                        </div>
                        <div
                            style="display: flex;align-items: center;font-size: 14px;font-weight: 400;max-width: 250px; justify-content: end;">
                            <div v-if="data.child_type === 2"
                                style="font-size: 0.9rem;font-weight: 500;color: rgb(173, 173, 173);"
                                class="g-unselect g-ellipsis">{{
                                    data.request.url.resolve_path }}</div>
                        </div>
                    </div>
                </template>
            </el-tree>
        </div>
        <div class="control">
            <div class="desc">
                <div class="title">目标目录:</div>
                <div class="current-dir">{{ target_dir ? target_dir.name : '请选择节点' }}</div>
            </div>
            <div style="display: flex;justify-content: start;align-items: center;gap: 5px;">
                <div
                    style="background-color: black;border-radius: 4px;padding: 6px 6px 8px 6px;width: 25px;height: 20px;">
                    <img style="width: 25px;height: 20px;" class='img'
                        src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_light2.svg">
                </div>
                <InputAnimation v-model="filterDirText" :placeholder="'搜索 接口/目录名'" :maxLength="50"></InputAnimation>
            </div>
            <div class="dir-tree no-scroll">
                <el-tree ref="treeRefDir" :data="targetDirSourceData" node-key="id" icon="ArrowRightBold"
                    @node-click="choice_node" :highlight-current="true" :expand-on-click-node="false" icon-class="none"
                    default-expand-all :filter-node-method="filterNode">
                    <template #default="{ node, data }">
                        <div v-if="
                            data.child_type === 0 ||
                            data.child_type === 1
                        " class="tree-node g-unselect">
                            <div class="expand-icon">
                                <el-icon v-if="data.child_type !== 2" :size="8" color="#606266" :class="node.expanded ? 'private-icon icon-expanded' : 'private-icon'
                                    " @click.stop="changeExpanded(node)">
                                    <ArrowRightBold />
                                </el-icon>
                            </div>
                            <div style="display: flex;justify-content: center;align-items: center;">
                                <Fold></Fold>
                            </div>
                            <div class="label-span-method g-ellipsis">
                                {{ data.name }}
                            </div>
                        </div>
                    </template>
                </el-tree>
            </div>
            <div class="commit run-btn" @click="run_import">
                <ImportIcon v-if="!loading"></ImportIcon>
                <div v-if="!loading" class="text">确认导入</div>
                <div v-else>
                    <LoadingMini></LoadingMini>
                </div>
            </div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { ref, onMounted, nextTick, watch } from 'vue'
import Fold from "@/assets/svg/tree/fold.vue";
import FoldExpend from "@/assets/svg/tree/fold_expend.vue";
import InputAnimation from '@/components/common/general/input.vue'
import LoadingMini from '@/assets/motion/loading_mini.vue'
import { useRoute } from "vue-router";
import { getTree } from "@/api/program/tree";
import ImportIcon from '@/assets/svg/common/import_icon.vue'
import tools from '@/utils/tools';

const route = useRoute();

const loading = ref(false)
const firstLevelKeys: any = ref([]);
const treeRef: any = ref();
const treeRefDir: any = ref()
const treeKey = ref(0)
const filterText = ref("");
const filterDirText = ref("")
const target_dir: any = ref(null)
const targetDirSourceData: any = ref([])
const checkedNodeIds: any = ref<Array<number>>([])

const props = defineProps({
    data: {
        default: null,
        type: null
    }
})

onMounted(async () => {
    // 1. 防御性编程：先判断数据是否存在，防止报错
    const rootNode = props.data?.tree?.[0]
    if (!rootNode) return

    // 2. 设置默认展开 (数据层面的操作，不需要等待)
    // 直接赋值比 push 更干净，除非你需要保留之前的 keys
    firstLevelKeys.value = [rootNode.id]

    // 3. 等待 DOM 更新
    // Element Plus 的 Tree 组件需要 DOM 渲染完成后才能通过方法(setChecked)操作节点
    await nextTick()

    // 4. 设置默认勾选
    // 这里的 ?. 是防止 treeRef 为空
    treeRef.value?.setChecked(rootNode.id, true, true)

    // 获取目标目录tree
    targetDirSourceData.value = [];
    const data = {
        project: route.params.project,
        search_range: "0,1",
        excluded_ids: "",
        search_all: true,
        type: 0,
    };
    console.log(data);

    getTree(data).then((data: any) => {
        targetDirSourceData.value.push(data[0]);
    });
})

watch(filterText, (val: any) => {
    treeRef.value!.filter(val);
});



watch(filterDirText, (val: any) => {
    treeRefDir.value!.filter(val);
});

const method_color: any = {
    get: "green",
    post: "orange",
    put: "blue",
    delete: "red",
};

function setChecked() {
    treeRef.value.getCheckedNodes(false, true).forEach((item: any) => checkedNodeIds.value.push(item.id))
}

async function run_import() {
    window.$toast({title: '该功能暂未开放，敬请期待。'})
    return
    if (loading.value === true) return
    setChecked()
    if (!check()) {
        return
    }
    loading.value = true
    setTimeout(() => {
        loading.value = false
        window.$toast({title: '该功能暂未开放，敬请期待。'})
    }, 2000)
}

function check() {
    console.log(checkedNodeIds.value);

    if (target_dir.value === null) {
        tools.message("请选择目标目录")
        return false
    } else if (checkedNodeIds.value.length === 0) {
        tools.message("请至少选择一个接口进行导入")
        return false
    }

    return true
}

function choice_node(data: any, node: any, event: any, event_object: any) {
    target_dir.value = data;
}

const filterNode = (value: any, data: any) => {
    if (!value) return true;
    return data.name.includes(value);
};


async function changeExpanded(node: any) {
    if (node.expanded) {
        node.collapse();
        const index = firstLevelKeys.value.indexOf(node.data.id);
        if (index !== -1) {
            firstLevelKeys.value.splice(index, 1);
        }
    } else {
        node.expand();
        firstLevelKeys.value.push(node.data.id)
    }
}
</script>

<style lang="scss" scoped>
.tree-content-dropdown {
    overflow: scroll;
    margin-bottom: 20px;
}

.tree-node {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 100%;
    z-index: 9999;
}

.el-tree-node__expand-icon {
    color: var(--global-theme-color);
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
    // height: 500px;
    width: 100%;
    height: 100%;
    overflow-y: hidden;
    display: flex;
    justify-content: start;
    align-items: start;
    gap: 5px;

    .tree {
        width: 50%;
        height: 100%;
        display: flex;
        flex-direction: column;

        .api-tree {
            flex: 1;
            overflow: auto;
        }
    }

    .control {
        height: 100%;
        width: 50%;
        border-left: 1px solid #f0f0f0;
        padding-left: 10px;
        display: flex;
        flex-direction: column;
        justify-content: start;
        gap: 10px;
        box-sizing: border-box;

        .commit {
            .text {
                font-size: 0.9rem;
                font-weight: 500;
            }
        }

        .run-btn {
            width: 100%;
            height: 35px;
            display: flex;
            justify-content: center;
            align-items: center;
            color: white;
            font-size: 14px;
            font-weight: 500;
            gap: 5px;
            /* 核心修改 */
            border: none;
            /* 移除边框，让渐变和阴影成为主体 */
            background: linear-gradient(90deg, #d5613a, #ff4800, #d53a3a);
            /* 柔和的蓝-青渐变 */
            background-size: 200% 200%;
            animation: gradient-move 2s ease-in-out infinite;
            /* 动画更平滑，时间更长 */
            padding: 4px;
            border-radius: 6px;
            /* 更圆润的边角 */
            box-sizing: border-box;
            cursor: pointer;
            transition: all 0.3s ease;
            margin-bottom: 10px;
        }

        /* 增强交互反馈 */
        .run-btn:hover {
            transform: translateY(-2px);
        }

        .run-btn:active {
            transform: translateY(0);
        }

        @keyframes gradient-move {
            0% {
                background-position: 0% 50%;
            }

            50% {
                background-position: 100% 50%;
            }

            100% {
                background-position: 0% 50%;
            }
        }


        .desc {
            display: flex;
            justify-content: start;
            align-items: center;
            gap: 5px;

            .title {
                font-size: 0.9rem;
            }

            .current-dir {
                font-size: 14px;
                line-height: 14px;
                border-radius: 4px;
                min-height: 16px;
                color: rgb(174, 174, 174);
            }
        }

        .dir-tree {
            padding: 4px;
            border: 3px dotted rgb(174, 174, 174);
            border-radius: 4px;
            overflow: auto;
            flex: 1;
        }
    }
}

.expand-icon {
    box-sizing: border-box;
    border-radius: 4px;
    cursor: pointer;
}

.expand-icon:hover {
    background-color: #e6e6e6;
}

.count-span {
    font-size: 12px;
    margin-left: 5px;
    color: var(--default-font-color);
}

.action-list {
    padding-top: 5px;
    display: flex;
    flex-direction: column;
    gap: 3px;

    .action-item:hover {
        background-color: var(--default-bg);
    }

    .action-delete-item:hover {
        background-color: var(--delete-bg-color) !important;
        color: var(--delete-font-color);
    }

    .action-delete-item {
        cursor: pointer;
        display: flex;
        justify-content: space-between !important;
        align-items: center;

        .delete-icon {
            padding-right: 10px;
        }
    }

    .delete-front-item {
        display: flex;
        align-items: center;
        justify-content: start;
        gap: 5px;
    }

    .action-item {
        cursor: pointer;
        padding-left: 10px;
        height: 2rem;
        font-size: 14px;
        font-weight: 400;
        border-radius: 5px;
        display: flex;
        justify-content: start;
        align-items: center;
        gap: 5px;

        .action-icon {
            width: 1.3rem;
            height: 1.3rem;

            svg {
                width: 1.3rem;
                height: 1.3rem;
            }
        }
    }
}

.action-icon {
    width: 1.2em;
    height: 1.2em;

    path {
        fill: white;
    }
}

.action-header {
    height: 30px;
    padding-left: 10px;
    font-size: 14px;
    font-weight: 500;
    display: flex;
    justify-content: start;
    align-items: center;
}

.change-name {
    padding: 5px;
    display: flex;
    justify-content: space-between;
    align-items: center;
}

.more-action-div {
    width: 300px;
}

.menu-btn {
    width: 1em !important;
    height: 1em !important;
}

.hover-menu-box {
    width: 2rem;
    height: 1.5rem;
    margin-right: 5px;
}

.project-summary {
    font-size: 14px;
    padding: 5px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    color: black;
    font-weight: 600;
    background-color: #f9f9f9;
    cursor: pointer;
}

.tree-div {
    height: calc(100vh - 313px);
}

.red {
    background: linear-gradient(180deg, black 0%, #9c4c4c 30%);
}

.green {
    background: linear-gradient(180deg, black 0%, #4fa380 50%);
}

.blue {
    background: linear-gradient(180deg, black 0%, #504c9d 30%);
}

.orange {
    // color: #eead0e;
    background: linear-gradient(180deg, black 0%, #b87e52 50%);
}

.gradient-text {
    /* 定义背景渐变 */
    /* 将背景裁剪到文字（仅 WebKit 内核生效）*/
    -webkit-background-clip: text;
    /* 文字本身透明，这样才能显示背景 */
    -webkit-text-fill-color: transparent;
    /* 对非 WebKit 浏览器，也可以加上普通 background-clip */
    background-clip: text;
    /* 如果希望支持 Firefox，需要开启 text-fill-color 的标准属性（目前仍需前缀或兼容写法） */
    color: transparent;
    font-weight: 800;
}

.purple {
    background: linear-gradient(to right, #7b42f6, #b01eff);
    /* 从左到右的渐变 */
    -webkit-background-clip: text;
    /* 背景裁剪为文字 */
    color: transparent;
    font-size: 12px !important;
}

.method-span {
    font-weight: 500;
    font-size: 10px;
    text-align: right;
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif;
}

.label-span {
    display: flex;
    align-items: center;
    font-size: 12px;
    font-weight: 500;
    width: 80%;
    padding-left: 5px;
}

.label-span-method {
    display: flex;
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

.custom-tree-node {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: space-between;
    font-size: 14px;
    padding-right: 8px;
}

.el-tree-node__expand-icon {
    color: var(--global-theme-color);
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
        width: calc(100% - 250px);
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

.private-right-icon {
    transition: transform 0.2s ease-in-out;
    margin-left: 5px;
    margin-top: 3px;
}

.case-node {
    margin-left: 10px;
}

/* 禁用 el-tree 节点的展开/收起动画 */
.el-tree-node__children {
    transition: none !important;
}

.el-tree-node__expand-icon {
    transition: none !important;
}

.el-checkbox__inner {
    border-radius: 5px;
}
</style>