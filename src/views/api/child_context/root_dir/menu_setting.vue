<template>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-container">
        <div class="function-content">
          <div class="function-message">功能说明</div>
          <div class="function-desc">
            “目录节点”主要用来对项目内的所有接口进行全局设置，如：Auth、前后置操作、唯一标识等。
          </div>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 10px">
    <el-col :offset="1" :span="12">
      <div class="function-visible">
        <div class="function-content">
          <div class="function-message">可见性</div>
          <div
            style="
              color: #667085;
              font-weight: 400;
              font-size: 12px;
              margin-bottom: 0;
            "
          >
            “可见性”主要用来设置文档是否可以对外分享或发布，目录仅可设置为【共享】
          </div>
        </div>
      </div>
    </el-col>
    <el-col :span="2">
      <el-select disabled style="margin-top: 26px" v-model="visibel">
        <template #label="{ label, value }">
          <span
            ><el-icon><Share /></el-icon
          ></span>
          <span style="font-weight: bold; margin-left: 5px">共享</span>
        </template>
        <el-option :key="0" />
      </el-select>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-divider">
        <el-divider />
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-visible">
        <span style="font-size: 16px; font-weight: 500">高级设置</span>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-visible">
        <div style="font-size: 14px; font-weight: 400">服务 (前置URL)</div>
        <div
          style="
            color: #667085;
            font-weight: 400;
            font-size: 12px;
            margin-bottom: 0;
          "
        >
          指定服务后，该目录下的所有接口，运行时都会使用该服务对应的 “前置
          URL”（在环境里设置）。
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-url">
        <div style="font-weight: 500; padding-left: 0.5rem">
          {{ serverDesc }}
        </div>
        <div style="width: 200px">
          <el-select
            v-model="server_value"
            placeholder="服务"
            @change="changeServer"
          >
            <el-option-group
              v-for="(group, index) in serverOptions"
              :key="index"
              :label="group.label"
            >
              <el-option
                class="doc-base-option-mul"
                v-for="item in group.options"
                :key="item.id"
                :label="item.name"
                :value="item.name === '继承父类' ? 'inherit' : item.name"
              >
                <div class="flex items-center">
                  <span>{{ item.name }}</span>
                  <span class="items-server"> {{ item.prefix }} </span>
                </div>
              </el-option>
            </el-option-group>
          </el-select>
        </div>
      </div>
    </el-col>
  </el-row>
  <el-row>
    <el-col :offset="1" :span="14">
      <div class="function-divider">
        <el-divider />
      </div>
    </el-col>
  </el-row>
  <el-row style="margin-top: 10px">
    <el-col :offset="1" :span="11">
      <div class="function-visible">
        <div class="function-content">
          <div class="function-message">目录下的接口唯一标识</div>
          <div
            style="
              color: #667085;
              font-weight: 400;
              font-size: 12px;
              margin-bottom: 0;
            "
          >
            导入数据的时候用来匹配对应的接口
          </div>
        </div>
      </div>
    </el-col>
    <el-col :span="3">
      <el-select disabled style="margin-top: 26px" v-model="visibel">
        <template #label="{ label, value }">
          <span style="font-weight: 400; margin-left: 5px">Method & Path</span>
        </template>
        <el-option :key="0" />
      </el-select>
    </el-col>
  </el-row>
</template>
<script setup lang="ts">
import { ref, onMounted, getCurrentInstance } from "vue";
import { useRoute } from "vue-router";
import { GlobalState } from "@/state/index";
import { ApiGetSummarySource, ApiUpdateDir } from "@/api/interface/index";
import tools from "@/utils/tools";
const route = useRoute();
const { proxy }: any = getCurrentInstance();
const visibel = ref(0);
const serverValue = ref("Test");
const serverDesc = ref("跟随接口设置");
const serverOptions: any = ref([]);
const server_value = ref("default");
const props = defineProps({
  target_type: {
    type: Number,
    default: -1,
  },
  dir: {
    type: Object,
    default: null,
  },
});
onMounted(async () => {
  // changeUrl(serverValue.value);
  const res = await get_source();
  search_and_set_env_by_name(res, GlobalState.user_env);
  server_value.value = props.dir.server;
  changeServer(server_value.value, false);
});

async function changeServer(value: any, send_post = true) {
  if (value === "inherit") {
    serverDesc.value = "跟随父级目录设置（推荐）";
  } else {
    const search_range =
      props.target_type === 0
        ? serverOptions.value[0].options
        : serverOptions.value[1].options;
    for (let i = 0; i < search_range.length; i++) {
      if (search_range[i].name === value) {
        console.log(search_range[i]);

        serverDesc.value = search_range[i].prefix;
        break;
      }
    }
  }
  if (send_post === true) {
    const result = await update_dir({ server: value });
    if (result === false) return;
    tools.message("更新服务成功", proxy, "success");
  }
}

async function update_dir(update_fields: any) {
  const _data = {
    type: 0,
    child_action_type: "update_dir",
    content: {
      id: props.dir.id,
      ...update_fields,
    },
  };
  return await ApiUpdateDir(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

function search_and_set_env_by_name(all_env: any, env_name: string | null) {
  for (let i = 0; i < all_env.length; i++) {
    if (all_env[i].name === env_name) {
      set_server_options(all_env[i].server_mappings);
      break;
    }
  }
}

function set_server_options(server_mappings: any) {
  if (Number(props.target_type) === 0) {
    serverOptions.value = [
      {
        label: "手动指定",
        options: server_mappings,
      },
    ];
  } else {
    serverOptions.value = [
      {
        label: "默认设置",
        options: [
          {
            id: 0,
            name: "继承父类",
            server: "跟随父级目录设置（推荐）",
          },
        ],
      },
      {
        label: "手动指定",
        options: server_mappings,
      },
    ];
  }
}

async function get_source() {
  const _data = {
    project: route.params.project,
    source: "env",
  };
  return await ApiGetSummarySource(_data).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}
</script>

<style scoped lang="scss">
.function-url {
  border: 1px solid #eaecf0;
  border-radius: 14px;
  display: flex;
  color: #344054;
  font-size: 14px;
  font-weight: 400;
  padding: 6px;
  margin-top: 8px;
  justify-content: space-between;
  align-items: center;
  background-color: #f2f4f7;
}
.function-container {
  background-image: url(https://asynctest.oss-cn-shenzhen.aliyuncs.com/static/bg_01.svg);
  background-repeat: no-repeat;
  background-position: center center;
  background-size: cover;
  border: 1px solid #eaecf0;
  margin-top: 20px;
  padding: 16px 20px 20px;
  border-radius: 8px;
}
.function-visible {
  margin-top: 10px;
  padding: 16px 20px 20px;
}
.function-content {
  flex: 1;
  min-width: 0;
  border: 0 solid;
  color: #344054;
  .function-message {
    color: #344054;
    font-weight: 500;
    font-size: 14px;
  }
  .function-desc {
    font-size: 14px;
    line-height: calc(14px + 8px);
  }
}
</style>
