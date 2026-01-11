<template>
    <SplitterGroup direction="vertical">
        <SplitterPanel :default-size="7" :min-size="7" :max-size="7">
            <div
                style="height:100%;width: 100%;display: flex;justify-content: end;align-items: center;box-sizing: border-box;padding: 5px;gap: 10px;padding-right: 20px;">
                <div>
                    <InputAnimation v-model="search_text" :placeholder="'搜索目录、路径'" :maxLength="50"></InputAnimation>
                </div>
                <MotionButton @click="more_action('create', null, null)" style="width: 100px;height: 30px;">
                    <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
                        <div style="font-size: 14px;color: white;">新增 Alias</div>
                    </div>
                </MotionButton>
            </div>
        </SplitterPanel>
        <SplitterPanel :default-size="71" :min-size="71" :max-size="71">
            <div class="data-set-container">
                <BlankAmination v-if="data.length === 0"></BlankAmination>
                <motion.div v-if="data.length !== 0" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                    :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }" class="header">
                    <div class="inner">
                        <div class="title title-name">Alias</div>
                        <div class="title title-update">匹配模式</div>
                        <div class="title title-update-person">关联模块</div>
                        <div class="title title-status">是否启用</div>
                        <div class="title title-status">匹配名称</div>
                        <div class="title title-action">匹配路径</div>
                        <div class="title title-action">操作</div>
                    </div>
                </motion.div>
                <div class="data no-scroll" v-if="data.length !== 0">
                    <motion.div :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
                        :transition="{ duration: 1.2 }" class="data-item" v-for="(item, index) in data" :key="index">
                        <div class="title title-name"><span>
                                <HoverTooltip :text="item.alias">
                                    <div class="g-e">{{ item.alias }}</div>
                                </HoverTooltip>
                            </span></div>
                        <div class="title title-update" style="cursor: pointer;"><span>{{ String(item.match_type) ===
                            '0' ? '名称匹配' : '精准匹配' }}</span>
                        </div>
                        <div class="title title-update-person" style="cursor: pointer;">
                            <HoverTooltip :text="item.match_modules">
                                <div class="g-e">{{ item.match_modules === 'all' ? '所有模块' :
                                    item.match_modules
                                    }}</div>
                            </HoverTooltip>
                        </div>
                        <div class="title title-update-person" style="cursor: pointer;">
                            <div class="switch-container">
                                <Switch.Root v-model="item.enable" :class="{ checked_animation: item.enable }"
                                    @click="toggleChecked(item)">
                                    <motion.button class="switch" :initial="item.enable" :animate="{
                                        backgroundColor: item.enable ? 'black' : 'var(--hue-6-transparent)'
                                    }" :style="{
                                        justifyContent: item.enable ? 'flex-end' : 'flex-start'
                                    }" :while-focus="{
                                        boxShadow: '0 0 0 5px #0f1115, 0 0 0 10px var(--hue-6-transparent)',
                                        transition: { duration: 0.2 }
                                    }">
                                        <Switch.Thumb as-child>
                                            <motion.div class="thumb-inner" :data-checked="item.enable" :layout="true"
                                                :transition="{
                                                    type: 'spring',
                                                    stiffness: 500,
                                                    damping: 30
                                                }" />
                                        </Switch.Thumb>
                                    </motion.button>
                                </Switch.Root>
                            </div>
                        </div>
                        <div class="title title-update-person" style="cursor: pointer;">
                            <HoverTooltip :text="String(item.match_type) === '0' ? item.match_name : '暂无'">
                                <div class="g-e">{{ String(item.match_type) === '0' ? item.match_name : '-' }}
                                </div>
                            </HoverTooltip>
                        </div>
                        <div class="title title-action" @click.stop>
                            <HoverTooltip :text="String(item.match_type) === '0' ? '暂无' : item.match_path">
                                <div class="g-e">{{ String(item.match_type) === '0' ? "-" :
                                    item.match_path_name }}</div>
                            </HoverTooltip>
                        </div>
                        <div class="title title-action" @click.stop>
                            <div>
                                <ActionGroup :group="['delete', 'batchEdit']" :actionDesc="actionDesc"
                                    @action="(action_type: any) => more_action(action_type, item, index)">
                                </ActionGroup>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>
        </SplitterPanel>
        <SplitterPanel :default-size="15" :min-size="15" :max-size="15">
            <div class="task-pagination">
                <Pagination :total="total_count" :size="page_size" @changePage="changePageReal"></Pagination>
            </div>
        </SplitterPanel>
    </SplitterGroup>
    <DialogAnimation ref="clientDetailRef" :title="is_edit ? '编辑 Alias' : '新增 Alias'" cancel_title="取消"
        :confirm_title="is_edit ? '修改' : '新增'" :bgtype="'white'" :before_comfirm="check_client_detail"
        :topMove="'0% !important'">
        <Setting ref="asyncExecutorDetailRef" :is_edit="is_edit" :edit_object="edit_object"></Setting>
    </DialogAnimation>
