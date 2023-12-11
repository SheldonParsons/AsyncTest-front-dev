import { IResultOr } from '../interface'
import asyncTest from '../../db' // 引入数据库和对象仓库

const storeName = Object.keys(asyncTest.debugObjectStore)[0]

// 保存当前调试信息
export async function saveDebugStatus(state: any) {
  const resultOr: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: true }
  })
  const { success } = resultOr
  let obj = {}
  if (success) { // 说明数据已存在，则更新数据
    console.log(state)

    obj = { result: state, id: 1 }
  } else { // 说明数据不存在，则新增数据
    obj = { result: state }
  }
  const result: IResultOr = await asyncTest.autoDB.updateItem(storeName, obj).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: true }
  })
  return result
}

// 获取当前user所有状态
export async function fetchDebugStatus() {
  const result: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: res !== undefined }
  })
  return result
}
