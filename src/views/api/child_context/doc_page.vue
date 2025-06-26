<template>
  <div>
  <div class="switch-tab">
    <div :class="{ active: activeTab === 'A' }" @click="activeTab = 'A'">
      <span>接口信息</span>
    </div>
    <div :class="{ active: activeTab === 'B' }" @click="activeTab = 'B'">
      <span>Mock</span>
    </div>
  </div>
  <!-- <div v-if="activeTab === 'B' || hasShown.B" v-show="activeTab === 'B'" style="border-top: 1px solid var(--border-color-light);">
    <Mock></Mock>
  </div> -->
  <div
    v-if="activeTab === 'B'"
    style="border-top: 1px solid var(--border-color-light)"
  >
    <MockPage :interface_id="interface_id"></MockPage>
  </div>
  <!-- <div v-if="activeTab === 'A' || hasShown.A" v-show="activeTab === 'A'"></div> -->
  <div v-if="activeTab === 'A'">
    <InterfacePage :node_id="node_id" :interface_id="interface_id"></InterfacePage>
  </div>
</div>
</template>
<script lang="ts" setup>
import { ref, onMounted } from "vue";
import MockPage from "./mock_page.vue";
import InterfacePage from "./interface_page.vue";
const activeTab = ref<"A" | "B">("A");
const props = defineProps({
  node_id: {
    type: Number,
    default: null,
  },
  interface_id: {
    type: Number,
    default: null,
  }
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
