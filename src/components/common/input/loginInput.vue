<template>
  <div class="form-group">
    <input
      class="login-input g-unselect"
      ref="animated"
      :type="type"
      :placeholder="placeholder"
      v-model="value"
      autocomplete="off"
      spellcheck="false"
      maxlength="30"
      :disabled="disabled"
    />
    <el-icon
      @click.stop="changeType"
      v-if="type === 'password'"
      class="field-icon"
      onselectstart="return false"
      ><View
    /></el-icon>
    <el-icon
      @click.stop="changeType"
      v-if="type === 'text' && firstType === 'password'"
      class="field-icon"
      onselectstart="return false"
      ><Hide
    /></el-icon>
  </div>
</template>

<script setup lang="ts">
import { computed, toRefs, ref } from 'vue'

const props = defineProps({
  placeholder: String,
  modelValue: {
    type: String,
    default: ''
  },
  disabled: {
    type: Boolean,
    default: false
  },
  type: {
    type: String,
    default: 'text'
  }
})
// eslint-disable-next-line vue/no-setup-props-destructure
const firstType: String = props.type
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
const emit = defineEmits(['update:modelValue', 'changeType'])
const value = computed({
  get() {
    return props.modelValue
  },
  set(v) {
    emit('update:modelValue', v)
  }
})
function changeType() {
  emit('changeType')
}
</script>

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
.login-input {
  color: white !important;
  background: rgba(255, 255, 255, 0.2);
  border-radius: $radius-regular;
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
  width: 100%;
  height: 50px;
  padding: 0.375rem 2rem 0.375rem 0.75rem;
  font-size: 1.1rem;
  font-weight: 400;
  line-height: 1.5;
  border: 1px solid transparent;
  outline: none;
  box-sizing: border-box;
}

.login-input::-webkit-input-placeholder {
  color: white;
  font-size: 1rem;
}
.login-input:focus {
  border-color: rgba(255, 255, 255, 0.4);
  border-radius: 10px;
}
.login-input:hover {
  background: transparent;
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
  color: rgba(255, 255, 255, 0.9);
}
.form-group {
  position: relative;
}
</style>
