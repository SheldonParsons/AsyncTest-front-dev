# AsyncTest 首页更新日志

## 2026-01-13 - Vue 组件集成

### 🔧 组件化封装
1. **FirstPage.vue 组件创建**
   - 位置：`/src/components/FirstPage.vue`
   - 使用 Vue 3 Composition API + TypeScript
   - 完整功能封装：登录面板、动画效果、表单处理
   - 响应式状态管理

2. **路由集成**
   - 添加到主路由配置：`/src/router/index.ts`
   - 路径：`/` (根路径)
   - 路由名称：`landing`
   - 懒加载：`() => import('@/components/FirstPage.vue')`

3. **技术实现**
   - 使用 `<script setup lang="ts">` 语法
   - Reactive refs 管理状态
   - Computed properties 实现语法高亮
   - 生命周期钩子：onMounted、onUnmounted
   - Watch 监听登录状态变化
   - Scoped styles 引用外部 CSS

### 📝 使用方式
```vue
// 直接访问根路径即可看到首页
http://localhost:3333/

// 或在其他组件中导入
import FirstPage from '@/components/FirstPage.vue'
```

## 2024-01-13 - 重大设计升级

### 🎨 品牌升级
1. **Logo 更换**
   - 所有位置的 logo 更换为官方 SVG：`https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/logo_full_light2.svg`
   - 位置包括：导航栏、登录面板、页脚
   - 添加悬停放大效果

2. **GitHub 按钮替换为 IDEA Plugin**
   - 新增 IDEA 图标：`https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/logo/IntelliJ_IDEA_Icon.svg`
   - 按钮文字：IDEA Plugin
   - 链接到 JetBrains 插件市场
   - 图标 + 文字组合展示

### 📝 内容更新

#### 主标题
**旧版：** 打造现代化的 API 测试平台

**新版：**
```
Asynchronous Way of Testing for Any Interface
```
- "Async" 和 "Test" 添加渐变色高亮效果
- 更国际化、更专业的表述

#### 副标题
**旧版：** 基于 Vue 3 + TypeScript 构建的全功能 API 测试与管理工具，支持 AI 驱动的测试用例生成、Mock 服务、智能编排

**新版：**
```
全异步协程驱动 · 协商式取消模型 · 接口文档同步 · Mock 快速响应 · 智能用例编排
```
- 突出核心技术特性
- 使用点分隔符，更简洁清晰

#### 功能卡片调整
**Feature 1 更新：**
- **旧版：** AI 智能测试
- **新版：** 全异步协程
  - 基于 Kotlin 协程的全异步执行模型
  - 协商式取消机制
  - 高效处理大规模接口测试

#### 导航栏调整
- 移除 "AI 功能" 导航项（包括 "New" 标签）
- 保留：功能、文档、案例

### 🎨 设计系统升级

#### 颜色主题：紫色 → 绿色
**CSS 变量更新：**
```css
--color-accent: #10b981 (原 #3b82f6)
--color-accent-hover: #059669 (原 #2563eb)
--color-gradient-start: #10b981 (原 #3b82f6)
--color-gradient-end: #34d399 (原 #8b5cf6)
```

**影响范围：**
- 所有按钮（主按钮、次按钮）
- 渐变文字
- 阴影效果
- 悬停状态
- 特性卡片边框
- 登录按钮

#### "开始使用"按钮重新设计
**升级特性：**
1. **尺寸增大**
   - 内边距：1rem 2rem → 1.25rem 3rem
   - 字体大小：1rem → 1.1rem
   - 边框半径：0.75rem → 1rem

2. **高级动画效果**
   - 悬停：上浮 4px + 放大 1.02 倍
   - 点击：轻微缩放反馈
   - 光泽扫过动画（伪元素实现）

3. **视觉增强**
   - 阴影增强：0 10px 40px
   - 字重加粗：600 → 700
   - 字母间距：0.5px
   - 绿色发光效果

### 🐛 Bug 修复
- 修复关闭按钮 z-index 问题（2100）
- 优化事件冒泡处理
- 添加详细调试日志

### 🔧 技术改进
1. **Logo 显示优化**
   - 使用 `<img>` 标签替代 emoji + 文字
   - 自适应高度，保持比例
   - 悬停时轻微放大

2. **IDEA Plugin 按钮**
   - 图标 + 文字组合
   - 图标尺寸：20x20px
   - 弹性布局，间距 0.5rem

3. **响应式兼容**
   - 移动端 logo 高度自适应
   - 按钮在小屏幕上正常显示

## 视觉对比

### 颜色对比
| 元素 | 旧版（紫蓝） | 新版（绿色） |
|------|-------------|-------------|
| 主色调 | #3b82f6 | #10b981 |
| 渐变结束色 | #8b5cf6 | #34d399 |
| 悬停色 | #2563eb | #059669 |

### 按钮升级
| 属性 | 旧版 | 新版 |
|------|------|------|
| 内边距 | 1rem 2rem | 1.25rem 3rem |
| 阴影 | 30px | 40px |
| 悬停位移 | -2px | -4px |
| 动画 | 无 | 光泽扫过 |

## 文件变更
- ✅ `index.html` - 内容和结构更新
- ✅ `styles.css` - 颜色主题和按钮样式升级
- ✅ `script.js` - 事件处理优化（已在之前完成）

## 测试建议
1. 检查所有 logo 是否正确加载
2. 测试 IDEA Plugin 按钮链接
3. 验证绿色主题在所有元素上的应用
4. 测试"开始使用"按钮的动画效果
5. 移动端响应式测试

## 后续优化建议
1. 添加更多功能卡片（目前只更新了第一个）
2. 优化移动端的标题字体大小
3. 考虑添加更多交互动画
4. 完善国际化支持
