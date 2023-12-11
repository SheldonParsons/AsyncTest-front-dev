import { http } from '@/utils/http'

// 获取数据列表
export function ApiGetData(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/project/dataserver', params).then((res: any) => {
      resolve(res)
    })
  })
}

// 删除单条数据
export function ApiDeleteData(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpDelete(`/project/dataserver/${id}`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 添加单条数据
export function ApiAddSingleData(data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/project/dataserver', data).then((res:any) => {
      resolve(res)
    })
  })
}

// 获取单条数据
export function ApiGetSingleData(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/project/dataserver/${id}`, params).then((res: any) => {
      resolve(res)
    })
  })
}

// 修改单条数据
export function ApiChangeSingleData(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/project/dataserver/${id}`, data).then((res: any) => {
      resolve(res)
    })
  })
}
