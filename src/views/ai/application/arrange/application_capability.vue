<template>
  <el-col
    :span="12"
    style="border-right: 1px solid #e0e0e0; background-color: #f9fafb"
  >
    <el-row>
      <el-col
        :span="23"
        :offset="1"
        style="margin-top: 20px; margin-bottom: 10px"
      >
        <span style="font-size: 14px; font-weight: 600">应用能力</span>
        <el-tooltip
          class="box-item"
          effect="dark"
          content="内容存在变动，请及时保存（Ctrl+S）！"
          placement="top"
          ><el-icon
            v-if="Object.keys(changeDict).length !== 0"
            color="#FFC1C1"
            class="header-icon"
          >
            <info-filled /> </el-icon
        ></el-tooltip>
      </el-col>
    </el-row>
    <div class="content-application">
      <el-row>
        <el-col :span="22" :offset="1">
          <el-collapse v-model="knowledgeActiveNames">
            <el-collapse-item name="1">
              <template #title>
                知识库<el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <div
                class="plugin-card card-main"
                v-for="(item, index) in exits_dataset_list"
                :key="index"
              >
                <el-row style="width: 100%">
                  <el-col
                    style="
                      display: flex;
                      justify-content: center;
                      align-items: center;
                    "
                    :span="4"
                  >
                    <el-avatar :size="50" :src="item.icon" />
                  </el-col>
                  <el-col :span="18">
                    <el-row>
                      <el-col
                        ><span style="font-size: 14px; font-weight: 600">{{
                          item.name
                        }}</span></el-col
                      >
                    </el-row>
                    <el-row>
                      <el-col style="overflow: hidden;text-overflow: ellipsis;"
                        ><span style="font-size: 12px; font-weight: 500;white-space: nowrap;">{{
                          item.description
                        }}</span></el-col
                      >
                    </el-row>
                  </el-col>
                </el-row>
              </div>
              <div style="margin-bottom: 10px">
                <span style="font-size: 12px"
                  >引用文本类型的数据，实现知识问答，应用最多支持关联 5 个知识库
                  。
                </span>
              </div>
              <div
                class="add-card card-main"
                @click="openKnowledgeDrawerAction"
              >
                <span class="g-flex" style="font-size: 13px; font-weight: 600"
                  ><el-icon :size="16"><Link /></el-icon
                  ><span style="margin-left: 5px">选择引用知识库</span></span
                >
              </div>
              <div class="add-card card-main" @click="retrievalVisible = true">
                <span class="g-flex" style="font-size: 13px; font-weight: 600"
                  ><LanguageIcon class="g-flex" :size="14"></LanguageIcon
                  ><span style="margin-left: 5px">知识库检索设置</span></span
                >
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1">
          <el-collapse v-model="pluginActiveNames">
            <el-collapse-item name="1">
              <template #title>
                扩展插件<el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <div class="add-card card-main">
                <el-icon><Plus /></el-icon>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1">
          <el-collapse v-model="flowActiveNames">
            <el-collapse-item name="1">
              <template #title>
                工作流组件<el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <div style="margin-bottom: 10px">
                <span style="font-size: 12px"
                  >工作流支持通过可视化的方式，对插件、大语言模型、代码块等功能进行组合，从而实现复杂、稳定的业务流程编排，例如旅行规划、报告分析等。
                </span>
              </div>
              <div class="add-card card-main">
                <el-icon><Plus /></el-icon>
              </div>
            </el-collapse-item>
          </el-collapse>
        </el-col>
      </el-row>
      <el-row style="margin-top: 20px">
        <el-col :span="22" :offset="1">
          <el-row>
            <el-col :span="21"
              ><span style="font-size: 14px; font-weight: 500"
                >长期记忆</span
              ></el-col
            >
            <el-col :span="3"
              ><el-switch
                @change="changeFlag('long_term_memory', longTermMemory)"
                v-model="longTermMemory"
            /></el-col>
          </el-row>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1"
          ><span style="font-size: 12px"
            >总结聊天对话的内容，并用于更好的响应用户的消息。
          </span></el-col
        >
      </el-row>

      <el-row style="margin-top: 20px">
        <el-col :span="22" :offset="1">
          <el-row>
            <el-col :span="21"
              ><span style="font-size: 14px; font-weight: 500"
                >短期记忆</span
              ></el-col
            >
            <el-col :span="3"
              ><el-switch
                @change="changeFlag('short_term_memory', shortTermMemory)"
                v-model="shortTermMemory"
            /></el-col>
          </el-row>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1"
          ><span style="font-size: 12px"
            >将历史的对话带入到新的对话中，以实现上下文的持续沟通。
          </span></el-col
        >
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1">
          <el-collapse v-model="openTalkActiveNames">
            <el-collapse-item name="1">
              <template #title>
                对话开场白<el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </template>
              <div style="margin-bottom: 10px">
                <span>开场白文案</span
                ><el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </div>
              <el-input
                v-model="openTalkContent"
                @input="
                  changeContent(
                    'opening_statement',
                    openTalkContent,
                    'openContent'
                  )
                "
                :autosize="{ minRows: 4, maxRows: 6 }"
                type="textarea"
                placeholder="Please input"
              />
              <div style="margin-bottom: 10px">
                <span>开场白预设问题</span
                ><el-icon class="header-icon">
                  <info-filled />
                </el-icon>
              </div>
              <el-input
                v-model="openTalkPreQuestionContent"
                @input="
                  changeContent(
                    'opening_statement_question',
                    openTalkPreQuestionContent,
                    'openPreContent'
                  )
                "
                placeholder="Please input"
                clearable
              />
            </el-collapse-item>
          </el-collapse>
        </el-col>
      </el-row>
      <el-row style="margin-top: 20px">
        <el-col :span="22" :offset="1">
          <el-row>
            <el-col :span="21"
              ><span style="font-size: 14px; font-weight: 500"
                >用户问题建议</span
              ></el-col
            >
            <el-col :span="3"
              ><el-switch
                v-model="suggest_flag"
                @change="changeFlag('suggestion', suggest_flag)"
            /></el-col>
          </el-row>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1"
          ><span style="font-size: 12px"
            >在应用回复后，自动根据对话内容提供 3 条用户提问建议。
          </span></el-col
        >
      </el-row>
      <el-row style="margin-top: 20px">
        <el-col :span="22" :offset="1">
          <el-row>
            <el-col :span="21"
              ><span style="font-size: 14px; font-weight: 500"
                >语音输入</span
              ></el-col
            >
            <el-col :span="3"
              ><el-switch
                @change="changeFlag('speech_to_text', voiceInput)"
                v-model="voiceInput"
            /></el-col>
          </el-row>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1"
          ><span style="font-size: 12px"
            >启用后，您可以使用语音输入。
          </span></el-col
        >
      </el-row>
      <el-row style="margin-top: 20px">
        <el-col :span="22" :offset="1">
          <el-row>
            <el-col :span="21"
              ><span style="font-size: 14px; font-weight: 500"
                >语音输出</span
              ></el-col
            >
            <el-col :span="3"
              ><el-switch
                @change="changeFlag('text_to_speech', voiceOutput)"
                v-model="voiceOutput"
            /></el-col>
          </el-row>
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1"
          ><span style="font-size: 12px"
            >启用后，Bot以语音的方式进行回复。
          </span></el-col
        >
      </el-row>
      <div class="add-card card-main" @click="emit('openVoiceSettings')">
        <span class="g-flex" style="font-size: 13px; font-weight: 600"
          ><el-icon :size="16"><Setting /></el-icon
          ><span style="margin-left: 5px">设置</span></span
        >
      </div>
      <el-row style="margin-top: 20px">
        <el-col :span="22" :offset="1">
          <el-row>
            <el-col :span="21"
              ><span style="font-size: 14px; font-weight: 500"
                >内容审查</span
              ></el-col
            >
            <el-col :span="3"
              ><el-switch
                @change="changeFlag('review', review_flag)"
                v-model="review_flag"
            /></el-col>
          </el-row>
        </el-col>
      </el-row>
      <div class="add-card card-main" @click="emit('openReviewSettings')">
        <span class="g-flex" style="font-size: 13px; font-weight: 600"
          ><el-icon :size="16"><Setting /></el-icon
          ><span style="margin-left: 5px">设置</span></span
        >
      </div>
    </div>
  </el-col>

  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="retrievalVisible"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>检索设置</span>
      </div>
    </template>
    <div style="padding: 20px">
      <el-row
        style="display: flex; justify-content: start; align-items: center"
      >
        <el-col :span="5"><span>检索策略</span></el-col>
        <el-col :span="19"
          ><el-radio-group v-model="checking_strategy">
            <el-radio value="hybrid">混合检索</el-radio>
            <el-radio value="semantic">向量检索</el-radio>
            <el-radio value="full_text">全文检索</el-radio>
          </el-radio-group></el-col
        >
      </el-row>
      <el-row class="g-flex" style="margin-top: 20px">
        <el-col :span="5"><span>最大召回数量</span></el-col>
        <el-col :span="19"
          ><el-slider
            v-model="max_callback_count"
            show-input
            :step="1"
            :min="1"
            :max="10"
        /></el-col>
      </el-row>
      <el-row class="g-flex" style="margin-top: 20px">
        <el-col :span="5">最小匹配度</el-col>
        <el-col :span="19"
          ><el-slider
            v-model="min_score"
            show-input
            :step="0.01"
            :min="0"
            :max="1"
        /></el-col>
      </el-row>
    </div>
    <template #footer>
      <el-divider style="margin: 0px"></el-divider>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="retrievalVisible = false">取消</el-button>
        <el-button type="primary" @click="changeRerieval"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
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
import tools from "@/utils/tools";
import LanguageIcon from "@/assets/svg/languageIcon.vue";
const { proxy }: any = getCurrentInstance();
const pluginActiveNames = ref(["1"]);
const flowActiveNames = ref(["1"]);
const knowledgeActiveNames = ref(["1"]);
const openTalkActiveNames = ref(["1"]);
const longTermMemory = ref(true);
const shortTermMemory = ref(false)
const retrievalVisible = ref(false);
const openTalkContent = ref("");
const openTalkPreQuestionContent = ref("");
const voiceInput = ref(true);
const voiceOutput = ref(true);
const suggest_flag = ref(true);
const exits_dataset_list: any = ref([]);
const review_flag = ref(true);
const changing = ref(false);
const changeDict: any = ref({});
const voiceTimbre = ref("echo");
const autoPlay = ref(true);
const checking_strategy = ref("semantic");
const max_callback_count = ref(10);
const min_score = ref(0.5);
const emit = defineEmits([
  "openKnowledgeDrawer",
  "reloadConfig",
  "openVoiceSettings",
  "openReviewSettings",
]);
function openKnowledgeDrawerAction() {
  emit("openKnowledgeDrawer");
}
onMounted(() => {
  // 添加全局事件监听
  window.addEventListener("keydown", addAltS);
});
const props: any = defineProps({
  config_id: {
    type: Number,
    default: 0,
  },
  datasets: {
    type: Object,
    default: () => [],
  },
  knowledge_list: {
    type: Object,
    default: () => [],
  },
  suggestFlag: {
    type: Boolean,
    default: true,
  },
  longTermMemory: {
    type: Boolean,
    default: true,
  },
  shortTermMemory: {
    type: Boolean,
    default: true,
  },
  speechToText: {
    type: Boolean,
    default: true,
  },
  textToSpeech: {
    type: Boolean,
    default: true,
  },
  review: {
    type: Boolean,
    default: true,
  },
  openContent: {
    type: String,
    default: "",
  },
  openPreContent: {
    type: String,
    default: "",
  },
  speechSetting: {
    type: Object,
    default: () => {},
  },
  retrievalSetting: {
    type: Object,
    default: () => {},
  },
});
watch(
  () => props.datasets,
  (val) => {
    setTimeout(() => {
      exits_dataset_list.value = [];
      for (let i = 0; i < props.knowledge_list.length; i++) {
        if (val.includes(props.knowledge_list[i].id)) {
          exits_dataset_list.value.push(props.knowledge_list[i]);
        }
      }
      console.log(exits_dataset_list.value);
    }, 100);
  }
);

