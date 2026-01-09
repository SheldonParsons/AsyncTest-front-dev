<template>
    <el-tree v-if="loading === false" style="margin-top: 10px;" class="api-tree" :key="treeKey" id="api-tree-core"
        ref="treeRef" draggable :data="dataSource" node-key="id" icon="ArrowRightBold" @node-click="changeMenu"
        :highlight-current="true" :expand-on-click-node="false" :default-expanded-keys="firstLevelKeys"
        icon-class="none" :filter-node-method="filterNode">
        <template #default="{ node, data }">
            <div v-if="
                data.child_type === 0 ||
                data.child_type === 1 ||
                data.child_type === 2
            " class="tree-node g-unselect" @mouseenter="current_node = data.id" @mouseleave="current_node = -1">
                <!-- <NodeWatcher :node="node" :data="data" @node-expanded="onExpand" @node-collapsed="onCollapse">
                </NodeWatcher> -->
                <div class="expand-icon">
                    <LoadingMini v-if="data.child_type !== 2 && current_loading_node === data.id"></LoadingMini>
                    <el-icon v-if="data.child_type !== 2 && current_loading_node !== data.id" :size="8" color="#606266"
                        :class="node.expanded ? 'private-icon icon-expanded' : 'private-icon'
                            " @click.stop="changeExpanded(node)">
                        <ArrowRightBold />
                    </el-icon>
                </div>
                <div v-if="node.level === 1" style="
                display: flex;
                justify-content: center;
                align-items: center;
                color: black;
              ">
                    <div style="width: 20px;">
                        <img style="width: 20px;"
                            src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/IntelliJ_IDEA_Icon.svg"
                            alt="IntelliJ IDEA" width="80">
                    </div>
                </div>
                <div v-if="data.child_type !== 2 && node.level !== 1 && data.code_type !== 2" style="
                display: flex;
                justify-content: center;
                align-items: center;
                color: black;
              ">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 16 16">
                        <g fill="none" fill-rule="evenodd">
                            <path fill="#9AA7B0" fill-opacity=".8"
                                d="M7.9844,4 L6.6964,2.711 C6.3044,2.32 5.5324,2 4.9784,2 L1.0504,2 C1.0234,2 1.0004,2.022 1.0004,2.051 L1.0004,13 L9.0004,13 L9.0004,9 L15.0004,9 L15.0004,4 L7.9844,4 Z" />
                            <polygon fill="#40B6E0" points="10 16 16 16 16 10 10 10" />
                        </g>
                    </svg>
                </div>
                <div v-if="data.child_type !== 2 && node.level !== 1 && data.code_type === 2" style="
                display: flex;
                justify-content: center;
                align-items: center;
                color: black;
              ">
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
                <span v-if="data.child_type === 2" class="method-span gradient-text"
                    :class="method_color[data.method.toLowerCase()]">{{
                        data.method.toUpperCase() }}</span>
                <div class="label-span-method">
                    <div class="g-ellipsis">{{ getName(data) }}</div>
                </div>
            </div>
        </template>
    </el-tree>
    <el-row v-else class="url-inputer">
        <el-col :span="22" :offset="1">
            <el-skeleton animated>
                <template #template>
                    <el-skeleton-item variant="h1" style="width: 100%" />
                    <div v-for="item in 15" style="margin-top: 10px">
                        <el-skeleton-item variant="h1" :style="{ width: 10 + '%' }" />
                        <el-skeleton-item variant="h1" :style="{ width: randomStep() + '%' }" style="margin-left: 5%" />
                    </div>
                </template>
            </el-skeleton>
        </el-col>
    </el-row>
    <SimpleDialog v-model="show_dialog" @action="real_action" :title="dialog_title" :placeholder="dialog_placeholder"
        :action_title="'新建'"></SimpleDialog>
    <TreeDialog v-model="show_tree_dialog" v-if="show_tree_dialog" :excluded_id="excluded_id" :move_name="move_name"
        @action="move_node">
    </TreeDialog>
</template>


