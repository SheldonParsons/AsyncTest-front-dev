import { http } from '@/utils/http'

export function ApiHttpSender(data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/debug/http/send/', data).then((res:any) => {
      resolve(res)
    })
  })
}
