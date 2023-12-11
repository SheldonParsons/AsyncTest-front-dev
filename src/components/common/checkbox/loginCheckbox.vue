<template>
  <el-checkbox
    class="login-checkbox"
    @change="changeStatus"
    v-model="check"
    :label="remember"
    size="large"
  />
</template>

<script setup lang="ts">
import { toRefs, ref, watch } from 'vue'

const emit = defineEmits(['changeStatus'])

const check = ref(true)
const props = defineProps({
  remember: String,
  checked: Boolean
})
const { remember, checked } = toRefs(props)

function changeStatus(status: boolean) {
  emit('changeStatus', status)
}

watch(checked, (value) => {
  check.value = checked.value
})

// const checked = ref(true)
</script>

<style lang="scss" scoped>
.login-checkbox {
  color: #e6e8eb;
  --el-checkbox-checked-text-color: #e6e8eb;
  --el-checkbox-checked-input-border-color: #e6e8eb;
  --el-checkbox-checked-bg-color: #e6e8eb;
  --el-checkbox-checked-icon-color: black;
  --el-checkbox-input-border-color-hover: #e6e8eb;
}
:deep(.el-checkbox__label) {
  font-size: 16px !important;
}
</style>
