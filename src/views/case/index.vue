<template>
  <SplitterGroup direction="vertical">
    <SplitterPanel :default-size="6" :min-size="6" :max-size="6">
      <nav class="amazing-tabs">
        <div class="filters-container">
          <div class="filters-wrapper">
            <div class="icon-div" style="border-right: 1px solid #f5f5f5">
              <el-icon @click="scrollToLeft" class="margin-cls scroll-btn">
                <ArrowLeftBold />
              </el-icon>
            </div>
            <div class="no-scroll" id="tabsUl" style="
            flex: 1;
            display: flex;
            align-items: center;
            justify-content: start;
            height: 100%;
            overflow: hidden;
            gap: 5px;
            
          ">
              <motion.div v-for="(item, index) in editableTabs" :key="item.name" class="tab-item"
                :class="{ active: current_tab_name === item.name }" :initial="{ opacity: 0, y: -4 }"
                :animate="{ opacity: 1, y: 0 }" :whileHover="{ backgroundColor: '#ebeff5', color: '#222' }"
                :transition="{ duration: 0.18 }" @click="change_tab_and_change_page(
                  item.title,
                  item.t,
                  item.index,
                  true,
                  item.name
                )">
                <motion.div v-if="item.t === 4" class="icon-box">
                  <Fold style="margin-right:5px;"
                    :style="{ color: current_tab_name === item.name ? '#eeeeee' : 'black' }" />
                </motion.div>

                <motion.div v-if="item.t === 2" class="icon-box">
                  <CaseLight v-if="current_tab_name === item.name" class="case-icon" style="height:15px" />
                  <Case v-else class="case-icon" style="height:15px" />
                </motion.div>

                <span class="title g-ellipsis">{{ item.title }}</span>

                <div class="suffix-slot" @click.stop>
                  <el-badge v-if="item.hasChange" is-dot class="dot-badge" />
                  <el-icon class="close-icon" @click.stop="closeTab(item, index)">
                    <CloseBold />
                  </el-icon>
                </div>
              </motion.div>
            </div>
            <div class="icon-div" style="border-left: 1px solid #f5f5f5; width: 70px">
              <el-icon @click="scrollToRight" class="margin-cls scroll-btn">
                <ArrowRightBold />
              </el-icon>
            </div>
            <div class="icon-div" style="border-left: 1px solid #f5f5f5">
              <el-icon class="margin-cls scroll-btn" @click="open_create_page">
                <PlusBold />
              </el-icon>
            </div>
          </div>
        </div>
      </nav>
    </SplitterPanel>
    <SplitterResizeHandle disabled />
    <SplitterPanel :default-size="94" :min-size="94" :max-size="94">
      <div style="height: 100%; overflow: hidden;display: flex;flex-direction: column;" class="case-main-content">
        <EmptyPage v-if="show_type === 0"></EmptyPage>
        <CreatePage v-if="show_type === 1" @go_page="go_page" :title="'Case'" :desc="'创建测试用例'"></CreatePage>
        <CaseDocumentation v-if="show_type === 2" :node_id="current_node" :case_id="current_target_id"
          :target_type="current_target_type"></CaseDocumentation>
        <CaseDir v-if="show_type === 3" :node_id="current_node" :dir_id="current_target_id"
          :target_type="current_target_type"></CaseDir>
      </div>
    </SplitterPanel>
  </SplitterGroup>
</template>
<script lang="ts" setup>
import { ref, onMounted, nextTick, watch, getCurrentInstance } from "vue";
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import Fold from "@/assets/svg/tree/fold.vue";
import Case from "@/assets/svg/tree/case.vue";
import CaseLight from "@/assets/svg/tree/case_light.vue";
import { useRoute } from "vue-router";
import PlusBold from "@/assets/svg/common/addIcon.vue";
import CaseDocumentation from "@/views/case/content/case.vue"
import EmptyPage from "@/views/api/child_context/empty_page.vue";
import CreatePage from "@/views/api/child_context/create_empty_page.vue";
import CaseDir from "@/views/case/content/dir.vue";
import { GlobalState } from "@/state/index";
import tools from "@/utils/tools";
import {
  ApiGetEnvListAndUserSetting,
  ApiUpdateUserEnv,
} from "@/api/interface/env";
import { motion } from "motion-v";

