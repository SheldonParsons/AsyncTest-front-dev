<template>
    <div class="api-key-container">
        <div class="task-edit-item">
            <InputAnimation v-model="data.name" :placeholder="'名称'" :maxLength="50"></InputAnimation>
        </div>
        <div class="expire-picker">
            <div style="display: flex;justify-content: space-between;align-items: center;">
                <div style="font-size: 1rem;font-weight: 400;">有效期</div>
                <div class="is-expire" style="display: flex;">
                    <CheckBox :check="expire_check" @change="(_type: any) => change_singel_check(_type, '')">
                    </CheckBox>
                    <div style="font-size: 0.9rem;">无期限</div>
                </div>
            </div>
            <div style="display: flex;justify-content: center;align-items: center;">
                <DatePicker :enable="expire_check === 'none'" @date-change="set_expire"></DatePicker>
            </div>
        </div>
        <div class="apikey">
            <div @click.stop="copyContent">{{ token }}</div>
        </div>
        <div class="tips">
            <span style="color: rgb(255, 160, 0);display: flex;"><svg viewBox="0 0 24 24" focusable="false"
                    data-icon="warning" width="1em" height="1em" fill="currentColor" aria-hidden="true">
                    <path clip-rule="evenodd"
                        d="M10.53 2.28a3 3 0 014.03 1.06l8.48 14.15v.01a3 3 0 01-2.56 4.5H3.52a3 3 0 01-2.57-4.5l.01-.01L9.43 3.34a3 3 0 011.1-1.06zM13 9a1 1 0 10-2 0v4a1 1 0 102 0V9zm-1 7a1 1 0 100 2h.01a1 1 0 100-2H12z"
                        fill-rule="evenodd"></path>
                </svg></span>
            <div style="font-size: .9rem;">请确保您已复制并保管好该令牌，关闭后将无法再次查看该令牌。</div>
        </div>
    </div>
</template>

<script lang="ts" setup>
import { onMounted, ref } from 'vue'
import InputAnimation from '@/components/common/general/input.vue'
import DatePicker from '@/views/settings/source_management/api_token_child/DatePickerZero.vue'
import { useRoute } from 'vue-router'
import CheckBox from '@/assets/motion/checkbox.vue'
import { ApiPostApiKeyClient } from '@/api/personal/index'
import useClipboard from "vue-clipboard3/dist/esm/index.js";
import _ from 'lodash'
const route = useRoute()

const expire_check = ref('check')

const status = ref('ungenerate')

const expire_time = ref(0)

const token = ref('AST-XXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX')

const props = defineProps({
    is_edit: { default: false, type: Boolean },
    api_info: { default: null, type: null }
})

const data: any = ref({})

async function next_action() {
    console.log(status.value);

    if (data.value.name.length === 0) {
        window.$toast({ title: '名称不能为空' })
        return false
    }
    if (status.value === 'ungenerate') {
        if (expire_check.value === 'check') {
            data.value.expire_time = 0
        } else {
            data.value.expire_time = expire_time.value
        }
        ApiPostApiKeyClient(data.value, {}).then((res: any) => {
            token.value = res.token
        })
        status.value = 'generated'
    } else if (status.value === 'generated') {
        status.value = 'done'
    }
    return status.value
}

defineExpose({ next_action })

onMounted(() => {
    if (props.is_edit) {
        data.value = _.cloneDeep(props.api_info)
    } else {
        data.value = { name: '', expire_time: expire_time }
    }
})

async function copyContent() {
    await navigator.clipboard.writeText(token.value);
    window.$toast({ title: '已复制至剪贴板', type: 'success' })
}

function set_expire(time: number) {
    expire_time.value = time
}

const change_singel_check = (type: string, item: any) => {
    expire_check.value = type
}
</script>

<style lang="scss" scoped>
.api-key-container {
    display: flex;
    flex-direction: column;
    justify-content: start;
    align-items: start;
    width: 100%;
    gap: 10px;

    .task-edit-item {
        width: 100%;
    }

    .expire-picker,
    .apikey {
        background-color: #f0f0f0;
        padding: 10px;
        border-radius: 8px;
        width: 100%;
        box-sizing: border-box;
    }

    .tips {
        display: flex;
        justify-content: start;
        align-items: center;
    }

    .apikey {
        display: flex;
        justify-content: center;
        align-items: center;

        div {
            font-size: 1.3rem;
            cursor: pointer;
            border-bottom: 2px dotted transparent;
        }

        div:hover {
            border-bottom: 2px dotted black;
        }
    }
}
</style>