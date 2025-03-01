<template>
  <el-row style="margin-top: 60px">
    <el-col :offset="1" :span="14">
      <SwitchTag :glider="tag" @changeTag="change_tag"></SwitchTag>
    </el-col>
    <el-col :span="7" style="display: flex;justify-content: end;align-items: center;" v-if="tag === 'pre_action' || tag === 'after_action'">
      <el-button @click="save" type="primary">保存</el-button>
    </el-col>
  </el-row>
  <MenuSetting v-if="tag === 'menu'"></MenuSetting>
  <InterfaceTable v-if="tag === 'interface'"></InterfaceTable>
  <PreAction ref="pre_action_ref" v-if="tag === 'pre_action'"></PreAction>
  <AfterAction ref="after_action_ref" v-if="tag === 'after_action'"></AfterAction>
  <Auth v-if="tag === 'auth'"></Auth>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance } from "vue";
import SwitchTag from "../child_component/switch_tag.vue";
import MenuSetting from "./root_dir/menu_setting.vue";
import InterfaceTable from "./root_dir/interface_table.vue";
import PreAction from "./root_dir/pre_action.vue";
import AfterAction from "./root_dir/after_action.vue";
import Auth from "./root_dir/auth.vue";
import tools from '@/utils/tools'

const { proxy }: any = getCurrentInstance()

const tag = ref("after_action");

const pre_action_ref:any = ref(null)

const after_action_ref:any = ref(null)

function change_tag(t: string) {
  tag.value = t;
}

function save() {
  if (tag.value === "pre_action") {
    pre_action_ref.value.save()
  }
  if (tag.value === "after_action") {
    after_action_ref.value.save()
  }
  tools.message("保存成功", proxy,"success");
}
</script>

<style scoped lang="scss"></style>
