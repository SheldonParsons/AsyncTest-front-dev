import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'

export interface TreeNode {
  id: number
  label: string
  type: string
  children?: TreeNode[]
}

export function useTreeNodeOperations() {
  const nodeIdCounter = ref(100)

  // // 添加根节点
  // const addRootNode = (treeData: TreeNode[]) => {
  //   const newNode: TreeNode = {
  //     id: nodeIdCounter.value++,
  //     label: `新节点 ${nodeIdCounter.value}`,
  //     children: []
  //   }
  //   treeData.push(newNode)
  // }

  // // 添加同级节点
  // const addSiblingNode = (node: any, data: TreeNode) => {
  //   const parent = node.parent
  //   const children = parent.data.children || parent.data
  //   const index = children.findIndex((item: TreeNode) => item.id === data.id)

  //   const newNode: TreeNode = {
  //     id: nodeIdCounter.value++,
  //     label: `新节点 ${nodeIdCounter.value}`
  //   }

  //   children.splice(index + 1, 0, newNode)
  // }

  // // 添加子节点
  // const addChildNode = (node: any, data: TreeNode) => {
  //   const newNode: TreeNode = {
  //     id: nodeIdCounter.value++,
  //     label: `新节点 ${nodeIdCounter.value}`
  //   }

  //   if (!data.children) {
  //     data.children = []
  //   }
  //   data.children.push(newNode)
  // }

  // 删除节点
  const removeNode = async (node: any, data: TreeNode) => {
    try {
      await ElMessageBox.confirm(
        '确定要删除此节点吗？',
        '提示',
        {
          confirmButtonText: '确定',
          cancelButtonText: '取消',
          type: 'warning',
        }
      )

      const parent = node.parent
      const children = parent.data.children || parent.data
      const index = children.findIndex((item: TreeNode) => item.id === data.id)
      children.splice(index, 1)
    } catch {
      // 用户取消
    }
  }

  // 是否展示底部Line
  const showBottomLine = (node: any) => {
    if (node.isLeaf === false) {
      return false
    }
    if (node.parent.childNodes[node.parent.childNodes.length - 1].id !== node.id) {
      return false
    }
    return true
  }

  /**
 * 在 treeData 上，把 draggedId 对应的节点移到
 * targetId 的前面或后面
 */

  const moveNode = (
    treeData: any,
    draggedId: number | string,
    targetId: number | string,
    dropType: 'before' | 'after'
  ) => {
    // 递归查找节点
    function findNode(list: any, id: number | string): any {
      for (let i = 0; i < list.length; i++) {
        const item = list[i];
        if (item.id === id) {
          return { list, index: i, node: item };
        }
        if (item.children) {
          const res = findNode(item.children, id);
          if (res) return res;
        }
      }
      return null;
    }

    // 1. 找到并删除被拖拽节点
    const draggedInfo = findNode(treeData, draggedId);
    if (!draggedInfo) {
      console.warn(`moveNode: 没找到 draggedId=${draggedId}`);
      return;
    }
    const [draggedNode] = draggedInfo.list.splice(draggedInfo.index, 1);

    // 2. 找到目标节点
    const targetInfo = findNode(treeData, targetId);
    if (!targetInfo) {
      console.warn(`moveNode: 没找到 targetId=${targetId}`);
      return;
    }

    // 3. 计算插入位置
    let insertIndex = dropType === 'before'
      ? targetInfo.index
      : targetInfo.index + 1;

    // 4. 关键修复：如果是同一父节点且向后移动，需调整索引
    if (draggedInfo.list === targetInfo.list && draggedInfo.index < insertIndex) {
      insertIndex--;
    }

    // 5. 插入节点
    targetInfo.list.splice(insertIndex, 0, draggedNode);

    // 6. 强制触发响应式更新
    if (draggedInfo.list === targetInfo.list) {
      // 同一父节点：创建新数组触发响应
      targetInfo.list = [...targetInfo.list];
    } else {
      // 不同父节点：分别更新两个数组
      draggedInfo.list = [...draggedInfo.list];
      targetInfo.list = [...targetInfo.list];
    }
  };

  return {
    nodeIdCounter,
    removeNode,
    showBottomLine,
    moveNode
  }
}