<script lang="ts" setup>
import { ref, watch, onMounted, getCurrentInstance, nextTick } from "vue";
import tools from "@/utils/tools";
import { ElTree } from "element-plus";
import { getOuterTree, ApiActionApiTree } from "@/api/program/tree";
import { useRoute } from "vue-router";
import SimpleDialog from "@/views/api/public_dialog/simple_dialog.vue";
import TreeDialog from "@/views/api/public_dialog/tree_select_dialog.vue";
import { GlobalState } from "@/state/index";
import LoadingMini from '@/assets/motion/loading_mini.vue'
import _ from 'lodash'
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const method_color: any = {
    get: "green",
    post: "orange",
    put: "blue",
    delete: "red",
    patch: "blue"
};
const emit = defineEmits(["changeMenu", "switchRouterAction"]);
const dataSource: any = ref<Tree[]>([]);
const treeRef: any = ref<InstanceType<typeof ElTree>>();
const filterText = ref("");
const current_node = ref(-1);
const show_popover = ref(true);
const awalys_show_popover = ref(-1);
const loading = ref(false);
const show_dialog = ref(false);
const show_tree_dialog = ref(false);
const dialog_title = ref("");
const dialog_placeholder = ref("");
const current_action_data: any = ref();
const firstLevelKeys: any = ref([]);
const excluded_id: any = ref([]);
const move_name = ref("");
const current_highlight_node = ref(-1);
const treeKey = ref(0)
const isFristenter = ref(true)
const dropIndicatorState = ref<any>({});
const origin_tree: any = ref(null)
const current_paste_object: any = ref(null)
const current_loading_node: any = ref(-1)
const imporDialogtRef: any = ref(null)

onMounted(async () => {
    await load_tree();
});

async function checkImport() {
    return true
}

function getName(data: any) {
    if ((data.child_type === 1 && data.code_type === 2) || (data.child_type === 2 && data.code_type === 3)) {
        if (data.alias.length !== 0) {
            return data.alias
        }
        return data.name
    }
    return data.name
}

async function load_tree() {
    if (isFristenter.value === true) {
        loading.value = true;
    }
    const data = {
        project: route.params.project
    };
    dataSource.value = await get_tree_data(data)
    // console.log(newRoot);


    // // ✅ 正确做法：直接把从接口拿回来的数组赋值给 dataSource
    // // 这样会重置数组长度，清除掉所有残留的旧节点
    // if (newRoot && newRoot.length > 0) {
    //     dataSource.value = [newRoot[0]]; // 如果你确定只需要第一个节点作为根
    //     // 或者直接 dataSource.value = newRoot; // 如果接口本身就是标准的树数组
    // } else {
    //     dataSource.value = []; // 防止接口返回空时报错
    // }

    console.log(dataSource.value[0])

    // 注意：这里要判空，防止数组为空时报错
    if (dataSource.value[0]) {
        firstLevelKeys.value.push(dataSource.value[0].id)
    }

    await tools.delay();
    if (isFristenter.value = true) {
        loading.value = false;
        isFristenter.value = false
    }
    await nextTick();
}

async function get_tree_data(_data: any) {
    return await getOuterTree(_data).then((newData: any) => {
        return newData
    })
}

// ⭐ 新增：拖拽逻辑处理函数
// ===============================================

/**
 * 规则1：判断节点是否允许被拖拽
 * @param {object} draggingNode - 被拖拽的节点
 */
const allowDrag = (draggingNode: any) => {
    // 根节点（level 为 1）不允许拖拽
    if (draggingNode.level === 1) {
        return false;
    }
    return true;
};

/**
 * 规则2 & 3：判断节点是否允许被放置
 * @param {object} draggingNode - 被拖拽的节点
 * @param {object} dropNode - 目标节点
 * @param {string} type - 放置类型 ('prev', 'inner', 'next')
 */
const allowDrop = (draggingNode: any, dropNode: any, type: string) => {
    // 不允许拖拽到根节点之外
    if (dropNode.level === 1 && type !== 'inner') {
        return false;
    }
    // 不允许拖拽到 "用例" (child_type === 3) 节点的内部
    if (dropNode.data.child_type === 3 && type === 'inner') {
        return false;
    }
    // 不允许将自己拖拽到自己内部
    if (draggingNode.key === dropNode.key && type === 'inner') {
        return false;
    }
    return true;
};

const handleDragStart = async (node: any, ev: any) => {
    let dragImage = null
    origin_tree.value = _.cloneDeep(dataSource.value)

    dragImage = ev.target as HTMLElement
    if (dragImage) {
        ev.dataTransfer?.setDragImage(dragImage, 0, 0)
    }
}

/**
 * 拖拽经过其他节点时触发，用于显示视觉反馈
 */
