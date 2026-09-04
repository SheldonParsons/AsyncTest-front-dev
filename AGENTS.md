# AGENTS.md

> **测试所有权（2026-09-05）**：本仓库不保存测试框架、fixture 或运行证据。统一由
> `/Users/sheldon/Documents/AsyncTest/ast-testing-core` 驱动；测试数据只允许写入
> `/Users/sheldon/Documents/AsyncTest/ast-testing-core-data`。产品侧只保留通用运行隔离接口。

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## 项目概述

AsyncTest 是一个基于 Vue 3 + TypeScript + Vite 的 API 测试和管理平台前端项目。

## 开发命令

```bash
# 安装依赖（使用 yarn，不要使用 npm）
yarn install

# 启动 Electron 开发环境（Renderer 端口 3333）
yarn electron:dev

# 仅启动 Renderer，供页面调试使用；Vibe Agent 入口只在 Electron 中可用
yarn dev

# 构建项目（包含类型检查）
yarn build

# 打包 Electron
yarn build:mac:prod
yarn build:win:prod
```

## 架构概览

### 核心技术栈
- **框架**: Vue 3.5 (Composition API + `<script setup>`)
- **构建工具**: Vite 5.2
- **UI 组件库**: Element Plus 2.9
- **状态管理**: Vuex 4.1
- **路由**: Vue Router 4.0
- **国际化**: Vue I18n (支持中英文，默认英文)
- **编辑器**: Monaco Editor (代码编辑)
- **数据表格**: AG Grid Community

### 目录结构
```
src/
├── api/         # API 接口定义（按模块组织）
├── components/
│   ├── common/  # 通用组件（button、editor、input、general 等）
│   └── layout/  # 布局组件（headers、menus、dialogs、tables 等）
├── db/          # IndexedDB 本地存储封装
├── lang/        # 国际化文件 (zh.ts, en.ts)
├── router/      # 路由配置（嵌套路由结构）
├── store/       # Vuex 状态管理
├── types/       # TypeScript 类型定义
├── utils/       # 工具函数（http、cookies、router、indexedDB）
└── views/       # 页面组件（按功能模块组织）
```

### 主要功能模块
- **API 管理** (`/src/views/api/`): API 接口的创建、编辑、测试
- **测试用例** (`/src/views/case/`): 测试用例管理和执行
- **AI 功能** (`/src/views/ai/`): 应用编排、知识库、需求管理、自定义插件
- **Mock 服务** (`/src/views/mock/`): Mock 数据管理和录制
- **数据管理** (`/src/views/data/`): 测试数据管理
- **项目设置** (`/src/views/settings/`): 数据库、文件、异步执行器、Token 配置

### HTTP 请求架构
- 后端地址配置在 `app.config.js` 中（默认 `http://localhost:6001`）
- 开发环境通过 Vite 代理转发请求（`/api` → 后端）
- HTTP 封装在 `/src/utils/http.ts`，提供 `httpGet`、`httpPost`、`httpPut`、`httpDelete` 方法
- 请求拦截器自动附加 Authorization token（从 cookie 获取）
- 403 响应自动跳转登录页

### 本地存储架构
- 使用 IndexedDB 进行本地数据存储（`/src/db/`）
- Cookie 管理封装在 `/src/utils/cookies.ts`
- 全局状态由 `GlobalStatus`（`/src/global.ts`）管理

### Electron Agent 运行时
- Electron Main 入口：`electron/main.js`
- Agent Host：`electron/vibeAgent/agentHost.node.js`
- 独立子进程入口：`electron/vibeAgent/runtime/runner.mjs`
- 对话固定走 Electron Main → 官方 AgentSession → Provider 直连 → 远程 Knowledge/Trace；没有浏览器或服务端 Agent 回退

### 组件开发规范
1. 使用 Vue 3 Composition API + `<script setup>` 语法
2. TypeScript 严格模式开启
3. 组件样式使用 SCSS，全局变量和样式自动导入（`variable.scss`、`main.scss`）
4. 路径别名：`@` 指向 `src` 目录

### 路由结构
- 主路由在 `/home` 下，采用嵌套子路由
- 项目相关页面路径格式：`/home/main/project/{module}/project/:project`
- 支持动态路由参数（`:project`、`:group`、`:knowledge` 等）

### 注意事项
1. 项目使用 yarn 作为包管理器，不要使用 npm
2. 开发时需要配合后端服务运行（默认端口 6001）
3. 全局组件 `AstLoading` 已注册，可直接使用
4. Element Plus 图标组件已全局注册
