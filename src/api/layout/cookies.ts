import GlobalStatus from '@/global'
import asyncTest from '../../db'
import { http } from "@/utils/http";

export function ClearServerCookie(): Promise<String> {
  return new Promise(resolve => {
    asyncTest.cookies.clearCookie(GlobalStatus.cookieTag)
    resolve('1')
  })
}


// 获取单条用例目录
export function ApiCheckPermission(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/token/check`, params).then((res: any) => {
      resolve(res);
    });
  });
}
