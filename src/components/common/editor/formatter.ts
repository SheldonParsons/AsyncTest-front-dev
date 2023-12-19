function cleanJSON(value:any):any {
  if (Array.isArray(value)) {
    return value.map(cleanJSON);
  } else if (typeof value === 'object' && value !== null) {
    const cleanedObj:any = {};
    for (const key in value) {
      cleanedObj[key] = cleanJSON(value[key]);
    }
    return cleanedObj;
  } else if (typeof value === 'string') {
    // 移除字符串中的HTML标签
    return value.replace(/<\/?.+?>/g, '');
  }
  return value;
}

function JSONTrim(JSONstr:any) {
  try {
    // 解析JSON字符串
    const parsedJSON = JSON.parse(JSONstr);

    // 定义一个递归函数来遍历和清理JSON对象或数组
    

    // 应用清理函数
    const cleanedJSON = cleanJSON(parsedJSON);

    // 将清理后的JSON对象转换回字符串
    return JSON.stringify(cleanedJSON);
  } catch (error) {
    return JSONstr;
  }
}


function tryJsonStr(value:any) {
  try {
    if (typeof value === 'string') {
      return value
    } else {
      return JSON.stringify(value)
    }
  } catch (error) {
    return value
  }
}

function JSONFormat(JSONstr:any) {
  // 备份原始的{{}}包裹的内容
  let specialContents:any = [];
  JSONstr = JSONstr.replace(/{{.*?}}/g, (match:any) => {
    specialContents.push(match);
    return `{{SPECIAL_CONTENT_${specialContents.length - 1}}}`;
  });
  try {
    // 使用JSONTrim清理JSON字符串
    JSONstr = JSONTrim(JSONstr);

    // 解析JSON
    const parsedJSON = JSON.parse(JSONstr);

    // 自定义格式化函数
    function customStringify(obj:any, indent = 0): any {
      const indentSpace = '  '; // 使用两个空格作为基本缩进单位
      const currentIndent = indentSpace.repeat(indent);
      const nextIndent = indentSpace.repeat(indent + 1);

      if (Array.isArray(obj)) {
        // 处理数组
        const items = obj.map(item => customStringify(item, indent + 1));
        return `[\n${nextIndent}${items.join(`,\n${nextIndent}`)}\n${currentIndent}]`;
      } else if (typeof obj === 'object' && obj !== null) {
        // 处理对象
        const keys = Object.keys(obj);
        const items = keys.map(key => `${nextIndent}"${key}": ${customStringify(obj[key], indent + 1)}`);
        return `{\n${items.join(',\n')}\n${currentIndent}}`;
      } else {
        // 其他类型直接转换为字符串
        return JSON.stringify(obj);
      }
    }


    // 应用自定义格式化函数
    let formattedJSON = customStringify(parsedJSON);

    // 还原{{}}包裹的特殊内容
    formattedJSON = formattedJSON.replace(/{{SPECIAL_CONTENT_(\d+)}}/g, (match:any, index:any) => {
      return specialContents[index];
    });

    return formattedJSON;
  } catch (error) {
    JSONstr = JSONstr.replace(/{{SPECIAL_CONTENT_(\d+)}}/g, (match:any, index:any) => {
      return specialContents[index];
    });
    return restoreSpecialContent(JSONstr);
  }
}

function restoreSpecialContent(str:string) {
  return str.replace(/&#123;&#123;.*?&#125;&#125;/g, (match) => {
    return match.replace(/&#58;/g, ':').replace(/&#44;/g, ',').replace(/&#123;/g, '{').replace(/&#125;/g, '}');
  });
}



export default JSONFormat
