import { http } from "@/utils/http";

export function ApiGetEnvListAndUserSetting(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/server_parameters/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

export function ApiPostEnv(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/server_parameters/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

export function ApiUpdateUserEnv(data: any): Promise<String> {
  return new Promise((resolve, reject) => {
    http
      .httpPost("/api/user_env/", data)
      .then((res: any) => {
        resolve(res);
      })
      .catch((err: any) => {
        reject(err);
      });
  });
}

// 获取项目环境配置信息
export function ApiGetProjectServerParameters(params: any): Promise<String> {
  return new Promise((resolve) => {
    http.httpGet("/api/server_parameters/", params).then((res: any) => {
      resolve(res);
    });
  });
}
