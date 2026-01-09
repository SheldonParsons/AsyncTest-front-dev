import { http } from "@/utils/http";

// 获取项目列表
export function ApiGetProjects(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/project/", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取单个项目信息
export function ApiGetSingleProjects(params: any, id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet(`/project/single/${id}`, params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取收藏项目列表
export function ApiGetFavoriteProjects(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/project/favorite", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取个人加入项目列表
export function ApiGetJoinProjects(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/project/owner", params).then((res: any) => {
      resolve(res);
    });
  });
}

// 移出收藏项目
export function ApiDeleteFavoriteProjects(
  pk: string,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/project/favorite/${pk}`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 添加收藏项目
export function ApiAddFavoriteProjects(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/project/favorite", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 移出默认项目
export function ApiDeleteDefaultProjects(pk: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/project/default/${pk}`).then((res: any) => {
      resolve(res);
    });
  });
}
// 添加默认项目
export function ApiAddDefaultProjects(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/project/default", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建项目
export function createProjects(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpPost("/project/", data).then((res: any) => {
      resolve(res);
    });
  });
}

// 上传文件
export function ApiUploadFiles(data: any, params: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost("/project/file", data, params, {
        "Content-Type": "multipart/form-data",
      })
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 删除文件
export function ApiDeleteFile(id: number): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/project/file/${id}`).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取文件
export function ApiGetFile(config: any): Promise<String> {
  return new Promise((resolve) => {
    http.cancelHttpGet("/project/file", config).then((res: any) => {
      resolve(res);
    });
  });
}

// 批量删除
export function ApiDeleteFiles(data: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/project/file/bulk_delete`, data).then((res: any) => {
      resolve(res);
    });
  });
}

// 获取项目数据库信息
export function ApiGetDatabaseInfo(config: any): Promise<String> {
  return new Promise((resolve) => {
    http.cancelHttpGet("/project/env_database", config).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建数据库信息
export function ApiPostDatabaseInfo(data: any, params: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost("/project/env_database", data, (params = params))
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 修改单条数据
export function ApiEditDatabaseInfo(
  id: number,
  params: any,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(`project/env_database/${id}`, data, params)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 批量删除数据库
export function ApiDeleteDatabase(data: any): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpDelete(`/project/env_database/bulk_delete`, data)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 创建数据库信息
export function ApiPostDatabaseConnectionValid(
  data: any,
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/project/env_database/connection_valid",
        data,
        (params = params)
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

export function ApiGetAliasSettingList(config: any): Promise<String> {
  return new Promise((resolve) => {
    http.cancelHttpGet(`/project/alias_setting`, config).then((res: any) => {
      resolve(res);
    });
  });
}

export function ApiPostAliasSetting(
  data: any,
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/project/alias_setting",
        data,
        (params = params)
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 修改 AsyncExecutorClient
export function ApiUpdateAliasSetting(
  id: number,
  params: any,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(`/project/alias_setting/${id}`, data, params)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 删除 AsyncExecutorClient
export function ApiDeleteAliasSetting(
  pk: string,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/project/alias_setting/${pk}`, data).then((res: any) => {
      resolve(res);
    });
  });
}



// AsyncExecutorClient列表
export function ApiGetAsyncExecutorClientList(config: any): Promise<String> {
  return new Promise((resolve) => {
    http.cancelHttpGet(`/project/async_executor`, config).then((res: any) => {
      resolve(res);
    });
  });
}

// 创建AsyncExecutorClient
export function ApiPostAsyncExecutorClient(
  data: any,
  params: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPost(
        "/project/async_executor",
        data,
        (params = params)
      )
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 修改 AsyncExecutorClient
export function ApiAsyncExecutorClient(
  id: number,
  params: any,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http
      .httpPut(`/project/async_executor/${id}`, data, params)
      .then((res: any) => {
        resolve(res);
      });
  });
}

// 删除 AsyncExecutorClient
export function ApiDeleteAsyncExecutorClient(
  pk: string,
  data: any
): Promise<String> {
  return new Promise((resolve) => {
    http.httpDelete(`/project/async_executor/${pk}`, data).then((res: any) => {
      resolve(res);
    });
  });
}