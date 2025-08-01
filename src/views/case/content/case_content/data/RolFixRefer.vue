<template>
    <div class="dynamic-col">
        <div class="field">
            {{inputer}}
        </div>
        <div class="info">
            <Info :desc="params.desc"></Info>
        </div>
        <div class="delete">
            <More :has_action="['edit']" @edit_col="edit_col"></More>
        </div>
        <div class="filter" ref="filter" v-if="params.enableFilterButton" @click="onMenuClicked($event)">
            <FilterBtn></FilterBtn>
        </div>
    </div>
</template>

<script setup lang="ts">
import { defineProps, ref, onMounted } from 'vue'
import FilterBtn from '@/components/common/mini_btn/filter.vue'
import Info from '@/components/common/hover/info.vue'
import More from '@/views/case/content/case_content/data/comp/col_select.vue'

const inputer = ref('')
const filter: any = ref(null)
const props = defineProps<{
    params: any
}>()
onMounted(() => {
    inputer.value = props.params.displayName
})

function edit_col() {
    props.params.batch_edit_col(props.params, false)
}

function onMenuClicked(event: any) {
    props.params.showColumnMenu(filter.value);
}
</script>

<style lang="scss" scoped>
.dynamic-col {
    display: flex;
    align-items: center;
    justify-content: space-between;
    width: 100%;

    .filter,
    .delete {
        min-width: 30px;
        display: flex;
        justify-content: center;
        align-items: center;
    }

    .field {
        flex: 1;
        width: 100%;
        min-width: 100px;
    }
}
</style>

<style lang="scss">
.dynamic-col {

    .el-textarea__inner,
    .el-input__inner,
    .el-input__wrapper {
        background-color: black !important;
        border: 0px !important;
        outline: none;
        box-shadow: none;
        resize: none;
        color: white;
        border-radius: 0px;
    }
}
</style>
