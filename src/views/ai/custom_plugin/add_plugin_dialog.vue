<template>
  <el-dialog
    class="plugin-pen-dialog"
    v-model="showAddPluginPen"
    width="800"
    destroy-on-close
    @close="closePluginPen"
    :show-close="false"
    center
  >
    <div id="provider-pen" class="card-cover"></div>
    <template #header="{ close, titleId, titleClass }">
      <el-row>
        <el-col
          :offset="1"
          :span="23"
          style="display: flex; justify-content: left; align-items: center"
        >
          <h4 style="margin-bottom: 0px">添加提供商插件</h4>
        </el-col>
      </el-row>
      <el-divider></el-divider>
    </template>
    <el-row>
      <el-col :offset="1" :span="3" style="display: flex; align-items: center">
        <span style="font-size: 14px; color: #6b7280; font-weight: 700"
          >插件名</span
        ><el-icon class="header-icon">
          <info-filled />
        </el-icon>
      </el-col>
      <el-col :span="17">
        <el-input v-model="plugin_name"></el-input>
      </el-col>
    </el-row>
    <el-row style="margin-top: 30px">
      <el-col :offset="1" :span="3" style="display: flex; align-items: center">
        <span style="font-size: 14px; color: #6b7280; font-weight: 700"
          >URL</span
        ><el-icon class="header-icon">
          <info-filled />
        </el-icon>
      </el-col>
      <el-col :span="17">
        <el-input v-model="plugin_url"></el-input>
      </el-col>
    </el-row>
    <el-row style="margin-top: 30px">
      <el-col :offset="1" :span="3" style="display: flex; align-items: center">
        <span style="font-size: 14px; color: #6b7280; font-weight: 700"
          >Method</span
        ><el-icon class="header-icon">
          <info-filled />
        </el-icon>
      </el-col>
      <el-col :span="17">
        <el-select
          v-model="plugin_method"
          placeholder="Select"
          style="width: 240px"
        >
          <el-option
            v-for="item in options"
            :key="item.key"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-col>
    </el-row>
    <el-row style="margin-top: 30px">
      <el-col :offset="1" :span="3" style="display: flex; align-items: center">
        <span style="font-size: 14px; color: #6b7280; font-weight: 700"
          >提供商简介</span
        ><el-icon class="header-icon">
          <info-filled />
        </el-icon>
      </el-col>
      <el-col :span="17">
        <el-input
          v-model="plugin_desc"
          :rows="4"
          type="textarea"
          placeholder="Provider Description"
        />
      </el-col>
    </el-row>
    <el-row style="margin-top: 30px">
      <el-col :offset="1" :span="3" style="display: flex; align-items: center">
        <span style="font-size: 14px; color: #6b7280; font-weight: 700"
          >Parameters</span
        ><el-icon class="header-icon">
          <info-filled />
        </el-icon>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :offset="1" :span="22" class="table-col">
        <el-table
          v-model:data="tableData"
          style="width: 100%; margin-bottom: 20px"
          row-key="id"
          border
          default-expand-all
          class="main-table"
        >
          <template #empty>
            <SpecialButton @click="addEmptyData"
              >添加数据</SpecialButton>
          </template>
          <el-table-column label="名称" min-width="20%">
            <template #default="scope">
              <input v-model="scope.row.name" class="private-input" />
            </template>
          </el-table-column>
          <el-table-column label="描述" min-width="20%">
            <template #default="scope">
              <input v-model="scope.row.desc" class="private-input" />
            </template>
          </el-table-column>
          <el-table-column label="位置" min-width="20%">
            <template #default="scope">
              <el-select
                v-model="scope.row.position"
                placeholder="Select"
                style="width: 100%"
              >
                <el-option
                  v-for="item in position_options"
                  :key="item.key"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="必填" min-width="15%">
            <template #default="scope">
              <el-switch v-model="scope.row.necessary" />
            </template>
          </el-table-column>
          <el-table-column label="类型" min-width="15%">
            <template #default="scope">
              <el-select
                v-model="scope.row.type"
                placeholder="Select"
                style="width: 100%"
              >
                <el-option
                  v-for="item in type_options"
                  :key="item.key"
                  :label="item.label"
                  :value="item.value"
                />
              </el-select>
            </template>
          </el-table-column>
          <el-table-column label="操作" min-width="15%">
            <template #default="scope">
              <el-tooltip content="添加节点" placement="top" effect="light">
                <el-icon
                  @click="addEmptyData"
                  class="action-icon action-icon-plus"
                  color="#009879"
                  ><CirclePlus
                /></el-icon>
              </el-tooltip>
              <el-tooltip content="删除节点" placement="top" effect="light">
                <el-icon
                  @click="deleteNode(scope.row)"
                  class="action-icon action-icon-close"
                  color="#FA8072"
                  ><CircleClose
                /></el-icon>
              </el-tooltip>
            </template>
          </el-table-column>
        </el-table>
      </el-col>
    </el-row>
    <el-divider></el-divider>
    <template #footer>
      <el-row style="padding-bottom: 10px">
        <el-col
          :offset="15"
          :span="9"
          style="display: flex; justify-content: end"
        >
          <el-button
            type="primary"
            @click="create_provider"
            class="ml-2"
            style="margin-right: 20px"
            >创建插件</el-button
          >
        </el-col>
      </el-row>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, watch } from "vue";
