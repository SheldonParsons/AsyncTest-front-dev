import { ref, nextTick } from 'vue'
import { IntervalMap } from '@/views/case/content/case_content/tree/utils/IntervalMap'

export function useDragAndDrop() {
  const node_search_obj: any = ref<IntervalMap | null>(null)
  let mouseMoveListener: any = null
  let isThrottled = false
  let lastHighlight: { el: HTMLElement; status: 'before' | 'after' } | null = null

  // 获取节点高度映射
  async function getNodeHeightMapping(blank_id: number) {
    await nextTick()
    node_search_obj.value = new IntervalMap()
    const nodes = document.querySelectorAll('.case-custom-tree .el-tree-node.is-expanded.is-focusable')
    const blank_range: any = {}
    Array.from(nodes).forEach(node => {
      const key = node.getAttribute('data-key')
      if (Number(key) === blank_id) {
        const blank_rect = node.getBoundingClientRect()
        blank_range.start = blank_rect.top
        blank_range.end = blank_rect.bottom
        node_search_obj.value.addInterval(blank_range.start, blank_range.end, null, 'blank')
        return
      }
      // 1. 拿到 .el-tree-node__content 元素
      const contentEl: any = node.querySelector('.el-tree-node__content')
      const contentRect = contentEl.getBoundingClientRect()
      const contentStartY = contentRect.top
      const contentEndY = contentRect.bottom
      if (blank_range) {
        if (contentStartY > blank_range.start && contentStartY < blank_range.end) {
          return
        }
      }
      // 2. 拿到下一个同级元素并判断 __line_mounted__
      const next = node.nextElementSibling
      let lineStartY = null
      let lineEndY = null
      let has_child = false
      if (next && next.classList.contains('__line_mounted__')) {
        const lineRect = next.getBoundingClientRect()
        lineStartY = lineRect.top
        lineEndY = lineRect.bottom
        has_child = true
      }
      const _html = node.querySelector('.el-tree-node__content .tree-node-container') as HTMLElement
      if (has_child === false) {
        if (_html.getAttribute('data-type') === 'empty') {
          node_search_obj.value.addInterval(contentStartY, contentEndY, _html, 'empty')
        } else {
          const split_line = Math.round(
            contentStartY + ((contentEndY - contentStartY) * 0.7)
          )
          node_search_obj.value.addInterval(contentStartY, split_line, _html, 'before')
          node_search_obj.value.addInterval(split_line + 1, contentEndY, _html, 'after')
        }

      } else {
        node_search_obj.value.addInterval(contentStartY, contentEndY, _html, 'before')
        node_search_obj.value.addInterval(lineStartY, lineEndY, next as HTMLElement, 'after')
      }
    })
  }

  // 更新 DOM 显示拖拽位置
  function updateDOM(mouseY: number, callback_function: Function) {
    const search = node_search_obj.value
    if (!search) return

    // 找到当前目标
    const target = search.query(mouseY)

    callback_function(target)

    if (!target || target.status === 'blank' || target.status === 'empty') {
      // 如果鼠标移到无目标区，清空上次高亮
      hideLast()
      return
    }
    // 如果目标和上次一样，什么都不做
    if (
      lastHighlight &&
      lastHighlight.el === target.htmlObject &&
      lastHighlight.status === target.status
    ) {
      return
    }

    // 隐藏上次
    hideLast()

    // 显示这次
    const cls =
      target.status === 'before'
        ? '.target-line-top'
        : '.target-line-button'

    target.htmlObject
      .querySelector(cls)
      ?.classList.remove('hidden')

    lastHighlight = { el: target.htmlObject, status: target.status }
  }

  function hideLast() {
    if (!lastHighlight) return
    const cls =
      lastHighlight.status === 'before'
        ? '.target-line-top'
        : '.target-line-button'
    lastHighlight.el
      .querySelector(cls)
      ?.classList.add('hidden')
    lastHighlight = null
  }

  function cleanAllLine() {
    const tree = document.querySelector('.case-custom-tree')
    if (tree) {
      const clean_elements = tree.querySelectorAll('.target-line-top, .target-line-button')
      // 遍历所有元素，更新 class
      clean_elements.forEach((_element: any) => {
        if (_element && _element.classList && !_element.classList.contains('hidden')) {
          _element.classList.add('hidden')
        }
      })
    }
  }

  // 开始监听鼠标坐标
  function startListeningMouse(callback_function: Function) {
    if (mouseMoveListener) return // 防止重复绑定监听器

    // 定义拖拽过程中监听函数
    mouseMoveListener = (event: DragEvent) => {
      if (isThrottled) return // 如果正在节流，直接返回

      isThrottled = true // 设置为正在节流

      // 延时 100ms 后允许再次触发
      setTimeout(() => {
        isThrottled = false // 重置节流标志
      }, 100)

      // 你的处理逻辑：获取鼠标坐标
      const mouseX = event.clientX // 鼠标X坐标
      const mouseY = event.clientY // 鼠标Y坐标
      updateDOM(mouseY, callback_function)
    }

    // 绑定拖拽事件
    document.addEventListener('drag', mouseMoveListener)
    console.log('Mouse move listener started.')
  }

  // 结束监听鼠标坐标
  function stopListeningMouse() {
    if (!mouseMoveListener) return // 如果没有监听器，直接返回

    // 移除事件监听
    document.removeEventListener('drag', mouseMoveListener)
    mouseMoveListener = null
    console.log('Mouse move listener stopped.')
  }

  return {
    node_search_obj,
    getNodeHeightMapping,
    updateDOM,
    startListeningMouse,
    stopListeningMouse,
    cleanAllLine
  }
}