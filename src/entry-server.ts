import { create_app } from "./main";
import { renderToString } from "vue/server-renderer";

export async function render(url: string, manifest: any) {
  const { app, router, store } = create_app();
  await router.push(url);
  await router.isReady();

  const matchedComponents = router.currentRoute.value.matched.flatMap(
    (record: any) => {
      return Object.values(record.components);
    }
  );
  await Promise.all(
    matchedComponents.map((Component: any) => {
      if (Component.asyncData) {
        return Component.asyncData({ store, route: router.currentRoute }).catch(
          (err: any) => {
            console.error("AsyncData Error:", err);
            context.error = err;
          }
        );
      }
    })
  );
  const context: any = {};
  const appHtml = await renderToString(app, context);
  const teleports = renderTeleports(context.teleports);

  function renderTeleports(teleports: any) {
    if (!teleports) return "";
    return Object.entries(teleports).reduce((all, [key, value]) => {
      if (key.startsWith("#el-popper-container-")) {
        return `${all}<div id="${key.slice(1)}">${value}</div>`;
      }
      return all;
    }, teleports.body || "");
  }

  const state = store.state;
  if (import.meta.env.PROD) {
    const preloadLinks = renderLinks(context.modules, manifest);
    return { appHtml, state, preloadLinks, teleports };
  } else {
    return { appHtml, state, undefined, teleports };
  }
}

function renderLinks(modules: any, manifest: any) {
  const links: any = [];
  modules.forEach((id: any) => {
    const files = manifest[id];
    if (files) {
      files.forEach((file: any) => {
        links.push(renderPreloadLink(file));
      });
    }
  });
  return Array.from(new Set(links)).join("");
}

function renderPreloadLink(file: any) {
  if (file.endsWith(".js")) {
    return `<link rel="modulepreload" crossorigin href="${file}">`;
  } else if (file.endsWith(".css")) {
    return `<link rel="stylesheet" href="${file}">`;
  } else if (file.endsWith(".woff")) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff" crossorigin>`;
  } else if (file.endsWith(".woff2")) {
    return ` <link rel="preload" href="${file}" as="font" type="font/woff2" crossorigin>`;
  } else if (file.endsWith(".gif")) {
    return ` <link rel="preload" href="${file}" as="image" type="image/gif">`;
  } else if (file.endsWith(".jpg") || file.endsWith(".jpeg")) {
    return ` <link rel="preload" href="${file}" as="image" type="image/jpeg">`;
  } else if (file.endsWith(".png")) {
    return ` <link rel="preload" href="${file}" as="image" type="image/png">`;
  } else {
    return "";
  }
}
