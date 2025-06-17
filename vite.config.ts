import { defineConfig } from "vite";
import vue from "@vitejs/plugin-vue";
import path from "path";
import config from "./app.config.js";
import vitePluginCompression from "vite-plugin-compression";
export default defineConfig({
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false,
  },
  server: {
    host: "0.0.0.0",
    port: 3000,
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
      "/api/t": {
        target: "http://120.78.204.43:6001",
        rewrite: (path) => {
          return path.replace(/^\/api\/t/, "");
        },
      },
      "/server/t": {
        target: "http://120.78.204.43:6001",
        rewrite: (path) => {
          return path.replace(/^\/server\/t/, "");
        },
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
    vitePluginCompression(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
  optimizeDeps: {
    include: ['deep-diff'],
    exclude: ["fsevents"],
  },
  build: {
    outDir: "dist/client",
    target: 'es2020',
    // 必须启用 SSR manifest
    ssrManifest: true,
    manifest: true,
    // 确保输入路径正确
    rollupOptions: {
      output: {
        // 强制所有依赖使用 ES 模块
        format: 'esm'
      },
      input: {
        // 主入口必须指向 HTML 文件
        main: path.resolve(__dirname, "index.html")
      }
    }
  },
  ssr: {
    target: "node",
    noExternal: [
      /vue-i18n/, // 明确指定需要内联的依赖
      /@vue\/.*/
    ]
  }
});
