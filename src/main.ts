import { createApp } from 'vue' // 从 createSSRApp 改为 createApp
import { createSSRi18n } from './lang/i18n'
import App from './App.vue'
import router from './router'
import asyncTest from "./db"
import ElementPlus, { ElMessage, ElNotification, ID_INJECTION_KEY } from 'element-plus'
import { ZINDEX_INJECTION_KEY } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'

// 样式引入保持不变
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/display.css'
import 'element-plus/dist/index.css'
import '@/assets/scss/radix-ui.scss'
import './assets/css/preset.scss'

import { createSSRstore, key } from './store'
import AstLoading from './components/common/general/loading.vue'
import CustomSelect from './components/common/general/CustomSelect.vue'


async function bootstrap() {
  // 直接执行初始化逻辑
  const app = createApp(App)
  const store = createSSRstore()
  const i18n = createSSRi18n()

  // 1. 初始化工具类
  asyncTest.cookies.setDocument(window.document)
  asyncTest.router.setRouter(router)

  try {
    // 2. 核心：在挂载应用前，先等待数据库打开
    console.log('正在连接 IndexedDB...')
    await asyncTest.autoDB.openStore({
      ...asyncTest.languageObjectStore,
      ...asyncTest.headerObjectStore,
      ...asyncTest.userObjectStore,
      ...asyncTest.rememberObjectStore,
      ...asyncTest.debugObjectStore,
    })
    console.log('IndexedDB 已就绪')

    // 3. 数据库就绪后，预抓取全局数据
    // 这样可以确保 Header 组件渲染时已经有数据了
    await store.dispatch("getGlobalHeader")

  } catch (error) {
    console.error('数据库初始化失败:', error)
  }

  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }

  app.component('AstLoading', AstLoading)
  app.component('CustomSelect', CustomSelect)

  app.provide(ZINDEX_INJECTION_KEY, {
    current: 0,
  })

  app.config.globalProperties.$message = ElMessage
  app.config.globalProperties.$messageNotice = ElNotification

  app.provide(ID_INJECTION_KEY, {
    prefix: 1024,
    current: 0
  })

  app.use(store, key)
  app.use(ElementPlus)
  app.use(i18n)
  app.use(router)

  // 关键：在 CSR 中直接挂载到 DOM
  app.mount('#app')
}


bootstrap()