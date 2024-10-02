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
        <ul id="tabsUl" class="margin-cls filter-tabs ignore-scrollbar">
          <li class="filter-li" v-for="(item, index) in editableTabs">
            <div
              class="filter-button"
              :class="{ 'filter-active': editableTabsValue === item.name }"
              @click="changePage(item.name)"
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
              <div class="close-div">
                <el-icon class="close-icon"><CloseBold /></el-icon>
              </div>
              <div class="change-div">
                <el-badge is-dot class="item"></el-badge>
              </div>
            </div>
          </li>
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
          <el-icon class="margin-cls scroll-btn" style="z-index: 999"
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
  <!-- <el-row class="editor-row" style="height: 70%">
    <el-col :span="20">
      <JsonEditor
        :colorGroup="1"
        class="create-child"
        v-model="code"
        :project="Number(route.params.project)"
        :changeValue="isChangeCode"
        @stopChangeCode="closeChangeCode"
      ></JsonEditor>
    </el-col>
  </el-row> -->
  <el-row style="margin-top: 1%;">
    <el-col :span="23" :offset="1">
      <el-breadcrumb separator="/">
        <el-breadcrumb-item :to="{ path: '/' }">homepage</el-breadcrumb-item>
        <el-breadcrumb-item>
          <a href="/">promotion management</a>
        </el-breadcrumb-item>
        <el-breadcrumb-item>promotion list</el-breadcrumb-item>
        <el-breadcrumb-item>promotion detail</el-breadcrumb-item>
      </el-breadcrumb>
    </el-col>
  </el-row>
  <Documentation></Documentation>
  <!-- <CodeMirror></CodeMirror> -->
  <ContextMenu></ContextMenu>
</template>
<script lang="ts" setup>
import { ref, onMounted } from "vue";
import Fold from "@/assets/svg/tree/fold.vue";
import CButton from "@/components/common/button/CButton.vue";
import SpecialButton from "@/components/common/button/special_button.vue";
import JsonEditor from "@/components/common/editor/JsonEditor.vue";
import { useRoute, useRouter } from "vue-router";
import PlusBold from "@/assets/svg/common/addIcon.vue";
import FilterBold from "@/assets/svg/common/filter.vue";
import ContextMenu from "@/components/layout/menus/ContextMenu.vue";
import Documentation from './child_context/doc_page.vue'
import CodeMirror from './child_context/code_mirror.vue'

const method_list = ["GET", "POST", "PUT", "DELETE"];
const method_color = ["green", "orange", "blue", "red"];

const code: any = ref(undefined);
const route = useRoute();
const router = useRouter();
const isChangeCode = ref(false);

function closeChangeCode() {
  isChangeCode.value = false;
}

function changePage(name: string) {
  editableTabsValue.value = name;
}

function scrollToRight() {
  var container: any = document.getElementById("tabsUl");
  var scrollAmount = 600; // 设定滚动距离

  // 计算新的滚动位置
  var newScrollPosition = container.scrollLeft + scrollAmount;
  console.log(newScrollPosition);

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
let tabIndex = 2;
const editableTabsValue = ref("1");
const editableTabs = ref([
  {
    title: "https://ztpm.gree.com:8888/execution-story-869.json",
    name: "1",
    content: "Tab 1 content",
    t: 0,
  },
  {
    title: "登录",
    name: "2",
    content: "Tab 2 content",
    t: 1,
  },
  {
    title: "https://ztpm.gree.com:8888/execution-story-869.json",
    name: "3",
    content: "Tab 1 content",
    t: 0,
  },
  {
    title: "登录",
    name: "4",
    content: "Tab 2 content",
    t: 1,
  },
  {
    title: "https://ztpm.gree.com:8888/execution-story-869.json",
    name: "5",
    content: "Tab 1 content",
    t: 0,
  },
  {
    title: "登录",
    name: "6",
    content: "Tab 2 content",
    t: 1,
  },
  {
    title: "https://ztpm.gree.com:8888/execution-story-869.json",
    name: "7",
    content: "Tab 1 content",
    t: 0,
  },
  {
    title: "登录",
    name: "8",
    content: "Tab 2 content",
    t: 1,
  }
]);

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
    transition: background-color 0.3s ease;
    color: #2ed85d;
    background-color: #FAFAFA;
    border-radius: 5px;
  }
  .change-div {
    display: none;
  }
  .close-div {
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
  margin-top: 3px;
  margin-right: 5px;
  font-weight: 500;
  font-size: 12px;
  text-align: right;
}
// .margin-cls {
//   margin-bottom: 30px;
// }
// .filter-span::after {
//   content: ""; /* 伪元素需要内容，即使是空的 */
//   position: absolute;
//   bottom: 0;
//   left: 10;
//   right: 0;
//   height: 100%;
//   width: 30px;
//   background: linear-gradient(
//     to right,
//     rgba(255, 255, 255, 0),
//     rgba(255, 255, 255, 1)
//   ); /* 渐变遮罩 */
//   filter: blur(5px); /* 应用模糊效果 */
// }
.filter-li {
  cursor: pointer;
  max-width: 25%;
  text-align: center;
  justify-content: center;
  margin-left: 3px;
  margin-bottom: 2px;
  margin-top: 2px;
  margin-right: 10px;
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
  padding: 0.3rem;
  overflow: hidden;
  background-color: white;
  width: 80%;
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
  padding: 0 1.5rem;
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
  background-color: #FAFAFA;
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
