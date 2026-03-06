<template>
  <Teleport to="body" :disabled="!isMaximized">
    <div class="script-editor-container" :class="[{ maximized: isMaximized }]">
      <div class="script-content">
        <div style="height: 40px;">
          <div class="editor-header">
            <div>
              {{ pythonVersion }}
            </div>
            <div class="max">
              <motion.div :while-hover="{ scale: 1.05 }" :while-press="{ scale: 0.9 }" @click="toggleMaximize">
                <MaxBtn></MaxBtn>
              </motion.div>
            </div>
          </div>
        </div>
        <div style="display: flex;height: calc(100% - 40px);overflow: hidden;">
          <PythonEditor ref="editorRef" :code="code" :disable="disabled" @change="code_change" style="flex: 80;">
          </PythonEditor>
          <div class="script-code-shortcuts" style="flex: 20;">
            <div v-for="shortcut in shortcuts" :key="shortcut.label" class="shortcut-item"
              @click="insertCode(shortcut.code)">
              {{ shortcut.label }}
            </div>
          </div>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script lang="ts" setup>
import { ref, onMounted } from "vue";
import { motion } from 'motion-v'
import PythonEditor from "@/components/common/editor/PythonEditor.vue";
import MaxBtn from '@/components/common/mini_btn/max.vue'
// 最大化状态
function toggleMaximize() {
  isMaximized.value = !isMaximized.value
}

const isMaximized = ref(false)

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
      { label: "获取生成器函数", code: "at.func.boolean(10, 20, 'true').value\n" },
      { label: "获取处理函数", code: "at.pipeline.sha('abc', 'sha1')\n" },
      { label: "获取环境名称", code: "at.env_name\n" },
      { label: "创建自定义数据集", code: "at.DataSet()\n" }
    ],
  },
  can_insert: {
    type: Boolean,
    default: true
  }
});

const real_code = ref("")

// --- Component Logic ---
const editorRef = ref<{ insertText: (text: string) => void } | null>(null);

function insertCode(text: string) {
  if (props.can_insert === false) {
    window.$toast({ title: '当前您无法修改脚本' })
    return
  }
  editorRef.value?.insertText(text);
}

// onMounted(async () => {
//   real_code.value = props.code
// })

async function code_change(value: string) {
  emit('change', value)
}
</script>

<style lang="scss" scoped>
.maximized {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100% !important;
  z-index: 9999;
  background: white;
  display: flex;
  flex-direction: column;
  padding: 10px;
  box-sizing: border-box !important;
}

.script-editor-container {
  // border: 1px solid #e0e0e0;
  border-radius: 8px;
  overflow: hidden;
  height: 400px;
  width: 100%;
}

.script-content {
  height: 100%;
  width: 100%;
  box-sizing: border-box;
  overflow: hidden;

  .editor-header {
    height: 40px;
    background-color: #252526;
    color: #cccccc;
    border-bottom: 1px solid #cccccc;
    box-sizing: border-box;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding-left: 0.75rem;
    padding-right: 0.75rem;
    border-top-left-radius: 10px;
    border-top-right-radius: 10px;
  }
}

.script-code-shortcuts {
  height: 100%;
  box-sizing: border-box;
  border-left: 1px solid #e0e0e0;
  /* 保持原有边框色 */
  /* 1. 使用一个更干净的、几乎是白色的背景 */
  background-color: #f8f9fa;
  padding: 8px;
  font-size: 13px;

  .shortcuts-title {
    font-weight: 500;
    margin-bottom: 10px;
    /* 2. 使用一个柔和的深灰色作为文字颜色 */
    color: #495057;
  }

  .shortcut-item {
    padding: 6px 8px;
    border-radius: 4px;
    cursor: pointer;
    transition: background-color 0.2s ease, color 0.2s ease;
    /* 添加颜色过渡 */
    color: #495057;

    &:hover {
      /* 3. 悬停时使用淡蓝色背景和主题色文字 */
      background-color: #cccccc;
      color: #000000;
      /* 一个示例蓝色，您可以换成您的主题色 */
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