// ⭐ 修改：用于追踪样式的变量
let lastStyledElement: any = { el: null, styleType: '' };

/**
 * ⭐ 修改：重构样式重置函数
 * 清除上一个被添加了拖拽样式的节点
 */
const resetLastNodeStyle = () => {
    if (lastStyledElement.el) {
        const el = lastStyledElement.el;
        // 移除所有可能添加的内联样式
        el.style.borderTop = '';
        el.style.borderBottom = '';
        el.style.borderRadius = '';
        // 移除闪烁的 class
        el.classList.remove('flashing-node-drag');
    }
    lastStyledElement = { el: null, styleType: '' };
};
/**
 * ⭐ 核心修改：拖拽经过其他节点时触发
 */
let customDropType: any = ref('');
const handleNodeDragOver = (draggingNode: any, dropNode: any, event: DragEvent) => {
    const targetNodeContent: any = (event.target as HTMLElement).closest('.el-tree-node__content');
    customDropType.value = '';

    if (!targetNodeContent || !dropNode || !dropNode.key) {
        resetLastNodeStyle();
        return;
    }

    // 先清除上一次的样式，准备应用新样式
    resetLastNodeStyle();

    const rect = targetNodeContent.getBoundingClientRect();
    const mouseY = event.clientY;

    // --- 规则1：根节点不允许上方放置 ---
    const isTopHalf = mouseY < rect.top + rect.height / 2;
    if (dropNode.level === 1 && (mouseY < rect.top + rect.height)) {
        // 如果是根节点，并且鼠标在其上半部分，则不做任何操作
        return;
    }

    // --- 规则2：统一边框显示逻辑 ---
    let dropType = '';
    const height = rect.bottom - rect.top

    // 目录节点（可以有子节点）
    if (dropNode.data.child_type !== 3) {
        const topZoneEndY = rect.top + (height * 0.2);
        const bottomZoneStartY = rect.top + (height * 0.8);

        if (mouseY < topZoneEndY) {
            dropType = 'before';
        } else if (mouseY > bottomZoneStartY) {
            dropType = 'after';
        } else {
            dropType = 'inner';
        }
    }
    // 用例节点（不能有子节点）
    else {
        if (isTopHalf) {
            dropType = 'before';
        } else {
            dropType = 'after';
        }
    }

    customDropType.value = dropType;

    // --- 应用样式 ---
    if (dropType === 'inner') {
        targetNodeContent.classList.add('flashing-node-drag');
        lastStyledElement = { el: targetNodeContent, styleType: 'flashing' };
    } else if (dropType === 'before') {
        targetNodeContent.style.borderTop = '2px solid black';
        targetNodeContent.style.borderRadius = '0 0 4px 4px';
        lastStyledElement = { el: targetNodeContent, styleType: 'border-top' };
    } else if (dropType === 'after') {
        // 寻找下一个兄弟节点来应用 top-border，以实现平滑过渡
        const parentNodeEl = targetNodeContent.parentElement;
        const nextSiblingNodeEl = parentNodeEl?.nextElementSibling;

        if (nextSiblingNodeEl && nextSiblingNodeEl.classList.contains('el-tree-node')) {
            const nextNodeContent = nextSiblingNodeEl.querySelector('.el-tree-node__content') as HTMLElement | null;
            if (nextNodeContent) {
                nextNodeContent.style.borderTop = '2px solid black';
                nextNodeContent.style.borderRadius = '0 0 4px 4px';
                lastStyledElement = { el: nextNodeContent, styleType: 'border-top' };
            }
        } else {
            if (dropNode.data.child_type !== 3 && dropNode.expanded && parentNodeEl) {
                // 是展开的目录：将样式应用到父容器(.el-tree-node)上
                parentNodeEl.style.borderBottom = '2px solid var(--global-theme-color)';
                // 对父容器应用圆角可能不会直接显示，但这在逻辑上是正确的
                parentNodeEl.style.borderRadius = '0 0 4px 4px';
                lastStyledElement = { el: parentNodeEl, styleType: 'border-bottom' };
            } else {
                // 不是展开的目录（是用例或折叠的目录）：按原样样式化节点本身
                targetNodeContent.style.borderBottom = '2px solid black';
                targetNodeContent.style.borderRadius = '4px 4px 0 0';
                lastStyledElement = { el: targetNodeContent, styleType: 'border-bottom' };
            }
        }
    }
};

