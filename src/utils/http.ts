import axios, { AxiosRequestConfig, AxiosResponse } from "axios";
import GlobalStatus from "@/global";
import asyncTest from "@/db";


// 1. 定义环境判断
const isElectron = typeof window !== 'undefined' &&
  window.navigator.userAgent.toLowerCase().includes('electron');

const getBaseURL = () => {
  // 情况 A：开发环境下 (npm run dev)
  // 不管是 Web 还是 Electron，都直接连你本地的 6001
  if (import.meta.env.DEV) {
    if (isElectron) {
      return "http://localhost:6001";
    }
    // 普通浏览器开发，走 Vite 代理防止跨域
    return "/api";
  }

  // 情况 B：正式环境下 (npm run build)
  if (import.meta.env.PROD) {
    if (isElectron) {
      // Electron 生产环境：必须使用绝对地址，否则会变成 file:///
      return import.meta.env.VITE_API_URL;
    }
    // Web 生产环境：使用相对地址，配合你服务器上的 Nginx 代理
    return "/server";
  }

  return "/api"; // 兜底路径
};

const defaultConfig = {
  timeout: 60000,
  baseURL: getBaseURL(),
  headers: {
    "Content-Type": "application/json",
  },
};

class Http {
  constructor() {
    this.httpInterceptorsRequest();
    this.httpInterceptorsResponse();
  }

  private static axiosInstance = axios.create(defaultConfig);

  // 请求拦截
  private httpInterceptorsRequest() {
    Http.axiosInstance.interceptors.request.use(
      (config: any) => {
        if (config.url?.indexOf(GlobalStatus.anonymousPath) === -1) {
          // 获取当前token
          const currentCookie = asyncTest.cookies.getCookie(
            GlobalStatus.cookieTag
          );
          // 如果获取不到token，直接跳转至login页面
          if (currentCookie === false) {
            asyncTest.router.router.push({ name: GlobalStatus.anonymousPage });
          } else {
            const headers: any = config.headers;
            headers.Authorization = `token=${currentCookie}`;
          }
        }
        return config;
      },
      (err: any) => {
        return Promise.reject(err);
      }
    );
  }

  // 响应拦截
  private httpInterceptorsResponse() {
    Http.axiosInstance.interceptors.response.use(
      (response: AxiosResponse) => {
        return response;
      },
      (err: any) => {
        console.log(err);
        if (axios.isCancel(err)) {
          return Promise.reject({ isCanceled: true });
        }
        // 如果需要身份验证，且后端返回无身份验证的响应，直接跳转至login页面
        if (err.response.status === 403) {
          // token鉴权失败
          if (err.response.data.detail) {
            if (import.meta.env.VITE_IS_ELECTRON === 'true') {
              asyncTest.router.router.push({ name: GlobalStatus.anonymousElectronPage });
            } else {
              asyncTest.router.router.push({ name: GlobalStatus.anonymousPage });
            }
            
          } else {
            // 非项目成员鉴权
            if (
              err.response.data.code &&
              Number(err.response.data.code) === 302
            ) {
              asyncTest.router.router.push({
                name: GlobalStatus.projectAuthAbandonPath,
              });
            }
            return Promise.reject(err);
          }
        }
        return Promise.reject(err);
      }
    );
  }

  public cancelHttpGet<T>(url: string, config: AxiosRequestConfig): Promise<T> {
    return Http.axiosInstance
      .get(url, config)
      .then(async (res) => {
        if (
          typeof res.data === "string" &&
          res.data &&
          res.data.indexOf("location.replace") !== -1
        ) {
          let retryCount = 0;
          let retryFinal = null;
          while (retryCount < 10) {
            retryFinal = await Http.axiosInstance
              .get(url, config)
              .then((retryRes) => {
                if (
                  typeof retryRes.data === "string" &&
                  retryRes.data &&
                  retryRes.data.indexOf("location.replace") !== -1
                ) {
                  retryCount += 1;
                } else {
                  retryCount = 10;
                  return retryRes.data;
                }
              });
          }
          return retryFinal;
        } else {
          return res.data;
        }
      })
      .catch((err: any) => {
        if (err.isCanceled) {
          return { result: 0, msg: "cancel" }; // 自定义取消响应
        }
        if (err.response) {
          return err.response.data;
        } else {
          return {
            result: 0,
            msg: err.message,
          };
        }
      });
  }

  public httpGet<T>(url: string, params: AxiosRequestConfig): Promise<T> {
    return Http.axiosInstance
      .get(url, { params })
      .then(async (res) => {
        if (
          typeof res.data === "string" &&
          res.data &&
          res.data.indexOf("location.replace") !== -1
        ) {
          let retryCount = 0;
          let retryFinal = null;
          while (retryCount < 10) {
            retryFinal = await Http.axiosInstance
              .get(url, { params })
              .then((retryRes) => {
                if (
                  typeof retryRes.data === "string" &&
                  retryRes.data &&
                  retryRes.data.indexOf("location.replace") !== -1
                ) {
                  retryCount += 1;
                } else {
                  retryCount = 10;
                  return retryRes.data;
                }
              });
          }
          return retryFinal;
        } else {
          return res.data;
        }
      })
      .catch((err: any) => {
        if (err.isCanceled) {
          return { result: 0, msg: "cancel" }; // 自定义取消响应
        }
        if (err.response) {
          return err.response.data;
        } else {
          return {
            result: 0,
            msg: err.message,
          };
        }
      });
  }

  public httpPost<T>(
    url: string,
    data: AxiosRequestConfig,
    params = {},
    headers = {}
  ): Promise<T> {
    return Http.axiosInstance
      .post(url, data, { params, headers })
      .then((res) => {
        return res.data;
      })
      .catch((err: any) => {
        if (err.isCanceled) {
          return { result: 0, msg: "cancel" }; // 自定义取消响应
        }
        if (err.response) {
          if (err.response.status === 500) {
            return err.response.data;
          }
          return err.response.data;
        } else {
          return {
            result: 0,
            msg: err.message,
          };
        }
      });
  }

  public httpDelete<T>(url: string, data = undefined): Promise<T> {
    return Http.axiosInstance
      .delete(url, { data })
      .then((res) => {
        return res.data;
      })
      .catch((err: any) => {
        if (err.isCanceled) {
          return { result: 0, msg: "cancel" }; // 自定义取消响应
        }
        if (err.response) {
          return err.response.data;
        } else {
          return {
            result: 0,
            msg: err.message,
          };
        }
      });
  }

  public httpPut<T>(
    url: string,
    data: any = undefined,
    params = {},
    headers = {}
  ): Promise<T> {
    return Http.axiosInstance
      .put(url, data, { params, headers })
      .then((res) => {
        return res.data;
      })
      .catch((err: any) => {
        if (err.isCanceled) {
          return { result: 0, msg: "cancel" }; // 自定义取消响应
        }
        if (err.response) {
          return err.response.data;
        } else {
          return {
            result: 0,
            msg: err.message,
          };
        }
      });
  }
  public static createCancelToken() {
    return axios.CancelToken.source();
  }
}

export const http = new Http();

export const HttpClass = Http;