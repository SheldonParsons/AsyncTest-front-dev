<template>
  <el-row class="top-menu">
    <el-col :span="24">
      <div class="title-main">
        <el-page-header class="back-icon" @back="onBack" title="我的应用">
          <template #content style="width: 80%">
            <el-row justify="start">
              <el-col :span="10" style="display: flex; justify-content: start">
                <div class="title-div">
                  <el-avatar :size="32" :src="app.icon" />
                  <span
                    style="font-size: 16px; font-weight: 500; margin-left: 10px"
                  >
                    {{ app.name }}
                  </span>
                </div>
              </el-col>
              <el-col
                :span="14"
                style="
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <span class="main-menu choice">编排</span>
                <span class="main-menu">发布配置</span>
                <span class="main-menu">统计分析</span>
              </el-col>
            </el-row>
          </template>
          <template #extra>
            <div class="flex items-center">
              <el-button-group class="ml-4">
                <el-button
                  type="primary"
                  @click="publishedHistoryVisible = true"
                  style="font-size: 16px"
                  :icon="Timer"
                />
                <el-button type="primary" @click="publishedAction"
                  >更新发布</el-button
                >
                <el-button type="primary" @click="cancelPublishedAction"
                  >取消</el-button
                >
              </el-button-group>
            </div>
          </template>
        </el-page-header>
      </div>
    </el-col>
  </el-row>
  <el-row class="title-main">
    <el-col :span="16">
      <el-row
        style="border-bottom: 1px solid #e0e0e0; background-color: #f9fafb"
      >
        <el-col
          :span="24"
          style="
            height: 70px;
            display: flex;
            justify-content: start;
            align-items: center;
          "
        >
          <span style="font-size: 16px; font-weight: 500; margin-left: 20px"
            >应用编排</span
          >
          <el-popover
            :visible="showModel"
            placement="right-end"
            @hide="saveModelSetting"
          >
            <template #reference>
              <span
                @click="showModel = !showModel"
                class="el-dropdown-link"
                style="
                  display: flex;
                  justify-content: center;
                  align-items: center;
                "
              >
                <el-avatar
                  style="margin-left: 10px; cursor: pointer"
                  :size="32"
                  :src="OpenAi"
                />
                <span
                  style="margin-left: 10px; cursor: pointer; font-size: 14px"
                  >ChatGPT-4o-mini</span
                >
                <el-icon style="cursor: pointer" class="el-icon--right">
                  <arrow-down />
                </el-icon>
              </span>
            </template>
            <div class="model-setting">
              <el-row style="width: 100%">
                <el-col :span="23" :offset="1">
                  <span style="font-size: 16px; font-weight: 800"
                    >模型设置</span
                  >
                </el-col>
              </el-row>
              <el-row style="margin-top: 20px">
                <el-col :span="24">
                  <el-select
                    class="model-select"
                    v-model="choiceModel"
                    @change="changeModel"
                    placeholder=""
                  >
                    <el-option
                      v-for="item in modelList"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                      :disabled="item.label.disabled"
                    >
                      <div
                        style="
                          display: flex;
                          justify-content: start;
                          align-items: center;
                        "
                      >
                        <el-avatar
                          shape="square"
                          style="margin-left: 10px; cursor: pointer"
                          :size="32"
                          :src="OpenAi"
                        />
                        <span style="font-size: 16px; margin-left: 10px"
                          >OpenAi·</span
                        ><span style="font-size: 14px; font-weight: 500">{{
                          item.label.name
                        }}</span
                        ><el-tag style="margin-left: 10px" type="info">{{
                          item.label.range
                        }}</el-tag>
                      </div>
                    </el-option>
                    <template #label="{ label, value }">
                      <div
                        style="
                          display: flex;
                          justify-content: start;
                          align-items: center;
                        "
                      >
                        <el-avatar
                          shape="square"
                          style="margin-left: 10px; cursor: pointer"
                          :size="32"
                          :src="OpenAi"
                        />
                        <span style="font-weight: bold; margin-left: 10px">{{
                          label.name
                        }}</span>
                        <el-tag style="margin-left: 10px" type="info">{{
                          label.range
                        }}</el-tag>
                      </div>
                    </template>
                  </el-select>
                </el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="19">
                  <span style="font-size: 16px; font-weight: 500">参数</span>
                </el-col>
                <el-col :span="5"
                  ><el-select v-model="preSetting" placeholder="加载预设">
                    <el-option
                      v-for="item in options"
                      :key="item.value"
                      :label="item.label"
                      :value="item.value"
                    /> </el-select
                ></el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="6">
                  <span style="font-size: 14px; color: #6b7280">温度</span
                  ><el-icon class="header-icon">
                    <info-filled />
                  </el-icon>
                </el-col>
                <el-col :span="18">
                  <el-slider
                    :min="0"
                    :max="2"
                    :step="1"
                    v-model="model_config.temperature"
                    show-input
                  />
                </el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="6">
                  <span style="font-size: 14px; color: #6b7280">Top P</span
                  ><el-icon class="header-icon">
                    <info-filled />
                  </el-icon>
                </el-col>
                <el-col :span="18">
                  <el-slider
                    :min="0"
                    :max="1"
                    :step="0.01"
                    v-model="model_config.top_p"
                    show-input
                  />
                </el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="6">
                  <span style="font-size: 14px; color: #6b7280">存在惩罚</span
                  ><el-icon class="header-icon">
                    <info-filled />
                  </el-icon>
                </el-col>
                <el-col :span="18">
                  <el-slider
                    :min="0"
                    :max="1"
                    :step="0.1"
                    v-model="model_config.presence_penalty"
                    show-input
                  />
                </el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="6">
                  <span style="font-size: 14px; color: #6b7280">频率惩罚</span
                  ><el-icon class="header-icon">
                    <info-filled />
                  </el-icon>
                </el-col>
                <el-col :span="18">
                  <el-slider
                    :min="0"
                    :max="1"
                    :step="0.1"
                    v-model="model_config.frequency_penalty"
                    show-input
                  />
                </el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="19">
                  <span style="font-size: 16px; font-weight: 500"
                    >输入及输出设置</span
                  >
                </el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="6">
                  <span style="font-size: 14px; color: #6b7280">上下文轮数</span
                  ><el-icon class="header-icon">
                    <info-filled />
                  </el-icon>
                </el-col>
                <el-col :span="18">
                  <el-slider
                    :min="0"
                    :max="100"
                    :step="1"
                    v-model="model_config.dialog_round"
                    show-input
                  />
                </el-col>
              </el-row>
              <el-row
                style="
                  margin-top: 20px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                "
              >
                <el-col :span="6">
                  <span style="font-size: 14px; color: #6b7280"
                    >最大回复长度</span
                  ><el-icon class="header-icon">
                    <info-filled />
                  </el-icon>
                </el-col>
                <el-col :span="18">
                  <el-slider
                    :min="0"
                    :max="modelList[choiceModel].label.rangInt * 1024"
                    :step="1"
                    v-model="model_config.max_response_length"
                    show-input
                  />
                </el-col>
              </el-row>
            </div>
          </el-popover>
        </el-col>
      </el-row>
      <el-row style="height: 100%">
        <PersonaAndResonseLogic
          :config_id="draft_config.id"
          :prompt="draft_config.preset_prompt"
        ></PersonaAndResonseLogic>
        <ApplicationCapability
          @openKnowledgeDrawer="openKnowledgeList"
          @reloadConfig="reloadConfigAction"
          @openVoiceSettings="voiceDialog = true"
          @openReviewSettings="reviewDialog = true"
          :datasets="origin_datasets"
          :knowledge_list="knowledge_list"
          :suggestFlag="draft_config.suggestion"
          :longTermMemory="draft_config.long_term_memory"
          :shortTermMemory="draft_config.short_term_memory"
          :speechToText="draft_config.speech_to_text"
          :textToSpeech="draft_config.text_to_speech"
          :review="draft_config.review"
          :config_id="draft_config.id"
          :openContent="draft_config.opening_statement"
          :openPreContent="draft_config.opening_statement_question"
          :speechSetting="draft_config.speech_setting"
          :retrievalSetting="draft_config.retrieval_config"
        ></ApplicationCapability>
      </el-row>
    </el-col>
    <el-col :span="8" class="talking">
      <el-row style="border-bottom: 1px solid #e0e0e0">
        <el-col
          :span="18"
          style="
            height: 70px;
            display: flex;
            justify-content: start;
            align-items: center;
          "
        >
          <span style="font-size: 16px; font-weight: 500; margin-left: 20px"
            >预览与调试</span
          >
        </el-col>
        <el-col :span="6" class="g-flex"
          ><span
            @click="showLongTermMemory"
            class="g-flex"
            style="
              cursor: pointer;
              font-size: 14px;
              font-weight: 600;
              color: var(--primary);
            "
            ><el-icon><ChatLineRound /></el-icon>长期记忆</span
          ></el-col
        >
      </el-row>
      <el-row class="flex-core top-content" v-show="talkingList.length === 0">
        <el-col class="logo-content">
          <div
            style="
              display: flex;
              justify-content: center;
              align-items: center;
              flex-direction: column;
            "
          >
            <el-avatar
              :size="60"
              :src="logo"
              style="background-color: transparent"
            />
            <div class="project-name" style="font-size: 26px">
              Debugging Robot
            </div>
          </div>
        </el-col>
      </el-row>
      <div
        v-show="talkingList.length !== 0"
        ref="contentDiv"
        class="content-div top-content"
      >
        <el-row
          v-for="(item, index) in talkingList"
          :key="index"
          class="content-row"
        >
          <el-col v-if="item.type === 'user'" :span="24" class="user-content">
            <div>
              <span>{{ item.content }}</span>
            </div>
          </el-col>
          <el-col class="ai-content" :span="24" v-if="item.type === 'ai'">
            <div
              style="display: flex; justify-content: start; align-items: start"
            >
              <div class="gpt-logo">
                <svg
                  width="25"
                  height="25"
                  viewBox="0 0 41 41"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                  class="icon-md"
                  role="img"
                >
                  <text x="-9999" y="-9999">ChatGPT</text>
                  <path
                    d="M37.5324 16.8707C37.9808 15.5241 38.1363 14.0974 37.9886 12.6859C37.8409 11.2744 37.3934 9.91076 36.676 8.68622C35.6126 6.83404 33.9882 5.3676 32.0373 4.4985C30.0864 3.62941 27.9098 3.40259 25.8215 3.85078C24.8796 2.7893 23.7219 1.94125 22.4257 1.36341C21.1295 0.785575 19.7249 0.491269 18.3058 0.500197C16.1708 0.495044 14.0893 1.16803 12.3614 2.42214C10.6335 3.67624 9.34853 5.44666 8.6917 7.47815C7.30085 7.76286 5.98686 8.3414 4.8377 9.17505C3.68854 10.0087 2.73073 11.0782 2.02839 12.312C0.956464 14.1591 0.498905 16.2988 0.721698 18.4228C0.944492 20.5467 1.83612 22.5449 3.268 24.1293C2.81966 25.4759 2.66413 26.9026 2.81182 28.3141C2.95951 29.7256 3.40701 31.0892 4.12437 32.3138C5.18791 34.1659 6.8123 35.6322 8.76321 36.5013C10.7141 37.3704 12.8907 37.5973 14.9789 37.1492C15.9208 38.2107 17.0786 39.0587 18.3747 39.6366C19.6709 40.2144 21.0755 40.5087 22.4946 40.4998C24.6307 40.5054 26.7133 39.8321 28.4418 38.5772C30.1704 37.3223 31.4556 35.5506 32.1119 33.5179C33.5027 33.2332 34.8167 32.6547 35.9659 31.821C37.115 30.9874 38.0728 29.9178 38.7752 28.684C39.8458 26.8371 40.3023 24.6979 40.0789 22.5748C39.8556 20.4517 38.9639 18.4544 37.5324 16.8707ZM22.4978 37.8849C20.7443 37.8874 19.0459 37.2733 17.6994 36.1501C17.7601 36.117 17.8666 36.0586 17.936 36.0161L25.9004 31.4156C26.1003 31.3019 26.2663 31.137 26.3813 30.9378C26.4964 30.7386 26.5563 30.5124 26.5549 30.2825V19.0542L29.9213 20.998C29.9389 21.0068 29.9541 21.0198 29.9656 21.0359C29.977 21.052 29.9842 21.0707 29.9867 21.0902V30.3889C29.9842 32.375 29.1946 34.2791 27.7909 35.6841C26.3872 37.0892 24.4838 37.8806 22.4978 37.8849ZM6.39227 31.0064C5.51397 29.4888 5.19742 27.7107 5.49804 25.9832C5.55718 26.0187 5.66048 26.0818 5.73461 26.1244L13.699 30.7248C13.8975 30.8408 14.1233 30.902 14.3532 30.902C14.583 30.902 14.8088 30.8408 15.0073 30.7248L24.731 25.1103V28.9979C24.7321 29.0177 24.7283 29.0376 24.7199 29.0556C24.7115 29.0736 24.6988 29.0893 24.6829 29.1012L16.6317 33.7497C14.9096 34.7416 12.8643 35.0097 10.9447 34.4954C9.02506 33.9811 7.38785 32.7263 6.39227 31.0064ZM4.29707 13.6194C5.17156 12.0998 6.55279 10.9364 8.19885 10.3327C8.19885 10.4013 8.19491 10.5228 8.19491 10.6071V19.808C8.19351 20.0378 8.25334 20.2638 8.36823 20.4629C8.48312 20.6619 8.64893 20.8267 8.84863 20.9404L18.5723 26.5542L15.206 28.4979C15.1894 28.5089 15.1703 28.5155 15.1505 28.5173C15.1307 28.5191 15.1107 28.516 15.0924 28.5082L7.04046 23.8557C5.32135 22.8601 4.06716 21.2235 3.55289 19.3046C3.03862 17.3858 3.30624 15.3413 4.29707 13.6194ZM31.955 20.0556L22.2312 14.4411L25.5976 12.4981C25.6142 12.4872 25.6333 12.4805 25.6531 12.4787C25.6729 12.4769 25.6928 12.4801 25.7111 12.4879L33.7631 17.1364C34.9967 17.849 36.0017 18.8982 36.6606 20.1613C37.3194 21.4244 37.6047 22.849 37.4832 24.2684C37.3617 25.6878 36.8382 27.0432 35.9743 28.1759C35.1103 29.3086 33.9415 30.1717 32.6047 30.6641C32.6047 30.5947 32.6047 30.4733 32.6047 30.3889V21.188C32.6066 20.9586 32.5474 20.7328 32.4332 20.5338C32.319 20.3348 32.154 20.1698 31.955 20.0556ZM35.3055 15.0128C35.2464 14.9765 35.1431 14.9142 35.069 14.8717L27.1045 10.2712C26.906 10.1554 26.6803 10.0943 26.4504 10.0943C26.2206 10.0943 25.9948 10.1554 25.7963 10.2712L16.0726 15.8858V11.9982C16.0715 11.9783 16.0753 11.9585 16.0837 11.9405C16.0921 11.9225 16.1048 11.9068 16.1207 11.8949L24.1719 7.25025C25.4053 6.53903 26.8158 6.19376 28.2383 6.25482C29.6608 6.31589 31.0364 6.78077 32.2044 7.59508C33.3723 8.40939 34.2842 9.53945 34.8334 10.8531C35.3826 12.1667 35.5464 13.6095 35.3055 15.0128ZM14.2424 21.9419L10.8752 19.9981C10.8576 19.9893 10.8423 19.9763 10.8309 19.9602C10.8195 19.9441 10.8122 19.9254 10.8098 19.9058V10.6071C10.8107 9.18295 11.2173 7.78848 11.9819 6.58696C12.7466 5.38544 13.8377 4.42659 15.1275 3.82264C16.4173 3.21869 17.8524 2.99464 19.2649 3.1767C20.6775 3.35876 22.0089 3.93941 23.1034 4.85067C23.0427 4.88379 22.937 4.94215 22.8668 4.98473L14.9024 9.58517C14.7025 9.69878 14.5366 9.86356 14.4215 10.0626C14.3065 10.2616 14.2466 10.4877 14.2479 10.7175L14.2424 21.9419ZM16.071 17.9991L20.4018 15.4978L24.7325 17.9975V22.9985L20.4018 25.4983L16.071 22.9985V17.9991Z"
                    fill="currentColor"
                  ></path>
                </svg>
              </div>
              <span class="ai-content-span"
                ><div
                  class="core-content"
                  v-html="md.parse(item.content)"
                ></div>
                <div
                  v-if="loading && index === talkingList.length - 1"
                  class="cursor"
                ></div
              ></span>
            </div>
          </el-col>
        </el-row>
      </div>
      <el-row class="sending">
        <el-col :span="2" class="flex-core" :offset="0"
          ><el-avatar
            @click="cleanContentPage"
            style="background-color: white; cursor: pointer"
            :size="16"
            :src="deleteLogo"
        /></el-col>
        <el-col :span="18" class="flex-core">
          <div class="input-main">
            <input
              @input="inputChange"
              @keyup.enter="send"
              v-model="sendContent"
              type="text"
              :class="{ 'input-input': true }"
            />
            <div
              :class="{
                'send-main-btn': true,
                'has-content': hasContent,
                'not-has-content': !hasContent,
              }"
            >
              <svg
                @click="stopDebugConversationAction"
                style="cursor: pointer"
                v-if="loading"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="icon-lg"
              >
                <rect
                  x="7"
                  y="7"
                  width="10"
                  height="10"
                  rx="1.25"
                  fill="currentColor"
                ></rect>
              </svg>
              <svg
                v-else
                width="32"
                height="32"
                viewBox="0 0 32 32"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                class="icon-2xl"
              >
                <path
                  fill-rule="evenodd"
                  clip-rule="evenodd"
                  d="M15.1918 8.90615C15.6381 8.45983 16.3618 8.45983 16.8081 8.90615L21.9509 14.049C22.3972 14.4953 22.3972 15.2189 21.9509 15.6652C21.5046 16.1116 20.781 16.1116 20.3347 15.6652L17.1428 12.4734V22.2857C17.1428 22.9169 16.6311 23.4286 15.9999 23.4286C15.3688 23.4286 14.8571 22.9169 14.8571 22.2857V12.4734L11.6652 15.6652C11.2189 16.1116 10.4953 16.1116 10.049 15.6652C9.60265 15.2189 9.60265 14.4953 10.049 14.049L15.1918 8.90615Z"
                  fill="currentColor"
                ></path>
              </svg>
            </div>
          </div>
        </el-col>
      </el-row>
    </el-col>
  </el-row>
  <KnowledgeDrawer
    :drawer="drawer"
    :datasets="draft_config.datasets"
    :knowledge_list="knowledge_list"
    @updateDrawer="cancelEditDatasetAction"
    @addDataset="addDatasetAction"
    @deleteDataset="deleteDatasetAction"
    @editDataset="editDatasetAction"
  ></KnowledgeDrawer>

  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="voiceDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>语音输出</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <span>音色设置</span>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-select v-model="voiceSetting.timbre" placeholder="Select">
          <el-option
            v-for="item in timbre_options"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :span="19" :offset="1">
        <span>自动播放</span>
      </el-col>
      <el-col :span="2" :offset="1">
        <el-switch v-model="voiceSetting.auto" />
      </el-col>
    </el-row>
    <template #footer>
      <el-divider style="margin: 0px"></el-divider>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="voiceDialog = false">取消</el-button>
        <el-button type="primary" @click="editVoiceSetting"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="reviewDialog"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>内容审查</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <span style="font-size: 14px; font-weight: 600">关键词</span><br />
        <span style="font-size: 13px"
          >每行一个，用换行符分割。最多填写100个关键词</span
        >
      </el-col>
    </el-row>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-input
          v-model="reviewSetting.keywords"
          :rows="2"
          type="textarea"
          placeholder="每行一个，用换行符分隔"
        />
      </el-col>
    </el-row>
    <div
      class="review-output"
      style="
        background-color: #f9fafb;
        margin: 20px;
        padding: 5px;
        border-radius: 10px;
      "
    >
      <el-row>
        <el-col :span="19" :offset="1">
          <span style="font-size: 14px; font-weight: 600">审查输入内容</span>
        </el-col>
        <el-col :span="2" :offset="1">
          <el-switch v-model="reviewSetting.input_flag" />
        </el-col>
      </el-row>
      <el-row>
        <el-col :span="22" :offset="1">
          <span style="font-size: 14px; font-weight: 600">预设回复</span>
        </el-col>
      </el-row>
      <el-row style="margin-top: 20px">
        <el-col :span="22" :offset="1">
          <el-input
            v-model="reviewSetting.preset_response"
            :rows="2"
            type="textarea"
            placeholder="输入预设回复内容"
          />
        </el-col>
      </el-row>
    </div>
    <el-row style="margin-top: 20px">
      <el-col :span="19" :offset="1">
        <span>审查输出内容</span>
      </el-col>
      <el-col :span="2" :offset="1">
        <el-switch v-model="reviewSetting.output_flag" />
      </el-col>
    </el-row>

    <template #footer>
      <el-divider style="margin: 0px"></el-divider>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="voiceDialog = false">取消</el-button>
        <el-button type="primary" @click="editReviewSetting"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
  <el-drawer v-model="publishedHistoryVisible" direction="rtl">
    <template #header>
      <div
        style="
          display: flex;
          justify-content: start;
          align-items: center;
          width: 100%;
        "
      >
        <el-avatar :size="32" :src="app.icon" />
        <div style="display: flex; flex-direction: column">
          <div style="font-size: 16px; font-weight: 500; margin-left: 10px">
            {{ app.name }}
          </div>
        </div>
      </div>
    </template>
    <el-row style="width: 100%">
      <el-col :span="24">
        <div
          style="
            width: 100%;
            border: 1px solid #dcdfe6;
            border-radius: 5px;
            padding: 5px;
            background-color: #f5f5f5;
          "
        >
          <span style="font-size: 14px; font-weight: 500"
            >应用介绍：{{ app.remark }}</span
          >
        </div>
      </el-col>
    </el-row>
    <el-row class="no-scroll">
      <el-timeline style="margin-top: 20px; padding-left: 0px; width: 100%">
        <el-timeline-item
          v-for="(item, index) in publishedHistoryList"
          :key="index"
        >
          <el-row
            style="display: flex; justify-content: start; align-items: center"
          >
            <el-col :span="18">
              <el-row>
                <el-col :span="5"
                  ><span
                    style="
                      font-size: 16px;
                      font-weight: 600;
                      display: flex;
                      align-items: center;
                    "
                    >版本</span
                  ></el-col
                >
                <el-col :span="5" style="display: flex; align-items: center"
                  ><div
                    style="
                      border: 1px solid #f5f5f5;
                      width: 100%;
                      display: flex;
                      justify-content: center;
                      background-color: #f5f5f5;
                      border-radius: 5px;
                    "
                  >
                    #{{ item.id }}
                  </div></el-col
                >
              </el-row>
              <el-row>
                <el-col :span="24">
                  <span style="font-size: 14px">创建时间：</span
                  >{{ new Date(item.add_time).toLocaleString() }}
                </el-col>
              </el-row>
            </el-col>
            <el-col :span="6"
              ><el-button type="primary" @click="rollbackHistory(item)">
                回退
              </el-button></el-col
            >
          </el-row>
        </el-timeline-item>
      </el-timeline>
    </el-row>
  </el-drawer>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="longTermMemoryVisible"
    width="600"
    :show-close="false"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>长期记忆</span>
      </div>
    </template>
    <el-row style="margin-top: 20px">
      <el-col :span="22" :offset="1">
        <el-input
          v-model="longTermMemoryContent"
          :rows="10"
          type="textarea"
          placeholder="自定义长期记忆"
        />
      </el-col>
    </el-row>
    <template #footer>
      <div class="dialog-footer" style="padding: 15px">
        <el-button @click="longTermMemoryVisible = false">取消</el-button>
        <el-button type="primary" @click="editLongTermMemory"> 确认 </el-button>
      </div>
    </template>
  </el-dialog>
  <div v-show="false" id="target-component">
    <el-row style="margin-bottom: 15px; margin-right: 10px">
      <el-col
        :span="20"
        style="
          font-size: 14px;
          font-weight: 600;
          display: flex;
          align-items: center;
        "
        >lang-ast</el-col
      >
      <el-col :span="4"
        ><el-button type="primary" @click="copyText">Copy</el-button></el-col
      >
    </el-row>
    <p>被替换的内容</p>
  </div>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, onMounted, watch } from "vue";
