/**
 * PostmanParser.ts
 * 专用于解析 Postman 导出文件并转换为 Vue 项目所需的树形结构
 */

// ---------------- 定义类型 (Types & Interfaces) ----------------

// 1. 目标树节点接口 (根据你的需求 #4 定义)
export interface ITreeNode {
    id: number;
    name: string;
    type: 0; // 固定为 0
    child_type: 0 | 1 | 2; // 0: 根/未知, 1: 目录, 2: 接口
    method: string | null;
    desc: string;
    request: any | null;
    count: number; // 子接口数量
    children: ITreeNode[];
    target: number;
    is_reference: boolean; // 固定为 false
}

// 2. Postman 源文件类型定义 (简化版)
interface IPostmanInfo {
    name: string;
    description?: string;
    schema: string;
    [key: string]: any;
}

interface IPostmanItem {
    name: string;
    item?: IPostmanItem[]; // 如果存在，说明是目录
    request?: {
        method: string;
        [key: string]: any;
    };
    [key: string]: any;
}

interface IPostmanCollection {
    info: IPostmanInfo;
    item: IPostmanItem[];
    [key: string]: any;
}

// ---------------- 解析器类 (Class) ----------------

export class PostmanParser {

    /**
     * 主入口方法
     * @param jsonString Postman 导出的 JSON 字符串
     * @returns 转换后的根节点对象
     */
    public parse(jsonString: string): any {
        let rawData: IPostmanCollection;

        try {
            rawData = JSON.parse(jsonString);
        } catch (e) {
            throw new Error("Invalid JSON string provided.");
        }

        // 1. 处理根节点
        // Postman 的根对应整个 Collection
        // 6.5 生成 ID
        const rootId = this.generateRandomId();
        const rootTarget = this.generateRandomId();

        // 6.2 item 是树结构，开始递归解析 children
        // 6.3 根节点本质上是一个包含了 item 数组的目录，所以 child_type 为 1 (或你定义的根类型 0)
        // 根据示例 #4 根节点 type: 0, child_type: 0。这里我暂时按示例给根节点 child_type: 0，子目录按 1 处理。
        const children = this.transformItems(rawData.item || []);

        // 6.4 统计根节点下的接口数量
        const totalCount = this.calculateCount(children);


        // 构建最终对象
        const rootNode: ITreeNode = {
            id: rootId,
            name: rawData.info.name || "未命名项目", // 6.8 使用 info.name
            type: 0, // 6.7
            child_type: 1, // 示例中根节点是 0，普通目录是 1
            method: null,
            count: totalCount,
            children: children,
            target: rootTarget,
            is_reference: false,
            desc: rawData.description,
            request: null
        };

        const data = {
            info: {
                name: rawData.info.name,
                description: rawData.info.description,
                schema: rawData.info.schema
            },
            tree: [rootNode]
        }

        return data;
    }

    /**
     * 递归转换 Item 数组
     */
    private transformItems(items: IPostmanItem[]): ITreeNode[] {
        return items.map(item => this.transformSingleItem(item));
    }

    /**
     * 转换单个 Postman Item 为目标节点
     */
    private transformSingleItem(source: IPostmanItem): ITreeNode {
        // 6.5 随机生成 6 位整数 ID
        const id = this.generateRandomId();
        const target = this.generateRandomId();

        // 6.3 判断 child_type
        // 有 item 字段表示目录 (child_type = 1)
        // 没有 item 字段表示接口 (child_type = 2)
        const hasChildren = Array.isArray(source.item);
        const childType = hasChildren ? 1 : 2;

        let children: ITreeNode[] = [];
        let method: string | null = null;
        let count = 0;
        let request = null
        let desc = source.description

        if (childType === 1 && source.item) {
            // 是目录：递归处理子节点
            children = this.transformItems(source.item);
            // 6.4 统计该目录下的接口数量 (递归累加)
            count = this.calculateCount(children);
        } else {
            console.log(source.request);

            // 是接口
            // 6.6 如果是接口，写入 method 并转小写，以及覆盖request参数
            if (source.request) {
                const resolvePath = this.generateResolvePath(source.request.url?.path, source.request.url?.raw);
                request = {
                    body: source.request.body,
                    header: source.request.header,
                    method: source.request.method,
                    url: {
                        raw: source.request.url.raw,
                        path: source.request.url.path,
                        host: source.request.url.host,
                        query: source.request.url.query,
                        variable: source.request.url.variable,
                        resolve_path: resolvePath
                    }
                }
                if (source.request.method) {
                    method = source.request.method.toLowerCase();
                }
            }
            // 接口本身没有子节点，count 为 0
            count = 0;
        }

        // 构建节点
        return {
            id: id,
            name: source.name, // 6.8
            type: 0, // 6.7
            child_type: childType,
            method: method,
            count: count,
            children: children,
            target: target,
            is_reference: false, // 6.7
            request: request,
            desc: desc
        };
    }

    private generateResolvePath(pathInput: string[] | string, rawUrl: string): string {
        // 确保 pathInput 是数组 (Postman 有时候 path 也是字符串，这里做个防御)
        const pathArray = Array.isArray(pathInput) ? pathInput : (typeof pathInput === 'string' ? pathInput.split('/') : []);

        // 步骤 2 & 3: 拼接并处理 :variable
        const transformedPath = pathArray.map(segment => {
            if (segment.startsWith(':')) {
                // 将 :pet 转成 {{pet}}
                return `{{${segment.substring(1)}}}`;
            }
            return segment;
        }).join('/');

        // 步骤 4 & 5: 检查 raw 的末尾斜杠
        // 如果 raw 以 / 结尾，且生成的 path 不以 / 结尾（避免重复），则补全 /
        // 如果 path 数组为空，transformedPath 为 ""，如果 raw 以 / 结尾，结果就是 "/"
        let resolvePath = transformedPath;

        if (rawUrl && rawUrl.endsWith('/')) {
            if (!resolvePath.endsWith('/')) {
                resolvePath += '/';
            }
        }

        return resolvePath;
    }

    /**
     * 6.4 统计逻辑辅助函数
     * 计算当前层级下所有子孙节点中接口 (child_type === 2) 的数量
     */
    private calculateCount(nodes: ITreeNode[]): number {
        return nodes.reduce((total, node) => {
            if (node.child_type === 2) {
                // 如果子节点本身是接口，数量+1
                return total + 1;
            } else {
                // 如果子节点是目录，加上该目录内部统计好的 count
                return total + node.count;
            }
        }, 0);
    }

    /**
     * 6.5 生成 6 位随机整数 (100000 - 999999)
     */
    private generateRandomId(): number {
        return Math.floor(Math.random() * 900000) + 100000;
    }
}