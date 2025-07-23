import { ref,toRaw } from 'vue'
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

  interface TreeNode {
    id: number | string
    label?: string
    lable?: string
    type?: string
    check?: string
    children?: TreeNode[]
  }

  type DropType = 'before' | 'after'
  type Id = number | string

  const EMPTY_TYPE = 'empty'

  const gen7 = () => Math.floor(Math.random() * 9_000_000) + 1_000_000

  const createEmptyNode = (): TreeNode => ({
    id: gen7(),
    label: '',
    lable: '',
    type: EMPTY_TYPE,
    check: 'check',
  })

  const moveNode = (
    treeData: TreeNode[],
    draggedId: Id,
    targetId: Id,
    dropType: DropType,
  ) => {
    interface FindRes {
      list: TreeNode[]
      index: number
      node: TreeNode
      parent: TreeNode | null
    }

    const findNode = (
      list: TreeNode[],
      id: Id,
      parent: TreeNode | null = null,
    ): FindRes | null => {
      for (let i = 0; i < list.length; i++) {
        const item = list[i]
        if (item.id === id) return { list, index: i, node: item, parent }
        if (item.children) {
          console.log(item);
          
          const res = findNode(item.children, id, item)
          if (res) return res
        }
      }
      return null
    }
    console.log(draggedId);
    console.log(treeData);
    
    const draggedInfo = findNode(treeData, draggedId)
    console.log(draggedInfo);

    
    if (!draggedInfo) return

    // 删除被拖拽节点
    const [draggedNode] = draggedInfo.list.splice(draggedInfo.index, 1)
    console.log(draggedInfo.parent);
    
    // 若拖出后原父节点为空，补一个 empty
    if (draggedInfo.parent) {
      const children = draggedInfo.parent.children ?? []
      if (children.length === 0) {
        draggedInfo.parent.children = [createEmptyNode()]
      }
    }

    const targetInfo = findNode(treeData, targetId)
    if (!targetInfo) return
    console.log(targetInfo);
    

    // 如果目标就是占位 empty，直接替换它
    if (targetInfo.node.type === EMPTY_TYPE) {
      targetInfo.list.splice(targetInfo.index, 1, draggedNode)
    } else {
      // 正常 before/after 插入
      let insertIndex =
        dropType === 'before' ? targetInfo.index : targetInfo.index + 1

      // 同级向后移动时修正索引
      // if (
      //   draggedInfo.list === targetInfo.list &&
      //   draggedInfo.index < insertIndex
      // ) {
      //   insertIndex--
      // }
      console.log(draggedNode);
      console.log(insertIndex);
      
      
      targetInfo.list.splice(insertIndex, 0, draggedNode)
      console.log(targetInfo);
      

      // 若该父级下还残留 empty，占位已无必要则移除
      for (let i = targetInfo.list.length - 1; i >= 0; i--) {
        if (targetInfo.list[i].type === EMPTY_TYPE) {
          targetInfo.list.splice(i, 1)
        }
      }
    }

    // ——触发响应式（根据你的使用方式任选其一）
    // 1) 若 treeData 是 ref.value： treeDataRef.value = [...treeDataRef.value]
    // 2) 或者强制刷新 el-tree： treeKey.value++
  }

  return {
    nodeIdCounter,
    removeNode,
    showBottomLine,
    moveNode
  }
}