import { ElNotification as notify } from "element-plus";
import OpenAi from "@/assets/img/openai.png";
import logo from "@/assets/img/tag.png";
import deleteLogo from "@/assets/img/delete.png";
import useClipboard from "vue-clipboard3/dist/esm/index.js";
import { Timer } from "@element-plus/icons-vue";
import {
  getSingleApplication,
  editConfigDatasetJoin,
  editAppConfig,
  publishedApplication,
  cancelPublishedApplication,
  getPublishedVersionHistory,
  rollbackPublishedVersionHistory,
  cleanDebuggerConversation,
  stopDebugConversation,
  getConversationDebugMessageList,
} from "@/api/ai/application";
import { getKnowleageList } from "@/api/ai/index";
import { debugApp } from "@/api/sse/index";
import PersonaAndResonseLogic from "./persona_and_response_logic.vue";
import ApplicationCapability from "./application_capability.vue";
import KnowledgeDrawer from "./reference_knowledge.vue";
import { useRoute, useRouter } from "vue-router";
import tools from "@/utils/tools";
import _ from "lodash";
const route = useRoute();
const router = useRouter();
const drawer: any = ref(false);
const { proxy }: any = getCurrentInstance();
// 获取页面的实例对象
const pageInstance: any = getCurrentInstance();
const showModel = ref(false);
const sendContent = ref("");
const hasContent = ref(false);
const loading = ref(false);
const contentDiv = ref(null);
const choiceModel = ref(0);
const preSetting = ref("");
const options: any = [];
const draft_config: any = ref({});
const model_config: any = ref({});
const origin_datasets: any = ref([]);
const knowledge_list: any = ref([]);
const isVisible = ref(false);
const voiceDialog = ref(false);
const reviewDialog = ref(false);
const voiceSetting: any = ref(null);
const reviewSetting: any = ref(null);
const publishedHistoryVisible: any = ref(false);
const publishedHistoryList: any = ref([]);
const longTermMemoryVisible: any = ref(false);
const app: any = ref({});
const code_start = ref(false);
const code_end = ref(false);
const longTermMemoryContent = ref("");
const current_task_id = ref("");
const stop_message_scroll = ref(false);
const current_position_index = ref(0);
const talkingList = ref<{ content: string; type: string; end?: boolean }[]>([]);
const modelList = ref([
  {
    label: {
      name: "gpt-4o-mini",
      range: "8K",
      rangInt: 8,
      disabled: false,
    },
    value: 0,
  },
  {
    label: {
      name: "gpt-4o",
      range: "8K",
      rangInt: 8,
      disabled: true,
    },
    value: 1,
  },
  {
    label: {
      name: "gpt-3.5-turbo",
      range: "4K",
      rangInt: 4,
      disabled: true,
    },
    value: 2,
  },
  {
    label: {
      name: "gpt-3.5-turbo-16k",
      range: "16K",
      rangInt: 16,
      disabled: true,
    },
    value: 3,
  },
]);
import { Marked } from "marked";
import { markedHighlight } from "marked-highlight";
import hljs from "highlight.js";
import "highlight.js/styles/atom-one-light.css";
const md: any = ref(null);
const timbre_options = [
  {
    value: "echo",
    label: "Echo",
  },
  {
    value: "tommy",
    label: "Tommy",
  },
];