/**
 * 拖拽离开一个节点时触发，用于清除视觉反馈
 */
const handleNodeDragLeave = (draggingNode: any, leaveNode: any) => {
    // 清空指示器状态
    dropIndicatorState.value = {};
};


function findNodeAndParent(tree: Tree[], nodeId: number, parent: any = null): { node: Tree; parent: any; index: number } | null {
    for (let i = 0; i < tree.length; i++) {
        const node = tree[i];
        if (node.id === nodeId) {
            // 在顶层找到了
            return { node, parent: { children: tree, obj: parent }, index: i };
        }
        if (node.children) {
            const found = findNodeAndParent(node.children, nodeId, node);
            if (found) {
                // 在子节点中找到了
                return found;
            }
        }
    }
    return null;
}


const handleNodeDrop = async (draggingNode: any, dropNode: any, dropType: string) => {
    // 1. 立即清理UI样式
    resetLastNodeStyle();

    const finalDropType = customDropType.value;
    if (!finalDropType) {
        return false;
    }

    const sourceInfo: any = findNodeAndParent(origin_tree.value, draggingNode.data.id);
    const targetInfo: any = findNodeAndParent(origin_tree.value, dropNode.data.id);

    // 确保两个节点都找到了
    if (!sourceInfo || !targetInfo) {
        return false;
    }

    // 2. 现在，在原始的、未被修改的树上进行位置比较
    let hasPositionChanged = true;
    if (sourceInfo.node.id === targetInfo.node.id) {
        // 场景一：拖拽到自身
        hasPositionChanged = false;
    } else if (sourceInfo.parent.obj.id === targetInfo.parent.obj.id) { // 现在这个比较是可靠的
        if (finalDropType === 'before' && sourceInfo.index === targetInfo.index - 1) {
            // 场景二：本来就在目标节点的前一个位置
            hasPositionChanged = false;
        } else if (finalDropType === 'after' && sourceInfo.index === targetInfo.index + 1) {
            // 场景三：本来就在目标节点的后一个位置
            hasPositionChanged = false;
        }
    }

    // 3. 如果位置没有变化，则直接中止，不执行任何修改
    if (!hasPositionChanged) {
        dataSource.value = origin_tree.value;
        return false;
    }
    function _miner_callback(_node: any) {
        if (sourceInfo.node.child_type === 1) {
            _node.count -= sourceInfo.node.count;
        } else {
            _node.count -= 1;
        }
    }
    // change
    // 5. 调用API
    try {
        await update_tree_position(finalDropType, draggingNode.data.id, dropNode.data.id);
        window.$toast({ title: "节点移动成功", type: 'success' });
    } catch (error) {
        window.$toast({ title: "节点移动失败", type: 'error' });
        await load_tree();
    }
    applyCallbackToParents(origin_tree.value, sourceInfo.node.id, _miner_callback)
    sourceInfo.parent.children.splice(sourceInfo.index, 1);
    const sourceNodeData: any = sourceInfo.node;

    // b. 将节点插入到新位置
    if (finalDropType === 'inner') {
        if (!targetInfo.node.children) {
            targetInfo.node.children = [];
        }
        targetInfo.node.children.push(sourceNodeData);
        targetInfo.node.children.push(sourceNodeData);
        function _add_callback(_node: any) {
            if (sourceNodeData.child_type === 1) {
                _node.count += sourceNodeData.count;
            } else {
                _node.count += 1;
            }
        }
        applyCallbackToParents(origin_tree.value, sourceNodeData.id, _add_callback)
    } else {
        // 注意：因为我们已经 splice 了一次，目标节点的父级 children 数组可能已变化
        // 所以需要重新找到 targetIndex
        const targetParentChildren = targetInfo.parent.children;
        const currentTargetIndex = targetParentChildren.findIndex((node: any) => node.id === targetInfo.node.id);
        if (finalDropType === 'before') {
            targetParentChildren.splice(currentTargetIndex, 0, sourceNodeData);
        } else if (finalDropType === 'after') {
            targetParentChildren.splice(currentTargetIndex + 1, 0, sourceNodeData);
        }
        function _add_callback2(_node: any) {
            if (sourceNodeData.child_type === 1) {
                _node.count += sourceNodeData.count;
            } else {
                _node.count += 1;
            }
        }
        applyCallbackToParents(origin_tree.value, sourceNodeData.id, _add_callback2)
    }
    dataSource.value = origin_tree.value;
    return false;
};


