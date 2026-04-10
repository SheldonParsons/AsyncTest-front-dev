<template>
  <AstCodeEditor
    ref="editorRef"
    :modelValue="code ?? ''"
    :readonly="disabled"
    :shortcuts="shortcuts"
    :enableBusinessCompletions="true"
    height="500px"
    style="width: 100%;"
    @update:modelValue="code_change"
  />
</template>

<script lang="ts" setup>
import { ref } from 'vue';
import AstCodeEditor from '@/components/common/editor/AstCodeEditor.vue';

const emit = defineEmits(['change']);

const props = defineProps({
  pythonVersion: {
    type: String,
    default: 'Python 3.12.6',
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  showShortcuts: {
    type: Boolean,
    default: true,
  },
  isPostScript: {
    type: Boolean,
    default: false,
  },
  code: {
    type: null,
    default: '',
  },
  shortcuts: {
    type: Array as () => { label: string; code: string }[],
    default: () => [
      { label: '获取全局变量', code: "at.gv.get('variable_key')\n" },
      { label: '获取环境变量', code: "at.env.get('variable_key')\n" },
      { label: '获取生成器函数', code: "at.func.boolean(10, 20, 'true').value\n" },
      { label: '获取处理函数', code: "at.pipeline.sha('abc', 'sha1')\n" },
      { label: '获取环境名称', code: 'at.env_name\n' },
      { label: '创建自定义数据集', code: 'at.DataSet()\n' },
    ],
  },
  can_insert: {
    type: Boolean,
    default: true,
  },
});

const editorRef = ref<InstanceType<typeof AstCodeEditor> | null>(null);

function code_change(value: string) {
  emit('change', value);
}

function insertText(text: string) {
  if (props.can_insert === false) {
    (window as any).$toast({ title: '当前您无法修改脚本' });
    return;
  }
  editorRef.value?.insertText(text);
}

defineExpose({ insertText });
</script>
