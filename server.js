import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import express from "express";
import { createServer as createViteServer } from "vite";

const isProduction = process.env.NODE_ENV === "production";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

async function createServer() {
  const app = express();
  let vite;

  if (!isProduction) {
    vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "custom",
      ssr: {
        // 显式启用开发环境 SSR 支持
        external: ["vue", "vue-router"],
        noExternal: ["vue-i18n", /@vue\/.*/],
      },
    });
    app.use(vite.middlewares);
  }

  if (isProduction) {
    const clientDist = path.resolve(__dirname, "dist/client");
    // 静态资源
    app.use(express.static(clientDist, { index: false }));
  }

  const serverEntryPath = isProduction
    ? path.resolve(__dirname, "dist/server/entry-server.js")
    : path.resolve(__dirname, "src/entry-server.ts");

  app.use("*", async (req, res, next) => {
    const url = req.originalUrl;
    console.log(url);
    let template;
    let render;
    try {
      if (isProduction) {
        // 生产环境读取构建处理后的 HTML
        template = fs.readFileSync(
          path.resolve(__dirname, "dist/client/index.html"),
          "utf-8"
        );
      } else {
        // 开发环境使用原始模板 + Vite 实时转换
        template = await vite.transformIndexHtml(
          url,
          fs.readFileSync(path.resolve(__dirname, "index.html"), "utf-8")
        );
      }

      // 2. 应用 Vite HTML 转换。这将会注入 Vite HMR 客户端，
      //    同时也会从 Vite 插件应用 HTML 转换。
      //    例如：@vitejs/plugin-react 中的 global preambles

      // 3. 加载服务器入口。vite.ssrLoadModule 将自动转换
      //    你的 ESM 源码使之可以在 Node.js 中运行！无需打包
      //    并提供类似 HMR 的根据情况随时失效。
      const render = isProduction
        ? (await import(serverEntryPath)).render
        : (await vite.ssrLoadModule(serverEntryPath)).render;

      // 4. 渲染应用的 HTML。这假设 entry-server.ts 导出的 `render`
      //    函数调用了适当的 SSR 框架 API。
      //    例如 ReactDOMServer.renderToString()
      const manifest = isProduction
        ? JSON.parse(
            fs.readFileSync(
              path.resolve(__dirname, "dist/client/.vite/ssr-manifest.json"),
              "utf-8"
            )
          )
        : undefined;
      const { appHtml, state, preloadLinks, teleports } = await render(
        url,
        manifest
      );
      // 5. 注入渲染后的应用程序 HTML 到模板中。
      let html;
      if (isProduction) {
        html = template
          .replace("<!--preload-links-->", preloadLinks || "")
          .replace("'<!--vuex-state-->'", JSON.stringify(state || {}))
          .replace("<!--ssr-outlet-->", appHtml || "")
          .replace("<!--app-teleports-->", teleports);
      } else {
        html = template
          .replace("'<!--vuex-state-->'", JSON.stringify(state))
          .replace("<!--ssr-outlet-->", appHtml || "")
          .replace("<!--app-teleports-->", teleports);
      }

      // 6. 返回渲染后的 HTML。
      res.status(200).set({ "Content-Type": "text/html" }).end(html);
    } catch (e) {
      console.log("server.js：错误");
      console.log(e);
      vite.ssrFixStacktrace(e);
      next(e);
    }
  });

  app.listen(3000, () => {
    console.log(
      "server running in ",
      isProduction ? "Production env" : "Development env"
    );
  });
}

createServer();
