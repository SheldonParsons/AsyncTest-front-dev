<template>
    <div class="ast-dir-container">
        <div class="tree">
            <div style="display: flex;justify-content: start;align-items: center;gap: 5px;">
                <img style="width: 35px;height: 35px;border-radius: 4px;object-fit: fill;" class='img'
                    src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/IntelliJ_IDEA_Icon.svg" alt="">
                <InputAnimation v-model="filterText" :placeholder="'搜索 接口/目录名'" :maxLength="50"></InputAnimation>
            </div>
            <el-tree style="margin-top: 10px;" show-checkbox class="api-tree no-scroll" ref="treeRef" :key="treeKey"
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
                        <div
                            style="display: flex;align-items: center;font-size: 14px;font-weight: 400;max-width: 250px; justify-content: end;">
                            <div v-if="data.child_type === 2"
                                style="font-size: 0.9rem;font-weight: 500;color: rgb(173, 173, 173);"
                                class="g-unselect g-ellipsis">{{
                                    data.path }}</div>
                        </div>
                    </div>
                </template>
            </el-tree>
        </div>
        <div class="control">
            <!-- <div class="desc">
                <div class="title">目标目录:</div>
                <div class="current-dir">{{ target_dir ? target_dir.name : '请选择节点' }}</div>
            </div> -->
            <div style="display: flex;justify-content: start;align-items: center;gap: 5px;">
                <div
                    style="background-color: white;border-radius: 4px;padding: 6px 6px 8px 6px;width: 25px;height: 20px;">
                    <img style="width: 25px;height: 20px;" class='img'
                        src="https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full.svg">
                </div>
                <InputAnimation v-model="filterDirText" :placeholder="'搜索 目录名'" :maxLength="50"></InputAnimation>
            </div>
            <div style="display: flex;flex: 1;gap: 10px;min-height: 0px;">
                <div style="flex: 5;display: flex;flex-direction: column;gap: 10px;min-width: 0;height: 100%;">
                    <div class="dir-tree no-scroll">
                        <el-tree ref="treeRefInterface" :data="targetDirSourceData" node-key="id" icon="ArrowRightBold"
                            @node-click="choice_interface_node" :highlight-current="true" :expand-on-click-node="false"
                            icon-class="none" default-expand-all :filter-node-method="filterNode">
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
                    <div style="background-color: #f0f0f0;display: flex;padding: 10px;border-radius: 6px;">
                        <Radio v-model="interfaceStrategy.interface.insert" :items="interfaceInserStrategy"></Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="isShowInsertStrategyTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="isShowInsertStrategyTooltip = true"
                                        @mouseleave="isShowInsertStrategyTooltip = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>插入方式</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            直接写入适合第一次同步，它将会强制将所有目录结构同步到目标目录。</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            自动覆盖更适合后续的同步操作，它将忽略目录结构，智能的将接口覆盖到全局的接口中，仅在新增的接口才进行新建操作。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                    <div style="background-color: #f0f0f0;display: flex;padding: 10px;border-radius: 6px;">
                        <Radio v-model="interfaceStrategy.interface.docs" :items="interfaceInserDocStrategy"></Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="isShowDsInsertStrategyDocsTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="isShowDsInsertStrategyDocsTooltip = true"
                                        @mouseleave="isShowDsInsertStrategyDocsTooltip = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>文档覆盖方式</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            保留两者 将会把新的文档内容追加到当前的文档后面。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                    <div style="background-color: #f0f0f0;display: flex;padding: 10px;border-radius: 6px;">
                        <Radio v-model="interfaceStrategy.interface.field_default" :items="interfaceInserFieldStrategy">
                        </Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="isShowDsInsertStrategyFieldDefaultTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="isShowDsInsertStrategyFieldDefaultTooltip = true"
                                        @mouseleave="isShowDsInsertStrategyFieldDefaultTooltip = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>覆盖字段默认值</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            是否覆盖字段默认值，一般建议不覆盖，IDEA默认值一般为空。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                    <div style="background-color: #f0f0f0;display: flex;padding: 10px;border-radius: 6px;">
                        <Radio v-model="interfaceStrategy.interface.field_desc" :items="interfaceInserFieldStrategy">
                        </Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="isShowDsInsertStrategyFieldDescTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="isShowDsInsertStrategyFieldDescTooltip = true"
                                        @mouseleave="isShowDsInsertStrategyFieldDescTooltip = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>覆盖字段描述</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            是否覆盖字段描述信息。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                </div>
                <div style="flex: 5;display: flex;flex-direction: column;gap: 10px;min-width: 0;height: 100%;">
                    <div class="dir-tree no-scroll">
                        <el-tree ref="treeRefDs" :data="targetDirSourceDataDs" node-key="id" icon="ArrowRightBold"
                            @node-click="choice_ds_node" :highlight-current="true" :expand-on-click-node="false"
                            icon-class="none" default-expand-all :filter-node-method="filterNode">
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
                    <div style="background-color: #f0f0f0;display: flex;padding: 10px;border-radius: 6px;">
                        <Radio v-model="interfaceStrategy.ds.docs" :items="interfaceInserDocStrategy"></Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="isShowInsertStrategyDocsTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="isShowInsertStrategyDocsTooltip = true"
                                        @mouseleave="isShowInsertStrategyDocsTooltip = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>文档覆盖方式</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            保留两者 将会把新的文档内容追加到当前的文档后面。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                    <div style="background-color: #f0f0f0;display: flex;padding: 10px;border-radius: 6px;">
                        <Radio v-model="interfaceStrategy.ds.field_default" :items="interfaceInserFieldStrategy">
                        </Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="isShowInsertStrategyFieldDefaultTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="isShowInsertStrategyFieldDefaultTooltip = true"
                                        @mouseleave="isShowInsertStrategyFieldDefaultTooltip = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>覆盖字段默认值</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            是否覆盖字段默认值，一般建议不覆盖，IDEA默认值一般为空。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                    <div style="background-color: #f0f0f0;display: flex;padding: 10px;border-radius: 6px;">
                        <Radio v-model="interfaceStrategy.ds.field_desc" :items="interfaceInserFieldStrategy">
                        </Radio>
                        <div style="width: 20px;height: 100%;display: flex;align-items: center;">
                            <TooltipAnimation :isOpen="isShowInsertStrategyFieldDescTooltip">
                                <template #trigger><span
                                        style="color: rgba(0,0,0);width: 1rem;height: 20px;display: flex;align-items: center;cursor: pointer;"
                                        @mouseenter="isShowInsertStrategyFieldDescTooltip = true"
                                        @mouseleave="isShowInsertStrategyFieldDescTooltip = false">
                                        <InfoSvg />
                                    </span></template>
                                <template #default>
                                    <div style="display: flex;flex-direction: column;gap: 5px;">
                                        <div>覆盖字段描述</div>
                                        <div style="color: rgba(255,255,255,0.5);line-height: 1.2rem;">
                                            是否覆盖字段描述信息。</div>
                                    </div>
                                </template>
                            </TooltipAnimation>
                        </div>
                    </div>
                </div>

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
import Radio from '@/components/common/general/radio.vue'
import InputAnimation from '@/components/common/general/input.vue'
import { interfaceInserStrategy, interfaceInserDocStrategy, interfaceInserFieldStrategy } from '@/components/layout/menus/comps/importer/constants'
import LoadingMini from '@/assets/motion/loading_mini.vue'
import { useRoute } from "vue-router";
import { getTree, getOuterTree } from "@/api/program/tree";
import ImportIcon from '@/assets/svg/common/import_icon.vue'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import tools from '@/utils/tools';
import InfoSvg from '@/assets/svg/common/new_icon/info.vue'
import { ApiImportIdea } from '@/api/importer/index'
import { GlobalState } from "@/state/index";

