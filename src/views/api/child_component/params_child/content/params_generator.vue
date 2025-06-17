<template>
  <el-row style="width: 100%">
    <el-col :span="24">
      <div
        style="padding: 10px; background-color: #f9fafb; border-radius: 10px"
      >
      <div @click.stop>
        <el-cascader
          v-model="function_content"
          @change="handleChange"
          :options="generator_tree"
          placeholder="选择一个动态值函数"
          size="small"
          style="width: 100%"
          @click.stop
        >
          <template #default="{ node, data }" @click.stop>
            <span v-if="!node.isLeaf">{{ data.label }}</span>
            <span v-if="node.isLeaf"> {{ data.label }}({{ data.value }}) </span>
          </template>
        </el-cascader>
      </div>
        <div
          v-if="current_function !== null"
          v-for="(item, index) in get_content(
            input_content_mapping[current_function]
          )"
          :key="index"
          style="width: 100%"
        >
          <el-row style="margin-top: 10px">
            <el-col :span="24">
              <div class="content-name">{{ item.name }}</div>
            </el-col>
          </el-row>
          <el-row>
            <el-col :span="24">
              <el-input-number
                style="width: 100%"
                @change="content_function"
                v-if="item.type === 'number'"
                v-model="item.value"
                :min="item.min"
                :max="item.max"
                :step="item.step"
                size="small"
                :placeholder="item.placeholder"
                controls-position="right"
              />
              <el-select
                @change="content_function"
                v-if="item.type === 'select'"
                v-model="item.value"
                :placeholder="item.placeholder"
                size="small"
              >
                <el-option
                  v-for="select_item in item.options"
                  :key="select_item.value"
                  :label="select_item"
                  :value="select_item"
                />
              </el-select>
              <el-input
                @input="content_function"
                v-if="item.type === 'input'"
                v-model="item.value"
                size="small"
                :placeholder="item.placeholder"
              />
            </el-col>
          </el-row>
        </div>
      </div>
    </el-col>
  </el-row>
  <div
    v-if="current_function === null"
    style="
      display: flex;
      justify-content: center;
      align-items: center;
      height: 100px;
    "
  >
    <Empty></Empty>
  </div>
  <div class="insert-main">
    <div class="process-func" v-if="can_insert">
      <div class="process-container" v-if="process_list.length > 0">
        <div
          v-for="(item, index) in process_list"
          :key="index"
          @mouseover="hover_process = index"
          @mouseleave="hover_process = -1"
          @click="eidt_process_function_dialog(item, index)"
          class="process-item"
        >
          <el-row style="height: 100%">
            <el-col
              style="display: flex; justify-content: start; align-items: center"
              :span="11"
              ><span style="font-size: 12px; color: black">{{
                item.function_sign
              }}</span></el-col
            >
            <el-col
              style="display: flex; justify-content: end; align-items: center"
              :span="11"
              ><span style="font-size: 12px; color: #667085">{{
                item.desc
              }}</span></el-col
            >
            <el-col
              v-if="hover_process !== index"
              :span="2"
              style="display: flex; align-items: center; justify-content: end"
              ><el-icon :size="12"><ArrowRight /></el-icon
            ></el-col>
            <el-col
              v-if="hover_process === index"
              :span="2"
              style="display: flex; align-items: center; justify-content: end"
            >
              <div class="del-process" @click.stop="delete_process_item(index)">
                <el-icon :size="12"><CloseBold /></el-icon>
              </div>
            </el-col>
          </el-row>
        </div>
      </div>
      <button class="add-btn" @click="open_process_function_dialog">
        <el-icon><Plus /></el-icon><span>添加处理函数</span>
      </button>
    </div>
    <div class="expression" v-if="can_insert">
      <el-row style="width: 100%">
        <el-col :span="24"
          ><div class="exp-div">
            表达式:
            <el-tooltip placement="top" effect="light">
              <template #content>
                <div
                  style="
                    max-width: 300px;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  "
                >
                  {{ exp }}
                </div>
              </template>
              <div class="exp-span" style="font-weight: 500" @click="copy(exp)">{{ exp }}</div>
            </el-tooltip>
          </div></el-col
        >
      </el-row>
      <el-row style="width: 100%; margin-top: 7px">
        <el-col :span="24"
          ><div class="exp-div">
            预览:
            <el-tooltip placement="top" effect="light">
              <template #content>
                <div
                
                  style="
                    max-width: 300px;
                    word-wrap: break-word;
                    overflow-wrap: break-word;
                  "
                >
                  {{ preview }}
                </div>
              </template>
              <div class="exp-span" style="font-weight: 500" @click="copy(preview)">{{ preview }}</div>
            </el-tooltip>
          </div></el-col
        >
      </el-row>
    </div>
    <div class="process-btn">
      <button @click="insert"><span>插入</span></button>
    </div>
  </div>
  <ProcessFunction
    ref="process_function_component"
    @add_process_function="add_process_function"
    @edit_process_function="edit_process_function"
  ></ProcessFunction>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, getCurrentInstance } from "vue";
