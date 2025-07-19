import { ref } from 'vue'
import { ElMessageBox } from 'element-plus'

export interface TreeNode {
  id: number
  label: string
  children?: TreeNode[]
}

export function useTreeNodeOperations() {
  const nodeIdCounter = ref(100)

  // 添加根节点
  const addRootNode = (treeData: TreeNode[]) => {
    const newNode: TreeNode = {
      id: nodeIdCounter.value++,
      label: `新节点 ${nodeIdCounter.value}`,
      children: []
    }
    treeData.push(newNode)
  }

  // 添加同级节点
  const addSiblingNode = (node: any, data: TreeNode) => {
    const parent = node.parent
    const children = parent.data.children || parent.data
    const index = children.findIndex((item: TreeNode) => item.id === data.id)

    const newNode: TreeNode = {
      id: nodeIdCounter.value++,
      label: `新节点 ${nodeIdCounter.value}`
    }

    children.splice(index + 1, 0, newNode)
  }

  // 添加子节点
  const addChildNode = (node: any, data: TreeNode) => {
    const newNode: TreeNode = {
      id: nodeIdCounter.value++,
      label: `新节点 ${nodeIdCounter.value}`
    }

    if (!data.children) {
      data.children = []
    }
    data.children.push(newNode)
  }

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

  return {
    nodeIdCounter,
    addRootNode,
    addSiblingNode,
    addChildNode,
    removeNode
  }
}