<template>
  <div
    v-if="visible"
    class="context-menu"
    :style="{ top: y + 'px', left: x + 'px' }"
  >
    <ul class="context-menu-ul">
        <li class="context-menu-li" @click="onClickOption('Option 1')">
        <el-row class="context-menu-row">
          <el-col
            clsss="context-menu-col"
            :span="4"
            style="display: flex; align-items: center"
          >
          <span style="display: flex; align-items: center;"
              ><el-icon :size="15" color="#007a5f"><Link /></el-icon></span>
          </el-col>
          <el-col :span="20">
            <span>创建新接口</span>
          </el-col>
        </el-row>
      </li>
      <el-divider style="margin: 0px;" />
      <li class="context-menu-li" @click="onClickOption('Option 1')">
        <el-row class="context-menu-row">
          <el-col
            clsss="context-menu-col"
            :span="4"
            style="display: flex; align-items: center"
          >
            <span style="display: flex; align-items: center;"
              ><el-icon class="close-icon"><CloseBold /></el-icon
            ></span>
          </el-col>
          <el-col :span="20">
            <span>关闭当前标签</span>
          </el-col>
        </el-row>
      </li>
      <li class="context-menu-li" @click="onClickOption('Option 1')">
        <el-row class="context-menu-row">
          <el-col
            clsss="context-menu-col"
            :span="4"
            style="display: flex; align-items: center"
          >
          </el-col>
          <el-col :span="20">
            <span>关闭其他标签</span>
          </el-col>
        </el-row>
      </li>
      <li class="context-menu-li" @click="onClickOption('Option 1')">
        <el-row class="context-menu-row">
          <el-col
            clsss="context-menu-col"
            :span="4"
            style="display: flex; align-items: center"
          >
          </el-col>
          <el-col :span="20">
            <span>关闭所有标签</span>
          </el-col>
        </el-row>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from "vue";

const visible = ref(false);
const x = ref(0);
const y = ref(0);

function showMenu(event) {
  event.preventDefault();
  // 设置较小的偏移量，比如5px
  const offsetX = 5; // 水平偏移量
  const offsetY = 5; // 垂直偏移量
  x.value = event.pageX + offsetX;
  y.value = event.pageY + offsetY;
  console.log(y.value);
  console.log(x.value);
  visible.value = true;
}

function hideMenu() {
  visible.value = false;
}

function handleClickOutside(event) {
  if (!event.target.closest(".filter-li")) {
    hideMenu(); // 点击发生在目标元素之外时，隐藏菜单
  }
}

onMounted(() => {
  const elements = document.querySelectorAll(".filter-li");
  elements.forEach((element) => {
    element.addEventListener("contextmenu", showMenu);
  });
  // 监听全局点击事件，用于隐藏菜单
  window.addEventListener("click", handleClickOutside);
  // 添加全局右键事件监听，以处理点击非目标元素的情况
  window.addEventListener("contextmenu", handleClickOutside);
});

onUnmounted(() => {
  const elements = document.querySelectorAll(".filter-li");
  elements.forEach((element) => {
    element.removeEventListener("contextmenu", showMenu);
  });
  window.removeEventListener("click", handleClickOutside);
  window.removeEventListener("contextmenu", handleClickOutside);
});
</script>

<style scoped>
.context-menu {
  width: 180px;
  position: fixed;
  border: 1px solid #ccc;
  background-color: #fff;
  border-radius: 5px;
  box-shadow: 2px 2px 8px rgba(0, 0, 0, 0.1);
  z-index: 1000;
}

.context-menu ul {
  list-style: none;
  padding: 0px;
  margin: 0;
}

.context-menu ul li {
  padding: 8px 20px;
  cursor: pointer;
  margin: 5px;
  border-radius: 5px;
  font-size: 0.9rem;
  display: flex;
  justify-content: left;
  align-items: center;
}
.context-menu ul li:hover {
  background-color: #F5F5F5;
}
.context-menu-row {
  width: 100%;
}
</style>

<style lang="scss">
.context-menu-col {
  display: flex;
  align-items: center;
}
</style>
