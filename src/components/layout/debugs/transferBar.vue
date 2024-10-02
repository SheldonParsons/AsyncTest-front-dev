<template>
  <transition name="el-fade-in-linear" appear>
    <div
      class="ed"
      :style="{
        '--color-group': GlobalStatus.colorList[colorGroup][0],
        '--color-group-light': GlobalStatus.colorList[colorGroup][1]
      }"
    >
      <div class="ed-header">
        <el-row>
          <el-col :span="16" :md="18" :sm="16"
            ><p class="g-unselect">TransferBar</p></el-col
          >
        </el-row>
      </div>
      <div class="ed editor" ref="dom">
        <textarea
          v-model="value"
          autocomplete="off"
          spellcheck="false"
          :placeholder="t('input.transferBar.placeholder')"
        ></textarea>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useI18n } from 'vue-i18n'
import GlobalStatus from '@/global'
const { t } = useI18n()

const props = defineProps({
  modelValue: {
    type: String,
    default: ''
  },
  colorGroup: {
    type: Number,
    default: 0
  }
})

const emit = defineEmits(['update:modelValue'])

const value = computed({
  get() {
    return props.modelValue
  },
  set(v) {
    emit('update:modelValue', v)
  }
})
</script>

<style lang="scss" scoped>
.ed {
  width: 100%;
  height: 400px;
  // margin-left: 5%;
}
.ed-header {
  height: 44px;
  width: calc(100% + 20px);
  border-radius: 5px 5px 0px 0px;
  background-image: linear-gradient(
    90deg,
    var(--dialog-deep-color) 80%,
    var(--dialog-color)
  );
  text-align: center;
  p {
    color: white;
    font-size: 16px;
    font-weight: normal;
    font-style: normal;
    display: table-cell;
    vertical-align: middle;
    height: 35px;
    padding-left: 20px;
  }
}
.el-row {
  height: inherit;
}
.editor {
  textarea {
    height: 100%;
    width: 100%;
    border: 0px;
    outline: none;
    box-sizing: border-box;
    font-size: 1rem;
  }
  textarea:hover {
    border: 0px;
  }
  height: 90%;
  border-radius: 0px 0px 5px 5px;
  border-right: 10px solid transparent;
  border-bottom: 10px solid transparent;
  border-left: 10px solid transparent;
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, var(--dialog-deep-color) 80%, var(--dialog-color));
}
</style>
