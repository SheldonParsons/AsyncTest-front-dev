<template>
  <el-dialog
    class="callback-dialog"
    style="border-radius: 10px"
    v-model="dialogTableVisible"
    width="1200"
  >
    <template #header="{ close, titleId, titleClass }">
      <div class="my-header">
        <span>召回测试</span>
        <div style="font-size: 14px; color: #6b7280">
          基于给定的查询文本测试知识库的召回效果
        </div>
      </div>
    </template>
    <el-row style="padding: 20px">
      <el-col :span="12">
        <div style="width: 100%; border: 1px solid #ccc; border-radius: 10px">
          <div
            class="text-header"
            style="
              padding: 10px;
              border-radius: 10px;
              background-color: #f5f5f5;
            "
          >
            <el-row class="g-flex">
              <el-col :span="12"
                ><span style="font-size: 14px; font-weight: 600"
                  >源文本</span
                ></el-col
              >
              <el-col :span="12" style="display: flex; justify-content: end"
                ><el-button
                  @click="dialogParamsVisible = true"
                  class="checking-btn"
                  ><LanguageIcon :size="14"></LanguageIcon
                  ><span style="margin-left: 3px">检索设置</span></el-button
                ></el-col
              >
            </el-row>
          </div>
          <div class="text-content">
            <el-input
              v-model="text"
              style="width: 100%"
              :rows="2"
              maxlength="200"
              @input="countText"
              type="textarea"
              placeholder="请输入文本，建议使用简短的陈述句"
            />
          </div>
          <div class="text-footer" style="padding: 10px">
            <el-row class="g-flex">
              <el-col :span="12" style="display: flex; justify-content: start">
                <div
                  class="g-flex"
                  style="
                    background-color: #f5f5f5;
                    width: 60px;
                    border-radius: 5px;
                  "
                >
                  <span style="font-size: 14px; font-weight: 600"
                    >{{ current_test_length }}/200</span
                  >
                </div>
              </el-col>
              <el-col :span="12" style="display: flex; justify-content: end">
                <div class="card-main add-app g-unselect" @click="testing">
                  测试
                </div>
              </el-col>
            </el-row>
          </div>
        </div>
        <div style="margin-top: 20px">
          <span style="font-size: 16px; font-weight: 600">最近查询</span>
        </div>
        <div class="recent-table" style="max-height: 200px; overflow: scroll">
          <el-table :data="recent_table">
            <el-table-column prop="source" label="数据源" />
            <el-table-column prop="query" label="源文本" />
            <el-table-column prop="time" label="时间" />
          </el-table>
        </div>
      </el-col>
      <el-col :span="1">
        <el-divider
          style="height: 100%; margin-left: 20px"
          direction="vertical"
        ></el-divider>
      </el-col>
      <el-col :span="11">
        <el-row
          v-if="d.list.length > 0"
          class="no-scroll"
          :gutter="20"
          style="
            max-height: 550px;
            overflow: scroll;
            display: flex;
            justify-content: start;
            align-items: center;
          "
        >
          <el-col
            :span="12"
            style="margin-top: 20px"
            v-for="(item, index) in d.list"
            :key="index"
          >
            <div class="callback-content">
              <div
                style="
                  height: 30px;
                  display: flex;
                  justify-content: start;
                  align-items: center;
                  padding: 5px;
                "
              >
                <el-icon><Aim /></el-icon>
                <el-progress
                  style="width: 100%; margin-left: 10px"
                  :percentage="(Math.round(item.score * 100) / 100) * 100"
                  :duration="4"
                >
                  {{ Math.round(item.score * 100) / 100 }}</el-progress
                >
              </div>
              <div class="no-scroll" style="padding: 10px; max-height: 100px;min-height: 100px; overflow: scroll">
                <span style="font-size: 14px">{{ item.content }}</span>
              </div>
              <div>
                <el-divider class="callback-content-divider"></el-divider>
              </div>
              <el-row class="g-flex">
                <el-col :span="22">
                  <div
                    style="
                      display: flex;
                      justify-content: start;
                      align-items: center;
                      margin: 5px;
                    "
                  >
                    <el-icon><Document /></el-icon
                    ><span style="font-weight: 600">{{
                      item.document.name
                    }}</span>
                  </div>
                </el-col>
                <el-col :span="2"
                  ><el-icon style="cursor: pointer;" @click="changSegment"><Edit /></el-icon
                ></el-col>
              </el-row>
            </div>
          </el-col>
        </el-row>
        <el-empty v-else></el-empty>
      </el-col>
    </el-row>
    <el-dialog
      class="callback-dialog"
      style="border-radius: 10px"
      v-model="dialogParamsVisible"
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
              <el-radio :value="0">混合检索</el-radio>
              <el-radio :value="1">向量检索</el-radio>
              <el-radio :value="2">全文检索</el-radio>
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
    </el-dialog>
  </el-dialog>
