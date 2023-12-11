import { http } from '@/utils/http'

// 获取事件列表
export function ApiGetEvents(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/approve/event/', params).then((res:any) => {
      resolve(res)
    })
  })
}

// 获取任务列表
export function ApiGetTasks(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/approve/task/', params).then((res:any) => {
      resolve(res)
    })
  })
}

// 审批任务
export function ApiApproveTask(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/approve/task/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 审批任务详情
export function ApiGetSingleTask(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/approve/task/${id}/`, params).then((res: any) => {
      resolve(res)
    })
  })
}
