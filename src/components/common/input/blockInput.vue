<template>
  <el-row align="middle">
    <el-col
      class="standard-input-title g-unselect"
      :span="5"
      :md="2"
      :sm="4"
      :xs="5"
      align="middle"
      ><span class="text">{{ text }}</span></el-col
    >
    <el-col
      class="standard-input-block g-unselect"
      :span="11"
      :md="5"
      :sm="9"
      :xs="10"
      align="middle"
      ><span class="text">{{ blockText }}</span></el-col
    >
    <el-col :span="8" :md="17" :sm="11" :xs="9">
      <input
        @input="check"
        :maxlength="maxlength"
        spellcheck="false"
        autocomplete="off"
        v-model="value"
        class="standard-input"
    /></el-col>
  </el-row>
</template>

<script setup lang="ts">
import { toRefs, computed } from 'vue'
const props = defineProps({
  text: {
    type: String,
    default: ''
  },
  blockText: {
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
  }
})

const { text } = toRefs(props)

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

<style lang="scss" scoped>
.standard-input {
  padding-left: 10px;
  color: black !important;
  background: rgba(255, 255, 255, 0.2);
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  width: 100%;
  height: 40px;
  // padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 2px solid transparent;
  border-radius: 0px 5px 5px 0px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(
      90deg,
      var(--global-theme-light-color),
      var(--global-theme-color)
    );
  outline: none;
  box-sizing: border-box;
}

.standard-input-title {
  color: var(--global-theme-color);
  display: flex;
  justify-content: center;
  align-items: center;
  width: 100%;
  height: 40px;
  // padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 2px solid var(--global-theme-light-color);
  border-radius: 5px 0px 0px 5px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  // background-image: linear-gradient(
  //   90deg,
  //   var(--global-theme-color),
  //   var(--global-theme-light-color)
  // );
  outline: none;
  box-sizing: border-box;
  .text {
    line-height: 40px;
  }
}
.standard-input-block {
  overflow: hidden;
  word-break: break-all;
  direction: rtl;
  text-overflow: ellipsis;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 1;
  white-space: nowrap;
  color: #696969;
  width: 100%;
  height: 40px;
  // padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  border-top: 2px solid var(--global-theme-light-color);
  border-bottom: 2px solid var(--global-theme-light-color);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(90deg, #f5f5f5, #f5f5f5);
  outline: none;
  box-sizing: border-box;
  .text {
    line-height: 36px;
  }
}
.standard-input::-webkit-input-placeholder {
  color: var(--place-default-color);
  font-family: $zh-font-family;
  font-size: 1rem;
}
.standard-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
  border-radius: 0px 8px 8px 0px;
}
.standard-input:hover {
  // background: transparent;
  box-shadow: none;
  border-color: rgba(255, 255, 255, 0.4);
}
</style>
