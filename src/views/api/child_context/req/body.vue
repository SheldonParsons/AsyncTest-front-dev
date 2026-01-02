<template>
  <el-row style="margin-top: 20px">
    <el-col :span="24" class="table-col">
      <el-row style="margin-bottom: 1%">
        <el-col :span="24">
          <el-radio-group
            v-model="bodyType"
            @change="changeBodyType"
            is-button
            class="body-type-radio"
          >
            <el-radio-button label="none" value="none" />
            <el-radio-button label="form-data" value="form-data" />
            <el-radio-button
              label="x-www-form-urlencoded"
              value="x-www-form-urlencoded"
            />
            <el-radio-button label="json" value="json" />
            <!-- <el-radio-button label="xml" value="xml" /> -->
            <el-radio-button label="raw" value="raw" />
          </el-radio-group>
        </el-col>
      </el-row>
      <el-row v-if="bodyType == 'none'">
        <el-col :span="24">
          <div class="empty-body g-unselect">
            <span>该请求不传入body内容</span>
          </div>
        </el-col>
      </el-row>
      <div v-show="bodyType === 'json'">
        <JsonBody
          @exchange_json_value="handleExchangeJsonBodyValue"
          :tableData="props.tableData"
          :interface="interface"
          :inOuter="inOuter"
        ></JsonBody>
      </div>
      <div v-show="bodyType === 'x-www-form-urlencoded'">
        <WwwBody
          :tableData="props.wwwData"
          :interface="interface"
        ></WwwBody>
      </div>
      <div v-if="bodyType === 'form-data'">
        <FormDataBody
          :tableData="props.formData"
          :interface="interface"
        ></FormDataBody>
      </div>
      <div v-show="bodyType === 'raw'">
        <RawBody
          :code="props.code"
          @update="change_raw_body"
          :interface="interface"
        ></RawBody>
      </div>
    </el-col>
  </el-row>
</template>
<script lang="ts" setup>
import { toRef, watch } from "vue";
import JsonBody from "./body_child/json_body.vue";
import WwwBody from "./body_child/www_body.vue";
import FormDataBody from './body_child/form_data_body.vue'
import RawBody from './body_child/raw_body.vue'
const emit = defineEmits(["exchange_json_body_value", "change_raw_body", "change_body_type"]);
function handleExchangeJsonBodyValue(json_string: string, convert: Function) {
  emit("exchange_json_body_value", json_string, convert);
}
function change_raw_body(code: string) {
  emit("change_raw_body", code);
}
// 定义组件属性
const props = defineProps<{
  tableData: any[]; // 定义tableData属性为一个数组
  wwwData: any[];
  formData: null;
  code: string,
  bodyType: any,
  interface: number,
  inOuter:any
}>();

const bodyType = toRef(props, 'bodyType');

const changeBodyType = (label: string) => {
  emit("change_body_type", label);
};
</script>
<style lang="scss" scoped>
.empty-body {
  border: 1px solid #dcdfe6;
  border-radius: 5px;
  height: 50px;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #909399;
  font-size: 14px;
  cursor: not-allowed;
}
</style>
