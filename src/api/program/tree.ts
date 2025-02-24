import { http } from "@/utils/http";

// 获取提供商列表
export function getTree(params: any): Promise<String> {
    return new Promise((resolve) => {
      http.httpGet("/program/tree/", params).then((res: any) => {
        resolve(res);
      });
    });
  }