import { ref, nextTick, createVNode, render } from 'vue'
import Line from '../line.vue'

export function useLineMounting() {
  const container_node_id_list = ref<number[]>([])
  const node_search_mapping = ref<Record<number, HTMLElement>>({})

  async function mountLines(treeRef: any) {
    // 等 Vue 把树渲染到 DOM 上
    await nextTick(async () => {
      // Element Plus 内部存了一个 nodesMap：key -> TreeNode 实例
      const nodesMap = treeRef.value.store.nodesMap

      Object.values(nodesMap).forEach((tn: any) => {
        // 只针对有子节点的节点
        if (tn.isLeaf === false) {
          console.log(tn)
          container_node_id_list.value.push(tn.data.id)
        }
      })
      mountLineToParents()
    })
  }

  function mountLineToParents() {
    nextTick(() => {
      // 1. 拿到所有 is-expanded 且 is-focusable 的 el-tree-node
      const nodes = document.querySelectorAll('.case-custom-tree .el-tree-node.is-expanded.is-focusable')

      nodes.forEach(li => {
        const key = li.getAttribute('data-key')
        console.log(li)

        // 2. 判断是否在父节点 ID 列表里
        if (key && container_node_id_list.value.includes(Number(key))) {
          const content: any = li.querySelector('.el-tree-node__content')
          const offset = content.style.paddingLeft

          // 3. 防重：检查 nextSibling 上有没有挂载过
          if (!li.nextElementSibling?.classList.contains('__line_mounted__')) {
            // 4. 创建占位容器
            const placeholder = document.createElement('div')
            placeholder.classList.add('__line_mounted__')
            placeholder.style.paddingLeft = offset
            // 5. 插入到 <li> 后面
            li.insertAdjacentElement('afterend', placeholder)
            // 6. 挂载 Line 组件
            const vnode = createVNode(Line, { class: 'target-line-button hidden' })
            // 3. 渲染到容器
            render(vnode, placeholder)
          }
        }
      })
    })
  }

  return {
    container_node_id_list,
    node_search_mapping,
    mountLines,
    mountLineToParents
  }
}