<template>
  <el-dialog
    class="provider-pen-dialog"
    v-model="showAddProviderPen"
    width="500"
    destroy-on-close
    @close="closeProviderPen"
    :show-close="false"
    center
  >
    <div id="provider-pen" class="card-cover"></div>
    <el-row justify="center" style="padding-top: 20px; padding-bottom: 20px">
      <el-col :span="4">
        <el-upload
          :http-request="customUpload"
          class="avatar-uploader"
          :show-file-list="false"
          :on-success="handleAvatarSuccess"
        >
          <el-avatar v-if="imageUrl" :src="imageUrl" :size="80" />
          <el-avatar :icon="UploadFilled" v-else :size="80" />
        </el-upload>
      </el-col>
    </el-row>
    <el-row>
      <el-col :offset="1" :span="5" style="display: flex; align-items: center">
        <span style="font-size: 14px; color: #6b7280; font-weight: 700"
          >知识库名称</span
        ><el-icon class="header-icon">
          <info-filled />
        </el-icon>
      </el-col>
      <el-col :span="17">
        <el-input v-model="providerName"></el-input>
      </el-col>
    </el-row>
    <el-row style="margin-top: 30px">
      <el-col :offset="1" :span="5" style="display: flex; align-items: center">
        <span style="font-size: 14px; color: #6b7280; font-weight: 700"
          >知识库简介</span
        ><el-icon class="header-icon">
          <info-filled />
        </el-icon>
      </el-col>
      <el-col :span="17">
        <el-input
          v-model="providerDesc"
          :rows="4"
          type="textarea"
          placeholder="Knowledge Description"
        />
      </el-col>
    </el-row>
    <el-divider></el-divider>
    <template #footer>
      <el-row style="padding-bottom: 10px">
        <el-col
          :offset="15"
          :span="9"
          style="display: flex; justify-content: end"
        >
          <el-button
            type="primary"
            @click="create_provider"
            class="ml-2"
            style="margin-right: 20px"
            >创建知识库</el-button
          >
        </el-col>
      </el-row>
    </template>
  </el-dialog>
</template>

<script setup lang="ts">
import { ref, reactive, getCurrentInstance, watch } from "vue";
import { useRoute } from "vue-router";
import type { UploadProps } from "element-plus";
import { UploadFilled } from "@element-plus/icons-vue";
import { createKnowledge } from "@/api/ai/index";
import { useI18n } from "vue-i18n";
import SpecialButton from "@/components/common/button/special_button.vue";
import _ from "lodash";
import tools from "@/utils/tools";
import { state } from "@/state";
const { t } = useI18n();
const emit = defineEmits(['reload'])
// 全局对象
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const imageUrl = ref("");
const providerName = ref("");
const providerDesc = ref("");
const providerTrademark = ref("");
const tableData: any = ref([]);
const current_img = ref();
const showAddProviderPen = ref(false);

watch(
  () => state.message,
  (val) => {
    if (val.indexOf("addknowledge") != -1) {
      showAddProviderPen.value = true;
    }
  }
);

function create_provider() {
  if (checking() === false) return;
  const data = new FormData();
  data.append("icon", current_img.value);
  data.append("name", providerName.value); // 添加其他自定义数据
  data.append("description", providerDesc.value);
  data.append("project", String(route.params.project));
  createKnowledge(data).then((res:any) => {
    console.log(res);
    if (Array.isArray(res.name)) {
      tools.message(t(res.name[0]), proxy);
    } else {
      showAddProviderPen.value = false;
      window.$toast({title:'创建成功', type:'success'})
      emit('reload')
    }
  });
}

function checking() {
  if (imageUrl.value === "") {
    tools.message(t("请上传知识库图标"), proxy);
    return false;
  }
  if (providerName.value === "") {
    tools.message(t("请输入知识库名称"), proxy);
    return false;
  }
  if (providerDesc.value === "") {
    tools.message(t("请输入知识库描述"), proxy);
    return false;
  }
  return true;
}


function closeProviderPen() {
  imageUrl.value = "";
  providerName.value = "";
  providerDesc.value = "";
}

const handleAvatarSuccess: UploadProps["onSuccess"] = (
  response,
  uploadFile
) => {
  imageUrl.value = URL.createObjectURL(uploadFile.raw!);
  // provider-pen-dialog
  const element: any = document.getElementById("provider-pen");
  element.style.backgroundImage = "url('" + imageUrl.value + "')";
};

// 自定义上传逻辑的函数
const customUpload = async (options: any) => {
  const { file, onProgress, onSuccess, onError } = options;
  current_img.value = file;
};
</script>

<style lang="scss" scoped>
@import "@/assets/scss/btn/card_btn.scss";
.card-cover {
  width: 100%;
  position: absolute;
  height: 10%;
  left: 0;
  will-change: top;
  background-size: cover;
  background-position: center;
  filter: blur(60px);
  // transform: scale(1.2);
  transition: 0.5s;
}
.private-input {
  margin: 0;
  padding: 0;
  border: none;
  border-bottom: 1px solid transparent;
  outline: none;
  background-color: transparent;
  font-size: 15px;
  width: 100%;
  transition: border-color 0.3s ease, color 0.3s ease;
}
.private-input:hover {
  color: var(--primary);
  border-bottom: 1px solid var(--primary) !important;
}
.action-icon {
  cursor: pointer;
}
.action-icon-close {
  margin-left: 3px;
}
.search {
  padding-top: 30px;
  // z-index: 900;
}
.main-data {
  padding-top: 20px;
}

.search-col {
  -webkit-transition: 0.3s;
  -o-transition: 0.3s;
  transition: 0.3s;
}
.fade-enter-active {
  opacity: 1;
  transition: all 0.05s ease-in-out;
}
.fade-leave-active {
  opacity: 1;
  transition: all 0.3s linear;
}
.fade-enter-from,
.fade-leave-to {
  opacity: 0;
  transform: translateX(10px);
}

.disappear-auto {
  @media screen and (max-width: 880px) {
    display: none;
  }
}

.copy-instance {
  font-size: 16px;
  cursor: pointer;
}

.el-popper.is-customized {
  /* Set padding to ensure the height is 32px */
  padding: 6px 12px !important;
  background: linear-gradient(90deg, rgb(159, 229, 151), rgb(204, 229, 129));
}

.el-popper.is-customized .el-popper__arrow::before {
  background: linear-gradient(45deg, #b2e68d, #bce689);
  right: 0;
}
</style>

<style lang="scss">
.provider-pen-dialog {
  border-radius: 10px;
  .el-dialog__header {
    display: none;
  }
  .el-dialog__footer {
    padding-top: 0px !important;
  }
  .el-dialog__body {
  }
  .el-avatar {
    .el-icon {
      font-size: 50px;
    }
  }
}
</style>
