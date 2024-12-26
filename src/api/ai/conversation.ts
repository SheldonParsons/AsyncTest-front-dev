import { http } from "@/utils/http";
// 获取发版历史记录
export function getConversationList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/llm/app/conversation/app/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取单条应用详情
export function getConversationSingle(id: Number, params: any): Promise<String> {
    return new Promise((resolve) => {
      http.httpGet(`/llm/app/conversation/app/${id}/`, params).then((res: any) => {
        resolve(res);
      });
    });
  }

// 应用修改配置绑定知识库
export function editConversation(id: number, data: any): Promise<String> {
    return new Promise((resolve) => {
      http
        .httpPut(`/llm/app/conversation/app/${id}/`, data)
        .then((res: any) => {
          resolve(res);
        });
    });
  }

// 清空调试应用会话
export function deleteConversation(
    id: number,
    params: any
  ): Promise<String> {
    return new Promise((resolve) => {
      http
        .httpDelete(`/llm/app/conversation/app/${id}/`, params)
        .then((res: any) => {
          resolve(res);
        });
    });
  }
// 创建Document
export function createBlankConversation(data: any): Promise<String> {
    return new Promise((resolve) => {
      http.httpPost("/llm/app/conversation/app/", data).then((res: any) => {
        resolve(res);
      });
    });
  }