const { proxy }: any = getCurrentInstance();
const show_type = ref(1);
const route = useRoute();
const env_list: any = ref([]);
const env = ref("");
const isChangeCode = ref(false);
const current_tab_name: any = ref(null);
const editableTabs: any = ref([]);
const emit = defineEmits(["change_page"]);
const visible = ref(false);
const current_node = ref();
const current_target_id = ref();
const current_target_type = ref();
const x = ref(0);
const y = ref(0);
const max_length = 5;
const caseDocumentRef:any = ref(null)
const page_mapping: any = {
  empty_page: 0,
  create_page: 1,
  api_page: 2,
  dir_page: 3,
};

interface EditorTab {
  title: string;
  name: string;
  hasChange: boolean;
  t: number;
  index: number;
  target_id: number;
  child_type: number;
}

const tab_type_to_show_page_mapping: any = {
  0: "api_page",
  1: "api_page",
  2: "api_page",
  3: "api_page",
  4: "dir_page",
  5: "create_page",
};

const props = defineProps({
  changeApiContent: {
    type: Object,
    default: () => {
      return {};
    },
  },
  width: {
    type: Number,
    default: 0,
  },
});

onMounted(() => {
  get_env_list_and_user_env();
});
// t的映射：0：get，1：post，2：put，3：delete，4：目录，5：新建内容
watch(
  () => GlobalState.count,
  (newCount) => {
    if (GlobalState.message === "clean_interface_change") {
      const node_id = GlobalState.data.node_id;
      for (let i = 0; i < editableTabs.value.length; i++) {
        if (editableTabs.value[i].index === node_id) {
          editableTabs.value[i].hasChange = false;
          break;
        }
      }
    }
    if (GlobalState.message === "change_interface_content") {
      const node_id = GlobalState.data.node_id;
      for (let i = 0; i < editableTabs.value.length; i++) {
        if (editableTabs.value[i].index === node_id) {
          editableTabs.value[i].hasChange = true;
          break;
        }
      }
    }
    if (GlobalState.message === "delete_nodes") {
      const delete_node_ids: Array<number> = GlobalState.data.ids;
      let change_page_target_list: Array<EditorTab | null> = [];
      delete_node_ids.forEach((item) => {
        change_page_target_list.push(delete_tab(item, true));
      });
      const change_page_target = findLastNonNull(change_page_target_list);
      if (change_page_target !== null) {
        change_page(change_page_target);
      } else {
        for (let i = 0; i < editableTabs.value.length; i++) {
          if (editableTabs.value[i].name === current_tab_name.value) {
            if (editableTabs.value[i].t < 4) {
              GlobalState.sendMessage("change_interface_tab", {
                id: editableTabs.value[i].index,
              });
            } else if (editableTabs.value[i].t === 4) {
              GlobalState.sendMessage("change_dir_tab", {
                id: editableTabs.value[i].index,
              });
            }
            break;
          }
        }
      }
    }
    if (GlobalState.message === "change_env_name") {
      for (let i = 0; i < env_list.value.length; i++) {
        if (env_list.value[i].id === GlobalState.data.id) {
          if (env.value === env_list.value[i].name) {
            env.value = GlobalState.data.name;
          }
          env_list.value[i].name = GlobalState.data.name;
        }
      }
    }
    if (GlobalState.message === "add_env") {
      env_list.value.push(GlobalState.data.data);
    }
    if (
      GlobalState.message === "update_interface_name" ||
      GlobalState.message === "change_name_from_tree" ||
      GlobalState.message === "change_name_from_dir"
    ) {
      for (let i = 0; i < editableTabs.value.length; i++) {
        if (editableTabs.value[i].index === GlobalState.data.node_id) {
          editableTabs.value[i].title = GlobalState.data.name;
          break;
        }
      }
    }
    if (GlobalState.message === "delete_env") {
      env_list.value = env_list.value.filter((item: any) => {
        return item.id !== GlobalState.data.data;
      });
      env.value = env_list.value[0].name;
      change_user_env(env_list.value[0].name);
    }
  }
);