watch(
  () => [
    props.suggestFlag,
    props.longTermMemory,
    props.shortTermMemory,
    props.speechToText,
    props.textToSpeech,
    props.review,
    props.openContent,
    props.openPreContent,
    props.speechSetting,
    props.retrievalSetting,
  ],
  (
    [
      newSuggestFlag,
      newLongTermMemory,
      newShortTermMemory,
      newSpeechToText,
      newTextToSpeech,
      newReview,
      newOpenContent,
      newOpenPreContent,
      newSpeechSetting,
      newRetrievalSetting,
    ],
    [
      oldSuggestFlag,
      oldLongTermMemory,
      olgShortTermMemory,
      oldSpeechToText,
      oldTextToSpeech,
      oldReview,
      oldOpenContent,
      oldOpenPreContent,
      oldSpeechSetting,
      oldRetrievalSetting,
    ]
  ) => {
    console.log(newOpenContent);
    console.log(newOpenPreContent);
    console.log(newSpeechSetting);
    console.log(newRetrievalSetting);
    console.log(JSON.parse(newRetrievalSetting).retrieval_strategy);

    suggest_flag.value = Boolean(newSuggestFlag);
    longTermMemory.value = Boolean(newLongTermMemory);
    shortTermMemory.value = Boolean(newShortTermMemory);
    voiceInput.value = Boolean(newSpeechToText);
    voiceOutput.value = Boolean(newTextToSpeech);
    review_flag.value = Boolean(newReview);
    openTalkContent.value = String(newOpenContent);
    openTalkPreQuestionContent.value = String(newOpenPreContent);
    voiceTimbre.value = newSpeechSetting.timbre;
    autoPlay.value = newSpeechSetting.auto;
    checking_strategy.value =
      JSON.parse(newRetrievalSetting).retrieval_strategy;
    max_callback_count.value = JSON.parse(newRetrievalSetting).k;
    min_score.value = JSON.parse(newRetrievalSetting).score;

    // 在此处添加其他逻辑
  },
  { deep: true }
);
function changeRerieval() {
  const data = {
    retrieval_config: JSON.stringify({
      retrieval_strategy: checking_strategy.value,
      k: max_callback_count.value,
      score: min_score.value,
    }),
  };
  editAppConfig(props.config_id, data).then((res) => {
    retrievalVisible.value = false;
    emit("reloadConfig");
  });
}
function changeContent(target: any, value: any, change_target: any) {
  if (props[change_target] !== value) {
    changeDict.value[target] = value;
  } else {
    delete changeDict.value[target];
  }
}
function changeFlag(target: string, value: any) {
  if (changing.value) return;
  changing.value = true;
  const data = {
    [target]: value,
  };
  editAppConfig(props.config_id, data).then((res) => {
    console.log(res);
    changing.value = false;
    emit("reloadConfig");
  });
}