const route = useRoute();

const loading = ref(false)
const firstLevelKeys: any = ref([]);
const treeRef: any = ref();
const treeRefInterface: any = ref()
const treeRefDs: any = ref()
const treeKey = ref(0)
const filterText = ref("");
const filterDirText = ref("")
const target_dir: any = ref(null)
const target_ds_dir: any = ref(null)
const targetDirSourceData: any = ref([])
const targetDirSourceDataDs: any = ref([])
const checkedNodeIds: any = ref<Array<number>>([])
const data: any = ref([])
const isShowInsertStrategyTooltip = ref(false)
const isShowInsertStrategyDocsTooltip = ref(false)
const isShowInsertStrategyFieldDefaultTooltip = ref(false)
const isShowInsertStrategyFieldDescTooltip = ref(false)

const isShowDsInsertStrategyDocsTooltip = ref(false)
const isShowDsInsertStrategyFieldDefaultTooltip = ref(false)
const isShowDsInsertStrategyFieldDescTooltip = ref(false)
const interfaceStrategy = ref({
    interface: {
        insert: 'insert',
        docs: 'both',
        field_default: 'no',
        field_desc: "cover"
    },
    ds: {
        docs: 'both',
        field_default: 'no',
        field_desc: "cover"
    }
})

const props = defineProps({
    data: {
        default: null,
        type: null
    }
})

const emit = defineEmits(['close'])

function close() {
    emit("close")
}

