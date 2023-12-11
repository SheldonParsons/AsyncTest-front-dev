import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import express from 'express'
import bodyParser from 'body-parser'
import { createServer as createViteServer } from 'vite'
import config from './app.config.js'
import serveStatic from 'serve-static'
import http from './utils/http.js'

const isProduction = process.env.NODE_ENV === 'production'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

async function createServer() {
  const app = express()
  // 使用 vite 的 Connect 实例作为中间件
  // 如果你使用了自己的 express 路由（express.Router()），你应该使用 router.use
  const vite = await createViteServer({
    server: { middlewareMode: true },
    appType: 'custom'
  })
  if (isProduction) {
    app.use(serveStatic(path.resolve(__dirname, 'dist/client')))
    app.use(bodyParser.urlencoded({ extended: true }))
    app.use(bodyParser.json())
    app.all(config.serverTag + '/*', async (req, res) => {
      // 代理路由获取到接口信息，转发至后端服务器，跳过跨域
      http()
        .request(
          req.method,
          req.url.replace(config.serverTag, ''),
          req.body,
          req.headers
        )
        .then((data) => {
          if (data.response) {
            res.status(data.response.status)
            res.send(data.response.data)
          } else {
            res.status(data.status)
            res.send(data.data)
          }
        })
    })
  } else {
    // 以中间件模式创建 Vite 应用，这将禁用 Vite 自身的 HTML 服务逻辑
    // 并让上级服务器接管控制
    app.use(vite.middlewares)
  }

  app.use('*', async (req, res, next) => {
    const url = req.originalUrl
    let template
    let render
    try {
      if (isProduction) {
        // 1. 读取 index.html
        template = fs.readFileSync(
          path.resolve(__dirname, 'dist/client/index.html'),
          'utf-8'
        )
        // 3. 加载服务器入口
        render = (await import('./dist/server/entry-server.js')).render
        // render = require('./dist/server/entry-server').render
      } else {
        // 1. 读取 index.html
        template = fs.readFileSync(
          path.resolve(__dirname, 'index.html'),
          'utf-8'
        )

        // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
        //    同时也会从 Vite 插件应用 HTML 转换。
        //    例如：@vitejs/plugin-react 中的 global preambles
        template = await vite.transformIndexHtml(url, template)

        // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
        //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
        //    并提供类似 HMR 的根据情况随时失效。
        render = (await vite.ssrLoadModule('/src/entry-server.ts')).render
      }
      // 4. 渲染应用的 HTML。这假设 entry-server.ts 导出的 `render`
      //    函数调用了适当的 SSR 框架 API。
      //    例如 ReactDOMServer.renderToString()
      const manifest = await vite.ssrLoadModule(
        '/dist/client/ssr-manifest.json'
      )
      const { appHtml, state, preloadLinks } = await render(url, manifest)
      // 5. 注入渲染后的应用程序 HTML 到模板中。
      const html = template
        .replace('<!--ssr-outlet-->', appHtml)
        .replace("'<!--vuex-state-->'", JSON.stringify(state))
        .replace("'<!--preload-links-->'", preloadLinks)

      // 6. 返回渲染后的 HTML。
      res.status(200).set({ 'Content-Type': 'text/html' }).end(html)
    } catch (e) {
      // 如果捕获到了一个错误，让 Vite 来修复该堆栈，这样它就可以映射回
      // 你的实际源码中。
      vite.ssrFixStacktrace(e)
      next(e)
    }
  })

  app.listen(3000, () => {
    console.log(
      'server running in ',
      isProduction ? 'Production env' : 'Development env'
    )
  })
}

createServer()
