import { http } from '@/utils/http'
import GlobalStatus from '@/global'
import { ILogin } from '../interface'
import asyncTest from '../../db'

export function ApiLogin(data:ILogin):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/anonymous/login/', data).then((res:any) => {
      if (res.result === 1) {
        if (asyncTest.cookies.getCookie(GlobalStatus.cookieTag) !== false) {
          asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
        }
        asyncTest.cookies.setCookie(GlobalStatus.cookieTag, res.data.token, 60 * 60 * 24)
      }
      resolve(res)
    })
  })
}
