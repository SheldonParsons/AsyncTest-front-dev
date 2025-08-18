export const envStrategy: any = [
    {
        key: 'current_case',
        value: '跟随当前用例同名环境'
    },
    {
        key: 'self_case',
        value: '使用用例当前环境设置'
    }
]

export const errorMultitaskerStrategy: any = [
    {
        key: 'current_step',
        value: '跳过当前步骤'
    },
    {
        key: 'current_multitasker',
        value: '结束当前执行器'
    },
    {
        key: 'multitasker',
        value: '结束执行器'
    },
    {
        key: 'current_case',
        value: '结束当前用例'
    },
    {
        key: 'case',
        value: '结束用例'
    },
    {
        key: 'raise',
        value: '交由上级处理'
    },
    {
        key: 'task',
        value: '结束任务'
    }
]


export const errorCaseStrategy: any = [
    {
        key: 'current_step',
        value: '跳过当前步骤'
    },
    {
        key: 'ref_case',
        value: '结束引用用例'
    },
    {
        key: 'current_case',
        value: '结束当前用例'
    },
    {
        key: 'case',
        value: '结束用例'
    },
    {
        key: 'raise',
        value: '交由上级处理'
    },
    {
        key: 'task',
        value: '结束任务'
    }
]

export const errorParamsCoverStrategy: any = [
    {
        key: 'no',
        value: '不进行覆盖'
    },
    {
        key: 'env',
        value: '仅覆盖环境变量'
    },
    {
        key: 'global',
        value: '仅覆盖全局变量'
    },
    {
        key: 'all',
        value: '所有都覆盖'
    }
]

export const multitaskerDriveStrategy: any = [
    {
        key: 'times',
        value: '固定次数'
    },
    {
        key: 'dataset',
        value: '数据集驱动'
    },
    {
        key: 'script',
        value: '自定义脚本'
    }
]

export const multitaskerLoopStrategy: any = [
    {
        key: 'sequential',
        value: '顺序执行'
    },
    {
        key: 'concurrent',
        value: '并发执行'
    }
]

export const createDatasetScript: string = `\`\`\`python
# 示例代码
row_definitions = ["name", "age", "gender", "nickname"]
row_matrix_data = [["Sheldon", 18, "male", "sheldon"], ["Cindy", 16, "female", "cindy"]]
dataset = at.Dataset()
dataset.set_columns(row_definitions)
for row in row_matrix_data:
    dataset.add_row(row)

return dataset
\`\`\``