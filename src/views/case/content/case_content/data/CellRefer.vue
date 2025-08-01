<template>
  <div class="dynamic-cell">
    <div class="field">
      <textarea class="mul-row-inputer" ref="inputRef" spellcheck="false" @keydown.stop v-model="val" :rows="1" placeholder="字段名" />
      <div class="edit-div" @click="show_edit_value">
        <el-icon :size="18">
          <FullScreen />
        </el-icon>
      </div>
    </div>
  </div>
  <EditValue ref="editValueDialog" @add_code="add_code"
    :env_name="props.params.column.colDef.headerComponentParams.env_name"></EditValue>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import EditValue from "@/views/api/child_component/edit_value.vue";
const props = defineProps(['params'])
const val = ref(props.params.value?.data ?? '')
const inputRef = ref()
const editValueDialog: any = ref(null);
onMounted(() => {
  document.addEventListener('mousedown', handleClick, true)
  nextTick(() => {
    inputRef.value?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClick, true)
})

function add_code(content: any) {
  val.value = content
  nextTick(() => {
    props.params.stopEditing()
  })
}

const handleClick = (e: any) => {
  const isInCell = e.target.closest('.dynamic-cell')
  const isInDialog = e.target.closest('.el-overlay-dialog')
  if (!isInCell && !isInDialog) {
    props.params.stopEditing()
  }
}

function show_edit_value() {
  editValueDialog.value.open_dialog();
  editValueDialog.value.set_code(val.value.toString());
}

// AG Grid 会自动在编辑完成时用 val.value 的值覆盖 rowData 对应字段
defineExpose({
  getValue: () => ({
    ...props.params.value,  // 保留原有 id、其它字段
    data: val.value         // 覆盖 data 字段
  })
})
</script>
