import * as GeneratorFunctions from "./generator_functions";

export const input_content_mapping: any = {
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
        max: 1000,
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
        max: 1000,
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
};