// 获取处理后的树形数据
const getCheckedTree = () => {
    // 定义递归遍历函数
    const traverse = (nodes: any) => {
        const result: any = [];

        nodes.forEach((node: any) => {
            // 1. 获取 element-plus 内部的节点实例状态
            // 注意：这里依赖于你 el-tree 上绑定的 node-key="id"
            const nodeKey = node.id;
            const treeNode = treeRef.value.getNode(nodeKey);

            // 如果节点实例不存在（防御性代码），跳过
            if (!treeNode) return;

            // 2. 核心判断：
            // treeNode.checked = true (全选)
            // treeNode.indeterminate = true (半选，即子节点中有被选中的)
            // 我们需要保留 全选 和 半选 的节点，才能维持树的父子结构
            if (treeNode.checked || treeNode.indeterminate) {

                // 3. 浅拷贝当前节点数据，避免修改原始 data
                const newNode = { ...node };

                // 4. 如果有子节点，递归处理子节点
                if (newNode.children && newNode.children.length > 0) {
                    newNode.children = traverse(newNode.children);
                }

                // 5. 将过滤后的节点加入结果数组
                result.push(newNode);
            }
        });

        return result;
    };

    // 从原始数据 data 开始遍历
    return traverse(data.value); // 这里的 data.value 对应你 el-tree 绑定的 :data
};

onMounted(async () => {
    get_data()
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


    targetDirSourceDataDs.value = [];
    const dsData = {
        project: route.params.project,
        search_range: "0,1",
        excluded_ids: "",
        search_all: true,
        type: 2,
    };
    console.log(data);

    getTree(dsData).then((data: any) => {
        targetDirSourceDataDs.value.push(data[0]);
    });
})

function getName(data: any) {
    if ((data.child_type === 1 && data.code_type === 2) || (data.child_type === 2 && data.code_type === 3)) {
        if (data.alias.length !== 0) {
            return data.alias
        }
        return data.name
    }
    return data.name
}

async function get_data() {
    const _data = {
        project: route.params.project
    }
    getOuterTree(_data).then(async (res: any) => {
        data.value = res
        firstLevelKeys.value = [data.value[0].id]

        // 3. 等待 DOM 更新
        // Element Plus 的 Tree 组件需要 DOM 渲染完成后才能通过方法(setChecked)操作节点
        await nextTick()

        // 4. 设置默认勾选
        // 这里的 ?. 是防止 treeRef 为空
        treeRef.value?.setChecked(data.value[0].id, true, true)
    });
}

watch(filterText, (val: any) => {
    treeRef.value!.filter(val);
});



watch(filterDirText, (val: any) => {
    treeRefInterface.value!.filter(val);
    treeRefDs.value!.filter(val);
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
    if (loading.value === true) return
    const idea_tree = getCheckedTree()
    if (idea_tree.length === 0) {
        window.$toast({ title: '请至少选择一个接口进行导入。' })
        return
    }
    if (!check()) {
        return
    }
    loading.value = true
    const _data = {
        idea_tree: idea_tree,
        target_interface_tree_node: target_dir.value.id,
        target_interface_node: target_dir.value.target,
        target_ds_tree_node: target_ds_dir.value.id,
        target_ds_node: target_ds_dir.value.target,
        strategy: interfaceStrategy.value,
        project: route.params.project
    }
    tools.send(ApiImportIdea, _data).then((res: any) => {
        loading.value = false
        if (res !== false) {
            window.$toast({ title: res.msg, type: 'success' })
            GlobalState.sendMessage("reload_tree");
            close()
        }
    })
}

function check() {
    if (target_dir.value === null) {
        tools.message("请选择目标接口目录")
        return false
    } else if (target_ds_dir.value === null) {
        tools.message("请选择目标数据模型目录")
        return false
    }
    return true
}

function choice_interface_node(data: any, node: any, event: any, event_object: any) {
    target_dir.value = data;
}

function choice_ds_node(data: any, node: any, event: any, event_object: any) {
    target_ds_dir.value = data
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
        width: 40%;
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
        width: 60%;
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
            gap: 5px;
            color: white;
            font-size: 14px;
            font-weight: 500;
            border: none;
            background: linear-gradient(90deg, #ffffff, #ffffff, #ffffff);
            background-size: 200% 200%;
            // padding: 4px;
            border-radius: 30px 30px 30px 30px;
            box-sizing: border-box;
            cursor: pointer;
            transition: all 0.3s ease;
            font-family: "Monoton-Regular", sans-serif;
            background-image:
                url('https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/idea.png'),
                linear-gradient(90deg, #2b323c, #485563, #2b323c);

            /* 2. 设置不重复：两个层都不要重复 */
            background-repeat: no-repeat, no-repeat;

            /* 3. 位置：图片靠右居中，渐变背景从左侧开始 */
            /* 逗号分隔：第一个值对应图片，第二个值对应渐变 */
            background-position: right -1px center, 0% 50%;

            /* 4. 大小：图片高度占80%(保持比例)，渐变背景放大到200%以支持流光动画 */
            background-size: auto 100%, 200% 200%;

            /* 5. 动画：应用新的动画 */
            // animation: gradient-move 4s ease-in-out infinite;
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
            min-height: 0;
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