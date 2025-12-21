import { http } from "@/utils/http";

// 获取提供商列表
export function getTree(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/tree/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取提供商列表
export function getOuterTree(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/outer_interface/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取提供商列表
export function getOuterDsTree(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/outer_ds/", params).then((res: any) => {
      resolve(res);
    });
  });
}

export function ApiActionApiTree(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http.httpPost("/api/tree/", data).then((res: any) => {
      resolve(res);
    }).catch((err: any) => {
      reject(err)
    })
      ;
  });
}