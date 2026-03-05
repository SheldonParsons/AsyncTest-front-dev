import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import config from "./app.config.js";
import vitePluginCompression from "vite-plugin-compression";
import monacoEditorPlugin from "vite-plugin-monaco-editor";
console.log('--- 当前编译变量 VITE_IS_ELECTRON:', process.env.VITE_IS_ELECTRON);
console.log(process.env.VITE_IS_ELECTRON === 'true');
const isElectron = process.env.VITE_IS_ELECTRON === 'true';

export default defineConfig({
  base: process.env.VITE_IS_ELECTRON === 'true' ? './' : '/',
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
    'process.env.VITE_IS_ELECTRON': JSON.stringify(process.env.VITE_IS_ELECTRON),
    'process.env': {},
    'process.version': '"v22.0.0"', // 给一个虚拟版本号即可
    'process.platform': '"darwin"',
  },
  server: {
    host: "0.0.0.0",
    port: 3333,
    hmr: {
      //host: '0.0.0.0',
      port: 24678,
      protocol: "ws",
      // protocol: "wss", // 服务器开启
      // clientPort: 443, // 服务器开启
      path: "/_hmr",
    },
    proxy: {
      "/api/mock": {
        target: "http://120.78.204.43:6001",
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/api/server": {
        target: config.server,
        rewrite: (path) => path.replace(/^\/api\/server/, ""),
      },
      "/api": {
        target: config.server,
        rewrite: (path) => path.replace(/^\/api/, ""),
      },
      "/sse": {
        target: config.server,
        rewrite: (path) => path.replace(/^\/sse/, ""),
      },
    },
  },
  css: {
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        silenceDeprecations: [
          'import',
          'global-builtin',
          'color-functions',
        ],
        quietDeps: true,
        verbose: false,
        additionalData:
          '@import "@/assets/scss/variable.scss";@import "@/assets/scss/main.scss";',
      },
    },
  },
  plugins: [
    vue({
      script: {
        defineModel: true, // 启用实验性功能
      },
    }),
    (monacoEditorPlugin as any).default({
      // 这里的列表是 Worker，Python 没有 Worker，所以去掉 python
      languageWorkers: ['editorWorkerService', 'typescript', 'json'],
      // 强制指定你需要的高亮语言（防止默认加载全部）
      languages: ['json', 'typescript', 'python']
    }),
    vitePluginCompression({
      verbose: true,
      disable: false,
      threshold: 10240,
      algorithm: "gzip",
      ext: ".gz",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
      "monaco-editor/esm/vs/editor/editor.api": "monaco-editor/esm/vs/editor/editor.main",
    },
  },
  optimizeDeps: {
    include: ['deep-diff'],
    exclude: ["fsevents", ...(isElectron ? [] : ["electron-updater", "electron"])],
  },
  build: {
    outDir: "dist", // 统一输出到 dist，不再区分 client
    target: 'es2020',
    ssrManifest: false, // 关掉
    manifest: true,
    sourcemap: false,
    minify: 'esbuild',
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, "index.html")
      },
      external: isElectron ? [] : ['/src/src-rust/']
    }
  }
});
