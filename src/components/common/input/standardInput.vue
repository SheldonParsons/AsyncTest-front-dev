<template>
  <transition name="el-fade-in-linear" appear>
    <el-row
      align="middle"
      :style="{
        '--color-group': GlobalStatus.colorList[colorGroup][0],
        '--color-group-light': GlobalStatus.colorList[colorGroup][1]
      }"
    >
      <el-col
        class="standard-input-title g-unselect"
        :span="5"
        :md="3"
        :sm="4"
        :xs="5"
        align="middle"
        :style="{
          '--border-t':
            colorType === 0
              ? 'var(--global-theme-light-color)'
              : 'var(--color-group)'
        }"
        ><span class="text">{{ text }}</span></el-col
      >
      <el-col style="display: flex" :span="19" :md="21" :sm="20" :xs="19">
        <input
          @input="check"
          :maxlength="maxlength"
          spellcheck="false"
          autocomplete="off"
          v-model="value"
          :style="{
            '--border-input':
              colorType === 0
                ? 'var(--color-group-light), var(--color-group)'
                : 'var(--color-group),var(--color-group)'
          }"
          :class="endText === '' ? 'standard-input' : 'standard-input-end'"
        />
        <div
          v-if="endText !== ''"
          :style="{
            '--border-input':
              colorType === 0
                ? 'var(--color-group-light), var(--color-group)'
                : 'var(--color-group),var(--color-group)'
          }"
          class="end-text g-unselect"
        >
          {{ endText }}
        </div></el-col
      >
    </el-row>
  </transition>
</template>

<script setup lang="ts">
import { toRefs, computed } from 'vue'
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
  endText: {
    type: String,
    default: ''
  },
  colorType: {
    type: Number,
    default: 0
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
  color: black !important;
  background: rgba(255, 255, 255, 0.2);
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  width: 100%;
  height: 40px;
  padding-left: 10px;
  // padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 2px solid transparent;
  border-radius: 0px 5px 5px 0px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, var(--border-input));
  outline: none;
  box-sizing: border-box;
}

.standard-input-end {
  color: black !important;
  background: rgba(255, 255, 255, 0.2);
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  width: 90%;
  height: 40px;
  padding-left: 10px;
  // padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 2px solid transparent;
  border-radius: 0px 0px 0px 0px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, var(--border-input));
  outline: none;
  box-sizing: border-box;
}

.standard-input-title {
  display: flex;
  justify-content: center;
  align-items: center;
  color: var(--global-theme-color);
  width: 100%;
  height: 40px;
  // padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 2px solid var(--border-t);
  border-right: 0px;
  border-radius: 5px 0px 0px 5px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  // background-image: linear-gradient(
  //   90deg,
  //   var(--color-group),
  //   var(--color-group-light)
  // );
  outline: none;
  box-sizing: border-box;
}
.standard-input::-webkit-input-placeholder {
  color: var(--place-default-color);
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
.end-text {
  min-width: 15%;
  padding: 0px 5px;
  color: var(--global-theme-color);
  font-size: 1rem;
  font-weight: 400;
  display: flex;
  justify-content: center;
  align-items: center;
  border: 1px solid black;
  background: rgba(255, 255, 255, 0.2);
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  height: 40px;
  border: 2px solid transparent;
  border-left: 0px;
  border-radius: 0px 5px 5px 0px;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, var(--border-input));
  outline: none;
  box-sizing: border-box;
}
</style>