watch(
  () => publishedHistoryVisible.value,
  (val) => {
    console.log(val);
    if (val) {
      const data = {
        app: app.value.id,
      };
      getPublishedVersionHistory(data).then((res: any) => {
        publishedHistoryList.value = res.results;
      });
    }
  }
);

watch(
  () => talkingList.value,
  (val) => {
    console.log(val);
  }
);
onMounted(() => {
  md.value = new Marked(
    markedHighlight({
      emptyLangClass: "hljs",
      langPrefix: "hljs language-",
      highlight(code, lang, info) {
        const language = hljs.getLanguage(lang) ? lang : "plaintext";
        const highlightedCode = hljs.highlight(code, { language }).value;
        const targetComponent: any =
          document.getElementById("target-component");

        // 获取所有按钮

        const buttons = targetComponent.querySelectorAll("button");
        // 为每个按钮添加点击事件监听器
        buttons.forEach((button: any) => {
          button.setAttribute("private", code);
        });

        // 创建新的 HTML 元素
        const newElement = document.createElement("div");
        newElement.innerHTML = highlightedCode;

        // 设置新元素的最大宽度（例如 100% 或其他值）
        newElement.style.maxWidth = "100%"; // 或者你可以设置一个固定的像素值，例如 '800px'
        newElement.style.overflowX = "auto"; // 如果内容过宽，可以使其水平滚动

        // 获取目标元素的子元素列表
        const childNodes = targetComponent.children;

        // 确保目标元素有足够的子元素
        if (childNodes.length >= 2) {
          // 获取第二个子元素
          const secondChild = childNodes[1];
          // 替换第二个子元素
          targetComponent.replaceChild(newElement, secondChild);
        } else {
          // 如果目标元素没有足够的子元素，则直接添加新的子元素
          targetComponent.appendChild(newElement);
        }
        // console.log(targetComponent);
        return targetComponent.innerHTML.replace("lang-ast", lang);
      },
    })
  );
  getSingleApplication(Number(route.params.application), {}).then(
    (res: any) => {
      console.log(res);
      app.value = res;
      for (let i = 0; i < res.configs.length; i++) {
        if (res.configs[i].entity_type == "draft") {
          draft_config.value = res.configs[i];
          voiceSetting.value = JSON.parse(draft_config.value.speech_setting);
          reviewSetting.value = JSON.parse(draft_config.value.review_config);
          break;
        }
      }
      model_config.value = JSON.parse(draft_config.value.model_config);
      origin_datasets.value = [...draft_config.value.datasets];
      isVisible.value = true;
      get_message_list();
      pageInstance.refs.contentDiv.addEventListener("scroll", function () {
        if (pageInstance.refs.contentDiv.scrollTop === 0) {
          // 滚动到顶部时触发
          if (
            current_position_index.value !== 0 &&
            stop_message_scroll.value === false
          ) {
            get_message_list(current_position_index.value);
          }
        }
      });
    }
  );
  const data = {
    page: 1,
    size: 1000,
    project: Number(route.params.project),
  };
  getKnowleageList(data).then((res: any) => {
    knowledge_list.value = res.results;
  });
  setTimeout(() => {
    setClickListeners();
  }, 1000);
});

