import { create_app } from "./main";

import asyncTest from "./db";

const { app, router, store } = create_app();

if ((window as any).__INITIAL_STATE__) {
  store.replaceState((window as any).__INITIAL_STATE__);
}

// 统一初始化对象仓库
router.beforeEach((to, from, next) => {
  // asyncTest.cookies.setDocument(window.document)
  asyncTest.router.setRouter(router);
  asyncTest.autoDB
    .openStore({
      ...asyncTest.languageObjectStore,
      ...asyncTest.headerObjectStore,
      ...asyncTest.userObjectStore,
      ...asyncTest.rememberObjectStore,
      ...asyncTest.debugObjectStore,
    })
    .then((res: any) => {
      store.dispatch("getGlobalHeader");
      next();
    });
});

router.isReady().then(() => {
  asyncTest.cookies.setDocument(window.document);
  router.beforeResolve((to, from, next) => {
    const toComponents = router
      .resolve(to)
      .matched.flatMap((record: any) => Object.values(record.components));
    const fromComponents = router
      .resolve(from)
      .matched.flatMap((record: any) => Object.values(record.components));
    const activated = toComponents.filter((c, index) => {
      return fromComponents[index] !== c;
    });

    if (!activated.length) {
      return next();
    } else {
      next();
    }
    Promise.all(
      activated.map((Component: any) => {
        if (Component.asyncData) {
          return Component.asyncData({
            store,
            route: router.currentRoute,
          });
        }
      })
    );
  });
  app.mount("#app", true);
});
