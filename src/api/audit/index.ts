import { http } from "@/utils/http";

// 获取需求组别列表
export function getAuditInterfaceList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/audit/interface/", params).then((res: any) => {
      resolve(res);
    });
  });
}