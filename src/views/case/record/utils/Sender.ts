
// 结果检查工具
export function result_check(data: any): boolean {
    if (data.hasOwnProperty("result") && data.result === 0) {
        window.$toast({ title: data.data, type: 'error' })
        return false;
    }
    return true;
}
// 通用发送 action 的方法
export async function send_action(callback: any, data: any): Promise<any> {
    try {
        const resp = await callback(data)
        if (!result_check(resp)) return false;
        return resp
    } catch (err) {
        window.$toast({ title: `请求异常：${err}`, type: 'error' })
        return;
    }
}