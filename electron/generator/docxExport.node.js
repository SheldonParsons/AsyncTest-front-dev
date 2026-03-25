import path from 'node:path';
import { promises as fs } from 'fs';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import CFB from 'cfb';
import iconv from 'iconv-lite';

const OLE_PACKAGE_ICON_PATH = fileURLToPath(new URL('./assets/ole-package-icon.png', import.meta.url));
const OLE_EXCEL_ICON_PATH = fileURLToPath(new URL('./assets/ole-excel-icon.png', import.meta.url));
const OLE_OBJINFO_BUFFER = Buffer.from('400003000100', 'hex');
const BUG_RESOLUTION_MAPPING = {
  '': '未解决',
  bydesign: '设计如此',
  duplicate: '重复Bug',
  external: '外部原因',
  fixed: '已解决',
  notrepro: '无法重现',
  postponed: '延期处理',
  willnotfix: '不予解决',
  inside: '内部原因',
  setup: '配置问题',
  chargereq: '需求变更',
  tostory: '转为研发需求',
};

function xmlEscape(value) {
  return `${value ?? ''}`
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function sanitizeFileNamePart(value) {
  return `${value ?? ''}`.replace(/[\\/:*?"<>|]+/g, '_').trim() || '测试报告';
}

function formatDate(date) {
  const d = date instanceof Date ? date : new Date(date);
  if (Number.isNaN(d.getTime())) return '';
  const year = d.getFullYear();
  const month = `${d.getMonth() + 1}`.padStart(2, '0');
  const day = `${d.getDate()}`.padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function buildEnvironmentReportTitle(payload, environment) {
  const executionLabel = payload?.meta?.executionLabel || payload?.title || '测试执行';
  const envName = environment?.name || '环境';
  return `${executionLabel}版本-${envName}测试报告`;
}

function runText(text, options = {}) {
  const fontFamily = options.fontFamily || '微软雅黑';
  const fontXml = `<w:rFonts w:ascii="${xmlEscape(fontFamily)}" w:hAnsi="${xmlEscape(fontFamily)}" w:eastAsia="${xmlEscape(fontFamily)}" w:cs="${xmlEscape(fontFamily)}"/>`;
  const size = options.size ? `<w:sz w:val="${options.size}"/><w:szCs w:val="${options.size}"/>` : '<w:sz w:val="20"/><w:szCs w:val="20"/>';
  const bold = options.bold ? '<w:b/><w:bCs/>' : '';
  const lines = `${text ?? ''}`.split(/\r?\n/);
  const content = lines
    .map((line, index) => `${index > 0 ? '<w:br/>' : ''}<w:t xml:space="preserve">${xmlEscape(line)}</w:t>`)
    .join('');
  return `<w:r><w:rPr>${fontXml}${bold}${size}</w:rPr>${content}</w:r>`;
}

function paragraph(text, options = {}) {
  const align = options.align ? `<w:jc w:val="${options.align}"/>` : '';
  const spacing = options.spacingAfter || options.spacingBefore
    ? `<w:spacing${options.spacingBefore ? ` w:before="${options.spacingBefore}"` : ''}${options.spacingAfter ? ` w:after="${options.spacingAfter}"` : ''}/>`
    : '';
  return `<w:p><w:pPr>${align}${spacing}</w:pPr>${runText(text, options)}</w:p>`;
}

function attachmentObjectParagraph(attachment) {
  return `<w:p><w:r><w:rPr><w:rFonts w:hint="eastAsia" w:eastAsiaTheme="minorEastAsia"/><w:lang w:eastAsia="zh-CN"/></w:rPr><w:object><v:shape id="${attachment.shapeId}" o:spt="75" type="#_x0000_t75" style="height:60pt;width:60pt;" o:ole="t" filled="f" o:preferrelative="t" stroked="f" coordsize="21600,21600"><v:fill on="f" focussize="0,0"/><v:stroke on="f"/><v:imagedata r:id="${attachment.imageRelId}" o:title="oleimage"/><o:lock v:ext="edit" aspectratio="t"/><w10:wrap type="none"/><w10:anchorlock/></v:shape><o:OLEObject Type="Embed" ProgID="${attachment.progId}" ShapeID="${attachment.shapeId}" DrawAspect="Icon" ObjectID="${attachment.objectId}" r:id="${attachment.objectRelId}"><o:LockedField>false</o:LockedField></o:OLEObject></w:object></w:r></w:p>`;
}

function tableCell(content, options = {}) {
  const width = options.width ? `<w:tcW w:w="${options.width}" w:type="dxa"/>` : '';
  const gridSpan = options.gridSpan ? `<w:gridSpan w:val="${options.gridSpan}"/>` : '';
  const vMerge = options.vMerge === 'restart'
    ? '<w:vMerge w:val="restart"/>'
    : options.vMerge === 'continue'
      ? '<w:vMerge/>'
      : '';
  const tcBorders = options.hideRightBorder
    ? '<w:tcBorders><w:right w:val="nil"/></w:tcBorders>'
    : '';
  const cellParagraph = Array.isArray(content)
    ? content.join('')
    : paragraph(content, {
        bold: options.bold,
        size: options.size || 20,
        align: options.align,
      });
  return `<w:tc><w:tcPr>${width}${gridSpan}${vMerge}${tcBorders}</w:tcPr>${cellParagraph}</w:tc>`;
}

function tableRow(cells) {
  return `<w:tr>${cells.map((cell) => tableCell(cell.content, cell.options)).join('')}</w:tr>`;
}

function table(rows, columnWidths) {
  return `<w:tbl>
    <w:tblPr>
      <w:tblStyle w:val="TableGrid"/>
      <w:tblW w:w="9000" w:type="dxa"/>
      <w:tblLayout w:type="fixed"/>
      <w:tblBorders>
        <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        <w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        <w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        <w:insideH w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        <w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/>
      </w:tblBorders>
      <w:tblLook w:val="04A0" w:firstRow="1" w:firstColumn="1" w:lastRow="0" w:lastColumn="0" w:noHBand="0" w:noVBand="1"/>
    </w:tblPr>
    <w:tblGrid>${columnWidths.map((width) => `<w:gridCol w:w="${width}"/>`).join('')}</w:tblGrid>
    ${rows.map((row) => tableRow(row)).join('')}
  </w:tbl>`;
}

function mergedValueRow(label, value) {
  return [
    { content: label, options: { bold: false, width: 1500 } },
    { content: value || '-', options: { width: 7500, gridSpan: 3 } },
  ];
}

function resolveTestTime(payload, environment) {
  if (environment?.includeDate && `${environment?.reportDate || ''}`.trim()) {
    return `${environment.reportDate}`.trim();
  }

  if (environment?.kind === 'test') {
    const begin = payload?.testTask?.begin || payload?.zendao?.task?.begin || '';
    const end = payload?.testTask?.end || payload?.zendao?.task?.end || '';
    if (begin && end) return `${begin} 至 ${end}`;
    if (begin) return `${begin}`;
  }

  return formatDate(new Date());
}

function resolveBuildLabel(payload) {
  return payload?.meta?.buildLabel || `${payload?.meta?.executionLabel || payload?.title || '测试执行'}版本`;
}

function resolveOwners(payload) {
  return Array.isArray(payload?.excelResult?.uniqueOwners) && payload.excelResult.uniqueOwners.length
    ? payload.excelResult.uniqueOwners.join('、')
    : '-';
}

function resolveModules(payload) {
  return Array.isArray(payload?.excelResult?.uniqueModules) && payload.excelResult.uniqueModules.length
    ? payload.excelResult.uniqueModules.join('、')
    : '-';
}

function resolveProgressText(payload) {
  const modules = resolveModules(payload);
  return `${modules}\n上述所有模块，均已完成测试，测试进度100%`;
}

function resolveAmindCaseSummaryText(payload) {
  const amindResults = Array.isArray(payload?.amindResults) ? payload.amindResults : [];
  const totalCaseCount = amindResults.reduce((sum, item) => sum + (Number(item?.totalCaseCount) || 0), 0);
  const passedCaseCount = amindResults.reduce((sum, item) => sum + (Number(item?.passedCaseCount) || 0), 0);
  const failedCaseCount = amindResults.reduce((sum, item) => sum + (Number(item?.failedCaseCount) || 0), 0);
  const pendingCaseCount = amindResults.reduce((sum, item) => sum + (Number(item?.pendingCaseCount) || 0), 0);
  const reusedCaseCount = amindResults.reduce((sum, item) => sum + (Number(item?.reusedCaseCount) || 0), 0);
  const passRate = totalCaseCount > 0 ? ((passedCaseCount / totalCaseCount) * 100).toFixed(1) : '0.0';

  return `本次版本设计了 ${totalCaseCount} 条用例，通过了 ${passedCaseCount} 个用例，失败了 ${failedCaseCount} 个用例，未执行 ${pendingCaseCount} 个用例，通过率 ${passRate}%，其中复用了${reusedCaseCount}个用例`;
}

function buildOle10NativeBuffer(fileName, data) {
  const nativeFlag = Buffer.from([0x02, 0x00]);
  const safeFileName = fileName || 'attachment.zip';
  const sourcePath = `/attachments/${safeFileName}`;
  const fileNameBuffer = iconv.encode(`${safeFileName}\0`, 'gbk');
  const sourcePathBuffer = iconv.encode(`${sourcePath}\0`, 'gbk');
  const unknownValue = Buffer.alloc(4);
  unknownValue.writeUInt32LE(0x00030000, 0);
  const pathSize = Buffer.alloc(4);
  pathSize.writeUInt32LE(sourcePathBuffer.length, 0);
  const dataSize = Buffer.alloc(4);
  dataSize.writeUInt32LE(data.length, 0);
  const tail = Buffer.alloc(4);
  const body = Buffer.concat([
    nativeFlag,
    fileNameBuffer,
    sourcePathBuffer,
    unknownValue,
    pathSize,
    sourcePathBuffer,
    dataSize,
    data,
    tail,
  ]);
  const totalSize = Buffer.alloc(4);
  totalSize.writeUInt32LE(body.length, 0);
  return Buffer.concat([totalSize, body]);
}

function buildEmbeddedPackageBuffer(fileName, data) {
  const cfb = CFB.utils.cfb_new();
  CFB.utils.cfb_add(cfb, '/\u0001Ole10Native', buildOle10NativeBuffer(fileName, data), { unsafe: true });
  CFB.utils.cfb_add(cfb, '/\u0003ObjInfo', OLE_OBJINFO_BUFFER, { unsafe: true });
  return Buffer.from(CFB.write(cfb, { type: 'buffer' }));
}

function buildEmbeddedExcelBuffer(data) {
  const cfb = CFB.utils.cfb_new();
  CFB.utils.cfb_add(cfb, '/package', data, { unsafe: true });
  CFB.utils.cfb_add(cfb, '/\u0003ObjInfo', OLE_OBJINFO_BUFFER, { unsafe: true });
  return Buffer.from(CFB.write(cfb, { type: 'buffer' }));
}

function buildResolutionSummaryText(resolutionMapping = {}) {
  const parts = Object.entries(BUG_RESOLUTION_MAPPING)
    .map(([key, label]) => {
      const count = Number(resolutionMapping?.[key] || 0);
      return count > 0 ? `${label}${count}个` : '';
    })
    .filter(Boolean);

  return parts.join('，');
}

function buildSeveritySummaryText(severityMapping = {}) {
  const parts = [
    ['3', '三级问题'],
    ['2', '二级问题'],
    ['1', '一级问题'],
  ]
    .map(([key, label]) => {
      const count = Number(severityMapping?.[key] || 0);
      return count > 0 ? `${label}${count}个` : '';
    })
    .filter(Boolean);

  return parts.join('，');
}

function buildDefectSummaryText(payload, environment) {
  const envName = environment?.name || '';
  const bugState = payload?.zendao?.bug?.[envName];
  const bugSummary = bugState?.bugs || {};
  const total = Number(bugSummary?.total || 0);
  const buildLabel = resolveBuildLabel(payload);
  const severityText = buildSeveritySummaryText(bugSummary?.severity_mapping || {});
  const resolutionText = buildResolutionSummaryText(bugSummary?.resolution_mapping || {});
  const willNotFixTitles = Object.values(bugSummary?.willnotfix_bugs || {}).filter(Boolean);

  const firstLineParts = [`【${envName}】${buildLabel}共发现${total}个问题`];
  if (severityText) {
    firstLineParts.push(`其中${severityText}`);
  }
  if (resolutionText) {
    firstLineParts.push(resolutionText);
  }

  let text = firstLineParts.join('，');
  if (willNotFixTitles.length) {
    text += `\n其中不予解决的BUG如下：\n${willNotFixTitles.join('\n')}`;
  }
  return text;
}

function buildDetailRows(payload) {
  const previewRows = Array.isArray(payload?.excelResult?.previewRows) ? payload.excelResult.previewRows : [];
  if (!previewRows.length) {
    return [[
      { content: '详细功能', options: { width: 1500 } },
      { content: '-', options: { width: 3000 } },
      { content: '-', options: { width: 4500, gridSpan: 2 } },
    ]];
  }

  return previewRows.map((row, index) => [
    {
      content: index === 0 ? '详细功能' : '',
      options: {
        width: 1500,
        vMerge: index === 0 ? 'restart' : 'continue',
      },
    },
    {
      content: row.showModule ? row.module || '-' : '',
      options: {
        width: 3000,
        vMerge: row.showModule ? (row.moduleRowSpan > 1 ? 'restart' : undefined) : 'continue',
      },
    },
    {
      content: row.showRequirement ? row.requirement || '-' : '',
      options: {
        width: 4500,
        gridSpan: 2,
        vMerge: row.showRequirement ? (row.requirementRowSpan > 1 ? 'restart' : undefined) : 'continue',
      },
    },
  ]);
}

function buildBodyTable(payload, environment, attachments) {
  const rows = [
    [
      { content: '项目名称', options: { bold: true, width: 1500 } },
      { content: payload?.meta?.projectLabel || '-', options: { width: 3000 } },
      { content: '测试时间', options: { bold: true, width: 1500 } },
      { content: resolveTestTime(payload, environment), options: { width: 3000 } },
    ],
    [
      { content: '测试质检结果', options: { bold: true, width: 1500 } },
      { content: payload?.customFields?.qualityResult || '-', options: { width: 7500, gridSpan: 3 } },
    ],
    [
      { content: '测试版本', options: { bold: true, width: 9000, gridSpan: 4 } },
    ],
    mergedValueRow('产品版本号', resolveBuildLabel(payload)),
    mergedValueRow('应用系统访问地址', environment?.envUrl || '-'),
    mergedValueRow('Gitlab地址', environment?.gitlabUrl || '-'),
    mergedValueRow('测试人员', resolveOwners(payload)),
    ...buildDetailRows(payload),
    [
      { content: '测试类型', options: { width: 1500 } },
      { content: payload?.customFields?.testTypes || '-', options: { width: 7500, gridSpan: 3 } },
    ],
    [
      { content: '测试结果', options: { bold: true, width: 9000, gridSpan: 4 } },
    ],
    [
      { content: '实际结果', options: { width: 1500 } },
      { content: payload?.customFields?.actualResult || '-', options: { width: 7500, gridSpan: 3 } },
    ],
    [
      { content: '测试结论', options: { width: 1500 } },
      { content: environment?.conclusion || '-', options: { width: 7500, gridSpan: 3 } },
    ],
    [
      { content: '项目风险', options: { width: 1500 } },
      { content: environment?.projectRisk || '-', options: { width: 7500, gridSpan: 3 } },
    ],
    [
      { content: '详细内容', options: { bold: true, width: 9000, gridSpan: 4 } },
    ],
    [
      { content: '测试进度', options: { width: 1500 } },
      { content: resolveProgressText(payload), options: { width: 7500, gridSpan: 3 } },
    ],
    [
      { content: '测试用例', options: { width: 1500 } },
      {
        content: attachments?.testCase
          ? [
              paragraph(resolveAmindCaseSummaryText(payload), { size: 20 }),
              attachmentObjectParagraph(attachments.testCase),
            ]
          : resolveAmindCaseSummaryText(payload),
        options: { width: 7500, gridSpan: 3 },
      },
    ],
    [
      { content: '缺陷汇总', options: { width: 1500 } },
      {
        content: attachments?.bugExcel
          ? [
              paragraph(buildDefectSummaryText(payload, environment), { size: 20 }),
              attachmentObjectParagraph(attachments.bugExcel),
            ]
          : buildDefectSummaryText(payload, environment),
        options: { width: 7500, gridSpan: 3 },
      },
    ],
    [
      { content: '报告人', options: { bold: true, width: 1500 } },
      { content: payload?.meta?.reporter || '-', options: { width: 7500, gridSpan: 3 } },
    ],
    [
      { content: '复审人', options: { bold: true, width: 1500 } },
      { content: payload?.meta?.reviewer || '-', options: { width: 7500, gridSpan: 3 } },
    ],
  ];

  return table(rows, [1500, 3000, 1500, 3000]);
}

function buildDocumentXml(payload, environment, attachments) {
  const sections = [
    paragraph(payload?.customFields?.secrecyLevel || '', {
      fontFamily: '微软雅黑',
      size: 20,
      spacingAfter: 160,
    }),
    paragraph(buildEnvironmentReportTitle(payload, environment), {
      fontFamily: '微软雅黑',
      size: 26,
      bold: true,
      align: 'center',
      spacingAfter: 200,
    }),
    buildBodyTable(payload, environment, attachments),
    paragraph('', { spacingAfter: 1 }),
  ];

  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:document xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas"
    xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006"
    xmlns:o="urn:schemas-microsoft-com:office:office"
    xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"
    xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"
    xmlns:v="urn:schemas-microsoft-com:vml"
    xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing"
    xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing"
    xmlns:w10="urn:schemas-microsoft-com:office:word"
    xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"
    xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml"
    xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml"
    xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup"
    xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk"
    xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml"
    xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape"
    mc:Ignorable="w14 w15 wp14">
    <w:body>
      ${sections.join('')}
      <w:sectPr>
        <w:pgSz w:w="11906" w:h="16838"/>
        <w:pgMar w:top="1440" w:right="1440" w:bottom="1440" w:left="1440" w:header="708" w:footer="708" w:gutter="0"/>
      </w:sectPr>
    </w:body>
  </w:document>`;
}

function buildContentTypesXml(hasAttachment) {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
    ${hasAttachment ? '<Default Extension="bin" ContentType="application/vnd.openxmlformats-officedocument.oleObject"/><Default Extension="png" ContentType="image/png"/>' : ''}
    <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
    <Default Extension="xml" ContentType="application/xml"/>
    <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    <Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/>
    <Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>
    <Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>
  </Types>`;
}

function buildRootRelsXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    <Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/>
    <Relationship Id="rId3" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/extended-properties" Target="docProps/app.xml"/>
  </Relationships>`;
}

function buildDocumentRelsXml(attachments = []) {
  const attachmentRels = attachments
    .flatMap((attachment) => [
      `<Relationship Id="${attachment.imageRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/${attachment.imageName}"/>`,
      `<Relationship Id="${attachment.objectRelId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/oleObject" Target="embeddings/${attachment.embeddingName}"/>`,
    ])
    .join('');
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
    <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>
    ${attachmentRels}
  </Relationships>`;
}

function buildStylesXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main">
    <w:docDefaults>
      <w:rPrDefault>
        <w:rPr>
          <w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑" w:cs="微软雅黑"/>
          <w:sz w:val="20"/>
          <w:szCs w:val="20"/>
        </w:rPr>
      </w:rPrDefault>
    </w:docDefaults>
    <w:style w:type="paragraph" w:default="1" w:styleId="Normal">
      <w:name w:val="Normal"/>
      <w:qFormat/>
      <w:rPr>
        <w:rFonts w:ascii="微软雅黑" w:hAnsi="微软雅黑" w:eastAsia="微软雅黑" w:cs="微软雅黑"/>
        <w:sz w:val="20"/>
        <w:szCs w:val="20"/>
      </w:rPr>
    </w:style>
    <w:style w:type="table" w:default="1" w:styleId="TableGrid">
      <w:name w:val="Table Grid"/>
      <w:tblPr>
        <w:tblBorders>
          <w:top w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:left w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:bottom w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:right w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideH w:val="single" w:sz="8" w:space="0" w:color="000000"/>
          <w:insideV w:val="single" w:sz="8" w:space="0" w:color="000000"/>
        </w:tblBorders>
      </w:tblPr>
    </w:style>
  </w:styles>`;
}

function buildCoreXml(title) {
  const now = new Date().toISOString();
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties"
    xmlns:dc="http://purl.org/dc/elements/1.1/"
    xmlns:dcterms="http://purl.org/dc/terms/"
    xmlns:dcmitype="http://purl.org/dc/dcmitype/"
    xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
    <dc:title>${xmlEscape(title)}</dc:title>
    <dc:creator>AsyncTest Generator</dc:creator>
    <cp:lastModifiedBy>AsyncTest Generator</cp:lastModifiedBy>
    <dcterms:created xsi:type="dcterms:W3CDTF">${now}</dcterms:created>
    <dcterms:modified xsi:type="dcterms:W3CDTF">${now}</dcterms:modified>
  </cp:coreProperties>`;
}

function buildAppXml() {
  return `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
  <Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"
    xmlns:vt="http://schemas.openxmlformats.org/officeDocument/2006/docPropsVTypes">
    <Application>AsyncTest Generator</Application>
  </Properties>`;
}

export async function writeReportDocx(filePath, payload, environment, attachments) {
  const title = buildEnvironmentReportTitle(payload, environment);
  const zip = new JSZip();
  const activeAttachments = Object.values(attachments || {}).filter((item) => item?.buffer?.length);
  const hasAttachment = activeAttachments.length > 0;
  zip.file('[Content_Types].xml', buildContentTypesXml(hasAttachment));
  zip.folder('_rels')?.file('.rels', buildRootRelsXml());
  zip.folder('word')?.file('document.xml', buildDocumentXml(payload, environment, attachments));
  zip.folder('word')?.folder('_rels')?.file('document.xml.rels', buildDocumentRelsXml(activeAttachments));
  zip.folder('word')?.file('styles.xml', buildStylesXml());
  if (hasAttachment) {
    for (const attachment of activeAttachments) {
      const iconBytes = await fs.readFile(attachment.iconPath);
      zip.folder('word')?.folder('media')?.file(attachment.imageName, iconBytes);
      const embeddingBuffer =
        attachment.kind === 'excel'
          ? buildEmbeddedExcelBuffer(attachment.buffer)
          : buildEmbeddedPackageBuffer(attachment.fileName, attachment.buffer);
      zip.folder('word')?.folder('embeddings')?.file(attachment.embeddingName, embeddingBuffer);
    }
  }
  zip.folder('docProps')?.file('core.xml', buildCoreXml(title));
  zip.folder('docProps')?.file('app.xml', buildAppXml());

  const content = await zip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(filePath, content);
  return { path: filePath, title };
}

export function buildEnvironmentReportDocxName(payload, environment) {
  return `${sanitizeFileNamePart(buildEnvironmentReportTitle(payload, environment))}.docx`;
}

export function buildDefaultReportZipName(payload) {
  const executionLabel = payload?.meta?.executionLabel || payload?.title || '测试报告';
  return `${sanitizeFileNamePart(`${executionLabel}版本-测试报告`)}.zip`;
}

async function buildAmindAttachmentZip(payload, tempDir) {
  const sourceFiles = Array.isArray(payload?.amindFiles)
    ? payload.amindFiles.filter((item) => item?.exportTempPath)
    : [];
  if (!sourceFiles.length) {
    return null;
  }

  const attachmentZip = new JSZip();
  const attachmentFolder = attachmentZip.folder('测试用例');
  for (let index = 0; index < sourceFiles.length; index += 1) {
    const file = sourceFiles[index];
    const filePath = file.exportTempPath;
    const archiveName = sanitizeFileNamePart(path.basename(filePath || file.name || `amind-${index + 1}`));
    const bytes = await fs.readFile(filePath);
    attachmentFolder?.file(archiveName, bytes);
  }

  const attachmentDir = path.join(tempDir, 'attachments');
  await fs.mkdir(attachmentDir, { recursive: true });
  const fileName = '测试用例.zip';
  const filePath = path.join(attachmentDir, fileName);
  const buffer = await attachmentZip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(filePath, buffer);

  return {
    fileName,
    filePath,
    buffer,
  };
}

async function buildBugExcelAttachment(payload, environment) {
  const envName = environment?.name || '';
  const filePath = payload?.zendao?.bug_excel_file_paths?.[envName];
  if (!filePath) {
    return null;
  }

  const buffer = await fs.readFile(filePath);
  return {
    fileName: path.basename(filePath),
    filePath,
    buffer,
  };
}

function buildAttachmentDescriptor(type, attachment) {
  if (!attachment?.buffer?.length) {
    return null;
  }

  if (type === 'excel') {
    return {
      ...attachment,
      kind: 'excel',
      progId: 'Excel.Sheet.12',
      objectRelId: 'rId6',
      imageRelId: 'rId7',
      shapeId: '_x0000_i1027',
      objectId: '_1468075726',
      embeddingName: 'oleObject2.bin',
      imageName: 'image2.png',
      iconPath: OLE_EXCEL_ICON_PATH,
    };
  }

  return {
    ...attachment,
    kind: 'package',
    progId: 'Package',
    objectRelId: 'rId4',
    imageRelId: 'rId5',
    shapeId: '_x0000_i1026',
    objectId: '_1468075725',
    embeddingName: 'oleObject1.bin',
    imageName: 'image1.png',
    iconPath: OLE_PACKAGE_ICON_PATH,
  };
}

export async function exportEnvironmentReportPackage({ tempDir, payload }) {
  const docxDir = path.join(tempDir, 'docx');
  await fs.mkdir(docxDir, { recursive: true });
  const testCaseAttachment = buildAttachmentDescriptor('package', await buildAmindAttachmentZip(payload, tempDir));

  const enabledEnvironments = Array.isArray(payload?.environments) ? payload.environments : [];
  const docxFiles = [];

  for (const environment of enabledEnvironments) {
    const fileName = buildEnvironmentReportDocxName(payload, environment);
    const filePath = path.join(docxDir, fileName);
    const bugExcelAttachment = buildAttachmentDescriptor('excel', await buildBugExcelAttachment(payload, environment));
    await writeReportDocx(filePath, payload, environment, {
      testCase: testCaseAttachment,
      bugExcel: bugExcelAttachment,
    });
    docxFiles.push({ envName: environment?.name || '', fileName, filePath });
  }

  const zipFileName = buildDefaultReportZipName(payload);
  const zipFilePath = path.join(tempDir, zipFileName);
  const packageZip = new JSZip();

  for (const docxFile of docxFiles) {
    const bytes = await fs.readFile(docxFile.filePath);
    packageZip.file(docxFile.fileName, bytes);
  }

  const zipContent = await packageZip.generateAsync({ type: 'nodebuffer' });
  await fs.writeFile(zipFilePath, zipContent);

  return {
    zipFileName,
    zipFilePath,
    docxFiles,
    attachmentZipPath: testCaseAttachment?.filePath || '',
  };
}
