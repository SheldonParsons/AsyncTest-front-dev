# AsyncTest 首页

这是一个仿照 reka-ui.com 风格设计的 AsyncTest 项目首页。

## 设计特点

- **黑色背景**: 纯黑 (#000000) 背景，营造高级感
- **现代化设计**: 采用渐变色、毛玻璃效果、阴影等现代设计元素
- **流畅动画**: 包含滚动动画、悬停效果、视差效果等
- **响应式布局**: 支持桌面和移动设备
- **高对比度**: 确保文字清晰可读

## 文件结构

```
first_page/
├── index.html      # 主 HTML 文件
├── styles.css      # 样式文件
├── script.js       # 交互脚本
└── README.md       # 说明文档
```

## 主要部分

1. **导航栏**: 固定顶部，包含 logo、导航链接、按钮
2. **Hero 区域**: 大标题、副标题、CTA 按钮、统计数据、代码演示
3. **功能展示**: 6 个功能卡片，展示核心特性
4. **技术栈**: 展示使用的主要技术
5. **快速开始**: 三个操作卡片（安装、启动、学习）
6. **页脚**: 链接和版权信息

## 使用方法

直接在浏览器中打开 `index.html` 文件即可查看效果。

```bash
# 使用 VS Code Live Server
# 或者使用 Python 简单服务器
cd /Users/sheldon/Documents/GithubProject/AsyncTest-front-dev/src/assets/first_page
python3 -m http.server 8000
# 然后访问 http://localhost:8000
```

## 自定义

### 修改颜色

在 `styles.css` 的 `:root` 部分修改 CSS 变量：

```css
:root {
    --color-bg: #000000;              /* 背景色 */
    --color-accent: #3b82f6;          /* 主色调 */
    --color-gradient-start: #3b82f6; /* 渐变起始色 */
    --color-gradient-end: #8b5cf6;   /* 渐变结束色 */
}
```

### 修改内容

直接编辑 `index.html` 中的文本内容，包括：
- 标题和副标题
- 功能描述
- 统计数据
- 代码示例

### 添加动画

在 `script.js` 中可以添加更多交互效果，如：
- 打字机效果（已包含但默认禁用）
- 视差滚动
- 鼠标跟随效果

## 技术实现

- **纯 HTML/CSS/JS**: 无需构建工具，可直接使用
- **现代 CSS**: 使用 Grid、Flexbox、CSS 变量等
- **Intersection Observer**: 实现滚动触发动画
- **平滑滚动**: 锚点链接平滑滚动

## 浏览器兼容性

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## 注意事项

1. 该页面为静态展示页面，不包含实际功能
2. 链接为演示用途，需要根据实际项目调整
3. 图标使用 SVG 代码，可根据需要替换
4. 响应式设计已实现，但可能需要根据内容调整断点

## 集成到项目

如需集成到 Vue 项目中，可以：

1. 将样式提取到 `.vue` 组件的 `<style>` 标签中
2. 将 HTML 结构转换为 Vue 模板语法
3. 使用 Vue Router 处理导航
4. 使用 Composition API 管理交互逻辑

## 更新日志

- 2024-01-13: 初始版本创建
  - 实现黑色背景高级设计
  - 添加完整的功能展示
  - 实现响应式布局
  - 添加交互动画
