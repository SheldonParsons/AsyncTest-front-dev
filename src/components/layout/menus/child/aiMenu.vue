<template>
  <div
    class="card-main add-app g-unselect"
    @click="switchRouterAfterAddApp('ai_application_ground')"
  >
    创建 AI 应用
  </div>
  <section class="sidebar-group" style="margin-top: 20px" @click="switchRouter('application_conversation')">
    <a
      class="link"
      :class="{ active: 'ai_main' === activeLinkStyle }"
      @click="switchRouter('ai_main')"
    >
      <p class="link-text">
        <MainPage></MainPage>
        <span class="ai-icon g-unselect">主页</span>
      </p>
    </a>
  </section>
  <section class="sidebar-group" style="margin-top: 20px">
    <p class="sidebar-group__title">Project Space</p>
    <a
      class="link"
      :class="{ active: 'ai_application_ground' === activeLinkStyle }"
      @click="switchRouter('ai_application_ground')"
    >
      <p class="link-text">
        <AiAgent></AiAgent>
        <span class="ai-icon g-unselect" style="width: 100%">
          <el-row>
            <el-col :span="22">AI应用</el-col>
            <el-col
              @click="addApp"
              v-if="'ai_application_ground' === activeLinkStyle"
              :span="2"
              style="display: flex; align-items: center"
              ><AddProvider></AddProvider
            ></el-col>
          </el-row>
        </span>
      </p>
    </a>
    <a
      class="link"
      :class="{ active: 'ai_requirement_group' === activeLinkStyle }"
      @click="switchRouter('ai_requirement_group')"
    >
      <p class="link-text">
        <Requirement></Requirement>
        <span class="ai-icon g-unselect" style="width: 100%">
          <el-row>
            <el-col :span="22">需求管理</el-col>
            <el-col
              @click="addRequirement"
              v-if="'ai_requirement_group' === activeLinkStyle"
              :span="2"
              style="display: flex; align-items: center"
              ><AddProvider></AddProvider
            ></el-col>
          </el-row>
        </span>
      </p>
    </a>
    <a
      class="link"
      :class="{ active: 'ai_custom_plugin' === activeLinkStyle }"
      @click="switchRouter('ai_custom_plugin')"
    >
      <p class="link-text">
        <CustomPlugin></CustomPlugin>
        <span class="ai-icon g-unselect" style="width: 100%">
          <el-row>
            <el-col :span="22">自定义插件</el-col>
            <el-col
              @click="addProvider"
              v-if="'ai_custom_plugin' === activeLinkStyle"
              :span="2"
              style="display: flex; align-items: center"
              ><AddProvider></AddProvider
            ></el-col>
          </el-row>
        </span>
      </p>
    </a>
    <a
      class="link"
      :class="{ active: 'ai_work_flow' === activeLinkStyle }"
      @click="switchRouter('ai_work_flow')"
    >
      <p class="link-text">
        <WorkFlow></WorkFlow>
        <span class="ai-icon g-unselect">工作流</span>
      </p>
    </a>
    <a
      class="link"
      :class="{ active: activeLinkStyle.indexOf('ai_knowledge_') !== -1 }"
      @click="switchRouter('ai_knowledge_base')"
    >
      <p class="link-text">
        <Knowledge></Knowledge>
        <span class="ai-icon g-unselect" style="width: 100%">
          <el-row>
            <el-col :span="22">知识库</el-col>
            <el-col
              @click="addKnowledge"
              v-if="
                'ai_knowledge_base' === activeLinkStyle ||
                'ai_knowledge_document' === activeLinkStyle ||
                'ai_knowledge_document_segment' === activeLinkStyle
              "
              :span="2"
              style="display: flex; align-items: center"
              ><AddProvider></AddProvider
            ></el-col>
          </el-row>
        </span>
      </p>
    </a>
  </section>
  <section class="sidebar-group" style="margin-top: 20px">
    <p class="sidebar-group__title">Discover</p>
    <a
      class="link"
      :class="{ active: 'application' === activeLinkStyle }"
      @click="switchRouter"
    >
      <p class="link-text">
        <ApplicationGround></ApplicationGround>
        <span class="ai-icon g-unselect">应用广场</span>
      </p>
    </a>
    <a
      class="link"
      :class="{ active: 'plugins' === activeLinkStyle }"
      @click="switchRouter"
    >
      <p class="link-text">
        <PluginGround></PluginGround>
        <span class="ai-icon g-unselect">插件广场</span>
      </p>
    </a>
    <a
      class="link"
      :class="{ active: 'openapi' === activeLinkStyle }"
      @click="switchRouter"
    >
      <p class="link-text">
        <OpenApi></OpenApi>
        <span class="ai-icon g-unselect">开放API</span>
      </p>
    </a>
  </section>