async function update_tree_position(drop_type: string, node_id: number, target_node_id: number) {
    const _data = {
        type: 2,
        child_action_type: 'change_position',
        content: {
            position_type: drop_type,
            node_id: node_id,
            target_node_id: target_node_id
        },
    };
    const result = send_action(_data)
}

function randomStep() {
    const step = 10;
    const min = 50;
    const max = 75;
    return Math.floor(Math.random() * ((max - min) / step + 1)) * step + min;
}


const props = defineProps({
    apiItem: {
        type: Object,
        default: () => {
            return {};
        },
    },
    activeLinkStyle: {
        type: String,
        default: "0",
    },
});

watch(filterText, (val: any) => {
    treeRef.value!.filter(val);
});
watch(
    () => props.apiItem,
    (val) => {
    }
);
watch(
    () => GlobalState.count,
    async (newCount) => {
        if (
            GlobalState.message === "change_dir_tab" ||
            GlobalState.message === "change_interface_tab"
        ) {
            console.log(GlobalState.data.id);
            
            const node_id: number = GlobalState.data.id;
            await highlightNodeById(node_id);
        } else if (GlobalState.message === "change_empty_tab") {
            await highlightNodeById(undefined);
        } else if (GlobalState.message === "update_interface_name") {
            const node = get_tree_node_by_id(
                dataSource.value[0],
                GlobalState.data.node_id
            );
            if (node) {
                node.name = GlobalState.data.name;
            }
        } else if (GlobalState.message === "update_interface_method") {
            const node = get_tree_node_by_id(
                dataSource.value[0],
                GlobalState.data.node_id
            );
            if (node) {
                node.method = GlobalState.data.method;
            }
        } else if (GlobalState.message === "create_interface_under_root") {
            const root_node = find_root();
            current_action_data.value = {
                type: 1,
                child_action_type: "create_interface_under_dir",
                content: {
                    parent_node: root_node.id,
                    name: "新建接口",
                },
            };
            const data: any = await send_action(current_action_data.value);
            window.$toast({ title: '创建成功', type: 'success' })
            dataSource.value[0].children?.push(make_new_node(data))
            function _add_callback(_node: any) {
                _node.count += 1;
            }
            applyCallbackToParents(dataSource.value, data.id, _add_callback)
            highlightNodeById(data.id);
            const _data = {
                id: data.id,
                name: data.name,
                method: data.target.method,
                target: data.target.id,
                child_type: data.child_type,
            };
            changeMenu(_data, null, null, null);
        } else if (GlobalState.message === "reload_tree") {
            save_current_hightlight();
            await load_tree();
            highlightNodeById(current_highlight_node.value);
        } else if (GlobalState.message === 'rollback_node_highlight') {
            highlightNodeById(GlobalState.data.id);
        }
    }
);

function make_new_node(data: any) {
    return {
        id: data.id,
        name: data.name,
        type: data.type,
        child_type: data.child_type,
        method: data.method,
        count: data.count,
        children: [],
        target: data.content_id,
        is_reference: false
    }
}

function find_root() {
    return treeRef.value?.root.data[0];
}

function get_tree_node_by_id(tree: Tree, target_id: number) {
    const stack = [tree];

    while (stack.length > 0) {
        const currentNode: any = stack.pop();

        if (currentNode.id === target_id) {
            return currentNode;
        }

        if (currentNode.children?.length) {
            stack.push(...[...currentNode.children].reverse());
        }
    }

    return false;
}

async function highlightNodeById(id: string | number | undefined) {
    await nextTick(async () => {
        // 强制重新渲染树组件
        treeKey.value += 1

        // 等组件重新渲染后设置高亮
        await nextTick(async () => {
            treeRef.value?.setCurrentKey(id)
            await nextTick(); // 确保 DOM 已全部挂载
        })
    })
}

function save_current_hightlight() {
    const currentNode = treeRef.value?.getCurrentNode();
    current_highlight_node.value = currentNode?.id;
}

async function chang_node_name(data: any) {
    if (data.child_type === 0) {
        tools.message("全局管理节点名称无法修改", proxy, "info");
        return;
    }
    const _data = {
        type: 2,
        child_action_type: "change_name",
        content: {
            node: data.id,
            name: data.name,
        },
    };
    await send_action(_data);
    tools.message("更新成功", proxy, "success");
    GlobalState.sendMessage(
        "change_name_from_tree",
        (data = {
            node_id: data.id,
            name: data.name,
        })
    );
}

