<template>
  <el-row style="margin-top: 40px" v-if="multipleSelection.length === 0">
    <el-col :offset="1" :span="22">
      <div class="header">
        <h3 style="font-weight: 600; font-size: 14px; margin: 0px">
          文件管理（项目）
        </h3>
        <div class="table-header-right">
          <div
            class="mt-4"
            style="display: flex; justify-content: center; align-items: center"
          >
            <el-input
              v-model="search"
              style="max-width: 600px"
              placeholder="输入关键字进行搜索"
              class="input-with-select"
              @input="search_file"
            >
              <template #append>
                <el-button :icon="Search" />
              </template>
            </el-input>
            <el-button
              style="margin-left: 10px"
              type="primary"
              @click="show_dialog = true"
              >新建</el-button
            >
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 40px" v-if="multipleSelection.length > 0">
    <el-col :offset="1" :span="22">
      <div class="header-2">
        <div class="table-header-left-2">
          <div style="color: #667085; font-size: 14px">
            已选
            <span style="font-weight: 600; color: #344054">{{
              multipleSelection.length
            }}</span
            >/{{ file_list.length }} 项
          </div>
          <span
            style="
              color: #039e74;
              margin-left: 0.5rem;
              cursor: pointer;
              font-size: 14px;
            "
            @click="clean_select"
            >取消选择</span
          >
        </div>
        <div class="table-header-right-2">
          <div class="right-2-inner-div">
            <div class="right-2-inner-div-div">
              <el-button :icon="Delete" @click="delete_select" type="" text
                >删除</el-button
              >
            </div>
            <el-divider direction="vertical" />
            <el-button
              :icon="CloseBold"
              @click="clean_select"
              type=""
              text
            ></el-button>
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="22">
      <el-table
        border
        class="normal-table"
        :class="{ 'has-bottom-border': file_list.length === 0 }"
        ref="multipleTableRef"
        :data="file_list"
        style="width: 100%"
        @selection-change="handleSelectionChange"
        :header-cell-style="{ color: 'black', 'font-size': '14px' }"
      >
        <template #empty>
          <el-skeleton
            v-if="loading"
            animated
            style="
              width: 100%;
              display: flex;
              justify-content: start;
              align-items: center;
              flex-direction: column;
              margin-bottom: 20px;
            "
          >
            <template #template>
              <div
                v-for="item in 5"
                style="
                  width: 100%;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                  margin-top: 20px;
                "
              >
                <el-skeleton-item
                  variant="h1"
                  style="width: 2%; margin-left: 1%"
                />
                <el-skeleton-item
                  variant="h1"
                  style="width: 15%; margin-left: 5%"
                />
                <el-skeleton-item
                  variant="h1"
                  style="width: 15%; margin-left: 5%"
                />
                <el-skeleton-item
                  variant="h1"
                  style="width: 45%; margin-left: 5%"
                />
              </div>
            </template>
          </el-skeleton>
          <div v-else>
            <Empty></Empty>
          </div>
        </template>
        <el-table-column type="selection" width="55" />
        <el-table-column label="文件名">
          <template #default="scope"
            ><span style="font-size: 14px; font-weight: 500"
              ><a
                style="all: unset; cursor: pointer"
                :href="scope.row.key"
                :download="scope.row.name"
                >{{ scope.row.name }}</a
              ></span
            ></template
          >
        </el-table-column>
        <el-table-column label="上传时间" width="200">
          <template #default="scope">{{
            tools.getLocaleDateTime(scope.row.add_time, false)
          }}</template>
        </el-table-column>
        <el-table-column label="文件大小" width="150">
          <template #default="scope">{{
            scope.row.size > 1 * 1024 * 1024
              ? (scope.row.size / 1024 / 1024).toFixed(2) + "MB"
              : (scope.row.size / 1024).toFixed(2) + "KB"
          }}</template>
        </el-table-column>
        <el-table-column label="上传者" width="150">
          <template #default="scope">{{ scope.row.create_by }}</template>
        </el-table-column>
      </el-table>
    </el-col>
  </el-row>
  <FileDialog
    v-model="show_dialog"
    v-if="show_dialog"
    @action="upload_file"
    :title="'项目文件上传'"
    :action_title="'上传'"
  ></FileDialog>
</template>

