export function generateBoolean(
  probabilityTrue: number,
  probabilityFalse: number,
  defaultReturn: any = true
) {
  // 参数验证：确保 probabilityTrue 和 probabilityFalse 的和 <= 100
  if (
    probabilityTrue + probabilityFalse > 100 ||
    probabilityTrue < 1 ||
    probabilityFalse < 1
  ) {
    return "--ban--";
  }

  // 生成一个 0 到 100 之间的随机数
  const randomValue = Math.random() * 100;
  // 根据概率判断返回值
  if (randomValue < probabilityTrue) {
    return true; // 如果随机值小于产生 true 的概率
  } else if (randomValue < probabilityTrue + probabilityFalse) {
    return false; // 如果随机值小于产生 true 或 false 的总概率
  } else {
    if (defaultReturn === "true") {
      return true;
    } else if (defaultReturn === "false") {
      return false;
    } else {
      return "--ban--";
    }
  }
}

export function generateNaturalNumber(min: number, max: number) {
  // 参数验证：确保 min 和 max 都是自然数且 min <= max
  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    min < 0 ||
    max < 0 ||
    min > max
  ) {
    return "--ban--"; // 如果参数不合法，返回 "--ban--"
  }

  // 生成一个 min 和 max 之间的自然数（包括 min 和 max）
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateInteger(min: number, max: number): number | string {
  // 参数验证：确保 min 和 max 都是整数且 min <= max
  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    min > max
  ) {
    return "--ban--"; // 如果参数不合法，返回 "--ban--"
  }

  // 生成一个 min 和 max 之间的随机整数（包括 min 和 max）
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

export function generateFloat(
  min: number,
  max: number,
  minDecimal: number,
  maxDecimal: number
): number | string {
  // 参数验证：确保所有参数都是有效的数字，且整数部分的最小值小于最大值，小数位数范围合理
  if (
    typeof min !== "number" ||
    typeof max !== "number" ||
    typeof minDecimal !== "number" ||
    typeof maxDecimal !== "number" ||
    !Number.isInteger(min) ||
    !Number.isInteger(max) ||
    !Number.isInteger(minDecimal) ||
    !Number.isInteger(maxDecimal) ||
    min > max ||
    minDecimal > maxDecimal ||
    minDecimal < 0 ||
    maxDecimal < 0
  ) {
    return "--ban--"; // 如果参数不合法，返回 "--ban--"
  }

  // 生成一个随机整数部分
  const integerPart = Math.floor(Math.random() * (max - min + 1)) + min;

  // 生成一个小数部分，位数在 minDecimal 到 maxDecimal 之间
  const decimalPlaces =
    Math.floor(Math.random() * (maxDecimal - minDecimal + 1)) + minDecimal;
  const decimalPart = Math.random().toFixed(decimalPlaces).slice(2); // 生成小数部分并去掉前导 '0.'

  // 返回浮点数
  return parseFloat(`${integerPart}.${decimalPart}`);
}

export function generateCharacter(type: string): string | "--ban--" {
  const lowerChars = "abcdefghijklmnopqrstuvwxyz";
  const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // 参数验证：确保传入的类型是合法的
  if (typeof type !== "string") {
    return "--ban--"; // 如果不是字符串，返回 "--ban--"
  }

  if (type === "lower") {
    // 返回一个随机小写字母
    return lowerChars.charAt(Math.floor(Math.random() * lowerChars.length));
  }

  if (type === "upper") {
    // 返回一个随机大写字母
    return upperChars.charAt(Math.floor(Math.random() * upperChars.length));
  }

  if (type === "number") {
    // 返回一个随机数字字符
    return numbers.charAt(Math.floor(Math.random() * numbers.length));
  }

  if (type === "symbol") {
    // 返回一个随机符号字符
    return symbols.charAt(Math.floor(Math.random() * symbols.length));
  }

  // 如果传入的是一个字符串（例如 'abc'），从中随机选择一个字符
  if (type.length > 0) {
    return type.charAt(Math.floor(Math.random() * type.length));
  }

  return "--ban--"; // 如果传入的参数不符合任何条件，返回 "--ban--"
}

export function generateString(
  type: string,
  minLength: number,
  maxLength: number
): string | "--ban--" {
  const lowerChars = "abcdefghijklmnopqrstuvwxyz";
  const upperChars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const numbers = "0123456789";
  const symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

  // 参数验证：确保 minLength 和 maxLength 是合法数字，且 minLength <= maxLength
  if (
    typeof type !== "string" ||
    typeof minLength !== "number" ||
    typeof maxLength !== "number" ||
    !Number.isInteger(minLength) ||
    !Number.isInteger(maxLength) ||
    minLength > maxLength ||
    minLength < 0 ||
    maxLength < 0
  ) {
    return "--ban--"; // 如果参数不合法，返回 "--ban--"
  }

  let charSet = "";

  if (type === "lower") {
    charSet = lowerChars;
  } else if (type === "upper") {
    charSet = upperChars;
  } else if (type === "number") {
    charSet = numbers;
  } else if (type === "symbol") {
    charSet = symbols;
  } else if (type.length > 0) {
    // 如果传入的是字符串，直接使用它作为字符集
    charSet = type;
  } else {
    return "--ban--"; // 如果传入的类型不合法，返回 "--ban--"
  }

  // 随机生成一个长度在 minLength 和 maxLength 之间的字符串
  const length =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;

  let result = "";
  for (let i = 0; i < length; i++) {
    result += charSet.charAt(Math.floor(Math.random() * charSet.length));
  }

  return result;
}

export function generateRandomDate(format: string): string | "--ban--" {
  // 验证参数是否为字符串
  if (typeof format !== "string") {
    return "--ban--"; // 如果格式不是字符串，返回 "--ban--"
  }

  // 获取当前日期
  const now = new Date();

  // 随机生成年份、月份和日期
  const year =
    Math.floor(Math.random() * (now.getFullYear() - 1900 + 1)) + 1900; // 从1900年到当前年份
  const month = Math.floor(Math.random() * 12); // 0-11 的月份
  const day =
    Math.floor(Math.random() * new Date(year, month + 1, 0).getDate()) + 1; // 获取该月的天数并随机选取

  // 用正则替换格式中的日期字段
  const formattedDate = format
    .replace("yyyy", year.toString()) // 替换年份
    .replace("MM", (month + 1).toString().padStart(2, "0")) // 替换月份，确保两位数
    .replace("dd", day.toString().padStart(2, "0")); // 替换日期，确保两位数

  return formattedDate;
}

export function generateRandomTime(format: string): string | "--ban--" {
  // 验证参数是否为字符串
  if (typeof format !== "string") {
    return "--ban--"; // 如果格式不是字符串，返回 "--ban--"
  }

  // 获取当前日期和时间
  const now = new Date();

  // 随机生成年份、月份、日期、小时、分钟、秒
  const year =
    Math.floor(Math.random() * (now.getFullYear() - 1900 + 1)) + 1900; // 从1900年到当前年份
  const month = Math.floor(Math.random() * 12); // 0-11 的月份
  const day =
    Math.floor(Math.random() * new Date(year, month + 1, 0).getDate()) + 1; // 获取该月的天数并随机选取
  const hour = Math.floor(Math.random() * 24); // 随机小时 (0-23)
  const minute = Math.floor(Math.random() * 60); // 随机分钟 (0-59)
  const second = Math.floor(Math.random() * 60); // 随机秒数 (0-59)

  // 用正则替换格式中的日期时间字段
  const formattedDateTime = format
    .replace("yyyy", year.toString()) // 替换年份
    .replace("MM", (month + 1).toString().padStart(2, "0")) // 替换月份，确保两位数
    .replace("dd", day.toString().padStart(2, "0")) // 替换日期，确保两位数
    .replace("HH", hour.toString().padStart(2, "0")) // 替换小时，确保两位数
    .replace("mm", minute.toString().padStart(2, "0")) // 替换分钟，确保两位数
    .replace("ss", second.toString().padStart(2, "0")); // 替换秒数，确保两位数

  return formattedDateTime;
}

