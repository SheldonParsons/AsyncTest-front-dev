import { assert } from '../core/schema.js';
import { now } from '../reportStore.node.js';

const DEFAULT_BASE = 'https://ztpm.gree.com:8888/api.php/v1';
export class ZentaoAdapter {
  constructor({ baseURL = DEFAULT_BASE, fetcher = fetch } = {}) { this.baseURL = baseURL.replace(/\/$/, ''); this.fetcher = fetcher; }
  async request(endpoint, params = {}, token, signal, body) {
    const url = new URL(`${this.baseURL}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    const response = await this.fetcher(url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Token: token } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: signal || AbortSignal.timeout(30000), redirect: 'error' });
    assert(response.ok, response.status === 401 ? 'AUTH_REQUIRED' : response.status === 403 ? 'ACCESS_DENIED' : 'NETWORK_ERROR', `禅道请求失败（${response.status}）`);
    const data = await response.json();
    assert(data?.result !== 'fail' && !data?.error, 'UPSTREAM_ERROR', '禅道未能完成请求，请检查连接和范围');
    return data;
  }
  async login(config, password, signal) {
    assert(config.zentaoUsername && password, 'AUTH_REQUIRED', '请在桌面或设置工具中配置禅道账号和密码');
    const data = await this.request('tokens', {}, null, signal, { account: config.zentaoUsername, password });
    const token = data.token || data.Token || data.data?.token || data.data?.Token || data.data?.data?.token;
    assert(typeof token === 'string' && token, 'AUTH_REQUIRED', '禅道未返回有效登录状态'); return token;
  }
  async query(entity, parent, token, signal) {
    const routes = { products: ['products', {}], projects: ['projects', { product: parent.productId }], executions: [`projects/${encodeURIComponent(parent.projectId)}/executions`, {}], testTasks: ['testtasks', { product: parent.productId }], builds: [`executions/${encodeURIComponent(parent.executionId)}/builds`, {}] };
    const requirement = { projects: 'productId', executions: 'projectId', testTasks: 'productId', builds: 'executionId' }[entity];
    assert(!requirement || parent[requirement], 'INVALID_DEPENDENCY', `请先选择${requirement || '父级'}`);
    const [route, params] = routes[entity]; const all = []; let page = 1;
    while (page <= 100) {
      // The v1 /testtasks endpoint documents product/branch/page/limit/order,
      // not a status query. Some deployments treat an unknown "all" status as
      // a literal filter and return an empty list. Filter statuses locally.
      const data = await this.request(route, { ...params, ...(entity === 'testTasks' ? {} : { status: 'all' }), page, limit: 100 }, token, signal);
      const key = entity === 'testTasks' ? 'testtasks' : entity;
      const items = data[key] || data.data?.[key] || data.items || data.list || (Array.isArray(data.data) ? data.data : []);
      assert(Array.isArray(items), 'UPSTREAM_ERROR', '禅道候选响应格式无效');
      const unseen = items.filter(item => !all.some(old => String(old.id) === String(item.id)));
      all.push(...unseen);
      const total = Number(data.total ?? data.pager?.recTotal ?? data.data?.total);
      if (!items.length || Number.isFinite(total) && all.length >= total || items.length < 100 && !Number.isFinite(total)) break;
      assert(unseen.length > 0, 'INCOMPLETE_DATA', '禅道候选分页未前进，无法确认完整范围'); page++;
    }
    assert(page <= 100, 'INCOMPLETE_DATA', '禅道候选过多，请缩小范围');
    return all.map(item => ({ id: String(item.id), name: String(item.name || item.title || item.id), parent: { ...parent }, status: item.status || '', date: item.date || item.begin || item.createdDate || item.openedDate || null, raw: item }));
  }
  async collect(config, password, signal, progress) {
    const token = await this.login(config, password, signal);
    const task = (await this.query('testTasks', { productId: config.productId }, token, signal)).find(item => item.id === config.testTaskId)?.raw;
    assert(task, 'INVALID_DEPENDENCY', '所选测试单不属于当前产品');
    const version = config.buildId ? (await this.query('builds', { executionId: config.executionId }, token, signal)).find(item => item.id === config.buildId)?.raw : null;
    assert(!config.environments.some(env => env.enabled && env.bugRange === 'version') || version, 'INVALID_DEPENDENCY', '所选版本不属于当前执行');
    const bugs = []; const seen = new Set(); const cap = config.customFields.zendaoBugLimit; let page = 1; let complete = false;
    while (bugs.length < cap) {
      const limit = Math.min(100, cap - bugs.length);
      const data = await this.request(`products/${encodeURIComponent(config.productId)}/bugs`, { page, limit, status: 'all' }, token, signal);
      const items = data.bugs || data.data?.bugs;
      assert(Array.isArray(items), 'UPSTREAM_ERROR', '禅道缺陷响应格式无效');
      let added = 0;
      for (const bug of items) if (!seen.has(String(bug.id))) { seen.add(String(bug.id)); bugs.push(bug); added++; }
      progress?.(`已采集 ${bugs.length} 条缺陷`);
      const total = Number(data.total ?? data.pager?.recTotal ?? data.data?.total);
      if (Number.isFinite(total) && bugs.length >= total || items.length < limit) { complete = bugs.length < cap; break; }
      if (!added) break;
      page++;
    }
    return { rawBugs: bugs, task, version, complete, scanned_bug_count: bugs.length, fetchedAt: now(), coverage: { productId: config.productId, executionId: config.executionId, testTaskId: config.testTaskId, buildId: config.buildId, username: config.zentaoUsername, bugLimit: cap, baseURL: this.baseURL } };
  }
}
export function projectBugs(raw, config) {
  const split = value => String(value || '').split(',').map(word => word.trim().toLowerCase()).filter(Boolean);
  const bug = {};
  for (const env of config.environments.filter(item => item.enabled)) {
    const include = split(env.bugFilterKeyword), exclude = split(env.bugExcludeKeyword);
    const rows = raw.rawBugs.filter(item => {
      const title = String(item.title || '').toLowerCase();
      const matchRange = env.bugRange === 'version' ? !!raw.version?.name && String(item.openedBuild || '').includes(raw.version.name) : String(item.execution) === config.executionId;
      return matchRange && (!env.filterBugWithoutSolution || !!String(item.resolution || '').trim()) && include.some(word => title.includes(word)) && exclude.every(word => !title.includes(word));
    });
    const bugs = { total: rows.length, severity: {}, resolution: {}, status: {}, type: {}, pri: {}, postponed_bugs: {}, willnotfix_bugs: {} };
    for (const row of rows) for (const field of ['severity', 'resolution', 'status', 'type', 'pri']) { const key = String(row[field] ?? '') || 'unknown'; bugs[field][key] = (bugs[field][key] || 0) + 1; }
    bugs.severity_mapping = bugs.severity; bugs.resolution_mapping = bugs.resolution;
    for (const row of rows) { if (row.resolution === 'postponed') bugs.postponed_bugs[row.id] = row.title; if (row.resolution === 'willnotfix') bugs.willnotfix_bugs[row.id] = row.title; }
    bug[env.name] = { rows, bugs, filter: { include, exclude }, filterUnresolved: env.filterBugWithoutSolution ? 1 : 0, bugRange: env.bugRange };
  }
  return { bug, task: raw.task, version: raw.version, scanned_bug_count: raw.scanned_bug_count, complete: raw.complete, fetchedAt: raw.fetchedAt };
}
