import axios, { AxiosRequestConfig, AxiosResponse } from 'axios'
import GlobalStatus from '@/global'
import asyncTest from '@/db'

const defaultConfig = {
  timeout: 60000,
  baseURL: import.meta.env.PROD ? '/server' : GlobalStatus.localhost + '/api',
  headers: {
    'Content-Type': 'application/json'
  }
}

class Http {
  constructor () {
    this.httpInterceptorsRequest()
    this.httpInterceptorsResponse()
  }

  private static axiosInstance = axios.create(defaultConfig)

  // 请求拦截
  private httpInterceptorsRequest () {
    Http.axiosInstance.interceptors.request.use((config: AxiosRequestConfig) => {
      if (config.url?.indexOf(GlobalStatus.anonymousPath) === -1) {
        // 获取当前token
        const currentCookie = asyncTest.cookies.getCookie(GlobalStatus.cookieTag)
        // 如果获取不到token，直接跳转至login页面
        if (currentCookie === false) {
          asyncTest.router.router.push({ name: GlobalStatus.anonymousPage })
        } else {
          const headers:any = config.headers
          headers.Authorization = `token=${currentCookie}`
        }
      }
      return config
    }, (err:any) => {
      return Promise.reject(err)
    })
  }

  // 响应拦截
  private httpInterceptorsResponse () {
    Http.axiosInstance.interceptors.response.use((response: AxiosResponse) => {
      return response
    }, (err:any) => {
      console.log(err)
      // 如果需要身份验证，且后端返回无身份验证的响应，直接跳转至login页面
      if (err.response.status === 403) {
        // token鉴权失败
        if (err.response.data.detail) {
          asyncTest.router.router.push({ name: GlobalStatus.anonymousPage })
        } else {
          // 非项目成员鉴权
          if (err.response.data.code && Number(err.response.data.code) === 302) {
            asyncTest.router.router.push({ name: GlobalStatus.projectAuthAbandonPath })
          }
          return Promise.reject(err)
        }
      }
      return Promise.reject(err)
    })
  }

  public httpGet<T> (url:string, params:AxiosRequestConfig):Promise<T> {
    return Http.axiosInstance.get(url, { params }).then(async res => {
      if (typeof res.data === 'string' && res.data && res.data.indexOf('location.replace') !== -1) {
        let retryCount = 0
        let retryFinal = null
        while (retryCount < 10) {
          retryFinal = await Http.axiosInstance.get(url, { params }).then(retryRes => {
            if (typeof retryRes.data === 'string' && retryRes.data && retryRes.data.indexOf('location.replace') !== -1) {
              retryCount += 1
            } else {
              retryCount = 10
              return retryRes.data
            }
          })
        }
        return retryFinal
      } else {
        return res.data
      }
    }).catch((err:any) => {
      if (err.response) {
        return err.response.data
      } else {
        return {
          result: 0,
          msg: err.message
        }
      }
    })
  }

  public httpPost<T> (url:string, data:AxiosRequestConfig, params = {}):Promise<T> {
    return Http.axiosInstance.post(url, data, { params }).then(res => {
      return res.data
    }).catch((err:any) => {
      console.log(err)
      if (err.response) {
        if (err.response.status === 500) {
          return {
            result: 0,
            msg: err.response.statusText
          }
        }
        return err.response.data
      } else {
        return {
          result: 0,
          msg: err.message
        }
      }
    })
  }

  public httpDelete<T> (url:string, data = undefined):Promise<T> {
    return Http.axiosInstance.delete(url, { data }).then(res => {
      return res.data
    }).catch((err:any) => {
      console.log(err)
      if (err.response) {
        return err.response.data
      } else {
        return {
          result: 0,
          msg: err.message
        }
      }
    })
  }

  public httpPut<T> (url:string, data:any = undefined, params = {}):Promise<T> {
    return Http.axiosInstance.put(url, data, { params }).then(res => {
      return res.data
    }).catch((err:any) => {
      console.log(err)
      if (err.response) {
        return err.response.data
      } else {
        return {
          result: 0,
          msg: err.message
        }
      }
    })
  }
}

export const http = new Http()
