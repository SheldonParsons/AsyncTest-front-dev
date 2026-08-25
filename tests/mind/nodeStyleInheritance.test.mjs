import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'esbuild';
import JSZip from 'jszip';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const entryPath = path.join(projectRoot, 'src/mind/vue_views/main/nodeStyles.ts');

const result = await build({
  entryPoints: [entryPath],
  bundle: true,
  format: 'esm',
  platform: 'node',
  write: false,
  plugins: [
    {
      name: 'resolve-src-alias',
      setup(buildApi) {
        buildApi.onResolve({ filter: /^@\// }, (args) => {
          const sourcePath = path.join(projectRoot, 'src', args.path.slice(2));
          const resolvedPath = [sourcePath, `${sourcePath}.ts`, `${sourcePath}.js`].find((candidate) => fs.existsSync(candidate));
          return resolvedPath ? { path: resolvedPath } : null;
        });
      },
    },
    {
      name: 'stub-vue',
      setup(buildApi) {
        buildApi.onResolve({ filter: /^vue$/ }, () => ({ path: 'vue', namespace: 'test-stub' }));
        buildApi.onLoad({ filter: /.*/, namespace: 'test-stub' }, () => ({
          contents: 'export const toRaw = (value) => value;',
          loader: 'js',
        }));
      },
    },
  ],
});

const bundledSource = result.outputFiles[0].text;
const moduleUrl = `data:text/javascript;base64,${Buffer.from(bundledSource).toString('base64')}`;
const { buildDefaultNodeTextStyle, createInitialNodeStyleForInsert } = await import(moduleUrl);

function createDocument(parentStyle = undefined) {
  const nodes = {
    root: { id: 'root', children: ['secondary'] },
    secondary: { id: 'secondary', children: ['level-2'] },
    'level-2': { id: 'level-2', children: ['parent'] },
    parent: { id: 'parent', children: [], ...(parentStyle ? { style: parentStyle } : {}) },
  };

  return {
    manifest: { renderStylePreset: 'clean' },
    mind: {
      activeMindId: 'mind-1',
      minds: {
        'mind-1': {
          id: 'mind-1',
          roots: [{ rootId: 'root' }],
          nodes,
        },
      },
    },
  };
}

const inheritedDefaultStyle = createInitialNodeStyleForInsert({
  role: 'default',
  doc: createDocument(),
  parentId: 'parent',
});
assert.equal(inheritedDefaultStyle.text.fontSizePx, 14, 'a child must inherit the parent rendered default size');

const inheritedExplicitStyle = createInitialNodeStyleForInsert({
  role: 'default',
  doc: createDocument({ text: { fontSizePx: 12 } }),
  parentId: 'parent',
});
assert.equal(inheritedExplicitStyle.text.fontSizePx, 12, 'a child must inherit an explicit parent size');

const secondaryChildStyle = createInitialNodeStyleForInsert({
  role: 'default',
  doc: createDocument(),
  parentId: 'secondary',
});
assert.equal(secondaryChildStyle.text.fontSizePx, 16, 'the first default level keeps its designed 16px size');

const sampleFilePath = process.argv[2];
if (sampleFilePath) {
  const zip = await JSZip.loadAsync(fs.readFileSync(sampleFilePath));
  const manifest = JSON.parse(await zip.file('manifest.json').async('string'));
  const mind = JSON.parse(await zip.file('mind.json').async('string'));
  const doc = { manifest, mind };
  const activeMind = mind.minds[mind.activeMindId];
  const sampleNodeEntry = Object.entries(activeMind.nodes).find(([, node]) => node?.text?.plain === '新增主题');
  assert.ok(sampleNodeEntry, 'the sample file must contain the reported new node');
  const [sampleNodeId] = sampleNodeEntry;
  const parentEntry = Object.entries(activeMind.nodes).find(([, node]) => node?.children?.includes(sampleNodeId));
  assert.ok(parentEntry, 'the sample new node must have a structural parent');
  const [parentId] = parentEntry;
  const parentFontSize = buildDefaultNodeTextStyle(doc, parentId).fontSizePx;
  const insertedStyle = createInitialNodeStyleForInsert({ role: 'default', doc, parentId });
  assert.equal(insertedStyle.text.fontSizePx, parentFontSize, 'the sample child must match its rendered parent size');
  console.log(`sample file inheritance passed: ${parentFontSize}px`);
}

console.log('node style inheritance tests passed');
