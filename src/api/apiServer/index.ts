import { http } from '@/utils/http'

// 获取数据列表
export function ApiGetApiServer(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/open/server/', params).then((res: any) => {
      resolve(res)
    })
  })
}