export function getCurrentTime(
  precision: string,
  format: string,
  offset: string = "",
  mode: string = "start"
): string | "--ban--" {
  // 时间单元的映射
  const units: any = {
    year: "YYYY",
    month: "MM",
    week: "week",
    day: "DD",
    hour: "HH",
    minute: "mm",
    second: "ss",
  };

  // 参数验证
  if (
    typeof precision !== "string" ||
    typeof format !== "string" ||
    typeof mode !== "string" ||
    !units[precision] ||
    !["start", "end"].includes(mode)
  ) {
    return "--ban--"; // 如果参数不合法，返回 "--ban--"
  }

  // 获取当前时间
  let currentDate = new Date();

  // 处理时间偏移
  if (offset) {
    const regex = /^([+-]?\d+)\s*(year|month|week|day|hour|minute|second)$/;
    const match = offset.match(regex);
    if (match) {
      const amount = parseInt(match[1]);
      const unit = match[2];

      switch (unit) {
        case "year":
          currentDate.setFullYear(currentDate.getFullYear() + amount);
          break;
        case "month":
          currentDate.setMonth(currentDate.getMonth() + amount);
          break;
        case "week":
          currentDate.setDate(currentDate.getDate() + amount * 7); // 一周7天
          break;
        case "day":
          currentDate.setDate(currentDate.getDate() + amount);
          break;
        case "hour":
          currentDate.setHours(currentDate.getHours() + amount);
          break;
        case "minute":
          currentDate.setMinutes(currentDate.getMinutes() + amount);
          break;
        case "second":
          currentDate.setSeconds(currentDate.getSeconds() + amount);
          break;
        default:
          return "--ban--"; // 如果偏移量无效，返回 "--ban--"
      }
    } else {
      return "--ban--"; // 如果偏移格式不匹配，返回 "--ban--"
    }
  }

  // 根据模式选择日期的开始或结束
  if (mode === "start") {
    if (precision === "year") {
      currentDate.setMonth(0); // 设置为1月
      currentDate.setDate(1); // 设置为1号
      currentDate.setHours(0); // 设置为00:00:00
      currentDate.setMinutes(0);
      currentDate.setSeconds(0);
    } else if (precision === "month") {
      currentDate.setDate(1); // 设置为每月的1号
      currentDate.setHours(0); // 设置为00:00:00
      currentDate.setMinutes(0);
      currentDate.setSeconds(0);
    } else if (precision === "week") {
      const dayOfWeek = currentDate.getDay();
      currentDate.setDate(currentDate.getDate() - dayOfWeek); // 设置为当前周的第一天（星期日）
      currentDate.setHours(0);
      currentDate.setMinutes(0);
      currentDate.setSeconds(0);
    } else if (precision === "day") {
      currentDate.setHours(0); // 设置为00:00:00
      currentDate.setMinutes(0);
      currentDate.setSeconds(0);
    } else if (precision === "hour") {
      currentDate.setMinutes(0); // 设置为整点
      currentDate.setSeconds(0);
    } else if (precision === "minute") {
      currentDate.setSeconds(0); // 设置为整分钟
    } else if (precision === "second") {
      // 不需要做任何调整，因为精度是秒
    }
  } else if (mode === "end") {
    if (precision === "year") {
      currentDate.setMonth(11); // 设置为12月
      currentDate.setDate(31); // 设置为31号
      currentDate.setHours(23); // 设置为23:59:59
      currentDate.setMinutes(59);
      currentDate.setSeconds(59);
    } else if (precision === "month") {
      const nextMonth = new Date(
        currentDate.getFullYear(),
        currentDate.getMonth() + 1,
        0
      );
      currentDate = nextMonth; // 设置为下个月的最后一天
      currentDate.setHours(23);
      currentDate.setMinutes(59);
      currentDate.setSeconds(59);
    } else if (precision === "week") {
      const dayOfWeek = currentDate.getDay();
      currentDate.setDate(currentDate.getDate() + (6 - dayOfWeek)); // 设置为当前周的最后一天（星期六）
      currentDate.setHours(23);
      currentDate.setMinutes(59);
      currentDate.setSeconds(59);
    } else if (precision === "day") {
      currentDate.setHours(23); // 设置为23:59:59
      currentDate.setMinutes(59);
      currentDate.setSeconds(59);
    } else if (precision === "hour") {
      currentDate.setMinutes(59); // 设置为59分59秒
      currentDate.setSeconds(59);
    } else if (precision === "minute") {
      currentDate.setSeconds(59); // 设置为59秒
    } else if (precision === "second") {
      // 不需要做任何调整，因为精度是秒
    }
  }

  // 使用提供的格式来格式化日期
  const year = currentDate.getFullYear().toString();
  const month = (currentDate.getMonth() + 1).toString().padStart(2, "0");
  const day = currentDate.getDate().toString().padStart(2, "0");
  const hour = currentDate.getHours().toString().padStart(2, "0");
  const minute = currentDate.getMinutes().toString().padStart(2, "0");
  const second = currentDate.getSeconds().toString().padStart(2, "0");

  // 按照格式输出
  let result = format;
  result = result.replace("yyyy", year);
  result = result.replace("MM", month);
  result = result.replace("dd", day);
  result = result.replace("HH", hour);
  result = result.replace("mm", minute);
  result = result.replace("ss", second);

  return result;
}

export function generateRandomTimeOnly(format: string): string | "--ban--" {
  // 日期格式的验证
  if (typeof format !== "string") {
    return "--ban--"; // 如果格式不是字符串，返回 "--ban--"
  }

  // 随机生成小时、分钟和秒
  const hour = Math.floor(Math.random() * 24); // 随机小时 (0-23)
  const minute = Math.floor(Math.random() * 60); // 随机分钟 (0-59)
  const second = Math.floor(Math.random() * 60); // 随机秒数 (0-59)

  // 格式化输出
  let formattedTime = format;

  // 替换格式中的时间组件
  formattedTime = formattedTime.replace("HH", hour.toString().padStart(2, "0"));
  formattedTime = formattedTime.replace(
    "mm",
    minute.toString().padStart(2, "0")
  );
  formattedTime = formattedTime.replace(
    "ss",
    second.toString().padStart(2, "0")
  );

  return formattedTime;
}

export function generateTimestamp(precision: string): number | "--ban--" {
  // 校验精度参数是否合法
  if (precision !== "s" && precision !== "ms") {
    return "--ban--"; // 如果精度不是 's' 或 'ms'，返回 "--ban--"
  }

  // 获取当前时间
  const timestamp = Date.now();

  // 如果精度是秒级，则将毫秒时间戳转换为秒级
  if (precision === "s") {
    return Math.floor(timestamp / 1000); // 转换为秒
  }

  // 如果精度是毫秒级，直接返回当前毫秒时间戳
  return timestamp;
}

