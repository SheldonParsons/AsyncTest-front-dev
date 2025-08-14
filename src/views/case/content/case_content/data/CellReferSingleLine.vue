<template>
  <div class="dynamic-cell">
    <div class="field">
      <input class="mul-row-inputer" spellcheck="false" ref="inputRef" @keydown.stop v-model="val" placeholder="字段名" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, nextTick, onUnmounted } from 'vue'
const props = defineProps(['params'])
const val = ref(props.params.value?.data ?? '')
const inputRef = ref()
onMounted(() => {
  document.addEventListener('mousedown', handleClick, true)
  nextTick(() => {
    inputRef.value?.focus()
  })
})

onUnmounted(() => {
  document.removeEventListener('mousedown', handleClick, true)
})

const handleClick = (e: any) => {
  const isInCell = e.target.closest('.dynamic-cell')
  if (!isInCell) {
    props.params.stopEditing()
  }
}

// AG Grid 会自动在编辑完成时用 val.value 的值覆盖 rowData 对应字段
defineExpose({
  getValue: () => ({
    ...props.params.value,  // 保留原有 id、其它字段
    data: val.value         // 覆盖 data 字段
  })
})
</script>
