<template>
    <SplitterGroup direction="vertical">
        <SplitterPanel :default-size="6" :min-size="6" :max-size="6">
            <div class="switch-tab">
                <div :class="{ active: activeTab === 'A' }" @click="activeTab = 'A'">
                    <span>别名管理</span>
                </div>
                <div :class="{ active: activeTab === 'B' }" @click="activeTab = 'B'">
                    <span>提交记录</span>
                </div>
            </div>
        </SplitterPanel>
        <SplitterResizeHandle disabled />
        <SplitterPanel :default-size="94" :min-size="94" :max-size="94">
            <AliasSetting v-if="activeTab === 'A'"></AliasSetting>
            <CommitRecord v-if="activeTab === 'B'"></CommitRecord>
        </SplitterPanel>
    </SplitterGroup>
</template>
<script lang="ts" setup>
import { SplitterGroup, SplitterPanel, SplitterResizeHandle } from 'reka-ui'
import AliasSetting from '@/views/api/child_context/outer_interface_root_dir/alias_setting.vue'
import CommitRecord from '@/views/api/child_context/outer_interface_root_dir/commit_record.vue'
import { ref } from "vue";
import { useRoute } from 'vue-router'

const router = useRoute()
const activeTab = ref<"A" | "B">("A");
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
