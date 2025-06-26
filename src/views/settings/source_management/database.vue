<template>
  <el-row style="margin-top: 40px" v-if="multipleSelection.length === 0">
    <el-col :offset="1" :span="22">
      <div class="header">
        <h3 style="font-weight: 600; font-size: 14px; margin: 0px">
          数据库连接（项目）
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
              @input="search_info"
            >
              <template #append>
                <el-button :icon="Search" />
              </template>
            </el-input>
            <el-button
              style="margin-left: 10px"
              type="primary"
              @click="open_setting_drawer(null)"
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
            >/{{ tableData.length }} 项
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
        ref="multipleTableRef"
        class="normal-table"
        :class="{ 'has-bottom-border': tableData.length === 0 }"
        :data="tableData"
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
        <el-table-column label="名称" width="250">
          <template #default="scope">{{ scope.row.name }}</template>
        </el-table-column>
        <el-table-column label="数据库类型" width="250">
          <template #default="scope">{{
            databses_type_name_mapping[scope.row.type]
          }}</template>
        </el-table-column>
        <el-table-column label="说明">
          <template #default="scope">{{ scope.row.remark }}</template>
        </el-table-column>
        <el-table-column label="设置" width="70" class="setting-cell">
          <template #default="scope">
            <div
              style="
                display: flex;
                align-items: center;
                justify-content: center;
              "
            >
            <Setting style="height: 16px;cursor: pointer;" @click="open_setting_drawer(scope.row)"></Setting>
              <!-- <el-icon
                class="setting-icon"
                @click="open_setting_drawer(scope.row)"
                ><Setting
              /></el-icon> -->
            </div>
          </template>
        </el-table-column>
      </el-table>
    </el-col>
  </el-row>
  <el-drawer
    v-model="setting_drawer"
    v-if="setting_drawer"
    :show-close="false"
    class="drawer-database"
    :append-to-body="true"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="drawer-header">
        <div class="drawer-header-title">
          <div class="close-btn" @click="close">
            <el-icon><CloseBold /></el-icon>
          </div>
          <div class="title-div">
            <div class="title-div-inner">
              {{ is_edit ? "修改" : "新建" }}数据库连接
              <div class="title-div-submit">
                <el-button @click="close">取消</el-button>
                <el-button @click="save(close)" type="primary">保存</el-button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </template>
    <div class="database-info">
      <div>
        <el-input v-model="database_info.name" placeholder="数据库信息名称">
          <template #prepend
            >名称<span
              style="
                font-size: 20px;
                color: red;
                margin-left: 3px;
                margin-right: 3px;
              "
              >*</span
            ></template
          >
        </el-input>
      </div>
      <div>
        <el-input v-model="database_info.remark" placeholder="说明">
          <template #prepend
            >说明<span
              style="
                font-size: 20px;
                color: red;
                margin-left: 3px;
                margin-right: 3px;
              "
              >*</span
            ></template
          >
        </el-input>
      </div>
      <div class="info-select">
        <div class="info-select-left">
          数据库类型<span
            style="
              font-size: 20px;
              color: red;
              margin-left: 3px;
              margin-right: 3px;
            "
            >*</span
          >
        </div>
        <div class="info-select-right">
          <el-select
            v-model="database_info.type"
            placeholder="请选择数据库类型"
          >
            <el-option
              v-for="item in [
                { value: 'mysql', label: 'MySQL' },
                { value: 'pgsql', label: 'PostgreSQL' },
              ]"
              :key="item.value"
              :label="item.label"
              :value="item.value"
            />
          </el-select>
        </div>
      </div>
    </div>
    <div style="margin-top: 20px; margin-bottom: 20px">
      <el-divider>环境配置</el-divider>
    </div>
    <div style="margin-top: 20px">
      <div class="tab-core g-unselect">
        <div style="display: flex; gap: 5px; font-size: 14px; width: 100%">
          <div
            v-for="(item, index) in database_info.info"
            :class="{ 'active-tab': active_tab === item.id }"
            @click="active_tab = item.id"
            class="un-active-tab"
          >
            <span>{{ item.name }}</span>
          </div>
        </div>
      </div>
      <div v-for="(item, index) in database_info.info" style="margin-top: 20px">
        <div
          v-if="active_tab === item.id && item.is_default === 0"
          style="margin-bottom: 20px"
        >
          <el-switch
            v-model="item.config.source"
            :active-value="1"
            :inactive-value="0"
            active-text="单独配置"
            inactive-text="使用默认配置"
          />
        </div>
        <div
          v-if="active_tab === item.id"
          style="display: flex; flex-direction: column; gap: 20px"
        >
          <div>
            <el-input
              v-model="item.config.host"
              placeholder="IP/Host"
              :disabled="item.config.source === 0 && item.is_default === 0"
            >
              <template #prepend
                >数据库地址<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                ></template
              >
            </el-input>
          </div>
          <div>
            <el-input
              v-model="item.config.port"
              placeholder="端口号（3306）"
              :disabled="item.config.source === 0 && item.is_default === 0"
            >
              <template #prepend
                >端口<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                ></template
              >
            </el-input>
          </div>
          <div>
            <el-input
              v-model="item.config.username"
              placeholder="用户名"
              :disabled="item.config.source === 0 && item.is_default === 0"
            >
              <template #prepend
                >用户名<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                ></template
              >
            </el-input>
          </div>
          <div>
            <el-input
              v-model="item.config.password"
              placeholder="密码"
              :disabled="item.config.source === 0 && item.is_default === 0"
            >
              <template #prepend
                >密码<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                ></template
              >
            </el-input>
          </div>
          <div>
            <el-input
              v-model="item.config.database_name"
              placeholder="数据库名"
              :disabled="item.config.source === 0 && item.is_default === 0"
            >
              <template #prepend
                >数据库名<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                ></template
              >
            </el-input>
          </div>
        </div>
        <div v-if="active_tab === item.id" style="margin-top: 20px">
          <span
            class="g-unselect"
            @click="connection_valid(item)"
            style="
              font-size: 14px;
              border-bottom: 1px solid #dcdfe6;
              cursor: pointer;
            "
            >测试连接</span
          >
        </div>
      </div>
    </div>
  </el-drawer>
