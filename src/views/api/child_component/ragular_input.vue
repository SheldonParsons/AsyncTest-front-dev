<template>
  <el-row style="margin-top: 10px">
    <el-col :offset="1" :span="22">
      <div class="group">
        <input class="interface-name" type="text" required placeholder="未命名接口" v-model="input_value" />
        <span class="highlight"></span>
        <span class="bar"></span>
      </div>
    </el-col>
  </el-row>
</template>
<script lang="ts" setup>
import { computed } from "vue";
const emit = defineEmits(["update:modelValue"]);
const props = defineProps({
  modelValue: {
    type: String,
    default: "",
  },
});
// 计算属性双向绑定
const input_value = computed({
  get() {
    return props.modelValue;
  },
  set(value) {
    emit("update:modelValue", value);
  },
});
</script>
<style lang="scss" scoped>
.group {
  position: relative;

  .interface-name {
    font-size: 16px;
    font-weight: 500;
    padding: 10px 0px 10px 0px;
    display: block;
    width: 100%;
    border: none;
  }
}

input:focus {
  outline: none;
}

/* LABEL ======================================= */
label {
  color: #999;
  font-size: 18px;
  font-weight: normal;
  position: absolute;
  pointer-events: none;
  left: 5px;
  top: 10px;
  transition: 0.2s ease all;
  -moz-transition: 0.2s ease all;
  -webkit-transition: 0.2s ease all;
}

/* active state */
input:focus~label,
input:valid~label {
  top: -20px;
  font-size: 14px;
  color: #000000;
}

/* BOTTOM BARS ================================= */
.bar {
  position: relative;
  display: block;
  width: 100%;
  background: #000000;
}

.bar:before,
.bar:after {
  content: "";
  height: 2px;
  width: 0;
  bottom: 1px;
  position: absolute;
  background: #000000;
  transition: 0.2s ease all;
  -moz-transition: 0.2s ease all;
  -webkit-transition: 0.2s ease all;
}

.bar:before {
  width: 50%;
  left: 50%;
}

.bar:after {
  right: 50%;
  width: 50%;
}

/* active state */
input:focus~.bar:before,
input:focus~.bar:after {
  width: 50%;
}

/* HIGHLIGHTER ================================== */
// .highlight {
//   position: absolute;
//   height: 60%;
//   width: 100px;
//   top: 25%;
//   left: 0;
//   pointer-events: none;
//   opacity: 0.5;
// }

/* active state */
input:focus~.highlight {
  -webkit-animation: inputHighlighter 0.3s ease;
  -moz-animation: inputHighlighter 0.3s ease;
  animation: inputHighlighter 0.3s ease;
}

/* ANIMATIONS ================ */
@-webkit-keyframes inputHighlighter {
  from {
    background: #33ac93;
  }

  to {
    width: 0;
    background: transparent;
  }
}

@-moz-keyframes inputHighlighter {
  from {
    background: #33ac93;
  }

  to {
    width: 0;
    background: transparent;
  }
}

@keyframes inputHighlighter {
  from {
    background: #33ac93;
  }

  to {
    width: 0;
    background: transparent;
  }
}
</style>
