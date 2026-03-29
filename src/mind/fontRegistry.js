const PLATFORM_DEFAULT_FONT_KEY = 'platform-default';
const PLATFORM_DEFAULT_MAC_LABEL = 'PingFang SC';
const PLATFORM_DEFAULT_WINDOWS_LABEL = 'Microsoft YaHei';

const REMOTE_FONT_DEFINITIONS = [
  {
    key: 'alibaba-puhuiti',
    label: '阿里巴巴普惠体',
    sample: '普惠',
    familyName: 'Alibaba PuHuiTi',
    aliases: [
      '阿里巴巴普惠体',
      'alibaba puhuiti',
      'alibabapuhuiti',
      'alibabapuhuiti355regular',
      'alibabapuhuiti385bold',
      'alibabapuhuiti-3-55-regular',
      'alibabapuhuiti-3-85-bold',
    ],
    faces: [
      {
        variant: 'regular',
        weight: 400,
        format: 'ttf',
        url: 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/fonts/desktop/AlibabaPuHuiTi-3-55-Regular.ttf',
      },
      {
        variant: 'bold',
        weight: 700,
        format: 'ttf',
        url: 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/fonts/desktop/AlibabaPuHuiTi-3-85-Bold.ttf',
      },
    ],
  },
  {
    key: 'source-han-serif',
    label: '思源宋体',
    sample: '宋体',
    familyName: 'Source Han Serif SC',
    aliases: [
      '思源宋体',
      'source han serif sc',
      'sourcehanserifsc',
      'sourcehanserifsc regular',
      'sourcehanserifsc bold',
      'sourcehanserifsc-regular',
      'sourcehanserifsc-bold',
    ],
    faces: [
      {
        variant: 'regular',
        weight: 400,
        format: 'otf',
        url: 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/fonts/desktop/SourceHanSerifSC-Regular.otf',
      },
      {
        variant: 'bold',
        weight: 700,
        format: 'otf',
        url: 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/fonts/desktop/SourceHanSerifSC-Bold.otf',
      },
    ],
  },
  {
    key: 'maru-sc',
    label: '狮尾圆体',
    sample: '圆体',
    familyName: '975 Maru SC',
    aliases: [
      '狮尾圆体',
      '975 maru sc',
      '975marusc',
      '975marusc regular',
      '975marusc bold',
      '975marusc-regular',
      '975marusc-bold',
    ],
    faces: [
      {
        variant: 'regular',
        weight: 400,
        format: 'ttf',
        url: 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/fonts/desktop/975MaruSC-Regular.ttf',
      },
      {
        variant: 'bold',
        weight: 700,
        format: 'ttf',
        url: 'https://asynctest.oss-cn-shenzhen.aliyuncs.com/core/fonts/desktop/975MaruSC-Bold.ttf',
      },
    ],
  },
];

