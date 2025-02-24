<template>
  <div v-if="props.element.type === 3" class="script-container">
    <div
      class="script-header"
      :class="{ 'default-active': open_script }"
      @click="open_script = !open_script"
    >
      <div style="box-sizing: border-box" class="script-header-icon">
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
        <el-row style="margin-top: 20px">
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
              <div style="width: 600px"><el-input></el-input></div>
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
                  v-model="database"
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
                  <Params></Params>
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
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import SqlEditor from "@/components/common/editor/SqlEditor.vue";
import { useRoute } from "vue-router";
import Params from '@/views/api/child_component/params.vue'
const route = useRoute();
const code: any = ref("");
const database: any = ref(0);
const open_script = ref(true);
const props = defineProps({
  element: {
    type: Object,
    default: {},
  },
});
function close_expand() {
  open_script.value = false;
}
// 暴露给父组件调用
defineExpose({
  close_expand,
});

const script_desc: any = ref("");
const ediorSql: any = ref(null);

function insert_code(text: string) {
  ediorSql.value?.insertText(text);
}

function code_change(value: string) {
  script_desc.value = value;
}
</script>

<style scoped lang="scss">
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
    color: #039e74;
    cursor: pointer;
  }
}
.script-code-fast-div:hover {
  background-color: var(--el-color-primary-light-9);
}
.script-container {
  margin-top: 10px;
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