import { createProviderTool } from "@/api/ai/index";
import { useI18n } from "vue-i18n";
import SpecialButton from "@/components/common/button/special_button.vue";
import _ from "lodash";
import tools from "@/utils/tools";
const { t } = useI18n();
// 全局对象
const { proxy }: any = getCurrentInstance();
const plugin_name = ref("");
const plugin_desc = ref("");
const plugin_url = ref("");
const plugin_method = ref("GET");
const tableData: any = ref([]);
const showAddPluginPen = ref(false);
const emit = defineEmits(["close"]);
const options = [
  {
    key: "GET",
    label: "GET",
    value: "get",
  },
  {
    key: "POST",
    label: "POST",
    value: "post",
  },
  {
    key: "PUT",
    label: "PUT",
    value: "put",
  },
  {
    key: "DELETE",
    label: "DELETE",
    value: "delete",
  },
];
const type_options = [
  {
    key: "STR",
    label: "str",
    value: "str",
  },
  {
    key: "INT",
    label: "int",
    value: "int",
  },
  {
    key: "FLOAT",
    label: "float",
    value: "float",
  },
  {
    key: "BOOL",
    label: "bool",
    value: "bool",
  },
  {
    key: "LIST",
    label: "list",
    value: "list",
  },
];
const position_options = [
  {
    key: "PATH",
    label: "PATH",
    value: "path",
  },
  {
    key: "QUERY",
    label: "QUERY",
    value: "query",
  },
  {
    key: "BODY",
    label: "BODY",
    value: "body",
  },
  {
    key: "HEADER",
    label: "HEADER",
    value: "header",
  },
];

const prop = defineProps({
  showDialog: {
    type: Boolean,
    default: false,
  },
  provider: {
    type: Number,
    default: 0,
  },
});

watch(
  () => prop.showDialog,
  (val) => {
    showAddPluginPen.value = val;
  }
);

function create_provider() {
  if (checking() === false) return;
  const data = {
    name: plugin_name.value,
    description: plugin_desc.value,
    url: plugin_url.value,
    method: plugin_method.value,
    parameters: JSON.stringify(tableData.value),
    provider: prop.provider,
  };
  createProviderTool(data).then((res: any) => {
    console.log(res);
    if (Array.isArray(res.name)) {
      tools.message(t(res.name[0]), proxy);
    } else {
      closePluginPen();
      window.$toast({title:'创建成功', type:'success'})
    }
  });
}

function checking() {
  if (plugin_name.value === "") {
    tools.message(t("请输入插件名称"), proxy);
    return false;
  }
  if (plugin_desc.value === "") {
    tools.message(t("请输入插件描述信息"), proxy);
    return false;
  }
  if (plugin_url.value === "") {
    tools.message(t("请输入插件url"), proxy);
    return false;
  }
  return true;
}

function addEmptyData() {
  const emptyNode = {
    name: "",
    desc: "",
    position: "query",
    necessary: false,
    type: "str",
    index: tableData.value.length,
  };
  tableData.value.push(emptyNode);
}

function deleteNode(current_node: any) {
  console.log(current_node);
  tableData.value.splice(current_node.index, 1);
}

function closePluginPen() {
  plugin_name.value = "";
  plugin_desc.value = "";
  plugin_url.value = "";
  plugin_method.value = "GET";
  tableData.value = [];
  console.log("jjjjkkkk");
  
  emit("close", false);
}
</script>

<style lang="scss" scoped>
@import "@/assets/scss/btn/card_btn.scss";
.card-cover {
  width: 100%;
  position: absolute;
  height: 10%;
  left: 0;
  will-change: top;
  background-size: cover;
  background-position: center;
  filter: blur(60px);
  // transform: scale(1.2);
  transition: 0.5s;
}
.private-input {
  margin: 0;
  padding: 0;
  border: none;
  border-bottom: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 15px;
  width: 100%;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.private-input:hover {
  color: var(--primary);
  border-bottom: 1px solid var(--primary) !important;
}
.action-icon {
  cursor: pointer;
}
.action-icon-close {
  margin-left: 3px;
}
.search {
  padding-top: 30px;
  // z-index: 900;
}
.main-data {
  padding-top: 20px;
}

.search-col {
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
}
.fade-enter-active {
  opacity: 1;
  transition: all 0.05s ease-in-out;
}
.fade-leave-active {
  opacity: 1;
  transition: all 0.3s linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.disappear-auto {
  @media screen and (max-width: 880px) {
    display: none;
  }
}

.copy-instance {
  font-size: 16px;
  cursor: pointer;
}

.el-popper.is-customized {
  /* Set padding to ensure the height is 32px */
  padding: 6px 12px !important;
  background: linear-gradient(90deg, rgb(159, 229, 151), rgb(204, 229, 129));
}

.el-popper.is-customized .el-popper__arrow::before {
  background: linear-gradient(45deg, #b2e68d, #bce689);
  right: 0;
}
</style>

<style lang="scss">
.provider-pen-dialog {
  border-radius: 10px;
  .el-dialog__footer {
    padding-top: 0px !important;
  }
  .el-dialog__body {
  }
  .el-avatar {
    .el-icon {
      font-size: 50px;
    }
  }
}
</style>
