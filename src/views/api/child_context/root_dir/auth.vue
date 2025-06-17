<template>
  <el-row style="padding: 10px 0px; font-size: 14px">
    <el-col :span="22" :offset="offset">
      <span>鉴权方式</span>
    </el-col>
  </el-row>
  <el-row style="padding: 10px 0px">
    <el-col :span="9" :offset="offset">
      <el-select v-model="auth_setting.t" placeholder="Select">
        <el-option v-if="hasParent" label="继承父目录" :value="'inherit'">
          <div style="height: 100%">
            <el-row style="height: inherit">
              <el-col :span="20">
                <span>继承父目录</span>
              </el-col>
              <el-col></el-col>
            </el-row>
          </div>
        </el-option>
        <el-option label="无需鉴权" :value="'none'">
          <div style="height: 100%">
            <el-row style="height: inherit">
              <el-col :span="20">
                <span>无需鉴权</span>
              </el-col>
              <el-col></el-col>
            </el-row>
          </div>
        </el-option>
        <el-option label="API Key" :value="'api_key'">
          <div style="height: 100%">
            <el-row style="height: inherit">
              <el-col :span="20">
                <span>API Key</span>
              </el-col>
              <el-col></el-col>
            </el-row>
          </div>
        </el-option>
      </el-select>
    </el-col>
  </el-row>
  <div v-if="auth_setting.t == 'api_key'">
    <el-row style="padding: 10px 0px; font-size: 14px">
      <el-col :span="22" :offset="offset">
        <span>添加位置</span>
      </el-col>
    </el-row>
    <el-row style="padding: 10px 0px">
      <el-col :span="9" :offset="offset">
        <el-select v-model="auth_setting.position" placeholder="Select">
          <el-option
            v-for="item in [
              { label: 'Header', value: 'header' },
              { label: 'Query Params', value: 'query' },
            ]"
            :key="item.value"
            :label="item.label"
            :value="item.value"
          />
        </el-select>
      </el-col>
    </el-row>
    <el-row style="padding: 10px 0px; font-size: 14px">
      <el-col :span="22" :offset="offset">
        <span>Key</span>
      </el-col>
    </el-row>
    <el-row style="padding: 10px 0px">
      <el-col :span="9" :offset="offset">
        <el-input v-model="auth_setting.key"></el-input>
      </el-col>
    </el-row>
    <el-row style="padding: 10px 0px; font-size: 14px">
      <el-col :span="22" :offset="offset">
        <span>Value</span>
      </el-col>
    </el-row>
    <el-row style="padding: 10px 0px">
      <el-col :span="8" :offset="offset">
        <div class="mirror-outside">
          <CodeMirror
            ref="code_mirror"
            v-model="auth_setting.value"
            :enableNewLine="false"
          ></CodeMirror>
        </div>
      </el-col>
      <el-col style="display: flex; margin-left: 20px" :span="2"
        ><Params @insert_action="add_content_to_value"></Params
      ></el-col>
    </el-row>
  </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import CodeMirror from "@/views/api/child_context/code_mirror.vue";
import Params from "@/views/api/child_component/params.vue";
const props = defineProps({
  offset: {
    type: Number,
    default: 1,
  },
  hasParent: {
    type: Boolean,
    default: false,
  },
  auth_setting: {
    type: Object,
    default: {}
  }
});
const auth_method = ref(0);
const api_position = ref(0);
const api_key = ref("");
const api_value = ref("");
const code_mirror: any = ref(null);
function add_content_to_value(content: string) {
  code_mirror.value.add_content(content);
}

defineExpose({
  save,
});

function save() {
  console.log("save");
}
</script>

<style scoped lang="scss">
.mirror-outside {
  display: flex;
  justify-content: start;
  align-items: center;
  width: 100%;
  margin-right: 10px;
  border-radius: 4px;
  height: 30px;
}
</style>
