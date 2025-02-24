<template>
  <nav class="amazing-tabs">
    <div class="filters-container">
      <div class="filters-wrapper">
        <div class="icon-div" style="border-right: 1px solid #f5f5f5">
          <el-icon
            @click="scrollToLeft"
            class="margin-cls scroll-btn"
            style="z-index: 999"
            ><ArrowLeftBold
          /></el-icon>
        </div>
        <ul class="margin-cls filter-tabs ignore-scrollbar">
          <transition-group name="fade" tag="ul" id="tabsUl" class="margin-cls filter-tabs ignore-scrollbar">
          <li class="filter-li" v-for="(item, index) in editableTabs">
              <div
                class="filter-button"
                :class="{ 'filter-active': editableTabsValue === item.name }"
                @click="changePage(item)"
              >
                <Fold style="margin-right: 5px" v-if="item.t === 4"></Fold>
                <span
                  v-if="item.t < 4"
                  class="method-span"
                  :class="method_color[item.t]"
                  >{{ method_list[item.t] }}</span
                >
                <span
                  class="filter-span ignore-scrollbar"
                  style="width: 100%; overflow: auto"
                >
                  {{ item.title }}
                </span>
                <div class="close-div" @click.stop="closeTab(item, index)">
                  <el-icon class="close-icon"><CloseBold /></el-icon>
                </div>
                <div class="change-div" v-if="item.hasChange === true">
                  <el-badge is-dot class="item"></el-badge>
                </div>
              </div>
          </li>
        </transition-group>
        </ul>
        <div class="icon-div" style="border-left: 1px solid #f5f5f5">
          <el-icon
            @click="scrollToRight"
            class="margin-cls scroll-btn"
            style="z-index: 999"
            ><ArrowRightBold
          /></el-icon>
        </div>
        <div class="icon-div" style="border-left: 1px solid #f5f5f5">
          <el-icon
            class="margin-cls scroll-btn"
            style="z-index: 999"
            @click="open('新建内容')"
            ><PlusBold
          /></el-icon>
        </div>
        <div class="icon-div" style="border-left: 1px solid #f5f5f5">
          <el-icon class="margin-cls scroll-btn" style="z-index: 999"
            ><FilterBold
          /></el-icon>
        </div>
      </div>
    </div>
  </nav>
  <EmptyPage v-if="show_type === 0"></EmptyPage>
  <CreatePage v-if="show_type === 1" @go_page="go_page"></CreatePage>
  <Documentation v-if="show_type === 2"></Documentation>
  <RootDir v-if="show_type === 3"></RootDir>
  <ContextMenu :x="x" :y="y" :visible="visible"></ContextMenu>
</template>
<script lang="ts" setup>
import { ref, onMounted, nextTick, watch } from "vue";
import Fold from "@/assets/svg/tree/fold.vue";
import CButton from "@/components/common/button/CButton.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
import JsonEditor from "@/components/common/editor/JsonEditor.vue";
import { useRoute, useRouter } from "vue-router";
import PlusBold from "@/assets/svg/common/addIcon.vue";
import FilterBold from "@/assets/svg/common/filter.vue";
import ContextMenu from "@/components/layout/menus/ContextMenu.vue";
import Documentation from "./child_context/doc_page.vue";
import EmptyPage from "./child_context/empty_page.vue";
import CreatePage from "./child_context/create_empty_page.vue";
import CodeMirror from "./child_context/code_mirror.vue";
import RootDir from './child_context/root_dir_index.vue'

const method_list = ["GET", "POST", "PUT", "DELETE"];
const method_color = ["green", "orange", "blue", "red"];
const show_type = ref(3);
const code: any = ref(undefined);
const route = useRoute();
const router = useRouter();
const isChangeCode = ref(false);
const editableTabsValue = ref("1");
const editableTabs: any = ref([]);
const emit = defineEmits(["change_page"]);
const visible = ref(false);
const x = ref(0);
const y = ref(0);

function open(name: String) {
  // 在头部添加一个标签
  show_type.value = 1;
  addTab(name, 5);
}

const props = defineProps({
  changeApiContent: {
    type: Object,
    default: () => {
      return {};
    },
  },
});

watch(
  () => props.changeApiContent,
  (val) => {
    console.log(val);
    if (val.data.child_type === 0) {
      show_type.value = 3;
      for (let i = 0; i < editableTabs.value.length; i++) {
        if (editableTabs.value[i].t === 6){
          editableTabsValue.value = editableTabs.value[i].name
          return
        }
      }
      if (editableTabs.value.length > 2) {
        editableTabs.value[editableTabs.value.length - 1].t = 6
        editableTabs.value[editableTabs.value.length - 1].title = "根目录"
      } else {
        addTab("根目录", 6);
      }
    }
  }
);

