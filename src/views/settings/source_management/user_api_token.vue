<template>
    <SplitterGroup direction="vertical">
        <SplitterPanel :default-size="7" :min-size="7" :max-size="7">
            <div
                style="height:100%;width: 100%;display: flex;justify-content: end;align-items: center;padding-right: 20px;box-sizing: border-box;">
                <MotionButton @click="more_action('create', null, null)" style="width: 100px;height: 30px;">
                    <div style="display: flex;justify-content: space-between;align-items: center;gap: 3px;">
                        <div style="font-size: 14px;">新增令牌</div>
                    </div>
                </MotionButton>
            </div>
        </SplitterPanel>
        <SplitterPanel :default-size="78" :min-size="78" :max-size="78">
            <div class="data-set-container">
                <BlankAmination v-if="data.length === 0"></BlankAmination>
                <motion.div v-if="data.length !== 0" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                    :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }" class="header">
                    <div class="inner">
                        <div class="title title-name">名称</div>
                        <div class="title title-running-task">有效期</div>
                        <div class="title title-action">操作</div>
                    </div>
                </motion.div>
                <div class="data no-scroll" v-if="data.length !== 0">
                    <motion.div :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
                        :transition="{ duration: 1.2 }" class="data-item" v-for="(item, index) in data" :key="index">
                        <div class="title title-name g-e"><span>{{ item.name }}</span></div>
                        <div class="title title-running-task g-e"><span>{{ Number(item.expire_time) === 0 ? '无期限' :
                            timestampToDate(Number(item.expire_time))
                                }}</span></div>
                        <div class="title title-action" @click.stop>
                            <div>
                                <ActionGroup :group="['delete']" :actionDesc="actionDesc"
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
    <DialogAnimation ref="clientDetailRef" :title="is_edit ? '编辑 API 令牌' : '新增 API 令牌'"
        :cancel_title="apikey_detail_commit_text[1]" :confirm_title="is_edit ? '修改' : apikey_detail_commit_text[0]"
        :bgtype="'white'" :topMove="'0% !important'" :before_comfirm="check_generate_api_key">
        <ApiTokenDetail ref="tokenDetailRef">
        </ApiTokenDetail>
    </DialogAnimation>
</template>


<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import { motion } from 'motion-v'
import { SplitterGroup, SplitterPanel } from 'reka-ui'
import Pagination from '@/components/common/general/pagination.vue'
import { HttpClass } from "@/utils/http";
import MotionButton from '@/assets/motion/button.vue'
import BlankAmination from '@/components/common/blank/blank_animation.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import ApiTokenDetail from '@/views/settings/source_management/api_token_child/api_token_detail.vue'
import { useRoute } from 'vue-router'
import { ApiGetApiKeyList, ApiDeleteApikey } from '@/api/personal/index'
import tools from '@/utils/tools'

const route = useRoute()
const data: any = ref([])

const apikey_detail_commit_text = ref(['生成', '取消'])

const page_size = ref(10)
const page_number = ref(1)
const total_count = ref(0)
const is_edit = ref(false)
const tokenDetailRef: any = ref(null)

const clientDetailRef: any = ref(null)
let cancelTokenSource: any;

const actionDesc: any = {
    delete: '删除',
    batchEdit: '编辑'
}

function timestampToDate(ts: number) {
    const d = new Date(ts);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

onMounted(async () => {
    cancelTokenSource = getAbortController()
    await get_data(cancelTokenSource)
})

async function check_generate_api_key() {
    const result = await tokenDetailRef.value.next_action()
    if (result === 'generated') {
        apikey_detail_commit_text.value = ['关闭', '取消']
        return false
    }
    if (result === false) {
        return false
    }
    if (result === 'done') {
        return true
    }
}


async function more_action(t: string, item: any, index: any) {
    if (t === 'delete') {
        ApiDeleteApikey(item.id, {}).then(async res => {
            window.$toast({ title: '删除成功', type: 'success' })
            cancelTokenSource = getAbortController()
            await get_data(cancelTokenSource)
        })

    } else if (t === 'batchEdit') {
        is_edit.value = true

    } else if (t === 'create') {
        is_edit.value = false
        apikey_detail_commit_text.value = ['生成', '取消']
        const result = await clientDetailRef.value.open()
        cancelTokenSource = getAbortController()
        await get_data(cancelTokenSource)
    }
}

async function changePageReal(page: number) {
    cancelTokenSource = getAbortController()
    page_number.value = page
    await get_data(cancelTokenSource);
}

function getAbortController() {
    if (cancelTokenSource) {
        cancelTokenSource.cancel("取消重复请求");
    }
    return HttpClass.createCancelToken();
}

async function get_data(cancelTokenSource: any) {

    const _data = {
        size: page_size.value,
        page: page_number.value
    }
    data.value = []
    ApiGetApiKeyList({ params: _data, cancelToken: cancelTokenSource.token }).then((res: any) => {
        data.value = res.data
        total_count.value = res.total
    })
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
                justify-content: start;
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
                flex: 70;
            }

            .title-id {
                flex: 5;
            }

            .title-running-task {
                flex: 10;
            }

            .title-action {
                flex: 10;
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
            justify-content: start;
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
            justify-content: start;
            align-items: center;
            padding-left: 10px;
            padding-right: 5px;
            box-sizing: border-box;
        }

        .title-name,
        .title-update,
        .title-update-person,
        .title-status {
            flex: 70;
        }

        .title-id {
            flex: 5;
        }

        .title-running-task {
            flex: 10;
        }

        .title-action {
            flex: 10;
        }
    }

}
</style>