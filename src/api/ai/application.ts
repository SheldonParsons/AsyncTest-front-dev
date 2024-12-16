import { http } from "@/utils/http";

// 获取单条应用详情
export function getSingleApplication(id: Number, params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/llm/app/${id}/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 应用修改配置绑定知识库
export function editConfigDatasetJoin(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(`/llm/app/config/dataset/update/${id}/`, data)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 应用修改配置
export function editAppConfig(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPut(`/llm/app/config/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 发布配置到应用
export function publishedApplication(id: number, data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPut(`/llm/app/config/published/${id}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 取消发布应用
export function cancelPublishedApplication(
  id: number,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpDelete(`/llm/app/config/published/${id}/`, data)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 获取发版历史记录
export function getPublishedVersionHistory(params: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpGet("/llm/app/config/published/version/", params)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 回退历史配置到草稿
export function rollbackPublishedVersionHistory(id: number, data: any): Promise<String> {
    return new Promise((resolve) => {
      http.httpPut(`/llm/app/config/published/version/${id}/`, data).then((res: any) => {
        resolve(res);
      });
    });
  }

// 清空调试应用会话
export function cleanDebuggerConversation(
    id: number,
    data: any
  ): Promise<String> {
    return new Promise((resolve) => {
      http
        .httpDelete(`/llm/app/conversation/debug/${id}/`, data)
        .then((res: any) => {
          resolve(res);
        });
    });
  }

// 取消发布应用
export function stopDebugConversation(
    id: number,
    data: any
  ): Promise<String> {
    return new Promise((resolve) => {
      http
        .httpDelete(`/llm/app/conversation/debug/stop/${id}/`, data)
        .then((res: any) => {
          resolve(res);
        });
    });
  }


  // 获取发版历史记录
export function getConversationDebugMessageList(params: any): Promise<String> {
    return new Promise((resolve) => {
      http
        .httpGet("/llm/app/conversation/debug/", params)
        .then((res: any) => {
          resolve(res);
        });
    });
  }