import { http } from '@/utils/http'

// Mock列表数据
export function ApiGetMock(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/layout/mock/config/', params).then((res: any) => {
      resolve(res)
    })
  })
}

// 删除单条数据
export function ApiDeleteMock(id:number, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpDelete(`/layout/mock/config/${id}/`, data).then((res: any) => {
      resolve(res)
    })
  })
}

// 添加单条数据
export function ApiAddSingleMock(data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/layout/mock/config/', data).then((res:any) => {
      resolve(res)
    })
  })
}

// 获取单条数据
export function ApiGetSingleMock(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/layout/mock/config/${id}/`, params).then((res: any) => {
      resolve(res)
    })
  })
}

// 修改单条数据
export function ApiChangeSingleMock(id:number, data:any, params:any = {}):Promise<String> {
  return new Promise(resolve => {
    http.httpPut(`/layout/mock/config/${id}/`, data, params).then((res: any) => {
      resolve(res)
    })
  })
}

// Mock获取内置函数列表
export function ApiGetMockBuildInArgs(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/basic/mock/global/utils/', params).then((res: any) => {
      resolve(res)
    })
  })
}

// Mock记录列表数据
export function ApiGetMockRecord(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/layout/mock/record/', params).then((res: any) => {
      resolve(res)
    })
  })
}

// 获取单条数据
export function ApiGetSingleMockRecord(id:Number, params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet(`/layout/mock/record/${id}/`, params).then((res: any) => {
      resolve(res)
    })
  })
}
