import CryptoJS from "crypto-js";
export function md5(text: string) {
  const encrypted = CryptoJS.MD5(text).toString(CryptoJS.enc.Hex);
  return encrypted;
}

export function sha(text: string, algorithm: string) {
  if (algorithm === "sha1") {
    return CryptoJS.SHA1(String(text)).toString(CryptoJS.enc.Hex);
  }
  if (algorithm === "sha224") {
    return CryptoJS.SHA224(String(text)).toString(CryptoJS.enc.Hex);
  }
  if (algorithm === "sha256") {
    return CryptoJS.SHA256(String(text)).toString(CryptoJS.enc.Hex);
  }
  if (algorithm === "sha384") {
    return CryptoJS.SHA384(String(text)).toString(CryptoJS.enc.Hex);
  }
  if (algorithm === "sha512") {
    return CryptoJS.SHA512(String(text)).toString(CryptoJS.enc.Hex);
  }
}

export function base64(text: string) {
  return btoa(unescape(encodeURIComponent(String(text))));
}

export function unbase64(text: string) {
  return decodeURIComponent(escape(atob(String(text))));
}

export function encodeUriComponent(text: string) {
  return encodeURIComponent(String(text));
}

export function decodeUriComponent(text: string) {
  return decodeURIComponent(String(text));
}

export function lower(text: string) {
  return String(text).toLowerCase();
}

export function upper(text: string) {
  return String(text).toUpperCase();
}

export function number(text: string) {
    return Number(text);
}

export function substr(text:string,start:number,end:number){
    return String(text).slice(start, end);
}

export function concat(text:string, value:string) {
    return String(text) + value;
}

export function lconcat(text:string, value:string) {
    return value + String(text);
}

export function padEnd(text:string,len:number, value:string) {
    return String(text).padEnd(len, value);
}

export function padStart(text:string,len:number, value:string) {
    return String(text).padStart(len, value);
}


export function length(text: string | number) {
  if (typeof text === "string") {
    return text.length; // 如果是字符串，直接返回长度
  } else if (typeof text === "number") {
    return text.toString().length; // 如果是数字，先转为字符串再计算长度
  } else {
    return 0; // 其他类型返回 0 或者其他默认值
  }
}
