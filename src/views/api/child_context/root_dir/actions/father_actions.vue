<template>
  <div class="script-container">
    <div
      class="script-header"
      :class="{ 'default-active': open_script }"
      @click="open_script = !open_script"
    >
      <div style="box-sizing: border-box" class="script-header-icon">
        <el-switch
          class="script-action-switch"
          v-model="props.elements.status"
          @click.stop
          size="small"
        />
        <el-icon class="script-action-icon" size="12">
          <ArrowRightBold v-if="open_script === false" />
          <ArrowDownBold v-if="open_script === true" />
        </el-icon>
      </div>
      <div class="script-header-content">
        <div class="script-header-title">
          <span>父级操作</span>
        </div>
      </div>
    </div>
    <Transition name="slide">
      <div v-show="open_script" class="script-body">
        <div v-for="(element, index) in elements.elements" :key="index">
          <CustomScript
            :disable="true"
            v-if="element.t === 1"
            :element="element"
          ></CustomScript>
          <WaitTime
            :disable="true"
            v-if="element.t === 2"
            :element="element"
          ></WaitTime>
          <DataBase
            :disable="true"
            v-if="element.t === 3"
            :element="element"
          ></DataBase>
          <Extract
            :disable="true"
            v-if="element.t === 4"
            :element="element"
          ></Extract>
          <Assertion
            :disable="true"
            v-if="element.t === 5"
            :element="element"
          ></Assertion>
        </div>
        <div
          v-show="elements.elements.length === 0"
          style="display: flex; justify-content: center; align-items: center"
        >
          <Empty></Empty>
        </div>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { ApiGetInterfaceDatabases } from "@/api/interface/index";
import CustomScript from "./custom_script.vue";
import WaitTime from "./wait_time.vue";
import DataBase from "./data_base.vue";
import Extract from "./extract.vue";
import Assertion from "./assertion.vue";
import Empty from "@/views/api/child_component/params_child/comp/empty.vue";
const databaseSelect: any = ref(null);
const open_script = ref(false);
const dropdownRef: any = ref(null);
const databse_list: any = ref([]);
const show_database_dialog = ref(false);
const variable_options = ref([
  {
    label: "临时变量",
    value: "temp",
  },
  {
    label: "全局变量",
    value: "global",
  },
  {
    label: "环境变量",
    value: "env",
  },
]);
const props = defineProps({
  elements: {
    type: null,
    default: () => [],
  },
});
const emit = defineEmits([
  "add_database_param",
  "delete_database_param",
  "dup_action",
  "delete_action",
  "change_code",
]);

function changeDatabaseHandle(databases: any) {
  console.log(databases);
  databse_list.value = databases;
}

async function get_databases() {
  ApiGetInterfaceDatabases({}).then((res) => {
    databse_list.value = res;
  });
}
function close_expand() {
  open_script.value = false;
}
// 暴露给父组件调用
defineExpose({
  close_expand,
});

const handleTriggerClick = (e: any) => {
  e.stopPropagation();
  dropdownRef.value?.handleOpen(); // 手动控制下拉状态
};
function handleDupDelete(type: string) {
  if (type === "dup") {
    emit("dup_action");
  }
  if (type === "delete") {
    emit("delete_action");
  }
}

const open_database = () => {
  databaseSelect.value?.blur();
  show_database_dialog.value = true;
};

const script_desc: any = ref("");
const ediorSql: any = ref(null);

function handle_command(command: any) {
  command[0].t = command[1].value;
}

function addNearNode(index: number) {
  function _inner(item: any) {
    const emptyNode = {
      name: "",
      t: "temp",
      jsonpath: "",
    };
    item.splice(index + 1, 0, emptyNode);
  }
  emit("add_database_param", _inner);
}

function addNode() {
  function _inner(item: any) {
    const emptyNode = {
      name: "",
      t: "temp",
      jsonpath: "",
    };
    item.push(emptyNode);
  }
  emit("add_database_param", _inner);
}

function deleteNode(current_node: any) {
  function _inner(item: any) {
    item.splice(current_node.$index, 1);
  }
  emit("delete_database_param", _inner);
}

function insert_code(text: string) {
  ediorSql.value?.insertText(text);
}

async function code_change(value: string) {
  script_desc.value = value;
  emit("change_code", value);
}

function insert_params(text: string) {
  insert_code(text);
}
</script>

<style scoped lang="scss">
/* 若使用 scoped 需要添加穿透语法 */
:deep(.main-table) {
  /* 基础容器 */
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 2px 5px 0 rgba(0, 0, 0, 0.1);

  /* 表头 */
  .el-table__header {
    border-top-left-radius: 8px !important;
    border-top-right-radius: 8px !important;

    tr th {
      background: #f5f7fa;
    }

    /* 首行首列 */
    tr:first-child th:first-child {
      border-top-left-radius: 8px !important;
    }

    /* 首行末列 */
    tr:first-child th:last-child {
      border-top-right-radius: 8px !important;
    }
  }

  /* 表格主体 */
  .el-table__body-wrapper {
    border-bottom-left-radius: 8px !important;
    border-bottom-right-radius: 8px !important;

    /* 末行首列 */
    tr:last-child td:first-child {
      border-bottom-left-radius: 8px !important;
    }

    /* 末行末列 */
    tr:last-child td:last-child {
      border-bottom-right-radius: 8px !important;
    }
  }

  /* 单元格边框调整 */
  td.el-table__cell,
  th.el-table__cell.is-leaf {
    border-bottom: none !important;
  }

  /* 最后一行底部边框 */
  tr:last-child td {
    border-bottom: 1px solid var(--el-table-border-color) !important;
  }
}