export function generateRandomID(): string {
  // 随机生成一个地址码（6位）
  function generateRandomAddressCode(): string {
    const provinceCode = Math.floor(Math.random() * 34) + 11; // 省份的范围：11到34
    const cityCode = Math.floor(Math.random() * 30) + 1; // 市的范围：01到30
    const districtCode = Math.floor(Math.random() * 100) + 1; // 区的范围：01到99
    return `${provinceCode.toString().padStart(2, "0")}${cityCode
      .toString()
      .padStart(2, "0")}${districtCode.toString().padStart(2, "0")}`;
  }

  // 随机生成出生日期（yyyyMMdd）
  function generateRandomBirthDate(): string {
    const year =
      Math.floor(Math.random() * (new Date().getFullYear() - 1900 + 1)) + 1900;
    const month = Math.floor(Math.random() * 12) + 1;
    const daysInMonth = new Date(year, month, 0).getDate(); // 获取该月的天数
    const day = Math.floor(Math.random() * daysInMonth) + 1;
    return `${year}${month.toString().padStart(2, "0")}${day
      .toString()
      .padStart(2, "0")}`;
  }

  // 随机生成顺序码（3位）
  function generateRandomSequenceCode(): string {
    return Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, "0");
  }

  // 计算身份证号的校验码（第18位）
  function calculateCheckCode(idBase: string): string {
    const weight = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2];
    const checkCodes = ["1", "0", "X", "9", "8", "7", "6", "5", "4", "3", "2"];

    let sum = 0;
    for (let i = 0; i < 17; i++) {
      sum += parseInt(idBase[i], 10) * weight[i];
    }

    const remainder = sum % 11;
    return checkCodes[remainder];
  }

  // 随机生成一个地址码（6位）
  const addressCode = generateRandomAddressCode();

  // 随机生成一个出生日期（yyyyMMdd）
  const birthDate = generateRandomBirthDate();

  // 随机生成一个顺序码（3位数字）
  const sequenceCode = generateRandomSequenceCode();

  // 生成前17位身份证号
  const idBase = addressCode + birthDate + sequenceCode;

  // 计算校验码（18位身份证号的最后一位）
  const checkCode = calculateCheckCode(idBase);

  // 返回完整的身份证号
  return idBase + checkCode;
}

export function generateRandomQQ(): string {
  // 随机生成一个QQ号长度（5到11位之间）
  const length = Math.floor(Math.random() * 7) + 5; // 最小5位，最大11位

  // 随机生成一个QQ号，保证第一个数字不为0
  let qqNumber = Math.floor(Math.random() * 9) + 1; // 第一个数字是1到9之间
  for (let i = 1; i < length; i++) {
    qqNumber = qqNumber * 10 + Math.floor(Math.random() * 10); // 后续数字是0到9之间
  }

  return qqNumber.toString();
}

export function generateRandomPhoneNumber(): string {
  // 手机号的运营商号段，第二位可以是3、4、5或7
  const operatorPrefix = ["3", "4", "5", "7"];

  // 随机选择一个运营商号段
  const secondDigit =
    operatorPrefix[Math.floor(Math.random() * operatorPrefix.length)];

  // 随机生成剩下的9位数字
  let phoneNumber = "1" + secondDigit; // 以 '1' 开头，接着是运营商号段
  for (let i = 0; i < 9; i++) {
    phoneNumber += Math.floor(Math.random() * 10); // 随机生成0到9的数字
  }

  return phoneNumber;
}

export function generateRandomLandline(): string {
  // 常见的区号，假设从一些常见的城市区号中随机选择
  const areaCodes = [
    "010",
    "021",
    "022",
    "023",
    "024",
    "025",
    "027",
    "028",
    "029",
    "0311",
    "0371",
    "0531",
    "0551",
    "0571",
    "0591",
    "0731",
  ];

  // 随机选择一个区号
  const areaCode = areaCodes[Math.floor(Math.random() * areaCodes.length)];

  // 随机生成8位电话号码
  let phoneNumber = "";
  for (let i = 0; i < 8; i++) {
    phoneNumber += Math.floor(Math.random() * 10); // 随机生成0到9的数字
  }

  // 返回完整的固定电话号码
  return `${areaCode}-${phoneNumber}`;
}

export function generateRandomGender(gender?: "male" | "female"): string {
  // 如果传入的性别是 'male' 或 'female'，则返回该性别
  if (gender === "male" || gender === "female") {
    return gender;
  }

  // 如果传入的性别不是有效值，返回 "--ban--"
  if (gender !== undefined && gender !== "male" && gender !== "female") {
    return "--ban--";
  }

  // 如果没有传入性别，随机返回性别
  const genders = ["male", "female"];
  return genders[Math.floor(Math.random() * genders.length)];
}
// 常见的中国姓氏（可以是1个字或2个字）
const surnames = [
  "赵",
  "钱",
  "孙",
  "李",
  "周",
  "吴",
  "郑",
  "王",
  "冯",
  "陈",
  "褚",
  "卫",
  "蒋",
  "沈",
  "韩",
  "杨",
  "朱",
  "秦",
  "尤",
  "许",
  "何",
  "吕",
  "施",
  "张",
  "孔",
  "曹",
  "严",
  "华",
  "金",
  "魏",
  "陶",
  "姜",
  "戚",
  "谢",
  "邹",
  "孙",
  "章",
  "鲁",
  "韦",
  "常",
  "蔡",
  "杜",
  "阮",
  "雷",
  "贾",
  "尹",
  "邱",
  "方",
  "林",
  "袁",
  "罗",
  "邵",
  "程",
  "孟",
  "唐",
  "许",
  "董",
  "魏",
  "蔺",
  "彭",
  "曾",
  "卢",
  "鲍",
  "卢",
  "齐",
  "和",
  "戴",
  "陆",
  "卓",
  "钱",
  "潘",
  "袁",
  "欧阳",
  "欧",
  "焦",
  "白",
  "黄",
  "邵",
  "郑",
  "陶",
  "杜",
];
// 常见的汉字用于生成名字，扩展到至少500个常见的字
const firstNameChars = [
  "一",
  "乙",
  "三",
  "万",
  "丈",
  "七",
  "八",
  "九",
  "十",
  "百",
  "千",
  "万",
  "亿",
  "天",
  "地",
  "人",
  "大",
  "中",
  "小",
  "上",
  "下",
  "左",
  "右",
  "东",
  "西",
  "南",
  "北",
  "国",
  "家",
  "民",
  "风",
  "山",
  "水",
  "日",
  "月",
  "星",
  "光",
  "火",
  "土",
  "木",
  "金",
  "水",
  "土",
  "安",
  "明",
  "定",
  "宇",
  "天",
  "光",
  "海",
  "山",
  "立",
  "勇",
  "信",
  "才",
  "志",
  "远",
  "成",
  "升",
  "义",
  "志",
  "超",
  "俊",
  "华",
  "星",
  "宇",
  "庆",
  "欣",
  "乐",
  "春",
  "夏",
  "秋",
  "冬",
  "胜",
  "昌",
  "东",
  "辉",
  "强",
  "建",
  "达",
  "正",
  "和",
  "尚",
  "振",
  "福",
  "耀",
  "贤",
  "达",
  "勇",
  "哲",
  "凯",
  "俊",
  "婷",
  "芬",
  "萍",
  "霞",
  "玲",
  "晶",
  "丽",
  "倩",
  "婷",
  "芸",
  "文",
  "书",
  "丹",
  "静",
  "妍",
  "婷",
  "欣",
  "媛",
  "晶",
  "璇",
  "如",
  "梦",
  "娇",
  "蓉",
  "爱",
  "彤",
  "雯",
  "思",
  "梅",
  "舒",
  "畅",
  "雪",
  "琪",
  "莹",
  "昕",
  "佳",
  "芮",
  "兰",
  "琳",
  "依",
  "佳",
  "灵",
  "怡",
  "丽",
  "艺",
  "晓",
  "慧",
  "如",
  "爽",
  "雪",
  "然",
  "玲",
  "萍",
  "怡",
  "媛",
  "瑶",
  "雪",
  "雪",
  "霞",
  "霞",
  "萍",
  "紫",
  "琳",
  "倩",
  "洁",
  "丽",
  "欣",
  "丽",
  "蓉",
  "欣",
  "悦",
  "澜",
  "欣",
  "若",
  "雪",
  "珊",
  "莹",
  "美",
  "娜",
  "聪",
  "慧",
  "萍",
  "琪",
  "玲",
  "霞",
  "玲",
  "瑶",
  "莉",
  "秋",
  "芹",
  "明",
  "怡",
  "安",
  "琪",
  "琳",
  "丹",
  "琴",
  "柳",
  "艳",
  "柔",
  "竹",
  "婷",
  "慧",
  "心",
  "荣",
  "俊",
  "婷",
  "芳",
  "然",
  "芬",
  "婧",
  "娟",
  "灵",
  "晖",
  "诗",
  "忆",
  "思",
  "燕",
  "雯",
  "颖",
  "凯",
  "恬",
  "爱",
  "怡",
  "琳",
  "燕",
  "佳",
  "馨",
  "娇",
  "巧",
  "佳",
  "雯",
  "蕾",
  "甜",
  "蓉",
  "琼",
  "丽",
  "娅",
  "芬",
  "瑾",
  "璇",
  "怡",
  "丽",
  "雯",
  "婷",
  "玥",
  "艳",
  "玲",
  "莉",
  "璇",
  "婕",
  "岚",
  "沁",
  "晶",
  "丹",
  "玉",
  "雪",
  "艳",
  "娟",
  "玲",
  "阳",
  "婷",
  "兰",
  "雨",
  "玲",
  "莹",
  "晨",
  "霞",
  "岚",
  "芬",
  "琪",
  "琳",
  "婷",
  "怡",
  "欣",
  "慧",
  "琴",
  "倩",
  "娅",
  "怡",
  "莉",
  "露",
  "雪",
  "芬",
  "晨",
  "燕",
  "晴",
  "菁",
  "瑶",
];

