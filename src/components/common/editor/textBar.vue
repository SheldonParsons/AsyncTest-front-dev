<template>
  <transition name="el-fade-in-linear" appear>
    <div class="ed">
      <div class="ed-header">
        <el-row>
          <el-col :span="16" :md="18" :sm="16"
            ><p class="g-unselect">{{ title }}</p></el-col
          >
        </el-row>
      </div>
      <div class="ed editor" ref="dom">
        <VueJsonPretty class="pretty-panel" :data="tryObj(value)" />
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
defineProps({
  value: {
    type: String,
    default: '123'
  },
  title: {
    type: String,
    default: 'TransferBar'
  }
})

function tryObj(value: string) {
  try {
    return JSON.parse(value)
  } catch (error) {
    return value
  }
}
</script>

<style lang="scss" scoped>
.pretty-panel {
  word-break: normal;
}
.ed {
  width: 95%;
  // margin-left: 5%;
}
.ed-header {
  height: 35px;
  width: calc(95% + 20px);
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
    font-family: $special-font-family;
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
    font-size: 1.1rem;
  }
  textarea:hover {
    border: 0px;
  }
  height: 100%;
  min-height: 300px;
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
