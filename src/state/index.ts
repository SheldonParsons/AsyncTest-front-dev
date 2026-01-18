// src/state/index.ts
import { reactive } from "vue";


// 如果有多个不同业务的内部状态共享
// 使用具名导出更容易维护
export const state = reactive({
  // 设置一个属性并赋予初始值
  message: "Global State",
  data: {},
  // 添加一个更新数据的方法
  setMessage(msg: string, data: any = null) {
    this.message = msg;
    this.data = data;
  },
});

interface GlobalModuleState<T = any> {
  message: string;
  data: T;
  count: number;
  cache_interface_node_list: Array<number>;
  user_env: string | null;
  sendMessage: (message: string, data?: T) => void;
  addCacheInterface: (node_id: number) => void;
  getAsyncResult: (message: string) => Promise<boolean>;
  deleteCacheInterface: (node_ids: Array<number>) => void;
  setUserEnv: (message: string, user_env: string) => void;
  setUserEnvNoBroadcase: (user_env: string) => void;
}

export const bus = new EventTarget()

export const GlobalState = reactive<GlobalModuleState>({
  message: "",
  data: {},
  count: 0,
  cache_interface_node_list: [],
  user_env: null,
  async getAsyncResult(message: string): Promise<boolean> {
    console.log("in message");
    console.log(message);
    
    
    return new Promise((resolve) => {
      bus.dispatchEvent(
        new CustomEvent(message, { detail: resolve })
      )
    })
  },
  sendMessage(message: string, data: any = null) {
    this.message = message;
    this.data = data;
    this.count++;
  },
  addCacheInterface(node_id: number) {
    this.cache_interface_node_list = pushUniqueToEnd(
      this.cache_interface_node_list,
      node_id
    );
  },
  deleteCacheInterface(node_ids: Array<number>) {
    this.cache_interface_node_list = removeItemFromArray(
      this.cache_interface_node_list,
      node_ids
    );
  },
  setUserEnv(message: string, user_env: string) {
    this.message = message;
    this.user_env = user_env;
    this.count++;
  },
  setUserEnvNoBroadcase(user_env: string) {
    this.user_env = user_env;
  },
});

function pushUniqueToEnd(arr: number[], num: number) {
  // 移除所有已存在的相同元素
  let i = arr.length;
  while (i--) {
    if (arr[i] === num) arr.splice(i, 1);
  }
  // 添加新元素到末尾
  arr.push(num);
  return arr;
}

function removeItemFromArray(arr: number[], nums: Array<number>) {
  const delete_set = new Set(nums); // 将数组B转为Set提高查找效率
  return arr.filter((item) => !delete_set.has(item));
}
