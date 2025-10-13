// src/constants/statusMapping.ts

/**
 * 定义状态键的联合类型，这可以提供更好的代码提示和类型检查。
 * (这是一个可选但推荐的最佳实践)
 */
export type StatusKey = 'end_normal' | 'pending' | 'mid_running';

/**
 * 状态映射对象。
 * 我们使用 'as const' 来告诉 TypeScript：
 * 1. 这个对象是只读的 (readonly)，它的属性不能被修改。
 * 2. 将键和值推断为最具体的字面量类型，而不是宽泛的 string。
 */
export const StatusMapping: any = {
    end_normal: '正常结束',
    pending: '正在等待',
    mid_running: '正在运行'
} as const;

/**
 * 导出一个辅助函数，根据 key 获取值，并提供一个默认回退。
 * @param key - 状态的 key
 * @returns 对应的中文文本，如果找不到则返回 '未知状态'
 */
export function getStatusText(key: string): string {
    // a keyof typeof StatusMapping
    return StatusMapping[key as StatusKey] || '未知状态';
}