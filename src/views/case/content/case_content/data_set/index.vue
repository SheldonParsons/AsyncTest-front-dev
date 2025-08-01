<template>
    <div class="data-set-container">
        <BlankAmination v-if="data.length === 0"></BlankAmination>
        <motion.div v-if="data.length !== 0" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }" :exit="{ opacity: 0 }"
            :transition="{ duration: 1.2 }" class="header">
            <div class="inner">
                <div class="title title-name">数据集名称</div>
                <div class="title title-id">ID</div>
                <div class="title title-update">更新时间</div>
                <div class="title title-update-person">更新人</div>
                <div class="title title-action">操作</div>
            </div>
        </motion.div>
        <div class="data">
            <motion.div @click.stop="action('edit', item, 0)" :initial="{ opacity: 0 }" :animate="{ opacity: 1 }"
                :exit="{ opacity: 0 }" :transition="{ duration: 1.2 }" class="data-item" v-for="(item, index) in data"
                :key="index">
                <div class="title title-name"><span>{{
                    item.name }}</span></div>
                <div class="title title-id">
                    <TooltipAnimation :isOpen="showIdTooltip">
                        <template #trigger><span @click.stop="copyId(item.global_id)" @mouseenter="showIdTooltip = true"
                                @mouseleave="showIdTooltip = false"># {{ item.global_id }}</span></template>
                        <template #default>
                            <div>点击复制</div>
                        </template>
                    </TooltipAnimation>
                </div>
                <div class="title title-update" @click.stop style="cursor: text;"><span @click.stop>{{
                    timeAgo(item.updated_at)
                        }}</span>
                </div>
                <div class="title title-update-person" @click.stop style="cursor: text;">{{ item.updated_by }}</div>
                <div class="title title-action" @click.stop>
                    <div>
                        <ActionGroup :group="['copy', 'delete', 'batchEdit']" :actionDesc="actionDesc"
                            @action="(action_type) => action(action_type, item, index)">
                        </ActionGroup>
                    </div>
                </div>
            </motion.div>
        </div>
    </div>
    <DialogAnimation ref="updateDateSetNameDialogRef" title="编辑数据集名称" cancel_title="取消" confirm_title="更新"
        :before_comfirm="check_dataset_name">
        <div>
            <input ref="inputRef" v-model="currentDataSetName" placeholder="数据集名称">
        </div>
    </DialogAnimation>
</template>

<script lang="ts" setup>
import { motion } from 'motion-v'
import { ref, onMounted, nextTick } from 'vue'
import BlankAmination from '@/components/common/blank/blank_animation.vue'
import ActionGroup from '@/views/case/content/case_content/runner/tree/components/action_group.vue'
import TooltipAnimation from '@/components/common/general/tooltip.vue'
import DialogAnimation from '@/components/common/general/dialog.vue'
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
import _ from 'lodash'

const emit = defineEmits(['edit'])

const showIdTooltip = ref(false)

const currentDataSetName: any = ref('')

const updateDateSetNameDialogRef: any = ref(null)

const inputRef: any = ref(null)

const data: any = ref([{
    name: '数据集1',
    global_id: 12312123,
    updated_at: 1754026824000,
    updated_by: 'Sheldon'
}])

async function addDataset() {
    const result = await updateDateSetNameDialogRef.value.open()
    if (result.action === 'comfirm' && result.hook_result === true) {
        data.value.push({
            name: currentDataSetName.value,
            global_id: 12312123,
            updated_at: 1754026824000,
            updated_by: 'Sheldon'
        })
        if (result.action === 'comfirm') {
            window.$toast({ title: '新增数据集成功。', type: 'info' })
        }
    }
    currentDataSetName.value = ''
}

defineExpose({ addDataset })

const actionDesc: any = {
    copy: '复制',
    delete: '删除',
    batchEdit: '更新数据集信息'
}

async function action(t: string, item: any, index: number) {
    if (t === 'copy') {
        let new_dataset = _.cloneDeep(item)
        new_dataset.id = 123
        new_dataset.name = item.name + 'Copy'
        data.value.splice(index + 1, 0, new_dataset)
    } else if (t === 'delete') {
        data.value = data.value.filter((_item: any) => _item.id != item.id)
        window.$toast({ title: '删除数据集成功' })
    } else if (t === 'batchEdit') {
        // emit('edit', global_id)
        currentDataSetName.value = _.cloneDeep(item.name)
        resetCursor()
        const result = await updateDateSetNameDialogRef.value.open()
        if (result.action === 'comfirm' && result.hook_result === true) {
            if (item.name !== currentDataSetName.value) {
                window.$toast({ title: '更新数据集名称成功。' })
            } else {
                window.$toast({ title: '内容无变化。', type: 'info' })
            }
            item.name = currentDataSetName.value
        }

        currentDataSetName.value = ''
    } else if (t === 'edit') {
        emit('edit', item)
    }
}

function check_dataset_name() {
    if (currentDataSetName.value.length === 0) {
        window.$toast({ title: '数据集名称不能为空。', type: 'info' })
        return false
    } else if (currentDataSetName.value.length > 255) {
        window.$toast({ title: '数据集名称过长(Limit 255)。', type: 'info' })
        return false
    }
    return true
}

const resetCursor = () => {
    nextTick(() => {
        if (inputRef.value) {
            // 先 focus
            inputRef.value.focus()
            // 再设置光标到末尾
            inputRef.value.setSelectionRange(0, 0)
        }
    })
}

const props = defineProps({
    case: {
        type: Number,
        default: - 1
    }
})

onMounted(async () => {
    get_data_set()
})

async function get_data_set() {

}

async function copyId(global_id: number) {
    const { toClipboard } = useClipboard()
    await toClipboard(global_id.toString())
    window.$toast({ title: '已复制' })
}

function timeAgo(timestamp: number) {
    const now = Date.now()
    const diff = Math.floor((now - timestamp) / 1000) // 秒差

    if (diff < 10) return "刚刚"
    if (diff < 60) return `${diff}秒前`
    if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`
    if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`
    if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`
    if (diff < 31536000) return `${Math.floor(diff / 2592000)}月前`
    return `${Math.floor(diff / 31536000)}年前`
}
</script>

<style lang="scss" scope>
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
            .title-id,
            .title-update,
            .title-update-person {
                flex: 22;
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
            height: 40px;
            border: 2px solid #f0f0f0;
            box-shadow: 0 1px 2px rgba(0, 0, 0, 0.1);
            border-radius: 8px;
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
        .title-id,
        .title-update,
        .title-update-person {
            flex: 22;
        }

        .title-action {
            flex: 12;
        }
    }


}
</style>