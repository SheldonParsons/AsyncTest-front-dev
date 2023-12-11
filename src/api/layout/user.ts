import { IResultOr } from '../interface'
import asyncTest from '../../db' // 引入数据库和对象仓库

const storeName = Object.keys(asyncTest.userObjectStore)[0]

// 保存当前用户信息
export async function saveUserStatus(state: any) {
  const resultOr: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: true }
  })
  const { success } = resultOr
  let obj = {}
  if (success) { // 说明数据已存在，则更新数据
    obj = { userId: state.userId, privateKey: state.privateKey, username: state.username, password: state.password, role: state.role, nickName: state.nickName, email: state.email, mobile: state.mobile, sex: state.sex, id: 1 }
  } else { // 说明数据不存在，则新增数据
    obj = { userId: state.userId, privateKey: state.privateKey, username: state.username, password: state.password, role: state.role, nickName: state.nickName, email: state.email, mobile: state.mobile, sex: state.sex }
  }
  const result: IResultOr = await asyncTest.autoDB.updateItem(storeName, obj).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: true }
  })
  return result
}

// 获取当前user所有状态
export async function fetchUserStatus() {
  const result: IResultOr = await asyncTest.autoDB.getItem(storeName, 1).then(res => {
    return { code: '000000', message: '操作成功', result: res || null, success: res !== undefined }
  })
  return result
}
