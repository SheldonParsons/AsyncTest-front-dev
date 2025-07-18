declare module 'deep-diff' {
  export interface Diff<T = any> {
    kind: 'N' | 'D' | 'E' | 'A';
    path: (string | number)[];
    lhs?: T;
    rhs?: T;
    index?: number;
    item?: Diff<T>;
  }

  export function diff<T>(original: T, updated: T, prefilter?: (path: (string | number)[], key: string | number) => boolean): Diff<T>[] | undefined;
  export function applyChange(target: any, source: any, change: Diff): void;
  export function revertChange(target: any, source: any, change: Diff): void;
}
export { }

declare global {
  interface Window {
    $toast: any  // 根据实际类型替换 any
  }
}