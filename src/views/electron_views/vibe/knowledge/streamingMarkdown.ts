import { marked, type Token } from 'marked'
import DOMPurify from 'dompurify'

export type MarkdownBlock = { raw: string; html: string }

export function normalizeCopyableMarkdownFence(content: string) {
  const raw = String(content || '')
  const stripped = raw.trim()
  if (!stripped.startsWith('```') || !stripped.endsWith('```')) return raw
  const firstNewline = stripped.indexOf('\n')
  if (firstNewline <= 0) return raw
  const opener = stripped.slice(0, firstNewline)
  const body = stripped.slice(firstNewline + 1, -3)
  if (!body.includes('```')) return raw
  const runs = body.match(/`{3,}/g) || ['```']
  const fence = '`'.repeat(Math.max(...runs.map(item => item.length)) + 1)
  const normalized = `${fence}${opener.slice(3).trim()}\n${body}${fence}`
  return `${raw.slice(0, raw.length - raw.trimStart().length)}${normalized}${raw.slice(raw.trimEnd().length)}`
}

export function sanitizeMarkdownHtml(html: string): string {
  return DOMPurify.sanitize(html, { USE_PROFILES: { html: true }, ADD_ATTR: ['target', 'rel'] })
}

// 完整词法分析保留围栏、列表和后置引用定义的语义；只复用没有变化的块的清洗结果。
// 不使用“遇到空行就冻结”的规则。包含原始 HTML 时整体清洗，避免跨块标签改变上下文。
export function createStreamingMarkdownRenderer() {
  let previous: MarkdownBlock[] = []
  let previousLinks = ''
  return (content: string): MarkdownBlock[] => {
    if (!content) { previous = []; previousLinks = ''; return previous }
    const source = normalizeCopyableMarkdownFence(content)
    const tokens = marked.lexer(source)
    const links = JSON.stringify(tokens.links)
    if (links !== previousLinks) previous = []
    previousLinks = links
    // marked.walkTokens 会汇总每个回调的返回数组，长列表下开销很大；这里只需短路检查。
    let containsHtml = false
    const pending: unknown[] = source.includes('<') ? [tokens] : []
    while (pending.length) {
      const value = pending.pop()
      if (!value || typeof value !== 'object') continue
      if ('type' in value && value.type === 'html') { containsHtml = true; break }
      for (const child of Object.values(value)) {
        if (child && typeof child === 'object') pending.push(child)
      }
    }
    const next: MarkdownBlock[] = []
    const append = (raw: string, group: Token[]) => {
      const cached = previous[next.length]
      next.push(cached?.raw === raw ? cached : {
        raw,
        html: sanitizeMarkdownHtml(marked.parser(group)),
      })
    }
    if (containsHtml) {
      append(source, tokens)
    } else {
      let group: Token[] = [], raw = ''
      for (const token of tokens) {
        group.push(token)
        raw += token.raw
        // 按顶层语法块分组而非截断字符；单个大代码块/表格保持完整。
        if (raw.length >= 4096) { append(raw, group); group = []; raw = '' }
      }
      if (group.length) append(raw, group)
    }
    previous = next
    return next
  }
}
