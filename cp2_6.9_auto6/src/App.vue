<template>
  <div class="app-container">
    <header class="app-header">
      <h1 class="app-title">Markdown 编辑器</h1>
      <div class="header-actions">
        <button
          class="mode-btn"
          :class="{ active: viewMode === 'split' }"
          @click="viewMode = 'split'"
        >
          分栏
        </button>
        <button
          class="mode-btn"
          :class="{ active: viewMode === 'edit' }"
          @click="viewMode = 'edit'"
        >
          编辑
        </button>
        <button
          class="mode-btn"
          :class="{ active: viewMode === 'preview' }"
          @click="viewMode = 'preview'"
        >
          预览
        </button>
      </div>
    </header>

    <div class="workspace" ref="workspaceRef">
      <Transition name="fade" mode="out-in">
        <MarkdownEditor
          v-if="viewMode === 'edit' || viewMode === 'split'"
          v-model="markdown"
          class="panel editor-panel"
          :style="editorStyle"
        />
      </Transition>

      <div
        v-if="viewMode === 'split' && !isMobile"
        class="resizer"
        :class="{ dragging: isDragging }"
        @mousedown="startDrag"
        @mouseenter="isResizerHovered = true"
        @mouseleave="isResizerHovered = false"
      >
        <div class="resizer-handle"></div>
      </div>

      <Transition name="fade" mode="out-in">
        <MarkdownPreview
          v-if="viewMode === 'preview' || viewMode === 'split'"
          :markdown="markdown"
          class="panel preview-panel"
          :style="previewStyle"
        >
          <button class="copy-btn" @click="handleCopyHtml">
            复制 HTML
          </button>
        </MarkdownPreview>
      </Transition>
    </div>

    <Transition name="toast">
      <div v-if="toastVisible" class="toast">
        {{ toastMessage }}
      </div>
    </Transition>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import MarkdownEditor from './components/MarkdownEditor.vue'
import MarkdownPreview from './components/MarkdownPreview.vue'
import { useClipboard } from './composables/useClipboard'
import { parseMarkdown } from './utils/markdownParser'

const { toastVisible, toastMessage, copyToClipboard } = useClipboard()

type ViewMode = 'edit' | 'preview' | 'split'
const viewMode = ref<ViewMode>('split')
const workspaceRef = ref<HTMLElement | null>(null)

const defaultMarkdown = `# 欢迎使用 Markdown 编辑器

这是一个**实时渲染**的 Markdown 编辑器，支持多种语法。

## 功能特点

- 实时编辑与预览
- 支持标题、列表、引用
- 代码块语法高亮
- 一键复制为 HTML

## 代码示例

\`\`\`javascript
function greet(name) {
  console.log(\`Hello, \${name}!\`);
  return {
    message: 'Welcome to Markdown',
    timestamp: Date.now()
  };
}
\`\`\`

## 引用

> 好的工具能够让工作事半功倍。
> 
> —— 某位开发者

## 链接与图片

访问 [Vue.js 官网](https://vuejs.org) 了解更多。

## 表格

| 功能 | 状态 |
|------|------|
| 实时渲染 | ✅ |
| 代码高亮 | ✅ |
| 一键复制 | ✅ |

---

开始输入你的 Markdown 内容吧！
`

const markdown = ref(defaultMarkdown)

const editorWidthPercent = ref(50)
const isDragging = ref(false)
const isResizerHovered = ref(false)
const isMobile = ref(false)

const editorStyle = computed(() => {
  if (viewMode.value === 'split' && !isMobile.value) {
    return { width: `${editorWidthPercent.value}%` }
  }
  return {}
})

const previewStyle = computed(() => {
  if (viewMode.value === 'split' && !isMobile.value) {
    return { width: `${100 - editorWidthPercent.value}%` }
  }
  return {}
})