import ProcessFunction from "../dialog_page/process_function.vue";
import * as InnerFunction from "../dialog_page/inner_function";
import * as GeneratorFunctions from "./generator_functions";
import tools from "@/utils/tools";
import Empty from "../comp/empty.vue";
import useClipboard from 'vue-clipboard3/dist/esm/index.js'
const { proxy }: any = getCurrentInstance();
const params = ref("");
const hover_process: any = ref(-1);
const process_list: any = ref([]);
const exp = ref("");
const process_function_component: any = ref(null);
const preview = ref("");
const can_insert = ref(false);
const content_value:any = ref(null)
const emit = defineEmits(["reload_height", "insert_action"]);
const cache_process_item_index: any = ref(null);
const function_content: any = ref([]);
const current_function: any = ref(null);
const generator_tree: any = ref([
  {
    value: "base",
    label: "基础类型",
    children: [
      {
        value: "boolean",
        label: "布尔",
      },
      {
        value: "natural",
        label: "自然数",
      },
      {
        value: "integer",
        label: "整数",
      },
      {
        value: "float",
        label: "浮点数",
      },
      {
        value: "string",
        label: "字符串",
      },
      {
        value: "character",
        label: "单字符",
      },
    ],
  },
  {
    value: "time",
    label: "日期/时间",
    children: [
      {
        value: "date",
        label: "日期",
      },
      {
        value: "datetime",
        label: "日期时间",
      },
      {
        value: "now",
        label: "当前时间（支持偏移）",
      },
      {
        value: "time",
        label: "时间",
      },
      {
        value: "timestamp",
        label: "时间戳",
      },
    ],
  },
  {
    value: "personal_info",
    label: "个人信息",
    children: [
      {
        value: "id",
        label: "身份证号",
      },
      {
        value: "qq",
        label: "QQ号",
      },
      {
        value: "phone",
        label: "国内手机号",
      },
      {
        value: "landline",
        label: "国内固话",
      },
      {
        value: "gender",
        label: "中文性别",
      },
    ],
  },
  {
    value: "chinese_name",
    label: "中文姓名",
    children: [
      {
        value: "cname",
        label: "中文姓名",
      },
      {
        value: "cfirst",
        label: "中文姓",
      },
      {
        value: "clast",
        label: "中文名",
      },
    ],
  },
  {
    value: "english_name",
    label: "英文姓名",
    children: [
      {
        value: "name",
        label: "姓名",
      },
      {
        value: "first",
        label: "英文人名",
      },
      {
        value: "last",
        label: "英文姓",
      },
    ],
  },
  {
    value: "chinese_text",
    label: "中文文本",
    children: [
      {
        value: "ctitle",
        label: "中文标题",
      },
      {
        value: "cword",
        label: "中文单字",
      },
      {
        value: "cparagraph",
        label: "中文大段文本",
      },
      {
        value: "csentence",
        label: "中文句子",
      },
    ],
  },
  {
    value: "english_text",
    label: "英文文本",
    children: [
      {
        value: "paragraph",
        label: "大段文本",
      },
      {
        value: "sentence",
        label: "句子",
      },
      {
        value: "word",
        label: "单词",
      },
      {
        value: "title",
        label: "标题",
      },
    ],
  },
  {
    value: "address",
    label: "地址相关",
    children: [
      {
        value: "region",
        label: "区域",
      },
      {
        value: "province",
        label: "省份",
      },
      {
        value: "city",
        label: "城市",
      },
      {
        value: "county",
        label: "地区",
      },
      {
        value: "zip",
        label: "邮编",
      },
    ],
  },
  {
    value: "web",
    label: "Web 相关",
    children: [
      {
        value: "email",
        label: "Email",
      },
      {
        value: "ip",
        label: "ip地址",
      },
      {
        value: "url",
        label: "网址",
      },
      {
        value: "domain",
        label: "域名",
      },
      {
        value: "protocol",
        label: "协议",
      },
      {
        value: "tld",
        label: "顶级域名",
      },
    ],
  },
  {
    value: "picture",
    label: "图片",
    children: [
      {
        value: "dataimage",
        label: "图片data",
      },
    ],
  },
  {
    value: "color",
    label: "颜色",
    children: [
      {
        value: "color",
        label: "颜色",
      },
      {
        value: "hex",
        label: "颜色hex",
      },
      {
        value: "rgba",
        label: "颜色rgba",
      },
      {
        value: "rgb",
        label: "颜色rgb",
      },
      {
        value: "hsl",
        label: "颜色hsl",
      },
    ],
  },
  {
    value: "regex",
    label: "正则表达式",
    children: [
      {
        value: "regexp",
        label: "正则表达式",
      },
    ],
  },
  {
    value: "other",
    label: "其他",
    children: [
      {
        value: "increment",
        label: "自增ID",
      },
      {
        value: "guid",
        label: "GUID",
      },
      {
        value: "uuid",
        label: "UUID",
      },
      {
        value: "upper",
        label: "转换为大写",
      },
      {
        value: "lower",
        label: "转换为小写",
      },
      {
        value: "pick",
        label: "多选一",
      },
      {
        value: "shuffle",
        label: "打乱数组",
      },
    ],
  },
]);

