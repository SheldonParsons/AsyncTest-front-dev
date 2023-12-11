import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'
import vitePluginCompression from 'vite-plugin-compression'
// http://172.28.6.152:8070
export default defineConfig({
  define: {
    __VUE_I18N_FULL_INSTALL__: true,
    __VUE_I18N_LEGACY_API__: false,
    __INTLIFY_PROD_DEVTOOLS__: false
  },
  server: {
    host: '0.0.0.0',
    port: 3000,
    proxy: {
      '/api/server': {
        target: 'http://localhost:6001',
        rewrite: path => path.replace(/^\/api\/server/, '')
      },
      '/api': {
        target: 'http://localhost:6001',
        // target: 'http://localhost:6001',
        rewrite: path => path.replace(/^\/api/, '')
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
  }
})
