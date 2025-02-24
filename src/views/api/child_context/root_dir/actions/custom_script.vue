<template>
  <div v-if="props.element.type === 1" class="script-container">
    <div class="script-header" :class="{ 'default-active': open_script }" @click="open_script = !open_script">
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
          <span>自定义脚本</span>
        </div>
        <div class="script-header-desc">
          <div>{{ script_desc }}</div>
        </div>
      </div>
    </div>
    <Transition name="slide">
    <div v-show="open_script" class="script-body">
      <div class="script-content">
        <div class="script-content-item">
            <el-row style="width: 100%;">
                <el-col :span="20">
                    <div class="editor-header">
                        <div style="font-size: 14px;font-weight: 400;">Python-12.0</div>
                    </div>
                    <PythonEditor ref="ediorPython" :code="code" @change="code_change"></PythonEditor>
                </el-col>
                <Transition name="slide">
                <el-col :span="4" class="tran-base">
                    <div class="script-code-fast">
                        <div class="script-code-fast-title">快捷代码</div>
                        <div class="script-code-fast-div" @click="insert_code('at.environment.get(\'variable_key\')\n')">获取环境变量</div>
                        <div class="script-code-fast-div" @click="insert_code('at.environment.set(\'variable_key\', \'variable_value\')\n')">设置环境变量</div>
                        <div class="script-code-fast-div" @click="insert_code('at.variables.get(\'variable_key\')\n')">获取临时变量</div>
                        <div class="script-code-fast-div" @click="insert_code('at.variables.set(\'variable_key\', \'variable_value\')\n')">设置临时变量</div>
                        <div class="script-code-fast-div" @click="insert_code('requests.get(\'http://localhost:6001\')\n')">发送接口请求</div>
                    </div>
                </el-col>
            </Transition>
            </el-row>
        </div>
      </div>
    </div>
</Transition>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import PythonEditor from '@/components/common/editor/PythonEditor.vue'
import { useRoute } from 'vue-router'
const route = useRoute()
const code: any = ref("")
const open_script = ref(false);
const props = defineProps({
  element: {
    type: Object,
    default: {},
  },
});
function close_expand() {
    open_script.value = false
}
// 暴露给父组件调用
defineExpose({
    close_expand
});

const script_desc:any = ref("")
const ediorPython:any = ref(null)

function insert_code(text: string) {
    ediorPython.value?.insertText(text)
}

function code_change(value: string) {
    script_desc.value = value
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
.tran-base {
    transition: max-height 0.3s ease;
}
.editor-header {
    height: 2.5rem;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
    padding-left: .75rem;
    padding-right: .75rem;
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
    justify-content:left;
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
