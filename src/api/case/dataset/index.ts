import { http } from "@/utils/http";

// 获取数据集列表
export function ApiGetDatasetList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/api/dataset/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 数据集相关操作
export function ApiDatasetMixin(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/dataset/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}