onBeforeUnmount(() => {
  window.removeEventListener("keydown", addAltS);
});

function addAltS(event: any) {
  if (
    (event.metaKey || event.ctrlKey) &&
    (event.key === "s" || event.code === "KeyS")
  ) {
    event.preventDefault(); // 阻止浏览器默认行为
    save();
    // 在这里执行你想要的逻辑
  }
}

function save() {
  editAppConfig(props.config_id, changeDict.value);
  changeDict.value = {};
  emit("reloadConfig");
  tools.message("已保存", proxy);
}
</script>

<style lang="scss" scoped>
.my-header {
  padding: 20px;
  padding-bottom: 0px;
  span {
    font-size: 16px;
    font-weight: 600;
  }
}
.add-card {
  height: 26px;
  background-color: #e5e7eb;
  border-radius: 10px;
  display: flex;
  justify-content: center;
  align-items: center;
  cursor: pointer;
  font-size: 16px;
  border: 2px solid #e5e7eb;
}
.content-application {
  height: calc(100vh - 265px);
  // height: calc(100% - 70px);
  overflow-y: scroll;
}
.content-application::-webkit-scrollbar {
  display: none; /* 隐藏滚动条 */
}
.card-main:hover {
  --tw-ring-opacity: 1;
  --tw-ring-color: rgb(0 0 0 / var(--tw-ring-opacity));
}
.plugin-card {
  height: 50px;
  padding: 5px;
  cursor: default;
}
.card-main {
  --tw-ring-inset: ;
  --tw-ring-color: rgb(0 0 0 / var(--tw-ring-opacity));
  --tw-ring-offset-width: 5px;
  --tw-ring-offset-color: #fff;
  --tw-ring-shadow: var(--tw-ring-inset) 0 0 0
    calc(1px + var(--tw-ring-offset-width)) var(--tw-ring-color);
  --tw-shadow: 0 0 #0000;

  background-color: white;
  color: black;
  border-radius: 9999px;
  display: flex;
  justify-content: center;
  align-items: center;
  margin-bottom: 10px;
  border: 2px solid #e5e7eb;
  margin: 10px;
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

.max-text {
  white-space: nowrap;
  display: inline-block;
  overflow: hidden;
  text-overflow: ellipsis;
}
.cursor-core {
  cursor: pointer;
}
.flex-core {
  display: flex;
  justify-content: center;
  align-items: center;
}
</style>
