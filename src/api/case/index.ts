import { http } from "@/utils/http";

// 获取单条用例目录
export function ApiGetCaseDir(id: Number, params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/api/case_dir/${id}/`, params).then((res: any) => {
      resolve(res);
    });
  });
}