</template>

<script lang="ts" setup>
import { onMounted, ref, getCurrentInstance } from "vue";
import { Search, Delete, CloseBold } from "@element-plus/icons-vue";
import Setting from "@/assets/svg/menu/setting.vue"
import Empty from "@/views/api/child_component/params_child/comp/empty.vue";
import _ from "lodash";
import { HttpClass } from "@/utils/http";
import { useRoute } from "vue-router";
import tools from "@/utils/tools";
import { ApiGetSummarySource } from "@/api/interface/index";
import {
  ApiGetDatabaseInfo,
  ApiPostDatabaseInfo,
  ApiEditDatabaseInfo,
  ApiDeleteDatabase,
  ApiPostDatabaseConnectionValid,
} from "@/api/project/index";
let cancelTokenSource: any;
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const active_tab = ref(-1);
const multipleTableRef = ref<any>();
const multipleSelection = ref<any[]>([]);
const setting_drawer = ref(false);
const search = ref("");
const tableData: any = ref([]);
const loading = ref(true);
const deleting = ref(false);
const current_edit_database_id = ref(null);
const emit = defineEmits(["changeDatabase"]);
const handleSelectionChange = (val: any) => {
  multipleSelection.value = val;
};
function clean_select() {
  multipleSelection.value = [];
  multipleTableRef.value!.clearSelection();
}
onMounted(() => {
  get_database_list(null);
});

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
  ApiDeleteDatabase(data).then((res: any) => {
    tools.message("删除成功", proxy, "success");
    clean_select();
    deleting.value = false;
    get_database_list(null);
  });
}

function search_info() {
  loading.value = true;
  tableData.value = [];
  get_database_list(search.value);
}

