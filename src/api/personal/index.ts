import { http } from "@/utils/http";




// ApiKey列表
export function ApiGetApiKeyList(config: any): Promise<String> {
    return new Promise((resolve) => {
        http.cancelHttpGet(`/personal/api/`, config).then((res: any) => {
            resolve(res);
        });
    });
}


// 创建ApiKey
export function ApiPostApiKeyClient(
    data: any,
    params: any
): Promise<String> {
    return new Promise((resolve) => {
        http
            .httpPost(
                "/personal/api/",
                data,
                (params = params)
            )
            .then((res: any) => {
                resolve(res);
            });
    });
}


// 删除 ApiKey
export function ApiDeleteApikey(
    pk: string,
    data: any
): Promise<String> {
    return new Promise((resolve) => {
        http.httpDelete(`/personal/api/${pk}/`, data).then((res: any) => {
            resolve(res);
        });
    });
}