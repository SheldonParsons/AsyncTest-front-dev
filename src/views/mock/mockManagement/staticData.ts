interface iHope {
    [propName: string]: any
}

const hope:iHope = {}

hope.position = ['param', 'header', 'body']

hope.compare = ['等于', '不等于', '大于', '大于或等于', '小于', '小于或等于', '包含', '不包含', '正则匹配', '存在', '不存在']

export default hope
