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
export function ApiGetCaseSingle(id: any, params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/case/${id}/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}



// 编译、运行任务
export function ApiRunCase(data: any): Promise<String> {
    return new Promise((resolve, reject) => {
        http
            .httpPost("/api/task/", data)
            .then((res: any) => {
                resolve(res);
            })
            .catch((err: any) => {
                reject(err);
            });
    });
}

// 任务列表
export function ApiGetTaskList(params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/task/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}

// 记录内容
export function ApiGetRecordList(params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/task/record/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}

// process日志
export function ApiGetProcessRecord(params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/task/record/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}

// 任务详情
export function ApiGetTaskDetail(id: any, params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpGet(`/api/task/${id}/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}


// 删除任务
export function ApiDeleteTask(id: any, params: any = {}): Promise<String> {
    return new Promise((resolve) => {
        http.httpDelete(`/api/task/${id}/`, params = params).then((res: any) => {
            resolve(res);
        });
    });
}

// 编辑任务
export function ApiEditTask(id: any, data: any): Promise<String> {
    return new Promise((resolve, reject) => {
        http
            .httpPut(`/api/task/${id}/`, data)
            .then((res: any) => {
                resolve(res);
            })
            .catch((err: any) => {
                reject(err);
            });
    });
}