function startDrag(e: MouseEvent) {
  e.preventDefault()
  isDragging.value = true
  document.addEventListener('mousemove', onDrag)
  document.addEventListener('mouseup', stopDrag)
}

function onDrag(e: MouseEvent) {
  if (!workspaceRef.value || !isDragging.value) return
  const rect = workspaceRef.value.getBoundingClientRect()
  const percent = ((e.clientX - rect.left) / rect.width) * 100
  if (percent >= 30 && percent <= 70) {
    editorWidthPercent.value = percent
  }
}

function stopDrag() {
  isDragging.value = false
  document.removeEventListener('mousemove', onDrag)
  document.removeEventListener('mouseup', stopDrag)
}

function generateStyledHtml(rawHtml: string): string {
  const css = `
    <style>
      body {
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
        line-height: 1.8;
        color: #2c3e50;
        max-width: 800px;
        margin: 0 auto;
        padding: 24px;
        background-color: #ffffff;
      }
      h1 { font-size: 2em; font-weight: 700; margin: 0.67em 0; padding-bottom: 0.3em; border-bottom: 2px solid #e8eaed; color: #2c3e50; }
      h2 { font-size: 1.5em; font-weight: 600; margin: 0.83em 0; padding-bottom: 0.3em; border-bottom: 1px solid #e8eaed; color: #2c3e50; }
      h3 { font-size: 1.25em; font-weight: 600; margin: 1em 0; color: #2c3e50; }
      h4, h5, h6 { font-size: 1em; font-weight: 600; margin: 1em 0; color: #2c3e50; }
      p { margin: 1em 0; }
      a { color: #FF6B35; text-decoration: none; }
      a:hover { text-decoration: underline; }
      ul, ol { margin: 1em 0; padding-left: 2em; }
      li { margin: 0.5em 0; }
      blockquote { margin: 1em 0; padding: 0.5em 1em; border-left: 4px solid #FF6B35; background-color: #f7f8fa; color: #5a6c7d; border-radius: 0 4px 4px 0; }
      blockquote p { margin: 0; }
      code { background-color: #f0f2f5; padding: 2px 6px; border-radius: 4px; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 0.9em; color: #e74c3c; }
      pre.hljs.code-block { background-color: #282c34; border-radius: 8px; padding: 16px; margin: 1em 0; overflow-x: auto; display: flex; font-family: Consolas, Monaco, 'Courier New', monospace; font-size: 14px; line-height: 1.6; }
      pre.hljs.code-block code { background: none; padding: 0; color: #abb2bf; display: flex; gap: 12px; }
      .line-numbers { display: flex; flex-direction: column; text-align: right; padding-right: 12px; border-right: 1px solid #3e4451; color: #5c6370; user-select: none; }
      .line-number { display: block; line-height: 1.6; }
      .code-content { flex: 1; white-space: pre; }
      pre { margin: 0; background: none; }
      hr { border: none; border-top: 2px solid #e8eaed; margin: 2em 0; }
      table { border-collapse: collapse; width: 100%; margin: 1em 0; }
      th, td { border: 1px solid #e8eaed; padding: 8px 12px; text-align: left; }
      th { background-color: #f7f8fa; font-weight: 600; }
      img { max-width: 100%; border-radius: 4px; }
      strong { font-weight: 700; color: #2c3e50; }
      em { font-style: italic; }
      .hljs-keyword, .hljs-selector-tag, .hljs-literal, .hljs-section, .hljs-link { color: #c678dd; }
      .hljs-function .hljs-keyword { color: #c678dd; }
      .hljs-string, .hljs-title, .hljs-name, .hljs-type, .hljs-attribute, .hljs-symbol, .hljs-bullet, .hljs-addition, .hljs-variable, .hljs-template-tag, .hljs-template-variable { color: #98c379; }
      .hljs-comment, .hljs-quote, .hljs-deletion, .hljs-meta { color: #5c6370; font-style: italic; }
      .hljs-number, .hljs-regexp, .hljs-literal, .hljs-doctag { color: #d19a66; }
      .hljs-title.function_, .hljs-class .hljs-title { color: #61afef; }
      .hljs-attr, .hljs-variable.language_, .hljs-property, .hljs-subst { color: #e06c75; }
      .hljs-built_in, .hljs-class .hljs-title { color: #e6c07b; }
    </style>
  `
  return `<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Markdown Output</title>${css}</head><body>${rawHtml}</body></html>`
}

