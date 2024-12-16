<template>
  <div class="form-group">
    <input
      class="special-input g-unselect"
      :style="{
        '--dynamic-height': height,
        '--dynamic-radius': radius,
        '--dynamic-tran-color': isTransColor
          ? GlobalStatus.lightColor
          : GlobalStatus.methodColor[0]
      }"
      ref="animated"
      :placeholder="placeholder"
      v-model="value"
      autocomplete="off"
      spellcheck="false"
      :maxlength="max"
      :disabled="disabled"
    />
    <el-tag
      v-if="showDatePicker && showDateTag"
      @close="cleanDateTag"
      class="field-tag"
      closable
      size="large"
      >{{ dateTagValue }}</el-tag
    >
    <el-date-picker
      v-if="showDatePicker"
      v-model="datePicker"
      type="datetimerange"
      :default-time="defaultTime"
      :shortcuts="shortcuts"
      @change="changeDatePicker"
      style=""
      class="private-date-picker"
    >
      <template #range-separator
        ><el-tooltip
          effect="light"
          :content="t('tooltip.dateFilter')"
          placement="bottom"
        >
          <el-icon><ClockIcon /></el-icon> </el-tooltip
      ></template>
    </el-date-picker>
    <el-tooltip
      effect="light"
      :content="t('tooltip.cleanForm')"
      placement="bottom"
    >
      <el-icon
        @click.stop="clearData"
        class="field-icon"
        onselectstart="return false"
        ><CloseBold
      /></el-icon>
    </el-tooltip>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import GlobalStatus from '@/global'
import tools from '@/utils/tools'
import ClockIcon from '@/assets/svg/common/clockIcon.vue'
const { t } = useI18n()

const shortcuts = [
  {
    text: t('datePicker.lm10'),
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 600 * 1000)
      return [start, end]
    }
  },
  {
    text: t('datePicker.lh'),
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000)
      return [start, end]
    }
  },
  {
    text: t('datePicker.ld'),
    value: () => {
      const end = new Date()
      const start = new Date()
      start.setTime(start.getTime() - 3600 * 1000 * 24)
      return [start, end]
    }
  }
]

const datePicker = ref('')
const defaultTime: [Date, Date] = [
  new Date(2000, 1, 1, 12, 0, 0),
  new Date(2000, 2, 1, 8, 0, 0)
]

const props = defineProps({
  placeholder: {
    type: String,
    default: ''
  },
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  radius: {
    type: String,
    default: '9999px'
  },
  max: {
    type: Number,
    default: 100
  },
  isTransColor: {
    type: Boolean,
    default: true
  },
  showDatePicker: {
    type: Boolean,
    default: false
  },
  showDateTag: {
    type: Boolean,
    default: false
  },
  dateTagValue: {
    type: String,
    default: ''
  },
  height: {
    type: String,
    default: '50px'
  }
})
// eslint-disable-next-line vue/no-setup-props-destructure
const animated = ref(null)
const twinkle = () => {
  const el: HTMLElement = animated.value!
  el.id = 'animated'
  if (el) {
    el.style.animation = 'none'
    // eslint-disable-next-line no-void
    void el.offsetHeight
    el.style.animation = null!
  }
}
defineExpose({
  twinkle
})

const { placeholder } = toRefs(props)
const emit = defineEmits([
  'update:modelValue',
  'clearData',
  'searchTimeString',
  'cleanTag'
])
const value = computed({
  get() {
    return props.modelValue
  },
  set(v) {
    emit('update:modelValue', v)
  }
})
function clearData() {
  emit('clearData')
}

function cleanDateTag() {
  emit('cleanTag')
}

function changeDatePicker(value: any) {
  const res: string =
    'T:[' +
    tools.getLocaleDateTime(value[0], false) +
    ']:[' +
    tools.getLocaleDateTime(value[1], false) +
    ']'
  searchTimeString(res, value)
}

function searchTimeString(value: string, originDate: Array<any>) {
  emit('searchTimeString', value, originDate)
}
</script>

<style lang="scss">
.form-group {
  z-index: 999;
  .el-range-editor {
    font-size: 16px !important;
    width: 10px !important;
    box-shadow: none !important;
    padding: 0px !important;
    height: 1em !important;
    position: absolute !important;
    top: 50% !important;
    right: 45px !important;
    -webkit-transform: translateY(-50%) !important;
    -ms-transform: translateY(-50%) !important;
    transform: translateY(-50%) !important;
    color: rgba(0, 0, 25, 0.9) !important;
    cursor: pointer !important;
  }
}

.private-date-picker {
  .el-range__icon,
  .el-range__close-icon {
    display: none;
  }
  .el-icon {
    --el-text-color-placeholder: black;
    font-size: 16px !important;
  }
  .el-date-editor .el-range__close-icon {
    display: none;
  }
}
</style>

<style lang="scss" scoped>
#animated {
  -webkit-animation: error 1.5s; /* Safari 与 Chrome */
}
@-webkit-keyframes error {
  from {
    background: rgba(255, 127, 80, 0.2);
  }
  to {
    background: rgba(255, 255, 255, 0.2);
  }
}
.special-input {
  color: black !important;
  background: rgba(255, 255, 255, 0.2);
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  width: 100%;
  height: var(--dynamic-height);
  padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 2px solid transparent;
  border-radius: var(--dynamic-radius);
  background-clip: padding-box, border-box;
  background-origin: padding-box, border-box;
  background-image: linear-gradient(to right, #ffffff, #ffffff),
    linear-gradient(90deg, #000, #000);
  outline: none;
  box-sizing: border-box;
}

.special-input::-webkit-input-placeholder {
  color: var(--place-default-color);
  font-size: 1rem;
}
.special-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
  border-radius: var(--dynamic-radius);
}
.special-input:hover {
  // background: transparent;
  box-shadow: none;
  border-color: rgba(255, 255, 255, 0.4);
}
.field-icon {
  position: absolute;
  top: 50%;
  right: 15px;
  -webkit-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
  color: rgba(0, 0, 25, 0.9);
  cursor: pointer;
}
.field-tag {
  position: absolute;
  top: 50%;
  right: 70px;
  -webkit-transform: translateY(-50%);
  -ms-transform: translateY(-50%);
  transform: translateY(-50%);
  color: rgba(0, 0, 25, 0.9);
  font-size: 14px;
  cursor: pointer;
}
.form-group {
  position: relative;
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
}
</style>
