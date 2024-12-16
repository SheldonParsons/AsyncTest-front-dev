<template>
  <el-row style="height: 70px; display: flex; align-items: center">
    <el-col :span="2"
      ><Wonder
        @click="switchRouter('ai_knowledge_base')"
        style="cursor: pointer"
        contentText="Knowledge!"
      ></Wonder
    ></el-col>
    <el-col
      :span="21"
      style="display: flex"
    >
    <div v-for="(item, index) in bread_list" :key="index" style="display: flex;align-items: center;justify-content: center;">
      <span
        style="
          display: flex;
          align-items: center;
          margin-right: 10px;
          margin-bottom: 3px;
          font-size: 14px;
          font-weight: 600;
        "
        ><el-icon><ArrowRightBold /></el-icon
      ></span>
      <el-breadcrumb style="margin-bottom: 3px" :separator-icon="ArrowRight">
        <el-breadcrumb-item
          ><span
            style="
              font-size: 14px;
              font-weight: 600;
              color: black;
              cursor: pointer;
            "
            @click="go_to(item)"
            >{{ item.name }}</span
          ></el-breadcrumb-item
        >
      </el-breadcrumb>
    </div>
    </el-col>
  </el-row>
  <router-view
    @go_to_document="add_breadcrumb"
    @go_to_segment="add_breadcrumb_segment"
    @clean_bread="clean_bread"
  ></router-view>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { useRouter, useRoute } from "vue-router";
import { ArrowRight } from "@element-plus/icons-vue";
import Wonder from "@/components/common/ai/wonder.vue";
const router: any = useRouter();
const route: any = useRoute();
const bread_list: any = ref({});
const router_mapping: any = {
  knowledge: "ai_knowledge_document",
  segment: "ai_knowledge_document_segment",
};
function go_to(item: any) {
  router.push({ name: router_mapping[item.tag], params: item.params });
}
function add_breadcrumb_segment(
  knowledge_tag: string,
  knowledge_name: string,
  knowledge_params: string,
  document_tag: string,
  document_name: string,
  document_params: string
) {
  bread_list.value = {};
  bread_list.value[knowledge_tag] = {
    name: knowledge_name,
    params: knowledge_params,
    tag: knowledge_tag,
  };
  bread_list.value[document_tag] = {
    name: document_name,
    params: document_params,
    tag: document_tag,
  };
}
function add_breadcrumb(name: string, params: any, tag: string) {
  bread_list.value = {}
  bread_list.value[tag] = {
    name: name,
    params: params,
    tag: tag,
  };
}
function clean_bread() {
  bread_list.value = {};
}
function switchRouter(routerName: string) {
  clean_bread();
  const params = { project: Number(route.params.project) };

  if (router.currentRoute.value.name !== routerName) {
    router.push({ name: routerName, params });
  }
}
</script>

<style lang="scss" scoped></style>

<style lang="scss">
.icon-main {
  .el-breadcrumb__inner {
    width: 100%;
  }
}
</style>