async function send_action(data: any) {
    return await ApiActionApiTree(data).then((data: any) => {
        if (result_check(data) === false) return;
        current_node.value = -1;
        awalys_show_popover.value = -1;
        show_popover.value = false;
        setTimeout(() => {
            show_popover.value = true;
        }, 200);
        return data;
    });
}

async function clean_popover() {
    awalys_show_popover.value = -1;
    show_popover.value = false;
    setTimeout(() => {
        show_popover.value = true;
    }, 0);
}

function result_check(data: any) {
    if (data.hasOwnProperty("result") && data.result === 0) {
        tools.message(data.data, proxy, "error");
        return false;
    }
    return true;
}

function parseChromeFetch(fetchString: string) {
    try {
        let s = fetchString.trim();

        // 1. 基础验证
        if (!s.startsWith('fetch(') || !s.endsWith(');')) {
            window.$toast({ title: "无效的 'fetch' 格式，请确认您的粘贴板内容。", type: 'error' })
            return false
        }

        const content = s.substring(6, s.length - 2);

        const jsonString = `[${content}]`;

        let url: string;
        let options: any;

        try {
            [url, options] = JSON.parse(jsonString);
        } catch (error) {
            window.$toast({ title: '解析失败，请检查您粘贴板的字符串', type: 'error' })
            return false
        }


        // 5. 提取并构造最终结果
        const result = {
            url: url,
            method: options.method || 'GET', // 如果没有 method，默认为 GET
            headers: options.headers || {},
            body: options.body || null // body 可能是 null，也可能是一个字符串
        };

        if (typeof result.body === 'string') {
            try {
                result.body = JSON.parse(result.body);
            } catch (e) {
            }
        }

        return result;

    } catch (error) {
        console.error("解析 fetch 字符串失败:", error);
        if (error instanceof SyntaxError) {
            throw new Error("解析剪贴板内容失败。请确保内容是合法的 'Copy as fetch' 字符串。");
        }
        throw error; // 抛出其他错误 (例如我们的自定义错误)
    }
}

const current_tree_node: any = ref()

async function action(father: number, action_type: string, data: any, node = null) {
    clean_popover()
    if (action_type === 'import_content') {
        const result = await imporDialogtRef.value.open()
        return
    }
    if (action_type === 'create_interface_under_dir_by_paste') {
        const textFromClipboard = await navigator.clipboard.readText();
        const paste_value = parseChromeFetch(textFromClipboard)
        if (paste_value === false) return
        current_paste_object.value = paste_value
        show_dialog.value = true;
        dialog_title.value = "新建接口";
        dialog_placeholder.value = "请输入接口名称";
        current_action_data.value = {
            type: father,
            child_action_type: 'create_interface_under_dir',
            content: {
                parent_node: data.id,
            },
        };
        current_tree_node.value = node
    }
    if (action_type === "create_child_dir") {
        show_dialog.value = true;
        dialog_title.value = "新建子目录";
        dialog_placeholder.value = "请输入子目录名称";
        current_action_data.value = {
            type: father,
            child_action_type: action_type,
            content: {
                parent_node: data.id,
            },
        };
        current_tree_node.value = node
        save_current_hightlight();
    }
    if (action_type === "create_interface_under_dir") {
        show_dialog.value = true;
        dialog_title.value = "新建接口";
        dialog_placeholder.value = "请输入接口名称";
        current_action_data.value = {
            type: father,
            child_action_type: action_type,
            content: {
                parent_node: data.id,
            },
        };
        current_tree_node.value = node
    }
    if (action_type === "copy_node") {
        current_action_data.value = {
            type: father,
            child_action_type: action_type,
            content: {
                node: data.id,
            },
        };
        const result = await send_action(current_action_data.value);
        if (result !== false) {
            const search_node = searchNode(dataSource.value, result.parent_node)
            search_node.children.push(make_new_node(result))
            function _add_callback(_node: any) {
                if (result.child_type === 1) {
                    _node.count += result.count
                } else {
                    _node.count += 1
                }
            }
            applyCallbackToParents(dataSource.value, result.id, _add_callback)

            tools.message("复制成功", proxy, "success");
            save_current_hightlight();
            await highlightNodeById(current_highlight_node.value);
        }
    }
    if (action_type === "move_to") {
        current_action_data.value = {
            type: father,
            child_action_type: action_type,
            content: {
                node: data.id,
            },
        };
        show_tree_dialog.value = true;
        excluded_id.value = data.id;
        move_name.value = data.name;
        save_current_hightlight();
    }
    if (action_type === "delete_node") {
        current_action_data.value = {
            type: father,
            child_action_type: action_type,
            content: {
                node: data.id,
            },
        };
        const delete_all_nodes = collectAllIds(data);

        await send_action(current_action_data.value);
        tools.message("删除成功", proxy, "success");
        function _miner_callback(_node: any) {
            if (data.child_type === 2 || data.child_type === 3) {
                _node.count -= 1
            } else {
                _node.count -= data.count
            }
        }
        applyCallbackToParents(dataSource.value, data.id, _miner_callback)
        deleteNode(dataSource.value, data.id)
        // 如果为接口节点，更新全局缓存接口节点
        if (data.child_type === 2) {
            GlobalState.deleteCacheInterface(delete_all_nodes);
        }
        GlobalState.sendMessage("delete_nodes", { ids: delete_all_nodes });
    }
}

