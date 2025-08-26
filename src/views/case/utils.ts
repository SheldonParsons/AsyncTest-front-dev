
import { ApiDatasetMixin } from '@/api/case/dataset/index'
import { ApiCaseMixin } from '@/api/case/case/index'
// 结果检查工具
export function result_check(data: any): boolean {
    if (data.hasOwnProperty("result") && data.result === 0) {
        window.$toast({ title: data.data, type: 'error' })
        return false;
    }
    return true;
}

// 通用发送 action 的方法
export async function send_action(data: any): Promise<any> {
    try {
        return await ApiDatasetMixin(data).then(resp => {
            if (!result_check(resp)) return false;
            return resp
        });
    } catch (err) {
        window.$toast({ title: `请求异常：${err}`, type: 'error' })
        return;
    }
}

export async function send_case_action(data: any) {
    try {
        return await ApiCaseMixin(data).then(resp => {
            if (!result_check(resp)) return false;
            return resp
        });
    } catch (err) {
        window.$toast({ title: `请求异常：${err}`, type: 'error' })
        return false;
    }
}