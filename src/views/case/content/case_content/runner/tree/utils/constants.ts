// 树形组件配置
export const defaultProps = {
  children: 'children',
  label: 'label'
}

// 动画变体配置
export const actionBtnVariants = {
  hover: { scale: 1.1, backgroundColor: '#f0f0f0' },
  tap: { scale: 0.9 }
}

export const stepActionGroup: any = {
  multitasker: ['copy', 'delete', 'addSiblingStep', 'addChildStep'],
  group: ['copy', 'delete', 'addSiblingStep', 'addChildStep'],
  if: ['copy', 'delete', 'addSiblingStep', 'addChildStep'],
  interface: ['copy', 'delete', 'addSiblingStep'],
  database: ['copy', 'delete', 'addSiblingStep'],
  error: ['copy', 'delete', 'addSiblingStep'],
  script: ['copy', 'delete', 'addSiblingStep'],
  delay: ['copy', 'delete', 'addSiblingStep'],
  case: ['copy', 'delete', 'addSiblingStep'],
  assertion: ['copy', 'delete', 'addSiblingStep']
}
/**
 * 递归地从数据结构中删除具有指定 ID 的节点。
 * 这个函数会直接修改传入的 data 数组。
 * 如果一个 'children' 列表因此变为空，则向其中添加一个 'empty' 节点。
 *
 * @param {Array<object>} data - 包含节点对象的数组。
 * @param {*} idToRemove - 要删除的节点的 ID。
 */
export const removeNodeById = (data: any, idToRemove: any, empty_node: any) => {
  // 使用倒序循环，这样在删除元素时不会影响后续元素的索引
  for (let i = data.length - 1; i >= 0; i--) {
    const node = data[i];

    // 1. 检查当前节点的 ID 是否匹配
    if (node.id === idToRemove) {
      // 如果匹配，直接从数组中删除该节点
      data.splice(i, 1);
    } else if (node.children && Array.isArray(node.children)) {
      // 2. 如果不匹配，但节点有子节点，则递归地对子节点列表进行操作
      removeNodeById(node.children, idToRemove, empty_node);

      // 3. 递归调用返回后，检查子列表是否变空
      if (node.children.length === 0) {
        // 如果为空，插入一个 empty 节点
        node.children.push(empty_node);
      }
    }
  }
}


/**
 * 根据指定位置，向数据结构中插入一个或多个新节点。
 * 此函数直接修改传入的 data 数组。
 *
 * @param {Array<object>} data - 完整的数据结构列表。
 * @param {object|Array<object>} nodeToInsert - 要插入的新节点（可以是单个对象或对象列表）。
 * @param {*} targetId - 目标节点的 ID，用于 'child' 和 'next' 定位。
 * @param {'top'|'end'|'child'|'next'} position - 插入位置。
 */
export const insertNode = (data: any, nodeToInsert: any, targetId: any, position: any) => {
  // 标准化输入，确保我们总是处理一个节点列表
  const nodesToAdd = Array.isArray(nodeToInsert) ? nodeToInsert : [nodeToInsert];

  // 'top' 和 'end' 是非递归的，直接处理
  if (position === 'top') {
    data.unshift(...nodesToAdd);
    return; // 操作完成
  }
  if (position === 'end') {
    data.push(...nodesToAdd);
    return; // 操作完成
  }

  // 对于 'child' 和 'next'，需要递归遍历
  for (let i = 0; i < data.length; i++) {
    const node = data[i];

    if (node.id === targetId) {
      if (position === 'child') {
        if (!('children' in node)) {
          throw new Error(`插入失败，ID为 ${targetId} 的节点无法作为父节点。`);
        }
        // 过滤掉 empty 节点
        node.children = node.children.filter((child: any) => child.type !== 'empty');
        // 将新节点插入到头部
        node.children.unshift(...nodesToAdd);
      } else if (position === 'next') {
        // 在当前节点之后插入新节点
        data.splice(i + 1, 0, ...nodesToAdd);
        // 为了避免在同一层级重复插入，我们可以选择在插入后增加索引
        i += nodesToAdd.length;
      }
    } else if (node.children && Array.isArray(node.children)) {
      // 递归处理子节点
      insertNode(node.children, nodeToInsert, targetId, position);
    }
  }
}

/**
 * 递归地分析一个树形数据结构，统计节点总数和特定状态的节点数。
 *
 * @param {Array<object>} data - 要分析的树形数据，一个节点对象数组。
 * @returns {{totalNodes: number, checkedNodes: number}} 一个包含统计结果的对象。
 * - totalNodes: 节点总数（不包括 type 为 'empty' 的节点）。
 * - checkedNodes: 'check' 属性值为 'check' 的节点数量。
 */
