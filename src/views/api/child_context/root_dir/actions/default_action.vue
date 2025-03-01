<template>
  <div>
    <div class="drag-div">
      <button @click="show_action_list_dialog" class="pre-action-default-btn">
        添加前置操作
        <el-icon><Plus /></el-icon>
      </button>
    </div>
    <div
      :class="{ 'default-active': isDefaultOpen }"
      class="pre-action-default-change"
      @click="isDefaultOpen = !isDefaultOpen"
    >
      <div style="box-sizing: border-box">
        <el-icon class="pre-action-icon" size="12">
          <ArrowRightBold v-if="isDefaultOpen === false" />
          <ArrowDownBold v-if="isDefaultOpen === true" />
        </el-icon>
      </div>
      <div class="pre-action-default-change-text">
        <div class="drag-handle" @mousedown="onDragHandleClick">
          <el-icon color="#d0d5dd"><Rank /></el-icon>
        </div>
      </div>
      <div class="pre-action-default-change-inner">
        <span class="pre-action-default-change-inner-span">变量替换</span>
      </div>
    </div>
    <Transition name="slide">
      <div v-if="isDefaultOpen" class="pre-action-default-content-box-desc">
        <div
          class="pre-action-default-content-box-desc-header"
          :class="{ 'default-inner-active': open_default }"
          @click="open_default = !open_default"
        >
          <div style="box-sizing: border-box">
            <el-icon class="pre-action-icon" size="12">
              <ArrowRightBold v-if="open_default === false" />
              <ArrowDownBold v-if="open_default === true" />
            </el-icon>
          </div>
          <div class="pre-action-default-change-inner">
            <span class="pre-action-default-change-inner-span">变量替换</span>
          </div>
          <div
            style="
              display: flex;
              padding-right: 0.25rem;
              overflow: hidden;
              align-items: center;
            "
          >
            <span style="font-size: 0.875rem; color: rgba(16, 24, 40, 0.8)"
              >内置操作</span
            >
          </div>
        </div>
        <Transition name="inner-slide">
          <div
            v-if="open_default"
            class="pre-action-default-content-box-desc-content"
          >
            <div class="pre-action-default-content-box-desc-content-inner">
              <span>
                “变量替换”是系统<code>内置操作</code>，作用为：将接口请求参数里所有引用“变量（包括动态值）”的地方都替换成实际内容。<br />
                1.
                <code>接口签名脚本</code>
                等操作，需放在“变量替换”之后，这样脚本才能获取到该接口实际请求的参数值；否则获取到的参数值是“变量替换之前”的模板内容。<br />
                2.
                <code>通过脚本 set 变量</code
                >等操作，需要放在“变量替换”之前，否则“该脚本 set
                的变量”就不会对当前接口的请求参数生效。<br />
              </span>
            </div>
          </div>
        </Transition>
      </div>
    </Transition>
    <ActionListDialog ref="actionListDialog" @add_action="add_action"></ActionListDialog>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import ActionListDialog from "@/views/api/public_dialog/action_list_dialog.vue"
const open_default = ref(false);
const isDefaultOpen = ref(false);
const actionListDialog:any = ref(null)
const props = defineProps({
  element: {
    type: Object,
    default: {},
  },
});
// 阻止点击事件传播到父元素
const onDragHandleClick = (event: MouseEvent) => {
  event.stopPropagation();
};

const emit = defineEmits(["add_action"]);

function add_action(action_name:string) {
  emit('add_action', action_name)
}

function show_action_list_dialog() {
  actionListDialog.value.open_dialog()
}
</script>

<style scoped>
.default-active {
  border-bottom-left-radius: 0px !important;
  border-bottom-right-radius: 0px !important;
}
.default-inner-active {
  margin-bottom: 0px !important;
  border-radius: 10px 10px 0 0 !important;
}
/* 关键 CSS */
.slide-enter-active,
.slide-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.slide-enter-from,
.slide-leave-to {
  opacity: 0;
  max-height: 0 !important;
}

.slide-enter-to,
.slide-leave-from {
  opacity: 1;
  max-height: 1000px; /* 设置一个足够大的值 */
}

.inner-slide-enter-active,
.inner-slide-leave-active {
  transition: opacity 0.3s ease, max-height 0.3s ease;
}

.inner-slide-enter-from,
.inner-slide-leave-to {
  opacity: 0;
  max-height: 0 !important;
}

