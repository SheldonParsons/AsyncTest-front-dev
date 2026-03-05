export default class COOKIE {
  private document: any

  public setDocument(document: any) {
    this.document = document
  }

  // 内部私有方法：判断是否在 Electron 环境
  private isElectron(): boolean {
    return typeof window !== 'undefined' &&
      window.navigator.userAgent.toLowerCase().includes('electron');
  }

  // 取得cookie
  // src/utils/cookies.ts
  public getCookie(name: string) {
    // 1. 防御性判断：如果 document 还没被注入，先不读 cookie 避免崩溃
    if (this.document && this.document.cookie) {
      const nameEQ = name + '=';
      const ca = this.document.cookie.split(';');
      for (let i = 0; i < ca.length; i++) {
        let c = ca[i];
        while (c.charAt(0) === ' ') c = c.substring(1, c.length);
        if (c.indexOf(nameEQ) === 0) {
          const val = decodeURI(c.substring(nameEQ.length, c.length));
          return val;
        }
      }
    }

    // 2. 如果 Cookie 没找到，检查 Electron 环境
    const isElectron = typeof window !== 'undefined' && window.navigator.userAgent.toLowerCase().includes('electron');

    if (isElectron) {
      const localVal = localStorage.getItem(name);
      return localVal || false; // 注意这里：如果 localStorage 也没有，返回 false
    }

    return false;
  }

  // 清除cookie
  public clearCookie(name: string) {
    // 同时清除两个地方，确保万无一失
    this.setCookie(name, '', -1)
    if (this.isElectron()) {
      localStorage.removeItem(name);
    }
  }

  // 设置cookie
  public setCookie(name: string, value: string, seconds: number) {
    seconds = seconds || 0
    let expires = ''

    // 1. 传统的 Cookie 设置逻辑
    if (seconds !== 0) {
      const date = new Date()
      date.setTime(date.getTime() + (seconds * 1000))
      expires = '; expires=' + date.toUTCString()
    }

    // 防御性判断，防止在某些极端环境下 document 还没注入
    if (this.document) {
      this.document.cookie = name + '=' + decodeURI(value) + expires + '; path=/'
    }

    // 2. 如果是 Electron 环境，同步存入 localStorage
    // 因为 Electron 的 file:// 协议往往无法持久化 document.cookie
    if (this.isElectron()) {
      if (seconds < 0) {
        localStorage.removeItem(name);
      } else {
        localStorage.setItem(name, value);
      }
    }
  }
}