async function handleCopyHtml() {
  const { html } = parseMarkdown(markdown.value)
  const styledHtml = generateStyledHtml(html)
  await copyToClipboard(styledHtml)
}

function checkMobile() {
  isMobile.value = window.innerWidth < 768
  if (isMobile.value && viewMode.value === 'split') {
    viewMode.value = 'edit'
  }
}

onMounted(() => {
  checkMobile()
  window.addEventListener('resize', checkMobile)
})

onUnmounted(() => {
  window.removeEventListener('resize', checkMobile)
  stopDrag()
})
</script>

<style scoped>
.app-container {
  width: 100vw;
  height: 100vh;
  display: flex;
  flex-direction: column;
  background-color: #f7f8fa;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  color: #2c3e50;
  overflow: hidden;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background-color: #ffffff;
  border-bottom: 1px solid #e8eaed;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.04);
  flex-shrink: 0;
}

.app-title {
  margin: 0;
  font-size: 20px;
  font-weight: 600;
  color: #2c3e50;
}

.header-actions {
  display: flex;
  gap: 8px;
}

.mode-btn {
  padding: 8px 16px;
  border: 1px solid #e8eaed;
  border-radius: 6px;
  background-color: #ffffff;
  color: #5a6c7d;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.mode-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
  border-color: #FF6B35;
  color: #FF6B35;
}

.mode-btn.active {
  background-color: #FF6B35;
  border-color: #FF6B35;
  color: #ffffff;
}

.workspace {
  flex: 1;
  display: flex;
  overflow: hidden;
  position: relative;
}

.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  background-color: #ffffff;
}

.editor-panel {
  border-right: 1px solid #e8eaed;
}

.resizer {
  width: 6px;
  background-color: #e8eaed;
  cursor: col-resize;
  flex-shrink: 0;
  position: relative;
  transition: background-color 0.2s ease;
}

.resizer:hover,
.resizer.dragging {
  background-color: #FF6B35;
}

.resizer-handle {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 2px;
  height: 40px;
  background-color: #ffffff;
  border-radius: 2px;
  opacity: 0;
  transition: opacity 0.2s ease;
}

.resizer:hover .resizer-handle,
.resizer.dragging .resizer-handle {
  opacity: 1;
}

.copy-btn {
  padding: 8px 20px;
  border: none;
  border-radius: 6px;
  background-color: #FF6B35;
  color: #ffffff;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
}

.copy-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(255, 107, 53, 0.4);
  background-color: #ff5a1f;
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.toast {
  position: fixed;
  top: 80px;
  left: 50%;
  transform: translateX(-50%);
  padding: 12px 24px;
  background-color: #2c3e50;
  color: #ffffff;
  border-radius: 8px;
  font-size: 14px;
  font-weight: 500;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.15);
  z-index: 1000;
}

.toast-enter-active,
.toast-leave-active {
  transition: all 0.3s ease;
}

.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translateX(-50%) translateY(-10px);
}

@media (max-width: 768px) {
  .workspace {
    flex-direction: column;
  }

  .editor-panel {
    border-right: none;
    border-bottom: 1px solid #e8eaed;
  }

  .panel {
    width: 100% !important;
  }

  .resizer {
    display: none;
  }

  .app-header {
    padding: 12px 16px;
  }

  .app-title {
    font-size: 16px;
  }

  .mode-btn {
    padding: 6px 12px;
    font-size: 13px;
  }
}
</style>
