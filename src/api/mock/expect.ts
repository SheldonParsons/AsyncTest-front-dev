import { http } from '@/utils/http'

// Mock列表数据
export function ApiExpect(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/layout/mock/expect/', params).then((res: any) => {
      resolve(res)
    })
  })
}

// post相关内容
export function ApiExpectPostAction(params:any, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/layout/mock/expect/', data, params).then((res:any) => {
      resolve(res)
    })
  })
}

// 修改单条数据
export function ApiEditExpect(id:number, params:any, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/layout/mock/expect/${id}/`, data, params).then((res: any) => {
      resolve(res)
    })
  })
}

// 删除单条数据
export function ApiDeleteExpect(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpDelete(`/layout/mock/expect/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 获取单条数据
export function ApiGetSingleExpect(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/layout/mock/expect/${id}/`, params).then((res: any) => {
      resolve(res)
    })
  })
}
