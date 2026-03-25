import fs from 'node:fs';
import path from 'node:path';
import * as XLSX from 'xlsx';

const ZENTAO_BASE_URL = 'https://ztpm.gree.com:8888';
const ZENTAO_API_BASE = `${ZENTAO_BASE_URL}/api.php/v1`;
const BUG_SHEET_TITLE = '禅道Bug列表';
const BUG_FIELDS = [
  ['Bug编号', 'id', '无'],
  ['Bug标题', 'title', '无标题'],
  ['严重程度', 'severity', '未指定'],
  ['优先级', 'pri', '未指定'],
  ['重现步骤', 'steps', '无描述'],
  ['bug状态', 'status', '状态未知'],
  ['由谁创建', 'openedBy', '匿名用户'],
  ['指派给', 'assignedTo', '无指派'],
  ['创建日期', 'openedDate', '无日期'],
];

let latestZendaoRunResult = null;

function ensureDirectory(dirPath) {
  fs.mkdirSync(dirPath, { recursive: true });
}

function buildTimestampLabel() {
  const now = new Date();
  const parts = [
    now.getFullYear(),
    `${now.getMonth() + 1}`.padStart(2, '0'),
    `${now.getDate()}`.padStart(2, '0'),
    `${now.getHours()}`.padStart(2, '0'),
    `${now.getMinutes()}`.padStart(2, '0'),
    `${now.getSeconds()}`.padStart(2, '0'),
  ];
  return `${parts[0]}${parts[1]}${parts[2]}-${parts[3]}${parts[4]}${parts[5]}`;
}

function sanitizeFileNamePart(input) {
  return `${input || 'zendao'}`
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '_')
    .replace(/\s+/g, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '') || 'zendao';
}

function splitKeywords(input) {
  return `${input || ''}`
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

function htmlToText(html) {
  return `${html ?? ''}`
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{2,}/g, '\n')
    .trim();
}

function calculateCharWidth(char) {
  return char.charCodeAt(0) > 255 ? 2 : 1;
}

function getColumnWidth(values) {
  const widthList = values.map((value) =>
    `${value ?? ''}`.split('\n')[0].split('').reduce((sum, char) => sum + calculateCharWidth(char), 0)
  );
  return Math.max(...widthList, 10) + 4;
}

function processBugFieldValue(value, fieldName, defaultValue) {
  if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) {
    return defaultValue;
  }

  if (fieldName === 'openedBy' || fieldName === 'assignedTo') {
    return `${value?.realname ?? defaultValue}`;
  }

  if (fieldName === 'steps') {
    return htmlToText(value) || defaultValue;
  }

  if (Array.isArray(value)) {
    return value.map((item) => `${item}`).join('\n');
  }

  return `${value}`.trim() || defaultValue;
}

function appendBugWorksheet(workbook, sheetName, bugs) {
  const safeSheetName = `${sheetName || BUG_SHEET_TITLE}`.slice(0, 31) || BUG_SHEET_TITLE;
  const headerRow = BUG_FIELDS.map(([headerName]) => headerName);
  const rows = (Array.isArray(bugs) ? bugs : []).map((bug) =>
    BUG_FIELDS.map(([, fieldName, defaultValue]) => processBugFieldValue(bug?.[fieldName], fieldName, defaultValue))
  );
  const worksheet = XLSX.utils.aoa_to_sheet([headerRow, ...rows]);
  worksheet['!cols'] = headerRow.map((_, columnIndex) => ({
    wch: getColumnWidth([headerRow[columnIndex], ...rows.map((row) => row[columnIndex])]),
  }));
  XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
}

function writeBugWorkbook(filePath, bugRowsByEnv) {
  const workbook = XLSX.utils.book_new();
  Object.entries(bugRowsByEnv).forEach(([envName, bugs]) => {
    appendBugWorksheet(workbook, envName, bugs);
  });
  XLSX.writeFile(workbook, filePath);
}

function writeSingleEnvironmentBugWorkbook(filePath, bugs) {
  const workbook = XLSX.utils.book_new();
  appendBugWorksheet(workbook, BUG_SHEET_TITLE, bugs);
  XLSX.writeFile(workbook, filePath);
}

