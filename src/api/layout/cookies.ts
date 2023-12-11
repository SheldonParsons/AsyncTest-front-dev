import GlobalStatus from '@/global'
import asyncTest from '../../db'

export function ClearServerCookie():Promise<String> {
  return new Promise(resolve => {
    asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
    resolve('1')
  })
}
