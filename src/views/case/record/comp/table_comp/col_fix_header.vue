<template>
    <div class="dynamic-col">
        <div class="field">
            {{inputer}}
        </div>
        <div class="filter" ref="filter" v-if="params.enableFilterButton" @click="onMenuClicked($event)">
            <FilterBtn></FilterBtn>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FilterBtn from '@/components/common/mini_btn/filter.vue'

const inputer = ref('')
const filter: any = ref(null)
const props = defineProps<{
    params: any
}>()
onMounted(() => {
    inputer.value = props.params.displayName
})

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