export function persistZendaoArtifacts(zendaoPayload, targetDir) {
  if (!zendaoPayload) {
    return null;
  }

  ensureDirectory(targetDir);

  const fileBaseName = sanitizeFileNamePart(
    zendaoPayload?.task?.executionName ||
      zendaoPayload?.version?.name ||
      `zendao-${zendaoPayload?.task?.execution || zendaoPayload?.version?.execution || 'export'}`
  );
  const timestampLabel = buildTimestampLabel();
  const bugJsonFilePath = path.join(targetDir, `${fileBaseName}_禅道缺陷统计_${timestampLabel}.json`);
  const bugExcelFilePaths = Object.fromEntries(
    Object.entries(zendaoPayload?.bug || {}).map(([envName, value]) => {
      const envFilePath = path.join(
        targetDir,
        `${fileBaseName}_${sanitizeFileNamePart(envName)}_禅道Bug列表_${timestampLabel}.xlsx`
      );
      writeSingleEnvironmentBugWorkbook(envFilePath, value?.rows || []);
      return [envName, envFilePath];
    })
  );

  const persistedPayload = {
    ...zendaoPayload,
    bug_json_file_path: bugJsonFilePath,
    bug_excel_file_paths: bugExcelFilePaths,
    output_dir: targetDir,
  };

  fs.writeFileSync(bugJsonFilePath, JSON.stringify(persistedPayload, null, 2), 'utf8');
  return persistedPayload;
}

function createSummaryBucket() {
  return {
    severity_mapping: {},
    resolution_mapping: {},
    postponed_bugs: {},
    willnotfix_bugs: {},
    total: 0,
  };
}

function increaseCounter(target, key) {
  const normalizedKey = `${key ?? ''}` || 'unknown';
  target[normalizedKey] = (target[normalizedKey] || 0) + 1;
}

function appendBugSummary(summary, bug) {
  increaseCounter(summary.severity_mapping, bug?.severity ?? 'unknown');
  increaseCounter(summary.resolution_mapping, bug?.resolution ?? 'unknown');
  if (`${bug?.resolution ?? ''}` === 'postponed') {
    summary.postponed_bugs[`${bug?.id ?? ''}`] = `${bug?.title ?? ''}`;
  }
  if (`${bug?.resolution ?? ''}` === 'willnotfix') {
    summary.willnotfix_bugs[`${bug?.id ?? ''}`] = `${bug?.title ?? ''}`;
  }
  summary.total += 1;
}

function emitRunLog(emitLog, level, title, detail, mergeKey) {
  if (typeof emitLog === 'function') {
    emitLog({ level, title, detail, mergeKey });
  }
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(errorText || `请求失败：${response.status}`);
  }
  return await response.json();
}

function buildUrl(pathname, params) {
  const url = new URL(pathname, ZENTAO_BASE_URL);
  Object.entries(params || {}).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') return;
    url.searchParams.set(key, `${value}`);
  });
  return url;
}

async function loginZendao({ username, password, emitLog }) {
  const response = await requestJson(`${ZENTAO_API_BASE}/tokens`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      account: username,
      password,
    }),
  });

  const tokenCandidates = [
    response?.token,
    response?.Token,
    response?.data?.token,
    response?.data?.Token,
    response?.data?.data?.token,
  ];
  const token = tokenCandidates.find((item) => typeof item === 'string' && item.trim());
  if (!token) {
    throw new Error(`禅道登录成功但未返回 token：${JSON.stringify(response)}`);
  }
  return token.trim();
}

async function fetchVersionByExecution({ executionId, versionId, token, emitLog }) {
  const data = await requestJson(`${ZENTAO_API_BASE}/executions/${executionId}/builds`, {
    headers: {
      Token: token,
      'Content-Type': 'application/json',
    },
  });
  const builds = Array.isArray(data?.builds) ? data.builds : [];
  const version = builds.find((item) => `${item?.id}` === `${versionId}`);
  if (!version) {
    throw new Error(`当前执行【${executionId}】下未找到版本【${versionId}】`);
  }
  return version;
}

