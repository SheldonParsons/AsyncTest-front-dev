import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

const root = path.resolve(import.meta.dirname, '..')
const view = fs.readFileSync(path.join(root, 'src/views/electron_views/vibe/settings/index.vue'), 'utf8')

assert.doesNotMatch(view, /user_id:\s*undefined[\s\S]{0,120}input_text:\s*''/)
assert.match(view, /filesByPath\.get\(String\(event\?\.payload_ref \|\| ''\)\)/)
assert.match(view, /\['agent\.run\.completed', 'pi\.done'\]/)
assert.doesNotMatch(view, /event_type:\s*'trace\.file'/)
assert.match(view, /schema:\s*'vibe\.agent\.trace\.analysis\.v1'/)
assert.match(view, /'pi\.assistant_delta'/)
assert.match(view, /events:\s*traceTimelineEvents\(trace\)/)
assert.match(view, /agent-trace-analysis-\$\{exportStamp\(\)\}-\$\{details\.length\}\.json/)
assert.match(view, />\{\{ traceRawDownloading \? '下载中' : '下载原始取证包' \}\}<\/button>/)

console.log('vibe electron trace viewer contract: PASS')
