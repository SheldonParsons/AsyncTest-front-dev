<template>
  <el-row>
    <el-col :span="20" :offset="1" class="step-col">
      <el-steps style="max-width: 600px" :active="current_active" align-center>
        <el-step title="上传文件" description="批量上传待处理文件" />
        <el-step title="分段设置" description="设置文件解析规则" />
        <el-step title="数据处理" description="开始处理文件解析" />
      </el-steps>
    </el-col>
  </el-row>
  <div class="step step-3" v-if="current_active === 2">
    <el-row style="margin-top: 20px">
      <el-col :span="18" :offset="2"
        ><span style="font-size: 14px; font-weight: 600"
          >服务器处理中</span
        ></el-col
      >
    </el-row>
    <div
      class="no-scroll"
      style="overflow-y: scroll; max-height: calc(100vh - 350px)"
    >
      <transition-group name="fade" appear>
        <el-row
          style="margin-top: 10px"
          v-for="(item, index) in process_data.list"
          :key="index"
        >
          <el-col :span="18" :offset="2">
            <div
              style="
                background-color: #e5e9ef;
                width: 100%;
                height: 50px;
                border-radius: 10px;
                display: flex;
                justify-content: center;
                align-items: center;
              "
            >
              <img
                style="
                  width: 30px;
                  padding-left: 20px;
                  margin-left: 10px;
                  margin-right: 10px;
                "
                :src="getExtensionFilePic(item.name)"
              />
              <span style="width: 90%; font-size: 14px; font-weight: 600">{{
                item.name
              }}</span>
              <span
                style="
                  width: 10%;
                  cursor: pointer;
                  font-size: 14px;
                  font-weight: 600;
                "
                >处理中</span
              >
              <!-- <span style="width: 5%; cursor: pointer;font-size: 14px;font-weight: 600;">51%</span> -->
            </div>
          </el-col>
        </el-row>
      </transition-group>
    </div>
  </div>
  <div class="step step-2" v-if="current_active === 1">
    <el-row style="margin-top: 20px">
      <el-col
        style="cursor: default"
        :span="18"
        :offset="2"
        @click="current_rule = 0"
      >
        <div
          style="
            padding-left: 20px;
            width: 100%;
            height: 70px;
            background-color: white;
            border: 1px solid #e5e9ef;
            border-radius: 10px;
            display: flex;
            flex-direction: column;
            justify-content: center;
          "
          :class="{ 'choice-rule': current_rule === 0 }"
        >
          <span style="font-size: 16px; font-weight: 600">自动分段与清洗</span>
          <span style="font-size: 14px; color: #6b7280"
            >自动分段与预处理规则</span
          >
        </div>
      </el-col></el-row
    >
    <transition-group name="fade" appear>
      <el-row style="margin-top: 20px">
        <el-col
          :span="18"
          :offset="2"
          style="cursor: default"
          @click="current_rule = 1"
        >
          <div
            :class="{ 'choice-father': current_rule === 1 }"
            style="
              padding-left: 20px;
              width: 100%;
              background-color: white;
              border: 1px solid #e5e9ef;
              border-radius: 10px;
              overflow: hidden;
              display: flex;
              flex-direction: column;
              justify-content: center;
              transition: max-height 0.5s ease, background-color 0.5s ease;
            "
          >
            <div
              style="
                height: 70px;
                display: flex;
                flex-direction: column;
                justify-content: center;
              "
            >
              <span style="font-size: 16px; font-weight: 600">自定义</span>
              <span style="font-size: 14px; color: #6b7280"
                >自定义分段规则、分段长度与预处理规则</span
              >
            </div>
            <div
              style="
                max-height: 0;
                overflow: hidden;
                transition: max-height 0.5s ease, opacity 0.5s ease;
                opacity: 0;
              "
              :class="{ 'choice-custom': current_rule === 1 }"
            >
              <el-divider></el-divider>
              <el-row>
                <el-col :span="20">
                  <el-badge is-dot class="item"
                    ><span style="font-size: 14px; font-weight: 600"
                      >分段标识符</span
                    ></el-badge
                  >
                </el-col>
              </el-row>
              <el-row style="margin-top: 10px">
                <el-col :span="23">
                  <el-input
                    v-model="splitter"
                    placeholder="请输入分段标识符，如果有多个标识符，请使用英文逗号进行分割"
                  ></el-input>
                </el-col>
              </el-row>
              <el-row style="margin-top: 10px">
                <el-col :span="20">
                  <span style="font-size: 14px; font-weight: 600"
                    >分段最大长度</span
                  >
                </el-col>
              </el-row>
              <el-row style="margin-top: 10px">
                <el-col :span="23">
                  <el-input-number
                    v-model="splitter_max_length"
                    :min="100"
                    :max="1000"
                  />
                </el-col>
              </el-row>
              <el-row style="margin-top: 10px">
                <el-col :span="20">
                  <span style="font-size: 14px; font-weight: 600"
                    >文本处理规则</span
                  >
                </el-col>
              </el-row>
              <el-row style="margin-top: 10px">
                <el-col :span="23">
                  <el-checkbox
                    v-model="clean_blank"
                    label="替换掉连续的空格、换行符和制表符"
                    size="large"
                  />
                </el-col>
              </el-row>
              <el-row style="margin-bottom: 20px">
                <el-col :span="23">
                  <el-checkbox
                    v-model="delete_url"
                    label="删除所有 URL 和电子邮件地址"
                    size="large"
                  />
                </el-col>
              </el-row>
            </div>
          </div> </el-col
      ></el-row>
    </transition-group>
  </div>
  <div v-if="current_active === 0" class="step step-1">
    <el-row style="margin-top: 20px">
      <el-col :span="18" :offset="2">
        <el-upload
          class="upload-demo"
          drag
          multiple
          :http-request="handleChange"
          :show-file-list="false"
        >
          <el-icon class="el-icon--upload"><upload-filled /></el-icon>
          <div class="el-upload__text">
            拖拽文件至此 或者 <em>点击 以上传</em>
          </div>
          <template #tip>
            <div class="el-upload__tip">
              支持PDF、TXT、DOC、DOCX、MD、XLS、XLSX、HTML、CSV、PPT、PNG，最多可上传10个文件，每个文件不超过10MB
            </div>
          </template>
        </el-upload>
      </el-col>
    </el-row>
    <div
      class="no-scroll"
      style="overflow-y: scroll; max-height: calc(100vh - 500px)"
    >
      <transition-group name="fade" appear>
        <el-row
          style="margin-top: 10px"
          v-for="(item, index) in d.list"
          :key="index"
        >
          <el-col :span="18" :offset="2">
            <div
              style="
                background-color: #e5e9ef;
                width: 100%;
                height: 50px;
                border-radius: 10px;
                display: flex;
                justify-content: center;
                align-items: center;
              "
            >
              <img
                style="
                  width: 30px;
                  padding-left: 20px;
                  margin-left: 10px;
                  margin-right: 10px;
                "
                :src="getExtensionFilePic(item.name)"
              />
              <span style="width: 95%; font-size: 14px; font-weight: 600">{{
                item.name
              }}</span
              ><el-icon
                style="width: 5%; cursor: pointer"
                @click="removeFile(index)"
                ><CloseBold
              /></el-icon>
            </div>
          </el-col>
        </el-row>
      </transition-group>
    </div>
  </div>
  <transition-group name="fade" appear>
    <div
      v-if="current_active > 0 && current_active < 2"
      class="card-main add-app g-unselect before-step"
      @click="current_active -= 1"
    >
      上一步
    </div>
    <div
      v-if="current_active < 2"
      class="card-main add-app g-unselect next-step"
      @click="next_step"
    >
      下一步
    </div>
    <div
      v-if="current_active === 2"
      class="card-main add-app g-unselect next-step"
      @click="back_document_list"
    >
      确认
    </div>
    <div v-if="current_active === 2" class="g-unselect next-step-desc">
      点击确认不影响数据处理，处理完毕后可进行引用
    </div>
  </transition-group>
