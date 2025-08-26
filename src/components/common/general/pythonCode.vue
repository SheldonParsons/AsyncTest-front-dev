<template>
  <div class="script-editor-container">
    <div class="script-content">
      <el-row style="width: 100%">
        <el-col :span="showShortcuts ? 20 : 24">
          <div class="editor-header">
            <div>
              {{ pythonVersion }}
            </div>
          </div>
          <PythonEditor ref="editorRef" :code="real_code" :disable="disabled" @change="code_change"></PythonEditor>
        </el-col>
        <el-col v-if="showShortcuts" :span="4" class="tran-base">
          <div class="script-code-shortcuts">
            <div class="shortcuts-title">快捷代码</div>
            <div v-for="shortcut in shortcuts" :key="shortcut.label" class="shortcut-item"
              @click="insertCode(shortcut.code)">
              {{ shortcut.label }}
            </div>
            <!-- Conditionally render the response shortcut -->
            <div v-if="isPostScript" class="shortcut-item" @click="insertCode('await at.response()\\n')">
              获取响应内容
            </div>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import PythonEditor from "@/components/common/editor/PythonEditor.vue";

const emit = defineEmits(["change"])

// --- Props Definition ---
const props = defineProps({
  pythonVersion: {
    type: String,
    default: "Python 3.12.6",
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  // 控制是否显示快捷代码栏
  showShortcuts: {
    type: Boolean,
    default: true,
  },
  // 控制是否显示“获取响应内容”
  isPostScript: {
    type: Boolean,
    default: false,
  },
  code: {
    type: null,
    default: ''
  },
  // 使快捷代码列表可配置
  shortcuts: {
    type: Array as () => { label: string; code: string }[],
    default: () => [
      { label: "获取全局变量", code: "at.gv.get('variable_key')\n" },
      { label: "获取环境变量", code: "at.env.get('variable_key')\n" },
      { label: "获取临时变量", code: "at.temp.get('variable_key')\n" },
      { label: "获取生成器函数", code: "at.func.boolean(10, 20, 'true').value\n" },
      { label: "获取处理函数", code: "at.pipeline.sha('abc', 'sha1')\n" },
      { label: "获取环境名称", code: "at.env_name\n" },
      { label: "创建自定义数据集", code: "at.DataSet()\n" }
    ],
  },
});

const real_code = ref("")

// --- Component Logic ---
const editorRef = ref<{ insertText: (text: string) => void } | null>(null);

function insertCode(text: string) {
  editorRef.value?.insertText(text);
}

onMounted(async () => {
  real_code.value = props.code
})

async function code_change(value: string) {
  emit('change', value)
}
</script>

<style lang="scss" scoped>
.script-editor-container {
  border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
}

.script-content {
  .editor-header {
    height: 40px;
    background-color: #f7f7f7;
    border-bottom: 1px solid #e0e0e0;
    box-sizing: border-box;
  }
}

.script-code-shortcuts {
  height: 100%;
  box-sizing: border-box;
  border-left: 1px solid #e0e0e0;
  background-color: #fafafa;
  padding: 8px;
  font-size: 13px;

  .shortcuts-title {
    font-weight: 500;
    margin-bottom: 10px;
    color: #333;
  }

  .shortcut-item {
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease;

    &:hover {
      background-color: #e9e9e9;
    }
  }
}

// Transition styles
.slide-enter-active,
.slide-leave-active {
  transition: all 0.3s ease-out;
}

.slide-enter-from,
.slide-leave-to {
  transform: translateX(100%);
  opacity: 0;
}
</style>
