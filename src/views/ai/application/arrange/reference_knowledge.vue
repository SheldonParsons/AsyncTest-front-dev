<template>
  <el-drawer
    v-model="drawerModel"
    @close="emit('updateDrawer')"
    direction="rtl"
    class="knowledge-drawer"
  >
    <template #header>
      <h4>选择引用知识库</h4>
    </template>
    <template #default>
      <el-row
        v-for="(item, index) in knowledge_list"
        :key="index"
        style="cursor: pointer; margin-top: 10px"
        @click="choiceKnowledge(item, index)"
      >
        <el-col :span="22" :offset="1">
          <div
            class="knowledge-container"
            :style="bg_style_object(item)"
            style="
              overflow: hidden;
              width: 100%;
              height: 45px;
              border: 1px solid #ccc;
              border-radius: 10px;
              display: flex;
              justify-content: start;
              align-items: center;
              padding: 5px;
            "
          >
            <el-avatar shape="square" :size="40" :src="item.icon" />
            <span
              style="
                margin-left: 10px;
                font-size: 14px;
                font-weight: 600;
                max-width: 100%;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              "
              >{{ item.name }}</span
            >
            <el-divider direction="vertical"></el-divider>
            <span
              style="
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              "
              >创建者：{{ item.create_by }}</span
            >
            <el-divider direction="vertical"></el-divider>
            <span
              style="
                font-size: 14px;
                white-space: nowrap;
                overflow: hidden;
                text-overflow: ellipsis;
              "
              >{{ new Date(item.add_time).toLocaleString() }}</span
            >
          </div>
        </el-col>
      </el-row>
    </template>
    <template #footer>
      <div style="flex: auto">
        <el-button @click="drawerModel = false">取消</el-button>
        <el-button type="primary" @click="edit_dataset">更新</el-button>
      </div>
    </template>
  </el-drawer>
</template>

<script setup lang="ts">
import { ref, watch, onMounted } from "vue";
import { useRoute } from "vue-router";
const route = useRoute();
const emit = defineEmits(["updateDrawer", "addDataset", "deleteDataset", "editDataset"]);
const props = defineProps({
  drawer: {
    type: Boolean,
    default: false,
  },
  datasets: {
    type: Object,
    default: () => [],
  },
  knowledge_list: {
    type: Object,
    default: () => [],
  }
});
const drawerModel: any = ref(false);
watch(
  () => props.drawer,
  (val) => {
    drawerModel.value = val;
  }
);
function edit_dataset() {
    emit("editDataset")
    drawerModel.value = false
}
function bg_style_object(item: any) {
  if (props.datasets.includes(item.id)) {
    return {
      "--pseudo-bg-image": "url(" + item.icon + ")",
    };
  }
}
function choiceKnowledge(item: any, index: any) {
  const element: any = document.querySelectorAll(".knowledge-container");
  const targetElement = element[index];
  if (targetElement) {
    const computedStyle = window.getComputedStyle(targetElement);
    // 获取自定义属性 --pseudo-bg-image 的值
    const pseudoBgImage = computedStyle
      .getPropertyValue("--pseudo-bg-image")
      .trim();
    // 判断背景颜色是否已设置
    if (pseudoBgImage.length !== 0) {
      emit("deleteDataset", item.id);
    } else {
      emit("addDataset", item.id);
    }
  } else {
    console.error("指定的元素不存在。");
  }
}
</script>

<style scoped lang="scss">
.knowledge-container {
  overflow: hidden;
  position: relative;
}
.knowledge-container::before {
  content: "";
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: var(--pseudo-bg-image) no-repeat center center;
  background-size: cover;
  filter: blur(60px);
  z-index: 0;
}
</style>

<style lang="scss">
.knowledge-drawer {
  .el-drawer__header {
    margin-bottom: 0px !important;
  }
}
</style>
