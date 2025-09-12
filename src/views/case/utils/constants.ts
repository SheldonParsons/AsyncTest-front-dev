export const envStrategy: any = [
    {
        key: 'current_case',
        value: '跟随当前用例同名环境'
    },
    {
        key: 'self_case',
        value: '使用该用例环境'
    }
]

export const errorMultitaskerStrategy: any = [
    {
        key: 'current_step',
        value: '跳过当前步骤'
    },
    {
        key: 'current_multitasker',
        value: '结束子执行器'
    },
    {
        key: 'multitasker',
        value: '结束执行器'
    },
    {
        key: 'current_case',
        value: '结束子用例'
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
        key: 'ref_child_case',
        value: '结束引用子用例'
    },
    {
        key: 'ref_case',
        value: '结束引用用例'
    },
    {
        key: 'current_case',
        value: '结束子用例'
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

export const errorCaseRealStrategy: any = [
    {
        key: 'current_step',
        value: '跳过当前步骤'
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
col_definitions = ["name", "age", "gender", "nickname"]
row_matrix_data = [["Sheldon", 18, "male", "sheldon"], ["Cindy", 16, "female", "cindy"]]
dataset = at.DataSet()
dataset.set_columns(col_definitions)
for row in row_matrix_data:
    dataset.add_row(row)
# 关键：请返回一个正整数、可迭代对象、DataSet实例
return dataset
\`\`\``

export const assertionScriptDemo: string = `\`\`\`python
# 示例代码
if at.temp.get('name') == at.temp.get('current_name'):
    # 关键代码：请在适时候返回一个布尔值来锁定该断言的结果
    return True
# 关键代码：请在适时候返回一个布尔值来锁定该断言的结果
return False
\`\`\``

export const ifScriptDemo: string = `\`\`\`python
# 示例代码
if at.temp.get('name') == at.temp.get('current_name'):
    # 关键代码：请在适时候返回一个布尔值来锁定该条件判断的结果
    return True
# 关键代码：请在适时候返回一个布尔值来锁定该条件判断的结果
return False
\`\`\``

export const errorScriptDemo: string = `\`\`\`python
# 示例代码
if at.temp.get('name') == at.temp.get('current_name'):
    # 关键代码：抛出异常，该代码将会通过raise关键字抛出异常从而让上级发现
    at.raise('name_error')
# 关键代码：抛出异常，该代码将会通过raise关键字抛出异常从而让上级发现
at.raise('normal_error')
\`\`\``


export const patternMode: any = [
    { key: "eq", value: "等于" },
    { key: "neq", value: "不等于" },
    { key: "exist", value: "存在" },
    { key: "noexist", value: "不存在" },
    { key: "gt", value: "大于" },
    { key: "gte", value: "大于或等于" },
    { key: "lt", value: "小于" },
    { key: "lte", value: "小于或等于" },
    { key: "contains", value: "包含" },
    { key: "notContains", value: "不包含" },
    { key: "regex", value: "正则匹配" },
];

export const patternFastMode: any = [
    { key: "eq", value: "等于" },
    { key: "neq", value: "不等于" },
    { key: "gt", value: "大于" },
    { key: "gte", value: "大于或等于" },
    { key: "lt", value: "小于" },
    { key: "lte", value: "小于或等于" },
    { key: "contains", value: "包含" },
    { key: "notContains", value: "不包含" },
    { key: "regex", value: "正则匹配" },
];

export const patternCodeMode: any = [
    { key: "eq", value: "等于" },
    { key: "neq", value: "不等于" },
    { key: "gt", value: "大于" },
    { key: "gte", value: "大于或等于" },
    { key: "lt", value: "小于" },
    { key: "lte", value: "小于或等于" },
    { key: "contains", value: "包含" },
    { key: "notContains", value: "不包含" }
];

export const assertMode: any = [
    {
        key: "fast",
        value: "快速断言"
    },
    {
        key: "script",
        value: "自定义脚本"
    }
]

export const assertionMode: any = [
    {
        key: 'interface',
        value: "上一个接口"
    },
    {
        key: "fast",
        value: "快速断言"
    },
    {
        key: "script",
        value: "自定义脚本"
    }
]

export const interfaceRange: any = [
    {
        key: "body",
        value: "Body"
    },
    {
        key: "header",
        value: "Header"
    },
    {
        key: "code",
        value: "Code"
    }
]

export const interfaceBodyRange: any = [
    {
        key: "all",
        value: "所有内容"
    },
    {
        key: "pattern",
        value: "Jsonpath匹配"
    }
]

export const extractDatabaseParamMode = [
    {
        key: 'kv',
        value: '快速提取'
    },
    {
        key: 'script',
        value: "自定义代码"
    }
]

export const databseReaultScriptDemo: string = `\`\`\`python
# 示例代码
result = at.database.get_result()
name = result[0]["name"]
at.temp.set('name', name)
\`\`\``


export const paramsRange = [
    {
        key: "temp",
        value: "临时变量"
    },
    {
        key: "env",
        value: "环境变量"
    },
    {
        key: "global",
        value: "全局变量"
    }
]