</template>

<script setup lang="ts">
import { useI18n } from "vue-i18n";
import MainPage from "./icon/main_page.vue";
import ApplicationGround from "./icon/application_ground.vue";
import PluginGround from "./icon/plugin_ground.vue";
import OpenApi from "./icon/open_api.vue";
import PersenalSpace from "./icon/personal_space.vue";
import AiAgent from "./icon/ai_agent.vue";
import CustomPlugin from "./icon/custom_plugin.vue";
import Requirement from './icon/requirement.vue'
import WorkFlow from "./icon/work_flow.vue";
import Knowledge from "./icon/knowledge_base.vue";
import AddProvider from "./icon/add.vue";
import { state } from "@/state";
import { useRouter, useRoute } from "vue-router";
const route = useRoute();
const router: any = useRouter();
const { t } = useI18n();
const props = defineProps({
  activeLinkStyle: {
    type: String,
    default: "0",
  },
});

function addProvider() {
  state.setMessage("addprovider" + Math.random().toString());
}

function addRequirement() {
  state.setMessage("addrequirement" + Math.random().toString());
}

function addApp() {
  state.setMessage("addapp" + Math.random().toString());
}

function addKnowledge(event: any) {
  event.stopPropagation();
  if ("ai_knowledge_document" === props.activeLinkStyle) {
    state.setMessage("adddocument" + Math.random().toString());
  } else if ("ai_knowledge_base" === props.activeLinkStyle) {
    state.setMessage("addknowledge" + Math.random().toString());
  } else if ("ai_knowledge_document_segment" === props.activeLinkStyle) {
    state.setMessage("addsegment" + Math.random().toString());
  }
}

const emit = defineEmits(["switchRouterAction"]);

function switchRouter(data: string) {
  emit("switchRouterAction", data);
}

function switchRouterAfterAddApp(data: string) {
  const callback = () => {
    state.setMessage("addapp" + Math.random().toString());
  };
  emit("switchRouterAction", data, callback);
}
</script>

<style lang="scss" scoped>
a {
  cursor: pointer;
}
.ai-icon {
  margin-left: 5px;
}

.card-main:hover {
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(0 0 0 / var(--tw-ring-opacity));
}

.add-app {
  font-size: 14px;
  height: 30px;
  border-radius: 50px;
  background-color: black;
  cursor: pointer;
}
.card-main {
  --tw-ring-inset: ;
  --tw-ring-color: rgb(0 0 0 / var(--tw-ring-opacity));
  --tw-ring-offset-width: 3px;
  --tw-ring-offset-color: #fff;
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  --tw-shadow: 0 0 #0000;
  background-color: white;
  color: black;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  border: 2px solid #e5e7eb;
  margin: 5px;
  --tw-ring-offset-shadow: 0 0 0 var(--tw-ring-offset-width)
    var(--tw-ring-offset-color);
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  box-shadow: var(--tw-ring-offset-shadow), var(--tw-ring-shadow),
    var(--tw-shadow, 0 0 #0000);
  transition-property: all;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
  transition-duration: 0.15s;
}

.sidebar-group {
  .sidebar-group__title {
    font-size: 1rem;
    font-weight: 700;
    margin-bottom: 8px;
    line-height: 24px;
    color: rgb(48, 49, 51);
  }

  .sidebar-group__title:first-child {
    margin-top: 0;
  }

  .link {
    display: block;
    padding: 10px 16px 10px 26px;
    line-height: 1.5;
    font-size: 0.9rem;
    border-radius: 8px;
    font-weight: 500;
    text-decoration: inherit;
    touch-action: manipulation;
  }

  .link.active .link-text {
    font-weight: 600;
    color: var(--dark);
    transition: color 0.25s;
  }

  .link.active {
    background-color: var(--greyLight-0);
  }

  .link-text {
    display: flex;
    align-items: center;
    margin: 0;
    line-height: 20px;
    font-size: 13px;
    font-weight: 500;
    color: #606266;
    transition: color 0.5s;
  }

  .link:hover,
  .link:focus {
    .link-text {
      color: var(--dark);
    }
  }
}
</style>
