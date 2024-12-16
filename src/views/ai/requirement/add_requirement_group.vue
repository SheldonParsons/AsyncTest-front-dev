<template>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="showDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>需求分类</span>
      </div>
    </template>
    <div style="padding: 20px">
      <el-row
        style="display: flex; justify-content: start; align-items: center"
      >
        <el-col :span="3"><span style="font-size: 14px;font-weight: 600;">分类名称</span></el-col>
        <el-col :span="21"
          ><el-input v-model="requirement_name"></el-input></el-col
        >
      </el-row>
      <el-row
        style="display: flex; justify-content: start; align-items: center;margin-top: 20px;"
      >
        <el-col :span="3"><span style="font-size: 14px;font-weight: 600;">分类描述</span></el-col>
        <el-col :span="21"
          ><el-input v-model="requirement_desc"></el-input></el-col
        >
      </el-row>
    </div>
    <template #footer>
      <el-divider style="margin: 0px"></el-divider>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="showDialog = false">取消</el-button>
        <el-button type="primary" @click="addRequirementGroupAction"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, watch } from "vue";
import { state } from "@/state";
import { useRoute } from "vue-router";
import { createRequirementGroup } from "@/api/ai/requirement";
const showDialog = ref(false);
const requirement_name = ref("");
const requirement_desc = ref("");
const emit = defineEmits(['reload'])
const route = useRoute();
watch(
  () => state.message,
  (val) => {
    if (val.indexOf("addrequirement") != -1) {
      showDialog.value = true;
    }
  }
);

function addRequirementGroupAction() {
    const data = {
        name: requirement_name.value,
        description: requirement_desc.value,
        project: Number(route.params.project)
    }
    createRequirementGroup(data).then(res => {
        showDialog.value = false;
        emit("reload")
    })

}
</script>
<style scoped lang="scss">
.callback-content-divider {
  margin: 3px 0px;
}
.my-header {
  padding: 20px;
  padding-bottom: 0px;
  span {
    font-size: 16px;
    font-weight: 600;
  }
}
.callback-content {
  background-color: #f5f5f5;
  height: 200px;
  border-radius: 10px;
}
.checking-btn:hover {
  background-color: #f5f5f5;
  border: 1px solid black;
  color: black;
}
.add-app {
  font-size: 14px;
  height: 30px;
  border-radius: 10px;
  background-color: black;
  cursor: pointer;
}

.card-main:hover {
  --tw-ring-opacity: 1;
  --tw-ring-color: black;
}

.card-main {
  --tw-ring-opacity: 1;
  --tw-ring-color: var(--greyLight-4);
  width: 80px;
  --tw-ring-inset: ;
  --tw-ring-color: var(--greyLight-4);
  --tw-ring-offset-width: 3px;
  --tw-ring-offset-color: #fff;
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  --tw-shadow: 0 0 #0000;
  background-color: black;
  color: white;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  border: 2px solid #e5e7eb;
  margin: 5px;
  --tw-ring-offset-shadow: 0 0 0 var(--tw-ring-offset-width)
    var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow),
    var(--tw-shadow, 0 0 #0000);
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 0.15s;
}
</style>

<style lang="scss">
.text-content {
  .el-textarea {
    textarea {
      all: unset; /* 移除所有默认样式 */
      box-sizing: border-box;
      width: 100%;
      padding: 5px;
      height: 200px;
      font-size: 14px;
      font-weight: 600;
    }
  }
}
.callback-dialog {
  .el-dialog__header {
    padding-bottom: 0px !important;
  }
}
</style>
