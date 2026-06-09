import { marked } from 'marked'
import hljs from 'highlight.js'

export interface CodeBlock {
  language: string
  code: string
  lineCount: number
}

export interface ParseResult {
  html: string
  codeBlocks: CodeBlock[]
}

const renderer = new marked.Renderer()

renderer.code = function ({ text, lang }: { text: string; lang?: string }) {
  const language = lang || 'plaintext'
  const highlighted = hljs.highlight(text, { language }).value
  const lines = text.split('\n')
  const lineNumbers = lines
    .map((_, i) => `<span class="line-number">${i + 1}</span>`)
    .join('')

  return `<pre class="hljs code-block"><code class="language-${language}"><span class="line-numbers">${lineNumbers}</span><span class="code-content">${highlighted}</span></code></pre>`
}

marked.setOptions({
  renderer,
  breaks: true,
  gfm: true
})

export function parseMarkdown(markdown: string): ParseResult {
  const codeBlocks: CodeBlock[] = []
  const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g
  let match

  while ((match = codeBlockRegex.exec(markdown)) !== null) {
    const language = match[1] || 'plaintext'
    const code = match[2]
    codeBlocks.push({
      language,
      code,
      lineCount: code.split('\n').length
    })
  }

  const html = marked.parse(markdown) as string

  return {
    html,
    codeBlocks
  }
}
