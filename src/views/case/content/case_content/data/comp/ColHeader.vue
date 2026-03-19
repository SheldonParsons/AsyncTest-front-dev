<template>
  <div class="ast-col-header">
    <div class="col-name-wrapper">
      <input
        v-if="!isFixed"
        ref="nameInputRef"
        class="col-name-input"
        v-model="localName"
        spellcheck="false"
        @focus="onNameFocus"
        @blur="onNameBlur"
        @keydown.enter.prevent="(nameInputRef as HTMLInputElement)?.blur()"
        @keydown.esc.prevent="resetName"
        :title="localName"
      />
      <span v-else class="col-name-text" :title="col.name">{{ col.name }}</span>
    </div>

    <div class="col-header-tools">
      <span v-if="isFixed" class="col-fixed-chip">主列</span>
      <Info :desc="col.desc ?? ''" />
      <ColSelect
        :has_action="isFixed ? ['edit'] : ['edit', 'delete']"
        @edit_col="() => emit('batchEdit')"
        @delete_col="() => emit('deleteCol')"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import Info from '@/components/common/hover/info.vue'
import ColSelect from '@/views/case/content/case_content/data/comp/col_select.vue'

const props = defineProps<{
  col: { id: number; name: string; desc?: string }
  isFixed?: boolean
}>()

const emit = defineEmits<{
  rename: [newName: string]
  batchEdit: []
  deleteCol: []
}>()

const nameInputRef = ref<HTMLInputElement>()
const localName = ref(props.col.name)
let originalName = props.col.name

// Sync when col name changes externally (e.g. after batch edit)
watch(() => props.col.name, (newName) => {
  localName.value = newName
  originalName = newName
})

function onNameFocus() {
  originalName = localName.value
}

function onNameBlur() {
  const trimmed = localName.value.trim()
  if (!trimmed) {
    // Empty: reset
    localName.value = originalName
    return
  }
  if (trimmed !== originalName) {
    emit('rename', trimmed)
    originalName = trimmed
  }
}

function resetName() {
  localName.value = originalName
  nameInputRef.value?.blur()
}
</script>

<style lang="scss" scoped>
.ast-col-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  width: 100%;
  gap: 8px;
  padding: 0 8px 0 10px;
  box-sizing: border-box;
  min-height: 48px;
}

.col-name-wrapper {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
}

.col-name-input {
  width: 100%;
  min-width: 0;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid transparent;
  border-radius: 10px;
  outline: none;
  color: white;
  font-size: 13px;
  font-weight: 600;
  font-family: inherit;
  padding: 8px 10px;
  transition: background 0.15s ease, border-color 0.15s ease;

  &::placeholder {
    color: rgba(255, 255, 255, 0.48);
  }

  &:hover {
    background: rgba(255, 255, 255, 0.08);
  }

  &:focus {
    background: rgba(255, 255, 255, 0.1);
    border-color: rgba(255, 255, 255, 0.18);
  }
}

.col-name-text {
  color: white;
  font-size: 13px;
  font-weight: 600;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.col-header-tools {
  display: flex;
  align-items: center;
  gap: 6px;
  flex-shrink: 0;
}

.col-fixed-chip {
  display: inline-flex;
  align-items: center;
  height: 22px;
  padding: 0 8px;
  border-radius: 999px;
  background: rgba(255, 255, 255, 0.08);
  color: rgba(255, 255, 255, 0.72);
  font-size: 11px;
  font-weight: 600;
}
</style>
