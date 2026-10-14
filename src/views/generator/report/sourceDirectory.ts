type ReportCall = (name: string, args?: Record<string, unknown>) => Promise<any>;
type DirectoryEntry = { name: string; type: string; entryHandle: string };

/** Import one directory using the same persistent sources as desktop and MCP. */
export async function importReportSourceDirectory(options: {
  folderUrl: string;
  call: ReportCall;
  mutate: ReportCall;
  progress: (message: string) => void;
  disposed: () => boolean;
}) {
  const { call, mutate, progress, disposed } = options;
  const folderUrl = options.folderUrl.trim();
  let url: URL;
  try { url = new URL(folderUrl); } catch { throw new Error('请输入完整的 AsyncTest 文件目录地址'); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('请输入以 http:// 或 https:// 开头的目录地址');

  progress('正在读取目录…');
  const entries: DirectoryEntry[] = [];
  let cursor: string | undefined;
  do {
    const result = await call('report_list_source_entries', { folderUrl, limit: 100, ...(cursor ? { cursor } : {}) });
    entries.push(...result.data.items);
    cursor = result.data.nextCursor || undefined;
    if (disposed()) return;
  } while (cursor);
  const supported = entries.filter(entry => entry.type === 'file' && /\.(amind|xlsx)$/i.test(entry.name));
  const skipped = entries.length - supported.length;
  if (!supported.length) throw new Error('当前目录没有可导入的 .amind 或 .xlsx 文件，请检查地址；不会读取子目录');

  progress(`正在下载并解析 ${supported.length} 份文件…`);
  const started = await mutate('report_import_sources', {
    sources: supported.map(entry => ({ entryHandle: entry.entryHandle })),
    allowPartial: false,
  });
  if (!started.operationId) throw new Error(started.summary || '未能开始目录导入');
  let afterEvent = 0;
  while (!disposed()) {
    const result = await call('report_get_operation', { operationId: started.operationId, afterEvent });
    for (const event of result.data.events || []) { progress(event.message); afterEvent = event.sequence; }
    if (result.status === 'completed') {
      const context = await call('report_get_context', { workspaceId: result.workspaceId || result.data.workspaceId });
      const importedIds = new Set<string>([...result.data.sourceIds, ...result.data.alreadyAttached]);
      const imported = context.data.sources.filter((source: any) => importedIds.has(source.id));
      const assignments = imported.filter((source: any) => source.role === 'assignment');
      // Multiple candidates stay available without guessing which table to use.
      if (assignments.length === 1 && context.data.activeAssignmentId !== assignments[0].id) {
        await mutate('report_update_sources', { operations: [{ op: 'activate_assignment', sourceId: assignments[0].id }] });
      }
      const cases = imported.filter((source: any) => source.role === 'amind').length;
      const existing = result.data.alreadyAttached.length;
      return {
        cases, assignments: assignments.length, existing, skipped,
        message: `已归类 ${cases} 份用例文件、${assignments.length} 份任务分配表。`
          + (existing ? `${existing} 份已存在，未重复添加。` : '')
          + (skipped ? `已跳过 ${skipped} 个其他文件或子目录。` : '')
          + (assignments.length > 1 ? '有多份任务表，请在候选中选择本次使用的一份。' : assignments.length === 1 ? '任务分配表已选用。' : ''),
      };
    }
    if (['failed', 'interrupted', 'cancelled'].includes(result.status)) {
      const failures = result.data.error?.details?.errors || [];
      const detail = failures.map((failure: any) => `${supported[failure.index]?.name || '文件'}：${failure.message}`).join('；');
      throw new Error([result.data.summary || '目录导入未完成', detail].filter(Boolean).join('。'));
    }
    await new Promise(resolve => setTimeout(resolve, result.data.suggestedPollMs || 1000));
  }
}
