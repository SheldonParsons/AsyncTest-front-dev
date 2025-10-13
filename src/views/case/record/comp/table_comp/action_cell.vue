<template>
    <div class="table-action-container">
        <div class="title title-action" @click.stop>
            <motion.div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.05 }" @click="open_child_case_record"
                class="record-action">Record</motion.div>
        </div>
        <div class="title title-action" @click.stop>
            <motion.div :whilePress="{ scale: 0.95 }" :whileHover="{ scale: 1.1 }" @click="to_step_page"
                class="step-action">Step</motion.div>
        </div>
    </div>

</template>


<script lang="ts" setup>
import { motion } from 'motion-v'

const props = defineProps({
    params: {
        type: null
    }
})

function open_child_case_record() {
    props.params.show_case_table_record(props.params.data.index)
}

function to_step_page() {
    props.params.to_step_page(props.params.data.index,props.params.data.case_id)
}

</script>

<style lang="scss" scoped>
.table-action-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100%;
    gap: 5px;

    .step-action {
        width: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 15px;
        padding: 3px 5px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0s ease;
        font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
        background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
        -webkit-background-clip: text;
        color: transparent;
    }

    .record-action {
        width: 60px;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 15px;
        padding: 3px 5px;
        font-weight: 800;
        cursor: pointer;
        transition: transform 0s ease;
        font-family: "Monoton-Regular", "Helvetica Neue", Helvetica, "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "微软雅黑", Arial, sans-serif !important;
        background-image: linear-gradient(to right, rgb(255, 169, 169), rgb(255, 119, 0), rgb(255, 42, 0));
        -webkit-background-clip: text;
        color: transparent;
        border: 2px solid rgb(255, 119, 0);
        border-radius: 5px;
    }
}
</style>