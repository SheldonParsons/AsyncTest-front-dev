import { assert } from '../core/schema.js';
import { now } from '../reportStore.node.js';

const DEFAULT_BASE = 'https://ztpm.gree.com:8888/api.php/v1';
const BUG_PAGE_SIZE = 500;
const BUG_FETCH_CONCURRENCY = 4;
export const ZENTAO_BUG_COLLECTION_VERSION = 'all-pages-v1';

function paginationInteger(value, label, minimum = 0) {
  if (value === undefined || value === null || value === '') return null;
  const parsed = typeof value === 'number' || typeof value === 'string' && /^\d+$/.test(value.trim()) ? Number(value) : NaN;
  assert(Number.isSafeInteger(parsed) && parsed >= minimum, 'UPSTREAM_ERROR', `禅道返回的${label}无效，请重新获取`);
  return parsed;
}

export class ZentaoAdapter {
  constructor({ baseURL = DEFAULT_BASE, fetcher = fetch } = {}) { this.baseURL = baseURL.replace(/\/$/, ''); this.fetcher = fetcher; }
  async request(endpoint, params = {}, token, signal, body) {
    const url = new URL(`${this.baseURL}/${endpoint}`);
    for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== '') url.searchParams.set(key, String(value));
    const requestSignal = signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000);
    const response = await this.fetcher(url, { method: body ? 'POST' : 'GET', headers: { 'Content-Type': 'application/json', ...(token ? { Token: token } : {}) }, body: body ? JSON.stringify(body) : undefined, signal: requestSignal, redirect: 'error' });
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
    const pages = new Map(); const seen = new Set();
    let pageSize = BUG_PAGE_SIZE; let pageSizeConfirmed = false; let expectedTotal = null; let complete = false;
    const controller = new AbortController();
    const collectionSignal = signal ? AbortSignal.any([signal, controller.signal]) : controller.signal;
    const readPage = async page => {
      collectionSignal.throwIfAborted();
      const data = await this.request(`products/${encodeURIComponent(config.productId)}/bugs`, { page, limit: pageSize, status: 'all', order: 'id_asc' }, token, collectionSignal);
      collectionSignal.throwIfAborted();
      const items = data.bugs || data.data?.bugs;
      assert(Array.isArray(items), 'UPSTREAM_ERROR', '禅道缺陷响应格式无效');
      const returnedPage = paginationInteger(data.page ?? data.pager?.pageID ?? data.data?.page, '页码', 1);
      assert(returnedPage === null || returnedPage === page, 'INCOMPLETE_DATA', '禅道返回的页码与请求不一致，无法确认缺陷完整；请重新获取');
      const returnedSize = paginationInteger(data.limit ?? data.pager?.recPerPage ?? data.data?.limit, '每页条数', 1);
      // 服务端可能限制每页条数，仅在第一页按实际页大小调整，后续保持一致。
      if (page === 1 && returnedSize !== null) pageSize = returnedSize;
      assert(returnedSize === null || returnedSize === pageSize, 'INCOMPLETE_DATA', '禅道分页大小发生变化，无法确认缺陷完整；请重新获取');
      if (returnedSize !== null) pageSizeConfirmed = true;
      assert(items.length <= pageSize, 'INCOMPLETE_DATA', '禅道返回的缺陷数量超过分页大小，请重新获取');
      const total = paginationInteger(data.total ?? data.pager?.recTotal ?? data.data?.total, '缺陷总数');
      if (total !== null) {
        assert(expectedTotal === null || expectedTotal === total, 'INCOMPLETE_DATA', '采集期间禅道缺陷总数发生变化，请重新获取后生成');
        expectedTotal = total;
      }
      // 并发响应可能乱序；末页不足一页是正常情况，按页码核对它应有的数量。
      if (expectedTotal !== null) {
        const expectedCount = Math.max(0, Math.min(pageSize, expectedTotal - (page - 1) * pageSize));
        assert(items.length === expectedCount, 'INCOMPLETE_DATA', `禅道第 ${page} 页应返回 ${expectedCount} 条，实际返回 ${items.length} 条，无法确认缺陷完整；请重新获取`);
      }
      let added = 0;
      for (const bug of items) {
        const id = String(bug?.id ?? '').trim();
        assert(id, 'UPSTREAM_ERROR', '禅道返回了缺少编号的缺陷，无法确认完整数据');
        if (!seen.has(id)) { seen.add(id); added++; }
      }
      assert(expectedTotal === null || seen.size <= expectedTotal, 'INCOMPLETE_DATA', '已采集数量超过禅道返回的总数，请重新获取');
      pages.set(page, items);
      progress?.(`已采集 ${seen.size}${expectedTotal === null ? '' : ` / ${expectedTotal}`} 条缺陷`);
      complete = expectedTotal !== null ? seen.size === expectedTotal : !items.length || pageSizeConfirmed && items.length < pageSize;
      if (complete) {
        controller.abort();
        return;
      }
      assert(added > 0, 'INCOMPLETE_DATA', '禅道分页重复，未获取到新的缺陷；请重新获取');
    };
    try {
      // 首个响应确认总数和有效页大小；已取齐时不再启动任何请求。
      await readPage(1);
      let nextPage = 2;
      // 无总数时不猜测剩余页，顺序读取至确认末页或空页。
      while (!complete && expectedTotal === null) await readPage(nextPage++);
      if (!complete) {
        const lastPage = Math.ceil(expectedTotal / pageSize);
        let failure;
        const worker = async () => {
          try {
            while (!complete && !collectionSignal.aborted && nextPage <= lastPage) {
              await readPage(nextPage++);
            }
          } catch (error) {
            if (!complete && !failure) { failure = error; controller.abort(error); }
          }
        };
        // 固定数量的请求槽位，只调度已知总数对应的页；失败时中止其余在途请求。
        await Promise.all(Array.from({ length: Math.min(BUG_FETCH_CONCURRENCY, lastPage - nextPage + 1) }, worker));
        if (failure) throw failure;
        signal?.throwIfAborted();
        assert(complete, 'INCOMPLETE_DATA', `已读完所有分页，但去重后只有 ${seen.size} / ${expectedTotal} 条缺陷；请重新获取`);
      }
      signal?.throwIfAborted();
    } catch (error) {
      controller.abort(error);
      throw error;
    }
    // 按页码还原顺序，报告和附件不受网络响应先后影响。
    const bugs = []; seen.clear();
    for (const [, items] of [...pages].sort(([left], [right]) => left - right)) for (const bug of items) {
      const id = String(bug.id).trim();
      if (!seen.has(id)) { seen.add(id); bugs.push(bug); }
    }
    return { rawBugs: bugs, task, version, complete: true, scanned_bug_count: bugs.length, fetchedAt: now(), coverage: { productId: config.productId, executionId: config.executionId, testTaskId: config.testTaskId, buildId: config.buildId, username: config.zentaoUsername, collectionVersion: ZENTAO_BUG_COLLECTION_VERSION, baseURL: this.baseURL } };
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
