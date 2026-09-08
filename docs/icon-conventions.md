# UI 图标约定

新增功能统一使用官方 Vue 包 `@lucide/vue`，当前固定版本 1.42.0。使用 `src/components/icons/lucide.ts` 按需导出；不全量注册，不通过字符串动态载入整个图标集合。

- 菜单、页签默认 16px；标题 20～24px；stroke-width 1.8～2。
- 图标使用 currentColor，沿用黑白灰和当前 hover 状态。
- 图标旁有文字时 aria-hidden；仅图标按钮须提供中文 aria-label。
- Element Plus 组件仍可使用，但可见的关闭、箭头、清除、加载、日期导航等图标通过组件属性或插槽使用 Lucide。
- 品牌 Logo 不作为通用 UI 图标替换。

本轮替换 header 的 Dashboard、项目图标，头像下拉菜单（含文档与检查更新），以及团队管理、成员抽屉、申请与审批、全局用户和全局审批中的可见 UI 图标。后续新增功能遵循本约定。

官方文档：https://lucide.dev/guide/vue/
