import { http } from "@/utils/http";

// 获取全局数据源列表
export function ApiGetGlobalDatasourceList(config: any): Promise<String> {
  return new Promise((resolve) => {
    http.cancelHttpGet(`/global/datasource/`, config).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取单个全局数据源
export function ApiGetGlobalDatasource(
  id: number,
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/global/datasource/${id}/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建全局数据源
export function ApiPostGlobalDatasource(
  data: any,
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/global/datasource/",
        data,
        (params = params)
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 修改全局数据源
export function ApiUpdateGlobalDatasource(
  id: number,
  params: any,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(`/global/datasource/${id}/`, data, params)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 删除全局数据源
export function ApiDeleteGlobalDatasource(
  pk: string,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/global/datasource/${pk}/`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取全局项目列表
export function ApiGetGlobalProjectList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/global/project/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取全局用户列表
export function ApiGetGlobalUserList(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/global/user/`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取全局数据源简单列表
export function ApiGetGlobalDatasourceSimple(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/global/datasource/simple/`, params).then((res: any) => {
      resolve(res);
    });
  });
}
