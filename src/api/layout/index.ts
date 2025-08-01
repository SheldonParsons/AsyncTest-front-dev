/**
 * code: '000000'表示'操作成功'；code: '000001'表示'数据已存在'；code: '000002'表示'密码不正确'；
 * code: '000003'表示'手机号不正确'；code: '000004'表示'其他异常'；code: '000005'表示'登录过期'；
 */

import { IResultOr } from '../interface'
import asyncTest from '../../db' // 引入数据库和对象仓库

const storeName = Object.keys(asyncTest.languageObjectStore)[0]

// Mock接口：保存当前语言包
export async function saveLanguageApi(lang: any) {
  const resultOr: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: true }
  })
  const { success } = resultOr
  let obj = {}
  if (success) { // 说明数据已存在，则更新数据
    obj = { name: lang, id: 1 }
  } else { // 说明数据不存在，则新增数据
    obj = { name: lang }
  }
  const result: IResultOr = await asyncTest.autoDB.updateItem(storeName, obj).then(res => {
    return { code: '000000', message: '操作成功', result: null, success: true }
  })
  return result
}

// Mock接口：获取当前语言包
export async function fetchLanguageApi() {
  const result: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: res !== undefined }
  })
  return result
}