</template>


<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import { SplitterGroup, SplitterPanel } from 'reka-ui'
// @ts-ignore
import { Switch } from 'reka-ui/namespaced';
import HoverTooltip from '@/components/common/general/tooltip_hover.vue'
import InputAnimation from '@/components/common/general/input.vue'
import Pagination from '@/components/common/general/pagination.vue'
import { HttpClass } from "@/utils/http";
import MotionButton from '@/assets/motion/button.vue'
import BlankAmination from '@/components/common/blank/blank_animation.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import Setting from '@/views/api/child_context/outer_interface_root_dir/alias_child/setting.vue'
import { useRoute } from 'vue-router'
import { ApiGetAliasSettingList, ApiPostAliasSetting, ApiUpdateAliasSetting, ApiDeleteAliasSetting } from '@/api/project/index'
import tools from '@/utils/tools'

const route = useRoute()
const search_text = ref("")
const data: any = ref([])

let cancelTokenSource: any;
const clientDetailRef: any = ref(null)
const current_client_info: any = ref(null)

const page_size = ref(10)
const page_number = ref(1)
const total_count = ref(0)
const is_edit = ref(false)
const edit_object= ref(null)
const asyncExecutorDetailRef: any = ref(null)

const actionDesc: any = {
    delete: '删除',
    batchEdit: '编辑'
}

onMounted(async () => {
    cancelTokenSource = getAbortController()
    await get_data(cancelTokenSource)
})

const toggleChecked = async (item: any) => {
    const update_result = await tools.send(ApiUpdateAliasSetting, item.id, {}, { enable: !item.enable })
    if (update_result) {
        item.enable = update_result.enable
        window.$toast({ title: `${update_result.enable ? '已启用' : '已禁用'}` })
    } else {
        item.enable = false
    }
}



function omit(obj: any, keys: any) {
    return Object.fromEntries(
        Object.entries(obj).filter(([k]) => keys.includes(k))
    );
}

async function more_action(t: string, item: any, index: any) {
    if (t === 'delete') {
        const update_result = await tools.send(ApiDeleteAliasSetting, item.id, {})
        if (update_result) {
            cancelTokenSource = getAbortController()
            await get_data(cancelTokenSource)
            window.$toast({ title: '删除成功' })
        }
    } else if (t === 'batchEdit') {
        is_edit.value = true
        current_client_info.value = item
        edit_object.value = item
        const result = await clientDetailRef.value.open()
        if (result.action === 'cancel') return
        const _data = await asyncExecutorDetailRef.value.create()
        if (_data !== false) {
            cancelTokenSource = getAbortController()
            await get_data(cancelTokenSource)
        }
        edit_object.value = null
    } else if (t === 'create') {
        is_edit.value = false
        const result = await clientDetailRef.value.open()
        if (result.action === 'cancel') return
        const _data = await asyncExecutorDetailRef.value.create()
        if (_data !== false) {
            cancelTokenSource = getAbortController()
            await get_data(cancelTokenSource)
        }
    }
}



async function check_client_detail() {
    return asyncExecutorDetailRef.value.check_content()
}


function getAbortController() {
    if (cancelTokenSource) {
        cancelTokenSource.cancel("取消重复请求");
    }
    return HttpClass.createCancelToken();
}

async function get_data(cancelTokenSource: any) {

    const _data = {
        project: Number(route.params.project),
        size: page_size.value,
        page: page_number.value
    }
    data.value = []
    ApiGetAliasSettingList({ params: _data, cancelToken: cancelTokenSource.token }).then((res: any) => {
        data.value = res.data
        total_count.value = res.total
    })
}

