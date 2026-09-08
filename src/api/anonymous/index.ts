import { http } from '@/utils/http'
import GlobalStatus from '@/global'
import { ILogin } from '../interface'
import asyncTest from '../../db'
import { syncCurrentUserAfterLogin } from '@/composables/useCurrentUserProfile'

export function ApiLogin(data:ILogin):Promise<String> {
  return new Promise(resolve => {
    http.httpPost('/anonymous/login/', data).then((res:any) => {
      if (res.result === 1) {
        if (asyncTest.cookies.getCookie(GlobalStatus.cookieTag) !== false) {
          asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
        }
        asyncTest.cookies.setCookie(GlobalStatus.cookieTag, res.data.token, 60 * 60 * 24 * 7)
        syncCurrentUserAfterLogin(res.data)
        const token = res.data.token
        window.setTimeout(() => {
          if (asyncTest.cookies.getCookie(GlobalStatus.cookieTag) === token) {
            window.dispatchEvent(new CustomEvent('ast:login-succeeded'))
          }
        }, 350)
      }
      resolve(res)
    })
  })
}