function collectAllIds(treeNode: any) {
    const result: Array<any> = [];

    function traverse(node: any) {
        result.push(node.id);
        if (Array.isArray(node.children)) {
            node.children.forEach(traverse);
        }
    }

    traverse(treeNode);
    return result;
}

async function move_node(data: any) {
    if (data === undefined) {
        tools.message("请正确选择目标节点", proxy, "error");
        return;
    }
    current_action_data.value.content.target_node = data.id;
    await send_action(current_action_data.value);
    tools.message("移动成功", proxy, "success");
    show_tree_dialog.value = false;
    await load_tree();
    highlightNodeById(current_highlight_node.value);
}

async function real_action(name: string) {
    current_action_data.value.content.name = name;
    const data: any = await send_action(current_action_data.value);
    window.$toast({ title: '创建成功', type: 'success' })
    show_dialog.value = false;
    const parent_dir = searchNode(dataSource.value, current_action_data.value.content.parent_node)
    const new_data = make_new_node(data)
    parent_dir.children.push(new_data)
    function _add_callback(_node: any) {
        if (data.child_type !== 1) {
            _node.count += 1
        }
    }
    applyCallbackToParents(dataSource.value, data.id, _add_callback)
    highlightNodeById(data.id);
    const _data = {
        id: data.id,
        name: data.name,
        method: data.target.method,
        target: data.target.id,
        child_type: data.child_type,
        current_paste_object: current_paste_object
    };
    changeMenu(_data, null, null, null);
}

const filterNode = (value: any, data: any) => {
    if (!value) return true;
    return data.name.includes(value);
};
interface Tree {
    id: number;
    name: string;
    child_type: Number;
    m?: Number;
    children?: Tree[];
}

function changeMenu(data: any, node: any, event: any, event_object: any) {
    if (data.child_type === 2) {
        send_message_to_tab("click_interface", data, node);
    } else {
        send_message_to_tab("click_outer_interface", data, node);
    }
    // if (data.child_type === 1) {
    //     send_message_to_tab("click_dir", data, node);
    // } else if (data.child_type === 2) {
    //     send_message_to_tab("click_interface", data, node);
    // } else if (data.child_type === 0) {
    //     send_message_to_tab("click_root_dir", data, node);
    // }
}

function send_message_to_tab(type = "", core_data: any, node: any) {
    const data = {
        type: type,
        data: core_data,
        node: node,
    };
    emit("changeMenu", data);
}

function enter_project_summary() {
    tools.message("暂未开放，敬请期待", proxy, "info");
}

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

async function onExpand(data: any, node: any) {
    const params = {
        project: route.params.project,
        search_range: '0,1,2',
        excluded_ids: '',
        node_id: node.data.id
    }
    current_loading_node.value = data.id
    const replace_item = searchNode(dataSource.value, node.data.id)
    replace_item.children = []
    const search_data = await get_tree_data(params)
    replaceChildrenData(search_data[0].children, replace_item)
    current_loading_node.value = -1
    const index = firstLevelKeys.value.indexOf(data.id)
    if (index === -1) {
        firstLevelKeys.value.push(data.id)
    }
}

