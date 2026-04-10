/**
 * 环境检测工具
 */

/** 是否在 Electron 环境中 */
export function isElectron(): boolean {
  return import.meta.env.VITE_IS_ELECTRON === 'true';
}

/** 运行时检测 Electron（用于动态判断） */
export function isElectronRuntime(): boolean {
  return (
    typeof window !== 'undefined' &&
    window.navigator.userAgent.toLowerCase().includes('electron')
  );
}

/** 是否有 electronAPI 可用 */
export function hasElectronAPI(): boolean {
  return typeof window !== 'undefined' && !!(window as any).electronAPI;
}

/** 服务器 Python 版本 */
export const SERVER_PYTHON_VERSION = '3.11.7';

/** 服务器已提供的第三方包 */
export const SERVER_PACKAGES = ['aiohttp==3.9.3'];

/** 环境提示信息 */
export const ENV_TIPS = {
  pythonVersion: `服务器 Python 环境为 ${SERVER_PYTHON_VERSION}，建议本地使用相同版本以确保运行结果一致`,
  noThirdParty: `最终代码请勿使用第三方包，服务器不兼容。如需第三方包请联系管理员。服务器已提供：${SERVER_PACKAGES.join('、')}`,
  useDesktop: '脚本运行仅在 AsyncTest 桌面端可用，请下载桌面端体验完整功能',
  noPython: `未检测到 Python 环境，请安装 Python 后重试。建议版本：Python ${SERVER_PYTHON_VERSION}`,
} as const;
