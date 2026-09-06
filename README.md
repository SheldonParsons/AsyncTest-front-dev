# Vue 3 + TypeScript + Vite

## 知识录入正文所有权

- 整理是桌面 Agent 的正常任务，通过服务端唯一 Skill 和工具目录指导；不增加前端美化引擎，不让知识库再次自动改写。用户要求原样时跳过整理。
- 长材料可用已有本机工具分段读取、写出 UTF-8 结果，再通过新增/完整替换的 `content_file` 提交。子进程读取并冻结文字，Main 复用现有分块/hash 传输；服务器只收到字符串，不接收路径。
- 文件读取仅接受绝对路径、普通 UTF-8 文本，检查并发变更；单文件/单批文件内容最多 4 MB，失败不截断。与原生本机工具共用操作系统权限边界，无新增特权读取。
- 完整正文预览、现行内容差异、确认、取消、冷恢复和回执沿用原有链路。新请求不提供后端“改用原文美化”选项，历史已生成预览仍兼容。
- 前后端需配套更新；无新依赖或数据库迁移。测试继续使用项目外 `ast-testing-core`。

This template should help get you started developing with Vue 3 and TypeScript in Vite. The template uses Vue 3 `<script setup>` SFCs, check out the [script setup docs](https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup) to learn more.

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Volar](https://marketplace.visualstudio.com/items?itemName=Vue.volar)

## Type Support For `.vue` Imports in TS

Since TypeScript cannot handle type information for `.vue` imports, they are shimmed to be a generic Vue component type by default. In most cases this is fine if you don't really care about component prop types outside of templates. However, if you wish to get actual prop types in `.vue` imports (for example to get props validation when using manual `h(...)` calls), you can enable Volar's Take Over mode by following these steps:

1. Run `Extensions: Show Built-in Extensions` from VS Code's command palette, look for `TypeScript and JavaScript Language Features`, then right click and select `Disable (Workspace)`. By default, Take Over mode will enable itself if the default TypeScript extension is disabled.
2. Reload the VS Code window by running `Developer: Reload Window` from the command palette.

You can learn more about Take Over mode [here](https://github.com/johnsoncodehk/volar/discussions/471).