</template>
<script lang="ts" setup>
import { ref, watch, reactive, onMounted, getCurrentInstance } from "vue";
import { state } from "@/state";
import LanguageIcon from "@/assets/svg/languageIcon.vue";
import { callbackTesting, getRecentChekingList } from "@/api/ai/index";
import { useRouter, useRoute } from "vue-router";
import tools from "@/utils/tools";
const { proxy }: any = getCurrentInstance();
const route = useRoute();
const dialogTableVisible = ref(false);
const dialogParamsVisible = ref(false);
const text = ref("");
const current_test_length = ref(0);
const recent_table: any = ref([]);
const checking_strategy = ref(0);
const max_callback_count = ref(10);
const min_score = ref(0.5);
const strategy_list = ["hybird", "semantic", "full_text"];
const checking = ref(false);
// 数据主体！！！
const d = reactive({
  list: [] as any,
});

onMounted(async () => {
  const knowledge_id = Number(route.params.knowledge);
  const data = {
    dataset: knowledge_id,
  };
  getRecentChekingList(data).then((res: any) => {
    for (let i = 0; i < res.results.length; i++) {
      recent_table.value.push({
        source: res.results[i].source,
        query: res.results[i].query,
        time: formatDate(res.results[i].add_time),
      });
    }
    console.log(recent_table.value);
  });
});

function changSegment() {
}

function formatDate(isoString: any) {
  const date = new Date(isoString);

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0"); // 月份从0开始，需加1
  const day = String(date.getDate()).padStart(2, "0");

  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}
watch(
  () => state.message,
  (val) => {
    if (val.indexOf("callbackTesting") != -1) {
      dialogTableVisible.value = true;
    }
  }
);
function countText() {
  current_test_length.value = text.value.length;
}
function testing() {
  if (text.value.length === 0) {
    tools.message("源文本不能为空。", proxy);
    return;
  }
  if (checking.value === true) {
    tools.message("正在召回测试中，请稍后", proxy);
    return;
  }
  checking.value = true;
  tools.message("召回测试中，请稍后", proxy);
  const data = {
    query: text.value,
    dataset_id: Number(route.params.knowledge),
    retrieval_strategy: strategy_list[checking_strategy.value],
    k: max_callback_count.value,
    score: min_score.value,
  };
  callbackTesting(data).then((res: any) => {
    d.list = res;
    checking.value = false;
    tools.message("召回测试成功!", proxy);
  });
}
</script>

<style scoped lang="scss">
.callback-content-divider {
  margin: 3px 0px;
}
.my-header {
  padding: 20px;
  padding-bottom: 0px;
  span {
    font-size: 16px;
    font-weight: 600;
  }
}
.callback-content {
  background-color: #f5f5f5;
  height: 200px;
  border-radius: 10px;
}
.checking-btn:hover {
  background-color: #f5f5f5;
  border: 1px solid black;
  color: black;
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
</style>

<style lang="scss">
.text-content {
  .el-textarea {
    textarea {
      all: unset; /* 移除所有默认样式 */
      box-sizing: border-box;
      width: 100%;
      padding: 5px;
      height: 200px;
      font-size: 14px;
      font-weight: 600;
    }
  }
}
.callback-dialog {
  .el-dialog__header {
    padding-bottom: 0px !important;
  }
}
</style>