</template>
<script setup lang="ts">
import { onMounted, ref, reactive, getCurrentInstance } from "vue";
import { useRouter, useRoute } from "vue-router";
import { getSingleKnowleageList, uploadFiles,createDocument } from "@/api/ai/index";
import tools from "@/utils/tools";
import { useI18n } from "vue-i18n";
const current_rule = ref(0);
const { t } = useI18n();
const current_active = ref(0);
const { proxy }: any = getCurrentInstance();
const emit = defineEmits(["go_to_document"]);
const route = useRoute();
const router: any = useRouter();
const knowledge: any = ref({});
const splitter: any = ref("");
const splitter_max_length = ref(500);
const clean_blank = ref(false);
const delete_url = ref(false);
// 数据主体！！！
const d = reactive({
  list: [] as any,
});
const process_data = reactive({
  list: [] as any,
});
const file_pic_mapping: any = {
  md: "md",
  txt: "txt",
  pdf: "pdf",
  doc: "doc",
  docx: "doc",
  xls: "xls",
  xlsx: "xls",
  html: "html",
  csv: "csv",
  ppt: "ppt",
  png: "png",
};
onMounted(async () => {
  const knowledge_id = Number(route.params.knowledge);
  getSingleKnowleageList(knowledge_id, {}).then((res) => {
    console.log(res);
    knowledge.value = res;
    const params = {
      project: Number(route.params.project),
      knowledge: knowledge.value.id,
    };
    emit("go_to_document", knowledge.value.name,params, "knowledge");
  });
});

