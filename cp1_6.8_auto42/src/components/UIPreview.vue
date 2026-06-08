<script setup lang="ts">
import { computed } from 'vue'
import { usePaletteStore } from '@/stores/paletteStore'
import { getContrastRatio } from '@/utils/colorUtils'

const store = usePaletteStore()

const cssVars = computed(() => {
  const colors = store.sortedColors
  const isDark = store.isDarkTheme

  let bgColor, surfaceColor, textColor, textSecondary, borderColor, accentColor

  if (isDark) {
    bgColor = colors[4]?.hex || '#1a1a2e'
    surfaceColor = colors[3]?.hex || '#16213e'
    accentColor = colors[0]?.hex || '#4a90d9'
    textColor = getContrastColor(bgColor, '#ffffff', '#e0e0e0')
    textSecondary = getContrastColor(bgColor, '#aaa', '#888')
    borderColor = colors[2]?.hex || '#333'
  } else {
    bgColor = colors[0]?.hex || '#f8f9fa'
    surfaceColor = '#ffffff'
    accentColor = colors[2]?.hex || '#4a90d9'
    textColor = getContrastColor(bgColor, '#333333', '#222222')
    textSecondary = getContrastColor(bgColor, '#666', '#888')
    borderColor = colors[1]?.hex || '#e0e0e0'
  }

  return {
    '--preview-bg': bgColor,
    '--preview-surface': surfaceColor,
    '--preview-text': textColor,
    '--preview-text-secondary': textSecondary,
    '--preview-border': borderColor,
    '--preview-accent': accentColor,
    '--preview-accent-text': getContrastColor(accentColor, '#ffffff', '#333333')
  }
})

function getContrastColor(bg: string, light: string, dark: string): string {
  const contrastLight = getContrastRatio(bg, light)
  const contrastDark = getContrastRatio(bg, dark)
  if (contrastLight >= 4.5) return light
  if (contrastDark >= 4.5) return dark
  return contrastLight >= contrastDark ? light : dark
}
</script>

<template>
  <div class="ui-preview" :style="cssVars">
    <div class="preview-header">
      <span class="preview-title">UI 预览</span>
      <button class="theme-toggle" @click="store.toggleTheme()">
        {{ store.isDarkTheme ? '☀️ 浅色' : '🌙 深色' }}
      </button>
    </div>

    <div class="preview-content">
      <nav class="preview-nav">
        <div class="nav-logo">Logo</div>
        <div class="nav-links">
          <span class="nav-link active">首页</span>
          <span class="nav-link">产品</span>
          <span class="nav-link">关于</span>
        </div>
      </nav>

      <div class="preview-section">
        <button class="btn btn-primary">主要按钮</button>
        <button class="btn btn-secondary">次要按钮</button>
        <button class="btn btn-outline">边框按钮</button>
      </div>

      <div class="preview-card">
        <div class="card-title">卡片标题</div>
        <p class="card-text">
          这是一段示例文本，用于展示配色方案在实际内容中的显示效果。字体颜色和背景色会根据调色板自动调整。
        </p>
        <div class="card-actions">
          <button class="btn btn-primary btn-sm">了解更多</button>
        </div>
      </div>

      <div class="preview-section">
        <div class="input-group">
          <label class="input-label">输入框</label>
          <input type="text" class="text-input" placeholder="请输入内容..." />
        </div>
      </div>

      <div class="preview-section">
        <div class="tag-group">
          <span class="tag">标签1</span>
          <span class="tag tag-secondary">标签2</span>
          <span class="tag tag-outline">标签3</span>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.ui-preview {
  width: 350px;
  background: var(--preview-surface);
  border-radius: 12px;
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.08);
  overflow: hidden;
  display: flex;
  flex-direction: column;
  transition: all 0.3s ease-in-out;
}

.preview-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--preview-surface);
  border-bottom: 1px solid var(--preview-border);
}

.preview-title {
  font-size: 14px;
  font-weight: 600;
  color: var(--preview-text);
}

.theme-toggle {
  padding: 6px 12px;
  border-radius: 16px;
  background: var(--preview-bg);
  color: var(--preview-text);
  font-size: 12px;
  border: 1px solid var(--preview-border);
}

.theme-toggle:hover {
  background: var(--preview-border);
  transform: translateY(-1px);
}

.preview-content {
  padding: 16px;
  background: var(--preview-bg);
  display: flex;
  flex-direction: column;
  gap: 16px;
  flex: 1;
  transition: all 0.3s ease-in-out;
}

.preview-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 16px;
  background: var(--preview-surface);
  border-radius: 8px;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
  transition: all 0.3s ease-in-out;
}

.nav-logo {
  font-weight: 700;
  font-size: 16px;
  color: var(--preview-accent);
}

.nav-links {
  display: flex;
  gap: 16px;
}

.nav-link {
  font-size: 13px;
  color: var(--preview-text-secondary);
  cursor: pointer;
  transition: color 0.2s ease;
}

.nav-link:hover {
  color: var(--preview-text);
}

.nav-link.active {
  color: var(--preview-accent);
  font-weight: 500;
}

.preview-section {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  align-items: center;
}

.btn {
  padding: 8px 20px;
  border-radius: 6px;
  font-size: 13px;
  font-weight: 500;
  transition: all 0.3s ease-in-out;
}

.btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.btn-primary {
  background: var(--preview-accent);
  color: var(--preview-accent-text);
}

.btn-secondary {
  background: var(--preview-border);
  color: var(--preview-text);
}

.btn-outline {
  background: transparent;
  border: 1px solid var(--preview-accent);
  color: var(--preview-accent);
}

.btn-sm {
  padding: 6px 14px;
  font-size: 12px;
}

.preview-card {
  background: var(--preview-surface);
  border-radius: 10px;
  padding: 16px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.06);
  transition: all 0.3s ease-in-out;
}

.card-title {
  font-size: 15px;
  font-weight: 600;
  color: var(--preview-text);
  margin-bottom: 8px;
}

.card-text {
  font-size: 13px;
  color: var(--preview-text-secondary);
  line-height: 1.6;
  margin-bottom: 12px;
}

.card-actions {
  display: flex;
  gap: 8px;
}

.input-group {
  flex: 1;
  min-width: 100%;
}

.input-label {
  display: block;
  font-size: 12px;
  color: var(--preview-text-secondary);
  margin-bottom: 6px;
}

.text-input {
  width: 100%;
  padding: 10px 14px;
  border: 1px solid var(--preview-border);
  border-radius: 6px;
  background: var(--preview-surface);
  color: var(--preview-text);
  font-size: 13px;
  transition: all 0.3s ease-in-out;
}

.text-input:focus {
  border-color: var(--preview-accent);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--preview-accent) 20%, transparent);
}

.text-input::placeholder {
  color: var(--preview-text-secondary);
  opacity: 0.6;
}

.tag-group {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.tag {
  padding: 4px 12px;
  border-radius: 12px;
  font-size: 12px;
  background: var(--preview-accent);
  color: var(--preview-accent-text);
  font-weight: 500;
}

.tag-secondary {
  background: var(--preview-border);
  color: var(--preview-text);
}

.tag-outline {
  background: transparent;
  border: 1px solid var(--preview-accent);
  color: var(--preview-accent);
}

@media (max-width: 1024px) {
  .ui-preview {
    width: 100%;
  }
}
</style>
