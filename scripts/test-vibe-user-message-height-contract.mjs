import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import ts from 'typescript'
import { parse } from '@vue/compiler-sfc'

const root = path.resolve(import.meta.dirname, '..')
const viewPath = path.join(root, 'src/views/electron_views/vibe/knowledge/index.vue')
const policyPath = path.join(root, 'src/views/electron_views/vibe/knowledge/userMessagePresentationPolicy.ts')
const viewSource = fs.readFileSync(viewPath, 'utf8')
const policySource = fs.readFileSync(policyPath, 'utf8')

assert.deepEqual(parse(viewSource, { filename: viewPath }).errors, [])

const compiledPolicy = ts.transpileModule(policySource, {
  compilerOptions: { module: ts.ModuleKind.ES2022, target: ts.ScriptTarget.ES2022, strict: true },
  reportDiagnostics: true,
})
assert.deepEqual(compiledPolicy.diagnostics || [], [])
const policy = await import(`data:text/javascript;base64,${Buffer.from(compiledPolicy.outputText).toString('base64')}`)

assert.equal(policy.userMessageCollapsedMaxHeight({ lineHeight: 23.52, viewportHeight: 830 }), 423.36)
assert.equal(policy.userMessageCollapsedMaxHeight({ lineHeight: 23.52, viewportHeight: 600 }), 312)
assert.equal(policy.userMessageContentOverflows({ scrollHeight: 424, lineHeight: 23.52, viewportHeight: 830 }), false)
assert.equal(policy.userMessageContentOverflows({ scrollHeight: 425, lineHeight: 23.52, viewportHeight: 830 }), true)
assert.equal(policy.userMessageContentOverflows({ scrollHeight: 0, lineHeight: Number.NaN, viewportHeight: 0 }), false)
assert.equal(policy.userMessageLikelyOverflows('短问题'), false)
assert.equal(policy.userMessageLikelyOverflows('一行\n'.repeat(19)), true)
assert.equal(policy.userMessageLikelyOverflows('长'.repeat(720)), true)

assert.match(viewSource, /collapsible:\s*shouldCollapseUserMessage\(event\)/)
assert.match(viewSource, /v-user-message-overflow="event\.id"/)
assert.match(viewSource, /userMessageContentOverflows\(\{/)
assert.match(viewSource, /new ResizeObserver\(\(\) => \{/)
assert.match(viewSource, /window\.addEventListener\('resize', scheduleUserMessageOverflowMeasurements\)/)
assert.match(viewSource, /:aria-controls="userMessageContentId\(event\.id\)"/)
assert.match(viewSource, /:aria-expanded="isUserMessageExpanded\(event\.id\)"/)
assert.match(viewSource, /\.user-message-wrap\.collapsible:not\(\.expanded\) \.user-message-content\s*\{[^}]*max-height:\s*18lh;[^}]*max-height:\s*min\(18lh,\s*52dvh\);[^}]*overflow:\s*hidden;/)
assert.match(viewSource, /\.user-message-wrap\.expanded \.user-message-content\s*\{[^}]*max-height:\s*none;[^}]*overflow:\s*visible;/)
assert.doesNotMatch(viewSource, /\.user-message-bubble \.user-message-content\s*\{[^}]*max-height:\s*92px;/)
assert.match(viewSource, /function toggleUserMessageExpanded[\s\S]*void syncTimelineNavigationAfterLayout\(\)/)
assert.match(viewSource, /pending-user-event[\s\S]*collapsible:\s*shouldCollapsePendingUserMessage[\s\S]*v-user-message-overflow="PENDING_USER_MESSAGE_ID"/)
assert.match(viewSource, /pending-user-event[\s\S]*v-if="shouldCollapsePendingUserMessage"[\s\S]*toggleUserMessageExpanded\(PENDING_USER_MESSAGE_ID\)/)
assert.match(viewSource, /const shouldCollapsePendingUserMessage = computed\(\(\) =>[\s\S]*pendingUserSubmissionText\.value/)
assert.match(viewSource, /measuredUserMessageIds/)

console.log('vibe user message height contract: PASS')
