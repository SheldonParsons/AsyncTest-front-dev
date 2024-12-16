// src/state/index.ts
import { reactive } from 'vue'

// 如果有多个不同业务的内部状态共享
// 使用具名导出更容易维护
export const state = reactive({
  // 设置一个属性并赋予初始值
  message: 'Global State',

  // 添加一个更新数据的方法
  setMessage(msg: string) {
    this.message = msg
  },
})