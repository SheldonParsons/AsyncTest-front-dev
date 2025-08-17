import { ref, nextTick, createVNode, render } from 'vue'
import Line from '@/views/case/content/case_content/runner/tree/components/line.vue'

export function useLineMounting() {
  const container_node_id_list = ref<number[]>([])
  const node_search_mapping = ref<Record<number, HTMLElement>>({})

  // 清理所有已挂载的线
  function cleanupLines() {
    const olds = document.querySelectorAll('.__line_mounted__')
    olds.forEach((el) => {
      // 卸载该容器内的 Vue 组件
      render(null, el as HTMLElement)
      el.remove()
    })
  }

  async function mountLines(treeRef: any) {
    await nextTick()

    // 1. 先清理
    cleanupLines()
    container_node_id_list.value.length = 0
    node_search_mapping.value = {}

    // 2. 重新收集需要挂线的父节点 id
    const nodesMap = treeRef.value.store.nodesMap
    console.log(nodesMap);
    
    Object.values(nodesMap).forEach((tn: any) => {
      if (!tn.isLeaf && tn.parent.childNodes[tn.parent.childNodes.length - 1].id === tn.id) {
        console.log(tn.data.target);
        
        container_node_id_list.value.push(tn.data.id)
      }
    })

    // 3. 挂线
    mountLineToParents()
  }

  function mountLineToParents() {
    nextTick(() => {
      const nodes = document.querySelectorAll('.case-custom-tree .el-tree-node.is-expanded.is-focusable')

      nodes.forEach((li) => {
        const key = li.getAttribute('data-key')
        if (!key) return
        if (!container_node_id_list.value.includes(Number(key))) return

        const content = li.querySelector('.el-tree-node__content') as HTMLElement | null
        if (!content) return

        const offset = getComputedStyle(content).paddingLeft

        // 防重已经由 cleanupLines 做过，这里可再保险一下
        if (li.nextElementSibling?.classList.contains('__line_mounted__')) return

        const placeholder = document.createElement('div')
        placeholder.setAttribute('data-id', key)
        placeholder.classList.add('__line_mounted__')
        placeholder.style.paddingLeft = offset

        li.insertAdjacentElement('afterend', placeholder)

        const vnode = createVNode(Line, { class: 'target-line-button hidden' })
        render(vnode, placeholder)
      })
    })
  }

  return {
    container_node_id_list,
    node_search_mapping,
    mountLines,
    mountLineToParents,
    cleanupLines,
  }
}