async function fetchTestTask({ productId, taskId, token, emitLog }) {
  const data = await requestJson(buildUrl(`${ZENTAO_API_BASE}/testtasks`, { product: productId }), {
    headers: {
      Token: token,
      'Content-Type': 'application/json',
    },
  });

  const taskList = Array.isArray(data?.testtasks)
    ? data.testtasks
    : Array.isArray(data?.data?.testtasks)
      ? data.data.testtasks
      : [];

  const task = taskList.find((item) => `${item?.id}` === `${taskId}`);
  if (!task) {
    throw new Error(`参数错误：当前产品下未找到测试单【${taskId}】`);
  }
  return task;
}

async function streamJsonArrayItems(response, targetKey, onItem) {
  if (!response.body) {
    throw new Error('当前响应不支持流式读取');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  const targetToken = `"${targetKey}"`;

  let searchBuffer = '';
  let foundArrayStart = false;
  let arrayEnded = false;
  let objectBuffer = '';
  let braceDepth = 0;
  let inString = false;
  let escaping = false;

  function processArrayText(text) {
    for (let index = 0; index < text.length; index += 1) {
      const char = text[index];

      if (arrayEnded) {
        return;
      }

      if (braceDepth === 0) {
        if (char === '{') {
          objectBuffer = '{';
          braceDepth = 1;
          inString = false;
          escaping = false;
          continue;
        }

        if (char === ']') {
          arrayEnded = true;
          return;
        }

        continue;
      }

      objectBuffer += char;

      if (escaping) {
        escaping = false;
        continue;
      }

      if (char === '\\') {
        escaping = true;
        continue;
      }

      if (char === '"') {
        inString = !inString;
        continue;
      }

      if (inString) {
        continue;
      }

      if (char === '{') {
        braceDepth += 1;
        continue;
      }

      if (char === '}') {
        braceDepth -= 1;
        if (braceDepth === 0) {
          onItem(JSON.parse(objectBuffer));
          objectBuffer = '';
        }
      }
    }
  }

  while (true) {
    const { done, value } = await reader.read();
    const chunk = done ? decoder.decode() : decoder.decode(value, { stream: true });

    if (!foundArrayStart) {
      searchBuffer += chunk;
      const keyIndex = searchBuffer.indexOf(targetToken);
      if (keyIndex !== -1) {
        const arrayStartIndex = searchBuffer.indexOf('[', keyIndex);
        if (arrayStartIndex !== -1) {
          foundArrayStart = true;
          processArrayText(searchBuffer.slice(arrayStartIndex + 1));
          searchBuffer = '';
        } else {
          searchBuffer = searchBuffer.slice(keyIndex);
        }
      } else if (searchBuffer.length > 256) {
        searchBuffer = searchBuffer.slice(-256);
      }
    } else {
      processArrayText(chunk);
    }

    if (done) break;
  }

  if (!foundArrayStart) {
    throw new Error(`未在响应中找到 ${targetKey} 数组`);
  }
}

async function collectBugInfo({
  productId,
  executionId,
  version,
  bugLimit,
  environments,
  token,
  emitLog,
}) {
  const url = buildUrl(`${ZENTAO_API_BASE}/products/${productId}/bugs`, {
    limit: bugLimit,
    status: 'all',
  });

  const bugMapping = Object.fromEntries(
    environments.map((environment) => [
      environment.name,
      {
        filter: {
          include: splitKeywords(environment.bugFilterKeyword),
          exclude: splitKeywords(environment.bugExcludeKeyword),
        },
        bugs: createSummaryBucket(),
        rawBugs: [],
        filterUnresolved: environment.filterBugWithoutSolution ? 1 : 0,
        bugRange: environment.bugRange,
      },
    ])
  );

  emitRunLog(emitLog, 'info', '开始解析禅道 BUG', `正在拉取禅道 BUG，统计上限 ${bugLimit} 条。`);
  const response = await fetch(url, {
    headers: {
      Token: token,
      'Content-Type': 'application/json',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  });

  if (!response.ok) {
    throw new Error((await response.text()) || `获取缺陷失败：${response.status}`);
  }

  let scannedBugCount = 0;
  const originBugList = [];

  await streamJsonArrayItems(response, 'bugs', (bug) => {
    scannedBugCount += 1;

    if (scannedBugCount === 1 || scannedBugCount % 50 === 0) {
      emitRunLog(
        emitLog,
        'info',
        '解析禅道 BUG 中',
        `已扫描 ${scannedBugCount} 条 BUG`,
        'zendao-scan-progress'
      );
    }

    const bugTitle = `${bug?.title ?? ''}`.toLowerCase();
    const bugResolution = `${bug?.resolution ?? ''}`.trim();
    const bugExecutionId = `${bug?.execution ?? ''}`;
    const openedBuild = `${bug?.openedBuild ?? ''}`;

    environments.forEach((environment) => {
      const envState = bugMapping[environment.name];
      if (!envState) return;

      if (environment.bugRange === 'version') {
        if (!version?.name || !openedBuild.includes(version.name)) {
          return;
        }
      } else if (bugExecutionId !== `${executionId}`) {
        return;
      }

      if (environment.filterBugWithoutSolution && bugResolution.length === 0) {
        return;
      }

      const includeKeywords = envState.filter.include;
      const excludeKeywords = envState.filter.exclude;

      const matchInclude = includeKeywords.some((name) => bugTitle.includes(name.toLowerCase()));
      const matchExclude = excludeKeywords.every((name) => !bugTitle.includes(name.toLowerCase()));

      if (!matchInclude || !matchExclude) {
        return;
      }

      appendBugSummary(envState.bugs, bug);
      envState.rawBugs.push(bug);
      originBugList.push(bug);
    });
  });

  emitRunLog(emitLog, 'success', '禅道 BUG 解析完成', `共扫描 ${scannedBugCount} 条，命中 ${originBugList.length} 条。`);

  return {
    bugMapping,
    originBugList,
    environmentBugRows: Object.fromEntries(
      Object.entries(bugMapping).map(([envName, value]) => [envName, value.rawBugs])
    ),
    scannedBugCount,
  };
}

export async function runZendaoCollection(payload, emitLog) {
  const form = payload?.form || {};
  const customFields = payload?.customFields || {};
  const environments = Array.isArray(payload?.environments)
    ? payload.environments.filter((item) => item?.enabled)
    : [];

  if (!form.zentaoUsername || !form.zentaoPassword) {
    throw new Error('请先填写禅道账号和密码');
  }
  if (!form.productId) {
    throw new Error('请先选择产品');
  }
  if (!form.executionId) {
    throw new Error('请先选择执行');
  }
  if (!form.testTaskId) {
    throw new Error('请先选择测试单');
  }
  if (environments.length === 0) {
    throw new Error('请至少启用一个环境后再执行禅道 Run');
  }

  const requiresVersion = environments.some((item) => item?.bugRange !== 'execution');
  if (requiresVersion && !form.buildId) {
    throw new Error('存在按版本统计的环境，请先选择所属执行版本');
  }

  const token = await loginZendao({
    username: form.zentaoUsername,
    password: form.zentaoPassword,
    emitLog,
  });

  const version = requiresVersion
    ? await fetchVersionByExecution({
      executionId: form.executionId,
      versionId: form.buildId,
      token,
      emitLog,
    })
    : null;

  const { bugMapping, scannedBugCount } = await collectBugInfo({
    productId: form.productId,
    executionId: form.executionId,
    version,
    bugLimit: customFields?.zendaoBugLimit || 5000,
    environments,
    token,
    emitLog,
  });

  const task = await fetchTestTask({
    productId: form.productId,
    taskId: form.testTaskId,
    token,
    emitLog,
  });

  const result = {
    bug: Object.fromEntries(
      Object.entries(bugMapping).map(([envName, value]) => [
        envName,
        {
          filter: value.filter,
          bugs: value.bugs,
          rows: value.rawBugs,
          filterUnresolved: value.filterUnresolved,
          bugRange: value.bugRange,
        },
      ])
    ),
    task,
    version,
    bug_json_file_path: '',
    bug_excel_file_paths: {},
    output_dir: '',
    scanned_bug_count: scannedBugCount,
  };

  latestZendaoRunResult = result;
  emitRunLog(emitLog, 'success', '禅道 BUG 解析完成', `已完成 BUG 统计，共扫描 ${scannedBugCount} 条。`);

  return result;
}

export function getLatestZendaoRunResult() {
  return latestZendaoRunResult;
}
