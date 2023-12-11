<template>
  <div class="content">
    <el-row class="title-row">
      <el-col class="title-col" :span="20"
        ><span class="static-title">{{ $t('log.title') }}</span></el-col
      >
    </el-row>
    <div
      v-if="loaded"
      :infinite-scroll-disabled="disInfinite"
      v-infinite-scroll="getData"
    >
      <el-row
        class="content-row"
        v-for="(item, index) in infoList.list"
        :key="index"
      >
        <el-col class="content-col" :span="20">
          <el-row class="header" align="middle">
            <el-col class="code" :offset="1" :span="17" :md="19" :sm="17"
              ><span>{{ item.code }}</span>
              <el-tag
                v-if="index === 0"
                style="margin-left: 10px; vertical-align: top"
                type="success"
                class="mx-1"
                effect="plain"
                round
              >
                {{ $t('log.latest') }}
              </el-tag></el-col
            >
            <el-col class="date" :span="6" :md="4" :sm="6">{{
              tools.getLocaleDateTime(item.add_time)
            }}</el-col>
          </el-row>
          <el-row
            class="main"
            align="middle"
            v-for="(tag, tagIndex) in item.tag_list"
            :key="tagIndex"
            style="padding-top: 30px"
          >
            <el-col :offset="1" :span="23">
              <span style="font-size: 18px; font-weight: 700">{{
                getCurrentLanguage() ? tag.en_name : tag.name
              }}</span>
            </el-col>
            <el-row style="width: 100%">
              <el-col
                :offset="1"
                :span="23"
                style="padding: 30px 30px 15px"
                v-for="(subTag, subTagIndex) in tag.sub_tag_list"
                :key="subTagIndex"
              >
                <el-row style="padding-bottom: 15px">
                  <el-col
                    ><span class="light-text" style="font-size: 18px">{{
                      getCurrentLanguage() ? subTag.en_name : subTag.name
                    }}</span></el-col
                  >
                </el-row>
                <el-row>
                  <el-col
                    ><el-col
                      :span="23"
                      style="padding: 17px 0px 0px 0px"
                      v-for="(content, contentIndex) in subTag.content_list"
                      :key="contentIndex"
                    >
                      <span style="font-size: 16px"
                        >{{
                          getCurrentLanguage()
                            ? content.en_content
                            : content.content
                        }}（By
                        <span class="light-text"
                          >@{{ content.bak_user.split('、').join(' @') }}</span
                        >）</span
                      >
                    </el-col></el-col
                  >
                </el-row>
              </el-col>
            </el-row>
          </el-row>
        </el-col>
      </el-row>
    </div>
    <el-empty v-else :image-size="200" />
    <!-- <el-row>
      <el-col :span="24"
        ><h2>{{ $t('about.source') }}</h2></el-col
      >
    </el-row>
    <el-row align="middle">
      <el-col :span="24"
        ><p style="line-height: 1.7">
          <a
            class="source-a"
            target="_blank"
            href="http://10.2.59.79:10101/summary/~a80646%2FAsyncTest-front.git"
            >{{ $t('about.front')
            }}<el-icon class="source-icon"><Link /></el-icon
          ></a>
          •
          <a
            class="source-a"
            target="_blank"
            href="http://10.2.59.79:10101/summary/~a80646%2FAsyncTest-server.git"
            >Django<el-icon class="source-icon"><Link /></el-icon
          ></a></p
      ></el-col>
    </el-row> -->
    <el-row>
      <el-col :span="24"
        ><h2>{{ $t('about.contributor') }}</h2></el-col
      >
    </el-row>
    <el-row>
      <el-col :span="3">
        <el-tooltip
          effect="dark"
          :content="$t('about.contact') + ' +86 137 0294 2404'"
          placement="top"
          ><div class="contributor-div">
            <img class="contributor-img" src="@/assets/img/sheldon.jpg" /><span
              class="contributor-name"
              style="margin-left: 10px; font-weight: 500"
              >Sheldon</span
            >
          </div>
        </el-tooltip>
      </el-col>
      <el-col :span="3">
        <el-tooltip
          effect="dark"
          :content="$t('about.contact') + ' +86 132 4481 6296'"
          placement="top"
          ><div class="contributor-div">
            <img class="contributor-img" src="@/assets/img/haoppy.jpg" /><span
              class="contributor-name"
              style="margin-left: 10px; font-weight: 500"
              >Haoppy</span
            >
          </div>
        </el-tooltip>
      </el-col>
      <el-col :span="3">
        <el-tooltip
          effect="dark"
          :content="$t('about.contact') + ' +86 166 2621 9785'"
          placement="top"
          ><div class="contributor-div">
            <img class="contributor-img" src="@/assets/img/jiaxin.jpg" /><span
              class="contributor-name"
              style="margin-left: 10px; font-weight: 500"
              >JiaXin</span
            >
          </div>
        </el-tooltip>
      </el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, reactive, getCurrentInstance } from 'vue'
