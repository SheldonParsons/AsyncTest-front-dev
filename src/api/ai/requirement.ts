import { http } from "@/utils/http";

// 获取需求组别列表
export function getRequirementGroup(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/requirement/group/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建需求分组
export function createRequirementGroup(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/llm/requirement/group/", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 删除需求分组
export function deleteRequirementGroup(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/llm/requirement/group/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取需求生成器列表
export function getRequirementCase(params: any): Promise<String> {
    return new Promise((resolve) => {
      http.httpGet("/llm/requirement/group/case/", params).then((res: any) => {
        resolve(res);
      });
    });
  }

// 创建需求
export function createRequirementCase(data: any): Promise<String> {
    return new Promise((resolve) => {
      http.httpPost("/llm/requirement/group/case/", data).then((res: any) => {
        resolve(res);
      });
    });
  }


// 更新需求
export function updateRequirementCase(id: number, data: any): Promise<String> {
    return new Promise((resolve) => {
      http.httpPut(`/llm/requirement/group/case/${id}/`, data).then((res: any) => {
        resolve(res);
      });
    });
  }

// 获取生成用例历史列表
export function getRequirementCaseHistory(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/requirement/generation/history/", params).then((res: any) => {
      resolve(res);
    });
  });
}
