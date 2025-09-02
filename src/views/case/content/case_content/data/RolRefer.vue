<template>
    <div class="dynamic-col">
        <div class="field">
            <input class="mul-row-inputer" @keydown.stop v-model="inputer" @focus="onFocus" @blur="onBlur" type="text"
                placeholder="字段名" />
        </div>
        <div class="info">
            <Info :desc="params.desc"></Info>
        </div>
        <div class="delete">
            <More @delete_col="delete_col" @edit_col="edit_col"></More>
        </div>
        <div class="filter" ref="filter" v-if="params.enableFilterButton" @click="onMenuClicked($event)">
            <FilterBtn></FilterBtn>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import FilterBtn from '@/components/common/mini_btn/filter.vue'
import Info from '@/components/common/hover/info.vue'
import More from '@/views/case/content/case_content/data/comp/col_select.vue'

const inputer = ref('')
const filter: any = ref(null)
const cache_inputer = ref('')
const props = defineProps<{
    params: any
}>()
onMounted(() => {
    inputer.value = props.params.displayName
})
function onFocus() {
    cache_inputer.value = inputer.value
}

function delete_col() {
    props.params.delete_col(props.params)
}

function edit_col() {
    props.params.batch_edit_col(props.params, true)
}

function onBlur() {
    if (cache_inputer.value === inputer.value) {
        window.$toast?.({
            title: '内容无变化。',
            type: 'info',
        })
    } else {
        props.params.edit_col(props.params.id, cache_inputer.value, inputer.value)
    }
}

function onMenuClicked(event: any) {
    console.log(filter.value);

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

<style lang="scss" scope>
.dynamic-col {

    .field .mul-row-inputer {
        background-color: black !important;
        border: 0px !important;
        outline: none;
        box-shadow: none;
        resize: none;
        color: white;
        border-radius: 0px;
        padding-right: 5px;
    }
}
</style>