function findLastNonNull(arr: (EditorTab | null)[]): EditorTab | null {
  for (let i = arr.length - 1; i >= 0; i--) {
    if (arr[i] !== null) {
      return arr[i];
    }
  }
  return null;
}
watch(
  () => props.changeApiContent,
  (val) => {
    if (val.type === "click_interface") {
      if (is_current_tab_by_index(val.data.id)) {
        return;
      }
      current_node.value = val.data.id;
      current_target_id.value = val.data.target;
      change_tab_and_change_page(
        val.data.name,
        2,
        val.data.id,
        false,
        null,
        val.data.target
      );
    }
    if (val.type === "click_dir" || val.type === "click_root_dir") {
      if (is_current_tab_by_index(val.data.id)) {
        return;
      }
      current_node.value = val.data.id;
      current_target_id.value = val.data.target;
      current_target_type.value = val.data.child_type;
      change_tab_and_change_page(
        val.data.name,
        4,
        val.data.id,
        false,
        null,
        val.data.target,
        val.data.child_type
      );
    }
  }
);

function open_create_page() {
  const editor_tab: EditorTab = change_tab("新建内容", 5);
  change_page(editor_tab);
}

function change_tab_and_change_page(
  title: string,
  t: number,
  index: number,
  broadcast = true,
  name = null,
  target_id = null,
  child_type = null
) {
  if (name !== null && is_crtrent_tab(name)) {
    return;
  }
  const editor_tab: EditorTab = change_tab(
    title,
    t,
    index,
    target_id,
    child_type
  );
  change_page(editor_tab, broadcast);
}

function is_crtrent_tab(name: string) {
  return name === current_tab_name.value;
}

function is_current_tab_by_index(index: number) {
  for (let i = 0; i < editableTabs.value.length; i++) {
    if (editableTabs.value[i].index === index) {
      if (editableTabs.value[i].name === current_tab_name.value) {
        return true;
      }
    }
  }
  return false;
}

function change_tab(
  name: string,
  t: number,
  index: number = -1,
  target_id = null,
  child_type = null
) {
  let result: EditorTab | boolean = false;
  result = try_change_current_tab(name, index);
  if (result !== false) {
    return result;
  }
  result = replace_last_tab(t, name, index);
  if (result !== false) {
    return result;
  }
  return addTab(name, t, index, target_id, child_type);
}

function change_page(page_target: EditorTab | string, broadcast = true) {
  // 如果不是目录，也不是接口的页面，则直接修展示即可
  if (page_target === "empty_page") {
    GlobalState.sendMessage("change_empty_tab", { id: null });
    show_type.value = 0;
  } else if (typeof page_target === "object" && "t" in page_target) {
    change_page_status_by_t(page_target.t);
    if (is_interface(page_target.t)) {
      // 接口
      const id = page_target.index;
      if (broadcast) {
        current_target_id.value = page_target.target_id;
        current_node.value = id;
        GlobalState.sendMessage("change_interface_tab", { id: id });
      }
    } else if (is_dir(page_target.t)) {
      // 目录
      const id = page_target.index;
      if (broadcast) {
        current_target_id.value = page_target.target_id;
        current_target_type.value = page_target.child_type;
        current_node.value = id;
        GlobalState.sendMessage("change_dir_tab", { id: id });
      }
    }
  }
}

function change_page_status_by_t(t: number) {
  show_type.value = -2;
  setTimeout(() => {
    show_type.value = page_mapping[tab_type_to_show_page_mapping[t]];
  }, 0);
}

function is_interface(t: number) {
  return t < 4;
}

function is_dir(t: number) {
  return t === 4;
}

function try_change_current_tab(name: string, index: number = -1): boolean {
  for (const tab of editableTabs.value) {
    const isMatch = tab.title === name && (index === -1 || tab.index === index);
    if (isMatch) {
      current_tab_name.value = tab.name;
      return tab;
    }
  }
  return false;
}