function get_message_list(position_index: any = null) {
  let data: any = {
    app: app.value.id,
  };
  if (position_index != null) {
    data["position_index"] = position_index;
  }
  getConversationDebugMessageList(data).then((res: any) => {
    console.log(res);
    if (res.results.length === 0) {
      stop_message_scroll.value = true;
    }
    for (let i = 0; i < res.results.length; i++) {
      unshiftMessage(res.results[i]);
      if (res.results.length - 1 === i) {
        current_position_index.value = res.results[i].id;
      }
    }
    if (position_index == null) {
      scrollToBottom(pageInstance.refs.contentDiv);
    }
  });
}

function stopDebugConversationAction() {
  const data = {
    task_id: current_task_id.value,
  };
  stopDebugConversation(app.value.id, data).then((res) => {
    console.log(res);
    loading.value = false;
    cleanContent();
  });
}
function editLongTermMemory() {
  const data = {
    long_term_memory_content: longTermMemoryContent.value,
  };
  editAppConfig(draft_config.value.id, data).then((res: any) => {
    if (res.result === false) {
      tools.message(res.msg, proxy);
    } else {
      tools.message("更新长期记忆成功。", proxy);
      longTermMemoryVisible.value = false;
      reloadConfigAction();
    }
  });
}
function showLongTermMemory() {
  if (draft_config.value.long_term_memory === true) {
    longTermMemoryVisible.value = true;
    longTermMemoryContent.value = draft_config.value.long_term_memory_content;
  } else {
    tools.message("未开启长期记忆功能", proxy);
  }
}

