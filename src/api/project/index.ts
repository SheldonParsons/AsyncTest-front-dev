import { http } from '@/utils/http'

// 获取项目列表
export function ApiGetProjects(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/project/', params).then((res:any) => {
      resolve(res)
    })
  })
}

// 获取收藏项目列表
export function ApiGetFavoriteProjects(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/project/favorite', params).then((res:any) => {
      resolve(res)
    })
  })
}

// 移出收藏项目
export function ApiDeleteFavoriteProjects(pk:string, data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpDelete(`/project/favorite/${pk}`, data).then((res:any) => {
      resolve(res)
    })
  })
}

// 添加收藏项目
export function ApiAddFavoriteProjects(data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/project/favorite', data).then((res:any) => {
      resolve(res)
    })
  })
}

// 移出默认项目
export function ApiDeleteDefaultProjects(pk:number):Promise<String> {
  return new Promise(resolve => {
    http.httpDelete(`/project/default/${pk}`).then((res:any) => {
      resolve(res)
    })
  })
}
// 添加默认项目
export function ApiAddDefaultProjects(data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/project/default', data).then((res:any) => {
      resolve(res)
    })
  })
}

// 创建项目
export function createProjects(data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/project/', data).then((res:any) => {
      resolve(res)
    })
  })
}