export function generateRandomChineseName(): string {
  // 随机选择一个姓氏
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  // 随机生成1到2个字的名字
  const nameLength = Math.random() < 0.5 ? 1 : 2; // 50%的概率生成1个字名字，50%生成2个字名字
  let name = "";
  for (let i = 0; i < nameLength; i++) {
    const randomChar =
      firstNameChars[Math.floor(Math.random() * firstNameChars.length)];
    name += randomChar;
  }

  return surname + name;
}

export function generateRandomChineseSurname(): string {
  // 随机选择一个姓氏
  const surname = surnames[Math.floor(Math.random() * surnames.length)];
  return surname;
}

export function generateRandomChineseGivenName(): string {
  // 随机生成1到2个字的名字
  const nameLength = Math.random() < 0.5 ? 1 : 2; // 50%的概率生成1个字名字，50%生成2个字名字
  let name = "";
  for (let i = 0; i < nameLength; i++) {
    const randomChar =
      firstNameChars[Math.floor(Math.random() * firstNameChars.length)];
    name += randomChar;
  }

  return name;
}

// 常见的英文名（名）
const firstNames = [
  "John",
  "James",
  "Michael",
  "David",
  "William",
  "Joseph",
  "Charles",
  "Thomas",
  "Daniel",
  "Matthew",
  "Andrew",
  "Joshua",
  "Ryan",
  "Ethan",
  "Nicholas",
  "Jacob",
  "Alexander",
  "Samuel",
  "Henry",
  "Benjamin",
  "Christopher",
  "Elijah",
  "Caleb",
  "Nathan",
  "Jack",
  "Luke",
  "Gabriel",
  "Mason",
  "Owen",
  "Liam",
  "Sophia",
  "Olivia",
  "Emma",
  "Ava",
  "Isabella",
  "Mia",
  "Amelia",
  "Harper",
  "Evelyn",
  "Abigail",
  "Ella",
  "Scarlett",
  "Grace",
  "Aria",
  "Chloe",
  "Lily",
  "Zoey",
  "Stella",
  "Victoria",
  "Lucy",
];

// 常见的英文姓（姓）
const lastNames = [
  "Smith",
  "Johnson",
  "Brown",
  "Taylor",
  "Anderson",
  "Thomas",
  "Jackson",
  "White",
  "Harris",
  "Martin",
  "Thompson",
  "Garcia",
  "Martinez",
  "Roberts",
  "Clark",
  "Rodriguez",
  "Lewis",
  "Walker",
  "Allen",
  "Young",
];

export function generateRandomEnglishName(generateMiddleName: string): string {
  // 常见的英文中间名
  const middleNames = [
    "Alexander",
    "Michael",
    "Marie",
    "Rose",
    "James",
    "Grace",
    "Elizabeth",
    "Ann",
    "Lee",
    "Evelyn",
  ];

  // 随机选择名和姓
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  // 如果需要生成中间名，则随机选择一个中间名
  let fullName = `${firstName} ${lastName}`;
  if (generateMiddleName === "true") {
    const middleName =
      middleNames[Math.floor(Math.random() * middleNames.length)];
    fullName = `${firstName} ${middleName} ${lastName}`;
  }

  return fullName;
}

export function generateRandomFirstName(): string {
  // 随机选择一个名字
  const firstName = firstNames[Math.floor(Math.random() * firstNames.length)];

  return firstName;
}

export function generateRandomLastName(): string {
  // 随机选择一个姓
  const lastName = lastNames[Math.floor(Math.random() * lastNames.length)];

  return lastName;
}

export function generateRandomChineseString(
  minLength: number,
  maxLength: number
): string {
  // 判断参数是否合法
  if (
    typeof minLength !== "number" ||
    typeof maxLength !== "number" ||
    minLength < 1 ||
    maxLength < 1 ||
    minLength > maxLength
  ) {
    return "--ban--";
  }

  // 随机生成一个长度在 minLength 和 maxLength 之间的中文字符串
  const length =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let result = "";

  // 从字符集随机选择字符生成字符串
  for (let i = 0; i < length; i++) {
    const randomChar =
      firstNameChars[Math.floor(Math.random() * firstNameChars.length)];
    result += randomChar;
  }

  return result;
}
const chineseChars = [
  "一",
  "丁",
  "七",
  "万",
  "丈",
  "三",
  "上",
  "下",
  "不",
  "与",
  "丑",
  "专",
  "丰",
  "临",
  "个",
  "中",
  "丰",
  "优",
  "传",
  "亨",
  "亩",
  "共",
  "关",
  "兴",
  "兰",
  "黄",
  "李",
  "张",
  "王",
  "方",
  "孔",
  "日",
  "月",
  "火",
  "水",
  "土",
  "山",
  "田",
  "甘",
  "木",
  "石",
  "红",
  "绿",
  "青",
  "白",
  "蓝",
  "紫",
  "黑",
  "猫",
  "狗",
  "牛",
  "羊",
  "兔",
  "鼠",
  "龙",
  "凤",
  "猪",
  "鸡",
  "鹰",
  "虫",
  "鱼",
  "花",
  "草",
  "树",
  "雷",
  "电",
  "风",
  "雪",
  "雨",
  "霜",
  "雾",
  "我",
  "你",
  "他",
  "她",
  "它",
  "是",
  "有",
  "在",
  "从",
  "向",
  "给",
  "来",
  "走",
  "看",
  "吃",
  "喝",
  "睡",
  "打",
  "玩",
  "听",
  "说",
  "读",
  "写",
  "做",
  "学",
  "上",
  "下",
  "进",
  "出",
  "问",
  "答",
  "坐",
  "站",
  "看见",
  "了解",
  "知道",
];