function rollbackHistory(item: any) {
  rollbackPublishedVersionHistory(item.id, {}).then((res) => {
    tools.message("回退成功", proxy);
    publishedHistoryVisible.value = false;
    reloadConfigAction();
  });
}

const searching = _.debounce(
  function (code) {
    console.log(code);
    const targetComponent: any = document.querySelectorAll(".hljs");
    const buttons =
      targetComponent[targetComponent.length - 1].querySelectorAll("button");
    // 为每个按钮添加点击事件监听器
    buttons.forEach((button: any) => {
      button.setAttribute("private", code);
    });
  },
  500,
  { maxWait: 1500 }
);

async function copyText(event: any) {
  let code: any = "";
  if (
    event.target.getAttribute("private") === null ||
    event.target.getAttribute("private").length === 0
  ) {
    code = event.target.parentElement.getAttribute("private");
  } else {
    code = event.target.getAttribute("private");
  }
  const { toClipboard } = useClipboard();
  await toClipboard(code);
  tools.message("复制成功", proxy, "success");
}

function publishedAction() {
  publishedApplication(Number(draft_config.value.id), {}).then((res) => {
    tools.message("发布成功", proxy);
  });
}

function cancelPublishedAction() {
  cancelPublishedApplication(Number(draft_config.value.id), {}).then((res) => {
    tools.message("取消发布", proxy);
  });
}

