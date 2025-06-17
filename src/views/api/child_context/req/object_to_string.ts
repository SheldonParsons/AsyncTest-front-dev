import { input_content_mapping } from "@/views/api/child_component/params_child/content/function_name_mapping";
import * as InnerFunction from "@/views/api/child_component/params_child/dialog_page/inner_function";

let variable_mapping: any = {};
// 模拟函数库（需要你完善实际逻辑）
const funcLib: any = {
  mock: input_content_mapping,
  fixed: (input_value: any, process_list: any) => {
    process_list.forEach((process: any) => {
      const function_sign = modifyFunctionCalls(process, input_value);
      const dynamicFunc = new Function(
        "InnerFunction",
        `return InnerFunction.${function_sign};`
      );
      input_value = dynamicFunc(InnerFunction); // 执行动态函数
    });
    return input_value;
  },
};

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

// 类型转换处理器
function typeConverter(value: any, type: any) {
  try {
    switch (type) {
      case "integer":
        return (/^\d+$/.test(value) ? parseInt(value, 10) : NaN) || 0;
      case "number":
        return (/^-?\d+(\.\d+)?$/.test(value) ? parseFloat(value) : NaN) || 0.0;
      case "boolean":
        return value === "true" ? true : false;
      case "null":
        return null;
      case "array":
        return [];
      default:
        return value;
    }
  } catch {
    // 转换失败返回类型默认值
    const default_value: any = {
      integer: 0,
      number: 0.0,
      boolean: false,
      null: null,
      array: [],
      object: {},
    };
    return default_value[type] || value;
  }
}

// 递归处理节点
function processNode(node: any) {
  if (node.t === "null") return null;

  // 处理有子节点的情况
  if (["object", "array"].includes(node.t)) {
    if (!node.children) {
      return node.t === "object" ? {} : [];
    }

    const result: any = node.t === "object" ? {} : [];
    if (node.t === "array") {
      for (const child of node.children) {
        result.push(processNode(child));
      }
    }
    if (node.t === "object") {
      for (const child of node.children) {
        const key = child.name;
        result[key] = processNode(child);
      }
    }
    return result;
  }

  // 处理叶子节点
  const rawValue = parseTemplate(node.default);
  const res = typeConverter(rawValue, node.t);
  return res;
}

function parseTemplateAndTypeConverter(schema: any) {
  const rawValue = parseTemplate(schema.default);
  return typeConverter(rawValue, schema.t);
}

function parseTemplateAndTypeConverterValue(value: any, t: any) {
  const rawValue = parseTemplate(value);
  return typeConverter(rawValue, t);
}

// 主转换函数
export function convertSchemaToObject(schema: any, mapping: any = {}) {
  try {
    if (schema === undefined) {
      return "";
    }
    variable_mapping = mapping;

    if (Array.isArray(schema)) {
      let cache_list = [];
      for (let i = 0; i < schema.length; i++) {
        const res = processNode(schema[i]);
        cache_list.push({
          [schema[i].name] : res
        });
      }
      return JSON.stringify(cache_list, null, 2);
    }

    if (typeof schema === "string") {
      return parseTemplateAndTypeConverterValue(schema, "string");
    }
    if (["string", "boolean", "integer", "number"].includes(schema.t))
      return parseTemplateAndTypeConverter(schema).toString();
    const res = processNode(schema);
    return JSON.stringify(res, null, 2);
  } catch (error) {
    console.error("转换失败:", error);
    return {};
  }
}

export function convertSchemaToUrlencoded(schema: any, mapping: any = {}) {
  if (schema === undefined) {
    return "";
  }
  variable_mapping = mapping;
  const params: any = [];
  schema.forEach((field: any) => {
    if (field.t === "array") {
      field.child_list.forEach((child: any) =>
        params.push(
          `${encodeURIComponent(field.name)}=${encodeURIComponent(
            parseTemplateAndTypeConverterValue(child, "string")
          )}`
        )
      );
    } else {
      params.push(
        `${encodeURIComponent(field.name)}=${encodeURIComponent(
          parseTemplateAndTypeConverterValue(field.default, field.t)
        )}`
      );
    }
  });
  return params.join("&");
}

function parseTemplate(str: string) {
  const mockBlocks = [];
  const varBlocks = [];

  // 匹配 {% mock ... %} 块
  const mockRegex = /\{%\s*mock\s+([^%]+)\s*%\}/g;
  let mockMatch;
  while ((mockMatch = mockRegex.exec(str)) !== null) {
    const content = mockMatch[1].trim();
    const parsed = parseMockContent(content);
    const mock_result = funcLib.mock[parsed.method].func(...parsed.params);
    const res = funcLib.fixed(mock_result, parsed.filters);
    mockBlocks.push({ ...parsed, raw: mockMatch[0], result: res });
  }

  // 匹配 {{ ... }} 块
  const varRegex = /\{\{\s*([^}]+)\s*\}\}/g;
  let varMatch;
  while ((varMatch = varRegex.exec(str)) !== null) {
    const content = varMatch[1].trim();
    const parsed = parseVarContent(content);
    let variable_value = undefined;
    if (parsed.varName.startsWith("'")) {
      variable_value = parsed.varName.slice(1, -1);
    } else {
      variable_value = variable_mapping[parsed.varName];
    }
    let res = null;
    if (variable_value !== undefined) {
      res = funcLib.fixed(variable_value, parsed.filters);
    } else {
      res = "{{" + parsed.varName + "}}";
    }
    varBlocks.push({ ...parsed, raw: varMatch[0], result: res });
  }

  const res = [...mockBlocks, ...varBlocks];
  return replaceString(str, res);
}

function replaceString(original: string, replacements: any) {
  console.log(original);

  let result = original;

  for (const item of replacements) {
    const raw = item.raw;
    const res = item.result;

    // 仅替换第一个匹配项
    const index = result.indexOf(raw);
    if (index !== -1) {
      result = result.slice(0, index) + res + result.slice(index + raw.length);
    }
  }
  console.log(result);

  return result;
}

function parseMockContent(content: string) {
  const [methodPart, ...filters] = content.split("|").map((s) => s.trim());
  // 解析方法部分
  const { function_name, params } = parseArgs(methodPart);
  return {
    type: "mock",
    method: function_name,
    params,
    filters: filters,
  };
}

function parseVarContent(content: string) {
  const [varName, ...filters] = content.split("|").map((s) => s.trim());
  return {
    type: "var",
    varName,
    filters: filters,
  };
}

function parseArgs(argsStr: string) {
  const parts = argsStr.split(",").map((s) => s.trim());

  const processedParts = parts.map((part) => {
    if (part.startsWith("'") && part.endsWith("'")) {
      return part.slice(1, -1);
    } else {
      const num = Number(part);
      return isNaN(num) ? part : num;
    }
  });
  return {
    function_name: processedParts[0],
    params: processedParts.slice(1),
  };
}

//   // 示例用法
//   const inputString = `123123{% mock 'natural',10,100|concat('ii')|padStart(20,'ii') %}123123{{name|padStart(10,'ff')|padEnd(20,'gg')}}999{% mock 'natural',10,100|concat('ii')|padStart(20,'ii') %}jiji{{name|padStart(10,'ff')|padEnd(20,'gg')}}`;

//   const parsed = parseTemplate2(inputString);
//   console.log(parsed);