import { ApiGetUpdateInfo } from '@/api/about/index'
import tools from '@/utils/tools'
import { useI18n } from 'vue-i18n'
const { t } = useI18n()

// 数据主体！！！
const infoList = reactive({
  list: [] as any
})

const loaded = ref(false)

// 是否禁用无限滚动
const disInfinite = ref(false)
// 永久禁止无限滚动
const alwaysDisInfinite = ref(false)
// 当前页码
const currentPage = ref(1)
// 当前页码大小
const currentPageSize = ref(3)
// 全局对象
const { proxy }: any = getCurrentInstance()

onMounted(() => {
  infoList.list = []
  getData()
})

// 切换无限滚动
function switchInfiniteScroll() {
  if (alwaysDisInfinite.value) {
    disInfinite.value = true
    return
  }
  disInfinite.value = !disInfinite.value
}

async function getData() {
  switchInfiniteScroll()

  const res = await getUpdateInfo(currentPage.value, currentPageSize.value)
  if (!res) {
    switchInfiniteScroll()
    return
  }
  currentPage.value += currentPageSize.value / 3
  infoList.list = infoList.list.concat(res)
  loaded.value = true
  switchInfiniteScroll()
}

async function getUpdateInfo(page: Number, size: Number) {
  const data = {
    page,
    size
  }
  return ApiGetUpdateInfo(data).then((res: any) => {
    if (res.detail || res.results.length === 0) {
      tools.message(t('response.lessData'), proxy)
      alwaysDisInfinite.value = true
      return false
    }
    return res.results
  })
}

function getCurrentLanguage() {
  return t('language.current') === 'en'
}
</script>

<style lang="scss" scoped>
.content {
  font-family: Helvetica Neue, Helvetica, PingFang SC, Hiragino Sans GB,
    Microsoft YaHei, SimSun, sans-serif;
  padding-top: 50px;
  padding-left: 10%;
  padding-bottom: 50px;
  .content-row {
    padding-bottom: 15px;
    margin-bottom: 50px;
  }
  .title-row {
    .static-title {
      font-size: 24px;
      color: #333;
    }
    .title-col {
      margin-bottom: 60px;
    }
  }
  .content-col {
    border: 2px solid transparent;
    border-radius: 5px;
    background-clip: padding-box, border-box;
    background-origin: padding-box, border-box;
    background-image: linear-gradient(to right, #ffffff, #ffffff),
      linear-gradient(
        90deg,
        var(--global-theme-color),
        var(--global-theme-light-color)
      );
    .header {
      height: 67px;
      border-radius: 5px;
      border-bottom: 2px solid transparent;
      background-clip: padding-box, border-box;
      background-origin: padding-box, border-box;
      background-image: linear-gradient(to right, #ffffff, #ffffff),
        linear-gradient(
          90deg,
          var(--global-theme-color),
          var(--global-theme-light-color)
        );
      .code {
        font-size: 20px;
        opacity: 1;
        color: #333;
        font-weight: 700;
      }
      .date {
        color: #666;
        font-size: 16px;
        font-style: normal;
      }
    }
    .light-text {
      color: var(--el-color-primary);
    }
  }
}
.contributor-name {
  cursor: default;
}
.contributor-name:hover {
  color: var(--el-color-primary);
}
.source-a {
  white-space: nowrap;
  word-break: keep-all;
  display: line-flex;
  align-items: center;
  font-weight: 500;
  color: var(--global-theme-color);
  text-decoration: inherit;
  .source-icon {
    margin-left: 0.25rem;
    height: 1em;
    width: 1em;
    box-sizing: border-box;
    top: 2px;
  }
}
.contributor-div {
  display: flex;
  flex-direction: row;
  align-items: center;
  .contributor-img {
    border-radius: 9999px;
    width: 2rem;
    height: 2rem;
    border-style: none;
  }
}
</style>