.action-icon {
  cursor: pointer;
}
.action-icon-close {
  margin-left: 3px;
}
.typing-span {
  cursor: pointer;
  display: flex;
  justify-self: center;
  align-items: center;
  height: 20px;
  font-weight: 600;
}
.private-input {
  margin: 0;
  padding: 0;
  border: none;
  border-bottom: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 14px;
  width: 100%;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.private-input:hover {
  color: black;
  border-bottom: 1px solid black !important;
}
.default-active {
  border-bottom-left-radius: 0px !important;
  border-bottom-right-radius: 0px !important;
}
/* 关键 CSS */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0 !important;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 1000px; /* 设置一个足够大的值 */
}
.editor-header {
  height: 2.5rem;
  border-top-left-radius: 10px;
  border-top-right-radius: 10px;
  padding-left: 0.75rem;
  padding-right: 0.75rem;
  flex-flow: wrap;
  min-width: 0;
  display: flex;
  flex-shrink: 0;
  align-items: center;
  flex-wrap: nowrap;
  border-bottom: 1px solid #f3f5f6;
}
.script-code-fast {
  display: flex;
  flex-direction: column;
  justify-content: left;
  border-left: 1px solid #f3f5f6;
  height: 100%;
  .script-code-fast-title {
    padding: 12px;
    font-size: 14px;
    font-weight: 500;
  }
  .script-code-fast-div {
    padding: 6px 12px;
    color: black;
    cursor: pointer;
  }
}
.script-code-fast-div:hover {
  background-color: var(--el-color-primary-light-9);
}
.script-container {
  margin-top: 5px;
  margin-bottom: 4px;
  border: 0 !important;
  box-sizing: border-box;
  color: #344054;
  font-size: 14px;
  .script-body {
    background-color: #fff;
    border-color: #5657580a;
    border-radius: 0 0 10px 10px;
    border-style: solid;
    border-width: 0 1.5px 1.5px;
    color: #344054;
    transition: max-height 0.3s ease;
    padding: 10px;
    .script-content {
      padding-top: 4px;
      justify-content: center;
      display: flex;
      padding: 16px;
      height: 100%;
      .script-content-item {
        flex-grow: 1;
        min-width: 400px;
        --wrap-border-line: 1px solid #f3f5f6;
        background-color: #fff;
        border: 1px solid #f3f5f6;
        border-radius: 6px;
        overflow: hidden;
        width: 100%;
        height: 100%;
        flex-wrap: nowrap;
        flex-flow: wrap;
        min-width: 0;
        display: flex;
        flex-direction: row;
      }
    }
  }
  .script-header {
    border-radius: 10px;
    // background-color: #5657580a;
    padding: 0px 100px 0px 12px;
    cursor: pointer;
    border: 1px solid #5657580a;
    align-items: center;
    height: 40px;
    display: flex;
    position: relative;
    .script-header-icon {
      display: block;
      unicode-bidi: isolate;
      color: rgba(16, 24, 40, 0.8);
      line-height: 1.57143;
      user-select: none;
      font-size: 14px;
      list-style: none;
      .script-action-icon {
        box-sizing: border-box;
        cursor: pointer;
        font-size: 18px;
        margin: 0;
        position: absolute;
        top: 50%;
        left: auto;
        right: 16px;
        transform: translateY(-50%);
      }
      .script-action-switch {
        box-sizing: border-box;
        cursor: pointer;
        font-size: 18px;
        margin: 0;
        position: absolute;
        top: 50%;
        left: auto;
        right: 60px;
        transform: translateY(-50%);
      }
      .script-action-dropdown {
        box-sizing: border-box;
        cursor: pointer;
        font-size: 18px;
        margin: 0;
        position: absolute;
        top: 50%;
        left: auto;
        right: 32px;
        transform: translateY(-50%);
      }
    }
    .script-header-content {
      flex: auto;
      overflow: hidden;
      box-sizing: border-box;
      cursor: pointer;
      display: flex;
      overflow: hidden;
      font-size: 0.875rem;
      align-items: center;
      box-sizing: border-box;
      .script-rank {
        left: -1px;
        display: flex;
        position: relative;
        align-items: center;
        box-sizing: border-box;
        font-size: 0.875rem;
      }
      .script-header-title {
        flex-basis: 144px;
        display: flex;
        flex-shrink: 0;
        flex-grow: 0;
        align-items: center;
        box-sizing: border-box;
        font-size: 0.875rem;
        span {
          cursor: pointer;
          color: rgba(16, 24, 40, 0.8);
          padding-left: 0.5rem;
        }
      }
      .script-header-desc {
        display: flex;
        padding-right: 0.25rem;
        overflow: hidden;
        align-items: center;
        div {
          white-space: nowrap;
          text-overflow: ellipsis;
          overflow: hidden;
          opacity: 0.5;
          margin-right: 0.5rem;
          flex-shrink: 1;
        }
      }
    }
  }
}
.drag-handle:hover {
  svg {
    color: black;
  }
}
</style>

<style lang="scss"></style>