async function changePageReal(page: number) {
    cancelTokenSource = getAbortController()
    page_number.value = page
    await get_data(cancelTokenSource);
}
</script>

<style lang="scss" scoped>
.run-btn {
    width: 80px;
    height: 25px;
    display: flex;
    justify-content: center;
    align-items: center;
    gap: 5px;
    color: white;
    font-size: 14px;
    font-weight: 500;
    /* 核心修改 */
    border: none;
    /* 移除边框，让渐变和阴影成为主体 */
    background: linear-gradient(90deg, #b3d53a, #6fd700, #3ad561);
    /* 柔和的蓝-青渐变 */
    background-size: 200% 200%;
    animation: gradient-move 4s ease-in-out infinite;
    /* 动画更平滑，时间更长 */
    padding: 4px;
    border-radius: 6px;
    /* 更圆润的边角 */
    box-sizing: border-box;
    cursor: pointer;
    transition: all 0.3s ease;
    /* 为悬停效果添加过渡 */
    box-shadow: 0 4px 15px 0 rgba(0, 118, 255, 0.3);
    /* 添加与渐变色匹配的发光效果 */
}

/* 增强交互反馈 */
.run-btn:hover {
    box-shadow: 0 6px 20px 0 rgba(0, 118, 255, 0.4);
    transform: translateY(-2px);
    /* 悬停时轻微上浮 */
}

.run-btn:active {
    transform: translateY(0);
    /* 点击时恢复原位 */
    box-shadow: 0 2px 10px 0 rgba(0, 118, 255, 0.2);
}

.run-btn svg {
    width: 14px;
}

/* 2. 替换您的 @keyframes (与原来相同，但配合新样式效果不同) */
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

.task-pagination {
    width: 100%;
    height: 100%;
    box-sizing: border-box;
    padding: 10px;
    display: flex;
    justify-content: center;
    align-items: center;
    margin-top: auto;
}

.switch-container {
    --hue-6-transparent: rgba(154, 154, 154);
    display: flex;
    align-items: center;
    background-color: white;

    button {
        border: none;
        background-color: white;
        outline: none;
        padding: 0px;
    }

    .switch {
        width: 50px;
        padding: 5px;
        background-color: var(--hue-6-transparent);
        border-radius: 9999px;
        position: relative;
        outline: none;
        cursor: pointer;
        display: flex;
        border: none;
        outline: none;
    }

    .thumb {
        display: flex;
        width: 100%;
    }

    .thumb-inner {
        display: block;
        width: 13px;
        height: 13px;
        background-color: white;
        border-radius: 50%;
    }

    .label {
        color: #f5f5f5;
        font-size: 15px;
        line-height: 1;
        padding-left: 15px;
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
            }

            .ONLINE {
                background-image: linear-gradient(to right, rgb(128, 192, 125), rgb(0, 255, 153), rgb(0, 255, 60));
                font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
                -webkit-background-clip: text;
                color: transparent;
            }

            .OFFLINE {
                background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 0, 51));
                font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
                -webkit-background-clip: text;
                color: transparent;
            }

            @keyframes blink {
                0% {
                    opacity: 1;
                    /* 不透明 */
                }

                50% {
                    opacity: 0;
                    /* 透明 */
                }

                100% {
                    opacity: 1;
                    /* 不透明 */
                }
            }

            .title-id {
                span {
                    cursor: pointer;
                    color: #6e6e6e;
                    border-bottom: 1px dotted #f0f0f0;
                }

                span:hover {
                    color: rgb(47, 47, 47);
                    border-bottom: 1px dotted rgb(47, 47, 47);
                }
            }

            .title-name,
            .title-update,
            .title-update-person {
                flex: 12;
            }

            .title-id {
                flex: 5;
            }

            .title-running-task {
                flex: 10;
            }

            .title-action {
                flex: 12;
            }
        }



        .data-item:hover {
            /* 漂浮时放大阴影并略微上移 */
            box-shadow: 5px 5px 10px rgba(0, 0, 0, 0.1);
            transform: translateY(-1px);
        }
    }

    .header {
        width: 100%;
        padding: 20px 20px 0 20px;
        box-sizing: border-box;

        .inner {
            width: 100%;
            height: 100%;
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

        .title-id {
            flex: 5;
        }

        .title-running-task {
            flex: 10;
        }

        .title-action {
            flex: 12;
        }
    }

}
</style>