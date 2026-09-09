# 桌面与文件图标

- `app-logo.svg`：macOS、Windows 共用的应用图标原稿。
- `amind-logo.svg`：macOS、Windows 共用的 `.amind` 文件图标原稿。
- 原稿均为 1024 × 1024，包含底板、阴影及留白；转换时保留整个 viewBox，不裁边、不额外加底板。

打包使用上一级目录的 `icon.icns`、`icon.ico`、`amind.icns`、`amind.ico`。
ICO 包含 16、24、32、48、64、128、256 像素；ICNS 包含标准及 Retina 尺寸，最高 1024 像素。
应用、安装器、卸载器及文件关联的引用配置位于 `package.json`。

`yarn electron:dev` 使用 Electron 开发宿主，不能据此判断安装后的系统图标。
检查系统效果需本地打包：macOS 查看应用包在 Finder、Dock 中的图标，Windows 查看安装后的快捷方式和任务栏。
`.amind` 文件图标需要系统已注册文件关联；旧应用或图标缓存可能仍显示旧资源。
本地图标检查无需发布更新，调用 electron-builder 时显式指定 `--publish never`。