function editVoiceSetting() {
  const data = {
    speech_setting: JSON.stringify(voiceSetting.value),
  };
  editAppConfig(Number(draft_config.value.id), data).then((res) => {
    voiceDialog.value = false;
  });
}

function editReviewSetting() {
  const data = {
    review_config: JSON.stringify(reviewSetting.value),
  };
  editAppConfig(Number(draft_config.value.id), data).then((res) => {
    reviewDialog.value = false;
  });
}

function saveModelSetting() {
  const data = {
    model_config: JSON.stringify(model_config.value),
  };
  editAppConfig(Number(draft_config.value.id), data);
}

function reloadConfigAction() {
  getSingleApplication(Number(route.params.application), {}).then(
    (res: any) => {
      for (let i = 0; i < res.configs.length; i++) {
        if (res.configs[i].entity_type == "draft") {
          draft_config.value = res.configs[i];
          voiceSetting.value = JSON.parse(draft_config.value.speech_setting);
          reviewSetting.value = JSON.parse(draft_config.value.review_config);
          break;
        }
      }
      model_config.value = JSON.parse(draft_config.value.model_config);
      origin_datasets.value = [...draft_config.value.datasets];
      isVisible.value = !isVisible.value;
      isVisible.value = !isVisible.value;
    }
  );
}