export function generateRandomChineseSentences(
  minSentences: number,
  maxSentences: number
): string {
  // 判断参数是否合法
  if (
    typeof minSentences !== "number" ||
    typeof maxSentences !== "number" ||
    minSentences < 1 ||
    maxSentences < 1 ||
    minSentences > maxSentences
  ) {
    return "--ban--";
  }

  // 随机生成一个中文句子，字符数在10到20之间
  const generateSentence = () => {
    const sentenceLength = Math.floor(Math.random() * 11) + 10; // 生成10到20之间的随机长度
    let sentence = "";
    for (let i = 0; i < sentenceLength; i++) {
      const randomChar =
        chineseChars[Math.floor(Math.random() * chineseChars.length)];
      sentence += randomChar;
    }
    return sentence + "。"; // 每个句子以 "。" 结尾
  };

  // 随机生成句子个数在 minSentences 到 maxSentences 之间
  const sentenceCount =
    Math.floor(Math.random() * (maxSentences - minSentences + 1)) +
    minSentences;
  let result = "";

  for (let i = 0; i < sentenceCount; i++) {
    result += generateSentence() + " ";
  }

  return result.trim();
}

export function generateRandomChineseSentence(
  minLength: number,
  maxLength: number
): string {
  // 判断参数是否合法
  if (
    typeof minLength !== "number" ||
    typeof maxLength !== "number" ||
    minLength < 1 ||
    maxLength < 1 ||
    minLength > maxLength
  ) {
    return "--ban--";
  }
  // 随机生成一个中文句子，字符数在 minLength 和 maxLength 之间
  const sentenceLength =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let sentence = "";

  for (let i = 0; i < sentenceLength; i++) {
    const randomChar =
      chineseChars[Math.floor(Math.random() * chineseChars.length)];
    sentence += randomChar;
  }

  return sentence;
}
const englishWords = [
  "the",
  "is",
  "in",
  "and",
  "to",
  "a",
  "of",
  "for",
  "on",
  "with",
  "by",
  "an",
  "this",
  "that",
  "I",
  "you",
  "we",
  "he",
  "she",
  "it",
  "they",
  "are",
  "was",
  "were",
  "be",
  "have",
  "had",
  "will",
  "can",
  "could",
  "do",
  "does",
  "did",
  "doing",
  "say",
  "says",
  "said",
  "make",
  "makes",
  "made",
  "go",
  "goes",
  "went",
  "come",
  "comes",
  "came",
  "know",
  "knows",
  "knew",
  "want",
  "wants",
  "wanted",
  "see",
  "sees",
  "saw",
  "look",
  "looks",
  "looking",
  "find",
  "finds",
  "found",
  "think",
  "thinks",
  "thought",
  "talk",
  "talks",
  "talked",
  "work",
  "works",
  "worked",
  "play",
  "plays",
  "played",
  "eat",
  "eats",
  "ate",
  "drink",
  "drinks",
  "drank",
  "sleep",
  "sleeps",
  "slept",
  "read",
  "reads",
  "reading",
  "write",
  "writes",
  "wrote",
  "write",
  "writes",
  "wrote",
  "learn",
  "learns",
  "learned",
  "study",
  "studies",
  "studied",
  "teach",
  "teaches",
  "taught",
  "help",
  "helps",
  "helped",
  "try",
  "tries",
  "tried",
  "ask",
  "asks",
  "asked",
  "answer",
  "answers",
  "answered",
  "understand",
  "understands",
  "understood",
];

export function generateRandomEnglishSentences(
  minSentences: number,
  maxSentences: number
): string {
  // 判断参数是否合法
  if (
    typeof minSentences !== "number" ||
    typeof maxSentences !== "number" ||
    minSentences < 1 ||
    maxSentences < 1 ||
    minSentences > maxSentences
  ) {
    return "--ban--";
  }
  // 随机生成一个英文句子，单词数在10到20之间
  const generateSentence = () => {
    const sentenceLength = Math.floor(Math.random() * 11) + 10; // 生成10到20之间的随机长度
    let sentence = "";
    for (let i = 0; i < sentenceLength; i++) {
      const randomWord =
        englishWords[Math.floor(Math.random() * englishWords.length)];
      sentence += randomWord + " ";
    }
    return sentence.trim() + "."; // 每个句子以 "." 结尾
  };

  // 随机生成句子个数在 minSentences 到 maxSentences 之间
  const sentenceCount =
    Math.floor(Math.random() * (maxSentences - minSentences + 1)) +
    minSentences;
  let result = "";

  for (let i = 0; i < sentenceCount; i++) {
    result += generateSentence() + " ";
  }

  return result.trim();
}

export function generateRandomEnglishSentence(
  minWords: number,
  maxWords: number
): string {
  // 判断参数是否合法
  if (
    typeof minWords !== "number" ||
    typeof maxWords !== "number" ||
    minWords < 1 ||
    maxWords < 1 ||
    minWords > maxWords
  ) {
    return "--ban--";
  }

  // 随机生成一个英文句子，单词数在 minWords 和 maxWords 之间
  const sentenceLength =
    Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  let sentence = "";

  for (let i = 0; i < sentenceLength; i++) {
    const randomWord =
      englishWords[Math.floor(Math.random() * englishWords.length)];
    sentence += randomWord + " ";
  }

  return sentence.trim() + "."; // 每个句子以 "." 结尾
}

export function generateRandomWord(
  minLength: number,
  maxLength: number
): string {
  // 判断参数是否合法
  if (
    typeof minLength !== "number" ||
    typeof maxLength !== "number" ||
    minLength < 1 ||
    maxLength < 1 ||
    minLength > maxLength
  ) {
    return "--ban--";
  }

  // 定义字母表
  const letters = "abcdefghijklmnopqrstuvwxyz";

  // 随机生成一个单词的长度
  const wordLength =
    Math.floor(Math.random() * (maxLength - minLength + 1)) + minLength;
  let word = "";

  // 随机生成单词
  for (let i = 0; i < wordLength; i++) {
    const randomLetter = letters[Math.floor(Math.random() * letters.length)];
    word += randomLetter;
  }

  return word;
}

export function generateRandomEnglishTitle(
  minWords: number,
  maxWords: number
): string {
  // 判断参数是否合法
  if (
    typeof minWords !== "number" ||
    typeof maxWords !== "number" ||
    minWords < 1 ||
    maxWords < 1 ||
    minWords > maxWords
  ) {
    return "--ban--";
  }
  // 随机生成一个英文句子，单词数在 minWords 和 maxWords 之间
  const sentenceLength =
    Math.floor(Math.random() * (maxWords - minWords + 1)) + minWords;
  let sentence = "";

  for (let i = 0; i < sentenceLength; i++) {
    const randomWord =
      englishWords[Math.floor(Math.random() * englishWords.length)];
    sentence += randomWord.charAt(0).toUpperCase() + randomWord.slice(1) + " ";
  }

  return sentence.trim(); // 返回句子，去掉末尾多余的空格
}
const regions = [
  "华北",
  "华东",
  "华南",
  "华中",
  "西南",
  "西北",
  "东北",
  "港澳台",
];