function connection_valid(item: any) {
  console.log(item);
  if (item.config.host.length === 0) {
    tools.message(`数据库地址不能为空`, proxy, "info");
    return false;
  }
  if (item.config.port.length === 0) {
    tools.message(`端口不能为空`, proxy, "info");
    return false;
  }
  if (item.config.username.length === 0) {
    tools.message(`用户名能为空`, proxy, "info");
    return false;
  }
  if (item.config.password.length === 0) {
    tools.message(`密码不能为空`, proxy, "info");
    return false;
  }
  if (item.config.database_name.length === 0) {
    tools.message(`数据库名不能为空`, proxy, "info");
    return false;
  }
  let data: any = _.cloneDeep(item.config);
  data.type = database_info.value.type;
  console.log(data);

  ApiPostDatabaseConnectionValid(data, {}).then((res: any) => {
    if (res.result === 0) {
      tools.message(res.data, proxy, "error");
    } else {
      tools.message(`连接成功：${res.data.version}`, proxy, "success");
    }
  });
}

const get_database_list = _.debounce(
  (name) => {
    if (cancelTokenSource) {
      cancelTokenSource.cancel("取消重复请求");
    }
    cancelTokenSource = HttpClass.createCancelToken();
    tableData.value = [];
    let data: any = {
      project: route.params.project,
    };
    if (name !== null) {
      data.name = name;
    }
    loading.value = true;
    ApiGetDatabaseInfo({ params: data, cancelToken: cancelTokenSource.token })
      .then((data: any) => {
        if (result_check(data) === false) return false;
        console.log(data);
        loading.value = false;
        if (data.hasOwnProperty("result") && data.result === 0) {
          return false;
        } else {
          tableData.value = data.data;
          emit("changeDatabase", tableData.value);
        }
      })
      .catch((err: any) => {
        console.log(err);
      });
  },
  500,
  { maxWait: 1500 }
);

const database_info: any = ref();
const databses_type_name_mapping: any = {
  mysql: "MySQL",
  pgsql: "PostgreSQL",
};

const is_edit = ref(false);

async function open_setting_drawer(row: any) {
  tools.message("正在获取环境配置信息，请稍等", proxy, "info");
  if (row !== null) {
    console.log(row);

    current_edit_database_id.value = row.id;
    await ApiGetSummarySource({
      project: route.params.project,
      source: "env",
    }).then((res: any) => {
      tools.message("获取成功", proxy, "success");
      console.log(res);

      let cache_info_list: any = [];
      cache_info_list.push(
        ...row.info.filter((item: any) => {
          if (item.is_default === 1) {
            active_tab.value = item.id;
            return true;
          }
        })
      );
      res.forEach((env_item: any) => {
        const search_info = row.info.filter((info_item: any) => {
          if (info_item.name === env_item.name) {
            return true;
          }
          return false;
        });
        console.log(search_info);

        if (search_info.length === 1) {
          cache_info_list.push(search_info[0]);
        } else if (search_info.length === 0) {
          console.log(env_item.name);

          cache_info_list.push({
            id: tools.getRandomInt(1000000, 9999999),
            name: env_item.name,
            is_default: 0,
            config: {
              source: 0,
              host: "",
              port: "",
              username: "",
              password: "",
              database_name: "",
              options: {},
            },
          });
        }
      });
      row.info = cache_info_list;
      database_info.value = row;
      console.log(database_info.value);
    });
    is_edit.value = true;
  } else {
    await ApiGetSummarySource({
      project: route.params.project,
      source: "env",
    }).then((res: any) => {
      tools.message("获取成功", proxy, "success");
      console.log(res);
      const default_id = tools.getRandomInt(1000000, 9999999);
      active_tab.value = default_id;
      let settings = [
        {
          id: default_id,
          name: "默认环境",
          is_default: 1,
          config: {
            source: 0,
            host: "",
            port: "",
            username: "",
            password: "",
            database_name: "",
            options: {},
          },
        },
      ];
      res.forEach((item: any) => {
        settings.push({
          id: tools.getRandomInt(1000000, 9999999),
          name: item.name,
          is_default: 0,
          config: {
            source: 0,
            host: "",
            port: "",
            username: "",
            password: "",
            database_name: "",
            options: {},
          },
        });
      });
      database_info.value = {
        name: "",
        remark: "",
        type: "mysql",
        info: settings,
      };
    });
    is_edit.value = false;
  }
  setting_drawer.value = true;
}