function replace_last_tab(
  t: number,
  title: string,
  index: number = -1
): EditorTab | boolean {
  if (editableTabs.value.length > max_length - 1) {
    editableTabs.value[editableTabs.value.length - 1].t = t;
    editableTabs.value[editableTabs.value.length - 1].title = title;
    editableTabs.value[editableTabs.value.length - 1].index = index;
    current_tab_name.value =
      editableTabs.value[editableTabs.value.length - 1].name;
    return editableTabs.value[editableTabs.value.length - 1];
  }
  return false;
}

function go_page(t: String) {
  if (t === "api") {
    if (editableTabs.value.length === 0) {
      GlobalState.sendMessage("create_interface_under_root", { data: null });
      return;
    }
    for (let i = 0; i < editableTabs.value.length; i++) {
      if (editableTabs.value[i].t === 5) {
        closeTab(editableTabs.value[i], i, true);
        GlobalState.sendMessage("create_interface_under_root", { data: null });
        break;
      }
    }
  }
}

function delete_tab(node_id: number, delay_change_page: boolean = false) {
  let editor_tab = null;
  let editor_index = -1;
  for (let i = 0; i < editableTabs.value.length; i++) {
    if (editableTabs.value[i].index === node_id) {
      editor_tab = editableTabs.value[i];
      editor_index = i;
      break;
    }
  }
  if (editor_tab !== null && editor_index !== -1) {
    return closeTab(editor_tab, editor_index, delay_change_page);
  }
  return null;
}

function addTab(
  name: String,
  t: Number,
  index: number = -1,
  target_id = null,
  child_type = null
) {
  const tab_name = generateRandomString(10);
  editableTabs.value.push({
    title: name,
    name: tab_name,
    hasChange: false,
    t,
    index: index,
    target_id: target_id,
    child_type: child_type,
  });
  console.log(editableTabs.value);

  current_tab_name.value = tab_name;
  // band_context();
  return editableTabs.value[editableTabs.value.length - 1];
}

function closeChangeCode() {
  isChangeCode.value = false;
}

function closeTab(
  item: any,
  index: Number,
  delay_change_page: boolean = false
) {
  // 最后一个标签
  if (editableTabs.value.length === 1) {
    change_page("empty_page");
    clean_editor_tab();
    current_tab_name.value = null;
    // 非最后一个，但是是当前标签
  } else if (current_tab_name.value === item.name) {
    editableTabs.value.splice(index, 1);
    current_tab_name.value =
      editableTabs.value[editableTabs.value.length - 1].name;
    if (delay_change_page === false) {
      change_page(editableTabs.value[editableTabs.value.length - 1]);
    } else {
      return editableTabs.value[editableTabs.value.length - 1];
    }
  } else {
    editableTabs.value.splice(index, 1);
  }
  return null;
}

