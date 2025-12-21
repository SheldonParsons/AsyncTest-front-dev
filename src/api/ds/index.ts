import { http } from "@/utils/http";


// 获取数据模型
export function ApiGetDsingle(id: any, params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/ds/${id}/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}

export function ApiGetDsingleList(params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/ds/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}

// 数据模型相关操作
export function ApiDsMixin(data: any): Promise<String> {
    return new Promise((resolve, reject) => {
        http
            .httpPost("/api/ds/", data)
            .then((res: any) => {
                resolve(res);
            })
            .catch((err: any) => {
                reject(err);
            });
    });
}