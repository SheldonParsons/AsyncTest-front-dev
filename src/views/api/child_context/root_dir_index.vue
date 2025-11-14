<template>
  <div class="dir-container">
    <div style="display: flex;align-items: center;justify-content: space-between;border-bottom: 1px solid #f0f0f0;">
      <div>
        <SwitchTag :glider="tag" @changeTag="change_tag"></SwitchTag>
      </div>
      <div v-if="tag === 'pre_action' || tag === 'after_action' || tag === 'auth'" style="padding-right: 40px;">
        <el-button @click="save" type="primary">保存</el-button>
      </div>
    </div>
    <div style="overflow-y: hidden;height: 100%;">
      <MenuSetting v-if="tag === 'menu'" :target_type="target_type" :dir="dir"></MenuSetting>
      <InterfaceTable v-if="tag === 'interface'" :target_type="target_type" :dir="dir" :node_id="node_id">
      </InterfaceTable>
      <PreAction ref="pre_action_ref" v-if="tag === 'pre_action'" :offset="1" :span="22"
        v-model="dir.pre_actions.elements" :father-actions="dir.pre_actions.father_actions"
        :hasFatherActions="target_type === 0 ? false : true"></PreAction>
      <AfterAction ref="after_action_ref" v-if="tag === 'after_action'" :offset="1" :span="22"
        v-model="dir.after_actions.elements" :father-actions="dir.after_actions.father_actions"
        :hasFatherActions="target_type === 0 ? false : true"></AfterAction>
      <el-row>
        <el-col :offset="1" :span="22">
          <div class="body-tools" v-if="tag === 'auth'">
            <div class="title">鉴权设置(暂不可用)</div>
          </div>
          <div v-if="tag === 'auth'" class="auth-outside">
            <Auth :auth_setting="dir.auth" ref="auth_ref" :offset="0" :hasParent="target_type === 0 ? false : true">
            </Auth>
          </div>
        </el-col>
      </el-row>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, getCurrentInstance, onMounted } from "vue";
import SwitchTag from "@/views/api/child_component/switch_tag.vue";
import MenuSetting from "./root_dir/menu_setting.vue";
import InterfaceTable from "@/views/api/child_context/root_dir/interface_table.vue";
import PreAction from "./root_dir/pre_action.vue";
import AfterAction from "./root_dir/after_action.vue";
import Auth from "./root_dir/auth.vue";
import tools from "@/utils/tools";
import { ApiGetSingleDir, ApiUpdateDir } from "@/api/interface/index";

const dir: any = ref({});

const props = defineProps({
  node_id: {
    type: Number,
    default: null,
  },
  dir_id: {
    type: Number,
    default: null,
  },
  target_type: {
    type: Number,
    default: -1,
  },
});

onMounted(async () => {
  dir.value = await get_dir();
  tag.value = "menu";
});

async function get_dir() {
  return await ApiGetSingleDir(props.dir_id, {}).then((res: any) => {
    const checking = tools.result_check(res, proxy);
    if (checking === true) {
      return res;
    } else {
      return checking;
    }
  });
}

async function update_dir(update_fields: any) {
  console.log(update_fields);

  const _data = {
    type: 0,
    child_action_type: "update_dir",
    content: {
      id: dir.value.id,
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

const { proxy }: any = getCurrentInstance();

const tag = ref("default");

const pre_action_ref: any = ref(null);

const after_action_ref: any = ref(null);

const auth_ref: any = ref(null);

function change_tag(t: string) {
  tag.value = t;
}

async function save() {
  if (
    tag.value === "pre_action" ||
    tag.value === "after_action" ||
    tag.value === "auth"
  ) {
    const result = await update_dir({
      pre_actions: dir.value.pre_actions,
      after_actions: dir.value.after_actions,
      auth: dir.value.auth,
    });
    if (result === false) return;
    tools.message("保存成功", proxy, "success");
  }
}
</script>

<style scoped lang="scss">
.dir-container {
  display: flex;
  flex-direction: column;
  overflow: auto;
  height: 100%;
}

.body-tools {
  margin-top: 20px;
  display: flex;
  justify-content: space-between;
  border-top: 1px solid var(--border-color);
  border-left: 1px solid var(--border-color);
  border-right: 1px solid var(--border-color);
  border-top-left-radius: 8px;
  border-top-right-radius: 8px;
  padding: 7px 12px;

  .title {
    font-size: 14px;
    font-weight: 500;
    display: flex;
    align-items: center;
  }
}

.auth-outside {
  border: 1px solid var(--border-color);
  border-bottom-left-radius: 8px;
  border-bottom-right-radius: 8px;
  padding: 10px;
}
</style>
