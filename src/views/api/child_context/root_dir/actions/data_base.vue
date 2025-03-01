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
          v-model="props.element.data.status"
          @click.stop
          size="small"
        />
        <el-dropdown @command="handleDupDelete" ref="dropdownRef" trigger="contextmenu" class="script-action-dropdown">
          <el-icon><MoreFilled @click.stop="handleTriggerClick"/></el-icon>
          <template #dropdown>
            <el-dropdown-menu>
              <el-dropdown-item command="dup">复制</el-dropdown-item>
              <el-dropdown-item command="delete">删除</el-dropdown-item>
            </el-dropdown-menu>
          </template>
        </el-dropdown>
        <el-icon class="script-action-icon" size="12">
          <ArrowRightBold v-if="open_script === false" />
          <ArrowDownBold v-if="open_script === true" />
        </el-icon>
      </div>
      <div class="script-header-content">
        <div class="script-rank" @mousedown.stop="open_script = false">
          <div class="drag-handle">
            <el-icon color="#d0d5dd"><Rank /></el-icon>
          </div>
        </div>
        <div class="script-header-title">
          <span>数据库操作</span>
        </div>
        <div class="script-header-desc">
          <div>{{ script_desc }}</div>
        </div>
      </div>
    </div>
    <Transition name="slide">
      <div v-show="open_script" class="script-body">
        <el-row style="padding-top: 20px">
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                操作名称<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-input v-model="props.element.data.name"></el-input>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px">
          <el-col :span="17">
            <div
              style="display: flex; justify-content: end; align-items: center"
            >
              <div style="display: flex">
                数据库连接<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div style="width: 600px">
                <el-select
                  v-model="props.element.data.database"
                  placeholder="Select"
                  style="width: 600px"
                >
                  <el-option
                    v-for="item in [{ value: 0, label: 'Testing' }]"
                    :key="item.value"
                    :label="item.label"
                    :value="item.value"
                  />
                  <template #footer>
                    <el-button text bg size="small"> 数据库连接管理 </el-button>
                  </template>
                </el-select>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px">
          <el-col :span="17">
            <div style="display: flex; justify-content: end; align-items: top">
              <div style="display: flex">
                SQL 命令<span
                  style="
                    font-size: 20px;
                    color: red;
                    margin-left: 3px;
                    margin-right: 3px;
                  "
                  >*</span
                >
              </div>
              <div
                style="
                  width: 600px;
                  border: 1px solid #f3f5f6;
                  border-radius: 10px;
                "
              >
                <div class="editor-header">
                  <Params @insert_action="insert_params"></Params>
                </div>
                <SqlEditor
                  ref="ediorSql"
                  :code="code"
                  @change="code_change"
                ></SqlEditor>
              </div>
            </div>
          </el-col>
        </el-row>
        <el-row style="margin-top: 20px">
          <el-col :span="17">
            <div style="display: flex; justify-content: end; align-items: top">
              <div
                style="
                  display: flex;
                  justify-content: center;
                  align-items: top;
                  margin-right: 5px;
                "
              >
                提取结果到变量<el-tooltip placement="top" effect="light">
                  <template #content>
                    <div
                      style="width: 200px; font-size: 14px; font-weight: 400"
                    >
                      将 SQL
                      运行结果赋值给指定名称的变量，该变量可用来给未来的变量所引用。
                    </div>
                  </template>
                  <el-icon color="#98a2b3"><Warning /></el-icon>
                </el-tooltip>
              </div>
              <div
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                "
              >
                <el-table
                  v-model:data="props.element.data.params"
                  style="width: 600px; margin-bottom: 20px"
                  row-key="id"
                  border
                  default-expand-all
                  class="main-table"
                >
                  <template #empty>
                    <SpecialButton @click="addNode"
                      >点击添加您的数据<el-icon><Plus /></el-icon
                    ></SpecialButton>
                  </template>
                  <el-table-column label="变量名">
                    <template #default="scope">
                      <el-row style="width: 100%">
                        <el-col :span="21">
                          <input
                            placeholder="变量名"
                            v-model="scope.row.name"
                            class="private-input"
                          />
                        </el-col>
                      </el-row>
                    </template>
                  </el-table-column>
                  <el-table-column label="变量类型" min-width="30%">
                    <template #default="scope">
                      <el-dropdown trigger="click" @command="handle_command">
                        <span class="typing-span">{{
                          variable_options.find(
                            (item: any) => item.value === scope.row.t
                          )?.label
                        }}</span>
                        <template #dropdown>
                          <el-dropdown-menu>
                            <el-dropdown-item
                              :command="[scope.row, item]"
                              v-for="(item, index) in variable_options"
                              >{{ item.label }}</el-dropdown-item
                            >
                          </el-dropdown-menu>
                        </template>
                      </el-dropdown>
                    </template>
                  </el-table-column>
                  <el-table-column label="JSONPath 表达式">
                    <template #default="scope">
                      <el-row style="width: 100%">
                        <el-col :span="21">
                          <input
                            placeholder="表达式"
                            v-model="scope.row.jsonpath"
                            class="private-input"
                          />
                        </el-col>
                      </el-row>
                    </template>
                  </el-table-column>
                  <el-table-column label="操作" min-width="20%">
                    <template #default="scope">
                      <el-tooltip
                        content="添加相邻节点"
                        placement="top"
                        effect="light"
                      >
                        <el-icon
                          @click="addNearNode(scope.$index)"
                          class="action-icon action-icon-plus"
                          color="black"
                          ><CirclePlus
                        /></el-icon>
                      </el-tooltip>
                      <el-tooltip
                        content="删除节点"
                        placement="top"
                        effect="light"
                      >
                        <el-icon
                          class="action-icon action-icon-close"
                          @click="deleteNode(scope)"
                          color="#FA8072"
                          ><CircleClose
                        /></el-icon>
                      </el-tooltip>
                    </template>
                  </el-table-column>
                </el-table>
              </div>
            </div>
          </el-col>
        </el-row>
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from "vue";
import SqlEditor from "@/components/common/editor/SqlEditor.vue";
import { useRoute } from "vue-router";
import Params from "@/views/api/child_component/params.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
const code = ref("")
const route = useRoute();
const open_script = ref(false);
const dropdownRef:any = ref(null)
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
  element: {
    type: Object,
    default: {},
  },
});
const emit = defineEmits(["add_database_param", "delete_database_param","dup_action","delete_action","change_code"]);
onMounted(async () => {
  script_desc.value = props.element.data.code;
  code.value = props.element.data.code;
});
function close_expand() {
  open_script.value = false;
}
// 暴露给父组件调用
defineExpose({
  close_expand,
});

const handleTriggerClick = (e:any) => {
  e.stopPropagation()
  dropdownRef.value?.handleOpen()  // 手动控制下拉状态
}
function handleDupDelete(type:string){
  if (type === 'dup') {
    emit("dup_action")
  }
  if (type === 'delete') {
    emit("delete_action")
  }
}

const script_desc: any = ref("");
const ediorSql: any = ref(null);

function handle_command(command: any) {
  command[0].t = command[1].value;
}

function addNearNode(index:number) {
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
  emit("change_code", value)
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
    padding-bottom: 10px;
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
    background-color: #5657580a;
    padding: 0px 40px 0px 12px;
    cursor: pointer;
    border: 0;
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
