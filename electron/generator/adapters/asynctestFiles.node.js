import { assert } from '../core/schema.js';
import { hash } from '../reportStore.node.js';
export function reportSiteOrigins(baseURL, rendererURL, configuredOrigins = []) {
  const origins = new Set([new URL(baseURL).origin, ...configuredOrigins.map(value => new URL(value).origin)]);
  const renderer = new URL(rendererURL);
  if (['http:', 'https:'].includes(renderer.protocol)) origins.add(renderer.origin);
  return [...origins];
}
export class AsyncTestFilesAdapter {
  constructor({ getAuth, fetcher = fetch }) { this.getAuth = getAuth; this.fetcher = fetcher; this.handles = new Map(); }
  async auth() { const auth = await this.getAuth(); assert(auth?.token && auth?.baseURL, 'AUTH_REQUIRED', '请在 AsyncTest 桌面登录'); return auth; }
  async request(endpoint, params = {}, bytes = false) {
    const auth = await this.auth(); const url = new URL(`${auth.baseURL.replace(/\/$/, '')}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) url.searchParams.set(key, String(value));
    const response = await this.fetcher(url, { headers: { Authorization: `token=${auth.token}` }, redirect: 'error', signal: AbortSignal.timeout(30000) });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      const denied = /非项目下成员|没有.*权限/.test(String(body.data || ''));
      assert(false, response.status === 403 && body.code === 302 || response.status === 401 ? 'AUTH_REQUIRED' : response.status === 403 || denied ? 'ACCESS_DENIED' : 'NETWORK_ERROR', response.status === 403 && body.code === 302 || response.status === 401 ? '请在 AsyncTest 桌面重新登录' : denied || response.status === 403 ? '没有该项目文件访问权限' : `AsyncTest 请求失败（${response.status}）`);
    }
    if (bytes) {
      if (response.headers.get('content-type')?.includes('application/json')) {
        const data = await response.json();
        assert(false, data.code === 302 ? 'AUTH_REQUIRED' : 'ACCESS_DENIED', data.code === 302 ? '请在 AsyncTest 桌面重新登录' : '服务器没有返回可下载的文件');
      }
      assert(Number(response.headers.get('content-length') || 0) <= 50 * 1024 ** 2, 'FILE_TOO_LARGE', '文件超过 50 MB');
      const chunks = []; let size = 0;
      for await (const chunk of response.body) { size += chunk.length; assert(size <= 50 * 1024 ** 2, 'FILE_TOO_LARGE', '文件超过 50 MB'); chunks.push(chunk); }
      return Buffer.concat(chunks);
    }
    const data = await response.json();
    assert(data.code !== 302, 'AUTH_REQUIRED', '请在 AsyncTest 桌面重新登录');
    assert(data.result !== 0 && data.code !== 403, 'ACCESS_DENIED', 'AsyncTest 未授权读取该目录'); return data;
  }
  async list(folderUrl) {
    const auth = await this.auth(); let url;
    try { url = new URL(folderUrl); } catch { assert(false, 'INVALID_PARAMS', '请输入完整的 AsyncTest 目录 URL'); }
    const allowed = new Set([new URL(auth.baseURL).origin, ...(auth.siteOrigins || [])]);
    assert(allowed.has(url.origin) && !url.username && !url.password, 'ACCESS_DENIED', '目录 URL 不属于当前配置的 AsyncTest 站点');
    const route = url.hash.startsWith('#/') ? url.hash.slice(1) : url.pathname;
    const match = route.match(/^\/home\/main\/project\/(\d+)\/settings\/source\/files(?:\/(.*))?$/);
    assert(match, 'INVALID_PARAMS', '无法识别 AsyncTest 文件目录路径');
    let folder; try { folder = decodeURIComponent(match[2] || '').normalize('NFC').replace(/\/+$/g, ''); } catch { assert(false, 'INVALID_PARAMS', '目录 URL 编码无效'); }
    assert(!folder.split('/').some(part => part === '..' || part === '.') && !/[\\\0]/.test(folder), 'INVALID_PARAMS', '目录路径无效');
    const data = await this.request('project/file', { project: match[1], folder });
    const rows = Array.isArray(data) ? data : data.results || data.data?.results || data.data || [];
    assert(Array.isArray(rows), 'UPSTREAM_ERROR', '文件列表响应格式无效');
    const entries = rows.map(item => {
      const entry = { provider: 'asynctest', projectId: match[1], folder, fileId: String(item.id), name: String(item.name || ''), type: item.is_dir || item.is_folder ? 'folder' : 'file', size: item.size ?? null, updatedAt: item.update_time || item.add_time || null, baseOrigin: new URL(auth.baseURL).origin };
      const entryHandle = hash(entry); this.handles.set(entryHandle, entry); return { ...entry, entryHandle };
    });
    return { projectId: match[1], folder, entries };
  }
  async download(entry) { const auth = await this.auth(); assert(new URL(auth.baseURL).origin === entry.baseOrigin, 'PROFILE_MISMATCH', '来源属于其他 AsyncTest 站点'); return this.request('project/file/download', { id: entry.fileId }, true); }
}
