import deepDiff from "deep-diff";
interface iTools {
  [propName: string]: any;
}

const tools: iTools = {};
tools.message = (
  text: String,
  proxy: any,
  level: String = "success",
  delay: Number = 3000
) => {
  proxy.$message({
    message: text,
    duration: delay,
    type: level,
  });
};

tools.delay = async () => {
  return new Promise((resolve) => {
    setTimeout(() => {
      resolve(true);
    }, 300);
  });
};

tools.getFormattedTimeMs = (timestamp: any) => {
  const date = new Date(timestamp * 1000);

  // 格式化为 yyyy:MM:dd HH:mm:ss.ms
  const formatted =
    date.getFullYear() +
    "-" +
    String(date.getMonth() + 1).padStart(2, "0") +
    "-" +
    String(date.getDate()).padStart(2, "0") +
    " " +
    String(date.getHours()).padStart(2, "0") +
    ":" +
    String(date.getMinutes()).padStart(2, "0") +
    ":" +
    String(date.getSeconds()).padStart(2, "0") +
    "." +
    String(date.getMilliseconds()).padStart(3, "0");
  return formatted;
};

tools.result_check = (data: any, proxy: any) => {
  if (data.hasOwnProperty("result") && data.result === 0) {
    tools.message(data.data, proxy, "error");
    return false;
  }
  return true;
};

tools.getRandomInt = (min: any, max: any) => {
  min = Math.ceil(min); // 确保min是整数
  max = Math.floor(max); // 确保max是整数
  return Math.floor(Math.random() * (max - min + 1)) + min; // 返回介于min和max之间的整数
};

tools.getChangedTopLevelFields = (
  data: any,
  original_data: any,
  toRaw: any
) => {
  const current = toRaw(data);
  const differences = deepDiff.diff(original_data, current);

  if (!differences) return null;

  const changedFields = new Set<string>();

  differences.forEach(({ path }: any) => {
    // 提取一级字段名（path[0]）
    // 示例：path = ['profile', 'age'] → 提取 'profile'
    if (path?.length > 0) {
      const topLevelField = path[0].toString();
      changedFields.add(topLevelField);
    }
  });

  if (changedFields.size === 0) return null;

  // 构建包含最新值的对象
  return Array.from(changedFields).reduce((acc, field) => {
    acc[field] = current[field]; // 直接取当前最新值
    return acc;
  }, {} as Record<string, unknown>);
};

tools.isChild = (treeData: any, disableId: number, targetId: number) => {
  if (disableId === targetId) return true;
  // 深度优先搜索查找指定节点
  const findNode: any = (nodes: any) => {
    for (const node of nodes) {
      if (node.id === disableId) return node;
      if (node.children?.length) {
        const found = findNode(node.children);
        if (found) return found;
      }
    }
    return null;
  };

  // 检查目标是否在子树中
  const checkChildren = (node: any) => {
    if (node.id === targetId) return true;
    return node.children?.some((child: any) => checkChildren(child)) || false;
  };

  // 如果传入的是单个节点对象，转为数组统一处理
  const rootNodes = Array.isArray(treeData) ? treeData : [treeData];
  const disableNode = findNode(rootNodes);

  // 禁用节点不存在，或目标就是禁用节点自身时返回 true
  return (
    !!disableNode && (disableNode.id === targetId || checkChildren(disableNode))
  );
};

tools.getLocaleDateTime = (utc: string, dateOnly: boolean = true) => {
  const date = new Date(utc);
  if (dateOnly) {
    return date.toLocaleDateString().split("/").join("-");
  } else {
    return date.toLocaleString().split("/").join("-");
  }
};

tools.getStartAndEndDateTime = (privateFormatString: string) => {
  if (privateFormatString.indexOf("T:") !== -1) {
    // 拆解时间区间
    const startTime = privateFormatString.split("]:[")[0].split("T:[")[1];
    const endTime = privateFormatString.split("]:[")[1].split("]")[0];
    return { startTime, endTime };
  } else {
    return false;
  }
};

export default tools;