const input_content_mapping: any = ref({
  boolean: {
    func: GeneratorFunctions.generateBoolean,
    fields: [
      {
        name: "CUR Rate",
        placeholder: "min",
        value: null,
        type: "number",
        min: 0,
        max: 100,
        params_type: "number",
        step: 1,
      },
      {
        name: "!CUR Rate",
        placeholder: "max",
        value: null,
        type: "number",
        params_type: "number",
        min: 0,
        max: 100,
        step: 1,
      },
      {
        name: "CUR value",
        placeholder: "cur",
        value: "true",
        type: "select",
        params_type: "string",
        options: ["true", "false"],
      },
    ],
  },
  natural: {
    func: GeneratorFunctions.generateNaturalNumber,
    fields: [
      {
        name: "Min",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 1000000000000,
        params_type: "number",
        step: 1,
      },
      {
        name: "Max",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 100000000000000000000,
        params_type: "number",
        step: 1,
      },
    ],
  },
  integer: {
    func: GeneratorFunctions.generateInteger,
    fields: [
      {
        name: "Min",
        placeholder: "min",
        value: null,
        type: "number",
        min: -100000000000000000000,
        max: 100000000000000000000,
        params_type: "number",
        step: 1,
      },
      {
        name: "Max",
        placeholder: "max",
        value: null,
        type: "number",
        min: -100000000000000000000,
        max: 100000000000000000000,
        params_type: "number",
        step: 1,
      },
    ],
  },
  float: {
    func: GeneratorFunctions.generateFloat,
    fields: [
      {
        name: "整数部分最小值",
        placeholder: "min",
        value: null,
        type: "number",
        min: -100000000000000000000,
        max: 100000000000000000000,
        params_type: "number",
        step: 1,
      },
      {
        name: "整数部分最大值",
        placeholder: "min",
        value: null,
        type: "number",
        min: -100000000000000000000,
        max: 100000000000000000000,
        params_type: "number",
        step: 1,
      },
      {
        name: "小数部分最小位数",
        placeholder: "dmin",
        value: null,
        type: "number",
        min: 1,
        max: 12,
        params_type: "number",
        step: 1,
      },
      {
        name: "小数部分最大位数",
        placeholder: "dmax",
        value: null,
        type: "number",
        min: 1,
        max: 12,
        params_type: "number",
        step: 1,
      },
    ],
  },
  string: {
    func: GeneratorFunctions.generateString,
    fields: [
      {
        name: "字符池",
        placeholder: "字符池/lower/upper/number/symbol",
        value: "",
        type: "input",
        params_type: "string",
      },
      {
        name: "最小长度",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 1000,
        params_type: "number",
        step: 1,
      },
      {
        name: "最大长度",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 1000,
        params_type: "number",
        step: 1,
      },
    ],
  },
  character: {
    func: GeneratorFunctions.generateCharacter,
    fields: [
      {
        name: "字符池",
        placeholder: "字符池/lower/upper/number/symbol",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  date: {
    func: GeneratorFunctions.generateRandomDate,
    fields: [
      {
        name: "日期格式",
        placeholder: "yyyy-MM-dd",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  datetime: {
    func: GeneratorFunctions.generateRandomTime,
    fields: [
      {
        name: "时间格式",
        placeholder: "yyyy-MM-dd HH:mm:ss",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  now: {
    func: GeneratorFunctions.getCurrentTime,
    fields: [
      {
        name: "时间单元",
        placeholder: "unit",
        value: "year",
        type: "select",
        params_type: "string",
        options: ["year", "month", "week", "day", "hour", "minute", "second"],
      },
      {
        name: "时间格式",
        placeholder: "yyyy-MM-dd HH:mm:ss",
        value: "",
        type: "input",
        params_type: "string",
      },
      {
        name: "时间偏移",
        placeholder: "如：-2 day",
        value: "",
        type: "input",
        params_type: "string",
      },
      {
        name: "设置时间模式",
        placeholder: "start/end",
        value: "start",
        type: "select",
        params_type: "string",
        options: ["start", "end"],
      },
    ],
  },
  time: {
    func: GeneratorFunctions.generateRandomTimeOnly,
    fields: [
      {
        name: "时间格式",
        placeholder: "HH:mm:ss",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  timestamp: {
    func: GeneratorFunctions.generateTimestamp,
    fields: [
      {
        name: "格式(s:秒|ms:毫秒)",
        placeholder: "s/ms",
        value: "s",
        type: "select",
        params_type: "string",
        options: ["s", "ms"],
      },
    ],
  },
  id: {
    func: GeneratorFunctions.generateRandomID,
    fields: [],
  },
  qq: {
    func: GeneratorFunctions.generateRandomQQ,
    fields: [],
  },
  phone: {
    func: GeneratorFunctions.generateRandomPhoneNumber,
    fields: [],
  },
  landline: {
    func: GeneratorFunctions.generateRandomLandline,
    fields: [],
  },
  gender: {
    func: GeneratorFunctions.generateRandomGender,
    fields: [
      {
        name: "指定性别",
        placeholder: "male/female",
        value: "",
        type: "select",
        params_type: "string",
        options: ["male", "female"],
      },
    ],
  },
  cname: {
    func: GeneratorFunctions.generateRandomChineseName,
    fields: [],
  },
  cfirst: {
    func: GeneratorFunctions.generateRandomChineseSurname,
    fields: [],
  },
  clast: {
    func: GeneratorFunctions.generateRandomChineseGivenName,
    fields: [],
  },
  name: {
    func: GeneratorFunctions.generateRandomEnglishName,
    fields: [
      {
        name: "是否生成中间名",
        placeholder: "middle",
        value: "",
        type: "select",
        params_type: "string",
        options: ["true", "false"],
      },
    ],
  },
  first: {
    func: GeneratorFunctions.generateRandomFirstName,
    fields: [],
  },
  last: {
    func: GeneratorFunctions.generateRandomLastName,
    fields: [],
  },
  ctitle: {
    func: GeneratorFunctions.generateRandomChineseString,
    fields: [
      {
        name: "最小长度",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 100,
        params_type: "number",
        step: 1,
      },
      {
        name: "最大长度",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 100,
        params_type: "number",
        step: 1,
      },
    ],
  },
  cword: {
    func: GeneratorFunctions.generateRandomChineseString,
    fields: [
      {
        name: "最小长度",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 100,
        params_type: "number",
        step: 1,
      },
      {
        name: "最大长度",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 100,
        params_type: "number",
        step: 1,
      },
    ],
  },
  cparagraph: {
    func: GeneratorFunctions.generateRandomChineseSentences,
    fields: [
      {
        name: "最小长度",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 1000,
        params_type: "number",
        step: 1,
      },
      {
        name: "最大长度",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 1000,
        params_type: "number",
        step: 1,
      },
    ],
  },
  csentence: {
    func: GeneratorFunctions.generateRandomChineseSentence,
    fields: [
      {
        name: "最小长度",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 500,
        params_type: "number",
        step: 1,
      },
      {
        name: "最大长度",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 500,
        params_type: "number",
        step: 1,
      },
    ],
  },
  paragraph: {
    func: GeneratorFunctions.generateRandomEnglishSentences,
    fields: [
      {
        name: "句子的最小个数",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
      {
        name: "句子的最大个数",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
    ],
  },
  sentence: {
    func: GeneratorFunctions.generateRandomEnglishSentence,
    fields: [
      {
        name: "单词的最小个数",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
      {
        name: "单词的最大个数",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
    ],
  },
  word: {
    func: GeneratorFunctions.generateRandomWord,
    fields: [
      {
        name: "字符的最小个数",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
      {
        name: "字符的最大个数",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
    ],
  },
  title: {
    func: GeneratorFunctions.generateRandomEnglishTitle,
    fields: [
      {
        name: "字符的最小个数",
        placeholder: "min",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
      {
        name: "字符的最大个数",
        placeholder: "max",
        value: null,
        type: "number",
        min: 1,
        max: 20,
        params_type: "number",
        step: 1,
      },
    ],
  },
  region: {
    func: GeneratorFunctions.generateRandomChinaRegion,
    fields: [],
  },
  province: {
    func: GeneratorFunctions.generateRandomChinaProvince,
    fields: [],
  },
  city: {
    func: GeneratorFunctions.generateRandomChinaCity,
    fields: [
      {
        name: "是否包含省",
        placeholder: "true/false",
        value: "false",
        type: "select",
        params_type: "string",
        options: ["true", "false"],
      },
    ],
  },
  county: {
    func: GeneratorFunctions.generateRandomChinaZone,
    fields: [
      {
        name: "是否包含省市",
        placeholder: "true/false",
        value: "false",
        type: "select",
        params_type: "string",
        options: ["true", "false"],
      },
    ],
  },
  zip: {
    func: GeneratorFunctions.generateRandomChinaPostalCode,
    fields: [],
  },
  email: {
    func: GeneratorFunctions.generateRandomEmail,
    fields: [],
  },
  ip: {
    func: GeneratorFunctions.generateRandomIPv4,
    fields: [],
  },
  url: {
    func: GeneratorFunctions.generateRandomUrl,
    fields: [
      {
        name: "协议类型",
        placeholder: "http/ftp/wss...",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  domain: {
    func: GeneratorFunctions.generateRandomDomain,
    fields: [
      {
        name: "顶级域名",
        placeholder: "com/cn/net/org...",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  protocol: {
    func: GeneratorFunctions.generateRandomProtocol,
    fields: [],
  },
  tld: {
    func: GeneratorFunctions.generateRandomTopLevelDomain,
    fields: [],
  },
  dataimage: {
    func: GeneratorFunctions.generateDataImage,
    fields: [
      {
        name: "图片的宽高",
        placeholder: "size 格式为 '宽x高'",
        value: "",
        type: "input",
        params_type: "string",
      },
      {
        name: "图片上的文字",
        placeholder: "text",
        value: "",
        type: "input",
        params_type: "string",
      },
      {
        name: "图片的颜色",
        placeholder: "color",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  color: {
    func: GeneratorFunctions.generateRandomHexColor,
    fields: [],
  },
  hex: {
    func: GeneratorFunctions.generateRandomHexColor,
    fields: [],
  },
  rgba: {
    func: GeneratorFunctions.generateRandomRgbaColor,
    fields: [],
  },
  rgb: {
    func: GeneratorFunctions.generateRandomRgbColor,
    fields: [],
  },
  hsl: {
    func: GeneratorFunctions.generateRandomHslColor,
    fields: [],
  },
  regexp: {
    func: GeneratorFunctions.generateRandomStringFromRegex,
    fields: [
      {
        name: "正则表达式",
        placeholder: "/\\d+/",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  increment: {
    func: GeneratorFunctions.generateIncrementalNumber,
    fields: [
      {
        name: "整数自增的步长",
        placeholder: "step",
        value: null,
        type: "number",
        min: 1,
        max: 1000,
        params_type: "number",
        step: 1,
      },
    ],
  },
  guid: {
    func: GeneratorFunctions.generateGUID,
    fields: [],
  },
  uuid: {
    func: GeneratorFunctions.generateUUID,
    fields: [],
  },
  upper: {
    func: GeneratorFunctions.convertToUpperCase,
    fields: [
      {
        name: "字符串",
        placeholder: "str",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  lower: {
    func: GeneratorFunctions.convertToLowerCase,
    fields: [
      {
        name: "字符串",
        placeholder: "str",
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  pick: {
    func: GeneratorFunctions.randomSelectElement,
    fields: [
      {
        name: "选项元素数组",
        placeholder: 'arr,如：["a", "b", "c"]',
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
  shuffle: {
    func: GeneratorFunctions.shuffleArray,
    fields: [
      {
        name: "选项元素数组",
        placeholder: 'arr,如：["a", "b", "c"]',
        value: "",
        type: "input",
        params_type: "string",
      },
    ],
  },
});

function get_content(item: any) {
  return item.fields;
}
function handleChange(value: any) {
  current_function.value = value[value.length - 1];
  content_function();
  emit("reload_height");
}

function content_function() {
  can_insert.value = false;
  const result = process_function();
  console.log(result);
  
  if (result === "--ban--") {
    can_insert.value = false;
    emit("reload_height");
    return;
  } else {
    can_insert.value = true;
    content_value.value = result
    generation_expression();
    generation_preview(content_value.value)
    emit("reload_height");
    return result;
  }
}

function process_function() {
  const _content = input_content_mapping.value[current_function.value];
  console.log(_content);
  const _params = _content.fields.map((item: any) => item.value);
  console.log(_params);
  let result = "--ban--";
  if (_params.length > 0) {
    result = _content.func(..._params);
  } else {
    result = _content.func();
  }
  return result;
}

// 监听数组变化
watch(
  [process_list, params],
  ([newList1, newList2], [oldList1, oldList2]) => {
    if (can_insert.value) {
      generation_expression();
      if (content_value.value !== null) {
        generation_preview(content_value.value);
      } else {
        preview.value = "";
      }
    }
  },
  { deep: true }
);
function insert() {
  if (exp.value === "") {
    tools.message("请正确补充完整必要信息", proxy, "info");
    return;
  }
  emit("insert_action", exp.value);
}

async function copy(value: String) {
  const { toClipboard } = useClipboard()
  await toClipboard(value.toString())
  tools.message("已复制", proxy, 'success')
}

function generation_expression() {
  const start = "{% mock ";
  const end = " %}";
  const name_list = process_list.value.map((item: any) => item.function_sign);
  const content_param_list: any[] = input_content_mapping.value[
    current_function.value
  ].fields.map((item: any) => {
    if (item.params_type === "string") {
      return "'" + item.value + "'";
    } else {
      return item.value;
    }
  });
  const content = ["'" + current_function.value + "'"]
    .concat(content_param_list)
    .join(",");
  const merged_array = [content].concat(name_list);
  exp.value = start + merged_array.join("|") + end;
}
function generation_preview(input_value: any) {
  process_list.value.forEach((process: any) => {
    const function_sign = modifyFunctionCalls(
      process.function_sign,
      input_value
    );
    const dynamicFunc = new Function(
      "InnerFunction",
      `return InnerFunction.${function_sign};`
    );
    input_value = dynamicFunc(InnerFunction); // 执行动态函数
  });
  preview.value = input_value;
  return input_value;
}

function modifyFunctionCalls(functionCallStr: string, value: string | number) {
  const input_value = convert(value);
  return functionCallStr.replace(
    /([a-zA-Z0-9]+)\(([^)]*)\)/g,
    (match, fnName, args) => {
      const newArgs =
        args.trim() === "" ? input_value : `${input_value}, ${args.trim()}`;
      return `${fnName}(${newArgs})`;
    }
  );
}

function convert(value: string | number) {
  // 判断输入是否是字符串
  if (typeof value === "string") {
    // 如果是字符串，且没有引号（即不是 'sheldon' 或 "sheldon"）
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      return value; // 如果已经是带引号的字符串，直接返回
    }
    return `'${value}'`; // 否则，转换成带引号的字符串
  }
  if (typeof value === "boolean") {
    return `'${value}'`;
  }

  // 如果是数字，直接返回
  if (typeof value === "number") {
    return value;
  }

  return value; // 其他类型直接返回
}

function open_process_function_dialog() {
  process_function_component.value?.open_dialog();
}

function eidt_process_function_dialog(item: any, index: number) {
  cache_process_item_index.value = index;
  process_function_component.value?.edit_dialog(item);
}

function add_process_function(data: any) {
  process_list.value.push(data);
  emit("reload_height");
}

function edit_process_function(data: any) {
  process_list.value[cache_process_item_index.value] = data;
}

function delete_process_item(index: number) {
  process_list.value.splice(index, 1);
  emit("reload_height");
}
// -------------- 内置函数 ----------------
</script>

<style lang="scss" scoped>
.content-name {
  height: 20px;
  line-height: 20px;
  margin: 0px;
  font-size: 12px;
  color: #344054;
}
.insert-main {
  display: flex;
  flex-direction: column;
  //   justify-content: end;
  //   height: 100%;
}
.process-btn {
  width: 100%;
  margin-top: 8px;
  button {
    border-radius: 8px;
    width: 100%;
    outline: 0;
    border: 1px solid transparent;
    color: #fff;
    background-color: black;
    font-weight: 400;
    height: 32px;
    font-size: 14px;
    cursor: pointer;
  }
  button:hover {
    background-color: rgb(56, 56, 56);
  }
}
.exp-div {
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
  display: flex;
}
.exp-span {
  cursor: pointer;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}
.exp-span:hover {
  text-decoration: underline dashed;
}
.expression {
  padding: 10px;
  background-color: #f2f2f2;
  font-size: 13px;
  border-radius: 8px;
  margin-top: 10px;
}
.del-process {
  padding: 3px;
  color: red;
  background-color: #f3f3f3;
  height: 12px;
  display: flex;
  align-items: center;
  border-radius: 3px;
}
.del-process:hover {
  background-color: #e6e6e6;
}
.process-container {
  display: flex;
  flex-direction: column;
  border: 1px solid #f2f4f7;
  border-radius: 8px;
  max-height: 200px;
  overflow: scroll;
  flex-wrap: nowrap;
}

.process-item {
  padding: 5px;
  background-color: #fff;
  height: 20px;
  cursor: pointer;
}

.process-container > .process-item:only-child {
  border-radius: 8px;
}

/* 当有两个元素时 */
.process-container:has(.process-item:nth-child(2)) .process-item:first-child {
  border-radius: 8px 8px 0 0;
  border-bottom: 1px solid #f2f4f7;
}

.process-container:has(.process-item:nth-child(2)) .process-item:last-child {
  border-radius: 0 0 8px 8px;
}

/* 当有多个元素时 */
.process-container:has(.process-item:nth-child(n + 3))
  .process-item:first-child {
  border-radius: 8px 8px 0 0;
}

.process-container:has(.process-item:nth-child(n + 3))
  .process-item:last-child {
  border-radius: 0 0 8px 8px;
}

.process-container:has(.process-item:nth-child(n + 3))
  .process-item:not(:first-child):not(:last-child) {
  border-radius: 0;
  border-bottom: 1px solid #f2f4f7;
}

.process-func {
  padding: 8px;
  background-color: #f9fafb;
  border-radius: 8px;
  margin-top: 10px;
  .add-btn {
    margin-top: 5px;
    background-color: #f9fafb;
    height: 24px;
    padding: 8px 1px;
    font-weight: 400;
    font-size: 12px;
    line-height: 18px;
    border-radius: 6px;
    width: 100%;
    color: #667085;
    cursor: pointer;
    display: flex;
    justify-content: center;
    border: 0px;
    align-items: center;
  }
  .add-btn:hover {
    background-color: rgba(16, 24, 40, 0.04);
  }
}
.params-row {
  border: 1px solid #f2f4f7;
  border-radius: 5px;
  background-color: #f9fafb;
  padding: 2px;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 12px;
  margin-top: 10px;
  cursor: pointer;
}
.show-content {
  margin-top: 10px;
  max-height: 200px;
  overflow: scroll;
}
</style>

<style lang="scss">
.el-input__wrapper {
  border-radius: 5px;
}
.el-input__wrapper.is-focus {
  box-shadow: 0 0 0 1px rgb(114, 114, 114);
}
.el-cascader-node.in-active-path,
.el-cascader-node.is-active,
.el-cascader-node.is-selectable.in-checked-path {
  color: black;
}
.el-cascader-node__label {
  font-size: 13px;
  font-weight: 500;
}
.el-cascader-node {
  height: 20px;
}
.el-cascader .el-input.is-focus .el-input__wrapper {
  box-shadow: 0 0 0 1px black;
}
.el-select__wrapper.is-focused {
  box-shadow: 0 0 0 1px black;
}
.el-cascader-node {
  margin-top: 10px;
}
.el-cascader-menu__wrap.el-scrollbar__wrap {
  height: 300px;
}
.el-popper.is-pure {
  border-radius: 12px;
}
.el-select-dropdown__item.is-selected {
  color: black;
}
</style>
