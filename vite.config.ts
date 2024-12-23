import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import config from './app.config.js'
import vitePluginCompression from 'vite-plugin-compression'
// http://172.28.6.152:8070
console.log(config);

export default defineConfig({
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    hmr: false,
    proxy: {
      '/api/server': {
        target: config.server,
        rewrite: path => path.replace(/^\/api\/server/, '')
      },
      '/api': {
        target: config.server,
        rewrite: path => path.replace(/^\/api/, '')
      },
      '/sse': {
        target: config.server,
        rewrite: path => path.replace(/^\/sse/, '')
      }
    }
  },
  css: {
    preprocessorOptions: {
      scss: {
        additionalData: '@import "@/assets/scss/variable.scss";@import "@/assets/scss/main.scss";'
      }
    }
  },
  plugins: [
    vue(),
    vitePluginCompression()
    // AutoImport({
    //   resolvers: [ElementPlusResolver()]
    // }),
    // Components({
    //   dts: true,
    //   resolvers: [ElementPlusResolver(
    //     {
    //       importStyle: false
    //     }
    //   )]
    // })
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src')
    }
  },
  optimizeDeps: {
    include: [
      '@codemirror/state',
      '@codemirror/view',
      '@codemirror/lang-javascript',
      '@codemirror/basic-setup',
    ]
  }
})