export function generateRandomChinaRegion(): string {
  // 随机选择一个区域
  const randomRegion = regions[Math.floor(Math.random() * regions.length)];
  return randomRegion;
}

const provinces = [
  "北京市",
  "天津市",
  "河北省",
  "山西省",
  "内蒙古自治区",
  "辽宁省",
  "吉林省",
  "黑龙江省",
  "上海市",
  "江苏省",
  "浙江省",
  "安徽省",
  "福建省",
  "江西省",
  "山东省",
  "河南省",
  "湖北省",
  "湖南省",
  "广东省",
  "广西壮族自治区",
  "海南省",
  "重庆市",
  "四川省",
  "贵州省",
  "云南省",
  "西藏自治区",
  "陕西省",
  "甘肃省",
  "青海省",
  "宁夏回族自治区",
  "新疆维吾尔自治区",
  "香港特别行政区",
  "澳门特别行政区",
  "台湾省",
];

export function generateRandomChinaProvince(): string {
  // 随机选择一个省份
  const randomProvince =
    provinces[Math.floor(Math.random() * provinces.length)];
  return randomProvince;
}

export function generateRandomChinaCity(includeProvince: string): string {
  // 参数验证
  if (includeProvince !== "true" && includeProvince !== "false") {
    return "--ban--";
  }

  // 中国城市及省份映射
  const cityData: any = {
    北京市: "北京市",
    天津市: "天津市",
    石家庄: "河北省",
    唐山: "河北省",
    邯郸: "河北省",
    秦皇岛: "河北省",
    保定: "河北省",
    张家口: "河北省",
    承德: "河北省",
    廊坊: "河北省",
    沧州: "河北省",
    衡水: "河北省",
    太原: "山西省",
    大同: "山西省",
    阳泉: "山西省",
    长治: "山西省",
    晋城: "山西省",
    朔州: "山西省",
    晋中: "山西省",
    运城: "山西省",
    临汾: "山西省",
    吕梁: "山西省",
    呼和浩特: "内蒙古自治区",
    包头: "内蒙古自治区",
    乌海: "内蒙古自治区",
    赤峰: "内蒙古自治区",
    通辽: "内蒙古自治区",
    鄂尔多斯: "内蒙古自治区",
    和林格尔: "内蒙古自治区",
    大连: "辽宁省",
    沈阳: "辽宁省",
    鞍山: "辽宁省",
    抚顺: "辽宁省",
    本溪: "辽宁省",
    丹东: "辽宁省",
    锦州: "辽宁省",
    营口: "辽宁省",
    阜新: "辽宁省",
    辽阳: "辽宁省",
    盘锦: "辽宁省",
    铁岭: "辽宁省",
    朝阳: "辽宁省",
    葫芦岛: "辽宁省",
    哈尔滨: "黑龙江省",
    齐齐哈尔: "黑龙江省",
    牡丹江: "黑龙江省",
    佳木斯: "黑龙江省",
    大庆: "黑龙江省",
    伊春: "黑龙江省",
    鸡西: "黑龙江省",
    鹤岗: "黑龙江省",
    双鸭山: "黑龙江省",
    松花江: "黑龙江省",
    南京: "江苏省",
    苏州: "江苏省",
    无锡: "江苏省",
    徐州: "江苏省",
    常州: "江苏省",
    南通: "江苏省",
    连云港: "江苏省",
    淮安: "江苏省",
    盐城: "江苏省",
    扬州: "江苏省",
    镇江: "江苏省",
    泰州: "江苏省",
    宿迁: "江苏省",
    杭州: "浙江省",
    宁波: "浙江省",
    温州: "浙江省",
    嘉兴: "浙江省",
    湖州: "浙江省",
    绍兴: "浙江省",
    金华: "浙江省",
    衢州: "浙江省",
    舟山: "浙江省",
    台州: "浙江省",
    丽水: "浙江省",
    合肥: "安徽省",
    芜湖: "安徽省",
    蚌埠: "安徽省",
    淮南: "安徽省",
    马鞍山: "安徽省",
    淮北: "安徽省",
    铜陵: "安徽省",
    安庆: "安徽省",
    黄山: "安徽省",
    滁州: "安徽省",
    阜阳: "安徽省",
    宿州: "安徽省",
    六安: "安徽省",
    亳州: "安徽省",
    池州: "安徽省",
    宣城: "安徽省",
    福州: "福建省",
    厦门: "福建省",
    漳州: "福建省",
    泉州: "福建省",
    莆田: "福建省",
    三明: "福建省",
    南平: "福建省",
    龙岩: "福建省",
    宁德: "福建省",
    南昌: "江西省",
    九江: "江西省",
    上饶: "江西省",
    鹰潭: "江西省",
    宜春: "江西省",
    赣州: "江西省",
    吉安: "江西省",
    抚州: "江西省",
    景德镇: "江西省",
    萍乡: "江西省",
    新余: "江西省",
    济南: "山东省",
    青岛: "山东省",
    淄博: "山东省",
    枣庄: "山东省",
    烟台: "山东省",
    潍坊: "山东省",
    济宁: "山东省",
    泰安: "山东省",
    威海: "山东省",
    日照: "山东省",
    莱芜: "山东省",
    临沂: "山东省",
    德州: "山东省",
    聊城: "山东省",
    滨州: "山东省",
    菏泽: "山东省",
    郑州: "河南省",
    开封: "河南省",
    洛阳: "河南省",
    平顶山: "河南省",
    安阳: "河南省",
    鹤壁: "河南省",
    新乡: "河南省",
    焦作: "河南省",
    濮阳: "河南省",
    许昌: "河南省",
    漯河: "河南省",
    三门峡: "河南省",
    南阳: "河南省",
    商丘: "河南省",
    信阳: "河南省",
    周口: "河南省",
    驻马店: "河南省",
  };

  // 获取所有城市的列表
  const cities = Object.keys(cityData);
  // 随机选择一个城市
  const randomCity = cities[Math.floor(Math.random() * cities.length)];

  // 根据参数决定是否返回省份
  if (includeProvince === "true") {
    return `${randomCity} (${cityData[randomCity]})`;
  } else {
    return randomCity;
  }
}

export function generateRandomChinaZone(includeProvinceCity: string): string {
  // 参数验证
  if (includeProvinceCity !== "true" && includeProvinceCity !== "false") {
    return "--ban--";
  }

  // 中国地区及其对应的省市
  const regionsData = [
    { region: "红寺堡区", provinceCity: "宁夏回族自治区 吴忠市" },
    { region: "呼兰区", provinceCity: "黑龙江省 哈尔滨市" },
    { region: "天山区", provinceCity: "新疆维吾尔自治区 乌鲁木齐市" },
    { region: "海珠区", provinceCity: "广东省 广州市" },
    { region: "南山区", provinceCity: "广东省 深圳市" },
    { region: "高新区", provinceCity: "四川省 成都市" },
    { region: "岳麓区", provinceCity: "湖南省 长沙市" },
    { region: "东城区", provinceCity: "北京市" },
    { region: "黄浦区", provinceCity: "上海市" },
    { region: "玄武区", provinceCity: "江苏省 南京市" },
    { region: "武侯区", provinceCity: "四川省 成都市" },
    { region: "梅河口市", provinceCity: "吉林省 通化市" },
    { region: "内蒙古自治区", provinceCity: "呼和浩特市" },
    { region: "双桥区", provinceCity: "重庆市" },
    { region: "河东区", provinceCity: "天津市" },
    // 可以继续扩展更多区域...
  ];

  // 随机选择一个区域
  const randomRegion =
    regionsData[Math.floor(Math.random() * regionsData.length)];

  // 根据参数决定是否返回省市
  if (includeProvinceCity === "true") {
    return `${randomRegion.region} (${randomRegion.provinceCity})`;
  } else {
    return randomRegion.region;
  }
}

