import * as XLSX from "xlsx";
const EMPTY_MODULE_LABEL = "【空】";
function normalizeCellValue(value) {
    return `${value ?? ""}`.replace(/\r?\n/g, " ").replace(/\s+/g, " ").trim();
}
function normalizeMatchValue(value) {
    return normalizeCellValue(value).replace(/\s+/g, "").toLowerCase();
}
function toColumnLabel(index) {
    let value = index + 1;
    let result = "";
    while (value > 0) {
        const rest = (value - 1) % 26;
        result = String.fromCharCode(65 + rest) + result;
        value = Math.floor((value - 1) / 26);
    }
    return result;
}
function buildColumns(headers) {
    return headers.map((header, index) => ({
        value: `${index}`,
        header,
        label: `${header || "未命名列"}（${toColumnLabel(index)}列）`,
    }));
}
function sortColumnOptions(columns, keyword) {
    const exact = [];
    const includes = [];
    const others = [];
    const normalizedKeyword = normalizeMatchValue(keyword);
    columns.forEach((column) => {
        const normalizedHeader = normalizeMatchValue(column.header);
        if (!normalizedHeader) {
            others.push(column);
            return;
        }
        if (normalizedHeader === normalizedKeyword) {
            exact.push(column);
            return;
        }
        if (normalizedHeader.includes(normalizedKeyword)) {
            includes.push(column);
            return;
        }
        others.push(column);
    });
    return [...exact, ...includes, ...others].map((column) => ({
        value: column.value,
        label: column.label,
    }));
}
function pickDefaultColumn(columns, keyword) {
    const normalizedKeyword = normalizeMatchValue(keyword);
    const exactMatched = columns.find((column) => normalizeMatchValue(column.header) === normalizedKeyword);
    if (exactMatched)
        return exactMatched.value;
    const includesMatched = columns.find((column) => normalizeMatchValue(column.header).includes(normalizedKeyword));
    return includesMatched?.value ?? "";
}
function buildPreviewRows(rows) {
    const groupedRows = Array.from(rows
        .reduce((accumulator, row) => {
        const groupKey = row.module || "__EMPTY_MODULE__";
        const currentGroup = accumulator.get(groupKey) || [];
        currentGroup.push(row);
        accumulator.set(groupKey, currentGroup);
        return accumulator;
    }, new Map())
        .values()).flat();
    const previewRows = groupedRows.map((row, index) => ({
        id: `${index}`,
        ...row,
        showModule: true,
        showRequirement: true,
        showOwner: true,
        moduleRowSpan: 1,
        requirementRowSpan: 1,
        ownerRowSpan: 1,
    }));
    const mergeByKey = (key, spanKey, showKey) => {
        let startIndex = 0;
        while (startIndex < previewRows.length) {
            const currentValue = previewRows[startIndex][key];
            let endIndex = startIndex + 1;
            while (endIndex < previewRows.length &&
                previewRows[endIndex][key] === currentValue) {
                endIndex += 1;
            }
            previewRows[startIndex][spanKey] = endIndex - startIndex;
            for (let index = startIndex + 1; index < endIndex; index += 1) {
                previewRows[index][showKey] = false;
                previewRows[index][spanKey] = 0;
            }
            startIndex = endIndex;
        }
    };
    mergeByKey("module", "moduleRowSpan", "showModule");
    mergeByKey("requirement", "requirementRowSpan", "showRequirement");
    mergeByKey("owner", "ownerRowSpan", "showOwner");
    return previewRows;
}
function resolveSheet(workbook, sheetName) {
    const selectedSheet = sheetName && workbook.sheets[sheetName]
        ? sheetName
        : (workbook.sheetOptions[0]?.value ?? "");
    const sheet = workbook.sheets[selectedSheet];
    if (!sheet) {
        throw new Error("Excel 中不存在可解析的 Sheet");
    }
    return {
        selectedSheet,
        sheet,
    };
}
export function loadExcelWorkbookBytes(fileBuffer) {
    const workbook = XLSX.read(fileBuffer, { type: "array" });
    const sheetNames = Array.isArray(workbook.SheetNames)
        ? workbook.SheetNames.filter((item) => !!item)
        : [];
    if (!sheetNames.length) {
        throw new Error("Excel 中不存在可解析的 Sheet");
    }
    const sheets = sheetNames.reduce((result, sheetName) => {
        const worksheet = workbook.Sheets[sheetName];
        const bounds = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');
        if ((bounds.e.r + 1) * (bounds.e.c + 1) > 5000000) throw new Error('工作表范围超过 500 万单元格，请缩小有效范围后导入');
        const sourceRows = (XLSX.utils.sheet_to_json(worksheet, {
            header: 1,
            range: { s: { r: 0, c: 0 }, e: bounds.e },
            defval: "",
            raw: false,
            blankrows: true,
        }) || []);
        const headerRowIndex = sourceRows.findIndex((row) => Array.isArray(row) && row.some((cell) => !!normalizeCellValue(cell)));
        if (headerRowIndex === -1) {
            result[sheetName] = {
                name: sheetName,
                headers: [],
                rows: [],
                columns: [],
            };
            return result;
        }
        const headerRow = sourceRows[headerRowIndex] ?? [];
        const headers = headerRow.map((cell) => normalizeCellValue(cell));
        const columns = buildColumns(headers);
        const rows = sourceRows.slice(headerRowIndex + 1).map((row) => columns.map((column) => {
            const index = Number(column.value);
            return normalizeCellValue(Array.isArray(row) ? row[index] : "");
        }));
        result[sheetName] = {
            name: sheetName,
            firstDataRow: headerRowIndex + 2,
            headers,
            rows,
            columns,
        };
        return result;
    }, {});
    return {
        sheetOptions: sheetNames.map((sheetName) => ({
            value: sheetName,
            label: sheetName,
        })),
        sheets,
    };
}
export function buildExcelParseResult(sourceFile, workbook, overrides) {
    const { selectedSheet, sheet } = resolveSheet(workbook, overrides?.sheetName);
    const requirementColumnOptions = sortColumnOptions(sheet.columns, "需求");
    const moduleColumnOptions = sortColumnOptions(sheet.columns, "模块");
    const ownerColumnOptions = sortColumnOptions(sheet.columns, "负责人");
    const rowFilter = overrides?.rowFilter
        ? {
            column: overrides.rowFilter.column,
            value: overrides.rowFilter.value === null
                ? null
                : normalizeCellValue(overrides.rowFilter.value),
        }
        : null;
    if (rowFilter &&
        !sheet.columns.some((column) => column.value === rowFilter.column)) {
        throw new Error("筛选列不存在，请重新选择工作表和筛选列");
    }
    const filterValues = rowFilter
        ? Array.from(new Set(sheet.rows.map((row) => normalizeCellValue(row[Number(rowFilter.column)]))))
        : [];
    const filterValueOptions = filterValues.map((value) => ({
        value: JSON.stringify(value),
        label: value === "" ? "（空值）" : value,
    }));
    if (rowFilter?.value !== null &&
        rowFilter?.value !== undefined &&
        !filterValues.includes(rowFilter.value)) {
        filterValueOptions.push({
            value: JSON.stringify(rowFilter.value),
            label: `${rowFilter.value || "（空值）"}（无匹配行）`,
        });
    }
    const filterMetadata = {
        rowFilter,
        filterColumnOptions: sheet.columns.map(({ value, label }) => ({
            value,
            label,
        })),
        filterValueOptions,
        sourceRowCount: 0,
    };
    const columnMapping = {
        requirement: overrides?.columnMapping?.requirement &&
            sheet.columns.some((column) => column.value === overrides.columnMapping?.requirement)
            ? overrides.columnMapping.requirement
            : pickDefaultColumn(sheet.columns, "需求"),
        module: overrides?.columnMapping?.module &&
            sheet.columns.some((column) => column.value === overrides.columnMapping?.module)
            ? overrides.columnMapping.module
            : pickDefaultColumn(sheet.columns, "模块"),
        owner: overrides?.columnMapping?.owner &&
            sheet.columns.some((column) => column.value === overrides.columnMapping?.owner)
            ? overrides.columnMapping.owner
            : pickDefaultColumn(sheet.columns, "负责人"),
    };
    const missingFields = [
        !columnMapping.requirement ? "需求列" : "",
        !columnMapping.module ? "模块列" : "",
        !columnMapping.owner ? "负责人列" : "",
    ].filter((item) => !!item);
    if (!sheet.columns.length) {
        return {
            fileId: sourceFile.id,
            fileName: sourceFile.name,
            projectId: sourceFile.projectId,
            projectName: sourceFile.projectName,
            status: "error",
            errorMessage: "当前 Sheet 没有可识别的表头",
            sheetOptions: workbook.sheetOptions,
            selectedSheet,
            requirementColumnOptions,
            moduleColumnOptions,
            ownerColumnOptions,
            columnMapping,
            previewRows: [],
            uniqueOwners: [],
            uniqueModules: [],
            hasEmptyModule: false,
            excludedOwners: [],
            excludedModules: [],
            rowCount: 0,
            ...filterMetadata,
        };
    }
    if (missingFields.length) {
        return {
            fileId: sourceFile.id,
            fileName: sourceFile.name,
            projectId: sourceFile.projectId,
            projectName: sourceFile.projectName,
            status: "error",
            errorMessage: `未自动识别到${missingFields.join("、")}，请手动指定列名`,
            sheetOptions: workbook.sheetOptions,
            selectedSheet,
            requirementColumnOptions,
            moduleColumnOptions,
            ownerColumnOptions,
            columnMapping,
            previewRows: [],
            uniqueOwners: [],
            uniqueModules: [],
            hasEmptyModule: false,
            excludedOwners: overrides?.excludedOwners ?? [],
            excludedModules: overrides?.excludedModules ?? [],
            rowCount: 0,
            ...filterMetadata,
        };
    }
    const requirementIndex = Number(columnMapping.requirement);
    const moduleIndex = Number(columnMapping.module);
    const ownerIndex = Number(columnMapping.owner);
    const excludedModules = Array.from(new Set((overrides?.excludedModules ?? []).filter((item) => !!item)));
    const excludedOwners = Array.from(new Set((overrides?.excludedOwners ?? []).filter((item) => !!item)));
    // 先按原始列筛选，再计算模块、负责人和报告预览，所有消费方共享同一结果。
    const sourceRows = sheet.rows.map((cells, index) => Object.assign([...cells], { sourceRow: index + (sheet.firstDataRow || 2) })).filter((row) => [requirementIndex, moduleIndex, ownerIndex].some((index) => !!normalizeCellValue(row[index])));
    const rawRows = sourceRows
        .filter((row) => !rowFilter ||
        rowFilter.value === null ||
        normalizeCellValue(row[Number(rowFilter.column)]) === rowFilter.value)
        .map((row) => ({
        sourceRow: row.sourceRow,
        cells: [...row],
        module: normalizeCellValue(row[moduleIndex]),
        requirement: normalizeCellValue(row[requirementIndex]),
        owner: normalizeCellValue(row[ownerIndex]),
    }))
        .filter((row) => row.module || row.requirement || row.owner);
    if (rowFilter) {
        const counts = new Map();
        sourceRows.forEach(row => { const value = normalizeCellValue(row[Number(rowFilter.column)]); counts.set(value, (counts.get(value) || 0) + 1); });
        filterMetadata.filterValueOptions = Array.from(counts, ([value, count]) => ({ value: JSON.stringify(value), label: value === '' ? '（空值）' : value, count }));
    }
    const hasEmptyModule = rawRows.some((row) => !row.module);
    const rows = rawRows
        .map((row) => ({
        ...row,
        module: row.module || EMPTY_MODULE_LABEL,
    }))
        .filter((row) => !excludedModules.includes(row.module) &&
        !excludedOwners.includes(row.owner));
    return {
        fileId: sourceFile.id,
        fileName: sourceFile.name,
        projectId: sourceFile.projectId,
        projectName: sourceFile.projectName,
        status: "success",
        errorMessage: "",
        sheetOptions: workbook.sheetOptions,
        selectedSheet,
        requirementColumnOptions,
        moduleColumnOptions,
        ownerColumnOptions,
        columnMapping,
        previewRows: buildPreviewRows(rows),
        uniqueOwners: Array.from(new Set(rows.map((row) => row.owner).filter((item) => !!item))),
        uniqueModules: Array.from(new Set(rows
            .map((row) => row.module)
            .filter((item) => !!item && item !== EMPTY_MODULE_LABEL))),
        hasEmptyModule,
        excludedOwners,
        excludedModules,
        rowCount: rows.length,
        ...filterMetadata,
        sourceRowCount: sourceRows.length,
        matchedRowCount: rawRows.length,
        excludedRowCount: rawRows.length - rows.length,
    };
}