function go_page(t: String) {
  if (t === "api") {
    show_type.value = 2;
    for (let i = 0; i < editableTabs.value.length; i++) {
      if (
        editableTabs.value[i].name === editableTabsValue.value &&
        editableTabs.value[i].t === 5
      ) {
        editableTabs.value[i].t = 0;
        editableTabs.value[i].title = "新建接口";
        return;
      }
    }
    addTab("新建接口", 0);
  }
}

function addTab(name: String, t: Number) {
  const tab_name = generateRandomString(10);
  editableTabs.value.push({
    title: name,
    name: tab_name,
    hasChange: false,
    t,
  });
  editableTabsValue.value = tab_name;
  band_context();
}

function closeChangeCode() {
  isChangeCode.value = false;
}

function closeTab(item: any, index: Number) {
  if (editableTabs.value.length === 1) {
    show_type.value = 0;
    setTimeout(() => {
      editableTabs.value.splice(index, 1);
    }, 300);
  } else if (editableTabsValue.value === item.name) {
    setTimeout(() => {
      editableTabs.value.splice(index, 1);
    }, 300);
    editableTabsValue.value =
      editableTabs.value[editableTabs.value.length - 1].name;
    changePage(editableTabs.value[editableTabs.value.length - 1]);
  } else {
    setTimeout(() => {
      editableTabs.value.splice(index, 1);
    }, 300);
  }
}

function generateRandomString(length: number) {
  const characters =
    "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let result = "";
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    const randomIndex = Math.floor(Math.random() * charactersLength);
    result += characters.charAt(randomIndex);
  }
  return result;
}

function changePage(item: any) {
  editableTabsValue.value = item.name;
  if (item.t < 4) {
    show_type.value = 2;
  } else if (item.t === 5) {
    show_type.value = 1;
  } else if (item.t === 6) {
    show_type.value = 3;
  }
  emit("change_page", item);
}

function handleClickOutside(event: any) {
  if (!event.target.closest(".filter-li")) {
    hideMenu(); // 点击发生在目标元素之外时，隐藏菜单
  }
}

async function band_context() {
  await nextTick();
  const elements = document.querySelectorAll(".filter-li");
  elements.forEach((element) => {
    element.addEventListener("contextmenu", showMenu);
  });
  // 监听全局点击事件，用于隐藏菜单
  window.addEventListener("click", handleClickOutside);
  // 添加全局右键事件监听，以处理点击非目标元素的情况
  window.addEventListener("contextmenu", handleClickOutside);
}

function showMenu(event: any) {
  event.preventDefault();
  // 设置较小的偏移量，比如5px
  const offsetX = 5; // 水平偏移量
  const offsetY = 5; // 垂直偏移量
  x.value = event.pageX + offsetX;
  y.value = event.pageY + offsetY;
  visible.value = true;
}

function hideMenu() {
  visible.value = false;
}

function scrollToRight() {
  var container: any = document.getElementById("tabsUl");
  var scrollAmount = 600; // 设定滚动距离

  // 计算新的滚动位置
  var newScrollPosition = container.scrollLeft + scrollAmount;
  console.log(newScrollPosition);
  console.log(container.scrollLeft);
  

  // 使用 scrollTo 方法平滑滚动到新位置
  container.scrollTo({
    left: newScrollPosition,
    behavior: "smooth", // 指定滚动行为为平滑
  });
}

function scrollToLeft() {
  var container: any = document.getElementById("tabsUl");
  var scrollAmount = 600; // 设定滚动距离

  // 计算新的滚动位置
  var newScrollPosition = container.scrollLeft - scrollAmount;

  // 使用 scrollTo 方法平滑滚动到新位置
  container.scrollTo({
    left: newScrollPosition,
    behavior: "smooth", // 指定滚动行为为平滑
  });
}

onMounted(() => {
  const handleActiveTab = (tabs: any, event: any, className: any) => {
    tabs.forEach((tab: any) => {
      tab.classList.remove(className);
    });

    if (!event.target.classList.contains(className)) {
      event.target.classList.add(className);
    }
  };

  const filterTabs: any = document.querySelector(".filter-tabs");
  const filterButtons: any = document.querySelectorAll(".filter-button");

  filterTabs.addEventListener("click", (event: any) => {
    const root = document.documentElement;
    const targetTranslateValue = event.target.dataset.translateValue;

    if (event.target.classList.contains("filter-button")) {
      root.style.setProperty(
        "--translate-filters-slider",
        targetTranslateValue
      );
      handleActiveTab(filterButtons, event, "filter-active");
    }
  });
  code.value = "";
});
</script>
<style lang="scss" scoped>
#tabsUl {
  overflow-x: auto;
}
.change-div {
  position: absolute;
  right: 5px;
  .item {
    display: flex;
    text-align: center;
    align-items: center;
    justify-content: center;
  }
}
.close-div {
  display: none;
}
.filter-li:hover {
  .filter-button {
    transition: color 0.4s ease-in-out;
    transition: background-color 0.3s ease, padding 0.3s ease;
    color: white;
    background-color: #5d5d5d;
    border-radius: 5px;
    padding: 0 1.5rem 0 1rem;
  }
  .change-div {
    display: none;
  }
  .close-div {
    margin-left: 4px;
    display: flex;
    height: 16px;
    align-items: center;
    width: 25px;
    justify-content: center;
    position: absolute;
    right: 0px;
  }
}