function next_step() {
  if (current_active.value === 0) {
    if (d.list.length === 0) {
      proxy.$message.error("请上传文件");
      return;
    }
  }
  current_active.value += 1;
  if (current_active.value === 2) {
    const data = new FormData();
    for (var i = 0; i < d.list.length; i++) {
      data.append("files", d.list[i]);
    }
    uploadFiles(data).then((res: any) => {
      process_data.list = res;
      let file_ids = [];
      for (let i = 0; i < res.length; i++) {
        file_ids.push(res[i].id);
      }
      let custom_rule: any = {};
      if (current_rule.value === 1) {
        custom_rule["pre_process_rules"] = [];
        custom_rule["pre_process_rules"].push({
          id: "remove_extra_space",
          enabled: clean_blank.value,
        });
        custom_rule["pre_process_rules"].push({
          id: "remove_url_and_email",
          enabled: delete_url.value,
        });
        custom_rule["segment"] = {};
        custom_rule["segment"]["separators"] = splitter.value.split(",");
        custom_rule["segment"]["chunk_size"] = splitter_max_length.value;
        custom_rule["segment"]["chunk_overlap"] = 50;
      }
      const document_data = {
        dataset: Number(route.params.knowledge),
        upload_file_ids: file_ids,
        process_type: current_rule.value === 0 ? "automatic" : "custom",
        rule: custom_rule,
      };
      createDocument(document_data).then((document_res:any) => {
        console.log(document_res);
      })
      console.log(document_data);
    });
  }
}

function getExtensionFilePic(file_name: any) {
  const s = "https://asynctest.oss-cn-shenzhen.aliyuncs.com/public/file_pic/";
  const tag = file_name.split(".").pop();
  return s + file_pic_mapping[tag] + ".png";
}
function back_document_list() {
  const params = {
    project: Number(route.params.project),
    knowledge: Number(route.params.knowledge),
  };
  router.push({ name: "ai_knowledge_document", params });
}
function handleChange(options: any) {
  const { file, onProgress, onSuccess, onError } = options;
  if (!file_pic_mapping[file.name.split(".").pop()]) {
    tools.message("不支持该文件类型", proxy);
    return;
  }
  if (d.list.length > 10) {
    tools.message("最大上传文件不能超过10个", proxy);
  } else {
    d.list.push(file);
  }
}
function removeFile(index: number) {
  d.list.splice(index, 1);
}
</script>

<style lang="scss" scoped>
.step-col {
  display: flex;
  justify-content: center;
  align-items: center;
  .el-steps {
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
  }
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

.add-app {
  font-size: 14px;
  height: 30px;
  border-radius: 10px;
  background-color: black;
  cursor: pointer;
}

.card-main:hover {
  --tw-ring-opacity: 1;
  --tw-ring-color: black;
}
.before-step {
  position: fixed;
  bottom: 30px;
  right: 130px;
  background-color: #e5e9ef;
  color: black;
}
.next-step {
  position: fixed;
  bottom: 30px;
  right: 30px;
  background-color: black;
  color: white;
}
.next-step-desc {
  position: fixed;
  bottom: 40px;
  right: 140px;
  font-size: 14px;
}

.card-main {
  font-weight: 600;
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
  transition-duration: 0.3s;
}
.choice-rule {
  border: 1px solid var(--dark) !important;
  background-color: white !important;
}
.choice-custom {
  max-height: 500px !important;
  opacity: 1 !important;
}
.choice-father {
  border: 1px solid var(--dark) !important;
  background-color: white !important;
}
</style>
