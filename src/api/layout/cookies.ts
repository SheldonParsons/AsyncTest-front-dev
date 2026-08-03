import GlobalStatus from '@/global'
import asyncTest from '../../db'
import { http } from "@/utils/http";
import { isAuthenticationFailure } from '@/utils/authNavigationPolicy'

export interface PermissionCheckStatus {
  status: 'authorized' | 'unauthorized' | 'unavailable'
  message?: string
}

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

export async function ApiCheckPermissionStatus(params: any): Promise<PermissionCheckStatus> {
  try {
    const response = await http.httpGetResponse('/token/check', { params })
    return Number(response.data?.result) === 1
      ? { status: 'authorized' }
      : { status: 'unauthorized' }
  } catch (error: any) {
    if (isAuthenticationFailure(error?.response?.status, error?.response?.data)) {
      return { status: 'unauthorized' }
    }
    return {
      status: 'unavailable',
      message: error?.response?.data?.detail
        || (error instanceof Error ? error.message : String(error)),
    }
  }
}