function normalizeFontToken(value) {
  return String(value ?? '')
    .trim()
    .toLowerCase()
    .replace(/^['"]+|['"]+$/g, '')
    .replace(/\s+/g, ' ')
    .replace(/[_-]+/g, ' ')
    .replace(/\s*\([^)]*\)\s*/g, ' ')
    .trim();
}

function normalizeDenseFontToken(value) {
  return normalizeFontToken(value).replace(/[^a-z0-9\u4e00-\u9fff]+/g, '');
}

function collectFontCandidates(fontFamily) {
  const raw = String(fontFamily ?? '').trim();
  if (!raw) return [];
  const parts = raw.split(',').map((part) => part.trim()).filter(Boolean);
  const tokens = new Set();
  [raw, ...parts].forEach((part) => {
    const normalized = normalizeFontToken(part);
    const dense = normalizeDenseFontToken(part);
    if (normalized) tokens.add(normalized);
    if (dense) tokens.add(dense);
  });
  return Array.from(tokens);
}

function collectPrimaryFontCandidates(fontFamily) {
  const raw = String(fontFamily ?? '').trim();
  if (!raw) return [];
  const primary = raw.split(',').map((part) => part.trim()).filter(Boolean)[0] ?? raw;
  const normalized = normalizeFontToken(primary);
  const dense = normalizeDenseFontToken(primary);
  return [normalized, dense].filter(Boolean);
}

function buildPlatformDefaultAliases(platform) {
  return [
    platform === 'darwin' ? PLATFORM_DEFAULT_MAC_LABEL : PLATFORM_DEFAULT_WINDOWS_LABEL,
    platform === 'darwin' ? PLATFORM_DEFAULT_WINDOWS_LABEL : PLATFORM_DEFAULT_MAC_LABEL,
    'Helvetica Neue',
    'modern sans',
    'microsoft yahei',
    'pingfang sc',
    '微软雅黑',
    '苹方',
  ];
}

export function getMindPlatformDefaultLabel(platform) {
  return platform === 'darwin' ? PLATFORM_DEFAULT_MAC_LABEL : PLATFORM_DEFAULT_WINDOWS_LABEL;
}

export function getMindPlatformDefaultFontFamily(platform) {
  return platform === 'darwin'
    ? '"PingFang SC", "Microsoft YaHei", sans-serif'
    : '"Microsoft YaHei", "PingFang SC", sans-serif';
}

export function getMindFontDefinitions(platform) {
  const platformDefault = {
    key: PLATFORM_DEFAULT_FONT_KEY,
    label: getMindPlatformDefaultLabel(platform),
    sample: platform === 'darwin' ? '苹方' : 'YaHei',
    familyName: getMindPlatformDefaultLabel(platform),
    fontFamily: getMindPlatformDefaultFontFamily(platform),
    downloadable: false,
    aliases: buildPlatformDefaultAliases(platform),
    faces: [],
  };
  return [
    platformDefault,
    ...REMOTE_FONT_DEFINITIONS.map((definition) => ({
      ...definition,
      downloadable: true,
      fontFamily: `"${definition.familyName}", ${getMindPlatformDefaultFontFamily(platform)}`,
    })),
  ];
}

export function getMindFontDefinitionByKey(key, platform) {
  return getMindFontDefinitions(platform).find((definition) => definition.key === key) ?? getMindFontDefinitions(platform)[0];
}

function matchesFontAliases(fontFamily, definition) {
  const candidates = collectFontCandidates(fontFamily);
  if (!candidates.length) return false;
  const aliases = [definition.familyName, definition.label, definition.sample, ...(definition.aliases ?? [])]
    .map((value) => [normalizeFontToken(value), normalizeDenseFontToken(value)])
    .flat()
    .filter(Boolean);
  return aliases.some((alias) => candidates.includes(alias));
}

export function resolveMindFontKey(fontFamily, platform) {
  const definitions = getMindFontDefinitions(platform);
  const primaryCandidates = collectPrimaryFontCandidates(fontFamily);
  const matchedByPrimary = definitions.find((definition) => {
    if (!primaryCandidates.length) return false;
    const aliases = [definition.familyName, definition.label, definition.sample, ...(definition.aliases ?? [])]
      .map((value) => [normalizeFontToken(value), normalizeDenseFontToken(value)])
      .flat()
      .filter(Boolean);
    return aliases.some((alias) => primaryCandidates.includes(alias));
  });
  if (matchedByPrimary) return matchedByPrimary.key;
  const matched = definitions.find((definition) => matchesFontAliases(fontFamily, definition));
  return matched?.key ?? PLATFORM_DEFAULT_FONT_KEY;
}

export function normalizeMindFontFamily(fontFamily, platform, readyRemoteKeys) {
  const definitions = getMindFontDefinitions(platform);
  const resolvedKey = resolveMindFontKey(fontFamily, platform);
  const resolvedDefinition = definitions.find((definition) => definition.key === resolvedKey) ?? definitions[0];
  const readyKeySet = readyRemoteKeys instanceof Set ? readyRemoteKeys : new Set(Array.isArray(readyRemoteKeys) ? readyRemoteKeys : []);
  if (resolvedDefinition.downloadable && !readyKeySet.has(resolvedDefinition.key)) {
    return {
      key: PLATFORM_DEFAULT_FONT_KEY,
      fontFamily: definitions[0].fontFamily,
    };
  }
  return {
    key: resolvedDefinition.key,
    fontFamily: resolvedDefinition.fontFamily,
  };
}

export { PLATFORM_DEFAULT_FONT_KEY as MIND_PLATFORM_DEFAULT_FONT_KEY };