function replaceChildrenData(children: Array<any>, replace_item: any) {
    if (children.length === 0) {
        return
    }
    replace_item.children = children
}


// 4. 实现 onCollapse (负责所有收起逻辑)
function onCollapse(data: any, node: any) {
    const index = firstLevelKeys.value.indexOf(data.id)
    if (index !== -1) {
        firstLevelKeys.value.splice(index, 1)
    }
}


function searchNode(nodes: any, targetId: any) {
    if (!nodes || nodes.length === 0) {
        return null;
    }
    for (const node of nodes) {
        if (node.id === targetId) {
            return node;
        }
        if (node.children && node.children.length > 0) {
            const foundInChild: any = searchNode(node.children, targetId);
            if (foundInChild) {
                return foundInChild;
            }
        }
    }

    // 6. 遍历完所有节点及其子节点后仍未找到
    return null;
}

function deleteNode(nodes: any, targetId: any) {
    // 1. 检查数组是否有效
    if (!nodes || nodes.length === 0) {
        return false;
    }

    // 2. 查找 targetId 是否在当前层级的数组中
    const index = nodes.findIndex((node: any) => node.id === targetId);

    // 3. 如果在当前层级找到了...
    if (index !== -1) {
        // 4. ...就从这个数组中删除它
        nodes.splice(index, 1);
        return true; // 成功！
    }

    // 5. 如果当前层级没找到，就去 children 里找
    for (const node of nodes) {
        if (node.children && node.children.length > 0) {
            // 6. 递归调用，尝试在子数组中删除
            const deletedInChildren = deleteNode(node.children, targetId);

            // 7. 如果在子节点中删除了，就立刻停止并返回 true
            if (deletedInChildren) {
                return true;
            }
        }
    }

    // 8. 遍历完所有节点及其子节点后仍未找到
    return false;
}

function findParentNode(nodes: any, targetId: any, parent = null) {
    if (!nodes || nodes.length === 0) {
        return undefined; // 'undefined' 表示未找到
    }

    // 1. 遍历当前层级的节点
    for (const node of nodes) {

        // 2. 检查当前节点是否是目标
        if (node.id === targetId) {
            return parent; // 找到了！返回它的父节点
        }

        // 3. 如果不是目标，则深入其子节点
        if (node.children && node.children.length > 0) {
            // 4. 'node' 现在是下一层的 'parent'
            const foundParent: any = findParentNode(node.children, targetId, node);

            // 5. 如果在子节点中找到了（即 foundParent 不是 undefined），
            //    就立刻将结果层层传递回去
            if (foundParent !== undefined) {
                return foundParent;
            }
        }
    }

    // 6. 遍历完所有分支仍未找到
    return undefined;
}

function applyCallbackToParents(nodes: any, targetId: any, callback: any) {
    // 1. 检查数组是否有效
    if (!nodes || nodes.length === 0) {
        return false;
    }

    // 2. 遍历当前层级的节点
    for (const node of nodes) {

        // 3. 检查：当前节点就是目标
        if (node.id === targetId) {
            // 找到了！返回true，但不在此处调用回调
            return true;
        }

        // 4. 检查：如果当前节点有子节点，则递归深入
        if (node.children && node.children.length > 0) {

            // 5. 向下搜索。如果 'found' 为 true，说明 targetId 在这个 'node' 的子孙中
            const found = applyCallbackToParents(node.children, targetId, callback);

            // 6. 【核心】
            //    如果 'found' 是 true...
            if (found) {
                // ...说明这个 'node' 是目标节点的父节点（或祖先节点）
                // 我们就在这里应用回调函数
                callback(node);

                // 7. 将 'true' 信号继续向上传递
                return true;
            }
        }
    }

    // 8. 遍历完所有节点，在当前分支中未找到
    return false;
}
</script>

<style lang="scss" scoped>
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
    height: 40px;
    border-radius: 10px;
    display: flex;
    align-items: center;
    color: black;
    font-weight: 600;
    // background-color: #f9f9f9;
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

.tree-node {
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    width: 100%;
    padding-left: 3px;
    box-sizing: border-box;
}
</style>

<style lang="scss">
.el-tree--highlight-current .el-tree-node.is-current>.el-tree-node__content {
    background-color: var(--greyLight-0);
}

.el-tree-node__content {
    border-radius: 5px;
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
</style>
