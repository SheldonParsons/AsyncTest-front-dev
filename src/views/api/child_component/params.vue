<template>
  <el-popover
    :visible="visible"
    placement="right"
    class="params-popover"
    :width="props.width"
  >
    <template #reference>
      <Star @click="visible = !visible"></Star>
    </template>
    <MainPageHeader v-if="params_page_status === 0"></MainPageHeader>
    <SettingPageHeader v-if="params_page_status === 1"></SettingPageHeader>
    <el-divider></el-divider>
    <div class="params-container">
      <div
        ref="gridContainer"
        class="grid-container"
        :style="{ height: containerHeight + 'px' }"
      >
        <div v-if="params_page_status === 0" style="height: 1px;width: 300px;" ref="itemContaniner">
          <Variable @click="toggleItems(1)" style="margin-bottom: 10px;"></Variable>
          <Method style="margin-bottom: 10px;"></Method>
          <Equal></Equal>
        </div>
        <div
          style="height: 100px;width: 300px;"
          ref="itemContaniner"
          v-if="params_page_status === 1"
        >
        <el-row style="width: 100%;">
            <el-col :span="24">
                <el-input v-model="params" style="height: 28px;font-size: 13px;" placeholder="请输入变量名" />
            </el-col>
        </el-row>
        <div class="show-content">
            <el-row>
                <el-col :span="24"><span style="font-weight: 500;font-size: 13px;">全局参数</span></el-col>
            </el-row>
            <el-row class="params-row">
                <el-col :span="12"><span style="margin-left: 5px;">name</span></el-col>
                <el-col :span="12" style="display: flex;justify-content: end;"><span style="margin-right: 5px;">Sheldon</span></el-col>
            </el-row>
            <el-row style="margin-top: 10px;">
                <el-col :span="24"><span style="font-weight: 500;font-size: 13px;">环境变量</span></el-col>
            </el-row>
            <el-row class="params-row">
                <el-col :span="24"><span style="margin-left: 5px;">name</span></el-col>
            </el-row>
        </div>
    </div>
      </div>
    </div>
  </el-popover>
</template>

<script setup lang="ts">
import { ref, nextTick, watch } from "vue";
import Star from "@/components/common/ai/star.vue";
import Variable from "./params_child/guild/w_var.vue";
import Method from "./params_child/guild/w_med.vue";
import Equal from "./params_child/guild/w_equal.vue";
import MainPageHeader from './params_child/header/main_page.vue'
import SettingPageHeader from './params_child/header/setting_page.vue'
const visible = ref(false);
const params = ref('')
const gridContainer: any = ref(null);
const containerHeight = ref(0);
const itemContaniner: any = ref(null);
// 参数组件页面状态 0：初始页面
const params_page_status = ref(1);
const props = defineProps({
  width: {
    type: Number,
    default: 300,
  },
});

// 监听弹出层显示状态
watch(visible, async (newVal) => {
  if (newVal) {
    await nextTick();
    // 添加微任务延迟确保DOM更新完成
    await Promise.resolve();
    // 强制重排后获取正确高度
    void gridContainer.value?.offsetHeight;
    containerHeight.value = itemContaniner.value?.scrollHeight || 0;
  }
});

async function toggleItems(index: number) {
  // 强制清除高度以获取准确的计算
  gridContainer.value.style.height = "auto";
  // 触发浏览器重排（关键步骤）
  changeContent(index);
  await nextTick();
  const startHeight = itemContaniner.value.scrollHeight;
  void gridContainer.value.offsetHeight;
  containerHeight.value = startHeight;
}

function changeContent(index: number) {
  params_page_status.value = index;
}

// 初始高度设置
nextTick(() => {
  containerHeight.value = gridContainer.value.scrollHeight;
});
</script>

<style scoped lang="scss">
.params-row {
    border: 1px solid #f2f4f7;
    border-radius: 10px;
    background-color: #f9fafb;
    padding: 2px;
    display: flex;
    justify-content: center;
    align-items: center;
    font-size: 13px;
    margin-top: 10px;
}
.show-content {
    margin-top: 10px;
    max-height: 200px;
    overflow: scroll;
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
  grid-auto-rows: minmax(10px, auto); /* 确保行高可收缩 */
  transition: height 0.5s cubic-bezier(0.4, 0, 0.2, 1); /* 更平滑的过渡曲线 */
  overflow: hidden;
  will-change: height; /* 优化过渡性能 */
  padding: 12px;
}
</style>

<style lang="scss">
.el-popover {
  min-width: 300px !important;
  padding: 0px !important;
  border-radius: 10px !important;
  width: auto !important;
}

.el-divider--horizontal {
  margin: 0px !important;
  border-color: #f2f4f7;
}
</style>
