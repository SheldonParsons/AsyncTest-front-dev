<template>
  <div v-if="api && api.length > 0">
    <el-row
      v-for="item in api"
      :key="item.id"
      style="width: 75%; padding: 64px 0px 42px 64px"
      class="main"
    >
      <el-col :span="23">
        <h1 style="">{{ getCurrentLanguage() ? item.name : item.en_name }}</h1>
      </el-col>
      <el-col :span="23">
        <p>{{ getCurrentLanguage() ? item.desc : item.en_desc }}</p>
      </el-col>
      <el-col :span="24">
        <div class="server-tips">
          <span class="title">{{ $t('apiServer.tips') }}</span>
          <pre><div
                v-html="getCurrentLanguage() ? item.tips : item.en_tips"
                style="white-space: pre-wrap"
                class="content tips-text"
              /></pre>
        </div>
      </el-col>
      <el-row
        style="margin-top: 30px"
        v-for="(child, childIndex) in item.child_list"
        :key="child.id"
      >
        <div v-if="child.name" class="request">
          <el-col :span="24">
            <h2>
              {{ childIndex + 1
              }}{{
                getCurrentLanguage() ? '、' + child.name : '.' + child.en_name
              }}
            </h2>
          </el-col>
          <el-col :span="24">
            <p class="desc-p">
              {{ getCurrentLanguage() ? child.desc : child.en_desc
              }}<el-tooltip
                class="box-item"
                effect="light"
                :content="t('tooltip.buildInMethod')"
                placement="bottom"
              >
                <el-icon
                  v-if="item.type === 3 && childIndex === 2"
                  @click="showDialog = true"
                  class="method-info"
                  ><InfoFilled
                /></el-icon>
              </el-tooltip>
            </p>
          </el-col>
          <el-col
            v-for="(item, index) in (getCurrentLanguage()
              ? child.tips
              : child.en_tips
            ).split('%*%')"
            :key="index"
            :span="24"
          >
            <div class="server-tips">
              <span class="title">{{ $t('apiServer.tips') }}</span>
              <pre><div
                v-html="item"
                style="white-space: pre-wrap"
                class="content tips-text"
              /></pre>
            </div>
          </el-col>
          <el-row v-if="child.res" align="middle" style="margin-top: 30px">
            <el-col :span="24">
              <el-divider content-position="left"
                ><h3>{{ $t('apiServer.example') }}</h3></el-divider
              >
            </el-col>
          </el-row>
          <el-row v-if="child.res" align="middle" class="request-info">
            <el-col :span="0" :md="3" :sm="0" :offset="1"
              ><h3 class="request-title">
                {{ httpMethod[child.method] }}
              </h3></el-col
            >
            <el-col :span="24" :md="20" :sm="24">
              <p class="request-content">{{ child.url }}</p></el-col
            >
          </el-row>
          <el-row v-if="child.res" align="middle" class="request-info">
            <el-col :span="0" :md="3" :sm="0" :offset="1"
              ><h3 class="request-title">Headers</h3></el-col
            >
            <el-col :span="24" :md="20" :sm="24">
              <VueJsonPretty :data="child.headers" />
            </el-col>
          </el-row>
          <el-row
            v-if="child.body !== '' && child.res"
            align="middle"
            class="request-info"
          >
            <el-col :span="0" :md="3" :sm="0" :offset="1"
              ><h3 class="request-title">Body</h3></el-col
            >
            <el-col :span="24" :md="20" :sm="24">
              <VueJsonPretty :data="child.body" />
            </el-col>
          </el-row>
          <el-row v-if="child.res" align="middle" class="response-info">
            <el-col :span="0" :md="3" :sm="0" :offset="1"
              ><h3 class="response-title">Response</h3></el-col
            >
            <el-col :span="24" :md="20" :sm="24">
              <VueJsonPretty :data="child.res" />
            </el-col>
          </el-row>
        </div>
      </el-row>
    </el-row>
  </div>
  <el-empty v-else :image-size="200" style="margin-top: 100px" />
  <CommonDialog
    :dialog="showDialog"
    @closed="showDialog = !showDialog"
    :headerText="t('project.MockCol.dialogHeader')"
  >
    <CommonTable
      :cols="[
        t('project.buildInCol.buildIn'),
        t('project.buildInCol.desc'),
        t('project.buildInCol.demo')
      ]"
    ></CommonTable>
  </CommonDialog>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useI18n } from 'vue-i18n'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'
import CommonDialog from '@/components/layout/dialogs/commonDialog.vue'
import CommonTable from '@/components/layout/tables/commonTable.vue'
const { t } = useI18n()
const showDialog = ref(false)

defineProps({
  api: Object
})

const httpMethod = ['Get', 'Post', 'Delete', 'Put']

function getCurrentLanguage() {
  return t('language.current') === 'zh'
}
</script>

<style lang="scss" scoped>
.main {
  line-height: 30px;
  .server-tips {
    width: 100%;
    border-left: 4px solid transparent;
    // border-radius: 0px;
    border-top-right-radius: 5px;
    border-bottom-right-radius: 5px;
    background-clip: padding-box, border-box;
    background-origin: padding-box, border-box;
    background-image: linear-gradient(
        to right,
        var(--el-color-primary-light-9),
        var(--el-color-primary-light-8)
      ),
      linear-gradient(
        90deg,
        var(--global-theme-light-color),
        var(--global-theme-color)
      );
    margin: 20px 0px;
    padding: 8px 0px 8px 16px;
    .title {
      font-size: 16px;
      font-weight: 700;
    }
    .content {
      // padding-top: 20px;
      padding-right: 20px;
      line-height: 25px;
    }
  }
  .vjs-tree {
    font-size: 16px;
    padding: 15px 0px;
  }
  .tips-text {
    font-size: 1rem;
  }
  .method-info {
    font-size: 20px;
    cursor: pointer;
  }
  .desc-p {
    display: flex;
    align-items: center;
  }
  .request {
    .response-info {
      border: 2px solid transparent;
      border-radius: 5px;
      background-clip: padding-box, border-box;
      background-origin: padding-box, border-box;
      background-image: linear-gradient(to right, #ffffff, #ffffff),
        linear-gradient(90deg, #fd8403, #ff9803);
      margin-bottom: 15px;
    }
    .request-info {
      border: 2px solid transparent;
      border-radius: 5px;
      background-clip: padding-box, border-box;
      background-origin: padding-box, border-box;
      background-image: linear-gradient(to right, #ffffff, #ffffff),
        linear-gradient(
          90deg,
          var(--global-theme-light-color),
          var(--global-theme-color)
        );
      margin-bottom: 15px;
    }

    .request-title {
      cursor: default;
      //   font-size: 24px;
      background-image: -webkit-linear-gradient(
        bottom,
        var(--el-color-primary-dark-2),
        var(--el-color-primary-light-3)
      );
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
    }
    .request-content {
      font-size: 20px;
    }
  }
}
</style>
