<template>
    <div class="base-status-css" :class="statusKey">{{ statusDescription }}</div>
</template>


<script lang="ts" setup>
import { computed } from 'vue';
const desc_mapping: any = {
    no_found: 'No Record',
    mid_running: 'Running',
    mid_pending: 'Waiting',
    mid_unknown: 'Unknow',
    end_success: 'Success',
    end_error_self: 'Error',
    end_error_child: 'Error Child',
    end_skipped_self: 'Skipped',
    end_skipped_child: 'Skipped Child'
}

const props = defineProps({
    data: {
        default: 0,
        type: null
    },
    status_mapping: {
        default: {},
        type: null
    }
})

const statusKey = computed(() => {
    if (!props.status_mapping || props.data === undefined) {
        return 'no_found';
    }
    const result = props.status_mapping[props.data.id];
    if (result === undefined || result.status === undefined) {
        return 'no_found';
    }
    if (result.status.includes('mid')) {
        return result.status
    } else {
        return result.result
    }
});

const statusDescription = computed(() => {
    return desc_mapping[statusKey.value] || '未知状态';
});

</script>

<style lang="scss" scoped>
.base-status-css {
    font-size: 0.9rem;
    font-weight: 800;
    font-size: 0.9rem;
    font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
    -webkit-background-clip: text;
    color: transparent;
}

.no_found {
    background-image: linear-gradient(to right, rgb(134, 134, 134), rgb(128, 128, 128), rgb(58, 58, 58));
}

.end_success {
    background-image: linear-gradient(to right, #8fc771, #55b397, #8fc771);
}

.end_error_child,
.end_error_self {
    background-image: linear-gradient(to right, rgb(254, 93, 136), rgb(254, 93, 136), rgb(254, 93, 136));
}

.end_skipped_self,
.end_skipped_child {
    background-image: linear-gradient(to right, #ffc551, #cac531, #ffc551);
}

.mid_pending {
    background-image: linear-gradient(to right, rgb(193, 188, 26), rgb(163, 203, 76), rgb(216, 223, 18));
}

.mid_running {
    background-image: linear-gradient(to right, rgb(0, 187, 255), rgb(93, 147, 254), rgb(0, 21, 255));
    animation: blink 3s infinite;
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
</style>