export const analyzeTree = (data: any) => {
  // 初始化计数器
  let totalNodeCount = 0;
  let checkedNodeCount = 0;

  /**
   * 定义一个内部递归函数来遍历节点。
   * @param {Array<object>} nodes - 当前要遍历的节点数组。
   */
  function traverse(nodes: any) {
    // 遍历当前层级的每一个节点
    for (const node of nodes) {
      // 1. 排除 'empty' 类型的节点
      if (node.type === 'empty') {
        continue; // 跳过 empty 节点，不进行任何计数
      }

      // 2. 节点总数加一
      totalNodeCount++;

      // 3. 检查 'check' 属性是否为 'check'
      if (node.check === 'check') {
        checkedNodeCount++;
      }

      // 4. 如果节点有子节点，则递归遍历子节点
      if (node.children && Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  }

  // 从顶层数据开始遍历
  traverse(data);

  // 返回最终的统计结果
  return {
    totalNodes: totalNodeCount,
    checkedNodes: checkedNodeCount,
  };
}


/**
 * 递归地更新树形数据结构中所有节点的 'check' 状态。
 * 此函数直接修改传入的 data 数组。
 *
 * @param {Array<object>} data - 要修改的树形数据，一个节点对象数组。
 * @param {'check' | 'none'} type - 要设置的状态，'check' 或 'none'。
 */
export const updateAllCheckStatus = (data: any, type: any) => {
  // 检查传入的类型是否有效，防止意外操作
  if (type !== 'check' && type !== 'none') {
    console.error("无效的操作类型，必须是 'check' 或 'none'");
    return;
  }

  /**
   * 定义一个内部递归函数来遍历和修改节点。
   * @param {Array<object>} nodes - 当前要遍历的节点数组。
   */
  function traverse(nodes: any) {
    for (const node of nodes) {
      // 排除 'empty' 类型的节点
      if (node.type === 'empty') {
        continue;
      }

      // 设置 'check' 属性
      node.check = type;

      // 如果节点有子节点，则递归遍历
      if (node.children && Array.isArray(node.children)) {
        traverse(node.children);
      }
    }
  }

  // 从顶层数据开始执行
  traverse(data);
}


/**
 * 递归地过滤一个树形数据结构，移除所有 'check' 属性为 'none' 的节点。
 * 此函数不会修改原始数据，而是返回一个全新的、经过过滤的数据结构副本。
 *
 * @param {Array<object>} data - 要过滤的树形数据，一个节点对象数组。
 * @returns {Array<object>} 一个不包含 'check' 值为 'none' 节点的新数组。
 */
export const filterNoneNodes = (data: any) => {
  // 使用 Array.prototype.reduce 来构建新数组，这是一种常见的函数式编程模式
  return data.reduce((accumulator: any, node: any) => {
    // 1. 如果节点的 'check' 值为 'none'，则直接跳过此节点
    if (node.check === 'none') {
      return accumulator; // 返回当前的累加器，不添加任何东西
    }

    // 2. 如果节点需要保留，创建一个副本以确保不修改原始数据
    const newNode = { ...node };

    // 3. 如果节点有子节点，则递归地对子节点列表进行过滤
    if (newNode.children && Array.isArray(newNode.children)) {
      newNode.children = filterNoneNodes(newNode.children);
    }

    // 4. 将处理好的新节点添加到结果数组中
    accumulator.push(newNode);

    return accumulator;
  }, []); // 初始值是一个空数组
}


/**
 * 通过后序遍历（从下至上）递归地刷新每个父节点的 'check' 状态。
 * 此函数直接修改传入的 data 数组。
 *
 * @param {Array<object>} data - 树形数据结构，一个节点对象数组。
 */
export const refreshCheckStatusJs = (data: any) => {
  for (const node of data) {
    // 首先，递归处理子节点

    if (node.children && Array.isArray(node.children)) {
      refreshCheckStatusJs(node.children);

      const allChecked = node.children.every((child: any) => child.check === 'check');
      const allNone = node.children.every((child: any) => child.check === 'none');
      console.log(allChecked);

      // 根据子节点状态更新父节点
      if (allChecked) {
        node.check = 'check';
      } else if (allNone) {
        node.check = 'none';
      } else {
        node.check = 'part';
      }
    }
  }
}