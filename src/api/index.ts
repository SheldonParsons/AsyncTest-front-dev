
import { http } from '../utils/http'
import { IResultOr as IResult } from './interface'

export function getDRFTestData():Promise<IResult> {
  const devUrl = import.meta.env.PROD ? 'http://0.0.0.0:6002' : '/api'
  const result = http.httpGet(devUrl + '/hello/', {}).then(res => {
    return { code: '000000', success: true, message: '操作成功', result: res }
  })
  return result
}

// 获取配置信息
export function ApiGetBasicConfig(params:any):Promise<String> {
  return new Promise(resolve => {
    http.httpGet('/basic/config/', params).then((res: any) => {
      resolve(res)
    })
  })
}