export function generateRandomChinaPostalCode(): string {
  // 随机生成一个6位的数字作为邮编
  const postalCode = Math.floor(Math.random() * 1000000)
    .toString()
    .padStart(6, "0");

  // 返回生成的邮政编码
  return postalCode;
}

export function generateRandomEmail(): string {
  // 随机生成用户名（长度在5到10个字符之间）
  const usernameLength = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
  const username = generateRandomString(usernameLength);

  // 随机生成一个域名（由字母和数字组成）
  const domainNameLength = Math.floor(Math.random() * (8 - 5 + 1)) + 5;
  const domainName = generateRandomString(domainNameLength);

  // 随机选择一个顶级域名（.com, .net, .org等）
  const topLevelDomains = [".com", ".net", ".org", ".cn", ".co"];
  const topLevelDomain =
    topLevelDomains[Math.floor(Math.random() * topLevelDomains.length)];

  // 返回生成的邮箱地址
  return `${username}@${domainName}${topLevelDomain}`;
}

// 辅助函数：生成随机字符串（用于生成邮箱用户名和域名）
function generateRandomString(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomIPv4(): string {
  // 随机生成四个0-255之间的数字，并拼接成IPv4地址
  const randomOctet = () => Math.floor(Math.random() * 256);

  // 返回生成的IPv4地址
  return `${randomOctet()}.${randomOctet()}.${randomOctet()}.${randomOctet()}`;
}

export function generateRandomUrl(protocol: string): string {
  // 随机生成一个域名
  const domainNameLength = Math.floor(Math.random() * (10 - 5 + 1)) + 5; // 域名长度在5到10之间
  const domainName = generateRandomStringUrl(domainNameLength);

  // 随机选择一个顶级域名
  const topLevelDomains = [".com", ".org", ".net", ".io", ".co"];
  const topLevelDomain =
    topLevelDomains[Math.floor(Math.random() * topLevelDomains.length)];

  // 随机生成一个路径（可选）
  const pathLength = Math.floor(Math.random() * (5 - 3 + 1)) + 3; // 路径长度在3到5之间
  const path = generateRandomStringUrl(pathLength);

  // 拼接并返回完整的网址
  return `${protocol}://${domainName}${topLevelDomain}/${path}`;
}

// 辅助函数：生成随机字符串（用于生成域名和路径）
function generateRandomStringUrl(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomDomain(topLevelDomain: string): string {
  // 随机生成一个域名的主体部分，长度在5到10之间
  const domainLength = Math.floor(Math.random() * (10 - 5 + 1)) + 5;
  const domainName = generateRandomDomainString(domainLength);

  // 返回完整的域名
  return `${domainName}.${topLevelDomain}`;
}

// 辅助函数：生成随机字符串（用于生成域名的主体部分）
function generateRandomDomainString(length: number): string {
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let result = "";
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateRandomProtocol(): string {
  // 定义常见的协议类型
  const protocols = [
    "http",
    "https",
    "ftp",
    "wss",
    "ws",
    "file",
    "smtp",
    "pop3",
    "imap",
    "data",
  ];

  // 从协议列表中随机选择一个
  const randomIndex = Math.floor(Math.random() * protocols.length);

  // 返回随机选择的协议
  return protocols[randomIndex];
}

export function generateRandomTopLevelDomain(): string {
  // 定义常见的顶级域名
  const topLevelDomains = [
    "com",
    "org",
    "net",
    "io",
    "co",
    "edu",
    "gov",
    "biz",
    "info",
  ];

  // 从顶级域名列表中随机选择一个
  const randomIndex = Math.floor(Math.random() * topLevelDomains.length);

  // 返回随机选择的顶级域名
  return topLevelDomains[randomIndex];
}

export function generateDataImage(
  imageSize: string,
  text: string,
  color: string
): string {
  // 验证图片尺寸格式是否为 '宽x高'
  const sizePattern = /^(\d+)x(\d+)$/;
  const match = imageSize.match(sizePattern);

  if (!match) {
    return "--ban--"; // 参数格式错误，返回 "--ban--"
  }

  const width: any = match[1]; // 获取宽度
  const height: any = match[2]; // 获取高度

  // 构建 SVG 字符串
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" version="1.1" baseProfile="full" width="${width}" height="${height}">
                      <rect width="100%" height="100%" fill="${color}" />
                      <text x="${width / 2}" y="${
    height / 2
  }" font-size="20" alignment-baseline="middle" text-anchor="middle" fill="white">${text}</text>
                    </svg>`;

  // 将 SVG 字符串编码为 URI 格式
  const encodedSvg = encodeURIComponent(svgString);

  // 返回完整的 data:image/svg+xml 格式字符串
  return `data:image/svg+xml;charset=UTF-8,${encodedSvg}`;
}

export function generateRandomHexColor(): string {
  // 生成随机的 RGB 颜色值，每个颜色的值范围是 0 - 255
  const red = Math.floor(Math.random() * 256);
  const green = Math.floor(Math.random() * 256);
  const blue = Math.floor(Math.random() * 256);

  // 将 RGB 值转换为16进制，并拼接成 #RRGGBB 格式
  const hexColor = `#${((1 << 24) | (red << 16) | (green << 8) | blue)
    .toString(16)
    .slice(1)
    .toUpperCase()}`;

  // 返回生成的16进制颜色
  return hexColor;
}

export function generateRandomRgbaColor(): string {
  // 生成随机的 RGB 值，每个颜色的值范围是 0 - 255
  const red = Math.floor(Math.random() * 256);
  const green = Math.floor(Math.random() * 256);
  const blue = Math.floor(Math.random() * 256);

  // 生成一个随机的 alpha 值，范围是 0 到 1
  const alpha = Math.random().toFixed(2); // 保留两位小数

  // 返回 rgba 格式的颜色值
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

export function generateRandomRgbColor(): string {
  // 生成随机的 RGB 值，每个颜色的值范围是 0 - 255
  const red = Math.floor(Math.random() * 256);
  const green = Math.floor(Math.random() * 256);
  const blue = Math.floor(Math.random() * 256);

  // 返回 rgb 格式的颜色值
  return `rgb(${red}, ${green}, ${blue})`;
}

export function generateRandomHslColor(): string {
  // 随机生成色相 (0 - 360)
  const hue = Math.floor(Math.random() * 361);

  // 随机生成饱和度 (0 - 100)
  const saturation = Math.floor(Math.random() * 101);

  // 随机生成亮度 (0 - 100)
  const lightness = Math.floor(Math.random() * 101);

  // 返回 hsl 格式的颜色值
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
}

export function generateRandomContentByRegex(regex: string): string {
  try {
    // 检查正则表达式是否有效
    const pattern = new RegExp(regex);

    // 如果正则表达式匹配了某些特定模式，我们就可以根据规则生成内容
    let result = "";

    // 匹配 'a' - 'z' 或 'A' - 'Z' 或数字等示例 (可以根据需要扩展支持其他正则)
    if (pattern.test("a")) {
      result = "a"; // 示例：如果正则中包含字符匹配，就生成一个字符
    } else if (pattern.test("1")) {
      result = "1"; // 示例：如果正则中包含数字匹配，就生成一个数字
    } else if (pattern.test("[a-z]")) {
      // 生成小写字母
      result = String.fromCharCode(Math.floor(Math.random() * 26) + 97);
    } else if (pattern.test("[A-Z]")) {
      // 生成大写字母
      result = String.fromCharCode(Math.floor(Math.random() * 26) + 65);
    } else if (pattern.test("[0-9]")) {
      // 生成数字
      result = Math.floor(Math.random() * 10).toString();
    }

    return result;
  } catch (e) {
    // 如果正则无效，返回 "--ban--"
    return "--ban--";
  }
}

export function generateRandomStringFromRegex(regex: any) {
  const pattern = regex
    .replace(/^\/|\/$/g, "")
    .replace(/^\^/, "")
    .replace(/\$$/, "");

  const elements = parsePattern(pattern);
  return generateFromElements(elements);

  function parsePattern(pattern: any) {
    let elements = [];
    let pos = 0;
    while (pos < pattern.length) {
      let currentChar = pattern[pos];
      if (currentChar === "[") {
        let endIndex = pattern.indexOf("]", pos + 1);
        if (endIndex === -1) throw new Error("Unclosed character class");
        const charClassContent = pattern.substring(pos + 1, endIndex);
        pos = endIndex + 1;
        const chars = parseCharacterClass(charClassContent);
        const quantifier = parseQuantifier(pattern, pos);
        pos += quantifier.raw.length;
        elements.push({ chars, quantifier });
      } else if (currentChar === "\\") {
        const escapeChar = pattern[pos + 1];
        pos += 2;
        let chars;
        switch (escapeChar) {
          case "d":
            chars = [..."0123456789"];
            break;
          case "w":
            chars = [
              ..."ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_",
            ];
            break;
          case "s":
            chars = [" ", "\t", "\n", "\r", "\f", "\v"];
            break;
          default:
            chars = [escapeChar];
        }
        const quantifier = parseQuantifier(pattern, pos);
        pos += quantifier.raw.length;
        elements.push({ chars, quantifier });
      } else {
        const char = currentChar;
        pos += 1;
        const quantifier = parseQuantifier(pattern, pos);
        pos += quantifier.raw.length;
        elements.push({ chars: [char], quantifier });
      }
    }
    return elements;
  }

  function parseCharacterClass(content: any) {
    let chars = [];
    let pos = 0;
    const isNegated = content[0] === "^";
    if (isNegated) {
      console.error("Negated character classes are not supported");
      return [];
    }
    pos = isNegated ? 1 : 0;
    while (pos < content.length) {
      if (content[pos] === "\\") {
        chars.push(content[pos + 1]);
        pos += 2;
      } else if (pos < content.length - 2 && content[pos + 1] === "-") {
        const start = content[pos];
        const end = content[pos + 2];
        for (let c = start.charCodeAt(0); c <= end.charCodeAt(0); c++) {
          chars.push(String.fromCharCode(c));
        }
        pos += 3;
      } else {
        chars.push(content[pos]);
        pos += 1;
      }
    }
    return chars;
  }

  function parseQuantifier(pattern: any, pos: any) {
    if (pos >= pattern.length) return { min: 1, max: 1, raw: "" };
    const startPos = pos;
    let currentChar = pattern[pos];
    let quantifier = { min: 1, max: 1, raw: "" };
    if (currentChar === "{") {
      const endIndex = pattern.indexOf("}", pos);
      if (endIndex === -1) return quantifier;
      const content = pattern.substring(pos + 1, endIndex);
      quantifier.raw = pattern.substring(pos, endIndex + 1);
      const parts = content.split(",").map((p: any) => p.trim());
      if (parts.length === 1) {
        const exact = parseInt(parts[0], 10);
        if (!isNaN(exact)) {
          quantifier.min = exact;
          quantifier.max = exact;
        }
      } else {
        const min = parseInt(parts[0], 10) || 0;
        const max = parts[1] ? parseInt(parts[1], 10) : Infinity;
        quantifier.min = min;
        quantifier.max = max;
      }
      return quantifier;
    } else if (currentChar === "*") {
      quantifier.raw = "*";
      quantifier.min = 0;
      quantifier.max = Infinity;
    } else if (currentChar === "+") {
      quantifier.raw = "+";
      quantifier.min = 1;
      quantifier.max = Infinity;
    } else if (currentChar === "?") {
      quantifier.raw = "?";
      quantifier.min = 0;
      quantifier.max = 1;
    } else {
      return quantifier;
    }
    pos += quantifier.raw.length;
    return quantifier;
  }

  function generateFromElements(elements: any) {
    let str = "";
    for (const { chars, quantifier } of elements) {
      if (chars.length === 0) continue;
      let min = quantifier.min;
      let max = quantifier.max === Infinity ? min + 20 : quantifier.max;
      max = Math.max(min, max);
      const count =
        min === max ? min : Math.floor(Math.random() * (max - min + 1)) + min;
      for (let i = 0; i < count; i++) {
        const randomChar = chars[Math.floor(Math.random() * chars.length)];
        str += randomChar;
      }
    }
    return str;
  }
}

let currentNumber = 0;

export function generateIncrementalNumber(step: number): number | string {
  // 判断步长是否为正整数
  if (typeof step !== "number" || step <= 0 || !Number.isInteger(step)) {
    return "--ban--";
  }

  // 每次调用函数时，将当前数字增加步长
  currentNumber += step;

  return currentNumber;
}

export function generateGUID(): string {
  // 返回符合 GUID 格式的字符串
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function generateUUID(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function (c) {
    let r = (Math.random() * 16) | 0,
      v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

export function convertToUpperCase(str: string): string {
  // 判断参数是否为字符串
  if (typeof str !== "string") {
    return "--ban--";
  }

  return str.toUpperCase();
}

export function convertToLowerCase(str: string): string {
  // 判断参数是否为字符串
  if (typeof str !== "string") {
    return "--ban--";
  }

  return str.toLowerCase();
}

export function randomSelectElement(arrStr: string): string {
  try {
    // 尝试将字符串转换为数组
    const arr = JSON.parse(arrStr);

    // 判断转换后的参数是否是一个数组且不为空
    if (!Array.isArray(arr) || arr.length === 0) {
      return "--ban--";
    }

    // 随机选择一个元素
    const randomIndex = Math.floor(Math.random() * arr.length);
    return arr[randomIndex];
  } catch (e) {
    // 如果字符串无法解析为数组，返回 "--ban--"
    return "--ban--";
  }
}

export function shuffleArray(arrStr: string): string[] | string {
  try {
    // 尝试将字符串转换为数组
    const arr = JSON.parse(arrStr);

    // 判断转换后的参数是否是一个数组且不为空
    if (!Array.isArray(arr) || arr.length === 0) {
      return "--ban--";
    }

    // 使用 Fisher-Yates 算法对数组进行打乱
    for (let i = arr.length - 1; i > 0; i--) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[randomIndex]] = [arr[randomIndex], arr[i]]; // 交换元素
    }

    return arr;
  } catch (e) {
    // 如果字符串无法解析为数组，返回 "--ban--"
    return "--ban--";
  }
}
