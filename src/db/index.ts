import { airDB } from '../utils/indexedDB' // 引入indexedDB工具类
import COOKIE from '@/utils/cookies'
import ROUTER from '@/utils/router'
import languageObjectStore from './objectStores/language' // 引入语言类型对象仓库
import headerObjectStore from './objectStores/header'
import userObjectStore from './objectStores/user'
import rememberObjectStore from './objectStores/remember'
import debugObjectStore from './objectStores/debug'

// 数据库
export const autoDB = airDB
export const cookies = new COOKIE()
export const router = new ROUTER()

export default {
  autoDB,
  cookies,
  router,
  languageObjectStore,
  headerObjectStore,
  userObjectStore,
  rememberObjectStore,
  debugObjectStore
}
