export default class COOKIE {
  private document:any

  public setDocument(document:any) {
    this.document = document
  }

  // 取得cookie
  public getCookie(name:string) {
    const nameEQ = name + '='
    const ca = this.document.cookie.split(';') // 把cookie分割成组
    for (let i = 0; i < ca.length; i++) {
      let c = ca[i] // 取得字符串
      while (c.charAt(0) === ' ') { // 判断一下字符串有没有前导空格
        c = c.substring(1, c.length) // 有的话，从第二位开始取
      }
      if (c.indexOf(nameEQ) === 0) { // 如果含有我们要的name
        return decodeURI(c.substring(nameEQ.length, c.length)) // 解码并截取我们要值
      }
    }
    return false
  }

  // 清除cookie
  public clearCookie(name:string) {
    this.setCookie(name, '', -1)
  }

  // 设置cookie
  public setCookie(name:string, value:string, seconds:number) {
    seconds = seconds || 0 // seconds有值就直接赋值，没有为0，这个根php不一样。
    let expires = ''
    if (seconds !== 0) { // 设置cookie生存时间
      const date = new Date()
      date.setTime(date.getTime() + (seconds * 1000))
      expires = '; expires=' + date.toUTCString()
    }
    this.document.cookie = name + '=' + decodeURI(value) + expires + '; path=/' // 转码并赋值
  }
}
