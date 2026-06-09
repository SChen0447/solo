<template>
  <div class="preview-container">
    <div class="preview-header">
      <slot></slot>
    </div>
    <div
      class="preview-content"
      v-html="renderedHtml"
    ></div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { parseMarkdown } from '../utils/markdownParser'

const props = defineProps<{
  markdown: string
}>()

const renderedHtml = computed(() => {
  const result = parseMarkdown(props.markdown)
  return result.html
})
</script>

<style scoped>
.preview-container {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  background-color: #ffffff;
}

.preview-header {
  display: flex;
  justify-content: flex-end;
  padding: 12px 16px;
  border-bottom: 1px solid #e8eaed;
}

.preview-content {
  flex: 1;
  padding: 24px;
  overflow-y: auto;
  color: #2c3e50;
  font-size: 15px;
  line-height: 1.8;
}

.preview-content :deep(h1) {
  font-size: 2em;
  font-weight: 700;
  margin: 0.67em 0;
  padding-bottom: 0.3em;
  border-bottom: 2px solid #e8eaed;
  color: #2c3e50;
}

.preview-content :deep(h2) {
  font-size: 1.5em;
  font-weight: 600;
  margin: 0.83em 0;
  padding-bottom: 0.3em;
  border-bottom: 1px solid #e8eaed;
  color: #2c3e50;
}

.preview-content :deep(h3) {
  font-size: 1.25em;
  font-weight: 600;
  margin: 1em 0;
  color: #2c3e50;
}

.preview-content :deep(h4),
.preview-content :deep(h5),
.preview-content :deep(h6) {
  font-size: 1em;
  font-weight: 600;
  margin: 1em 0;
  color: #2c3e50;
}

.preview-content :deep(p) {
  margin: 1em 0;
}

.preview-content :deep(a) {
  color: #FF6B35;
  text-decoration: none;
}

.preview-content :deep(a:hover) {
  text-decoration: underline;
}

.preview-content :deep(ul),
.preview-content :deep(ol) {
  margin: 1em 0;
  padding-left: 2em;
}

.preview-content :deep(li) {
  margin: 0.5em 0;
}

.preview-content :deep(blockquote) {
  margin: 1em 0;
  padding: 0.5em 1em;
  border-left: 4px solid #FF6B35;
  background-color: #f7f8fa;
  color: #5a6c7d;
  border-radius: 0 4px 4px 0;
}

.preview-content :deep(blockquote p) {
  margin: 0;
}

.preview-content :deep(code) {
  background-color: #f0f2f5;
  padding: 2px 6px;
  border-radius: 4px;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 0.9em;
  color: #e74c3c;
}

.preview-content :deep(.code-block) {
  background-color: #282c34;
  border-radius: 8px;
  padding: 16px;
  margin: 1em 0;
  overflow-x: auto;
  display: flex;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
  font-size: 14px;
  line-height: 1.6;
}

.preview-content :deep(.code-block code) {
  background: none;
  padding: 0;
  color: #abb2bf;
  display: flex;
  gap: 12px;
}

.preview-content :deep(.line-numbers) {
  display: flex;
  flex-direction: column;
  text-align: right;
  padding-right: 12px;
  border-right: 1px solid #3e4451;
  color: #5c6370;
  user-select: none;
  font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
}

.preview-content :deep(.line-number) {
  display: block;
  line-height: 1.6;
}

.preview-content :deep(.code-content) {
  flex: 1;
  white-space: pre;
}

.preview-content :deep(pre) {
  margin: 0;
  background: none;
}

.preview-content :deep(hr) {
  border: none;
  border-top: 2px solid #e8eaed;
  margin: 2em 0;
}

.preview-content :deep(table) {
  border-collapse: collapse;
  width: 100%;
  margin: 1em 0;
}

.preview-content :deep(th),
.preview-content :deep(td) {
  border: 1px solid #e8eaed;
  padding: 8px 12px;
  text-align: left;
}

.preview-content :deep(th) {
  background-color: #f7f8fa;
  font-weight: 600;
}

.preview-content :deep(img) {
  max-width: 100%;
  border-radius: 4px;
}

.preview-content :deep(strong) {
  font-weight: 700;
  color: #2c3e50;
}

.preview-content :deep(em) {
  font-style: italic;
}
</style>
