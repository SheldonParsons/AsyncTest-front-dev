<template>
  <el-col
    :span="12"
    style="border-right: 1px solid #e0e0e0; background-color: #f9fafb"
  >
    <el-row style="margin-top: 20px; margin-bottom: 10px">
      <el-col style="display: flex;align-items: center;" :span="18" :offset="1">
        <span style="font-size: 14px; font-weight: 600">人设与回复逻辑</span>
      </el-col>
      <el-col
        :span="5"
        style="display: flex; justify-content: center; align-items: center"
      >
        <div
                class="card-main add-app g-unselect"
                @click="optimize_prompt_action"
              ><el-icon><Refresh /></el-icon>优化</div>
      </el-col>
    </el-row>
    <el-row
      class="no-scoll"
      style="padding:5px;overflow: scroll; max-height: calc(100vh - 300px); height: 100%;cursor: pointer;margin: 10px;border-radius: 10px;"
      :style="{border: edit_type === 0 ? '1px solid #e0e0e0' : '0px'}"
      @dblclick="edit_type = 1"
    >
      <el-col :span="24">
        <p
          v-if="md !== null && edit_type == 0"
          v-html="md.parse(textarea_content)"
        ></p>
        <el-input
        style="border-radius: 10px;"
          v-if="edit_type == 1"
          @blur="updateContent"
          v-model="textarea_content"
          :rows="25"
          type="textarea"
          placeholder="请输入人设与回复逻辑"
        />
      </el-col>
    </el-row>
  </el-col>
</template>

<script setup lang="ts">
import {
  ref,
  watch,
  onBeforeUnmount,
  getCurrentInstance,
  onMounted,
} from "vue";
import { editAppConfig } from "@/api/ai/application";
import { Marked } from "marked";
import { streamApi } from "@/api/sse/index";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-light.css";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();
const md: any = ref(null);
const textarea_content = ref("");
const edit_type = ref(0);
const props: any = defineProps({
  config_id: {
    type: Number,
    default: 0,
  },
  prompt: {
    type: String,
    default: "",
  },
});
onMounted(() => {
  md.value = new Marked(
    markedHighlight({
      emptyLangClass: "hljs",
      langPrefix: "hljs language-",
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        return hljs.highlight(code, { language }).value;
      },
    })
  );
});

function optimize_prompt_action() {
  if (textarea_content.value.length === 0) {
    tools.message("请先编写提示词", proxy);
    return
  }
  const data = {
    prompt: textarea_content.value,
    config: props.config_id,
  };
  textarea_content.value = "";
  tools.message("正在生成优化提示词，请稍后", proxy);
  streamApi(
    "/llm/app/conversation/optimize/prompt/",
    data,
    (event_response) => {
      const event = event_response?.event;
      const data = event_response?.data;
      if (event === "optimize_prompt") {
        console.log(data.optimize_prompt);
        textarea_content.value += data.optimize_prompt;
        console.log(textarea_content.value);
      }
    }
  );
}

watch(
  () => props.prompt,
  (newVal) => {
    textarea_content.value = newVal;
  }
);

function updateContent() {
  edit_type.value = 0;
  if (textarea_content.value.length === 0) {
    return
  }
  const data = {
    preset_prompt: textarea_content.value,
  };
  editAppConfig(props.config_id, data);
}
</script>

<style lang="scss" scoped>
.card-main:hover {
  --tw-ring-opacity: 1;
  --tw-ring-color: black;
}

.card-main {
  --tw-ring-opacity: 1;
  --tw-ring-color: var(--greyLight-4);
  width: 80px;
  --tw-ring-inset: ;
  --tw-ring-color: var(--greyLight-4);
  --tw-ring-offset-width: 3px;
  --tw-ring-offset-color: #fff;
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  --tw-shadow: 0 0 #0000;
  background-color: black;
  color: white;
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
.add-app {
  font-size: 14px;
  height: 30px;
  border-radius: 10px;
  background-color: black;
  cursor: pointer;
}
</style>
