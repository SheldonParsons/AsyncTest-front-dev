function validDate(value) {
    const parsed = new Date(`${value}T00:00:00Z`);
    return (!Number.isNaN(parsed.valueOf()) &&
        parsed.toISOString().slice(0, 10) === value);
}
export function validReportDate(value) {
    const parts = value.trim().split(/\s*(?:~|～|至)\s*/);
    return (parts.length <= 2 &&
        parts.every((part) => /^\d{4}-\d{2}-\d{2}$/.test(part) && validDate(part)) &&
        (parts.length === 1 || parts[0] <= parts[1]));
}
function validUrl(value) {
    try {
        const url = new URL(value);
        return ["http:", "https:"].includes(url.protocol) && !!url.hostname;
    }
    catch {
        return false;
    }
}
export function collectReportIssues(state) {
    const issues = [];
    const add = (key, page, message, extra = {}) => issues.push({ key, page, message, ...extra });
    const enabled = state.environments.filter((env) => env.enabled);
    const required = {
        reporter: "报告人",
        reviewer: "复审人",
        zentaoUsername: "禅道账号",
        zentaoPassword: "禅道密码",
        productId: "产品",
        projectId: "项目",
        executionId: "执行",
        testTaskId: "测试单",
    };
    for (const [key, label] of Object.entries(required)) {
        if (!(key === "zentaoPassword" && (state.passwordConfigured || state.dataPolicy === "cached" || state.dataPolicy === "snapshot")) && !String(state.form[key] ?? "").trim())
            add(key, "basic", `请${key.endsWith("Id") ? "选择" : "填写"}${label}`);
    }
    if (enabled.some((env) => env.bugRange === "version") && !state.form.buildId)
        add("buildId", "basic", "按版本统计时，请选择所属执行版本");
    if (!enabled.length)
        add("environments", "environments", "请至少启用一个生成环境");
    const names = new Set();
    for (const env of enabled) {
        const extra = { environmentId: env.id };
        const name = env.name.trim();
        const outputName = name.replace(/[\\/:*?"<>|]+/g, "_").toLowerCase();
        if (!name)
            add(`env-${env.id}-name`, "environments", "请填写环境名称", extra);
        else if (names.has(outputName))
            add(`env-${env.id}-name`, "environments", "环境名称不能重复，以免覆盖报告文件", extra);
        names.add(outputName);
        for (const [key, label] of Object.entries({
            envUrl: "环境地址",
            gitlabUrl: "GitLab 地址",
        })) {
            const value = String(env[key] ?? "").trim();
            if (!validUrl(value))
                add(`env-${env.id}-${key}`, "environments", value
                    ? `${label}请使用完整的 http:// 或 https:// 地址`
                    : `请填写${label}`, extra);
        }
        for (const [key, label] of Object.entries({
            conclusion: "测试结论",
            projectRisk: "项目风险",
        })) {
            if (!String(env[key] ?? "").trim())
                add(`env-${env.id}-${key}`, "environments", `请填写${label}`, extra);
        }
        if (env.includeDate && !validReportDate(env.reportDate))
            add(`env-${env.id}-reportDate`, "environments", "请输入有效日期或日期范围，例如 2026-10-01 ~ 2026-10-13", extra);
    }
    if (state.importingLocal)
        add("source-import", "sources", "本地文件正在读取，请稍候");
    if (!state.amindFiles.length)
        add("amind", "sources", "请导入至少一个 amind 文件", { source: "amind" });
    else if (state.parsingAmind)
        add("amind", "sources", "用例文件正在解析，请稍候", { source: "amind" });
    else if (state.amindFiles.some((file) => !state.amindParseResults.some((result) => result.fileId === file.id && result.status === "success")))
        add("amind", "sources", "部分 amind 文件解析失败，请检查或移除后重试", {
            source: "amind",
        });
    if (!state.excelFile)
        add("excel", "sources", "请导入 Excel 任务分配表", { source: "excel" });
    else if (state.parsingExcel)
        add("excel", "sources", "任务分配表正在解析，请稍候", { source: "excel" });
    else if (state.excelParseResult?.fileId !== state.excelFile.id ||
        state.excelParseResult?.status !== "success")
        add("excel", "sources", "请检查 Excel 工作表与需求、模块、负责人列映射", {
            source: "excel",
        });
    else if (state.excelParseResult.rowFilter?.value === null)
        add("excel-row-filter", "sources", "请选择行筛选的匹配值，或清除此条件", {
            source: "excel",
        });
    else if (state.excelParseResult.rowCount === 0)
        add("excel-row-filter", "sources", "筛选后没有可参与计算的任务行，请调整或清除筛选条件", { source: "excel" });
    const fields = {
        qualityResult: "质检结果",
        secrecyLevel: "秘密级别",
        testTypes: "测试类型",
        actualResult: "实际结果",
    };
    for (const [key, label] of Object.entries(fields)) {
        if (!String(state.customFields[key] ?? "").trim())
            add(key, "review", `请填写${label}`);
    }
    return issues;
}