function cancelEditDatasetAction() {
  draft_config.value.datasets = [...origin_datasets.value];
  drawer.value = !drawer.value;
}

function editDatasetAction() {
  if (arraysAreEqual(origin_datasets.value, draft_config.value.datasets))
    return;
  origin_datasets.value = [...draft_config.value.datasets];
  const data = {
    dataset_list: origin_datasets.value,
  };
  editConfigDatasetJoin(draft_config.value.id, data).then((res: any) => {
    console.log(res);
  });
}

function arraysAreEqual(arr1: Array<number>, arr2: Array<number>) {
  if (arr1.length !== arr2.length) return false;
  return arr1.every((value, index) => value === arr2[index]);
}

function addDatasetAction(id: number) {
  draft_config.value.datasets.push(id);
}
function deleteDatasetAction(id: number) {
  const index = draft_config.value.datasets.indexOf(id);
  if (index !== -1) {
    draft_config.value.datasets.splice(index, 1);
  }
}

function openKnowledgeList() {
  drawer.value = !drawer.value;
}

const onBack = () => {
  const params = {
    project: route.params.project,
  };
  router.push({ name: "ai_application_ground", params });
  notify("Back");
};
function inputChange() {
  if (sendContent.value.length > 0) {
    hasContent.value = true;
  } else {
    hasContent.value = false;
  }
}
function cleanContentPage() {
  const data = {
    app: app.value.id,
  };
  cleanDebuggerConversation(-1, data).then((res) => {
    talkingList.value = [];
  });
}

function unshiftMessage(message: any) {
  talkingList.value.unshift({
    content: message.answer,
    type: "ai",
    end: false,
  });
  talkingList.value.unshift({
    content: message.query,
    type: "user",
  });
}

async function send() {
  if (loading.value) {
    return;
  }
  if (sendContent.value.length == 0) {
    return;
  }
  try {
    const data = {
      query: sendContent.value,
    };
    talkingList.value.push({
      content: sendContent.value,
      type: "user",
    });
    loading.value = true;
    talkingList.value.push({
      content: "",
      type: "ai",
      end: false,
    });
    scrollToBottom(pageInstance.refs.contentDiv);
    await debugApp(
      "llm/app/conversation/debug/",
      sendContent.value,
      app.value.id,
      async (event_response) => {
        const event = event_response?.event;
        const data = event_response?.data;
        const lastIndex = talkingList.value.length - 1;
        let message = talkingList.value[lastIndex];
        if (
          message.content.trim().endsWith("```") &&
          code_start.value === false
        ) {
          code_start.value = true;
        } else if (
          message.content.trim().endsWith("```") &&
          code_start.value === true
        ) {
          code_start.value = false;
          // 为每个按钮添加点击事件监听器
          setTimeout(() => {
            setClickListeners();
          }, 1000);
        }
        if (event === "agent_message") {
          let chunk_content = data?.answer;
          current_task_id.value = data.task_id;
          // console.log(chunk_content);
          talkingList.value[lastIndex].content += chunk_content;
          scrollToBottom(pageInstance.refs.contentDiv);
          if (chunk_content.length === 0) {
            loading.value = false;
            cleanContent();
          }
        }
      }
    );
  } finally {
  }
}

