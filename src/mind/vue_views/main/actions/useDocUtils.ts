import { toRaw } from 'vue';

/**
 * 将响应式 doc 对象序列化为普通 JS 对象。
 * 在通过 electronAPI 传输数据时，必须先转换，否则结构化克隆会抛出
 * "An object could not be cloned" 错误。
 */
export function toPlainDoc(doc: any): any {
    return JSON.parse(JSON.stringify(toRaw(doc)));
}

/**
 * 对旧版 doc 结构进行兜底补全（向前兼容 schema 升级）。
 *
 * 补全规则：
 * - 确保 `doc.mind` 及 `doc.mind.nodes` 存在
 * - 确保 `doc.mind.view.viewport` 存在，用于持久化 camera 视角
 * - 若 `doc.mind.roots` 为空，则按 rootId 创建默认根节点和 roots 配置
 */
export function ensureMindRoots(doc: any): void {
    if (!doc?.mind) doc.mind = {};
    if (!doc.mind.nodes) doc.mind.nodes = {};

    // 补全 view.viewport。新实现只认 camera 结构，避免再注入旧版 scrollLeft/scrollTop 默认值。
    doc.mind.view = doc.mind.view || {};
    doc.mind.view.viewport = doc.mind.view.viewport || {};

    // 若 roots 已有数据则无需初始化
    if (Array.isArray(doc.mind.roots) && doc.mind.roots.length) return;

    const rootId = doc.mind.rootId || 'root';
    if (!doc.mind.nodes[rootId]) {
        doc.mind.nodes[rootId] = {
            id: rootId,
            text: doc?.manifest?.title || '中心主题',
            children: [],
            images: [],
        };
    }

    doc.mind.roots = [
        {
            rootId,
            pos: { x: 0, y: 0 },
            layout: { direction: 'right', hGap: 60, vGap: 18 },
        },
    ];
}