<script lang="ts" setup>
import { onMounted, ref, getCurrentInstance } from "vue";
import { Search, Delete, CloseBold } from "@element-plus/icons-vue";
import FileDialog from "@/views/api/public_dialog/file_dialog.vue";
import Empty from "@/views/api/child_component/params_child/comp/empty.vue";
import {
  ApiUploadFiles,
  ApiDeleteFiles,
  ApiGetFile,
} from "@/api/project/index";
import { useRoute } from "vue-router";
import tools from "@/utils/tools";
import _ from "lodash";
import { HttpClass } from "@/utils/http";
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const multipleTableRef = ref<any>();
const multipleSelection = ref<any[]>([]);
const setting_drawer = ref(false);
const search = ref("");
const show_dialog = ref(false);
const file_list: any = ref([]);
const deleting = ref(false);
const uploading = ref(false);
const loading = ref(true);
let cancelTokenSource: any;
defineExpose({
  get_select,
  clean_select,
});

onMounted(() => {
  get_file_list(null);
});

function search_file() {
  loading.value = true;
  file_list.value = []
  get_file_list(search.value);
}
const get_file_list = _.debounce(
  (name) => {
    if (cancelTokenSource) {
      cancelTokenSource.cancel("取消重复请求");
    }
    cancelTokenSource = HttpClass.createCancelToken();
    file_list.value = [];
    let data: any = {
      project: route.params.project,
    };
    if (name !== null) {
      data.name = name;
    }
    loading.value = true;
    ApiGetFile({ params: data, cancelToken: cancelTokenSource.token })
      .then((data: any) => {
        loading.value = false;
        console.log(data);
        if (data.hasOwnProperty("result") && data.result === 0) {
          return false;
        } else {
          file_list.value = data.data;
        }
      })
      .catch((err: any) => {
        console.log(err);
      });
  },
  500,
  { maxWait: 1500 }
);

function upload_file(_file_list: any) {
  if (uploading.value === true) {
    tools.message("正在上传，请勿重复操作", proxy, "info");
    return;
  }
  if (_file_list.length === 0) {
    tools.message("请选择上传文件", proxy, "info");
    return;
  }
  tools.message("正在上传文件，请稍等...", proxy, "info");
  const _data = new FormData();
  for (var i = 0; i < _file_list.length; i++) {
    _data.append("files", _file_list[i]);
  }
  uploading.value = true;
  ApiUploadFiles(_data, { project: route.params.project }).then((data: any) => {
    console.log(data);
    if (tools.result_check(data, proxy) === false) return;
    file_list.value.unshift(...data.data);
    tools.message("文件上传完成", proxy, "success");
    show_dialog.value = false;
    uploading.value = false;
  });
}

function get_select() {
  return multipleSelection.value;
}
const handleSelectionChange = (val: any) => {
  console.log(val);
  multipleSelection.value = val;
};
function clean_select() {
  multipleSelection.value = [];
  multipleTableRef.value!.clearSelection();
}

function delete_select() {
  if (deleting.value === true) {
    tools.message("正在删除，请勿重复操作", proxy, "info");
    return;
  }
  tools.message("正在删除，请稍等...", proxy, "info");
  const data: any = {
    ids: [],
  };
  multipleSelection.value.forEach((item: any) => {
    data.ids.push(item.id);
  });
  console.log(data);
  deleting.value = true;
  ApiDeleteFiles(data).then((res: any) => {
    tools.message("删除成功", proxy, "success");
    clean_select();
    deleting.value = false;
    get_file_list(null);
  });
}
</script>

<style scoped lang="scss">
.has-bottom-border {
  border-bottom: 1px solid var(--border-color-light);
}
.drawer-header {
  padding: 12px 20px;
  .drawer-header-title {
    flex: 1;
    align-items: center;
    gap: 8px;
    min-width: 0;
    min-height: 0;
    display: flex;
    .close-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 5px;
      border-radius: 4px;
      cursor: pointer;
    }
    .title-div {
      display: flex;
      align-items: center;
      width: 100%;
      .title-div-inner {
        display: flex;
        flex: auto;
        justify-content: space-between;
        align-items: center;
        width: 100%;
        font-size: 16px;
        font-weight: 500;
        color: black;
        .title-div-submit {
          box-sizing: border-box;
          flex: 1;
          display: flex;
          justify-content: end;
        }
      }
    }
  }
}
.close-btn:hover {
  background-color: #f3f3f3;
}
.setting-icon {
  cursor: pointer;
  border-radius: 4px;
}
.setting-icon:hover {
  background-color: #eaeaea;
}
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
  background-color: rgba(16, 24, 40, 0.05);
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
  padding-left: 0.5rem;
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
        margin-left: 0px !important;
        padding: 8px !important;
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

<style lang="scss">
.drawer-database {
  width: 40% !important;
}
.normal-table {
  .el-scrollbar__wrap,
  .el-dropdown-menu__item {
    border-radius: 0px !important;
  }
}
</style>
