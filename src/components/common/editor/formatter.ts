export function JSONFormat(JSONstr: any) {
  if (JSONstr === "") {
    return JSONstr;
  }
  try {
    const { processedJson, placeholders } = processJson(JSONstr);
    const formattedJson = JSON.stringify(JSON.parse(processedJson), null, 2);
    const result = restorePlaceholders(formattedJson, placeholders);
    if (Array.isArray(result) && result.length === 0) return '[]';
    return result
  } catch (error) {
    if (Array.isArray(JSONstr) && JSONstr.length === 0) return '[]';
    return JSONstr;
  }
}

export function JSONFormatError(JSONstr: any) {
  if (JSONstr === "") {
    return JSONstr;
  }
  try {
    const { processedJson, placeholders } = processJson(JSONstr);
    const formattedJson = JSON.stringify(JSON.parse(processedJson), null, 2);
    return restorePlaceholders(formattedJson, placeholders);
  } catch (error) {
    return false;
  }
}

function processJson(jsonString: string) {
  let result = "";
  let placeholders = [];
  let index = 0;
  let inQuotes = false;
  let escaped = false;

  let i = 0;
  while (i < jsonString.length) {
    const char = jsonString[i];

    if (char === "\\" && !escaped) {
      escaped = true;
      result += char;
      i++;
      continue;
    }

    if (char === '"' && !escaped) {
      inQuotes = !inQuotes;
      result += char;
      i++;
      continue;
    }

    escaped = false;

    if (!inQuotes) {
      // Checking for placeholders
      if (
        jsonString.substring(i, i + 2) === "{{" &&
        jsonString.indexOf("}}", i) !== -1
      ) {
        const endIdx = jsonString.indexOf("}}", i) + 2;
        const placeholderContent = jsonString.substring(i, endIdx);
        const placeholder = `"@@PLACEHOLDER_${index++}@@"`;
        placeholders.push({ placeholder, original: placeholderContent });
        result += placeholder;
        i = endIdx;
        continue;
      }
      if (
        jsonString.substring(i, i + 2) === "{%" &&
        jsonString.indexOf("%}", i) !== -1
      ) {
        const endIdx = jsonString.indexOf("%}", i) + 2;
        const placeholderContent = jsonString.substring(i, endIdx);
        const placeholder = `"@@PLACEHOLDER_${index++}@@"`;
        placeholders.push({ placeholder, original: placeholderContent });
        result += placeholder;
        i = endIdx;
        continue;
      }

      // Checking for large numbers
      const numMatch = jsonString.substring(i).match(/^\d+/);
      if (numMatch) {
        const numString = numMatch[0];
        if (numString.length >= 15) {
          const placeholder = `"@@PLACEHOLDER_${index++}@@"`;
          placeholders.push({ placeholder, original: numString });
          result += placeholder;
          i += numString.length;
          continue;
        }
      }
    }

    result += char;
    i++;
  }

  return { processedJson: result, placeholders };
}

function restorePlaceholders(formattedJson: any, placeholders: any) {
  let result = formattedJson;
  for (const { placeholder, original } of placeholders) {
    result = result.replace(`${placeholder}`, original);
  }
  return result;
}

function restoreSpecialContent(str: string) {
  return str.replace(/&#123;&#123;.*?&#125;&#125;/g, (match) => {
    return match
      .replace(/&#58;/g, ":")
      .replace(/&#44;/g, ",")
      .replace(/&#123;/g, "{")
      .replace(/&#125;/g, "}");
  });
}

export function replaceSpecialContents(JSONstr: any) {
  let specialContents: any = [];
  let bigNumberContents: any = [];

  const replacedJSON = JSONstr.replace(/{{.*?}}/g, (match: any) => {
    specialContents.push(match);
    return `{{SPECIAL_CONTENT_${specialContents.length - 1}}}`;
  }).replace(/\d{15,}/g, (match: any) => {
    bigNumberContents.push(match);
    return `111111${bigNumberContents.length - 1}`;
  });

  return {
    replacedJSON,
    specialContents,
    bigNumberContents,
  };
}

export function restoreSpecialContents(
  JSONstr: any,
  specialContents: any,
  bigNumberContents: any
) {
  const restoredJSON = JSONstr.replace(
    /{{SPECIAL_CONTENT_(\d+)}}/g,
    (match: any, index: any) => {
      return specialContents[index];
    }
  ).replace(/111111(\d+)/g, (match: any, index: any) => {
    return bigNumberContents[index];
  });

  return restoredJSON;
}

export function preprocessJson(jsonString: string) {
  let inQuotes = false;
  let escaped = false;
  let result = "";
  let i = 0;

  // 定义要处理的占位符类型
  const placeholders = [
    { start: '{{', end: '}}' },  // 处理 {{...}}
    { start: '{%', end: '%}' }   // 新增处理 {%...%}
  ];

  while (i < jsonString.length) {
    const char = jsonString[i];

    // 处理转义字符（如 \"）
    if (char === '\\' && !escaped) {
      escaped = true;
      result += char;
      i++;
      continue;
    }

    // 处理引号边界（非转义状态下的 "）
    if (char === '"' && !escaped) {
      inQuotes = !inQuotes;
    }

    // 重置转义状态（每次处理完一个字符后）
    if (escaped) escaped = false;

    // 检查是否在字符串外且匹配到占位符起始标记
    let foundPlaceholder = false;
    if (!inQuotes) {
      for (const { start, end } of placeholders) {
        if (jsonString.startsWith(start, i)) {
          // 查找结束标记的位置
          const endIndex = jsonString.indexOf(end, i + start.length);
          if (endIndex !== -1) {
            // 计算占位符总长度并替换
            const totalLength = endIndex + end.length - i;
            const contentLength = totalLength - start.length - end.length;
            result += `"${'0'.repeat(contentLength)}"`;
            i = endIndex + end.length;  // 跳过已处理部分
            foundPlaceholder = true;
            break;
          }
        }
      }
    }

    // 如果未处理占位符，正常追加字符
    if (!foundPlaceholder) {
      result += char;
      i++;
    }
  }

  return result;
}
