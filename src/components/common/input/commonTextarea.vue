<template>
  <el-row
    align="middle"
    :style="{
      '--color-group': GlobalStatus.colorList[colorGroup][0],
      '--color-group-light': GlobalStatus.colorList[colorGroup][1]
    }"
  >
    <el-col :span="24">
      <el-input
        @input="check"
        :maxlength="maxlength"
        spellcheck="false"
        autocomplete="off"
        v-model="value"
        type="textarea"
        :placeholder="placeholder"
        :autosize="{ minRows: 5, maxRows: 10 }"
        class="standard-input"
    /></el-col>
  </el-row>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import GlobalStatus from '@/global'
const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  modelValue: {
    type: String,
    default: ''
  },
  maxlength: {
    type: Number,
    default: 20
  },
  colorGroup: {
    type: Number,
    default: 0
  },
  placeholder: {
    type: String,
    default: ''
  }
})

const emit = defineEmits(['update:modelValue', 'check'])
const value = computed({
  get() {
    return props.modelValue
  },
  set(v) {
    emit('update:modelValue', v)
  }
})

function check() {
  emit('check', value.value)
}
</script>

<style lang="scss">
.standard-input .el-textarea__inner {
  box-shadow: none;
}
</style>

<style lang="scss" scoped>
.standard-input {
  color: black !important;
  background: rgba(255, 255, 255, 0.2);
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  width: 100%;
  //   height: 40px;
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 2px solid transparent;
  border-radius: 5px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, var(--color-group-light), var(--color-group));
  outline: none;
  box-sizing: border-box;
  textarea {
    outline: none;
  }
}

.standard-input-title {
  color: white;
  width: 100%;
  height: 40px;
  // padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 0px solid transparent;
  border-radius: 5px 0px 0px 5px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(
    90deg,
    var(--color-group),
    var(--color-group-light)
  );
  outline: none;
  box-sizing: border-box;
  .text {
    line-height: 40px;
  }
}
.standard-input::-webkit-input-placeholder {
  color: var(--place-default-color);
  font-family: $zh-font-family;
  font-size: 1rem;
}
.standard-input:focus {
  //   border-color: rgba(255, 255, 255, 0.4);
  border-radius: 0px 8px 8px 0px;
}
.standard-input:hover {
  // background: transparent;
  box-shadow: none;
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
