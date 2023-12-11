function JSONTrim(JSONstr:any) {
  // .replace(/\s+/g, '')
  try {
    JSONstr = tryJsonStr(JSONstr)
    JSONstr = JSONstr.replace(/<\/?.+?>/g, '').replace(/[\r\n]/g, '')
    const j = JSONstr.split('"')
    JSONstr = ''
    for (let i = 0; i < j.length; i++) {
      if (i % 2 === 0) {
        j[i] = j[i].replace(/\s+/g, '')
      }
    }
    JSONstr = j.join('"')
    // JSONstr = JSON.stringify(JSON.parse(JSONstr))
  } catch (error) {
    // 转换失败错误提示
    console.error('json数据格式有误...')
    console.error(error)
    JSONstr = null
  }
  return JSONstr
}

function tryJsonStr(value:any) {
  try {
    if (typeof value === 'string') {
      return value
    } else {
      return JSON.stringify(value)
    }
  } catch (error) {
    return value
  }
}

function JSONFormat(JSONstr:any) {
  JSONstr = JSONTrim(JSONstr) // 初步格式化json
  // eslint-disable-next-line prefer-regex-literals
  const re = new RegExp('\\{{2}.*?\\}{2}|\\{|\\}|,|:', 'g') // 匹配格式化后的json中的{},:
  let exec = null
  let InvalidFs = 0
  let InvalidBs = 0
  // eslint-disable-next-line no-cond-assign
  while (exec = re.exec(JSONstr)) { // 找{},:
    const frontToCurrent = exec.input.slice(0, exec.index + 1) // 匹配开头到当前匹配字符之间的字符串
    // console.log(frontToCurrent)
    // console.log(exec.input.slice(0, exec.index + 1))

    if (frontToCurrent.replace(/\\"/g, '').replace(/[^"]/g, '').length % 2 !== 0) { // 测试当前字符到开头"的数量，为双数则被断定为目标对象
      if (exec[0] === '{') InvalidFs++
      else if (exec[0] === '}') InvalidBs++
      continue // 不是目标对象，手动跳过
    }
    const keyTimesF = frontToCurrent.replace(/[^{]/g, '').length - InvalidFs // 找出当前匹配字符以前全部{的个数
    const keyTimesB = frontToCurrent.replace(/[^}]/g, '').length - InvalidBs // 找出当前匹配字符以前全部}的个数
    const indentationTimes = keyTimesF - keyTimesB // 根据{个数计算缩进

    if (exec[0].indexOf('{{') !== -1 || exec[0].indexOf('}}') !== -1) {
      continue
    } else if (exec[0] === '{') {
      JSONstr = JSONstr.slice(0, exec.index + 1) + '\n' + '\t'.repeat(indentationTimes) + JSONstr.slice(exec.index + 1) // 将缩进加入字符串
    } else if (exec[0] === '}') {
      JSONstr = JSONstr.slice(0, exec.index) + '\n' + '\t'.repeat(indentationTimes) + JSONstr.slice(exec.index) // 将缩进加入字符串
      re.exec(JSONstr) // 在查找目标前面插入字符串会回退本次查找，因此手动跳过本次查找
    } else if (exec[0] === ',') {
      JSONstr = JSONstr.slice(0, exec.index + 1) + '\n' + '\t'.repeat(indentationTimes) + JSONstr.slice(exec.index + 1)
    } else if (exec[0] === ':') {
      JSONstr = JSONstr.slice(0, exec.index + 1) + ' ' + JSONstr.slice(exec.index + 1)
    } else {
      throw Object.assign(
        new Error(`匹配错误${exec[0]}`),
        { code: -1 }
      )
    }
  }
  return JSONstr
}

export default JSONFormat
