import { http } from '@/utils/http'

// Mock列表数据
export function ApiPresets(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/layout/mock/presets/', params).then((res: any) => {
      resolve(res)
    })
  })
}

// post相关内容
export function ApiPresetsPostAction(params:any, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/layout/mock/presets/', data, params).then((res:any) => {
      resolve(res)
    })
  })
}

// 修改单条数据
export function ApiEditPresets(id:number, params:any, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/layout/mock/presets/${id}/`, data, params).then((res: any) => {
      resolve(res)
    })
  })
}

// 删除单条数据
export function ApiDeletePresets(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpDelete(`/layout/mock/presets/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}


// 获取单条数据
export function ApiGetSinglePresets(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/layout/mock/presets/${id}/`, params).then((res: any) => {
      resolve(res)
    })
  })
}

// 获取预置记录数据列表
export function ApiPresetsRecord(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/layout/mock/presets/record/', params).then((res: any) => {
      resolve(res)
    })
  })
}
