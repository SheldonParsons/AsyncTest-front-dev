<template>
  <SplitterGroup direction="vertical">
    <SplitterPanel :default-size="6" :min-size="6" :max-size="6">
      <div class="switch-tab">
        <div :class="{ active: activeTab === 'A' }" @click="activeTab = 'A'">
          <span>接口信息</span>
        </div>
        <div :class="{ active: activeTab === 'B' }" @click="activeTab = 'B'">
          <span>Mock</span>
        </div>
      </div>
    </SplitterPanel>
    <SplitterResizeHandle disabled />
    <SplitterPanel :default-size="94" :min-size="94" :max-size="94">
      <MockPage v-if="activeTab === 'B'" style="border-top: 1px solid var(--border-color-light)"
        :interface_id="interface_id"></MockPage>
      <InterfacePage v-if="activeTab === 'A'" :node_id="node_id" :interface_id="interface_id"></InterfacePage>
    </SplitterPanel>
  </SplitterGroup>
</template>
<script lang="ts" setup>
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import { ref } from "vue";
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
  padding-left: 20px;
  margin-left: 0px !important;
  z-index: 999;
  background-color: white;
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