function save(close: any) {
  console.log(tableData.value);
  if (checking_params(database_info.value) === false) return;
  if (is_edit.value) {
    ApiEditDatabaseInfo(database_info.value.id, {}, database_info.value).then(
      (res: any) => {
        if (result_check(res) === false) return false;
        tools.message("修改成功", proxy, "success");
        close();
      }
    );
    console.log(database_info.value);
  } else {
    console.log(database_info.value);
    ApiPostDatabaseInfo(database_info.value, {
      project: route.params.project,
    }).then((res: any) => {
      if (result_check(res) === false) return false;
      tableData.value.push(res.data);
      console.log(res);
      tools.message("新增成功", proxy, "success");
      close();
    });
  }
  emit("changeDatabase", tableData.value);
}

function result_check(data: any) {
  if (data.hasOwnProperty("result") && data.result === 0) {
    tools.message(data.data, proxy, "error");
    return false;
  }
  return true;
}

function checking_params(data: any) {
  if (data.name.length === 0) {
    tools.message("数据库名称不能为空", proxy, "info");
    return false;
  }
  if (data.remark.length === 0) {
    tools.message("说明不能为空", proxy, "info");
    return false;
  }
  for (let i = 0; i < data.info.length; i++) {
    if (data.info[i].is_default === 1 || data.info[i].config.source === 1) {
      if (data.info[i].config.host.length === 0) {
        tools.message(
          `${data.info[i].name}：数据库地址不能为空`,
          proxy,
          "info"
        );
        return false;
      }
      if (data.info[i].config.port.length === 0) {
        tools.message(`${data.info[i].name}：端口不能为空`, proxy, "info");
        return false;
      }
      if (data.info[i].config.username.length === 0) {
        tools.message(`${data.info[i].name}：用户名能为空`, proxy, "info");
        return false;
      }
      if (data.info[i].config.password.length === 0) {
        tools.message(`${data.info[i].name}：密码不能为空`, proxy, "info");
        return false;
      }
      if (data.info[i].config.database_name.length === 0) {
        tools.message(`${data.info[i].name}：数据库名不能为空`, proxy, "info");
        return false;
      }
    }
  }
  return true;
}

function getRandomInt(min: any, max: any) {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
}
</script>

<style scoped lang="scss">
.has-bottom-border {
  border-bottom: 1px solid var(--border-color-light);
}
.tab-core {
  display: flex;
  justify-content: space-between;
  font-size: 14px;
  border-bottom: 1px solid var(--border-color);
  div {
    cursor: pointer;
    // padding-bottom: 5px;
    span {
      padding: 3px 10px;
    }
    span:hover {
      background-color: var(--hover-bg);
      border-radius: 8px;
    }
    .response-name-status {
      padding: 3px 10px;
    }
    .response-name-status:hover {
      background-color: var(--hover-bg);
      border-radius: 8px;
    }
  }
  .active-tab {
    font-weight: 500;
    border-bottom: 2px solid black !important;
    padding-bottom: 5px;
  }
  .un-active-tab {
    border-bottom: 2px solid transparent;
    padding-bottom: 5px;
  }
}
.drawer-header {
  border-bottom: 1px solid var(--border-color-light);
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
.normal-table {
  .el-scrollbar__wrap,
  .el-dropdown-menu__item {
    border-radius: 0px !important;
  }
}
.database-info {
  display: flex;
  flex-direction: column;
  gap: 20px;
  .info-select {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 100%;
    .info-select-left {
      flex: 15;
      background-color: #f5f7fa;
      height: 28px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      color: #909399;
      border-radius: 4px 0px 0px 4px;
      border: 1px solid #dcdfe6;
      border-right: none;
    }
    .info-select-right {
      flex: 85;
      .el-select__wrapper {
        height: 30px !important;
        border-radius: 0px 4px 4px 0px !important;
      }
    }
  }
}
</style>