function clean_editor_tab() {
  editableTabs.value = [];
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

const loadScript = (src: any) => {
  return new Promise((resolve, reject) => {
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
};

async function get_env_list_and_user_env() {
  const data = {
    type: 0,
    child_action_type: "get_env_list_and_user_env",
    content: {
      project: route.params.project,
    },
  };
  ApiGetEnvListAndUserSetting(data).then((res: any) => {
    env_list.value = res.env_list;
    env.value = res.user_env;
    GlobalState.setUserEnvNoBroadcase(env.value);
  });
}

function change_user_env(item: any) {
  const data = {
    project: route.params.project,
    name: item,
  };
  ApiUpdateUserEnv(data).then((res: any) => {
    tools.message("切换成功", proxy, "success");
    GlobalState.setUserEnv("set_user_env", item);
  });
}
</script>
<style lang="scss" scoped>
.amazing-tabs {
  .title {
    font-weight: 600;
  }

  .tabs-wrap {
    display: flex;
    gap: 4px;
    padding: 4px 6px;
    overflow-x: auto;
  }

  .tab-item {
    display: flex;
    align-items: center;
    gap: 4px;
    padding: 0 12px;
    height: 32px;
    border-radius: 6px;
    cursor: pointer;
    user-select: none;
    background-color: #f0f5f9 !important;
    ;
    color: #444 !important;
    ;
    transition: background-color .18s, color .18s;
    position: relative;
    font-size: 14px;
    max-width: 200px;
  }

  .tab-item.active {
    background: #1e2022 !important;
    color: white !important;
    font-weight: 600 !important;
  }

  .icon-box {
    display: flex;
    align-items: center;
  }

  .close-icon-wrapper {
    display: flex;
    align-items: center;
    margin-left: 6px;
  }

  .close-icon {
    font-size: 14px;
    pointer-events: auto;
  }

  .suffix-slot {
    position: relative;
    width: 16px;
    height: 16px;
    flex: 0 0 16px;
  }

  /* 小红点默认可见，hover 时隐藏 */
  .dot-badge {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: opacity .16s;
    opacity: 1;
  }

  .tab-item:hover .dot-badge {
    opacity: 0;
    pointer-events: none;
  }

  /* 关闭按钮默认透明，hover 时出现 */
  .close-icon {
    position: absolute;
    inset: 0;
    margin: auto;
    width: 16px;
    height: 16px;
    font-size: 14px;
    opacity: 0;
    pointer-events: none;
    transition: opacity .16s;
  }

  .tab-item:hover .close-icon {
    opacity: 1;
    pointer-events: auto;
  }
}


.case-icon {
  color: var(--global-theme-color);
}

#tabsUl {
  overflow-x: auto;
}

.change-div {
  width: 14px;

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
    transition: background-color 0.3s ease, padding 0.5s ease, width 0.3s ease;
    color: white;
    background-color: var(--el-input-focus-border-color);
    border-radius: 5px;

    // padding: 0 1rem 0 1rem;
    .folder-div {
      svg {
        fill: white;
      }
    }
  }

  .change-div {
    display: none;
  }

  .close-div {
    display: flex;
    height: 16px;
    align-items: center;
    // width: 25px;
    justify-content: center;
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

.fade-enter,
.fade-leave-to

/* .fade-leave-active in <2.1.8 */
  {
  opacity: 0;
  width: 0;
  /* 设置宽度为0 */
}

.filter-li {
  cursor: pointer;
  max-width: 200px;
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
  border-bottom: 1px solid #f0f0f0;
  background-color: var(--white);
  user-select: none;
  width: 100%;
  height: 100%;
  display: flex;
  box-sizing: border-box;
  // padding-top: 1rem;
}

.main-tabs-container {
  padding: 0 1rem 1rem 1rem;
}

.env-div {
  width: 200px !important;
  padding: 0px 5px;

  .env-select {
    flex: 60;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  .env-icon-div {
    flex: 40;
    height: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }

  display: flex;
  height: inherit;
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

.icon-div {
  display: flex;
  height: inherit;
  width: 70px !important;
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
  flex: 1;
  list-style-type: none;
  display: flex;
  align-items: center;
  white-space: nowrap;
  /* 防止内部元素换行 */
  overflow-x: auto;
  /* 超出容器宽度时允许横向滚动 */
  scrollbar-width: none;
  /* 针对 Firefox 隐藏滚动条 */
  -ms-overflow-style: none;
  /* 针对 IE 和 Edge 隐藏滚动条 */
  // box-shadow: 0 0 1px 0 rgba(24, 94, 224, 0.15),
  //   0 6px 12px 0 rgba(24, 94, 224, 0.15);
}

ul.filter-tabs::-webkit-scrollbar {
  display: none;
  /* 针对 Chrome、Safari 和 Opera 隐藏滚动条 */
}

.ignore-scrollbar {
  scrollbar-width: none;
  /* 针对 Firefox 隐藏滚动条 */
  -ms-overflow-style: none;
  /* 针对 IE 和 Edge 隐藏滚动条 */
}

.filters-container {
  overflow: hidden;
  height: 100%;
  width: 100%;
  // padding: 0 3rem;
  transition: max-height 0.4s ease-in-out;
  max-height: var(--filters-container-height);
  display: flex;
}

.filters-wrapper {
  width: 100%;
  display: flex;
  height: 100%;
  transition: opacity 0.2s ease-in-out;
  opacity: var(--filters-wrapper-opacity);
  display: flex;
  align-items: center;
  justify-content: center;
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
  padding: 0 0.8rem 0 1rem;
  color: black;
  font-weight: 700;
  font-size: 0.9rem;
  width: 100%;
  overflow: hidden;
  justify-content: left;
  gap: 5px;
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
