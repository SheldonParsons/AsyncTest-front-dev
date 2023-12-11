import { http } from '@/utils/http'

// 创建触发帧，创建审批事件
export function ApiCreateTouchPixel(data:any):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/event/touchpixel/', data).then((res:any) => {
      resolve(res)
    })
  })
}