.scroll-btn {
  cursor: pointer;
}
.red {
  color: #ff6a6a;
}
.green {
  color: #3cb371;
}
.blue {
  color: #1e90ff;
}
.orange {
  color: #eead0e;
}
.method-span {
  margin-right: 5px;
  font-weight: 500;
  font-size: 12px;
  text-align: right;
}
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease, width 0.3s ease;
}

.fade-enter, .fade-leave-to /* .fade-leave-active in <2.1.8 */ {
  opacity: 0;
  width: 0; /* 设置宽度为0 */
}
.filter-li {
  cursor: pointer;
  max-width: 25%;
  text-align: center;
  justify-content: center;
  margin-left: 3px;
  margin-bottom: 2px;
  margin-top: 2px;
  margin-right: 10px;
  transition: width 0.3s ease, opacity 0.3s ease;
}

button {
  border: none;
  cursor: pointer;
  background-color: transparent;
  outline: none;
}

nav.amazing-tabs {
  background-color: var(--white);
  border-radius: 2.5rem;
  user-select: none;
  position: fixed;
  width: 80%;
  z-index: 9999;
  // padding-top: 1rem;
}

.main-tabs-container {
  padding: 0 1rem 1rem 1rem;
}
.icon-div {
  display: flex;
  height: inherit;
  width: 5%;
  justify-content: center;
  align-items: center;
  i {
    border: 1px;
    border-radius: 5px;
    width: 80%;
    height: 80%;
  }
  i:hover {
    background-color: #f5f5f5;
  }
}
ul.filter-tabs {
  padding: 0px;
  list-style-type: none;
  display: flex;
  align-items: center;
  white-space: nowrap; /* 防止内部元素换行 */
  overflow-x: auto; /* 超出容器宽度时允许横向滚动 */
  scrollbar-width: none; /* 针对 Firefox 隐藏滚动条 */
  -ms-overflow-style: none; /* 针对 IE 和 Edge 隐藏滚动条 */
  // box-shadow: 0 0 1px 0 rgba(24, 94, 224, 0.15),
  //   0 6px 12px 0 rgba(24, 94, 224, 0.15);
}
ul.filter-tabs::-webkit-scrollbar {
  display: none; /* 针对 Chrome、Safari 和 Opera 隐藏滚动条 */
}

.ignore-scrollbar {
  scrollbar-width: none; /* 针对 Firefox 隐藏滚动条 */
  -ms-overflow-style: none; /* 针对 IE 和 Edge 隐藏滚动条 */
}

.filters-container {
  overflow: hidden;
  // padding: 0 3rem;
  transition: max-height 0.4s ease-in-out;
  max-height: var(--filters-container-height);
}

.filters-wrapper {
  height: 50px;
  position: relative;
  transition: opacity 0.2s ease-in-out;
  opacity: var(--filters-wrapper-opacity);
  display: flex;
  align-items: center;
  justify-content: center;
  border-bottom: 1px solid #f0f0f0;
}

.filter-tabs {
  // border-radius: 1rem;
  // padding: 0.3rem;
  overflow: hidden;
  background-color: white;
  width: 100%;
}

.filter-tabs li {
  position: relative;
  z-index: 1;
  display: flex;
  // flex: 1 0 10.33%;
}

.filter-button {
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 0rem;
  flex-grow: 1;
  height: 2rem;
  padding: 0 1rem 0 1rem;
  color: black;
  font-weight: 700;
  font-size: 0.9rem;
  width: 100%;
  overflow: hidden;
  justify-content: left;
}

.filter-button.filter-active {
  transition: color 0.4s ease-in-out;
  transition: background-color 0.3s ease;
  color: var(--dark);
  background-color: #f2f2f2;
  border-radius: 5px;
}

.filter-slider {
  pointer-events: none;
  position: absolute;
  width: 90%;
  left: 5%;
  padding: 0.3rem;
  top: 0;
  right: 0;
  bottom: 0;
  z-index: 0;
}

.filter-slider-rect {
  height: 2rem;
  width: 10%;
  border-radius: 0.8rem;
  background-color: var(--white);
  box-shadow: 0 0.1rem 1rem -0.4rem rgba(0, 0, 0, 0.12);
  transition: transform 0.4s ease-in-out;
  transform: translateX(var(--translate-filters-slider));
}
</style>
