<template>
  <div>
    <div class="switch-tab">
      <div :class="{ active: activeTab === 'A' }" @click="activeTab = 'A'">
        <span>目录设置</span>
      </div>
      <div v-if="target_type === 0" :class="{ active: activeTab === 'B' }" @click="activeTab = 'B'">
        <span>用例任务</span>
      </div>
    </div>
  </div>
  <Settings
    v-if="activeTab === 'A'"
    :dir_id="props.dir_id"
    :node_id="node_id"
  ></Settings>
  <ProjectTask
    v-if="activeTab === 'B'"
    :target_type="target_type"
    :dir_id="props.dir_id"
    :node_id="node_id"
  ></ProjectTask>
</template>

<script setup lang="ts">
import { ref } from "vue";
import Settings from "@/views/case/content/dir_content/settings.vue";
import ProjectTask from "@/views/case/content/dir_content/project_task.vue";

const activeTab = ref<"A" | "B" | "C">("A");
const props = defineProps({
  node_id: {
    type: Number,
    default: -1,
  },
  dir_id: {
    type: Number,
    default: -1,
  },
  target_type: {
    type: Number,
    default: -1,
  },
});
</script>

<style lang="scss" scope>
.switch-tab {
  display: flex;
  justify-content: start;
  align-items: center;
  padding-top: 10px;
  padding-bottom: 10px;
  margin-left: 20px;
  gap: 5px;
  .active {
    background-color: black;
    color: white;
  }
  div {
    padding: 3px 10px;
    color: #667085;
    font-size: 14px;
    cursor: pointer;
    border-radius: 8px;
  }
  .active {
    background-color: black !important;
    color: white !important;
  }
  div:hover {
    background-color: rgba(16, 24, 40, 0.05);
  }
}
</style>
