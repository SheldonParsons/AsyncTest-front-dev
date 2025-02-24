<template>
  <el-row style="margin-top: 40px" v-if="multipleSelection.length === 0">
    <el-col :offset="1" :span="22">
      <div class="header">
        <h3 style="font-weight: 600; font-size: 14px">根目录（接口 12 个）</h3>
        <div class="table-header-right">
          <div class="mt-4">
            <el-input
              v-model="search"
              style="max-width: 600px"
              placeholder="输入关键字进行搜索"
              class="input-with-select"
            >
              <template #append>
                <el-button :icon="Search" />
              </template>
            </el-input>
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 40px" v-if="multipleSelection.length > 0">
    <el-col :offset="1" :span="22">
      <div class="header-2">
        <div class="table-header-left-2">
          <div style="color: #667085;font-size: 14px;">已选 <span style="font-weight: 600; color: #344054;">12</span>/12 项</div>
          <span style="color: #039e74;margin-left: .5rem;cursor: pointer;font-size: 14px;" @click="clean_select">取消选择</span>
        </div>
        <div class="table-header-right-2">
          <div class="right-2-inner-div">
            <div class="right-2-inner-div-div">
              <el-button :icon="Delete" type="" text>删除</el-button>
              <el-button :icon="EditPen" type="" text>修改状态</el-button>
              <el-button :icon="PriceTag" type="" text>新增标签</el-button>
              <el-button :icon="DocumentRemove" type="" text>删除标签</el-button>
              <el-button :icon="User" type="" text>修改责任人</el-button>
              <el-button :icon="FolderOpened" type="" text>移动</el-button>
            </div>
            <el-divider direction="vertical" />
            <el-button :icon="CloseBold" @click="clean_select" type="" text></el-button>
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="22">
      <el-table
        border
        ref="multipleTableRef"
        :data="tableData"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        :header-cell-style="{ color: 'black', 'font-size': '14px' }"
      >
        <el-table-column type="selection" width="55" />
        <el-table-column label="接口名称">
          <template #default="scope">{{ scope.row.name }}</template>
        </el-table-column>
        <el-table-column label="请求类型">
          <template #default="scope">{{ scope.row.type }}</template>
        </el-table-column>
        <el-table-column label="接口路径">
          <template #default="scope">{{ scope.row.path }}</template>
        </el-table-column>
        <el-table-column label="接口分组">
          <template #default="scope">{{ scope.row.group }}</template>
        </el-table-column>
        <el-table-column label="接口状态">
          <template #default="scope">{{ scope.row.status }}</template>
        </el-table-column>
        <el-table-column label="标签">
          <template #default="scope">{{ scope.row.tags[0].name }}</template>
        </el-table-column>
        <el-table-column label="责任人">
          <template #default="scope">{{ scope.row.pr }}</template>
        </el-table-column>
      </el-table>
    </el-col>
  </el-row>
</template>

<script lang="ts" setup>
import { ref } from "vue";
import { Search,Delete,EditPen,DocumentRemove,PriceTag,User,FolderOpened,CloseBold } from "@element-plus/icons-vue";
const multipleTableRef = ref<any>();
const multipleSelection = ref<any[]>([]);
// const selectable = (row: any) => ![1, 2].includes(row.id);
const search = ref("");
const handleSelectionChange = (val: any) => {
  multipleSelection.value = val;
};
function clean_select() {
  multipleSelection.value = []
  multipleTableRef.value!.clearSelection()
}
const tableData = [
  {
    id: 1,
    name: "未命名接口",
    type: 0,
    path: "/pet",
    group: "根目录/宠物店",
    status: 0,
    tags: [
      {
        id: 0,
        name: "动物",
      },
    ],
    pr: "Sheldon",
  },
  {
    id: 1,
    name: "未命名接口",
    type: 0,
    path: "/pet",
    group: "根目录/宠物店",
    status: 0,
    tags: [
      {
        id: 0,
        name: "动物",
      },
    ],
    pr: "Sheldon",
  },
  {
    id: 1,
    name: "未命名接口",
    type: 0,
    path: "/pet",
    group: "根目录/宠物店",
    status: 0,
    tags: [
      {
        id: 0,
        name: "动物",
      },
    ],
    pr: "Sheldon",
  },
  {
    id: 1,
    name: "未命名接口",
    type: 0,
    path: "/pet",
    group: "根目录/宠物店",
    status: 0,
    tags: [
      {
        id: 0,
        name: "动物",
      },
    ],
    pr: "Sheldon",
  },
  {
    id: 1,
    name: "未命名接口",
    type: 0,
    path: "/pet",
    group: "根目录/宠物店",
    status: 0,
    tags: [
      {
        id: 0,
        name: "动物",
      },
    ],
    pr: "Sheldon",
  },
];
</script>

<style scoped lang="scss">
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  border-top: 1px solid #f2f4f7;
  border-right: 1px solid #f2f4f7;
  border-left: 1px solid #f2f4f7;
  border-radius: 10px 10px 0 0;
  height: 48px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}
.table-header-right {
  display: flex;
  justify-content: flex-end;
  align-items: center;
}
.header-2 {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background-color: rgba(16,24,40,.05);
  border-top: 1px solid #f2f4f7;
  border-right: 1px solid #f2f4f7;
  border-left: 1px solid #f2f4f7;
  border-radius: 10px 10px 0 0;
  height: 48px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
}
.table-header-right-2 {
  min-width: 0px;
  display: flex;
  padding-left: .5rem;
  flex: 1;
  justify-content: flex-end;
  align-items: center;
  .right-2-inner-div {
    flex: 1;
    color: #344054;
    font-size: 14px;
    font-variant: tabular-nums;
    line-height: 1.57143;
    display: flex;
    justify-content: flex-end;
    align-items: center;
    .right-2-inner-div-div {
      min-width: min-content;
      display: flex;
      justify-content: flex-end;
      align-items: center;
      button {
        margin-left: 0px!important;
        padding: 8px!important;
      }
    }
  }
}
.table-header-left-2 {
  flex-shrink: 0;
  display: flex;
  justify-content: flex-start;
  align-items: center;
}
</style>