.inner-slide-enter-to,
.inner-slide-leave-from {
  opacity: 1;
  max-height: 1000px; /* 设置一个足够大的值 */
}
/* 高亮拖拽目标的样式 */
.drag-over {
  background-color: #d3f9d8; /* 设置拖拽到目标时的高亮颜色 */
  border: 2px dashed #4caf50; /* 可选：添加边框 */
}

.drag-container {
  transition: all 1s ease;
}

/* 单个拖拽项样式 */
.drag-item {
  cursor: pointer;
}

/* 拖拽中的元素 */
.dragging {
  opacity: 0.5; /* 拖拽时元素不完全透明 */
  z-index: 999; /* 拖拽的元素在最上层 */
  transform: scale(1.05); /* 放大拖拽元素 */
}

/* 隐藏原位置元素 */
.sortable-ghost {
  visibility: hidden !important;
  opacity: 0 !important;
}

/* 让拖拽目标区域高亮 */
.drag-over {
  background-color: #e0f7fa; /* 拖拽到目标时的背景颜色 */
  border: 2px solid #00bcd4; /* 可选：为目标区域添加边框 */
}
.pre-action-default-btn {
  color: black;
  width: 100%;
  height: 40px;
  font-weight: 400;
  font-size: 14px;
  border-radius: 8px;
  border-style: dashed;
  background-color: #fff;
  cursor: pointer;
  border-color: #eaecf0;
  border-width: 1px;
  display: flex;
  justify-content: center;
  align-items: center;
}
.pre-action-default-btn:hover {
  border-color: #d0d5dd;
}
.pre-action-default-change {
  border: 1px solid #5657580a;
  border-radius: 10px;
  background-color: #0000;
  cursor: pointer;
  align-items: center;
  height: 40px;
  display: flex;
  position: relative;
  padding: 7px 40px 7px 8px;
  box-sizing: border-box;
  .pre-action-default-change-text {
    display: flex;
    position: relative;
    overflow: hidden;
    font-size: 0.875rem;
    align-items: center;
    box-sizing: border-box;
  }
}
.drag-handle {
  left: 2px;
  display: flex;
  position: relative;
  padding-right: 0.25rem;
  align-items: center;
}
.drag-handle:hover {
  svg {
    color: black;
  }
}
.drag-div {
  display: flex;
  width: 100%;
  margin-bottom: 0.25rem;
  justify-content: center;
}
.pre-action-icon {
  margin: 0;
  position: absolute;
  top: 50%;
  left: auto;
  right: 16px;
  transform: translateY(-50%);
}
.pre-action-default-change-inner {
  flex-basis: 144px;
  display: flex;
  flex-shrink: 0;
  flex-grow: 0;
  align-items: center;
  box-sizing: border-box;

  .pre-action-default-change-inner-span {
    white-space: nowrap;
    padding-left: 0.5rem;
    box-sizing: border-box;
    font-size: 0.875rem;
  }
}
.pre-action-default-content-box-desc {
  overflow: hidden;
  max-height: 1000px;
  transition: max-height 0.3s ease;
  padding: 4px 4px 0;
  justify-content: center;
  color: #344054;
  box-sizing: border-box;
  background-color: #fff;
  border-color: #5657580a;
  border-radius: 0 0 10px 10px;
  border-style: solid;
  border-width: 0 1.5px 1.5px;
  padding: 4px 4px 0;
  margin-bottom: 4px;
  box-sizing: border-box;
  display: block;
  unicode-bidi: isolate;
  .pre-action-default-content-box-desc-header {
    border-radius: 10px;
    background-color: #5657580a;
    padding: 7px 40px 7px 12px;
    cursor: pointer;
    border: 0;
    align-items: center;
    height: 40px;
    display: flex;
    position: relative;
    margin-bottom: 4px;
  }
  .pre-action-default-content-box-desc-content {
    overflow: hidden;
    max-height: 1000px;
    transition: max-height 0.3s ease;
    background-color: #fff;
    border-color: #5657580a;
    border-radius: 0 0 10px 10px;
    border-style: solid;
    border-width: 0 1.5px 1.5px;
    justify-content: center;
    display: flex;
    padding: 4px 16px 16px 16px;
    box-sizing: border-box;
    color: #344054;
    margin-bottom: 4px;
    .pre-action-default-content-box-desc-content-inner {
      font-weight: 400;
      user-select: text;
      line-height: 28px;
      width: 100%;
      box-sizing: border-box;
      font-size: 14px;
    }
  }
}
</style>
