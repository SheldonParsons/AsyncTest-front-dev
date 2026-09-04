import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const source = fs.readFileSync(
  path.join(root, 'src/views/electron_views/vibe/knowledge/components/ChatComposer.vue'),
  'utf8',
)

assert.match(source, /<span class="choice-label">\{\{ item\.label \}\}<\/span>/)
assert.doesNotMatch(source, /class="choice-label"[^>]*v-html/)
assert.match(source, /<small v-if="item\.description" class="choice-description">/)

// 直接执行页面的投影，避免把展示规则复制进测试。
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const view = parse(fs.readFileSync(viewPath, 'utf8'), { filename: viewPath })
assert.deepEqual(view.errors, [])
const script = ts.createSourceFile(
  'index.ts', view.descriptor.scriptSetup.content, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS,
)
const initializer = script.statements.filter(ts.isVariableStatement)
  .flatMap(statement => [...statement.declarationList.declarations])
  .find(declaration => declaration.name.getText(script) === 'composerQuestion')?.initializer
const identity = script.statements.find(statement => (
  ts.isFunctionDeclaration(statement)
  && statement.name?.getText(script) === 'clarificationOptionIdentity'
))
assert.ok(initializer)
assert.ok(identity)
const compiled = ts.transpileModule(identity.getText(script) + '\nconst question = ' + initializer.getText(script), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
  reportDiagnostics: true,
})
assert.deepEqual(compiled.diagnostics, [])
const project = new Function('clarificationActive', 'computed', compiled.outputText + '\nreturn { question, clarificationOptionIdentity }')
const projection = raw => project({ value: { question: raw.title, raw } }, callback => callback())
const question = raw => projection(raw).question
const raw = {
  schema: 'clarification.v2',
  title: '请选择处理范围',
  description: '存在两份规则，请确认范围。',
  options: [
    { id: 'choice_1', label: '只处理规则甲.md', description: '', effect: '交回主脑继续思考。' },
    { id: 'choice_2', label: '只处理规则乙.md', effect: '交回主脑继续思考。' },
    { id: 'choice_3', label: '两份都处理', effect: '交回主脑继续思考。' },
    { id: 'cancel', label: '取消这次操作', effect: '结束本次请求。' },
  ],
}
for (const decision_type of ['missing_information', 'disambiguation', 'resource_purpose']) {
  const items = question({ ...raw, decision_type }).items
  assert.deepEqual(items.map(item => item.label), raw.options.map(item => item.label))
  assert.deepEqual(items.map(item => item.description), ['', '', '', ''])
}
assert.equal(question({
  ...raw, decision_type: 'missing_information',
  options: [{ ...raw.options[0], description: '规则甲的适用范围。' }],
}).items[0].description, '规则甲的适用范围。')

const valueOnly = { label: '按照当前内容录入', value: 'use_current' }
assert.equal(projection(raw).clarificationOptionIdentity(valueOnly), 'use_current')
assert.equal(question({
  ...raw,
  options: [valueOnly],
}).items[0].value, '__CLARIFICATION_OPTION__:use_current')

// 具体预览确认仍显示效果说明。
assert.deepEqual(question({
  ...raw, decision_type: 'confirmation',
  options: [
    { id: 'confirm', label: '确认修改', effect: '按预览写入。' },
    { id: 'cancel', label: '先不处理', effect: '取消不会写入。' },
  ],
}).items.map(item => item.description), ['按预览写入。', '取消不会写入。'])

console.log('vibe clarification choice text contract: PASS')
