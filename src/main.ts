import { createSSRApp } from 'vue'
import { createSSRi18n } from './lang/i18n'
import App from './App.vue'
import { createSSRrouter } from './router'
import ElementPlus, { ElMessage, ElNotification, ID_INJECTION_KEY } from 'element-plus'
import { ZINDEX_INJECTION_KEY } from 'element-plus'
import * as ElementPlusIconsVue from '@element-plus/icons-vue'
import 'element-plus/theme-chalk/base.css'
import 'element-plus/theme-chalk/display.css'
import 'element-plus/dist/index.css'
import './assets/css/preset.scss'
import { createSSRstore, key } from './store'



export function create_app() {
  const app = createSSRApp(App)
  const store = createSSRstore()
  const router = createSSRrouter()
  const i18n = createSSRi18n()
  for (const [key, component] of Object.entries(ElementPlusIconsVue)) {
    app.component(key, component)
  }
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
  return { app, router, store }
}
