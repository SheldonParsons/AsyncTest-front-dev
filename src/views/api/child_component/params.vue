<template>
  <Star @click="openHandle"></Star>
  <el-dialog v-model="visible" :show-close="false" :append-to-body="true" class="params-special-k11" width="25%">
    <MainPageHeader @close="visible = false" v-if="params_page_status === 0"></MainPageHeader>
    <SettingPageHeader @close="visible = false" @back="toggleItems(0)" v-if="params_page_status === 1">
    </SettingPageHeader>
    <GeneratorHeader @close="visible = false" @back="toggleItems(0)" v-if="params_page_status === 2"></GeneratorHeader>
    <FixedHeader @close="visible = false" @back="toggleItems(0)" v-if="params_page_status === 3"></FixedHeader>
    <el-divider></el-divider>
    <div class="params-container">
      <div ref="gridContainer" class="grid-container">
        <div v-if="params_page_status === 0" style="height: 1px" ref="itemContaniner">
          <Variable v-if="showVariable" @click="toggleItems(1)" style="margin-bottom: 10px"></Variable>
          <Method @click="toggleItems(2)" style="margin-bottom: 10px"></Method>
          <Equal @click="toggleItems(3)"></Equal>
        </div>
        <div ref="itemContaniner" v-if="params_page_status === 1">
          <ParamsVar @reload_height="toggleItems(1)" @insert_action="insert_action" :interface="interface" :env="env">
          </ParamsVar>
        </div>
        <div style="height: 139px" ref="itemContaniner" v-if="params_page_status === 2">
          <ParamsGenerator @reload_height="toggleItems(2)" @insert_action="insert_action"></ParamsGenerator>
        </div>
        <div style="height: 139px" ref="itemContaniner" v-if="params_page_status === 3">
          <ParamsFixed @reload_height="toggleItems(3)" @insert_action="insert_action"></ParamsFixed>
        </div>
      </div>
    </div>
  </el-dialog>
</template>

<script setup lang="ts">
import {
  ref,
  nextTick,
  watch,
  getCurrentInstance,
  onMounted,
  onBeforeUnmount,
} from "vue";
import Star from "@/components/common/ai/star.vue";
import Variable from "./params_child/guild/w_var.vue";
import Method from "./params_child/guild/w_med.vue";
import Equal from "./params_child/guild/w_equal.vue";
import MainPageHeader from "./params_child/header/main_page.vue";
import SettingPageHeader from "./params_child/header/setting_page.vue";
import GeneratorHeader from "./params_child/header/generator_page.vue";
import FixedHeader from "./params_child/header/fixed_page.vue";
import ParamsVar from "./params_child/content/params_var.vue";
import ParamsGenerator from "./params_child/content/params_generator.vue";
import ParamsFixed from "./params_child/content/params_fixed.vue";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();
const visible = ref(false);
const gridContainer: any = ref(null);
const containerHeight = ref(100);
const itemContaniner: any = ref(null);
// 参数组件页面状态 0：初始页面
const params_page_status = ref(0);

const emit = defineEmits(["insert_action"]);

const props = defineProps({
  width: {
    type: Number,
    default: 400,
  },
  showVariable: {
    type: Boolean,
    default: true,
  },
  disable: {
    type: Boolean,
    default: false,
  },
  interface: {
    type: Number,
    default: -1,
  },
  env: {
    type: String,
    default: '-1'
  }
});

// 监听弹出层显示状态
watch(visible, async (newVal) => {
  if (newVal) {
    console.log(123123);
    await nextTick();
    toggleItems(0);
    await nextTick();
    // 添加微任务延迟确保DOM更新完成
    await Promise.resolve();
    // 强制重排后获取正确高度
    void gridContainer.value?.offsetHeight;
    containerHeight.value = itemContaniner.value?.scrollHeight || 0;
  }
});

function openHandle() {
  if (props.disable) {
    tools.message("联动组件不允许您进行变量设置", proxy);
    return;
  }
  visible.value = !visible.value;
}

async function toggleItems(index: number) {
  // 强制清除高度以获取准确的计算
  gridContainer.value.style.height = "auto";
  // 触发浏览器重排（关键步骤）
  changeContent(index);
  await nextTick();
  const startHeight = itemContaniner.value.scrollHeight;
  void gridContainer.value.offsetHeight;
  containerHeight.value = startHeight;
  gridContainer.value.style.height = containerHeight.value + "px";
}

function changeContent(index: number) {
  params_page_status.value = index;
}

function insert_action(text: string) {
  visible.value = false;
  toggleItems(0);
  emit("insert_action", text);
}
</script>

<style scoped lang="scss">
.magic {
  width: 30px;
  height: 30px;
}

.params-container {
  width: 100%;
  max-width: 800px;
  margin: 0 auto;
}

.grid-container {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 5px;
  grid-auto-rows: minmax(10px, auto);
  /* 确保行高可收缩 */
  transition: height 0.2s cubic-bezier(0.4, 0, 0.2, 1);
  /* 更平滑的过渡曲线 */
  overflow: hidden;
  will-change: height;
  /* 优化过渡性能 */
  padding: 12px;
  overflow: auto;
}
</style>

<style lang="scss">
.el-popover {
  padding: 0px !important;
  border-radius: 10px 10px !important;
}

.el-divider--horizontal {
  margin: 0px !important;
  border-color: #f2f4f7;
}

.params-special-k11 {
  .el-dialog__header {
    display: none;
  }
}
</style>
