/// <reference types="vite/client" />

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}


// src/vite-env.d.ts 或 src/monaco.d.ts

// 解决 python.contribution 报错
declare module 'monaco-editor/esm/vs/basic-languages/python/python.contribution';

// 解决 python 语言定义报错 (为了保险起见，建议把这个也加上)
declare module 'monaco-editor/esm/vs/basic-languages/python/python';

// 如果你将来用了 json，可能也需要加这个
declare module 'monaco-editor/esm/vs/language/json/monaco.contribution';

declare module 'monaco-editor/esm/vs/basic-languages/mysql/mysql.contribution'

declare module 'monaco-editor/esm/vs/editor/editor.main'



export interface IElectronAPI {
  toggleTrafficLights: (visible: boolean) => void;
  openExternal: (url: string) => void;
  on: (event: any, params: any) => (() => void);
  send: (event: any) => void;
  invoke: (event: any) => void;
  wm: any,
  platform: any,
  amind: any,
  generator: any
}

declare global {
  interface Window {
    electronAPI: IElectronAPI;
    $toast: (options: { title: string; type?: string }) => void;
    $updateHeaderLoginStatus: () => void;
  }
}