function setClickListeners() {
  const parentElement = document.querySelectorAll(".hljs");
  console.log(parentElement);

  for (let i = 0; i < parentElement.length; i++) {
    const buttons = parentElement[i].querySelectorAll("button");
    buttons.forEach((button: any) => {
      button.addEventListener("click", copyText);
    });
  }
}
function cleanContent() {
  sendContent.value = "";
  hasContent.value = false;
}
function scrollToBottom(scrollableElement: any) {
  requestAnimationFrame(() => {
    scrollableElement.scrollTop =
      scrollableElement.scrollHeight - scrollableElement.clientHeight;
  });
}

function changeModel(item: any) {
  console.log(item);
}
</script>
<style lang="scss" scoped>
.model-setting {
  min-width: 500px;
}
.top-content {
  height: calc(-295px + 100vh);
}
.talking {
  // height: 100%;
  .sending {
    //   height: 20%;
    display: flex;
    justify-content: center;
    align-items: baseline;
  }
}
.content-div {
  overflow-y: scroll;
}
.content-div::-webkit-scrollbar {
  display: none; /* 隐藏滚动条 */
}
.ai-content-span {
  // margin-left: 20px;
  max-width: 90%;
  display: flex;
  align-items: center;
  justify-content: start;
}
.gpt-logo {
  color: #0d0d0d;
  padding: 0.25rem;
  background-color: #fff;
  border-radius: 0.125rem;
  display: flex;
  justify-content: center;
  align-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 9999px;
  border: 1px solid #e3e3e3;
  box-sizing: border-box;
  margin-left: 20px;
}
.content-row {
  margin-top: 20px;
  margin-bottom: 20px;
  margin-right: 20px;
}
.user-content {
  display: flex;
  justify-content: end;
  align-items: center;
  div {
    padding-bottom: 0.625rem;
    padding-top: 0.625rem;
    padding-left: 1.25rem;
    padding-right: 1.25rem;
    --tw-bg-opacity: 1;
    background-color: rgb(244 244 244 / var(--tw-bg-opacity));
    border-radius: 1.5rem;
    max-width: 70%;
  }
}
.has-content {
  --tw-text-opacity: 1;
  color: rgb(255 255 255 / var(--tw-text-opacity));
  --tw-bg-opacity: 1;
  background-color: rgb(0 0 0 / var(--tw-bg-opacity));
}
.not-has-content {
  --tw-text-opacity: 1;
  color: rgb(244 244 244 / var(--tw-text-opacity));
  --tw-bg-opacity: 1;
  background-color: rgb(215 215 215 / var(--tw-bg-opacity));
}
.send-main-btn {
  border-radius: 9999px;
  width: 2rem;
  height: 2rem;
  display: flex;
  justify-content: center;
  align-items: center;
}
.input-input {
  background: none; /* 移除背景 */
  border: none; /* 移除边框 */
  outline: none; /* 移除焦点时的轮廓线 */
  box-shadow: none; /* 移除阴影 */
  appearance: none; /* 移除特定于浏览器的默认样式 */
  -moz-appearance: none; /* Firefox的特定样式清除 */
  -webkit-appearance: none; /* Chrome和Safari的特定样式清除 */
  width: 80%;
  background-color: transparent;
  height: 40px;
  font-size: 1rem;
}
.input-main {
  height: 52px;
  width: 100%;
  background-color: #f4f4f4;
  border-radius: 26px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.cursor-core {
  cursor: pointer;
}
.flex-core {
  display: flex;
  justify-content: center;
  align-items: center;
}
.top-menu {
  height: 70px;
  display: flex;
  justify-content: center;
  align-items: center;
  align-content: center;
  border-bottom: 1px solid #e0e0e0;
}
.title-main {
  // height: 100%;
  //   margin-left: 20px;
  .el-page-header__left {
    width: 100% !important;
  }
}
.title-div {
  display: flex;
  justify-content: center;
  align-items: center;
}
.main-menu {
  margin: 5px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
}
.choice {
  color: var(--el-color-primary);
}

.model-select {
  height: 40px;
}
.cursor {
  align-items: center;
  display: inline-block;
  width: 14px;
  height: 14px;
  background-color: #444444;
  border-radius: 9999px;
  animation: blink 1s step-end infinite;
  vertical-align: middle;
}
@keyframes blink {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0;
  }
}
.my-header {
  padding: 20px;
  padding-bottom: 0px;
  span {
    font-size: 16px;
    font-weight: 600;
  }
}
</style>
<style lang="scss">
.el-dialog__header {
  padding-bottom: 0px;
}
.code-header {
  display: flex;
  justify-content: start;
  align-items: center;
  .copy-btn {
    height: 20px;
  }
}
.title-main {
  .el-page-header__left {
    width: 100% !important;
    .el-page-header__content {
      width: 80%;
    }
  }
  .el-collapse-item__wrap,
  .el-collapse-item__header {
    background-color: #f9fafb;
  }
}
.el-dropdown-link:hover {
  border: none !important; /* 使用 !important 确保覆盖组件的默认样式 */
  outline: none !important;
}
.el-dropdown-link:focus-visible {
  outline: none !important;
}
.el-popper {
  width: auto !important;
}
.model-select {
  .el-select__wrapper {
    height: inherit;
  }
}
.back-icon {
  .el-page-header__back {
    margin-left: 10px;
  }
  .el-page-header__extra {
    width: 20%;
  }
}
.hljs {
  max-width: 100%;
}
</style>

<style lang="scss">
.core-content {
  margin-left: 10px;
  margin-top: 7px;
  max-width: 100%;
  p {
    margin: 0px !important;
  }
  pre {
    max-width: 95%;
  }
}
</style>
