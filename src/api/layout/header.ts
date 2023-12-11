import { IResultOr } from '../interface'
import asyncTest from '../../db' // 引入数据库和对象仓库

const storeName = Object.keys(asyncTest.headerObjectStore)[0]

// 本地数据库接口：保存当前语言包
export async function saveGlobalHeader(state: any) {
  const resultOr: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: true }
  })
  const { success } = resultOr
  let obj = {}
  if (success) { // 说明数据已存在，则更新数据
    obj = { style: state, id: 1 }
  } else { // 说明数据不存在，则新增数据
    obj = { style: state }
  }
  const result: IResultOr = await asyncTest.autoDB.updateItem(storeName, obj).then(res => {
    return { code: '000000', message: '操作成功', result: null, success: true }
  })
  return result
}

// 本地数据库接口：获取当前语言包
export async function fetchGlobalHeader() {
  const result: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: res !== undefined }
  })
  return result
}
