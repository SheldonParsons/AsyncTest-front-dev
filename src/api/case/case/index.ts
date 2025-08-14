import { http } from "@/utils/http";

// 数据集相关操作
export function ApiCaseMixin(data: any): Promise<String> {
    return new Promise((resolve, reject) => {
        http
            .httpPost("/api/case/", data)
            .then((res: any) => {
                resolve(res);
            })
            .catch((err: any) => {
                reject(err);
            });
    });
}


// 获取用例
export function ApiGetCaseSingle(id: any): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/case/${id}/`, {}).then((res: any) => {
            resolve(res);
        });
    });
}


