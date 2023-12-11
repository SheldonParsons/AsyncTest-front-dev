import { http } from '@/utils/http'

// 获取数据列表
export function ApiGetUpdateInfo(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/basic/update/info/', params).then((res: any) => {
      resolve(res)
    })
  })
}
