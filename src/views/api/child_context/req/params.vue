<template>
  <el-row style="margin-top: 20px">
    <el-col :span="24" class="table-col">
      <el-table
        :data="tableData"
        style="width: 100%; margin-bottom: 20px"
        row-key="id"
        border
        default-expand-all
        class="main-table"
      >
        <el-table-column label="参数名">
          <template #default="scope">
            <el-row style="width: 100%">
              <el-col :span="21">
                <CodeMirror
                  :doc="scope.row.name"
                  :enableDecoration="false"
                ></CodeMirror>
              </el-col>
              <el-col
                :offset="1"
                :span="2"
                style="text-align: center; display: flex; align-items: center"
              >
                <div class="custom-mini">=</div>
              </el-col>
            </el-row>
          </template>
        </el-table-column>
        <el-table-column label="类型" min-width="30%">
          <template #default="scope">
            <el-dropdown trigger="click" @command="handleCommand">
              <span class="typing-span">{{ scope.row.type }}</span>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item
                    :command="[scope.row, item]"
                    v-for="(item, index) in options"
                    >{{ item.label }}</el-dropdown-item
                  >
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </template>
        </el-table-column>
        <el-table-column label="示例值">
          <template #default="scope">
            <CodeMirror :doc="scope.row.example"></CodeMirror>
          </template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="scope">
            <CodeMirror
              :doc="scope.row.statement"
              :enableDecoration="false"
            ></CodeMirror>
          </template>
        </el-table-column>
      </el-table>
    </el-col>
  </el-row>
</template>
<script lang="ts" setup>
import { ref, defineProps, defineEmits } from 'vue';
import CodeMirror from "../code_mirror.vue";
// 定义组件属性
const props = defineProps<{
  tableData: any[]; // 定义tableData属性为一个数组
}>();

// 定义组件事件
const handleCommand = (command: any) => {
  command[0].type = command[1].label;
};


const options = [
  {
    value: "string",
    label: "string",
  },
  {
    value: "integer",
    label: "integer",
  },
  {
    value: "boolean",
    label: "boolean",
  },
  {
    value: "number",
    label: "number",
  },
  {
    value: "array",
    label: "array",
  },
  {
    value: "object",
    label: "object",
  },
];
</script>
<style lang="scss" scoped></style>
