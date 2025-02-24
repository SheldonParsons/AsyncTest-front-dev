<template>
  <el-row style="margin-top: 60px">
    <el-col :offset="1" :span="14">
      <SwitchTag :glider="tag" @changeTag="change_tag"></SwitchTag>
    </el-col>
  </el-row>
  <MenuSetting v-if="tag=='menu'"></MenuSetting>
  <InterfaceTable v-if="tag=='interface'"></InterfaceTable>
  <PreAction v-if="tag=='pre_action'"></PreAction>
</template>

<script setup lang="ts">
import { ref,onMounted } from "vue";
import SwitchTag from "../child_component/switch_tag.vue";
import MenuSetting from './root_dir/menu_setting.vue'
import InterfaceTable from './root_dir/interface_table.vue'
import PreAction from './root_dir/pre_action.vue'

const tag = ref('pre_action')

function change_tag(t:string) {
  tag.value = t
}
</script>

<style scoped lang="scss">
</style>
